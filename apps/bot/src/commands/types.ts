export interface CommandContext {
  jid: string;
  sender: string;
  senderName?: string;
  isGroup: boolean;
  args: string[];
  fullText: string;
  commandName: string;
  mediaBuffer?: Buffer;
  mimetype?: string;
  quoted?: {
    text?: string;
    mediaBuffer?: Buffer;
    mimetype?: string;
    isSticker?: boolean;
    isAnimated?: boolean;
  };
  reply: (text: string) => Promise<void>;
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
