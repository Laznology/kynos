import { addReminder } from "@kynos/db";
import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "../types";

export const createReminderTool = (context: AgentContext) =>
  tool({
    description:
      "Schedule a future reminder message to be sent via WhatsApp to the user and create a WhatsApp calendar event. Supports optional duration and location.",
    execute: async ({ task, delay_minutes, duration_minutes, location_name }) => {
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
        const endDate = duration_minutes && duration_minutes > 0
          ? new Date(remindAt + duration_minutes * 60 * 1000)
          : undefined;

        let eventCreated = false;
        if (context.sendEvent) {
          try {
            await context.sendEvent({
              description: cleanTask,
              endDate,
              location: location_name ? { degreesLatitude: 0, degreesLongitude: 0, name: location_name } : undefined,
              name: cleanTask,
              startDate: remindDate,
            });
            eventCreated = true;
          } catch {
            eventCreated = false;
          }
        }

        return JSON.stringify({
          delay_minutes: minutes,
          duration_minutes: duration_minutes || null,
          event_created: eventCreated,
          location: location_name || null,
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
      duration_minutes: z
        .number()
        .optional()
        .describe("Estimated duration of the event in minutes (e.g. 30, 60)"),
      location_name: z
        .string()
        .optional()
        .describe("Optional location name of the event or meeting (e.g. 'Ruang Meeting A', 'Zoom', 'Starbucks')"),
      task: z
        .string()
        .describe(
          "The reminder task description, e.g. 'Meeting with team' or 'Minum obat'"
        ),
    }),
    strict: true,
  });
