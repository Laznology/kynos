import { addAuditLog, initDatabase } from "@kynos/db";

import { KynosWhatsAppBot } from "./bot";
import { startBotInternalServer } from "./server";

initDatabase();

console.log("=========================================");
console.log("KYNOS WHATSAPP BOT DAEMON STARTING...");
console.log(`Runtime: Bun ${Bun.version}`);
console.log("Autonomous AI Agent & Media Suite");
console.log("=========================================");

addAuditLog("info", "system", "Kynos Bot daemon process started");

const bot = new KynosWhatsAppBot();
await bot.start();

const apiServer = startBotInternalServer(bot, 3001);
console.log(
  `Internal Bot REST API listening on http://localhost:${apiServer.port}`
);

const shutdown = async () => {
  console.log("\nShutting down Kynos WhatsApp bot...");
  apiServer.stop();
  await bot.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
