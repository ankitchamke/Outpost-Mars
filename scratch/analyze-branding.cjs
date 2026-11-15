const fs = require('fs');
const path = require('path');
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

// 1. Analyze Habitat
const hab = decodePNG('public/assets/buildings/habitat.png');
console.log('Habitat size:', hab.width, 'x', hab.height);
// Check signage area: door arch is in center, around y=100-140, x=130-210
let bluePixels = [];
for (let y = 100; y < 145; y++) {
  for (let x = 120; x < 220; x++) {
    const idx = (y * hab.width + x) * 4;
    const r = hab.raw[idx], g = hab.raw[idx+1], b = hab.raw[idx+2], a = hab.raw[idx+3];
    if (a > 100 && b > 140 && r < 70 && g < 110) {
      bluePixels.push({ x, y, r, g, b });
    }
  }
}
if (bluePixels.length > 0) {
  const xs = bluePixels.map(p => p.x);
  const ys = bluePixels.map(p => p.y);
  console.log('Habitat blue meatball bbox:', {
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys),
    count: bluePixels.length
  });
}

// Also check the signboard bounding box on Habitat
// Let's see what is on the arch above the door:
console.log('Habitat signboard around y=110-135, x=130-210');

// 2. Analyze Flag
const flag = decodePNG('public/assets/environment/props/prop-flag-nasa.png');
console.log('Flag size:', flag.width, 'x', flag.height);
// Locate the flag cloth vs pole vs rock base
// Pole is vertical column, rocks are at bottom (y > 220 or so)
let flagBlue = [];
for (let y = 0; y < flag.height; y++) {
  for (let x = 0; x < flag.width; x++) {
    const idx = (y * flag.width + x) * 4;
    const r = flag.raw[idx], g = flag.raw[idx+1], b = flag.raw[idx+2], a = flag.raw[idx+3];
    if (a > 100 && b > 130 && r < 60 && g < 100) {
      flagBlue.push({ x, y, r, g, b });
    }
  }
}
if (flagBlue.length > 0) {
  const xs = flagBlue.map(p => p.x);
  const ys = flagBlue.map(p => p.y);
  console.log('Flag blue meatball bbox:', {
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys),
    count: flagBlue.length
  });
}

console.log('\n--- HABITAT SIGN DETAIL ---');
// Let's print out what text / colors are in y=110..130, x=135..205
for (let y = 110; y <= 132; y++) {
  let rowStr = `${y.toString().padStart(3)}: `;
  for (let x = 135; x <= 205; x++) {
    const idx = (y * hab.width + x) * 4;
    const r = hab.raw[idx], g = hab.raw[idx+1], b = hab.raw[idx+2], a = hab.raw[idx+3];
    if (a < 50) rowStr += ' ';
    else if (b > 140 && r < 70) rowStr += 'O'; // Blue logo
    else if (r > 180 && g < 70) rowStr += '/'; // Red chevron
    else if (r < 70 && g < 70 && b < 70) rowStr += '#'; // Dark text
    else if (r > 200 && g > 200 && b > 200) rowStr += '.'; // White/light background
    else if (r > 200 && g > 100 && b < 80) rowStr += '*'; // Orange border
    else rowStr += '-';
  }
  console.log(rowStr);
}
