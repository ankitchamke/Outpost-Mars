const fs = require('fs');
const path = require('path');
const { decodePNG, encodePNG } = require('./png-utils.cjs');

const flag = decodePNG('public/assets/environment/props/prop-flag-nasa.png');
const { width, height, raw } = flag;
const out = Buffer.from(raw);

// Clear stray artifacts on the far left (x < 15)
for (let y = 0; y < height; y++) {
  for (let x = 0; x < 15; x++) {
    out[(y * width + x) * 4 + 3] = 0;
  }
}

// Map the cloth interior
// The pole is at x <= 55, with rings extending to x = 58 at y ~ 30..35 and y ~ 145..150
// The rocks are at y >= 215
// For each column x from 58 to 223, find the inner cloth top and bottom:
const topEdge = new Int32Array(width).fill(-1);
const botEdge = new Int32Array(width).fill(-1);

for (let x = 58; x <= 223; x++) {
  // Find top edge of the cloth
  for (let y = 8; y < 180; y++) {
    const idx = (y * width + x) * 4;
    if (raw[idx + 3] > 180) {
      topEdge[x] = y;
      break;
    }
  }
  // Find bottom edge of the cloth
  for (let y = 180; y >= 8; y--) {
    const idx = (y * width + x) * 4;
    if (raw[idx + 3] > 180) {
      botEdge[x] = y;
      break;
    }
  }
}

// Function to calculate cloth fold lighting
function getClothLight(x, y, t) {
  // Sinusoidal fabric ripples
  const ripple1 = Math.sin((x - 65) * 0.052);
  const ripple2 = Math.cos((x - 110) * 0.038);
  
  let l = 1.0 + ripple1 * 0.13 + ripple2 * 0.07;
  // Subtle top-to-bottom shading
  l += (0.45 - t) * 0.15;

  // Bottom edge shadow
  if (t > 0.85) l -= (t - 0.85) * 0.7;
  // Top edge highlight
  if (t < 0.12) l += (0.12 - t) * 0.5;
  // Right trailing edge shadow
  if (x > 212) l -= (x - 212) * 0.03;

  return Math.max(0.70, Math.min(1.25, l));
}

// Planetary Emblem specs
const EMBLEM_X = 138;
const R_PLANET = 30; // 60px diameter Mars disc

// Palette
const COLOR_WHITE_CLOTH   = [252, 248, 250];
const COLOR_ORANGE_STRIPE = [232, 92, 36];
const COLOR_TRIM_GOLD     = [248, 150, 68];

// Mars palette
const MARS_CORE_BRIGHT    = [255, 136, 75];
const MARS_CORE_MID       = [224, 76, 28];
const MARS_CORE_DARK      = [156, 44, 18];
const MARS_CRATER         = [120, 32, 14];
const MARS_RIM_DARK       = [84, 22, 10];

// Orbit ring palette
const RING_WHITE          = [255, 255, 255];
const RING_CYAN           = [56, 189, 248];

