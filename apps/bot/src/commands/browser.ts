import type { CommandHandler } from "./types";

const TRACE_DIR = "data/browser-traces";

export const browserCommand: CommandHandler = {
  description: "Show safe browser automation diagnostics",
  execute: async (ctx) => {
    const action = ctx.args[0]?.toLowerCase() || "status";
    if (action !== "status") {
      await ctx.reply("Usage: /browser status");
      return;
    }

    const traceEnabled = process.env.KYNOS_BROWSER_TRACE === "on";
    const executableConfigured = Boolean(
      process.env.PLAYWRIGHT_EXECUTABLE_PATH
    );
    await ctx.reply(
      [
        "*BROWSER STATUS*",
        "- Engine: Chromium via Playwright",
        `- Trace: ${traceEnabled ? "ON" : "OFF"}`,
        `- Trace directory: ${TRACE_DIR}`,
        `- Custom executable: ${executableConfigured ? "configured" : "default"}`,
        "- Sensitive data capture: disabled",
      ].join("\n")
    );
  },
  name: "browser",
  usage: "/browser status",
};
