import { browserCommand } from "./browser";
import { downloadCommand } from "./download";
import { clearCommand, helpCommand, pingCommand, statusCommand } from "./help";
import {
  configCommand,
  modelApplyCommand,
  modelCancelCommand,
  modelConfirmCommand,
  modelCommand,
  reasoningCommand,
  temperatureCommand,
  tokensCommand,
  toolsCommand,
} from "./management";
import { memoryCommand } from "./memory";
import { reminderCommand } from "./reminder";
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
  configCommand,
  modelConfirmCommand,
  modelApplyCommand,
  modelCancelCommand,
  modelCommand,
  reasoningCommand,
  temperatureCommand,
  tokensCommand,
  toolsCommand,
  reminderCommand,
  memoryCommand,
  browserCommand,
  downloadCommand,
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
