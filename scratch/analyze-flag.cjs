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

const flag = decodePNG('public/assets/environment/props/prop-flag-nasa.png');
console.log('Flag dimensions:', flag.width, 'x', flag.height);

// Let's find flag cloth bounds (white/off-white cloth area)
// Flagpole is on the left: find its x range
// Let's inspect rows y=0 to 339
let poleX = [];
for (let y = 50; y < 200; y++) {
  for (let x = 0; x < 80; x++) {
    const idx = (y * flag.width + x) * 4;
    const a = flag.raw[idx + 3];
    if (a > 100) {
      poleX.push(x);
    }
  }
}
console.log('Pole x bounds:', Math.min(...poleX), 'to', Math.max(...poleX));

// Let's find flag cloth bounds (x > poleX max)
let clothX = [], clothY = [];
for (let y = 0; y < 220; y++) {
  for (let x = 50; x < flag.width; x++) {
    const idx = (y * flag.width + x) * 4;
    const a = flag.raw[idx + 3];
    if (a > 50) {
      clothX.push(x);
      clothY.push(y);
    }
  }
}
console.log('Cloth bounds: x from', Math.min(...clothX), 'to', Math.max(...clothX),
            'y from', Math.min(...clothY), 'to', Math.max(...clothY));

// Rocks bounds at the bottom:
let rockY = [];
for (let y = 220; y < flag.height; y++) {
  for (let x = 0; x < flag.width; x++) {
    const idx = (y * flag.width + x) * 4;
    const a = flag.raw[idx + 3];
    if (a > 50) {
      rockY.push(y);
    }
  }
}
console.log('Rocks y bounds:', Math.min(...rockY), 'to', Math.max(...rockY));
