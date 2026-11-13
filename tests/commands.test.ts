import { describe, expect, it } from "bun:test";

import {
  addReminder,
  addUserFact,
  deleteUserFact,
  getRemindersByJid,
  getUserFacts,
  getSettings,
  updateReminderStatus,
  updateSettings,
} from "@kynos/db";

import { COMMAND_MAP, dispatchCommand } from "../apps/bot/src/commands";
import type { CommandContext } from "../apps/bot/src/commands";
import { validateDownloadUrl } from "../apps/bot/src/media/download";

describe("Slash Commands Dispatcher", () => {
  it("should validate supported download platforms", () => {
    expect(
      validateDownloadUrl("https://www.facebook.com/share/r/1CdfXKYGnx/").hostname
    ).toBe("www.facebook.com");
    expect(() => validateDownloadUrl("https://example.com/video")).toThrow(
      "Platform belum didukung"
    );
    expect(() => validateDownloadUrl("javascript:alert(1)")).toThrow(
      "URL harus menggunakan http atau https"
    );
  });

  it("should reject /dl without invoking yt-dlp for unsupported URLs", async () => {
    const replies: string[] = [];
    await dispatchCommand("dl", {
      args: ["https://example.com/video"],
      commandName: "dl",
      fullText: "/dl https://example.com/video",
      isGroup: false,
      jid: "download-test@s.whatsapp.net",
      reply: (text) => {
        replies.push(text);
        return Promise.resolve();
      },
      replyMedia: () => Promise.resolve(),
      sender: "download-test@s.whatsapp.net",
    });

    expect(replies.at(-1)).toContain("Platform belum didukung");
  });

  it("should register all expected slash commands", () => {
    expect(COMMAND_MAP.has("sticker")).toBe(true);
    expect(COMMAND_MAP.has("s")).toBe(true);
    expect(COMMAND_MAP.has("take")).toBe(true);
    expect(COMMAND_MAP.has("toimg")).toBe(true);
    expect(COMMAND_MAP.has("togif")).toBe(true);
    expect(COMMAND_MAP.has("tomp4")).toBe(true);
    expect(COMMAND_MAP.has("smeme")).toBe(true);
    expect(COMMAND_MAP.has("smemeimg")).toBe(true);
    expect(COMMAND_MAP.has("help")).toBe(true);
    expect(COMMAND_MAP.has("ping")).toBe(true);
    expect(COMMAND_MAP.has("clear")).toBe(true);
    expect(COMMAND_MAP.has("status")).toBe(true);
    expect(COMMAND_MAP.has("config")).toBe(true);
    expect(COMMAND_MAP.has("model")).toBe(true);
    expect(COMMAND_MAP.has("reasoning")).toBe(true);
    expect(COMMAND_MAP.has("effort")).toBe(true);
    expect(COMMAND_MAP.has("temperature")).toBe(true);
    expect(COMMAND_MAP.has("tokens")).toBe(true);
    expect(COMMAND_MAP.has("tools")).toBe(true);
    expect(COMMAND_MAP.has("dl")).toBe(true);
    expect(COMMAND_MAP.has("download")).toBe(true);
    expect(COMMAND_MAP.has("model-confirm")).toBe(true);
    expect(COMMAND_MAP.has("model-apply")).toBe(true);
    expect(COMMAND_MAP.has("model-cancel")).toBe(true);
  });

  it("should expose interactive model selection and confirmation", async () => {
    const original = getSettings();
    const rows: Array<{ id: string; title: string }> = [];
    let buttons: Array<{ id: string; text: string }> = [];
    const settings = {
      ...original,
      allowed_users: ["interactive@s.whatsapp.net"],
    };
    const baseContext: CommandContext = {
      args: [],
      commandName: "model",
      fullText: "/model",
      isGroup: false,
      jid: "interactive@s.whatsapp.net",
      reply: () => Promise.resolve(),
      replyButtons: async (params) => {
        buttons = params.buttons;
      },
      replyList: async (params) => {
        rows.push(...params.rows);
      },
      replyMedia: () => Promise.resolve(),
      sender: "interactive@s.whatsapp.net",
      settings,
    };

    await dispatchCommand("model", baseContext);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.id).toStartWith("/model-confirm ");

    await dispatchCommand("model-confirm", {
      ...baseContext,
      args: [rows[0]?.id.replace("/model-confirm ", "") || ""],
      commandName: "model-confirm",
      fullText: rows[0]?.id || "",
      replyList: undefined,
    });
    expect(buttons.map((button) => button.text)).toEqual([
      "Gunakan model",
      "Batalkan",
    ]);
  });

  it("should dispatch /ping command and return latency info", async () => {
    let replyReceived = "";
    const ctx: CommandContext = {
      args: [],
      commandName: "ping",
      fullText: "/ping",
      isGroup: false,
      jid: "test@s.whatsapp.net",
      reply: async (text) => {
        await Promise.resolve();
        replyReceived = text;
      },
      replyMedia: async () => {
        await Promise.resolve();
      },
      sender: "test@s.whatsapp.net",
    };

    const dispatched = await dispatchCommand("ping", ctx);
    expect(dispatched).toBe(true);
    expect(replyReceived).toContain("PONG");
    expect(replyReceived).toContain("Bun");
  });

  it("should dispatch /help command and list capabilities", async () => {
    let replyReceived = "";
    const ctx: CommandContext = {
      args: [],
      commandName: "help",
      fullText: "/help",
      isGroup: false,
      jid: "test@s.whatsapp.net",
      reply: async (text) => {
        await Promise.resolve();
        replyReceived = text;
      },
      replyMedia: async () => {
        await Promise.resolve();
      },
      sender: "test@s.whatsapp.net",
    };

    const dispatched = await dispatchCommand("help", ctx);
    expect(dispatched).toBe(true);
    expect(replyReceived).toContain("KYNOS");
    expect(replyReceived).toContain("/s");
    expect(replyReceived).toContain("/smeme");
    expect(replyReceived).toContain("/toimg");
    expect(replyReceived).toContain("/dl");
  });

  it("should return false for unknown commands", async () => {
    const ctx: CommandContext = {
      args: [],
      commandName: "unknown",
      fullText: "/unknown",
      isGroup: false,
      jid: "test@s.whatsapp.net",
      reply: async () => {},
      replyMedia: () => Promise.resolve(),
      sender: "test@s.whatsapp.net",
    };

    const dispatched = await dispatchCommand("unknown", ctx);
    expect(dispatched).toBe(false);
  });

  it("should protect and update runtime reasoning settings", async () => {
    const original = getSettings();
    const replies: string[] = [];
    const baseContext: CommandContext = {
      args: ["high"],
      commandName: "reasoning",
      fullText: "/reasoning high",
      isGroup: false,
      jid: "owner@s.whatsapp.net",
      reply: (text) => {
        replies.push(text);
        return Promise.resolve();
      },
      replyMedia: () => Promise.resolve(),
      sender: "owner@s.whatsapp.net",
      settings: {
        ...original,
        owner_jid: "owner@s.whatsapp.net",
      },
    };

    updateSettings({ owner_jid: "owner@s.whatsapp.net" });
    await dispatchCommand("reasoning", {
      ...baseContext,
      sender: "other@s.whatsapp.net",
    });
    expect(replies.at(-1)).toContain("hanya dapat digunakan oleh owner");

    await dispatchCommand("reasoning", baseContext);
    expect(getSettings().ai_reasoning_effort).toBe("high");

    updateSettings({
      ai_reasoning_effort: original.ai_reasoning_effort,
      owner_jid: original.owner_jid,
    });
  });

  it("should restrict model changes to private access users", async () => {
    const original = getSettings();
    const replies: string[] = [];
    const context: CommandContext = {
      args: ["nousresearch/hermes-3-llama-3.1-8b"],
      commandName: "model",
      fullText: "/model nousresearch/hermes-3-llama-3.1-8b",
      isGroup: true,
      jid: "group@g.us",
      reply: (text) => {
        replies.push(text);
        return Promise.resolve();
      },
      replyMedia: () => Promise.resolve(),
      sender: "user@s.whatsapp.net",
      settings: {
        ...original,
        allowed_users: ["allowed@s.whatsapp.net"],
      },
    };

    await dispatchCommand("model", context);
    expect(replies.at(-1)).toContain("Private Access");
    expect(getSettings().ai_model).toBe(original.ai_model);

    await dispatchCommand("model", {
      ...context,
      sender: "allowed@s.whatsapp.net",
    });
    expect(getSettings().ai_model).toBe("nousresearch/hermes-3-llama-3.1-8b");

    updateSettings({ ai_model: original.ai_model });
  });

  it("should keep reminder management scoped to the current chat", async () => {
    const privateReminder = addReminder(
      "private-user@s.whatsapp.net",
      "Private task",
      Date.now() + 60_000
    );
    const groupReminder = addReminder(
      "team@g.us",
      "Group task",
      Date.now() + 60_000
    );
    const replies: string[] = [];
    const baseContext: CommandContext = {
      args: ["cancel", String(privateReminder.id)],
      commandName: "reminder",
      fullText: `/reminder cancel ${privateReminder.id}`,
      isGroup: false,
      jid: "private-user@s.whatsapp.net",
      reply: (text) => {
        replies.push(text);
        return Promise.resolve();
      },
      replyMedia: () => Promise.resolve(),
      sender: "private-user@s.whatsapp.net",
    };

    await dispatchCommand("reminder", baseContext);
    expect(replies.at(-1)).toContain("berhasil dibatalkan");
    expect(getRemindersByJid("private-user@s.whatsapp.net")[0]?.status).toBe(
      "cancelled"
    );

    replies.length = 0;
    await dispatchCommand("reminder", {
      ...baseContext,
      args: ["cancel", String(groupReminder.id)],
      fullText: `/reminder cancel ${groupReminder.id}`,
    });
    expect(replies.at(-1)).toContain("scope chat ini");
    expect(
      getRemindersByJid("team@g.us").find(
        (reminder) => reminder.id === groupReminder.id
      )?.status
    ).toBe("pending");

    if (groupReminder.id) {
      updateReminderStatus(groupReminder.id, "cancelled");
    }
  });

  it("should keep memory management scoped to the current chat", async () => {
    const privateFact = addUserFact(
      "private-memory@s.whatsapp.net",
      "Private fact"
    );
    const groupFact = addUserFact("memory-team@g.us", "Group fact");
    const replies: string[] = [];
    const baseContext: CommandContext = {
      args: ["forget", String(privateFact.id)],
      commandName: "memory",
      fullText: `/memory forget ${privateFact.id}`,
      isGroup: false,
      jid: "private-memory@s.whatsapp.net",
      reply: (text) => {
        replies.push(text);
        return Promise.resolve();
      },
      replyMedia: () => Promise.resolve(),
      sender: "private-memory@s.whatsapp.net",
    };

    await dispatchCommand("memory", baseContext);
    expect(replies.at(-1)).toContain("berhasil dihapus");
    expect(getUserFacts("private-memory@s.whatsapp.net")).toHaveLength(0);

    replies.length = 0;
    await dispatchCommand("memory", {
      ...baseContext,
      args: ["forget", String(groupFact.id)],
      fullText: `/memory forget ${groupFact.id}`,
    });
    expect(replies.at(-1)).toContain("scope chat ini");
    expect(
      getUserFacts("memory-team@g.us").find((fact) => fact.id === groupFact.id)
    ).toBeDefined();

    if (groupFact.id) {
      deleteUserFact(groupFact.id);
    }
  });

  it("should expose safe browser status diagnostics", async () => {
    let replyReceived = "";
    const dispatched = await dispatchCommand("browser", {
      args: ["status"],
      commandName: "browser",
      fullText: "/browser status",
      isGroup: false,
      jid: "browser-test@s.whatsapp.net",
      reply: (text) => {
        replyReceived = text;
        return Promise.resolve();
      },
      replyMedia: () => Promise.resolve(),
      sender: "browser-test@s.whatsapp.net",
    });

    expect(dispatched).toBe(true);
    expect(replyReceived).toContain("Chromium via Playwright");
    expect(replyReceived).toContain("Sensitive data capture: disabled");
  });
});
