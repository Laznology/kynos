import { getBotState, getSettings } from "@kynos/db";

import type { KynosWhatsAppBot } from "./bot";

export const startBotInternalServer = (bot: KynosWhatsAppBot, port = 3001) =>
  Bun.serve({
    fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/api/bot/status" && req.method === "GET") {
        return Response.json({
          settings: getSettings(),
          state: getBotState(),
        });
      }

      if (url.pathname === "/api/bot/restart" && req.method === "POST") {
        setTimeout(async () => {
          await bot.stop();
          await bot.start();
        }, 100);
        return Response.json({ message: "Bot restarting...", success: true });
      }

      if (url.pathname === "/api/bot/stop" && req.method === "POST") {
        setTimeout(async () => {
          await bot.stop();
        }, 100);
        return Response.json({ message: "Bot stopped.", success: true });
      }

      return new Response("Not Found", { status: 404 });
    },
    port,
  });
