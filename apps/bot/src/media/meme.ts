import sharp from "sharp";

import { injectExifToWebp } from "./exif";

const escapeXml = (unsafe: string): string =>
  unsafe
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const wrapText = (text: string, maxCharsPerLine = 22): string[] => {
  const words = text.trim().toUpperCase().split(/\s+/u);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!word) {
      continue;
    }
    if (!currentLine) {
      currentLine = word;
    } else if (`${currentLine} ${word}`.length <= maxCharsPerLine) {
      currentLine += ` ${word}`;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
};

export const createSmeme = async (
  imageBuffer: Buffer,
  topText: string,
  bottomText: string,
  asSticker = true,
  packName = "Kynos",
  author = "Kynos Bot"
): Promise<Buffer> => {
  const width = 512;
  const height = 512;

  const baseImage = await sharp(imageBuffer)
    .resize(width, height, {
      background: { alpha: 0, b: 0, g: 0, r: 0 },
      fit: "contain",
    })
    .png()
    .toBuffer();

  const topLines = topText ? wrapText(topText) : [];
  const bottomLines = bottomText ? wrapText(bottomText) : [];

  const maxLines = Math.max(topLines.length, bottomLines.length, 1);
  let fontSize = 42;
  if (maxLines > 2) {
    fontSize = 30;
  } else if (maxLines > 1) {
    fontSize = 36;
  }
  const lineHeight = Math.round(fontSize * 1.15);
  const strokeWidth = Math.max(3, Math.round(fontSize * 0.12));

  let topTspans = "";
  for (const [idx, line] of topLines.entries()) {
    const y = 45 + idx * lineHeight;
    topTspans += `<text x="256" y="${y}" class="meme-text">${escapeXml(line)}</text>`;
  }

  let bottomTspans = "";
  const bottomTotalHeight = bottomLines.length * lineHeight;
  for (const [idx, line] of bottomLines.entries()) {
    const y = 490 - bottomTotalHeight + (idx + 1) * lineHeight - 10;
    bottomTspans += `<text x="256" y="${y}" class="meme-text">${escapeXml(line)}</text>`;
  }

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .meme-text {
        font-family: Impact, "Arial Black", "Trebuchet MS", sans-serif;
        font-weight: 900;
        fill: #FFFFFF;
        stroke: #000000;
        stroke-width: ${strokeWidth}px;
        stroke-linejoin: round;
        stroke-linecap: round;
        paint-order: stroke fill;
        text-anchor: middle;
        font-size: ${fontSize}px;
        letter-spacing: 1px;
      }
    </style>
    ${topTspans}
    ${bottomTspans}
  </svg>
  `;

  const composited = await sharp(baseImage)
    .composite([
      {
        input: Buffer.from(svg),
        left: 0,
        top: 0,
      },
    ])
    .webp({ lossless: false, quality: 85 })
    .toBuffer();

  if (asSticker) {
    return injectExifToWebp(composited, packName, author);
  }

  return sharp(composited).png().toBuffer();
};
