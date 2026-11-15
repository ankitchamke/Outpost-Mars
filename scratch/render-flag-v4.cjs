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

// Map top and bottom cloth boundary
const topEdge = new Int32Array(width).fill(-1);
const botEdge = new Int32Array(width).fill(-1);

for (let x = 56; x <= 223; x++) {
  for (let y = 5; y < 185; y++) {
    const idx = (y * width + x) * 4;
    if (raw[idx + 3] > 140) {
      topEdge[x] = y;
      break;
    }
  }
  for (let y = 185; y >= 5; y--) {
    const idx = (y * width + x) * 4;
    if (raw[idx + 3] > 140) {
      botEdge[x] = y;
      break;
    }
  }
}

// Cloth fold lighting
function getClothLight(x, y, t) {
  const ripple1 = Math.sin((x - 65) * 0.052);
  const ripple2 = Math.cos((x - 110) * 0.038);
  let l = 1.0 + ripple1 * 0.12 + ripple2 * 0.06;
  l += (0.45 - t) * 0.14;
  if (t > 0.86) l -= (t - 0.86) * 0.7;
  if (t < 0.12) l += (0.12 - t) * 0.5;
  if (x > 212) l -= (x - 212) * 0.025;
  return Math.max(0.72, Math.min(1.24, l));
}

// Center of the emblem
const EMBLEM_X = 138;
const EMBLEM_Y = Math.round((topEdge[EMBLEM_X] + botEdge[EMBLEM_X]) / 2); // fixed true center Y
const R_PLANET = 27; // 54px diameter true circle

// Colors
const COLOR_WHITE_CLOTH   = [252, 248, 250];
const COLOR_ORANGE_STRIPE = [232, 92, 36];
const COLOR_TRIM_GOLD     = [248, 150, 68];

// Mars palette
const MARS_CORE_BRIGHT    = [255, 138, 76];
const MARS_CORE_MID       = [224, 78, 30];
const MARS_CORE_DARK      = [156, 44, 18];
const MARS_CRATER         = [124, 34, 16];
const MARS_RIM_DARK       = [88, 24, 12];

// Orbit ring cyan palette (from logo.svg)
const ORBIT_CYAN_LIGHT    = [56, 189, 248];
const ORBIT_CYAN_MID      = [2, 132, 199];
const ORBIT_CYAN_DARK     = [3, 105, 161];

for (let x = 56; x <= 221; x++) {
  const top = topEdge[x];
  const bot = botEdge[x];
  if (top === -1 || bot === -1 || bot - top < 15) continue;
  const clothH = bot - top;

  for (let y = top + 2; y <= bot - 2; y++) {
    // Keep flagpole sleeve and grommets intact
    if (x <= 60 && (y < 42 || y > 138)) continue;

    const idx = (y * width + x) * 4;
    const t = (y - top) / clothH;
    const light = getClothLight(x, y, t);

    // True circular coordinates (fixed center, no shearing)
    const dx = x - EMBLEM_X;
    const dy = y - EMBLEM_Y;
    const distPlanet = Math.sqrt(dx * dx + dy * dy);

    // Elliptical orbit geometry (tilted at -26 degrees)
    const angleRad = 26 * Math.PI / 180;
    const rx = dx * Math.cos(angleRad) + dy * Math.sin(angleRad);
    const ry = -dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
    
    const a = 44.0; // semi-major axis
    const b = 14.0; // semi-minor axis
    const ringDist = Math.abs(Math.sqrt((rx / a) * (rx / a) + (ry / b) * (ry / b)) - 1.0);
    const isRing = ringDist < 0.085;
    const isFrontRing = (ry > 0); // lower-left arc in front

    let r, g, b_val;

    if (distPlanet <= R_PLANET) {
      // 1. Mars Planet Disc
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
        const dot = -nx * 0.48 - ny * 0.48 + nz * 0.73;

        // Craters on Mars
        const dC1 = Math.sqrt((dx - 8) * (dx - 8) + (dy + 6) * (dy + 6));
        const dC2 = Math.sqrt((dx + 9) * (dx + 9) + (dy - 8) * (dy - 8));
        const dC3 = Math.sqrt((dx - 4) * (dx - 4) + (dy - 13) * (dy - 13));

        if (dC1 < 4.8 || dC2 < 4.2 || dC3 < 3.2) {
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

        // Translucent orbit track across lower half of Mars
        if (isFrontRing && isRing) {
          // Blend cyan track over Mars surface
          const blend = 0.65;
          r = Math.round(r * (1 - blend) + ORBIT_CYAN_LIGHT[0] * blend);
          g = Math.round(g * (1 - blend) + ORBIT_CYAN_LIGHT[1] * blend);
          b_val = Math.round(b_val * (1 - blend) + ORBIT_CYAN_LIGHT[2] * blend);
        }
      }
    } else {
      // 2. Outside Planet Disc
      // Orbit Ring
      if (isRing) {
        if (isFrontRing) {
          r = ORBIT_CYAN_LIGHT[0];
          g = ORBIT_CYAN_LIGHT[1];
          b_val = ORBIT_CYAN_LIGHT[2];
        } else {
          r = ORBIT_CYAN_MID[0];
          g = ORBIT_CYAN_MID[1];
          b_val = ORBIT_CYAN_MID[2];
        }
      }

      // Satellite Beacon Node (rx ~ 42, ry ~ -2)
      const dBeacon = Math.sqrt((dx - 37) * (dx - 37) + (dy + 18) * (dy + 18));
      if (dBeacon <= 3.0) {
        if (dBeacon <= 1.4) {
          r = 255; g = 255; b_val = 255;
        } else {
          r = ORBIT_CYAN_LIGHT[0]; g = ORBIT_CYAN_LIGHT[1]; b_val = ORBIT_CYAN_LIGHT[2];
        }
      }

      // Background Stripes
      if (r === undefined) {
        const stripe = 0.20;
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

fs.writeFileSync('scratch/flag-v4.png', encodePNG(width, height, out));
console.log('Saved scratch/flag-v4.png successfully!');
