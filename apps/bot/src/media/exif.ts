export const buildStickerExif = (
  packName = "Kynos",
  author = "Kynos Bot",
  emojis: string[] = [""]
): Buffer => {
  const json = JSON.stringify({
    emojis,
    "sticker-pack-id": "com.kynos.stickers",
    "sticker-pack-name": packName,
    "sticker-pack-publisher": author,
  });

  const jsonLen = Buffer.byteLength(json);
  const exifHeader = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
  ]);
  const ifd0 = Buffer.alloc(2 + 12 + 4);
  ifd0.writeUInt16LE(1, 0);
  ifd0.writeUInt16LE(0x54_44, 2);
  ifd0.writeUInt16LE(7, 4);
  ifd0.writeUInt32LE(jsonLen, 6);
  const offsetToJson = 8 + ifd0.length;
  ifd0.writeUInt32LE(offsetToJson, 10);
  ifd0.writeUInt32LE(0, 14);

  const exifBody = Buffer.concat([
    exifHeader,
    ifd0,
    Buffer.from(json, "utf-8"),
  ]);
  const exifChunkHeader = Buffer.from("EXIF");
  const sizeBuf = Buffer.alloc(4);
  sizeBuf.writeUInt32LE(exifBody.length, 0);

  const paddedBody =
    exifBody.length % 2 === 1
      ? Buffer.concat([exifBody, Buffer.from([0])])
      : exifBody;
  return Buffer.concat([exifChunkHeader, sizeBuf, paddedBody]);
};

export const injectExifToWebp = (
  webpBuffer: Buffer,
  packName = "Kynos",
  author = "Kynos Bot"
): Buffer => {
  const exifChunk = buildStickerExif(packName, author);
  let offset = 12;
  const chunks: { tag: string; data: Buffer }[] = [];
  while (offset < webpBuffer.length) {
    if (offset + 8 > webpBuffer.length) {
      break;
    }
    const tag = webpBuffer.toString("ascii", offset, offset + 4);
    const size = webpBuffer.readUInt32LE(offset + 4);
    const chunkSize = 8 + size + (size % 2);
    const chunkData = webpBuffer.subarray(
      offset,
      Math.min(offset + chunkSize, webpBuffer.length)
    );
    if (tag !== "EXIF") {
      chunks.push({ data: chunkData, tag });
    }
    offset += chunkSize;
  }

  const content = Buffer.concat([...chunks.map((c) => c.data), exifChunk]);
  const riffHeader = Buffer.alloc(12);
  riffHeader.write("RIFF", 0);
  riffHeader.writeUInt32LE(content.length + 4, 4);
  riffHeader.write("WEBP", 8);

  return Buffer.concat([riffHeader, content]);
};
