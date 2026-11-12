import { getRemindersByJid, updateReminderStatusByJid } from "@kynos/db";

import type { CommandHandler } from "./types";

const formatReminderDate = (timestamp: number): string =>
  new Date(timestamp).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
  });

export const reminderCommand: CommandHandler = {
  aliases: ["reminders"],
  description: "List or cancel reminders in the current chat scope",
  execute: async (ctx) => {
    const [action = "list", rawId] = ctx.args;
    const reminders = getRemindersByJid(ctx.jid);

    if (action === "list") {
      if (reminders.length === 0) {
        await ctx.reply(
          ctx.isGroup
            ? "Belum ada reminder untuk grup ini."
            : "Belum ada reminder untuk chat privat ini."
        );
        return;
      }

      const scope = ctx.isGroup ? "grup ini" : "chat privat ini";
      const lines = reminders.map(
        (reminder) =>
          `#${reminder.id} [${reminder.status}] ${formatReminderDate(reminder.remind_at)} - ${reminder.task}`
      );
      await ctx.reply(`*REMINDER ${scope.toUpperCase()}*\n${lines.join("\n")}`);
      return;
    }

    if (action !== "cancel") {
      await ctx.reply("Usage: /reminder [list|cancel] [id]");
      return;
    }

    const id = Number(rawId);
    if (!Number.isInteger(id) || id < 1) {
      await ctx.reply("ID reminder harus berupa angka positif.");
      return;
    }

    const cancelled = updateReminderStatusByJid(id, ctx.jid, "cancelled");
    if (!cancelled) {
      await ctx.reply(
        "Reminder tidak ditemukan dalam scope chat ini atau sudah dibatalkan."
      );
      return;
    }

    await ctx.reply(`Reminder #${id} berhasil dibatalkan.`);
  },
  name: "reminder",
  usage: "/reminder [list|cancel] [id]",
};
