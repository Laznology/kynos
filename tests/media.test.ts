import { describe, expect, it } from "bun:test";

import sharp from "sharp";

import {
  imageToSticker,
  stickerToImage,
  createSmeme,
  videoToAnimatedSticker,
  animatedStickerToGif,
  animatedStickerToMp4,
  buildStickerExif,
} from "../apps/bot/src/media";

describe("Media Engine (Sharp + FFmpeg)", () => {
  it("should build sticker EXIF buffer", () => {
    const exif = buildStickerExif("CustomPack", "AuthorTest");
    expect(exif.length).toBeGreaterThan(0);
    expect(exif.includes(Buffer.from("EXIF"))).toBe(true);
    expect(exif.includes(Buffer.from("CustomPack"))).toBe(true);
  });

  it("should convert image to WebP sticker with EXIF metadata", async () => {
    const sample = await sharp({
      create: {
        background: { alpha: 1, b: 200, g: 150, r: 100 },
        channels: 4,
        height: 200,
        width: 200,
      },
    })
      .png()
      .toBuffer();

    const sticker = await imageToSticker(sample, "KynosPack", "Author");
    expect(sticker.length).toBeGreaterThan(0);
    expect(sticker.includes(Buffer.from("WEBP"))).toBe(true);
    expect(sticker.includes(Buffer.from("EXIF"))).toBe(true);
    expect(sticker.includes(Buffer.from("KynosPack"))).toBe(true);
  });

  it("should convert sticker back to PNG image", async () => {
    const sample = await sharp({
      create: {
        background: { alpha: 1, b: 50, g: 50, r: 50 },
        channels: 4,
        height: 100,
        width: 100,
      },
    })
      .webp()
      .toBuffer();

    const png = await stickerToImage(sample);
    const meta = await sharp(png).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(100);
    expect(meta.height).toBe(100);
  });

  it("should generate Impact typography smeme sticker and png image", async () => {
    const sample = await sharp({
      create: {
        background: { alpha: 1, b: 80, g: 80, r: 200 },
        channels: 4,
        height: 300,
        width: 300,
      },
    })
      .png()
      .toBuffer();

    const memeSticker = await createSmeme(
      sample,
      "TOP TEXT TEST",
      "BOTTOM TEXT TEST",
      true
    );
    expect(memeSticker.includes(Buffer.from("EXIF"))).toBe(true);

    const memePng = await createSmeme(sample, "TOP TEXT", "BOTTOM TEXT", false);
    const meta = await sharp(memePng).metadata();
    expect(meta.format).toBe("png");
  });

  it("should convert video to animated WebP sticker and export to GIF / MP4", async () => {
    const proc = Bun.spawn([
      "ffmpeg",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "testsrc=duration=1:size=120x120:rate=10",
      "-pix_fmt",
      "yuv420p",
      "-f",
      "mp4",
      "/tmp/kynos_unit_vid.mp4",
    ]);
    await proc.exited;

    const vidBuffer = Buffer.from(
      await Bun.file("/tmp/kynos_unit_vid.mp4").arrayBuffer()
    );
    const animWebp = await videoToAnimatedSticker(
      vidBuffer,
      "AnimPack",
      "AnimAuthor"
    );
    expect(animWebp.length).toBeGreaterThan(0);
    expect(animWebp.includes(Buffer.from("WEBP"))).toBe(true);

    const gif = await animatedStickerToGif(animWebp);
    expect(gif.length).toBeGreaterThan(0);

    const mp4 = await animatedStickerToMp4(animWebp);
    expect(mp4.length).toBeGreaterThan(0);
  });
});