// Replace the cloth interior
for (let x = 58; x <= 221; x++) {
  const top = topEdge[x];
  const bot = botEdge[x];
  if (top === -1 || bot === -1 || bot - top < 15) continue;
  const clothH = bot - top;

  // Keep a 2-pixel outer perimeter for the existing dark outline
  for (let y = top + 2; y <= bot - 2; y++) {
    // Also protect the left attachment grommets near pole (x <= 61)
    if (x <= 61 && (y < 42 || y > 138)) continue;

    const idx = (y * width + x) * 4;
    const t = (y - top) / clothH;
    const light = getClothLight(x, y, t);

    // Position relative to emblem center
    const localCenterY = (top + bot) / 2;
    const dx = x - EMBLEM_X;
    const dy = y - localCenterY;
    const distPlanet = Math.sqrt(dx * dx + dy * dy);

    // Elliptical orbit geometry (tilted at -26 degrees)
    const angleRad = 26 * Math.PI / 180;
    const rx = dx * Math.cos(angleRad) + dy * Math.sin(angleRad);
    const ry = -dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
    
    const a = 46.0; // semi-major axis
    const b = 15.0; // semi-minor axis
    const ringDist = Math.abs(Math.sqrt((rx / a) * (rx / a) + (ry / b) * (ry / b)) - 1.0);
    const isRing = ringDist < 0.085;
    const isFrontRing = (ry > 0); // lower arc in front of planet

    let r, g, b_val;

    if (distPlanet <= R_PLANET) {
      // 1. Inside Mars Disc
      if (distPlanet >= R_PLANET - 1.2) {
        // Crisp 1px outline
        r = MARS_RIM_DARK[0];
        g = MARS_RIM_DARK[1];
        b_val = MARS_RIM_DARK[2];
      } else {
        // Spherical 3D shading
        const nx = dx / R_PLANET;
        const ny = dy / R_PLANET;
        const nz = Math.sqrt(Math.max(0, 1.0 - nx * nx - ny * ny));
        // Light direction from upper-left
        const dot = -nx * 0.48 - ny * 0.48 + nz * 0.73;

        // Craters on Mars
        const dC1 = Math.sqrt((dx - 10) * (dx - 10) + (dy + 7) * (dy + 7));
        const dC2 = Math.sqrt((dx + 11) * (dx + 11) + (dy - 10) * (dy - 10));
        const dC3 = Math.sqrt((dx - 7) * (dx - 7) + (dy - 15) * (dy - 15));

        if (dC1 < 5.5 || dC2 < 5.0 || dC3 < 3.8) {
          r = MARS_CRATER[0];
          g = MARS_CRATER[1];
          b_val = MARS_CRATER[2];
        } else if (dot > 0.58) {
          const k = (dot - 0.58) / 0.42;
          r = MARS_CORE_MID[0] * (1 - k) + MARS_CORE_BRIGHT[0] * k;
          g = MARS_CORE_MID[1] * (1 - k) + MARS_CORE_BRIGHT[1] * k;
          b_val = MARS_CORE_MID[2] * (1 - k) + MARS_CORE_BRIGHT[2] * k;
        } else if (dot > 0.18) {
          const k = (dot - 0.18) / 0.40;
          r = MARS_CORE_DARK[0] * (1 - k) + MARS_CORE_MID[0] * k;
          g = MARS_CORE_DARK[1] * (1 - k) + MARS_CORE_MID[1] * k;
          b_val = MARS_CORE_DARK[2] * (1 - k) + MARS_CORE_MID[2] * k;
        } else {
          r = MARS_CORE_DARK[0];
          g = MARS_CORE_DARK[1];
          b_val = MARS_CORE_DARK[2];
        }

        // Front arc of orbit ring crosses in front of planet
        if (isFrontRing && isRing) {
          r = RING_WHITE[0];
          g = RING_WHITE[1];
          b_val = RING_WHITE[2];
        }
      }
    } else {
      // 2. Outside Mars Disc
      // Orbit Ring
      if (isRing) {
        if (isFrontRing) {
          r = RING_WHITE[0];
          g = RING_WHITE[1];
          b_val = RING_WHITE[2];
        } else {
          // Back arc
          r = RING_CYAN[0];
          g = RING_CYAN[1];
          b_val = RING_CYAN[2];
        }
      }

      // Satellite Beacon Node (near top-right of orbit, rx ~ 44, ry ~ -2)
      const dBeacon = Math.sqrt((dx - 39) * (dx - 39) + (dy + 19) * (dy + 19));
      if (dBeacon <= 3.2) {
        if (dBeacon <= 1.5) {
          r = 255; g = 255; b_val = 255;
        } else {
          r = RING_CYAN[0]; g = RING_CYAN[1]; b_val = RING_CYAN[2];
        }
      }

      // Background Stripes
      if (r === undefined) {
        const stripe = 0.21;
        if (t < stripe || t > (1.0 - stripe)) {
          r = COLOR_ORANGE_STRIPE[0];
          g = COLOR_ORANGE_STRIPE[1];
          b_val = COLOR_ORANGE_STRIPE[2];
        } else if (Math.abs(t - stripe) < 0.015 || Math.abs(t - (1.0 - stripe)) < 0.015) {
          r = COLOR_TRIM_GOLD[0];
          g = COLOR_TRIM_GOLD[1];
          b_val = COLOR_TRIM_GOLD[2];
        } else {
          r = COLOR_WHITE_CLOTH[0];
          g = COLOR_WHITE_CLOTH[1];
          b_val = COLOR_WHITE_CLOTH[2];
        }
      }
    }

    // Apply cloth fold lighting
    const finalR = Math.max(0, Math.min(255, Math.round(r * light)));
    const finalG = Math.max(0, Math.min(255, Math.round(g * light)));
    const finalB = Math.max(0, Math.min(255, Math.round(b_val * light)));

    out[idx] = finalR;
    out[idx + 1] = finalG;
    out[idx + 2] = finalB;
    out[idx + 3] = 255;
  }
}

fs.writeFileSync('scratch/flag-v3.png', encodePNG(width, height, out));
console.log('Saved scratch/flag-v3.png successfully!');
