import Phaser from 'phaser';
import { MARS_PALETTE } from './palette';

/**
 * Seeded pseudo-random generator (Mulberry32) for deterministic, reproducible terrain.
 */
class SeededRandom {
  private state: number;

  constructor(seed: number = 424242) {
    this.state = seed;
  }

  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
}

/**
 * Generates a rich, deterministic 2000x1500 Martian terrain texture for OUTPOST: MARS.
 * Includes shaded craters with illuminated rims, basalt boulders with cast shadows,
 * wind-swept sand drifts, and interconnected rover service trails.
 */
export function generateTerrainTexture(
  scene: Phaser.Scene,
  key: string = 'mars_terrain',
  width: number = 2000,
  height: number = 1500
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const canvas = scene.textures.createCanvas(key, width, height);
  if (!canvas) {
    throw new Error(`Failed to create CanvasTexture for ${key}`);
  }

  const ctx = canvas.getContext();
  const rng = new SeededRandom(19760720); // Viking 1 landing anniversary seed

  const colors = MARS_PALETTE.terrain;

  // 1. Base Martian Regolith Fill
  ctx.fillStyle = colors.regolithBase;
  ctx.fillRect(0, 0, width, height);

  // 2. Multi-tone Regolith Texture & Granular Variation (Dither/Noise)
  const patchCount = 3500;
  for (let i = 0; i < patchCount; i++) {
    const px = rng.range(0, width);
    const py = rng.range(0, height);
    const size = rng.range(2, 6);
    const toneChoice = rng.next();

    if (toneChoice < 0.35) {
      ctx.fillStyle = colors.regolithDeep;
    } else if (toneChoice < 0.7) {
      ctx.fillStyle = colors.regolithWarm;
    } else {
      ctx.fillStyle = colors.dustHighlight;
    }
    ctx.fillRect(Math.floor(px), Math.floor(py), Math.floor(size), Math.floor(size));
  }

  // 3. Broad Wind-Swept Dust Drifts (Sinuous dunes across the plains)
  ctx.save();
  ctx.globalAlpha = 0.28;
  const duneCount = 14;
  for (let d = 0; d < duneCount; d++) {
    const startX = rng.range(-200, width);
    const startY = rng.range(0, height);
    const length = rng.range(300, 650);
    const waveHeight = rng.range(25, 60);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(
      startX + length * 0.35,
      startY - waveHeight,
      startX + length * 0.7,
      startY + waveHeight * 1.2,
      startX + length,
      startY
    );
    ctx.lineWidth = rng.range(16, 40);
    ctx.strokeStyle = d % 2 === 0 ? colors.dustHighlight : colors.sandBright;
    ctx.stroke();
  }
  ctx.restore();

  // 4. Shaded Craters with Naturally Lighted Rims and Depth
  // Sun illuminates from top-left (-45 degrees)
  const craters = [
    // Outer natural terrain craters (framing the outpost perimeter)
    { x: 180, y: 150, radius: 95 },
    { x: 540, y: 90, radius: 45 },
    { x: 1420, y: 180, radius: 110 },
    { x: 1480, y: 560, radius: 70 },
    { x: 1380, y: 1050, radius: 130 },
    { x: 160, y: 620, radius: 80 },
    { x: 140, y: 1040, radius: 105 },
    { x: 620, y: 1120, radius: 55 },
    { x: 980, y: 1140, radius: 65 },
    // Scattered smaller impact pits
    { x: 730, y: 220, radius: 28 },
    { x: 1180, y: 440, radius: 22 },
    { x: 420, y: 520, radius: 32 },
    { x: 920, y: 840, radius: 24 },
    { x: 660, y: 780, radius: 20 },
    { x: 1140, y: 710, radius: 30 },
  ];

  for (const crater of craters) {
    const { x, y, radius } = crater;

    // Ejecta blanket halo
    const ejectaGrad = ctx.createRadialGradient(x, y, radius * 0.8, x, y, radius * 1.7);
    ejectaGrad.addColorStop(0, 'rgba(198, 89, 58, 0.4)');
    ejectaGrad.addColorStop(1, 'rgba(120, 45, 33, 0)');
    ctx.fillStyle = ejectaGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.7, 0, Math.PI * 2);
    ctx.fill();

    // Raised sunlit outer rim (top-left arc)
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius + 3, Math.PI * 0.8, Math.PI * 1.9);
    ctx.lineWidth = Math.max(3, radius * 0.12);
    ctx.strokeStyle = colors.sandBright;
    ctx.stroke();

    // Dark outer shadow (bottom-right arc)
    ctx.beginPath();
    ctx.arc(x, y, radius + 2, -Math.PI * 0.1, Math.PI * 0.9);
    ctx.lineWidth = Math.max(2, radius * 0.08);
    ctx.strokeStyle = colors.bedrockDark;
    ctx.stroke();
    ctx.restore();

    // Interior bowl shadow & floor depth
    const bowlGrad = ctx.createRadialGradient(
      x - radius * 0.25,
      y - radius * 0.25,
      radius * 0.1,
      x + radius * 0.25,
      y + radius * 0.25,
      radius
    );
    bowlGrad.addColorStop(0, colors.regolithDeep);
    bowlGrad.addColorStop(0.55, colors.craterShadow);
    bowlGrad.addColorStop(1, colors.bedrockDark);

    ctx.fillStyle = bowlGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Subtle central gravel mound for larger craters
    if (radius > 50) {
      ctx.fillStyle = colors.regolithWarm;
      ctx.beginPath();
      ctx.arc(x - 2, y - 2, radius * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 5. Basalt Boulders and Rock Fields with Cast Shadows
  const boulderClusters = [
    { cx: 290, cy: 190, count: 12, maxR: 14 },
    { cx: 1280, cy: 260, count: 18, maxR: 16 },
    { cx: 240, cy: 820, count: 15, maxR: 12 },
    { cx: 1460, cy: 840, count: 20, maxR: 18 },
    { cx: 680, cy: 140, count: 10, maxR: 10 },
    { cx: 940, cy: 1040, count: 14, maxR: 14 },
    { cx: 480, cy: 710, count: 8, maxR: 9 },
    { cx: 1120, cy: 520, count: 9, maxR: 11 },
  ];

  for (const cluster of boulderClusters) {
    for (let b = 0; b < cluster.count; b++) {
      const bx = cluster.cx + rng.range(-60, 60);
      const by = cluster.cy + rng.range(-50, 50);
      const r = rng.range(3, cluster.maxR);

      // Cast shadow (offset towards bottom-right)
      ctx.fillStyle = colors.rockShadow;
      ctx.beginPath();
      ctx.ellipse(bx + r * 0.6, by + r * 0.6, r * 1.1, r * 0.65, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      // Rock body
      ctx.fillStyle = colors.rockBase;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();

      // Sunlit rock facet (top-left highlight)
      ctx.fillStyle = colors.rockHighlight;
      ctx.beginPath();
      ctx.arc(bx - r * 0.25, by - r * 0.25, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 6. Outpost Compacted Foundation Pads (Under building zones)
  const pads = [
    { x: 800, y: 620, w: 200, h: 180 },  // Habitat Hub
    { x: 320, y: 300, w: 220, h: 160 },  // Solar Farm
    { x: 380, y: 880, w: 180, h: 170 },  // Greenhouse
    { x: 1240, y: 880, w: 200, h: 170 }, // Storm Shelter
    { x: 1050, y: 280, w: 190, h: 170 }, // Mission Control
  ];

  for (const pad of pads) {
    // Smoothed pad gradient
    const padGrad = ctx.createRadialGradient(pad.x, pad.y, 20, pad.x, pad.y, pad.w * 0.65);
    padGrad.addColorStop(0, 'rgba(89, 32, 23, 0.7)');
    padGrad.addColorStop(0.8, 'rgba(73, 27, 26, 0.4)');
    padGrad.addColorStop(1, 'rgba(120, 45, 33, 0)');
    ctx.fillStyle = padGrad;
    ctx.fillRect(pad.x - pad.w / 2, pad.y - pad.h / 2, pad.w, pad.h);
  }

  // 7. Rover Service Trails Linking All 5 Base Modules
  // Pairs of wheel tracks representing pressurized rover circulation
  const trails = [
    // Habitat <-> Solar Farm
    { from: { x: 740, y: 580 }, to: { x: 380, y: 340 } },
    // Habitat <-> Mission Control
    { from: { x: 860, y: 570 }, to: { x: 1010, y: 330 } },
    // Habitat <-> Greenhouse
    { from: { x: 750, y: 670 }, to: { x: 420, y: 840 } },
    // Habitat <-> Storm Shelter
    { from: { x: 860, y: 670 }, to: { x: 1190, y: 840 } },
    // Solar Farm <-> Greenhouse (Perimeter line)
    { from: { x: 320, y: 370 }, to: { x: 380, y: 810 } },
    // Mission Control <-> Storm Shelter (Perimeter line)
    { from: { x: 1060, y: 350 }, to: { x: 1230, y: 810 } },
  ];

  ctx.save();
  for (const trail of trails) {
    const dx = trail.to.x - trail.from.x;
    const dy = trail.to.y - trail.from.y;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len;
    const ny = dx / len;
    const trackSpacing = 7;

    // Left and right tire ruts
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(trail.from.x + nx * trackSpacing * side, trail.from.y + ny * trackSpacing * side);
      ctx.lineTo(trail.to.x + nx * trackSpacing * side, trail.to.y + ny * trackSpacing * side);
      ctx.strokeStyle = colors.treadMark;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Raised dust berm adjacent to rut
      ctx.beginPath();
      ctx.moveTo(trail.from.x + nx * (trackSpacing + 2) * side, trail.from.y + ny * (trackSpacing + 2) * side);
      ctx.lineTo(trail.to.x + nx * (trackSpacing + 2) * side, trail.to.y + ny * (trackSpacing + 2) * side);
      ctx.strokeStyle = colors.dustHighlight;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.restore();

  // Commit canvas texture updates to WebGL GPU
  canvas.refresh();
}
