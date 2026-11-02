import { unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import sharp from "sharp";

import { injectExifToWebp } from "./exif";

export const imageToSticker = async (
  imageBuffer: Buffer,
  packName = "Kynos",
  author = "Kynos Bot"
): Promise<Buffer> => {
  const resized = await sharp(imageBuffer)
    .resize(512, 512, {
      background: { alpha: 0, b: 0, g: 0, r: 0 },
      fit: "contain",
    })
    .webp({ lossless: false, quality: 80 })
    .toBuffer();

  return injectExifToWebp(resized, packName, author);
};

const safeUnlink = (p: string) => {
  try {
    unlinkSync(p);
  } catch {
    // Ignore temp file cleanup error
  }
};

export const videoToAnimatedSticker = async (
  videoOrGifBuffer: Buffer,
  packName = "Kynos",
  author = "Kynos Bot"
): Promise<Buffer> => {
  const tempId = `kynos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const inputPath = path.join(tmpdir(), `${tempId}_in.tmp`);
  const outputPath = path.join(tmpdir(), `${tempId}_out.webp`);
  await Bun.write(inputPath, videoOrGifBuffer);

  try {
    const proc = Bun.spawn([
      "ffmpeg",
      "-y",
      "-t",
      "10",
      "-i",
      inputPath,
      "-vf",
      "fps=15,scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0,format=yuva420p",
      "-vcodec",
      "libwebp",
      "-lossless",
      "0",
      "-compression_level",
      "6",
      "-q:v",
      "70",
      "-loop",
      "0",
      "-an",
      "-vsync",
      "0",
      outputPath,
    ]);

    const code = await proc.exited;
    if (code !== 0) {
      throw new Error(`FFmpeg exited with error code ${code}`);
    }

    const resultBuffer = Buffer.from(await Bun.file(outputPath).arrayBuffer());
    return injectExifToWebp(resultBuffer, packName, author);
  } finally {
    safeUnlink(inputPath);
    safeUnlink(outputPath);
  }
};

export const stickerToImage = async (webpBuffer: Buffer): Promise<Buffer> =>
  await sharp(webpBuffer).png().toBuffer();

export const animatedStickerToGif = async (
  webpBuffer: Buffer
): Promise<Buffer> => {
  const tempId = `kynos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const inputPath = path.join(tmpdir(), `${tempId}_in.webp`);
  const outputPath = path.join(tmpdir(), `${tempId}_out.gif`);

  await Bun.write(inputPath, webpBuffer);

  try {
    const proc = Bun.spawn([
      "ffmpeg",
      "-y",
      "-i",
      inputPath,
      "-filter_complex",
      "[0:v]fps=15,format=rgba,split[s0][s1];[s0]palettegen=reserve_transparent=1[p];[s1][p]paletteuse=alpha_threshold=128:dither=sierra2_4a",
      "-loop",
      "0",
      "-gifflags",
      "-offsetting",
      outputPath,
    ]);

    const code = await proc.exited;
    if (code !== 0) {
      throw new Error(`FFmpeg GIF conversion exited with error code ${code}`);
    }

    return Buffer.from(await Bun.file(outputPath).arrayBuffer());
  } finally {
    safeUnlink(inputPath);
    safeUnlink(outputPath);
  }
};

export const animatedStickerToMp4 = async (
  webpBuffer: Buffer
): Promise<Buffer> => {
  const tempId = `kynos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const inputPath = path.join(tmpdir(), `${tempId}_in.webp`);
  const outputPath = path.join(tmpdir(), `${tempId}_out.mp4`);

  await Bun.write(inputPath, webpBuffer);

  try {
    const proc = Bun.spawn([
      "ffmpeg",
      "-y",
      "-i",
      inputPath,
      "-pix_fmt",
      "yuv420p",
      "-vf",
      "pad=ceil(iw/2)*2:ceil(ih/2)*2",
      outputPath,
    ]);

    const code = await proc.exited;
    if (code !== 0) {
      throw new Error(`FFmpeg MP4 conversion exited with error code ${code}`);
    }

    return Buffer.from(await Bun.file(outputPath).arrayBuffer());
  } finally {
    safeUnlink(inputPath);
    safeUnlink(outputPath);
  }
};
