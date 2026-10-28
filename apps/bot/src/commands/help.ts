import { clearChatHistory, getBotState, getSettings } from "@kynos/db";

import type { CommandHandler } from "./types";

export const helpCommand: CommandHandler = {
  aliases: ["menu", "info"],
  description: "Display Kynos command list and AI assistant capabilities",
  execute: async (ctx) => {
    const settings = getSettings();
    const prefix = settings.bot_prefix || "/";

    const text = `*KYNOS WHATSAPP ASSISTANT*
_Autonomous Intelligence & Media Suite_

*DAFTAR SLASH COMMANDS:*
- *${prefix}s* atau *${prefix}sticker*: Gambar ke Stiker WebP, Video/GIF ke Stiker Animasi.
- *${prefix}take <pack>|<author>*: Ganti metadata stiker yang di-reply.
- *${prefix}toimg*: Stiker statis ke Gambar PNG.
- *${prefix}togif*: Stiker animasi ke Animasi GIF.
- *${prefix}tomp4*: Stiker animasi ke Video MP4.
- *${prefix}smeme <atas>|<bawah>*: Buat meme stiker dengan font Impact.
- *${prefix}smemeimg <atas>|<bawah>*: Buat meme gambar biasa.
- *${prefix}ping*: Cek status latensi dan runtime bot.
- *${prefix}clear*: Reset riwayat percakapan sesi ini.
- *${prefix}status*: Status runtime bot dan model AI aktif.

*FITUR AI AGENT:*
Kirim pesan langsung (atau mention di grup) untuk berinteraksi dengan AI:
- Multi-Step Structured Reasoning
- Live Web Search (internet dan berita terkini)
- Safe Calculator (evaluasi matematika)
- Weather Forecast (prakiraan cuaca global)
- Web Summarizer (rangkum konten URL)
- Reminder Scheduler (jadwal pengingat otomatis)
- User Memory (mengingat preferensi pengguna)

_Web Dashboard:_ Akses http://localhost:3000 untuk konfigurasi model dan API key.`;

    await ctx.reply(text);
  },
  name: "help",
  usage: "/help",
};

export const pingCommand: CommandHandler = {
  description: "Check bot responsiveness and server uptime",
  execute: async (ctx) => {
    const start = Date.now();
    const memoryUsage = process.memoryUsage();
    const heapUsedMb = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const rssMb = Math.round(memoryUsage.rss / 1024 / 1024);
    const latency = Date.now() - start;

    await ctx.reply(
      `PONG\n- Latensi: ${latency}ms\n- Runtime: Bun ${Bun.version}\n- Memory: ${heapUsedMb} MB (Heap) / ${rssMb} MB (RSS)\n- Status: Active`
    );
  },
  name: "ping",
  usage: "/ping",
};

export const clearCommand: CommandHandler = {
  aliases: ["reset", "clearchat"],
  description: "Clear conversation history with AI agent for this chat",
  execute: async (ctx) => {
    clearChatHistory(ctx.jid);
    await ctx.reply("Riwayat percakapan dengan AI agent berhasil dibersihkan.");
  },
  name: "clear",
  usage: "/clear",
};

export const statusCommand: CommandHandler = {
  description: "Show active AI model and bot runtime configuration",
  execute: async (ctx) => {
    const settings = getSettings();
    const state = getBotState();

    const info = `*KYNOS STATUS & CONFIGURATION*
- Status Bot: ${state.status.toUpperCase()}
- Nomor Terhubung: ${state.phone_number || "Belum terhubung"}
- AI Provider: ${settings.ai_provider}
- AI Model: ${settings.ai_model}
- Reasoning Effort: ${settings.ai_reasoning_effort}
- Group Access: ${settings.allowed_groups.length === 0 ? "none" : settings.allowed_groups.join(", ")}
- Private Access: ${settings.allowed_users.length === 0 ? "none" : settings.allowed_users.join(", ")}
- Owner Handle: ${settings.owner_jid}
- Tools Aktif: ${settings.tools_enabled.join(", ")}
- Sticker Pack: ${settings.sticker_pack_name} (oleh ${settings.sticker_pack_author})`;

    await ctx.reply(info);
  },
  name: "status",
  usage: "/status",
};
