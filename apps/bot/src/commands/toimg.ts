import {
  animatedStickerToGif,
  animatedStickerToMp4,
  stickerToImage,
} from "../media";
import type { CommandHandler } from "./types";

export const toImgCommand: CommandHandler = {
  aliases: ["toimage", "image"],
  description: "Convert a quoted WhatsApp sticker into a PNG image",
  execute: async (ctx) => {
    const targetBuffer = ctx.quoted?.mediaBuffer || ctx.mediaBuffer;
    const isSticker =
      ctx.quoted?.isSticker || ctx.quoted?.mimetype?.includes("webp");

    if (!targetBuffer || !isSticker) {
      await ctx.reply(
        "Please reply to a static or animated sticker with */toimg*."
      );
      return;
    }

    try {
      const pngBuffer = await stickerToImage(targetBuffer);
      await ctx.replyMedia(
        pngBuffer,
        "image",
        "Sticker converted to image successfully."
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await ctx.reply(`Failed to convert sticker to image: ${msg}`);
    }
  },
  name: "toimg",
  usage: "/toimg (reply to a sticker)",
};

export const toGifCommand: CommandHandler = {
  aliases: ["gif"],
  description: "Convert a quoted animated sticker into a GIF",
  execute: async (ctx) => {
    const targetBuffer = ctx.quoted?.mediaBuffer || ctx.mediaBuffer;
    const isSticker =
      ctx.quoted?.isSticker || ctx.quoted?.mimetype?.includes("webp");

    if (!targetBuffer || !isSticker) {
      await ctx.reply("Please reply to an animated sticker with */togif*.");
      return;
    }

    try {
      const gifBuffer = await animatedStickerToGif(targetBuffer);
      await ctx.replyMedia(
        gifBuffer,
        "video",
        "Animated sticker converted to GIF successfully."
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await ctx.reply(`Failed to convert sticker to GIF: ${msg}`);
    }
  },
  name: "togif",
  usage: "/togif (reply to an animated sticker)",
};

export const toMp4Command: CommandHandler = {
  aliases: ["tovideo", "video"],
  description: "Convert a quoted animated sticker into an MP4 video",
  execute: async (ctx) => {
    const targetBuffer = ctx.quoted?.mediaBuffer || ctx.mediaBuffer;
    const isSticker =
      ctx.quoted?.isSticker || ctx.quoted?.mimetype?.includes("webp");

    if (!targetBuffer || !isSticker) {
      await ctx.reply("Please reply to an animated sticker with */tomp4*.");
      return;
    }

    try {
      const mp4Buffer = await animatedStickerToMp4(targetBuffer);
      await ctx.replyMedia(
        mp4Buffer,
        "video",
        "Animated sticker converted to MP4 video successfully."
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await ctx.reply(`Failed to convert sticker to MP4: ${msg}`);
    }
  },
  name: "tomp4",
  usage: "/tomp4 (reply to an animated sticker)",
};
