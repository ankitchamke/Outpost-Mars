const fs = require('fs');
const path = require('path');
const { decodePNG, encodePNG } = require('./png-utils.cjs');

const flag = decodePNG('public/assets/environment/props/prop-flag-nasa.png');
const { width, height, raw } = flag;

// Clone the raw buffer so we can modify it
const out = Buffer.from(raw);

// 1. Identify flag cloth boundaries
// For each column x from 56 to 223, find the inner cloth top and bottom edges
const topEdge = new Int32Array(width).fill(-1);
const bottomEdge = new Int32Array(width).fill(-1);

for (let x = 56; x <= 223; x++) {
  // Find first pixel that is flag cloth (not pole)
  for (let y = 5; y < 180; y++) {
    const idx = (y * width + x) * 4;
    const a = raw[idx + 3];
    if (a > 150) {
      topEdge[x] = y;
      break;
    }
  }
  for (let y = 180; y >= 5; y--) {
    const idx = (y * width + x) * 4;
    const a = raw[idx + 3];
    if (a > 150) {
      bottomEdge[x] = y;
      break;
    }
  }
}

// Helper to determine if a pixel is inside the cloth (excluding outer 2px dark border)
function isClothInterior(x, y) {
  if (x < 57 || x > 221) return false;
  const top = topEdge[x];
  const bot = bottomEdge[x];
  if (top === -1 || bot === -1) return false;
  if (y <= top + 1 || y >= bot - 1) return false;
  return true;
}

// Clean any stray pixels on the far left artifact if present
for (let y = 0; y < height; y++) {
  for (let x = 0; x < 20; x++) {
    const idx = (y * width + x) * 4;
    out[idx + 3] = 0; // wipe stray crop artifact
  }
}

// 2. Compute fold shading modulation
// The flag has horizontal and vertical ripples.
// Let's create a natural cloth shading model based on x and normalized t
// We can calibrate it by sampling the white cloth in the original flag at x=65..75 and x=200..215
function getClothLighting(x, y, t) {
  // Primary vertical ripples: crests around x=85, x=185; troughs around x=60, x=140
  // Top-left light source: top is lighter, bottom is darker
  const wave1 = Math.sin((x - 60) * 0.045);
  const wave2 = Math.cos((x - 100) * 0.03);
  
  // Base light: higher at top, lower at bottom
  let light = 1.05 - t * 0.25;
  // Fold highlights and shadows
  light += wave1 * 0.14 + wave2 * 0.08;
  
  // Rightmost edge shadow
  if (x > 210) {
    light -= (x - 210) * 0.02;
  }
  // Bottom fold shadow
  if (t > 0.85) {
    light -= (t - 0.85) * 0.8;
  }
  // Top highlight
  if (t < 0.12) {
    light += (0.12 - t) * 0.7;
  }
  return Math.max(0.65, Math.min(1.30, light));
}

// 3. Define the Outpost Mars Colony Emblem
// Center of the emblem:
const emblemCenterX = 138;
// Center Y depends on the cloth wave: center of top and bottom at emblemCenterX
const emblemCenterY = (topEdge[emblemCenterX] + bottomEdge[emblemCenterX]) / 2;
const planetRadius = 26; // 52px diameter Mars disc

// Palette definitions:
// Mars Orange shades (matching UI & logo palette)
const MARS_ORANGE_BRIGHT = [255, 115, 60];
const MARS_ORANGE_MID    = [230, 85, 35];
const MARS_ORANGE_DARK   = [180, 50, 20];
const MARS_CRATER_DARK   = [145, 38, 16];
const MARS_CRESCENT_GLOW = [255, 175, 130];

// Flag White cloth shades
const CLOTH_WHITE        = [252, 248, 250];

// Orbit ring cyan/white colors
const ORBIT_WHITE        = [255, 255, 255];
const ORBIT_CYAN         = [56, 189, 248];

