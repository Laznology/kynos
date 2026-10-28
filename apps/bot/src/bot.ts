import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Boom } from "@hapi/boom";
import {
  addAuditLog,
  getDueReminders,
  getSettings,
  markReminderSent,
  updateBotState,
} from "@kynos/db";
import {
  makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import type {
  WASocket,
  ConnectionState,
  WAMessage,
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import { renderSVG } from "uqr";

import { runKynosAgent } from "./agent";
import { dispatchCommand } from "./commands";
import type { CommandContext } from "./commands";
import { isBotTriggered, isGroupAllowed } from "./gating";

const findWorkspaceRoot = (startDir: string): string => {
  let curr = startDir;
  while (curr !== "/" && curr !== ".") {
    try {
      const pkgPath = path.join(curr, "package.json");
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        if (pkg.workspaces) {
          return curr;
        }
      }
    } catch {
      // Ignore reading error
    }
    const parent = path.dirname(curr);
    if (parent === curr) {
      break;
    }
    curr = parent;
  }
  return startDir;
};

const AUTH_DIR =
  process.env.KYNOS_AUTH_DIR ||
  path.join(findWorkspaceRoot(process.cwd()), "data", "baileys_auth");
mkdirSync(AUTH_DIR, { recursive: true });

const logger = pino({ level: "error" });

const extractMessageText = (m: WAMessage["message"]): string => {
  if (!m) {
    return "";
  }
  const text =
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    "";
  return text.trim();
};

const downloadBufferSafe = async (
  msg: WAMessage
): Promise<Buffer | undefined> => {
  try {
    return (await downloadMediaMessage(msg, "buffer", {})) as Buffer;
  } catch {
    return undefined;
  }
};

const extractMedia = async (
  msg: WAMessage
): Promise<{ mediaBuffer?: Buffer; mimetype?: string }> => {
  const m = msg.message;
  if (!m) {
    return {};
  }
  if (m.imageMessage) {
    return {
      mediaBuffer: await downloadBufferSafe(msg),
      mimetype: m.imageMessage.mimetype || "image/jpeg",
    };
  }
  if (m.videoMessage) {
    return {
      mediaBuffer: await downloadBufferSafe(msg),
      mimetype: m.videoMessage.mimetype || "video/mp4",
    };
  }
  if (m.stickerMessage) {
    return {
      mediaBuffer: await downloadBufferSafe(msg),
      mimetype: "image/webp",
    };
  }
  return {};
};

const extractQuoted = async (
  msg: WAMessage
): Promise<CommandContext["quoted"]> => {
  const m = msg.message;
  if (!m) {
    return undefined;
  }
  const contextInfo =
    m.extendedTextMessage?.contextInfo ||
    m.imageMessage?.contextInfo ||
    m.videoMessage?.contextInfo ||
    m.stickerMessage?.contextInfo;
  const qm = contextInfo?.quotedMessage;
  if (!qm) {
    return undefined;
  }

  const qMessage = { key: msg.key, message: qm } as WAMessage;
  const qMediaBuffer = await downloadBufferSafe(qMessage);

  let qMime = "";
  let isSticker = false;
  let isAnimated = false;

  if (qm.stickerMessage) {
    qMime = "image/webp";
    isSticker = true;
    isAnimated = Boolean(qm.stickerMessage.isAnimated);
  } else if (qm.imageMessage) {
    qMime = qm.imageMessage.mimetype || "image/jpeg";
  } else if (qm.videoMessage) {
    qMime = qm.videoMessage.mimetype || "video/mp4";
  }

  return {
    isAnimated,
    isSticker,
    mediaBuffer: qMediaBuffer,
    mimetype: qMime,
    text: (qm.conversation || qm.extendedTextMessage?.text) ?? undefined,
  };
};

const sendMediaMessage = async (
  sock: WASocket,
  jid: string,
  buffer: Buffer,
  type: "image" | "video" | "sticker" | "document",
  caption?: string,
  quoted?: WAMessage
) => {
  if (type === "sticker") {
    await sock.sendMessage(jid, { sticker: buffer }, { quoted });
    return;
  }
  if (type === "image") {
    await sock.sendMessage(jid, { caption, image: buffer }, { quoted });
    return;
  }
  if (type === "video") {
    await sock.sendMessage(jid, { caption, video: buffer }, { quoted });
    return;
  }
  await sock.sendMessage(
    jid,
    { caption, document: buffer, mimetype: "application/octet-stream" },
    { quoted }
  );
};

const extractContextInfo = (m: WAMessage["message"]) => {
  if (!m) {
    return;
  }
  return (
    m.extendedTextMessage?.contextInfo ||
    m.imageMessage?.contextInfo ||
    m.videoMessage?.contextInfo ||
    m.stickerMessage?.contextInfo
  );
};

const executeSlashCommand = async (
  prefix: string,
  text: string,
  baseCtx: Omit<CommandContext, "args" | "commandName" | "fullText">
): Promise<boolean> => {
  if (!text.startsWith(prefix)) {
    return false;
  }
  const parts = text.slice(prefix.length).trim().split(/\s+/u);
  const commandName = parts[0]?.toLowerCase() || "";
  const args = parts.slice(1);
  const commandContext: CommandContext = {
    ...baseCtx,
    args,
    commandName,
    fullText: text,
  };

  addAuditLog(
    "info",
    "command",
    `Slash command executed: ${prefix}${commandName}`,
    {
      args,
      jid: baseCtx.jid,
      sender: baseCtx.sender,
    }
  );

  return await dispatchCommand(commandName, commandContext);
};

const runAgentReply = async (
  sock: WASocket,
  jid: string,
  prompt: string,
  context: { isGroup: boolean; jid: string; senderName?: string },
  reply: (text: string) => Promise<void>
) => {
  await sock.presenceSubscribe(jid);
  await sock.sendPresenceUpdate("composing", jid);

  try {
    const agentResult = await runKynosAgent(prompt, context);
    await sock.sendPresenceUpdate("paused", jid);
    await reply(agentResult.reply);
  } catch (error) {
    await sock.sendPresenceUpdate("paused", jid);
    const errorMsg = error instanceof Error ? error.message : String(error);
    await reply(`Kynos Agent error: ${errorMsg}`);
  }
};

export class KynosWhatsAppBot {
  private sock: WASocket | null = null;
  private reminderCron?: { stop: () => void };
  private isConnecting = false;

  async start(): Promise<void> {
    if (this.isConnecting) {
      return;
    }
    this.isConnecting = true;

    try {
      updateBotState({ status: "connecting" });
      addAuditLog("info", "bot", "Initializing WhatsApp Baileys connection");

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version } = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        auth: state,
        browser: ["Kynos Bot", "Chrome", "1.0.0"],
        generateHighQualityLinkPreview: true,
        logger,
        printQRInTerminal: false,
        version,
      });

      this.sock.ev.on("creds.update", saveCreds);

      this.sock.ev.on(
        "connection.update",
        (update: Partial<ConnectionState>) => {
          const { connection, lastDisconnect, qr } = update;

          if (qr) {
            try {
              const svg = renderSVG(qr);
              const qrDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
              updateBotState({
                qr_code: qrDataUrl,
                status: "qr_ready",
              });
              addAuditLog(
                "info",
                "bot",
                "QR code generated for WhatsApp pairing"
              );

              // Print QR code directly to terminal
              console.log("\nScan QR Code WhatsApp di bawah ini:\n");
              qrcode.generate(qr, { small: true });
              console.log("\nAtau buka Dashboard Web: http://localhost:3000\n");
            } catch (error) {
              logger.error({ error }, "Failed to generate QR vector SVG");
            }
          }

          if (connection === "close") {
            const statusCode = (lastDisconnect?.error as Boom)?.output
              ?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            updateBotState({
              qr_code: null,
              status: "disconnected",
            });

            addAuditLog(
              "warn",
              "bot",
              `WhatsApp connection closed (code: ${statusCode}). Reconnecting: ${shouldReconnect}`
            );

            this.isConnecting = false;
            if (shouldReconnect) {
              setTimeout(() => this.start(), 3000);
            }
          } else if (connection === "open") {
            this.isConnecting = false;
            const userJid = this.sock?.user?.id || "";
            const phoneNumber =
              userJid.split(":")[0]?.replace("@s.whatsapp.net", "") || null;

            updateBotState({
              last_connected: Date.now(),
              phone_number: phoneNumber,
              qr_code: null,
              status: "connected",
            });

            addAuditLog("info", "bot", "WhatsApp connected successfully", {
              jid: userJid,
              phoneNumber,
            });
          }
        }
      );

      this.sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") {
          return;
        }
        const tasks = messages
          .filter((msg) => msg.key && !msg.key.fromMe && msg.message)
          .map((msg) => this.handleMessage(msg));
        await Promise.all(tasks);
      });

      this.startReminderWorker();
    } catch (error) {
      this.isConnecting = false;
      const msg = error instanceof Error ? error.message : String(error);
      updateBotState({ status: "disconnected" });
      addAuditLog("error", "bot", `Failed to start WhatsApp bot: ${msg}`);
      setTimeout(() => this.start(), 5000);
    }
  }

  private async handleMessage(msg: WAMessage): Promise<void> {
    if (!this.sock || !msg.key?.remoteJid) {
      return;
    }
    const jid = msg.key.remoteJid;
    const isGroup = jid.endsWith("@g.us");
    const sender = msg.key.participant || jid;
    const senderName = msg.pushName || undefined;

    const text = extractMessageText(msg.message);
    const { mediaBuffer, mimetype } = await extractMedia(msg);
    const quoted = await extractQuoted(msg);

    const settings = getSettings();
    const prefix = settings.bot_prefix || "/";
    const contextInfo = extractContextInfo(msg.message);

    if (isGroup && !isGroupAllowed(settings.allowed_groups, jid)) {
      return;
    }

    const reply = async (replyText: string) => {
      if (this.sock) {
        await this.sock.sendMessage(jid, { text: replyText }, { quoted: msg });
      }
    };

    const replyMedia = async (
      buffer: Buffer,
      type: "image" | "video" | "sticker" | "document",
      caption?: string
    ) => {
      if (this.sock) {
        await sendMediaMessage(this.sock, jid, buffer, type, caption, msg);
      }
    };

    const handled = await executeSlashCommand(prefix, text, {
      isGroup,
      jid,
      mediaBuffer,
      mimetype,
      quoted,
      reply,
      replyMedia,
      sender,
      senderName,
    });
    if (handled) {
      return;
    }

    if (isGroup && !isBotTriggered(contextInfo, this.sock.user?.id)) {
      return;
    }

    const prompt = text || quoted?.text;
    if (!prompt) {
      return;
    }

    await runAgentReply(
      this.sock,
      jid,
      prompt,
      { isGroup, jid, senderName },
      reply
    );
  }

  private startReminderWorker(): void {
    this.reminderCron?.stop();

    this.reminderCron = Bun.cron("* * * * *", async () => {
      if (!this.sock) {
        return;
      }
      const due = getDueReminders();
      const tasks = due.map(async (item) => {
        try {
          if (this.sock) {
            await this.sock.sendMessage(item.jid, {
              text: `*PENGINGAT KYNOS*\n\n"${item.task}"\n\n_Pengingat otomatis dijadwalkan oleh Anda._`,
            });
            markReminderSent(item.id as number);
            addAuditLog("info", "bot", `Reminder sent to ${item.jid}`, {
              task: item.task,
            });
          }
        } catch (error) {
          logger.error({ error, item }, "Failed to deliver reminder");
        }
      });
      await Promise.all(tasks);
    });
  }

  stop(): void {
    this.reminderCron?.stop();
    this.reminderCron = undefined;
    if (this.sock) {
      this.sock.end(undefined);
      this.sock = null;
    }
    updateBotState({ qr_code: null, status: "disconnected" });
    addAuditLog("info", "bot", "WhatsApp bot daemon stopped");
  }
}
