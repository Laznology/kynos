import {
  deleteUserFactByJid,
  deleteUserFactsByJid,
  getUserFacts,
} from "@kynos/db";

import type { CommandHandler } from "./types";

export const memoryCommand: CommandHandler = {
  aliases: ["memories"],
  description: "List or remove memories in the current chat scope",
  execute: async (ctx) => {
    const [action = "list", rawId] = ctx.args;
    const facts = getUserFacts(ctx.jid);

    if (action === "list") {
      if (facts.length === 0) {
        await ctx.reply(
          ctx.isGroup
            ? "Belum ada memory untuk grup ini."
            : "Belum ada memory untuk chat privat ini."
        );
        return;
      }

      const scope = ctx.isGroup ? "grup ini" : "chat privat ini";
      const lines = facts.map(
        (fact) => `#${fact.id} [${fact.category}] ${fact.fact}`
      );
      await ctx.reply(`*MEMORY ${scope.toUpperCase()}*\n${lines.join("\n")}`);
      return;
    }

    if (action === "forget") {
      const id = Number(rawId);
      if (!Number.isInteger(id) || id < 1) {
        await ctx.reply("ID memory harus berupa angka positif.");
        return;
      }

      if (!deleteUserFactByJid(id, ctx.jid)) {
        await ctx.reply(
          "Memory tidak ditemukan dalam scope chat ini atau sudah dihapus."
        );
        return;
      }
      await ctx.reply(`Memory #${id} berhasil dihapus.`);
      return;
    }

    if (action === "clear") {
      deleteUserFactsByJid(ctx.jid);
      await ctx.reply(
        ctx.isGroup
          ? "Semua memory grup ini berhasil dihapus."
          : "Semua memory chat privat ini berhasil dihapus."
      );
      return;
    }

    await ctx.reply("Usage: /memory [list|forget <id>|clear]");
  },
  name: "memory",
  usage: "/memory [list|forget <id>|clear]",
};
