import Phaser from 'phaser';
import { MARS_PALETTE } from './palette';

/**
 * Generates a top-down pixel-art astronaut sprite (48x48) for OUTPOST: MARS.
 * Features an EVA pressure suit, reflective gold solar visor, dual PLSS oxygen tanks,
 * and chest telemetry indicators.
 */
export function generateAstronautTexture(
  scene: Phaser.Scene,
  key: string = 'astronaut',
  size: number = 48
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const canvas = scene.textures.createCanvas(key, size, size);
  if (!canvas) {
    throw new Error(`Failed to create CanvasTexture for ${key}`);
  }

  const ctx = canvas.getContext();
  const c = MARS_PALETTE.astronaut;
  const cx = size / 2;
  const cy = size / 2;

  // 1. Soft Oval Drop Shadow on Regolith
  ctx.fillStyle = c.dropShadow;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 5, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Primary Life Support System (PLSS) Backpack (Rear)
  ctx.fillStyle = c.harnessDark;
  ctx.fillRect(cx - 10, cy + 2, 20, 10);

  // Twin Oxygen Cylinders
  ctx.fillStyle = c.suitDarkJoint;
  ctx.fillRect(cx - 9, cy + 3, 7, 8);
  ctx.fillRect(cx + 2, cy + 3, 7, 8);
  // Tank Valve Caps
  ctx.fillStyle = c.packCyan;
  ctx.fillRect(cx - 7, cy + 10, 3, 2);
  ctx.fillRect(cx + 4, cy + 10, 3, 2);

  // 3. EVA Pressure Suit Shoulders & Torso
  ctx.fillStyle = c.suitShadow;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 14, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = c.suitWhite;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 1, 13, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Arm Sleeves / Shoulder Bearings
  ctx.fillStyle = c.suitDarkJoint;
  ctx.beginPath();
  ctx.arc(cx - 12, cy, 4, 0, Math.PI * 2);
  ctx.arc(cx + 12, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = c.suitWhite;
  ctx.beginPath();
  ctx.arc(cx - 12, cy - 1, 3.5, 0, Math.PI * 2);
  ctx.arc(cx + 12, cy - 1, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 4. Helmet Dome & Neck Ring
  ctx.fillStyle = c.suitDarkJoint;
  ctx.beginPath();
  ctx.arc(cx, cy - 3, 9.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = c.suitWhite;
  ctx.beginPath();
  ctx.arc(cx, cy - 3.5, 8.5, 0, Math.PI * 2);
  ctx.fill();

  // 5. Reflective Gold Solar Visor (Facing forward/north towards base)
  ctx.fillStyle = c.visorRim;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 6, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = c.visorGold;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 6.5, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Visor Sun Glint (Specular reflection)
  ctx.fillStyle = c.visorHighlight;
  ctx.fillRect(cx - 3, cy - 9, 3, 2);

  // 6. Chest Telemetry Unit (Displaying nominal vitals)
  ctx.fillStyle = c.harnessDark;
  ctx.fillRect(cx - 4, cy + 1, 8, 4);
  ctx.fillStyle = c.packCyan;
  ctx.fillRect(cx - 2, cy + 2, 4, 2);

  canvas.refresh();
}
