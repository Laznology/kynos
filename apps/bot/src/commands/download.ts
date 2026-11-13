import { downloadMediaFromUrl } from "../media";
import type { CommandHandler } from "./types";

const getMediaType = (
  mimeType: string
): "image" | "video" | "document" => {
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  return "document";
};

export const downloadCommand: CommandHandler = {
  aliases: ["download"],
  description:
    "Download media dari link TikTok, Facebook, X, Instagram, Threads, atau YouTube",
  execute: async (ctx) => {
    const inputUrl = ctx.args[0];
    if (!inputUrl) {
      await ctx.reply(
        "Kirim link yang ingin didownload.\nContoh: */dl https://www.facebook.com/share/r/...*"
      );
      return;
    }

    await ctx.reply("Sedang mendownload media...");
    try {
      const media = await downloadMediaFromUrl(inputUrl);
      await ctx.replyMedia(
        media.buffer,
        getMediaType(media.mimeType),
        "Berhasil didownload oleh Kynos."
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.reply(`Download gagal: ${message}`);
    }
  },
  name: "dl",
  usage: "/dl <link TikTok|Facebook|X|Instagram|Threads|YouTube>",
};
