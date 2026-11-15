import Phaser from 'phaser';
import { MARS_PALETTE } from './palette';

const s = MARS_PALETTE.structures;

/**
 * 1. HABITAT COMPLEX
 * Multi-dome pressurized living quarters, airlock vestibule, and thermal radiators.
 */
export function generateHabitatTexture(scene: Phaser.Scene, key: string = 'procedural_building_habitat'): void {
  if (scene.textures.exists(key)) return;
  const width = 140;
  const height = 120;
  const canvas = scene.textures.createCanvas(key, width, height);
  if (!canvas) return;
  const ctx = canvas.getContext();

  // Drop Shadow
  ctx.fillStyle = s.dropShadow;
  ctx.beginPath();
  ctx.ellipse(75, 75, 58, 38, 0, 0, Math.PI * 2);
  ctx.fill();

  // Connecting pressurized corridors
  ctx.fillStyle = s.compositeShadow;
  ctx.fillRect(25, 52, 90, 16);
  ctx.fillStyle = s.compositeWhite;
  ctx.fillRect(27, 54, 86, 12);

  // Left Utility Dome
  ctx.fillStyle = s.compositeShadow;
  ctx.beginPath();
  ctx.arc(36, 60, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = s.compositeWhite;
  ctx.beginPath();
  ctx.arc(35, 58, 22, 0, Math.PI * 2);
  ctx.fill();

  // Right Utility Dome
  ctx.fillStyle = s.compositeShadow;
  ctx.beginPath();
  ctx.arc(104, 60, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = s.compositeWhite;
  ctx.beginPath();
  ctx.arc(103, 58, 22, 0, Math.PI * 2);
  ctx.fill();

  // Primary Central Habitat Dome
  ctx.fillStyle = s.compositeShadow;
  ctx.beginPath();
  ctx.arc(70, 56, 36, 0, Math.PI * 2);
  ctx.fill();

  const domeGrad = ctx.createRadialGradient(62, 46, 6, 70, 54, 34);
  domeGrad.addColorStop(0, '#ffffff');
  domeGrad.addColorStop(0.6, s.compositeWhite);
  domeGrad.addColorStop(1, s.compositeShadow);
  ctx.fillStyle = domeGrad;
  ctx.beginPath();
  ctx.arc(69, 54, 34, 0, Math.PI * 2);
  ctx.fill();

  // Roof Comms & Thermal Radiators
  ctx.fillStyle = s.frameSteel;
  ctx.fillRect(66, 26, 6, 8);
  ctx.fillStyle = s.accentOrange;
  ctx.fillRect(52, 28, 12, 4);
  ctx.fillRect(74, 28, 12, 4);

  // Airlock Entrance Tunnel (South Face)
  ctx.fillStyle = s.frameSteel;
  ctx.fillRect(60, 78, 18, 22);
  ctx.fillStyle = s.compositeWhite;
  ctx.fillRect(62, 80, 14, 18);

  // Airlock Bulkhead Door & Status Light
  ctx.fillStyle = s.darkSteel;
  ctx.fillRect(65, 84, 8, 12);
  ctx.fillStyle = s.airlockGreen;
  ctx.fillRect(67, 81, 4, 2);

  canvas.refresh();
}

/**
 * 2. SOLAR FARM
 * Photovoltaic array with tracking solar panels, cabling, and battery storage.
 */
export function generateSolarFarmTexture(scene: Phaser.Scene, key: string = 'procedural_building_solar_farm'): void {
  if (scene.textures.exists(key)) return;
  const width = 160;
  const height = 110;
  const canvas = scene.textures.createCanvas(key, width, height);
  if (!canvas) return;
  const ctx = canvas.getContext();

  // Drop Shadow
  ctx.fillStyle = s.dropShadow;
  ctx.beginPath();
  ctx.ellipse(84, 66, 68, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mounting Support Framework (Ground Trusses)
  ctx.strokeStyle = s.frameSteel;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 48);
  ctx.lineTo(135, 48);
  ctx.moveTo(20, 84);
  ctx.lineTo(135, 84);
  ctx.stroke();

  // 6 Solar Photovoltaic Panel Banks (2 rows of 3)
  const panelPositions = [
    { x: 18, y: 18 }, { x: 56, y: 18 }, { x: 94, y: 18 },
    { x: 18, y: 56 }, { x: 56, y: 56 }, { x: 94, y: 56 },
  ];

  for (const pos of panelPositions) {
    const pw = 34;
    const ph = 26;

    // Panel Frame & Tilt Shadow
    ctx.fillStyle = s.darkSteel;
    ctx.fillRect(pos.x, pos.y, pw, ph);

    // Deep Blue Crystalline Silicon Cells
    ctx.fillStyle = s.solarCellDeep;
    ctx.fillRect(pos.x + 2, pos.y + 2, pw - 4, ph - 4);

    // Mid-blue solar cell shading
    ctx.fillStyle = s.solarCellMid;
    ctx.fillRect(pos.x + 3, pos.y + 3, pw - 6, (ph - 6) / 2);

    // Silver Busbar Grid Lines
    ctx.strokeStyle = s.solarBusbar;
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Vertical busbars
    ctx.moveTo(pos.x + 12, pos.y + 2);
    ctx.lineTo(pos.x + 12, pos.y + ph - 2);
    ctx.moveTo(pos.x + 22, pos.y + 2);
    ctx.lineTo(pos.x + 22, pos.y + ph - 2);
    // Horizontal collector line
    ctx.moveTo(pos.x + 2, pos.y + ph / 2);
    ctx.lineTo(pos.x + pw - 2, pos.y + ph / 2);
    ctx.stroke();
  }

  // Central Battery Storage & Power Inverter Unit (Right side)
  ctx.fillStyle = s.frameSteel;
  ctx.fillRect(132, 38, 22, 42);
  ctx.fillStyle = s.compositeWhite;
  ctx.fillRect(134, 40, 18, 38);

  // Power Charge Status LEDs
  ctx.fillStyle = s.batteryAmber;
  ctx.fillRect(138, 46, 10, 4);
  ctx.fillRect(138, 54, 10, 4);
  ctx.fillStyle = s.airlockGreen;
  ctx.fillRect(138, 62, 10, 4);

  // Power Conduits
  ctx.strokeStyle = s.cableDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(112, 44);
  ctx.lineTo(132, 44);
  ctx.moveTo(112, 78);
  ctx.lineTo(132, 78);
  ctx.stroke();

  canvas.refresh();
}

/**
 * 3. GREENHOUSE
 * Geodesic bio-dome with transparent panes and vibrant hydroponic vegetation.
 */
export function generateGreenhouseTexture(scene: Phaser.Scene, key: string = 'procedural_building_greenhouse'): void {
  if (scene.textures.exists(key)) return;
  const width = 130;
  const height = 120;
  const canvas = scene.textures.createCanvas(key, width, height);
  if (!canvas) return;
  const ctx = canvas.getContext();

  // Drop Shadow
  ctx.fillStyle = s.dropShadow;
  ctx.beginPath();
  ctx.ellipse(70, 72, 52, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  // Foundation Support Ring & Nutrient Base
  ctx.fillStyle = s.frameSteel;
  ctx.beginPath();
  ctx.arc(65, 58, 48, 0, Math.PI * 2);
  ctx.fill();

  // Interior Hydroponic Tray Floor
  ctx.fillStyle = '#0f291e';
  ctx.beginPath();
  ctx.arc(65, 58, 44, 0, Math.PI * 2);
  ctx.fill();

  // Visible Lush Crop Rows (Greenery)
  ctx.fillStyle = s.plantDark;
  ctx.fillRect(36, 38, 58, 10);
  ctx.fillRect(30, 52, 70, 12);
  ctx.fillRect(36, 68, 58, 10);

  ctx.fillStyle = s.plantMid;
  for (let x = 32; x < 98; x += 8) {
    ctx.beginPath();
    ctx.arc(x, 42, 3, 0, Math.PI * 2);
    ctx.arc(x, 57, 4, 0, Math.PI * 2);
    ctx.arc(x, 72, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Horticultural Grow Light Strips (Magenta Glow)
  ctx.fillStyle = s.growLedMagenta;
  ctx.fillRect(38, 48, 54, 2);
  ctx.fillRect(38, 64, 54, 2);

  // Translucent Geodesic Glass Dome Overlay
  const glassGrad = ctx.createRadialGradient(55, 45, 10, 65, 58, 45);
  glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  glassGrad.addColorStop(0.5, s.greenhouseGlass);
  glassGrad.addColorStop(1, 'rgba(6, 182, 212, 0.65)');
  ctx.fillStyle = glassGrad;
  ctx.beginPath();
  ctx.arc(65, 58, 44, 0, Math.PI * 2);
  ctx.fill();

  // Geodesic Structural Frame Struts
  ctx.strokeStyle = s.greenhouseFrame;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // Outer circle
  ctx.arc(65, 58, 44, 0, Math.PI * 2);
  // Inner structural hexagons & struts
  ctx.moveTo(65, 14);
  ctx.lineTo(65, 102);
  ctx.moveTo(21, 58);
  ctx.lineTo(109, 58);
  ctx.moveTo(34, 27);
  ctx.lineTo(96, 89);
  ctx.moveTo(34, 89);
  ctx.lineTo(96, 27);
  ctx.stroke();

  // Air Handling & Water Condensation Port (South)
  ctx.fillStyle = s.compositeWhite;
  ctx.fillRect(57, 98, 16, 14);
  ctx.fillStyle = s.airlockCyan;
  ctx.fillRect(61, 102, 8, 6);

  canvas.refresh();
}

/**
 * 4. STORM SHELTER
 * Regolith-reinforced bunker with blast bulkhead doors and radiation protection.
 */
export function generateStormShelterTexture(scene: Phaser.Scene, key: string = 'procedural_building_storm_shelter'): void {
  if (scene.textures.exists(key)) return;
  const width = 140;
  const height = 120;
  const canvas = scene.textures.createCanvas(key, width, height);
  if (!canvas) return;
  const ctx = canvas.getContext();

  // Drop Shadow
  ctx.fillStyle = s.dropShadow;
  ctx.beginPath();
  ctx.ellipse(75, 70, 56, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  // Compacted Regolith Berm Envelope (Protective earthen shield)
  ctx.fillStyle = s.regolithConcreteDark;
  ctx.beginPath();
  ctx.ellipse(68, 56, 54, 42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = s.regolithConcrete;
  ctx.beginPath();
  ctx.ellipse(68, 54, 48, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  // Reinforced Armor Core Bunker
  ctx.fillStyle = s.darkSteel;
  ctx.fillRect(36, 32, 64, 46);

  ctx.fillStyle = s.blastDoorSteel;
  ctx.fillRect(40, 36, 56, 38);

  // Heavy Blast Bulkhead Vault Door (South Face)
  ctx.fillStyle = s.frameSteel;
  ctx.fillRect(52, 64, 32, 28);
  ctx.fillStyle = s.blastDoorShadow;
  ctx.fillRect(56, 68, 24, 20);

  // Diagonal Hazard Warning Stripes (Yellow & Black)
  const stripeWidth = 5;
  for (let x = 56; x < 80; x += stripeWidth * 2) {
    ctx.fillStyle = s.hazardYellow;
    ctx.fillRect(x, 68, stripeWidth, 20);
    ctx.fillStyle = s.hazardBlack;
    ctx.fillRect(x + stripeWidth, 68, stripeWidth, 20);
  }

  // Heavy Door Locking Hydraulic Pistons
  ctx.fillStyle = s.frameSteel;
  ctx.fillRect(53, 72, 4, 12);
  ctx.fillRect(79, 72, 4, 12);

  // Storm Warning Amber Strobe Beacon (Roof)
  ctx.fillStyle = s.darkSteel;
  ctx.fillRect(64, 24, 8, 8);
  ctx.fillStyle = s.beaconAmber;
  ctx.beginPath();
  ctx.arc(68, 24, 5, 0, Math.PI * 2);
  ctx.fill();

  canvas.refresh();
}

/**
 * 5. MISSION CONTROL
 * Operations headquarters with high-gain parabolic comms dish and telemetry mast.
 */
export function generateMissionControlTexture(scene: Phaser.Scene, key: string = 'procedural_building_mission_control'): void {
  if (scene.textures.exists(key)) return;
  const width = 140;
  const height = 120;
  const canvas = scene.textures.createCanvas(key, width, height);
  if (!canvas) return;
  const ctx = canvas.getContext();

  // Drop Shadow
  ctx.fillStyle = s.dropShadow;
  ctx.beginPath();
  ctx.ellipse(75, 72, 54, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hexagonal Operations Center Structure
  ctx.fillStyle = s.frameSteel;
  drawHexagon(ctx, 68, 58, 46);
  ctx.fill();

  ctx.fillStyle = s.compositeWhite;
  drawHexagon(ctx, 68, 56, 42);
  ctx.fill();

  // Observation Bay Windows (Facing south/outpost)
  ctx.fillStyle = s.consoleScreenBlue;
  ctx.beginPath();
  ctx.arc(68, 56, 32, Math.PI * 0.15, Math.PI * 0.85);
  ctx.lineWidth = 5;
  ctx.strokeStyle = s.consoleScreenBlue;
  ctx.stroke();

  // High-Gain Satellite Communications Parabolic Dish (Top Left)
  ctx.fillStyle = s.antennaDishShadow;
  ctx.beginPath();
  ctx.ellipse(48, 38, 22, 16, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = s.antennaDishWhite;
  ctx.beginPath();
  ctx.ellipse(47, 36, 20, 14, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  // Central Feed Horn & Struts
  ctx.strokeStyle = s.frameSteel;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(36, 38);
  ctx.lineTo(47, 36);
  ctx.moveTo(58, 34);
  ctx.lineTo(47, 36);
  ctx.stroke();

  ctx.fillStyle = s.sensorGold;
  ctx.beginPath();
  ctx.arc(47, 36, 3, 0, Math.PI * 2);
  ctx.fill();

  // Telemetry Antenna Mast & Transmission Beacon (Right)
  ctx.strokeStyle = s.frameSteel;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(92, 46);
  ctx.lineTo(92, 14);
  ctx.stroke();

  // Red Flashing Telemetry Beacon
  ctx.fillStyle = s.beaconRed;
  ctx.beginPath();
  ctx.arc(92, 13, 4, 0, Math.PI * 2);
  ctx.fill();

  // Comms Relay Crosspieces
  ctx.strokeStyle = s.compositeShadow;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(86, 22);
  ctx.lineTo(98, 22);
  ctx.moveTo(88, 30);
  ctx.lineTo(96, 30);
  ctx.stroke();

  canvas.refresh();
}

/**
 * Helper to draw a regular hexagon path.
 */
function drawHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * Convenience orchestrator to register all 5 canonical building textures.
 */
export function generateAllBuildingTextures(scene: Phaser.Scene): void {
  // Keep procedural artwork available as a fallback without occupying the
  // canonical keys used by approved PNG assets.
  generateHabitatTexture(scene, 'procedural_building_habitat');
  generateSolarFarmTexture(scene, 'procedural_building_solar_farm');
  generateGreenhouseTexture(scene, 'procedural_building_greenhouse');
  generateStormShelterTexture(scene, 'procedural_building_storm_shelter');
  generateMissionControlTexture(scene, 'procedural_building_mission_control');
}