// Render the new cloth interior
for (let x = 57; x <= 221; x++) {
  const top = topEdge[x];
  const bot = bottomEdge[x];
  if (top === -1 || bot === -1) continue;
  const clothH = bot - top;

  for (let y = top + 2; y <= bot - 2; y++) {
    const idx = (y * width + x) * 4;
    const t = (y - top) / clothH;
    const light = getClothLighting(x, y, t);

    // Calculate position relative to planetary emblem center
    const dx = x - emblemCenterX;
    const dy = y - ((top + bot) / 2); // local wave-adjusted center
    const distFromPlanet = Math.sqrt(dx * dx + dy * dy);

    // Orbit ellipse geometry (rotated ~ -28 degrees)
    // Rotate coords by +28 degrees (0.488 rad)
    const angle = 28 * Math.PI / 180;
    const rx = dx * Math.cos(angle) + dy * Math.sin(angle);
    const ry = -dx * Math.sin(angle) + dy * Math.cos(angle);
    // Ellipse equation: (rx / a)^2 + (ry / b)^2 = 1
    // Orbit radius: a = 38, b = 13
    const orbitNorm = Math.sqrt((rx / 37) * (rx / 37) + (ry / 13) * (ry / 13));
    const isOrbitFront = (ry > 0); // front arc passes over/in front of planet
    const isOrbitPixel = Math.abs(orbitNorm - 1.0) < 0.11;
    const isOrbitClose = Math.abs(orbitNorm - 1.0) < 0.18;

    let baseR, baseG, baseB;

    // Check if on the Mars planet disc
    if (distFromPlanet <= planetRadius) {
      // Mars disc interior
      // Normalized distance from planet center
      const pNorm = distFromPlanet / planetRadius;
      // Light source on planet from top-left: (-0.4, -0.4)
      const pdx = dx / planetRadius;
      const pdy = dy / planetRadius;
      const sphereZ = Math.sqrt(Math.max(0, 1 - pdx*pdx - pdy*pdy));
      // Dot product with light dir (-0.5, -0.5, 0.7)
      const dot = -pdx * 0.45 - pdy * 0.45 + sphereZ * 0.77;

      // Surface features / craters on Mars:
      // Crater 1: (dx: +8, dy: -5, r: 6)
      const dCrater1 = Math.sqrt((dx - 8)*(dx - 8) + (dy + 5)*(dy + 5));
      // Crater 2: (dx: -9, dy: +9, r: 5)
      const dCrater2 = Math.sqrt((dx + 9)*(dx + 9) + (dy - 9)*(dy - 9));
      // Crater 3: (dx: +5, dy: +12, r: 4)
      const dCrater3 = Math.sqrt((dx - 5)*(dx - 5) + (dy - 12)*(dy - 12));

      if (dCrater1 < 6.5) {
        baseR = MARS_CRATER_DARK[0];
        baseG = MARS_CRATER_DARK[1];
        baseB = MARS_CRATER_DARK[2];
      } else if (dCrater2 < 5.0) {
        baseR = MARS_CRATER_DARK[0];
        baseG = MARS_CRATER_DARK[1];
        baseB = MARS_CRATER_DARK[2];
      } else if (dCrater3 < 3.8) {
        baseR = MARS_CRATER_DARK[0];
        baseG = MARS_CRATER_DARK[1];
        baseB = MARS_CRATER_DARK[2];
      } else {
        // Spherical shading
        if (dot > 0.65) {
          // Highlight region
          const mix = (dot - 0.65) / 0.35;
          baseR = MARS_ORANGE_BRIGHT[0] * (1 - mix) + MARS_CRESCENT_GLOW[0] * mix;
          baseG = MARS_ORANGE_BRIGHT[1] * (1 - mix) + MARS_CRESCENT_GLOW[1] * mix;
          baseB = MARS_ORANGE_BRIGHT[2] * (1 - mix) + MARS_CRESCENT_GLOW[2] * mix;
        } else if (dot > 0.2) {
          const mix = (dot - 0.2) / 0.45;
          baseR = MARS_ORANGE_MID[0] * (1 - mix) + MARS_ORANGE_BRIGHT[0] * mix;
          baseG = MARS_ORANGE_MID[1] * (1 - mix) + MARS_ORANGE_BRIGHT[1] * mix;
          baseB = MARS_ORANGE_MID[2] * (1 - mix) + MARS_ORANGE_BRIGHT[2] * mix;
        } else {
          const mix = Math.max(0, dot / 0.2);
          baseR = MARS_ORANGE_DARK[0] * (1 - mix) + MARS_ORANGE_MID[0] * mix;
          baseG = MARS_ORANGE_DARK[1] * (1 - mix) + MARS_ORANGE_MID[1] * mix;
          baseB = MARS_ORANGE_DARK[2] * (1 - mix) + MARS_ORANGE_MID[2] * mix;
        }
      }

      // Planet perimeter antialiasing / crisp border:
      if (distFromPlanet > planetRadius - 1.2) {
        baseR = Math.round(baseR * 0.7);
        baseG = Math.round(baseG * 0.7);
        baseB = Math.round(baseB * 0.7);
      }

      // Check if orbit front passes over planet
      if (isOrbitFront && isOrbitPixel) {
        baseR = 255; baseG = 255; baseB = 255;
      }
    } else {
      // Outside the planet disc:
      // Check if this pixel is the orbit ring
      if (isOrbitPixel) {
        // Orbit ring line
        if (isOrbitFront) {
          baseR = ORBIT_WHITE[0];
          baseG = ORBIT_WHITE[1];
          baseB = ORBIT_WHITE[2];
        } else {
          // Back arc: dashed/subtle cyan
          const segment = Math.floor((Math.atan2(ry, rx) + Math.PI) * 5) % 2;
          if (segment === 0) {
            baseR = 14, baseG = 165, baseB = 233;
          } else {
            // gap in back arc - fall through to flag cloth background
            baseR = null;
          }
        }
      }
      
      // Satellite beacon on the orbit ring (around top right of front arc)
      // dx ~ 30, dy ~ -16
      const dBeacon = Math.sqrt((dx - 30)*(dx - 30) + (dy + 15)*(dy + 15));
      if (dBeacon <= 3.2) {
        if (dBeacon <= 1.5) {
          baseR = 255; baseG = 255; baseB = 255;
        } else {
          baseR = ORBIT_CYAN[0]; baseG = ORBIT_CYAN[1]; baseB = ORBIT_CYAN[2];
        }
      }

      // If not orbit ring or was a gap in back arc, render flag cloth background:
      if (baseR === undefined || baseR === null) {
        // Orange top and bottom stripes (t < 0.20 or t > 0.80)
        // With smooth 1px antialiased transition
        const stripeThickness = 0.21;
        if (t < stripeThickness || t > (1.0 - stripeThickness)) {
          // Orange stripe
          // Deepen slightly towards the fold hem
          baseR = 235;
          baseG = 92;
          baseB = 35;
          if (t < 0.08 || t > 0.92) {
            baseR = 210; baseG = 75; baseB = 25;
          }
        } else if (Math.abs(t - stripeThickness) < 0.015 || Math.abs(t - (1.0 - stripeThickness)) < 0.015) {
          // Transition border (gold/terracotta line)
          baseR = 245; baseG = 140; baseB = 75;
        } else {
          // White center field
          baseR = CLOTH_WHITE[0];
          baseG = CLOTH_WHITE[1];
          baseB = CLOTH_WHITE[2];
        }
      }
    }

    // Apply cloth fold lighting
    const finalR = Math.max(0, Math.min(255, Math.round(baseR * light)));
    const finalG = Math.max(0, Math.min(255, Math.round(baseG * light)));
    const finalB = Math.max(0, Math.min(255, Math.round(baseB * light)));

    out[idx] = finalR;
    out[idx + 1] = finalG;
    out[idx + 2] = finalB;
    out[idx + 3] = 255;
  }
}

// Write preview image
fs.writeFileSync('scratch/flag-preview.png', encodePNG(width, height, out));
console.log('Saved scratch/flag-preview.png successfully!');
