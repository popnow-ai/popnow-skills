// Reads pixel size (and alpha) from PNG, JPEG and WebP headers without decoding the image.

export function imageInfo(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    const colorType = buf[25];
    return { format: "png", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), alpha: colorType === 4 || colorType === 6 };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { format: "jpeg", width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5), alpha: false };
      }
      i += 2 + len;
    }
    return null;
  }
  if (buf.length > 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8 ") return { format: "webp", width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff, alpha: false };
    if (chunk === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { format: "webp", width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1, alpha: !!((b >> 28) & 1) };
    }
    if (chunk === "VP8X") {
      return { format: "webp", width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3), alpha: !!(buf[20] & 0x10) };
    }
  }
  return null;
}
