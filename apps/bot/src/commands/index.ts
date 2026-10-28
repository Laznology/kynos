import { clearCommand, helpCommand, pingCommand, statusCommand } from "./help";
import { smemeCommand, smemeImgCommand } from "./smeme";
import { stickerCommand, takeCommand } from "./sticker";
import { toGifCommand, toImgCommand, toMp4Command } from "./toimg";
import type { CommandContext, CommandHandler } from "./types";

export * from "./types";

export const COMMAND_LIST: CommandHandler[] = [
  stickerCommand,
  takeCommand,
  toImgCommand,
  toGifCommand,
  toMp4Command,
  smemeCommand,
  smemeImgCommand,
  helpCommand,
  pingCommand,
  clearCommand,
  statusCommand,
];

export const COMMAND_MAP = new Map<string, CommandHandler>();

for (const cmd of COMMAND_LIST) {
  COMMAND_MAP.set(cmd.name.toLowerCase(), cmd);
  if (cmd.aliases) {
    for (const alias of cmd.aliases) {
      COMMAND_MAP.set(alias.toLowerCase(), cmd);
    }
  }
}

export const dispatchCommand = async (
  commandName: string,
  ctx: CommandContext
): Promise<boolean> => {
  const handler = COMMAND_MAP.get(commandName.toLowerCase());
  if (!handler) {
    return false;
  }

  await handler.execute(ctx);
  return true;
};
