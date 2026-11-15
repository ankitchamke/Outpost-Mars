const fs = require('fs');
const path = require('path');
const { decodePNG, encodePNG } = require('./png-utils.cjs');

const hab = decodePNG('public/assets/buildings/habitat.png');
const { width, height, raw } = hab;
const out = Buffer.from(raw);

// 1. Extract the original "HABITAT" word block intact
// x=161..201 (41 pixels), y=124..133 (10 rows)
const wordW = 41;
const wordH = 10;
const wordPixels = [];

for (let dy = 0; dy < wordH; dy++) {
  const y = 124 + dy;
  for (let dx = 0; dx < wordW; dx++) {
    const x = 161 + dx;
    const idx = (y * width + x) * 4;
    const r = raw[idx], g = raw[idx+1], b = raw[idx+2], a = raw[idx+3];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    wordPixels.push({ dx, dy, r, g, b, a, isLetter: lum < 175 });
  }
}

// 2. Clean the entire signboard panel from y=117 to 138, x=136 to 204
// Sample the clean background colors at each y from x=202..204
for (let y = 117; y <= 138; y++) {
  let sumR = 0, sumG = 0, sumB = 0, count = 0;
  for (let sx = 202; sx <= 204; sx++) {
    const sidx = (y * width + sx) * 4;
    sumR += raw[sidx];
    sumG += raw[sidx+1];
    sumB += raw[sidx+2];
    count++;
  }
  const bgR = Math.round(sumR / count);
  const bgG = Math.round(sumG / count);
  const bgB = Math.round(sumB / count);

  for (let x = 136; x <= 204; x++) {
    const idx = (y * width + x) * 4;
    // Don't overwrite the door frame at bottom or outside arch
    // At y=136..138, check if original was dark door frame / metal
    if (y >= 135) {
      // Check if original at this column on the right side was frame
      const refIdx = (y * width + 203) * 4;
      const refLum = 0.299 * raw[refIdx] + 0.587 * raw[refIdx+1] + 0.114 * raw[refIdx+2];
      if (refLum < 100) {
        // It's the frame row, don't overwrite with white
        continue;
      }
    }

    // Preserve the outer frame of the arch on the left
    if (x <= 136) {
      const origLum = 0.299 * raw[idx] + 0.587 * raw[idx+1] + 0.114 * raw[idx+2];
      if (origLum < 120) continue;
    }

    out[idx] = bgR;
    out[idx+1] = bgG;
    out[idx+2] = bgB;
    out[idx+3] = 255;
  }
}

// 3. Paste the intact "HABITAT" word block centered at x = 150, y = 124
const targetStartX = 150;
const targetStartY = 124;

for (const p of wordPixels) {
  if (p.isLetter) {
    const tx = targetStartX + p.dx;
    const ty = targetStartY + p.dy;
    const idx = (ty * width + tx) * 4;
    out[idx] = p.r;
    out[idx+1] = p.g;
    out[idx+2] = p.b;
    out[idx+3] = 255;
  }
}

fs.writeFileSync('scratch/habitat-preview-v2.png', encodePNG(width, height, out));
console.log('Saved scratch/habitat-preview-v2.png successfully!');
