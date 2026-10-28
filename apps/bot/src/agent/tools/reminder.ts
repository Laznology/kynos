import { addReminder } from "@kynos/db";
import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "../types";

export const createReminderTool = (context: AgentContext) =>
  tool({
    description:
      "Schedule a future reminder message to be sent via WhatsApp to the user.",
    execute: async ({ task, delay_minutes }) => {
      await Promise.resolve();
      const cleanTask = task.trim();
      const minutes = Math.max(1, delay_minutes);

      if (!cleanTask) {
        return JSON.stringify({ error: "Missing reminder task description" });
      }

      try {
        const remindAt = Date.now() + minutes * 60 * 1000;
        const reminder = addReminder(context.jid, cleanTask, remindAt);
        const remindDate = new Date(remindAt);

        return JSON.stringify({
          delay_minutes: minutes,
          remind_at_iso: remindDate.toISOString(),
          remind_at_local: remindDate.toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
          }),
          reminder_id: reminder.id,
          success: true,
          target_jid: context.jid,
          task: cleanTask,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return JSON.stringify({ error: msg });
      }
    },
    inputSchema: z.object({
      delay_minutes: z
        .number()
        .describe(
          "Number of minutes from now to trigger the reminder (e.g. 15 for 15 minutes, 60 for 1 hour)"
        ),
      task: z
        .string()
        .describe(
          "The reminder task description, e.g. 'Meeting with team' or 'Minum obat'"
        ),
    }),
  });
