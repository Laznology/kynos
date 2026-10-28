import { createSmeme } from "../media";
import type { CommandHandler } from "./types";

export const smemeCommand: CommandHandler = {
  aliases: ["smeme2", "memesticker"],
  description: "Create a sticker meme with top & bottom Impact typography text",
  execute: async (ctx) => {
    const targetBuffer = ctx.mediaBuffer || ctx.quoted?.mediaBuffer;

    if (!targetBuffer) {
      await ctx.reply(
        "Please send or reply to an image/sticker with */smeme top text|bottom text*."
      );
      return;
    }

    const rawText = ctx.args.join(" ");
    if (!rawText) {
      await ctx.reply(
        "Please provide meme text separated by '|': */smeme top text|bottom text*."
      );
      return;
    }

    const parts = rawText.split("|");
    const topText = parts[0]?.trim() || "";
    const bottomText = parts[1]?.trim() || "";

    const packName = ctx.settings?.sticker_pack_name || "Kynos";
    const author = ctx.settings?.sticker_pack_author || "Kynos Bot";

    try {
      const memeSticker = await createSmeme(
        targetBuffer,
        topText,
        bottomText,
        true,
        packName,
        author
      );
      await ctx.replyMedia(memeSticker, "sticker");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await ctx.reply(`Failed to create meme sticker: ${msg}`);
    }
  },
  name: "smeme",
  usage: "/smeme <top text>|<bottom text>",
};

export const smemeImgCommand: CommandHandler = {
  aliases: ["memeimg", "meme"],
  description:
    "Create a meme image (PNG) with top & bottom Impact typography text",
  execute: async (ctx) => {
    const targetBuffer = ctx.mediaBuffer || ctx.quoted?.mediaBuffer;

    if (!targetBuffer) {
      await ctx.reply(
        "Please send or reply to an image with */smemeimg top text|bottom text*."
      );
      return;
    }

    const rawText = ctx.args.join(" ");
    if (!rawText) {
      await ctx.reply(
        "Please provide meme text separated by '|': */smemeimg top text|bottom text*."
      );
      return;
    }

    const parts = rawText.split("|");
    const topText = parts[0]?.trim() || "";
    const bottomText = parts[1]?.trim() || "";

    try {
      const memeImg = await createSmeme(
        targetBuffer,
        topText,
        bottomText,
        false
      );
      await ctx.replyMedia(memeImg, "image", "Meme generated successfully.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await ctx.reply(`Failed to generate meme image: ${msg}`);
    }
  },
  name: "smemeimg",
  usage: "/smemeimg <top text>|<bottom text>",
};
