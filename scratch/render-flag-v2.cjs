const fs = require('fs');
const path = require('path');
const { decodePNG, encodePNG } = require('./png-utils.cjs');

const flag = decodePNG('public/assets/environment/props/prop-flag-nasa.png');
const { width, height, raw } = flag;
const out = Buffer.from(raw);

// Determine the top and bottom inner boundary of the cloth for each x
// We also extract the original cloth luminance to guide fold shading
const topCloth = new Int32Array(width).fill(-1);
const botCloth = new Int32Array(width).fill(-1);

// Find exact cloth boundary
for (let x = 58; x <= 223; x++) {
  // Find top of cloth interior (alpha > 200, lum > 40)
  for (let y = 5; y < 180; y++) {
    const idx = (y * width + x) * 4;
    const a = raw[idx + 3];
    if (a > 150) {
      const r = raw[idx], g = raw[idx+1], b = raw[idx+2];
      const lum = 0.299*r + 0.587*g + 0.114*b;
      // Skip dark outline (lum < 40)
      if (lum > 40) {
        topCloth[x] = y;
        break;
      }
    }
  }
  // Find bottom of cloth interior
  for (let y = 180; y >= 5; y--) {
    const idx = (y * width + x) * 4;
    const a = raw[idx + 3];
    if (a > 150) {
      const r = raw[idx], g = raw[idx+1], b = raw[idx+2];
      const lum = 0.299*r + 0.587*g + 0.114*b;
      if (lum > 40) {
        botCloth[x] = y;
        break;
      }
    }
  }
}

// Clean any stray pixels on the left border (crop artifact)
for (let y = 0; y < height; y++) {
  for (let x = 0; x < 25; x++) {
    const idx = (y * width + x) * 4;
    // only clear if isolated from pole
    if (x < 15) out[idx + 3] = 0;
  }
}

// Cloth shading function: gives realistic waving fold modulation
function getFoldLighting(x, y, t) {
  // Wave ripples across width
  const w1 = Math.sin((x - 68) * 0.052);
  const w2 = Math.cos((x - 110) * 0.038);
  
  // Base light: highlights on crests, shadows in troughs
  let l = 1.02 + w1 * 0.12 + w2 * 0.07;
  // Vertical gradient (light from top-left)
  l += (0.5 - t) * 0.18;
  
  // Edge hem shadows
  if (t > 0.88) l -= (t - 0.88) * 0.9;
  if (t < 0.10) l += (0.10 - t) * 0.6;
  if (x > 214) l -= (x - 214) * 0.025;

  return Math.max(0.72, Math.min(1.22, l));
}

const emblemX = 138;
const emblemY = (topCloth[emblemX] + botCloth[emblemX]) / 2;
const R_PLANET = 24;

// Colors
const COLOR_WHITE_CLOTH = [252, 248, 250];
const COLOR_ORANGE_STRIPE = [232, 90, 34];
const COLOR_STRIPE_TRIM = [246, 142, 62];

// Planet colors
const PLANET_HIGHLIGHT = [255, 140, 75];
const PLANET_BODY      = [222, 78, 30];
const PLANET_SHADOW    = [148, 42, 16];
const PLANET_CRATER    = [118, 32, 14];
const PLANET_OUTLINE   = [90, 24, 12];

// Orbit ring colors
const RING_WHITE       = [255, 255, 255];
const RING_CYAN        = [125, 211, 252];

