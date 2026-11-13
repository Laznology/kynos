import type { AppSettings } from "@kynos/shared";

export interface CommandContext {
  jid: string;
  sender: string;
  senderName?: string;
  isGroup: boolean;
  args: string[];
  fullText: string;
  commandName: string;
  settings?: AppSettings;
  mediaBuffer?: Buffer;
  mimetype?: string;
  quoted?: {
    text?: string;
    mediaBuffer?: Buffer;
    mimetype?: string;
    isSticker?: boolean;
    isAnimated?: boolean;
    sender?: string;
    isFromMe?: boolean;
  };
  reply: (text: string) => Promise<void>;
  replyList?: (params: {
    buttonText: string;
    description: string;
    rows: Array<{ description?: string; id: string; title: string }>;
    title: string;
  }) => Promise<void>;
  replyButtons?: (params: {
    buttons: Array<{ id: string; text: string }>;
    text: string;
  }) => Promise<void>;
  replyMedia: (
    buffer: Buffer,
    type: "image" | "video" | "sticker" | "document",
    caption?: string
  ) => Promise<void>;
}

export interface CommandHandler {
  name: string;
  aliases?: string[];
  description: string;
  usage: string;
  execute: (ctx: CommandContext) => Promise<void>;
}
