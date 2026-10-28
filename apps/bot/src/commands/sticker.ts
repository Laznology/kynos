import {
  imageToSticker,
  injectExifToWebp,
  videoToAnimatedSticker,
} from "../media";
import type { CommandContext, CommandHandler } from "./types";

const getStickerMetadata = (ctx: CommandContext) => {
  const defaultPack = ctx.settings?.sticker_pack_name || "Kynos";
  const defaultAuthor = ctx.settings?.sticker_pack_author || "Kynos Bot";
  const parts = ctx.args.join(" ").split("|");
  return {
    author: parts[1]?.trim() || defaultAuthor,
    packName: parts[0]?.trim() || defaultPack,
  };
};

export const stickerCommand: CommandHandler = {
  aliases: ["s", "stiker"],
  description: "Convert an image, video, or GIF to WhatsApp sticker",
  execute: async (ctx) => {
    const targetBuffer = ctx.mediaBuffer || ctx.quoted?.mediaBuffer;
    const targetMime = (
      ctx.mimetype ||
      ctx.quoted?.mimetype ||
      ""
    ).toLowerCase();

    if (!targetBuffer) {
      await ctx.reply(
        "Please send an image/video/GIF with caption */s* or reply to media with */s*."
      );
      return;
    }

    const { packName, author } = getStickerMetadata(ctx);
    const isVideoOrGif =
      targetMime.includes("video") ||
      targetMime.includes("gif") ||
      Boolean(ctx.quoted?.isAnimated);

    try {
      const sticker = isVideoOrGif
        ? await videoToAnimatedSticker(targetBuffer, packName, author)
        : await imageToSticker(targetBuffer, packName, author);

      await ctx.replyMedia(sticker, "sticker");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await ctx.reply(`Failed to create sticker: ${msg}`);
    }
  },
  name: "sticker",
  usage: "/s [optional pack_name|author]",
};

export const takeCommand: CommandHandler = {
  aliases: ["wm", "steal"],
  description:
    "Change sticker pack name and publisher metadata of a quoted sticker",
  execute: async (ctx) => {
    const targetBuffer = ctx.quoted?.mediaBuffer;
    const isSticker =
      ctx.quoted?.isSticker || ctx.quoted?.mimetype?.includes("webp");

    if (!targetBuffer || !isSticker) {
      await ctx.reply(
        "Please reply to a sticker you want to retitle with */take <pack>|<author>*."
      );
      return;
    }

    const { packName, author } = getStickerMetadata(ctx);

    try {
      const modifiedSticker = injectExifToWebp(targetBuffer, packName, author);
      await ctx.replyMedia(modifiedSticker, "sticker");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await ctx.reply(`Failed to change sticker watermark: ${msg}`);
    }
  },
  name: "take",
  usage: "/take <pack_name>|<author>",
};