// Render cloth
for (let x = 58; x <= 223; x++) {
  const top = topCloth[x];
  const bot = botCloth[x];
  if (top === -1 || bot === -1 || bot <= top) continue;
  const clothH = bot - top;

  for (let y = top; y <= bot; y++) {
    const idx = (y * width + x) * 4;
    // Check if original pixel was dark outline: keep it untouched!
    const origR = raw[idx], origG = raw[idx+1], origB = raw[idx+2], origA = raw[idx+3];
    const origLum = 0.299*origR + 0.587*origG + 0.114*origB;
    if (origLum < 45 && origA > 200) {
      continue; // keep original crisp outline intact
    }

    const t = (y - top) / clothH;
    const light = getFoldLighting(x, y, t);

    // Emblem coordinates (wave-following Y)
    const localCenterY = (top + bot) / 2;
    const dx = x - emblemX;
    const dy = y - localCenterY;
    const distPlanet = Math.sqrt(dx*dx + dy*dy);

    // Orbit ellipse geometry (tilted ~ -26 degrees)
    const angleRad = 26 * Math.PI / 180;
    const rx = dx * Math.cos(angleRad) + dy * Math.sin(angleRad);
    const ry = -dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
    
    // Ellipse semi-axes
    const a = 36.0;
    const b = 11.5;
    const ringDist = Math.abs(Math.sqrt((rx / a)*(rx / a) + (ry / b)*(ry / b)) - 1.0);
    const isRing = ringDist < 0.085;
    const isFrontRing = (ry > 0); // lower-left front arc

    let r, g, b_val;

    // 1. Inside Planet Disc
    if (distPlanet <= R_PLANET) {
      // Planet border outline
      if (distPlanet >= R_PLANET - 1.2) {
        r = PLANET_OUTLINE[0];
        g = PLANET_OUTLINE[1];
        b_val = PLANET_OUTLINE[2];
      } else {
        // Spherical shading: light from upper-left (-0.55, -0.55, 0.62)
        const nx = dx / R_PLANET;
        const ny = dy / R_PLANET;
        const nz = Math.sqrt(Math.max(0, 1 - nx*nx - ny*ny));
        const dot = -nx * 0.50 - ny * 0.50 + nz * 0.70;

        // Craters on Mars
        const dC1 = Math.sqrt((dx - 7)*(dx - 7) + (dy + 5)*(dy + 5));
        const dC2 = Math.sqrt((dx + 8)*(dx + 8) + (dy - 7)*(dy - 7));
        const dC3 = Math.sqrt((dx - 5)*(dx - 5) + (dy - 11)*(dy - 11));

        if (dC1 < 4.8 || dC2 < 4.2 || dC3 < 3.2) {
          r = PLANET_CRATER[0];
          g = PLANET_CRATER[1];
          b_val = PLANET_CRATER[2];
        } else if (dot > 0.55) {
          // Highlight
          const k = (dot - 0.55) / 0.45;
          r = PLANET_BODY[0] * (1-k) + PLANET_HIGHLIGHT[0] * k;
          g = PLANET_BODY[1] * (1-k) + PLANET_HIGHLIGHT[1] * k;
          b_val = PLANET_BODY[2] * (1-k) + PLANET_HIGHLIGHT[2] * k;
        } else if (dot > 0.15) {
          const k = (dot - 0.15) / 0.40;
          r = PLANET_SHADOW[0] * (1-k) + PLANET_BODY[0] * k;
          g = PLANET_SHADOW[1] * (1-k) + PLANET_BODY[1] * k;
          b_val = PLANET_SHADOW[2] * (1-k) + PLANET_BODY[2] * k;
        } else {
          r = PLANET_SHADOW[0];
          g = PLANET_SHADOW[1];
          b_val = PLANET_SHADOW[2];
        }

        // Front arc of orbit ring passes in front of planet with crisp 1.5px stroke
        if (isFrontRing && isRing && ringDist < 0.065) {
          r = RING_WHITE[0];
          g = RING_WHITE[1];
          b_val = RING_WHITE[2];
        }
      }
    } else {
      // 2. Outside Planet Disc
      // Check if Orbit Ring
      if (isRing) {
        if (isFrontRing) {
          r = RING_WHITE[0];
          g = RING_WHITE[1];
          b_val = RING_WHITE[2];
        } else {
          // Back arc: smooth cyan/white ring
          r = RING_CYAN[0];
          g = RING_CYAN[1];
          b_val = RING_CYAN[2];
        }
      }

      // Check for Satellite Beacon at (rx = 35, ry = -1.5)
      const dBeacon = Math.sqrt((dx - 31)*(dx - 31) + (dy + 15)*(dy + 15));
      if (dBeacon <= 2.8) {
        if (dBeacon <= 1.4) {
          r = 255; g = 255; b_val = 255;
        } else {
          r = 56; g = 189; b_val = 248;
        }
      }

      // Flag stripes background
      if (r === undefined) {
        const stripe = 0.20;
        if (t < stripe || t > (1.0 - stripe)) {
          // Orange stripes
          r = COLOR_ORANGE_STRIPE[0];
          g = COLOR_ORANGE_STRIPE[1];
          b_val = COLOR_ORANGE_STRIPE[2];
        } else if (Math.abs(t - stripe) < 0.015 || Math.abs(t - (1.0 - stripe)) < 0.015) {
          // Gold separator trim
          r = COLOR_STRIPE_TRIM[0];
          g = COLOR_STRIPE_TRIM[1];
          b_val = COLOR_STRIPE_TRIM[2];
        } else {
          // Clean white field
          r = COLOR_WHITE_CLOTH[0];
          g = COLOR_WHITE_CLOTH[1];
          b_val = COLOR_WHITE_CLOTH[2];
        }
      }
    }

    // Apply cloth lighting
    const finalR = Math.max(0, Math.min(255, Math.round(r * light)));
    const finalG = Math.max(0, Math.min(255, Math.round(g * light)));
    const finalB = Math.max(0, Math.min(255, Math.round(b_val * light)));

    out[idx] = finalR;
    out[idx + 1] = finalG;
    out[idx + 2] = finalB;
    out[idx + 3] = 255;
  }
}

fs.writeFileSync('scratch/flag-v2.png', encodePNG(width, height, out));
console.log('Saved scratch/flag-v2.png successfully!');
