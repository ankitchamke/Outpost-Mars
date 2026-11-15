const fs = require('fs');
const zlib = require('zlib');

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

const hab = decodePNG('public/assets/buildings/habitat.png');

console.log('Sample background colors of the white panel:');
for (let y = 118; y <= 135; y += 2) {
  let samples = [];
  for (let x of [160, 172, 185, 202]) {
    const idx = (y * hab.width + x) * 4;
    samples.push(`(${hab.raw[idx]},${hab.raw[idx+1]},${hab.raw[idx+2]})`);
  }
  console.log(`y=${y}:`, samples.join(' '));
}

console.log('Text color samples (HABITAT letters):');
for (let x = 162; x <= 204; x++) {
  for (let y = 124; y <= 132; y++) {
    const idx = (y * hab.width + x) * 4;
    const r = hab.raw[idx], g = hab.raw[idx+1], b = hab.raw[idx+2];
    if (r < 60 && g < 70 && b < 80) {
      // Dark letter pixel
      // console.log(`x=${x}, y=${y}: (${r},${g},${b})`);
    }
  }
}
