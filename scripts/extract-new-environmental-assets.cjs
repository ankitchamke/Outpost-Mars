/**
 * OUTPOST: MARS — Extended Environmental Sheet Extractor
 * Extracts:
 * - NASA Flag from public/assets/environment/environmental-props.png
 * - Rock formations & ridges from public/assets/environment/rock-sprite-sheet.png
 * - Ripple dune formations from public/assets/environment/dunes-rippled-terrain.png
 * Destination: public/assets/environment/derived/
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const c = crc32(typeAndData);
  chunk.writeUInt32BE(c, 8 + len);
  return chunk;
}

function encodePNG(width, height, rgbaBuffer) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdrData);

  const stride = width * 4;
  const filtered = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    filtered[y * (stride + 1)] = 0;
    rgbaBuffer.copy(filtered, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(filtered, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function decodePNG(filePath) {
  const buf = fs.readFileSync(filePath);
  let pos = 8, width = 0, height = 0;
  const idatChunks = [];
  while (pos < buf.length) {
    const length = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IHDR') {
      width = buf.readUInt32BE(pos + 8);
      height = buf.readUInt32BE(pos + 12);
    } else if (type === 'IDAT') {
      idatChunks.push(buf.subarray(pos + 8, pos + 8 + length));
    } else if (type === 'IEND') break;
    pos += 12 + length;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = 4;
  const stride = width * bpp;
  const raw = Buffer.alloc(width * height * bpp);

  let srcPos = 0;
  for (let y = 0; y < height; y++) {
    const filter = decompressed[srcPos++];
    const row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const xByte = decompressed[srcPos++];
      const a = x >= bpp ? row[x - bpp] : 0;
      const b = y > 0 ? raw[(y - 1) * stride + x] : 0;
      const c = (y > 0 && x >= bpp) ? raw[(y - 1) * stride + (x - bpp)] : 0;
      let val = 0;
      switch (filter) {
        case 0: val = xByte; break;
        case 1: val = (xByte + a) & 0xff; break;
        case 2: val = (xByte + b) & 0xff; break;
        case 3: val = (xByte + Math.floor((a + b) / 2)) & 0xff; break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
          val = (xByte + pr) & 0xff;
          break;
        }
        default: val = xByte;
      }
      row[x] = val;
    }
    row.copy(raw, y * stride);
  }
  return { width, height, raw };
}

function extractBoundingBox(raw, sheetW, sheetH, x0, x1, y0, y1, pad = 2) {
  // Find tight bounds with alpha > 15
  let minX = x1, maxX = x0, minY = y1, maxY = y0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const a = raw[(y * sheetW + x) * 4 + 3];
      if (a > 15) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  minX = Math.max(0, minX - pad);
  maxX = Math.min(sheetW - 1, maxX + pad);
  minY = Math.max(0, minY - pad);
  maxY = Math.min(sheetH - 1, maxY + pad);

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const out = Buffer.alloc(w * h * 4);

  for (let y = 0; y < h; y++) {
    const sy = minY + y;
    for (let x = 0; x < w; x++) {
      const sx = minX + x;
      const sIdx = (sy * sheetW + sx) * 4;
      const dIdx = (y * w + x) * 4;
      out[dIdx] = raw[sIdx];
      out[dIdx + 1] = raw[sIdx + 1];
      out[dIdx + 2] = raw[sIdx + 2];
      out[dIdx + 3] = raw[sIdx + 3];
    }
  }

  return { w, h, buf: out };
}

const outDir = path.resolve('public/assets/environment/derived');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

console.log('[Extractor] Extracting NASA flag from environmental-props.png...');
const props = decodePNG('public/assets/environment/environmental-props.png');
// Prop 10: NASA Flag on flagpole planted in Martian rocks (X: 1926-2146, Y: 185-520)
const flag = extractBoundingBox(props.raw, props.width, props.height, 1920, 2150, 180, 530, 2);
fs.writeFileSync(path.join(outDir, 'prop-flag-nasa.png'), encodePNG(flag.w, flag.h, flag.buf));
console.log(`  -> prop-flag-nasa.png (${flag.w}x${flag.h})`);

console.log('[Extractor] Extracting rock formations from rock-sprite-sheet.png...');
const rocks = decodePNG('public/assets/environment/rock-sprite-sheet.png');
const rockSpecs = [
  { name: 'rock-monolith-01.png', box: [23, 382, 68, 350] },
  { name: 'rock-monolith-02.png', box: [761, 1116, 96, 350] },
  { name: 'rock-ridge-01.png', box: [47, 371, 401, 575] },
  { name: 'rock-ridge-02.png', box: [777, 1100, 401, 573] },
];

for (const s of rockSpecs) {
  const item = extractBoundingBox(rocks.raw, rocks.width, rocks.height, s.box[0], s.box[1], s.box[2], s.box[3], 2);
  fs.writeFileSync(path.join(outDir, s.name), encodePNG(item.w, item.h, item.buf));
  console.log(`  -> ${s.name} (${item.w}x${item.h})`);
}

console.log('[Extractor] Extracting dune formations from dunes-rippled-terrain.png...');
const dunes = decodePNG('public/assets/environment/dunes-rippled-terrain.png');
const duneSpecs = [
  { name: 'dune-ripple-01.png', box: [16, 484, 281, 452] },
  { name: 'dune-ripple-02.png', box: [851, 1270, 275, 456] },
  { name: 'dune-ripple-03.png', box: [1247, 1681, 265, 464] },
];

for (const s of duneSpecs) {
  const item = extractBoundingBox(dunes.raw, dunes.width, dunes.height, s.box[0], s.box[1], s.box[2], s.box[3], 2);
  fs.writeFileSync(path.join(outDir, s.name), encodePNG(item.w, item.h, item.buf));
  console.log(`  -> ${s.name} (${item.w}x${item.h})`);
}

console.log('[Extractor] Complete!');
