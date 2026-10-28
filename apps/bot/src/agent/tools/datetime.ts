import { tool } from "ai";
import { z } from "zod";

export const datetimeTool = tool({
  description:
    "Get the current real-time date, time, day of the week, and timezone information.",
  execute: async ({ timezone }) => {
    await Promise.resolve();
    const tz = timezone?.trim() || "Asia/Jakarta";
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        hour: "2-digit",
        hour12: false,
        minute: "2-digit",
        month: "long",
        second: "2-digit",
        timeZone: tz,
        weekday: "long",
        year: "numeric",
      });

      return JSON.stringify({
        formatted: formatter.format(now),
        iso: now.toISOString(),
        timezone: tz,
        unix: Math.floor(now.getTime() / 1000),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ error: `Invalid timezone '${tz}': ${msg}` });
    }
  },
  inputSchema: z.object({
    timezone: z
      .string()
      .optional()
      .describe(
        "IANA timezone identifier, e.g. 'Asia/Jakarta', 'UTC', 'America/New_York'. Default: 'Asia/Jakarta'."
      ),
  }),
});
