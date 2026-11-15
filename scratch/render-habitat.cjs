const fs = require('fs');
const path = require('path');
const { decodePNG, encodePNG } = require('./png-utils.cjs');

const hab = decodePNG('public/assets/buildings/habitat.png');
const { width, height, raw } = hab;
const out = Buffer.from(raw);

// Signboard region: x=136..205, y=117..135
// First, let's extract the exact font bitmaps for H, A, B, I, T from the original HABITAT
// Original letters were at:
// H: x=161..165, y=124..133
// A: x=167..171, y=124..133
// B: x=173..177, y=124..133
// I: x=179..181, y=124..133
// T: x=183..187, y=124..133
// A: x=189..193, y=124..133
// T: x=195..199, y=124..133

// Let's store the relative letter pixel offsets from original
function extractLetter(origStartX, letterW) {
  const pixels = [];
  for (let dy = 0; dy <= 9; dy++) {
    const y = 124 + dy;
    for (let dx = 0; dx < letterW; dx++) {
      const x = origStartX + dx;
      const idx = (y * width + x) * 4;
      const r = raw[idx], g = raw[idx+1], b = raw[idx+2], a = raw[idx+3];
      pixels.push({ dx, dy, r, g, b, a });
    }
  }
  return { w: letterW, h: 10, pixels };
}

const glyphH = extractLetter(161, 5);
const glyphA = extractLetter(167, 5);
const glyphB = extractLetter(173, 5);
const glyphI = extractLetter(179, 3);
const glyphT = extractLetter(183, 5);

// 1. Rebuild the clean background panel across x=136..205, y=117..135
// Sample background gradient from the clean right side (x=201..204)
for (let y = 117; y <= 135; y++) {
  // Sample background colors at y
  // To avoid noise, take the average of clean background pixels at x=201..203
  let sumR = 0, sumG = 0, sumB = 0, count = 0;
  for (let sx = 201; sx <= 203; sx++) {
    const sidx = (y * width + sx) * 4;
    sumR += raw[sidx];
    sumG += raw[sidx+1];
    sumB += raw[sidx+2];
    count++;
  }
  const bgR = Math.round(sumR / count);
  const bgG = Math.round(sumG / count);
  const bgB = Math.round(sumB / count);

  for (let x = 137; x <= 204; x++) {
    const idx = (y * width + x) * 4;
    // Don't overwrite the orange/dark frame of the door arch
    const origA = raw[idx+3];
    if (origA < 200) continue;

    // Slight horizontal gradient (left is slightly warmer, right has subtle shadow)
    const hFactor = 1.0 + (170 - x) * 0.0015;
    out[idx] = Math.max(0, Math.min(255, Math.round(bgR * hFactor)));
    out[idx+1] = Math.max(0, Math.min(255, Math.round(bgG * hFactor)));
    out[idx+2] = Math.max(0, Math.min(255, Math.round(bgB * hFactor)));
    out[idx+3] = 255;
  }
}

// 2. Render centered "HABITAT"
// Word layout: H (5), sp (1), A (5), sp (1), B (5), sp (1), I (3), sp (1), T (5), sp (1), A (5), sp (1), T (5)
// Total width = 39 pixels
// Centered at x=171 -> start at x = 152
const wordLayout = [
  { glyph: glyphH, x: 152 },
  { glyph: glyphA, x: 158 },
  { glyph: glyphB, x: 164 },
  { glyph: glyphI, x: 170 },
  { glyph: glyphT, x: 174 },
  { glyph: glyphA, x: 180 },
  { glyph: glyphT, x: 186 },
];

for (const item of wordLayout) {
  for (const p of item.glyph.pixels) {
    const px = item.x + p.dx;
    const py = 124 + p.dy;
    const idx = (py * width + px) * 4;
    
    // Check if pixel is text foreground vs background
    // Original letter pixels have lum < 185
    const lum = 0.299 * p.r + 0.587 * p.g + 0.114 * p.b;
    if (lum < 185) {
      out[idx] = p.r;
      out[idx+1] = p.g;
      out[idx+2] = p.b;
      out[idx+3] = 255;
    }
  }
}

fs.writeFileSync('scratch/habitat-preview.png', encodePNG(width, height, out));
console.log('Saved scratch/habitat-preview.png successfully!');
