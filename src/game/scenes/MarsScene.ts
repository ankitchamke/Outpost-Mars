import Phaser from 'phaser';
import { generateAllBuildingTextures } from '../textures/buildings';
import { BUILDING_INTERACTION_EVENTS } from '../building-events';
import { TUTORIAL_EVENTS } from '../tutorial-events';

export const WORLD_WIDTH = 2000;
export const WORLD_HEIGHT = 1500;
const TERRAIN_BACKGROUND_TEXTURE = 'mars_terrain_background';
const BUILDING_SCALE_FACTOR = 1.18;
const HABITAT_DISPLAY_WIDTH = 272 * BUILDING_SCALE_FACTOR;
const OTHER_BUILDING_DISPLAY_WIDTH = 256 * BUILDING_SCALE_FACTOR;
const ASTRONAUT_DISPLAY_HEIGHT = 60;
const ASTRONAUT_ANIMATION_TEXTURE = 'astronaut-animation-m5';
const ASTRONAUT_STATIC_FALLBACK_TEXTURE = 'astronaut-static-fallback';
// The replacement PNG is 1058x1487. Its 4x5 cells are 250x270 px, starting
// 47 px from the top and left; the remaining right/bottom pixels are padding.
const ASTRONAUT_SHEET_WIDTH = 1058;
const ASTRONAUT_SHEET_HEIGHT = 1487;
const ASTRONAUT_FRAME_COLUMNS = 4;
const ASTRONAUT_FRAME_ROWS = 5;
const ASTRONAUT_FRAME_WIDTH = 250;
const ASTRONAUT_FRAME_HEIGHT = 270;
const ASTRONAUT_FRAME_MARGIN = 47;
// The source artwork's visible center sits about 20 px left of each cell center.
const ASTRONAUT_ANIMATION_ORIGIN_X = 0.42;
// Measured visible art is about 240 source pixels tall. Preserve its existing
// 74 px world height while the frame itself is now 250x270 source pixels.
const ASTRONAUT_ART_HEIGHT = 240;
const ASTRONAUT_ART_WIDTH = 192;
const ASTRONAUT_BODY_WIDTH = 160;
const ASTRONAUT_BODY_HEIGHT = 224;
const ASTRONAUT_MOVE_SPEED = 190;
const APPROVED_BUILDING_DISPLAY_WIDTHS: Record<string, number> = {
  habitat: HABITAT_DISPLAY_WIDTH,
  mission_control: OTHER_BUILDING_DISPLAY_WIDTH,
  greenhouse: OTHER_BUILDING_DISPLAY_WIDTH,
  solar_farm: OTHER_BUILDING_DISPLAY_WIDTH,
  storm_shelter: OTHER_BUILDING_DISPLAY_WIDTH,
};
const COMPACT_BUILDING_POSITIONS: Record<string, { x: number; y: number }> = {
  // Landscape mobile overview: a compact single row keeps every building clear of the HUD.
  greenhouse: { x: 200, y: 700 },
  mission_control: { x: 600, y: 700 },
  habitat: { x: 1000, y: 700 },
  solar_farm: { x: 1400, y: 700 },
  storm_shelter: { x: 1800, y: 700 },
};
const MEDIUM_BUILDING_POSITIONS: Record<string, { x: number; y: number }> = {
  mission_control: { x: 620, y: 500 },
  solar_farm: { x: 1450, y: 520 },
  greenhouse: { x: 550, y: 1000 },
  habitat: { x: 1000, y: 750 },
  storm_shelter: { x: 1420, y: 1000 },
};

export interface BuildingData {
  id: string;
  name: string;
  texture: string;
  x: number;
  y: number;
  role: string;
}

interface TrackPoint {
  x: number;
  y: number;
}

interface RoverTrackRoute {
  texture: string;
  sourceWidth: number;
  sourceHeight: number;
  sourceStart: TrackPoint;
  sourceEnd: TrackPoint;
  worldStart: TrackPoint;
  worldEnd: TrackPoint;
  /** Fixed world-space thickness multiplier on the straight sprite's cross-track axis. */
  straightCrossScale?: number;
}

interface MovementKeys {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
}

export const CANONICAL_BUILDINGS: BuildingData[] = [
  {
    id: 'mission_control',
    name: 'Mission Control',
    texture: 'building_mission_control',
    x: 620,
    y: 500,
    role: 'Operations & Satellite Telemetry',
  },
  {
    id: 'solar_farm',
    name: 'Solar Farm',
    texture: 'building_solar_farm',
    x: 1450,
    y: 520,
    role: 'Photovoltaic Array & Battery Storage',
  },
  {
    id: 'greenhouse',
    name: 'Greenhouse',
    texture: 'building_greenhouse',
    x: 550,
    y: 1000,
    role: 'Hydroponic Crops & Biomass Cultivation',
  },
  {
    id: 'habitat',
    name: 'Habitat',
    texture: 'building_habitat',
    x: 1000,
    y: 750,
    role: 'Living Quarters & Life Support Hub',
  },
  {
    id: 'storm_shelter',
    name: 'Storm Shelter',
    texture: 'building_storm_shelter',
    x: 1420,
    y: 1000,
    role: 'Radiation Bunker & Regolith Shield',
  },
];

interface EnvironmentDecoration {
  texture: string;
  x: number;
  y: number;
  depth: number;
  scale?: number;
  alpha?: number;
  flipX?: boolean;
}

interface M5EnvironmentAsset {
  key: string;
  file: string;
}

interface M5WorldDecoration {
  texture: string;
  x: number;
  y: number;
  displayWidth: number;
  depth: number;
  angle?: number;
  alpha?: number;
  collision?: 'rock' | 'crater';
}

const CRATER_ASSETS: M5EnvironmentAsset[] = [
  { key: 'environment_crater_large_01', file: 'crater-large-01.png' },
  { key: 'environment_crater_large_02', file: 'crater-large-02.png' },
  { key: 'environment_crater_large_03', file: 'crater-large-3.png' },
  { key: 'environment_crater_medium_01', file: 'crater-medium-1.png' },
  { key: 'environment_crater_medium_02', file: 'crater-medium-2.png' },
  { key: 'environment_crater_small_01', file: 'crater-small-1.png' },
  { key: 'environment_crater_small_02', file: 'crater-small-2.png' },
];

const DERIVED_ENVIRONMENT_ASSETS: M5EnvironmentAsset[] = [
  { key: 'environment_rock_pile_01', file: 'rock-pile-01.png' },
  { key: 'environment_rock_pile_02', file: 'rock-pile-02.png' },
  { key: 'environment_rock_pile_03', file: 'rock-pile-03.png' },
  { key: 'environment_rock_pile_04', file: 'rock-pile-04.png' },
  { key: 'environment_rock_scatter_01', file: 'rock-scatter-01.png' },
  { key: 'environment_rock_scatter_02', file: 'rock-scatter-02.png' },
  { key: 'environment_rock_scatter_03', file: 'rock-scatter-03.png' },
  { key: 'environment_rock_scatter_04', file: 'rock-scatter-04.png' },
  { key: 'environment_stone_scatter_01', file: 'stone-scatter-01.png' },
  { key: 'environment_stone_scatter_02', file: 'stone-scatter-02.png' },
  { key: 'environment_stone_scatter_03', file: 'stone-scatter-03.png' },
  { key: 'environment_rock_slab_01', file: 'rock-slab-01.png' },
  { key: 'environment_rock_slab_02', file: 'rock-slab-02.png' },
  { key: 'environment_soil_patch_01', file: 'soil-patch-01.png' },
  { key: 'environment_soil_patch_02', file: 'soil-patch-02.png' },
  { key: 'environment_soil_patch_03', file: 'soil-patch-03.png' },
  // NASA Flag from environmental-props
  { key: 'environment_prop_flag_nasa', file: 'prop-flag-nasa.png' },
  // Rock formations & ridges from rock-sprite-sheet
  { key: 'environment_rock_monolith_01', file: 'rock-monolith-01.png' },
  { key: 'environment_rock_monolith_02', file: 'rock-monolith-02.png' },
  { key: 'environment_rock_ridge_01', file: 'rock-ridge-01.png' },
  { key: 'environment_rock_ridge_02', file: 'rock-ridge-02.png' },
  // Dune ripple formations from dunes-rippled-terrain
  { key: 'environment_dune_ripple_01', file: 'dune-ripple-01.png' },
  { key: 'environment_dune_ripple_02', file: 'dune-ripple-02.png' },
  { key: 'environment_dune_ripple_03', file: 'dune-ripple-03.png' },
];

const M5_ENVIRONMENT_ASSETS: M5EnvironmentAsset[] = [
  { key: 'environment_m5_boulder_01', file: 'm5-boulder-01.png' },
  { key: 'environment_m5_boulder_02', file: 'm5-boulder-02.png' },
];

/** Curated world coordinates distribute environmental assets into 4 geological zones:
 *  1. North Impact Crater Field (Y <= 420)
 *  2. West Rock Ridges & Outcrops (X <= 400)
 *  3. East Bedrock Flats & Slabs (X >= 1550)
 *  4. South Dune Expanse & Regolith Basin (Y >= 1100)
 */
const M5_WORLD_DECORATIONS: M5WorldDecoration[] = [
  // North: Impact Crater Field & Perimeter Ridges
  { texture: 'environment_crater_large_01', x: 300, y: 240, displayWidth: 155, depth: 2, collision: 'crater' },
  { texture: 'environment_crater_large_02', x: 1700, y: 240, displayWidth: 157, depth: 2, collision: 'crater' },
  { texture: 'environment_crater_medium_01', x: 720, y: 220, displayWidth: 180, depth: 2 },
  { texture: 'environment_crater_medium_02', x: 1280, y: 220, displayWidth: 182, depth: 2 },
  { texture: 'environment_crater_small_01', x: 320, y: 420, displayWidth: 182, depth: 2 },
  { texture: 'environment_crater_small_02', x: 1720, y: 420, displayWidth: 214, depth: 2 },
  { texture: 'environment_rock_ridge_01', x: 120, y: 120, displayWidth: 180, depth: 6 },
  { texture: 'environment_rock_ridge_02', x: 1880, y: 120, displayWidth: 180, depth: 6 },

  // West: Rock Ridges & Outcrops
  { texture: 'environment_m5_boulder_01', x: 260, y: 520, displayWidth: 65, depth: 7 },
  { texture: 'environment_rock_pile_01', x: 120, y: 720, displayWidth: 125, depth: 7, collision: 'rock' },
  { texture: 'environment_rock_monolith_01', x: 140, y: 380, displayWidth: 160, depth: 7, collision: 'rock' },
  { texture: 'environment_rock_pile_04', x: 180, y: 950, displayWidth: 130, depth: 7, collision: 'rock' },
  { texture: 'environment_rock_scatter_01', x: 140, y: 1150, displayWidth: 115, depth: 6 },
  { texture: 'environment_crater_small_02', x: 260, y: 1280, displayWidth: 204, depth: 2 },

  // East: Bedrock Flats & Slabs
  { texture: 'environment_m5_boulder_02', x: 1720, y: 520, displayWidth: 60, depth: 7 },
  { texture: 'environment_rock_slab_01', x: 1720, y: 720, displayWidth: 135, depth: 4, alpha: 0.88 },
  { texture: 'environment_rock_monolith_02', x: 1860, y: 880, displayWidth: 155, depth: 7, collision: 'rock' },
  { texture: 'environment_stone_scatter_02', x: 1650, y: 960, displayWidth: 70, depth: 5 },
  { texture: 'environment_rock_pile_02', x: 1650, y: 1020, displayWidth: 120, depth: 7, collision: 'rock' },
  { texture: 'environment_rock_scatter_04', x: 1750, y: 1150, displayWidth: 115, depth: 6 },

  // South: Dune Expanse & Regolith Basin
  { texture: 'environment_soil_patch_01', x: 600, y: 1200, displayWidth: 125, depth: 3, alpha: 0.78 },
  { texture: 'environment_soil_patch_02', x: 1000, y: 1140, displayWidth: 125, depth: 3, alpha: 0.78 },
  { texture: 'environment_soil_patch_03', x: 1400, y: 1200, displayWidth: 125, depth: 3, alpha: 0.78 },
  { texture: 'environment_stone_scatter_01', x: 820, y: 1220, displayWidth: 75, depth: 5 },
  { texture: 'environment_stone_scatter_03', x: 1180, y: 1220, displayWidth: 80, depth: 5 },
  { texture: 'environment_rock_pile_03', x: 1140, y: 1080, displayWidth: 135, depth: 7, collision: 'rock' },
  { texture: 'environment_rock_slab_02', x: 680, y: 1350, displayWidth: 140, depth: 4, alpha: 0.88 },
  { texture: 'environment_rock_scatter_02', x: 460, y: 1350, displayWidth: 115, depth: 6 },
  { texture: 'environment_rock_scatter_03', x: 1540, y: 1350, displayWidth: 115, depth: 6 },
  { texture: 'environment_dune_ripple_01', x: 360, y: 1160, displayWidth: 260, depth: 2, alpha: 0.65 },
  { texture: 'environment_dune_ripple_02', x: 920, y: 1430, displayWidth: 280, depth: 2, alpha: 0.65 },
  { texture: 'environment_dune_ripple_03', x: 1750, y: 1360, displayWidth: 270, depth: 2, alpha: 0.65 },
  { texture: 'environment_crater_large_03', x: 1000, y: 1300, displayWidth: 189, depth: 2, collision: 'crater' },
  { texture: 'environment_crater_small_01', x: 1350, y: 1320, displayWidth: 182, depth: 2 },

  // Central Plaza: NASA Flag
  { texture: 'environment_prop_flag_nasa', x: 720, y: 640, displayWidth: 56, depth: 21 },
];

const ENVIRONMENT_DECORATIONS: EnvironmentDecoration[] = [
  // 1. Rover Tracks (Depth 1) - Navigational pathways radiating outward
  { texture: 'rover_track_straight', x: 560, y: 720, depth: 1 },
  { texture: 'rover_track_curve', x: 370, y: 720, depth: 1 },
  { texture: 'rover_track_straight', x: 800, y: 940, depth: 1 },

  // 2. Craters (Depth 2) - Natural impact formations in outer terrain
  { texture: 'crater_large_1', x: 280, y: 960, depth: 2 },
  { texture: 'crater_large_2', x: 1380, y: 220, depth: 2 },
  { texture: 'crater_large_3', x: 260, y: 240, depth: 2 },
  { texture: 'crater_medium_1', x: 1400, y: 680, depth: 2 },
  { texture: 'crater_medium_2', x: 190, y: 780, depth: 2 },
  { texture: 'crater_small_1', x: 580, y: 360, depth: 2 },
  { texture: 'crater_small_2', x: 1040, y: 640, depth: 2 },
  { texture: 'crater_small_1', x: 880, y: 1060, depth: 2 },

  // 3. Rock Formations & Clusters (Depth 5 - 8) - Perimeter ridges and geological waypoints
  { texture: 'rock_formation_1', x: 110, y: 380, depth: 8 },
  { texture: 'rock_formation_2', x: 1480, y: 480, depth: 8 },
  { texture: 'rock_formation_3', x: 1400, y: 1060, depth: 8 },
  { texture: 'rock_cluster_1', x: 500, y: 130, depth: 6 },
  { texture: 'rock_cluster_2', x: 1100, y: 1080, depth: 6 },
  { texture: 'boulder_1', x: 460, y: 370, depth: 7 },
  { texture: 'boulder_2', x: 1140, y: 660, depth: 7 },
  { texture: 'boulder_1', x: 620, y: 890, depth: 7 },
  { texture: 'boulder_2', x: 980, y: 880, depth: 7 },

  // 4. Outpost Props & Scientific Equipment (Depth 22)
  { texture: 'prop_nasa_flag', x: 710, y: 710, depth: 22 },
  { texture: 'prop_beacon', x: 990, y: 200, depth: 22 },
  { texture: 'prop_water_tanks', x: 210, y: 530, depth: 22 },
  { texture: 'prop_crates', x: 1080, y: 880, depth: 22 },
];

// Environmental PNG art is intentionally held out of Milestone 1 until its
// extraction and sizing are reviewed.
const MILESTONE_1_ENABLE_ENVIRONMENT_DECORATIONS = false;

/**
 * OUTPOST: MARS — MarsScene (Phase 03 Asset Integration)
 * Composes the 2000x1500 top-down Martian outpost surface featuring:
 * - Approved PNG artwork for all 5 canonical outpost structures
 * - Approved PNG artwork for the astronaut character in the central plaza
 * - Approved Mars terrain PNG as a single aspect-preserving world background
 * - Procedural building fallbacks with the approved Habitat and astronaut PNGs
 * - Atmospheric Martian dust motes drifting across the camera viewport
 * - Responsive camera bounds and dynamic zoom for desktop and mobile viewports
 */
export class MarsScene extends Phaser.Scene {
  private buildings: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private buildingLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private buildingCollisionBounds: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private astronaut!: Phaser.GameObjects.Sprite;
  private astronautStatusLabel?: Phaser.GameObjects.Text;
  private cursorKeys?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: MovementKeys;
  private interactKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;
  private nearbyBuilding?: BuildingData;
  private isBuildingPanelOpen = false;
  private hasPositionedAstronaut = false;
  private isFollowingAstronaut = false;
  private wasMovingLastFrame = false;
  private tutorialHighlightOutline?: Phaser.GameObjects.Graphics;
  private tutorialHighlightBuilding?: Phaser.GameObjects.Sprite;
  private hasAstronautAnimations = false;
  private currentAstronautAnimation = '';
  private dustEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private terrainBackground?: Phaser.GameObjects.Image;
  private roverTrackSprites: Phaser.GameObjects.Image[] = [];
  private environmentDecorationSprites: Phaser.GameObjects.Image[] = [];
  private environmentCollisionBounds: Phaser.GameObjects.Rectangle[] = [];
  private joystickBase?: Phaser.GameObjects.Arc;
  private joystickThumb?: Phaser.GameObjects.Arc;
  private joystickCenter = new Phaser.Math.Vector2();
  private joystickVector = new Phaser.Math.Vector2();
  private joystickPointerId: number | null = null;
  private readonly joystickRadius = 34;

  constructor() {
    super({ key: 'MarsScene' });
  }

  preload(): void {
    // 1. Load the approved Mars surface background as the base world layer.
    this.load.image(TERRAIN_BACKGROUND_TEXTURE, 'assets/environment/mars-terrain-background.png');

    // 2. Load separately derived track pieces. Original extracted candidates stay untouched.
    const trackPrefix = 'assets/environment/tracks/derived/';
    this.load.image('rover_track_straight_approved', `${trackPrefix}track-straight.png`);
    this.load.image('rover_track_curve_right_approved', `${trackPrefix}track-curve-right.png`);
    this.load.image('rover_track_curve_left_approved', `${trackPrefix}track-curve-left.png`);
    this.load.image('rover_track_s_curve_approved', `${trackPrefix}track-s-curve.png`);

    // 3. Generate procedural building fallbacks under unique non-PNG keys
    generateAllBuildingTextures(this);

    // 4. Load the approved building PNGs using keys separate from fallbacks.
    const prefix = 'assets/';
    this.load.image('building_habitat', `${prefix}buildings/habitat.png`);
    this.load.image('building_mission_control', `${prefix}buildings/mission-control.png`);
    this.load.image('building_greenhouse', `${prefix}buildings/greenhouse.png`);
    this.load.image('building_solar_farm', `${prefix}buildings/solar-farm.png`);
    this.load.image('building_storm_shelter', `${prefix}buildings/storm-shelter.png`);

    // 5. Load the animation sheet derived from the approved source and keep
    // the approved static PNG as a separately keyed fallback.
    this.load.spritesheet(
      ASTRONAUT_ANIMATION_TEXTURE,
      `${prefix}characters/astronaut-animation-m5.png`,
      {
        frameWidth: ASTRONAUT_FRAME_WIDTH,
        frameHeight: ASTRONAUT_FRAME_HEIGHT,
        margin: ASTRONAUT_FRAME_MARGIN,
      }
    );
    this.load.image(ASTRONAUT_STATIC_FALLBACK_TEXTURE, `${prefix}characters/astronaut.png`);

    // 6. Load replacement crater assets, derived environmental props, and retained props. The reference sheets and rover
    // tracks are not modified or used as environmental props.
    for (const asset of CRATER_ASSETS) {
      this.load.image(asset.key, `${prefix}environment/${asset.file}`);
    }
    for (const asset of DERIVED_ENVIRONMENT_ASSETS) {
      this.load.image(asset.key, `${prefix}environment/derived/${asset.file}`);
    }
    for (const asset of M5_ENVIRONMENT_ASSETS) {
      this.load.image(asset.key, `${prefix}environment/props/${asset.file}`);
    }

    if (MILESTONE_1_ENABLE_ENVIRONMENT_DECORATIONS) {
      // Retain the prepared loading map for a later, reviewed environment pass.
      this.load.image('crater_large_1', `${prefix}environment/crater-large-1.png`);
      this.load.image('crater_large_2', `${prefix}environment/crater-large-2.png`);
      this.load.image('crater_large_3', `${prefix}environment/crater-large-3.png`);
      this.load.image('crater_medium_1', `${prefix}environment/crater-medium-1.png`);
      this.load.image('crater_medium_2', `${prefix}environment/crater-medium-2.png`);
      this.load.image('crater_small_1', `${prefix}environment/crater-small-1.png`);
      this.load.image('crater_small_2', `${prefix}environment/crater-small-2.png`);

      this.load.image('rock_formation_1', `${prefix}environment/rock-formation-1.png`);
      this.load.image('rock_formation_2', `${prefix}environment/rock-formation-2.png`);
      this.load.image('rock_formation_3', `${prefix}environment/rock-formation-3.png`);
      this.load.image('rock_cluster_1', `${prefix}environment/rock-cluster-1.png`);
      this.load.image('rock_cluster_2', `${prefix}environment/rock-cluster-2.png`);
      this.load.image('boulder_1', `${prefix}environment/boulder-1.png`);
      this.load.image('boulder_2', `${prefix}environment/boulder-2.png`);

      this.load.image('rover_track_curve', `${prefix}environment/rover-track-curve.png`);
      this.load.image('rover_track_straight', `${prefix}environment/rover-track-straight.png`);

      this.load.image('prop_nasa_flag', `${prefix}environment/prop-nasa-flag.png`);
      this.load.image('prop_beacon', `${prefix}environment/prop-beacon.png`);
      this.load.image('prop_crates', `${prefix}environment/prop-crates.png`);
      this.load.image('prop_water_tanks', `${prefix}environment/prop-water-tanks.png`);
    }

    // 7. Generate atmospheric dust particle texture (3x3 soft mote)
    if (!this.textures.exists('dust_mote')) {
      const moteCanvas = this.textures.createCanvas('dust_mote', 4, 4);
      if (moteCanvas) {
        const mctx = moteCanvas.getContext();
        mctx.fillStyle = 'rgba(222, 125, 92, 0.75)';
        mctx.fillRect(0, 0, 4, 4);
        moteCanvas.refresh();
      }
    }
  }

  create(): void {
    // 1. Establish Physics and World Bounds
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // 2. Approved Mars surface background (Depth 0)
    // Visible Martian terrain occupies the top ~75% of the frame (visible center at 37.5% from top).
    // Using origin (0.5, 0.375) and scaling to cover the visible 75% height ensures 100% full-bleed
    // coverage across the 2000x1500 world with zero transparent letterboxing for both original and replacement PNGs.
    this.terrainBackground = this.add
      .image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, TERRAIN_BACKGROUND_TEXTURE)
      .setOrigin(0.5, 0.375)
      .setDepth(0);

    // Rover tracks sit above the terrain and below every building and character sprite.
    this.renderRoverTrackNetwork();

    // 3. Reviewed environmental PNGs sit above the terrain and below the roads
    // and colony structures. Their placement is fixed and deliberately sparse.
    this.createEnvironmentDecorations();

    // Preserve the older, disabled environment map as a fallback reference.
    if (MILESTONE_1_ENABLE_ENVIRONMENT_DECORATIONS) {
      for (const deco of ENVIRONMENT_DECORATIONS) {
        if (this.textures.exists(deco.texture)) {
          const sprite = this.add.sprite(deco.x, deco.y, deco.texture);
          sprite.setOrigin(0.5, 0.5);
          sprite.setDepth(deco.depth);
          if (deco.scale !== undefined) sprite.setScale(deco.scale);
          if (deco.alpha !== undefined) sprite.setAlpha(deco.alpha);
          if (deco.flipX) sprite.setFlipX(true);
        }
      }
    }

    // 4. Render approved PNGs when loaded; otherwise use the procedural fallback.
    for (const b of CANONICAL_BUILDINGS) {
      const position = this.getBuildingPosition(b);
      const hasApprovedPng = this.textures.exists(b.texture);
      const texKey = hasApprovedPng ? b.texture : `procedural_building_${b.id}`;
      const sprite = this.add.sprite(position.x, position.y, texKey);
      sprite.setOrigin(0.5, 0.5);

      if (hasApprovedPng) {
        sprite.setScale(APPROVED_BUILDING_DISPLAY_WIDTHS[b.id] / sprite.width);
      }

      sprite.setDepth(20);
      this.buildings.set(b.id, sprite);

      // Building Label Plaque (High-contrast, accessible)
      const badgeY = position.y + sprite.displayHeight / 2 + 14;
      const plaque = this.add.text(position.x, badgeY, b.name.toUpperCase(), {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '11px',
        color: '#f8fafc',
        backgroundColor: 'rgba(18, 24, 34, 0.88)',
        padding: { x: 8, y: 3 },
        align: 'center',
      }).setOrigin(0.5).setStroke('#38bdf8', 1);

      if (b.id === 'habitat') {
        plaque.setPosition(
          position.x,
          position.y - sprite.displayHeight / 2 - plaque.displayHeight / 2 - 10
        );
      }

      plaque.setDepth(25);
      this.buildingLabels.set(b.id, plaque);
    }

    // 5. Use the approved source-sheet frames, with the static PNG as fallback.
    this.createAstronautAnimations();
    const astronautTexture = this.textures.exists(ASTRONAUT_ANIMATION_TEXTURE)
      ? ASTRONAUT_ANIMATION_TEXTURE
      : ASTRONAUT_STATIC_FALLBACK_TEXTURE;
    this.hasAstronautAnimations = astronautTexture === ASTRONAUT_ANIMATION_TEXTURE;
    const habitat = this.buildings.get('habitat');
    this.astronaut = this.add.sprite(habitat?.x ?? 800, habitat?.y ?? 500, astronautTexture, 0);
    this.astronaut.setOrigin(
      this.hasAstronautAnimations ? ASTRONAUT_ANIMATION_ORIGIN_X : 0.5,
      0.5
    );
    this.astronaut.setScale(
      this.hasAstronautAnimations
        ? ASTRONAUT_DISPLAY_HEIGHT / ASTRONAUT_ART_HEIGHT
        : ASTRONAUT_DISPLAY_HEIGHT / this.astronaut.height
    );
    this.astronaut.setPosition(
      habitat?.x ?? 800,
      habitat
        ? habitat.y + habitat.displayHeight / 2 + ASTRONAUT_DISPLAY_HEIGHT / 2 + 8
        : 600
    );
    this.astronaut.setDepth(30);
    if (this.hasAstronautAnimations) {
      this.astronaut.play('astronaut-idle');
      this.currentAstronautAnimation = 'astronaut-idle';
    }

    // Astronaut Status Label below astronaut feet (Depth 31)
    this.astronautStatusLabel = this.add
      .text(this.astronaut.x, this.astronaut.y + ASTRONAUT_DISPLAY_HEIGHT / 2 + 8, 'COMMANDER', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '9px',
        color: '#fbbf24',
        backgroundColor: 'rgba(18, 24, 34, 0.85)',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5);
    this.astronautStatusLabel.setDepth(31);
    this.updateResponsiveComposition();
    this.enableAstronautPhysics();
    this.createBuildingCollisionBounds();
    this.createEnvironmentCollisionBounds();
    this.configureKeyboardMovement();
    this.game.canvas.tabIndex = 0;
    this.game.canvas.setAttribute('aria-label', 'OUTPOST: MARS colony; use WASD or arrow keys to explore');
    this.input.on('pointerdown', this.focusGameCanvas, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.focusGameCanvas, this);
    });
    this.game.events.on(
      BUILDING_INTERACTION_EVENTS.requestInteract,
      this.openNearbyBuildingPanel,
      this
    );
    this.game.events.on(
      BUILDING_INTERACTION_EVENTS.requestClose,
      this.closeBuildingPanel,
      this
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.removeBuildingInteractionListeners, this);
    this.game.events.on(
      TUTORIAL_EVENTS.highlightBuilding,
      this.setTutorialHighlightBuilding,
      this
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(TUTORIAL_EVENTS.highlightBuilding, this.setTutorialHighlightBuilding, this);
    });
    this.syncVirtualJoystick();
    this.input.on('pointerdown', this.handleJoystickPointerDown, this);
    this.input.on('pointermove', this.handleJoystickPointerMove, this);
    this.input.on('pointerup', this.handleJoystickPointerUp, this);
    this.input.on('pointerupoutside', this.handleJoystickPointerUp, this);

    console.info('[OUTPOST: MARS] Approved sprite texture dimensions', {
      buildings: Array.from(this.buildings.entries()).map(([id, sprite]) => ({
        id,
        key: sprite.texture.key,
        source: { width: sprite.width, height: sprite.height },
        world: { width: sprite.displayWidth, height: sprite.displayHeight },
        position: { x: sprite.x, y: sprite.y },
      })),
      astronaut: {
        key: this.astronaut.texture.key,
        source: {
          frame: { width: this.astronaut.width, height: this.astronaut.height },
          sheet: this.hasAstronautAnimations
            ? {
                imageWidth: ASTRONAUT_SHEET_WIDTH,
                imageHeight: ASTRONAUT_SHEET_HEIGHT,
                frameWidth: ASTRONAUT_FRAME_WIDTH,
                frameHeight: ASTRONAUT_FRAME_HEIGHT,
                margin: ASTRONAUT_FRAME_MARGIN,
                columns: ASTRONAUT_FRAME_COLUMNS,
                rows: ASTRONAUT_FRAME_ROWS,
                frames: ASTRONAUT_FRAME_COLUMNS * ASTRONAUT_FRAME_ROWS,
              }
            : undefined,
        },
        world: { width: this.astronaut.displayWidth, height: this.astronaut.displayHeight },
        visibleArtApproximate: {
          width:
            (ASTRONAUT_DISPLAY_HEIGHT * ASTRONAUT_ART_WIDTH) / ASTRONAUT_ART_HEIGHT,
          height: ASTRONAUT_DISPLAY_HEIGHT,
        },
      },
      environmentalDecorations: this.environmentDecorationSprites.length,
    });

    // 6. Atmospheric Martian Dust Particles (Depth 40)
    if (this.textures.exists('dust_mote')) {
      const randomSource: Phaser.Types.GameObjects.Particles.RandomZoneSource = {
        getRandomPoint: (point: Phaser.Types.Math.Vector2Like) => {
          point.x = Phaser.Math.Between(0, WORLD_WIDTH);
          point.y = Phaser.Math.Between(0, WORLD_HEIGHT);
          return point;
        },
      };

      this.dustEmitter = this.add.particles(0, 0, 'dust_mote', {
        emitZone: { type: 'random', source: randomSource },
        speedX: { min: 25, max: 60 },
        speedY: { min: 10, max: 35 },
        scale: { start: 0.8, end: 0.3 },
        alpha: { start: 0.5, end: 0 },
        lifespan: { min: 4000, max: 7000 },
        frequency: 200,
        maxParticles: 45,
      });
      this.dustEmitter.setDepth(40);
    }

    // 7. Camera Viewport Configuration
    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.updateCameraZoom();
    const initialCameraTarget = this.getInitialCameraTarget();
    camera.centerOn(initialCameraTarget.x, initialCameraTarget.y);
    this.syncCameraFollowOffset();
    // Keep follow initialized while preserving the overview framing. The offset
    // makes the initial camera center the followed point until the astronaut moves.
    camera.startFollow(
      this.astronaut,
      true,
      0.12,
      0.12,
      this.astronaut.x - camera.midPoint.x,
      this.astronaut.y - camera.midPoint.y
    );
    this.updateTerrainBackgroundCover();

    console.info('[OUTPOST: MARS] Terrain background dimensions', {
      source: {
        width: this.terrainBackground.width,
        height: this.terrainBackground.height,
      },
      world: {
        width: this.terrainBackground.displayWidth,
        height: this.terrainBackground.displayHeight,
      },
      uniformScale: this.terrainBackground.scaleX,
    });

    // 8. Responsive Viewport Resize Handler
    this.scale.on('resize', this.handleResize, this);
  }

  private createAstronautAnimations(): void {
    if (!this.textures.exists(ASTRONAUT_ANIMATION_TEXTURE)) return;

    const animations = [
      { key: 'astronaut-idle', row: 0, frameRate: 4 },
      { key: 'astronaut-walk-down', row: 1, frameRate: 8 },
      { key: 'astronaut-walk-up', row: 2, frameRate: 8 },
      { key: 'astronaut-walk-left', row: 3, frameRate: 8 },
      { key: 'astronaut-walk-right', row: 4, frameRate: 8 },
    ];

    for (const animation of animations) {
      if (this.anims.exists(animation.key)) continue;
      this.anims.create({
        key: animation.key,
        frames: this.anims.generateFrameNumbers(ASTRONAUT_ANIMATION_TEXTURE, {
          start: animation.row * ASTRONAUT_FRAME_COLUMNS,
          end: animation.row * ASTRONAUT_FRAME_COLUMNS + ASTRONAUT_FRAME_COLUMNS - 1,
        }),
        frameRate: animation.frameRate,
        repeat: -1,
      });
    }
  }

  private createEnvironmentDecorations(): void {
    this.environmentDecorationSprites = [];

    for (const decoration of M5_WORLD_DECORATIONS) {
      if (!this.textures.exists(decoration.texture)) {
        console.warn('[OUTPOST: MARS] Environmental texture did not load', decoration.texture);
        continue;
      }

      const sprite = this.add
        .image(decoration.x, decoration.y, decoration.texture)
        .setOrigin(0.5, 0.5)
        .setDepth(decoration.depth);
      sprite.setScale(decoration.displayWidth / sprite.width);
      if (decoration.angle !== undefined) sprite.setAngle(decoration.angle);
      if (decoration.alpha !== undefined) sprite.setAlpha(decoration.alpha);
      this.environmentDecorationSprites.push(sprite);
    }

    console.info('[OUTPOST: MARS] Reviewed environmental decoration dimensions', {
      count: this.environmentDecorationSprites.length,
      items: this.environmentDecorationSprites.map((sprite) => ({
        key: sprite.texture.key,
        source: { width: sprite.width, height: sprite.height },
        world: { width: sprite.displayWidth, height: sprite.displayHeight },
        position: { x: sprite.x, y: sprite.y },
        depth: sprite.depth,
      })),
    });
  }

  /**
   * Adjusts camera zoom dynamically based on viewport aspect ratio and display width.
   */
  private updateCameraZoom(): void {
    const { width, height } = this.scale;
    const camera = this.cameras.main;

    // Compact landscape viewports use a denser composition, not a full-world shrink.
    if (width < 768 || height < 500) {
      camera.setZoom(0.52);
    } else if (width < 1400 || height < 850) {
      camera.setZoom(0.85);
    } else {
      camera.setZoom(1.0);
    }
  }

  private handleResize(): void {
    this.updateCameraZoom();
    this.updateResponsiveComposition();
    this.renderRoverTrackNetwork();
    this.refreshBuildingCollisionBounds();
    this.syncVirtualJoystick();
    if (!this.isFollowingAstronaut) {
      const target = this.getInitialCameraTarget();
      this.cameras.main.centerOn(target.x, target.y);
      this.syncCameraFollowOffset();
    }
    this.updateTerrainBackgroundCover();
  }

  private syncCameraFollowOffset(): void {
    const camera = this.cameras.main;
    camera.setFollowOffset(
      this.astronaut.x - camera.midPoint.x,
      this.astronaut.y - camera.midPoint.y
    );
  }

  /**
   * Rebuild only the small track layer when the viewport switches between the
   * full colony map and the compact landscape overview.
   */
  private renderRoverTrackNetwork(): void {
    for (const track of this.roverTrackSprites) track.destroy();
    this.roverTrackSprites = [];

    const compact = this.isCompactViewport();
    const straight = 'rover_track_straight_approved';

    const compactRoutes: RoverTrackRoute[] = [
      // The compact layout shares one narrow, continuous access road below the row.
      {
        texture: straight,
        sourceWidth: 617,
        sourceHeight: 198,
        sourceStart: { x: 10, y: 99 },
        sourceEnd: { x: 607, y: 99 },
        worldStart: { x: 200, y: 790 },
        worldEnd: { x: 1800, y: 790 },
        straightCrossScale: 0.15,
      },
    ];

    const desktopRoutes: RoverTrackRoute[] = [
      // 1. Habitat to Mission Control (Northwest corridor -> MC bottom entrance ramp)
      {
        texture: straight,
        sourceWidth: 617,
        sourceHeight: 198,
        sourceStart: { x: 10, y: 99 },
        sourceEnd: { x: 607, y: 99 },
        worldStart: { x: 920, y: 710 },
        worldEnd: { x: 626, y: 590 },
        straightCrossScale: 0.20,
      },
      // 2. Habitat to Solar Farm (Northeast corridor -> SF bottom-west service apron)
      {
        texture: straight,
        sourceWidth: 617,
        sourceHeight: 198,
        sourceStart: { x: 10, y: 99 },
        sourceEnd: { x: 607, y: 99 },
        worldStart: { x: 1080, y: 710 },
        worldEnd: { x: 1400, y: 590 },
        straightCrossScale: 0.20,
      },
      // 3. Habitat to Greenhouse (Southwest corridor -> GH front entrance apron)
      {
        texture: straight,
        sourceWidth: 617,
        sourceHeight: 198,
        sourceStart: { x: 10, y: 99 },
        sourceEnd: { x: 607, y: 99 },
        worldStart: { x: 920, y: 790 },
        worldEnd: { x: 590, y: 1040 },
        straightCrossScale: 0.20,
      },
      // 4. Habitat to Storm Shelter (Southeast corridor -> SS bunker entrance apron)
      {
        texture: straight,
        sourceWidth: 617,
        sourceHeight: 198,
        sourceStart: { x: 10, y: 99 },
        sourceEnd: { x: 607, y: 99 },
        worldStart: { x: 1080, y: 790 },
        worldEnd: { x: 1380, y: 1040 },
        straightCrossScale: 0.20,
      },
      // 5. Exploration Spur: North Crater Wilderness (clear of MC walls & antennas)
      {
        texture: straight,
        sourceWidth: 617,
        sourceHeight: 198,
        sourceStart: { x: 10, y: 99 },
        sourceEnd: { x: 607, y: 99 },
        worldStart: { x: 820, y: 640 },
        worldEnd: { x: 820, y: 240 },
        straightCrossScale: 0.20,
      },
      // 6. Exploration Spur: Southeast Dunes & Bedrock (clear of SS bunker walls)
      {
        texture: straight,
        sourceWidth: 617,
        sourceHeight: 198,
        sourceStart: { x: 10, y: 99 },
        sourceEnd: { x: 607, y: 99 },
        worldStart: { x: 1460, y: 1080 },
        worldEnd: { x: 1680, y: 1280 },
        straightCrossScale: 0.20,
      },
    ];

    const routes = compact ? compactRoutes : desktopRoutes;
    for (const route of routes) {
      if (!this.textures.exists(route.texture)) continue;

      const sourceDx = route.sourceEnd.x - route.sourceStart.x;
      const sourceDy = route.sourceEnd.y - route.sourceStart.y;
      const worldDx = route.worldEnd.x - route.worldStart.x;
      const worldDy = route.worldEnd.y - route.worldStart.y;
      const sourceLength = Math.hypot(sourceDx, sourceDy);
      const worldLength = Math.hypot(worldDx, worldDy);
      const scale = worldLength / sourceLength;
      const rotation = Math.atan2(worldDy, worldDx) - Math.atan2(sourceDy, sourceDx);
      const scaleX = scale;
      const scaleY = route.straightCrossScale ?? scale;

      const track = this.add
        .image(route.worldStart.x, route.worldStart.y, route.texture)
        .setOrigin(route.sourceStart.x / route.sourceWidth, route.sourceStart.y / route.sourceHeight)
        .setScale(scaleX, scaleY)
        .setRotation(rotation)
        .setAlpha(0.70)
        .setDepth(1);
      this.roverTrackSprites.push(track);
    }

    if (this.roverTrackSprites.length !== routes.length) {
      console.warn('[OUTPOST: MARS] Some rover-track textures did not load', {
        expected: routes.length,
        rendered: this.roverTrackSprites.length,
      });
    }

    console.info(
      '[OUTPOST: MARS] Runtime rover-track routes ' +
        JSON.stringify(
          this.roverTrackSprites.map((track) => ({
            key: track.texture.key,
            source: { width: track.width, height: track.height },
            world: { width: track.displayWidth, height: track.displayHeight },
            position: { x: track.x, y: track.y },
            depth: track.depth,
          }))
        )
    );
  }

  update(): void {
    const body = this.astronaut.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    if (this.isBuildingPanelOpen && this.escapeKey && Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      this.closeBuildingPanel();
    } else if (
      !this.isBuildingPanelOpen &&
      this.nearbyBuilding &&
      this.interactKey &&
      Phaser.Input.Keyboard.JustDown(this.interactKey)
    ) {
      this.openNearbyBuildingPanel();
    }

    let velocityX = this.isBuildingPanelOpen ? 0 : this.joystickVector.x;
    let velocityY = this.isBuildingPanelOpen ? 0 : this.joystickVector.y;

    if (!this.isBuildingPanelOpen && !this.isUiControlFocused()) {
      const left = !!this.cursorKeys?.left.isDown || !!this.wasdKeys?.left.isDown;
      const right = !!this.cursorKeys?.right.isDown || !!this.wasdKeys?.right.isDown;
      const up = !!this.cursorKeys?.up.isDown || !!this.wasdKeys?.up.isDown;
      const down = !!this.cursorKeys?.down.isDown || !!this.wasdKeys?.down.isDown;
      velocityX += Number(right) - Number(left);
      velocityY += Number(down) - Number(up);
    }

    const magnitude = Math.hypot(velocityX, velocityY);
    if (magnitude > 1) {
      velocityX /= magnitude;
      velocityY /= magnitude;
    }

    const isMoving = magnitude > 0;
    if (isMoving && !this.wasMovingLastFrame) {
      this.game.events.emit(TUTORIAL_EVENTS.playerMoved);
    }
    this.wasMovingLastFrame = isMoving;
    body.setVelocity(
      isMoving ? velocityX * ASTRONAUT_MOVE_SPEED : 0,
      isMoving ? velocityY * ASTRONAUT_MOVE_SPEED : 0
    );

    if (this.hasAstronautAnimations) {
      let targetAnimation = 'astronaut-idle';
      if (isMoving) {
        if (Math.abs(velocityX) > Math.abs(velocityY)) {
          targetAnimation = velocityX < 0 ? 'astronaut-walk-left' : 'astronaut-walk-right';
        } else {
          targetAnimation = velocityY < 0 ? 'astronaut-walk-up' : 'astronaut-walk-down';
        }
      }

      if (targetAnimation !== this.currentAstronautAnimation) {
        this.astronaut.play(targetAnimation);
        this.currentAstronautAnimation = targetAnimation;
      }
    }

    if (isMoving) this.isFollowingAstronaut = true;
    this.updateTutorialHighlight();

    this.positionAstronautStatusLabel();
    this.refreshNearbyBuilding();
  }

  private enableAstronautPhysics(): void {
    this.physics.add.existing(this.astronaut);
    const body = this.astronaut.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true).setBounce(0);
    body.setAllowGravity(false);
    body.setDrag(0, 0);
    // Match the visible sprite bounds so the astronaut stays fully on-world
    // when Arcade Physics clamps it against the 2000x1500 world edges.
    body.setSize(
      this.hasAstronautAnimations ? ASTRONAUT_BODY_WIDTH : this.astronaut.width,
      this.hasAstronautAnimations ? ASTRONAUT_BODY_HEIGHT : this.astronaut.height,
      true
    );
    if (this.hasAstronautAnimations) {
      body.setOffset(
        ASTRONAUT_FRAME_WIDTH * ASTRONAUT_ANIMATION_ORIGIN_X -
          ASTRONAUT_BODY_WIDTH / 2,
        (ASTRONAUT_FRAME_HEIGHT - ASTRONAUT_BODY_HEIGHT) / 2
      );
    }
  }

  private configureKeyboardMovement(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    this.cursorKeys = keyboard.createCursorKeys();
    this.wasdKeys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys;
    this.interactKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.escapeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    keyboard.addCapture('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,ESC');
  }

  private focusGameCanvas(): void {
    this.game.canvas.focus({ preventScroll: true });
  }

  private refreshNearbyBuilding(): void {
    if (this.isBuildingPanelOpen) return;

    const nearby = this.getNearbyBuilding();
    if (nearby?.id === this.nearbyBuilding?.id) return;

    this.nearbyBuilding = nearby;
    this.game.events.emit(BUILDING_INTERACTION_EVENTS.nearby, nearby ?? null);
  }

  private setTutorialHighlightBuilding(buildingId: string | null): void {
    const sprite = buildingId ? this.buildings.get(buildingId) : undefined;
    this.tutorialHighlightBuilding = sprite;
    if (!sprite) {
      this.tutorialHighlightOutline?.clear().setVisible(false);
      return;
    }

    if (!this.tutorialHighlightOutline) {
      this.tutorialHighlightOutline = this.add.graphics().setDepth(26);
    }
    this.tutorialHighlightOutline.setVisible(true);
    this.updateTutorialHighlight();
  }

  private updateTutorialHighlight(): void {
    const sprite = this.tutorialHighlightBuilding;
    const outline = this.tutorialHighlightOutline;
    if (!sprite || !outline || !sprite.active) return;

    const bounds = sprite.getBounds();
    const padding = 7;
    outline
      .clear()
      .lineStyle(3, 0x7dd3fc, 0.95)
      .strokeRoundedRect(
        bounds.x - padding,
        bounds.y - padding,
        bounds.width + padding * 2,
        bounds.height + padding * 2,
        12
      )
      .setAlpha(0.72 + Math.sin(this.time.now / 200) * 0.2);
  }

  private openNearbyBuildingPanel(): void {
    if (this.isBuildingPanelOpen || !this.nearbyBuilding) return;

    const building = this.nearbyBuilding;
    this.isBuildingPanelOpen = true;
    this.nearbyBuilding = undefined;
    this.game.events.emit(BUILDING_INTERACTION_EVENTS.nearby, null);
    this.joystickVector.set(0, 0);
    this.joystickPointerId = null;
    this.joystickThumb?.setPosition(this.joystickCenter.x, this.joystickCenter.y);
    (this.astronaut.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
    this.game.events.emit(BUILDING_INTERACTION_EVENTS.panelOpen, building);
  }

  private closeBuildingPanel(): void {
    if (!this.isBuildingPanelOpen) return;

    this.isBuildingPanelOpen = false;
    this.game.events.emit(BUILDING_INTERACTION_EVENTS.panelClose);
    this.refreshNearbyBuilding();
  }

  private removeBuildingInteractionListeners(): void {
    this.game.events.off(
      BUILDING_INTERACTION_EVENTS.requestInteract,
      this.openNearbyBuildingPanel,
      this
    );
    this.game.events.off(
      BUILDING_INTERACTION_EVENTS.requestClose,
      this.closeBuildingPanel,
      this
    );
  }

  private isUiControlFocused(): boolean {
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement)) return false;
    if (
      activeElement === document.body ||
      activeElement === document.documentElement ||
      activeElement === this.game.canvas
    ) {
      return false;
    }

    return Boolean(
      activeElement.closest('button, input, textarea, select, a[href], [contenteditable="true"], [role="button"]')
    );
  }

  private createBuildingCollisionBounds(): void {
    for (const [id, sprite] of this.buildings) {
      const bounds = this.getBuildingCollisionRectangle(sprite);
      const obstacle = this.add
        .rectangle(bounds.x, bounds.y, bounds.width, bounds.height, 0x000000, 0)
        .setVisible(false)
        .setDepth(19);
      this.physics.add.existing(obstacle, true);
      const staticBody = obstacle.body as Phaser.Physics.Arcade.StaticBody;
      staticBody.updateFromGameObject();
      this.buildingCollisionBounds.set(id, obstacle);
      this.physics.add.collider(this.astronaut, obstacle);
    }
  }

  private createEnvironmentCollisionBounds(): void {
    this.environmentCollisionBounds = [];

    for (const decoration of M5_WORLD_DECORATIONS) {
      if (!decoration.collision) continue;
      const sprite = this.environmentDecorationSprites.find(
        (item) => item.texture.key === decoration.texture && item.x === decoration.x && item.y === decoration.y
      );
      if (!sprite) continue;

      const isCrater = decoration.collision === 'crater';
      const width = isCrater ? sprite.displayWidth * 0.4 : sprite.displayWidth * 0.46;
      const height = isCrater ? sprite.displayHeight * 0.2 : sprite.displayHeight * 0.32;
      const centerY = sprite.y + sprite.displayHeight * (isCrater ? 0.04 : 0.18);
      const obstacle = this.add
        .rectangle(sprite.x, centerY, width, height, 0x000000, 0)
        .setVisible(false);
      this.physics.add.existing(obstacle, true);
      (obstacle.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      this.physics.add.collider(this.astronaut, obstacle);
      this.environmentCollisionBounds.push(obstacle);
    }
  }

  private refreshBuildingCollisionBounds(): void {
    for (const [id, obstacle] of this.buildingCollisionBounds) {
      const sprite = this.buildings.get(id);
      if (!sprite) continue;

      const bounds = this.getBuildingCollisionRectangle(sprite);
      obstacle.setPosition(bounds.x, bounds.y).setSize(bounds.width, bounds.height);
      (obstacle.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    }
  }

  private getBuildingCollisionRectangle(sprite: Phaser.GameObjects.Sprite): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    return {
      x: sprite.x,
      y: sprite.y + sprite.displayHeight * 0.06,
      width: sprite.displayWidth * 0.78,
      height: sprite.displayHeight * 0.58,
    };
  }

  private syncVirtualJoystick(): void {
    if (!this.isCompactViewport()) {
      this.joystickBase?.destroy();
      this.joystickThumb?.destroy();
      this.joystickBase = undefined;
      this.joystickThumb = undefined;
      this.joystickPointerId = null;
      this.joystickVector.set(0, 0);
      return;
    }

    const x = Math.max(46, this.scale.width - 50);
    const y = Math.max(46, this.scale.height - 50);
    this.joystickCenter.set(x, y);

    if (!this.joystickBase) {
      this.joystickBase = this.add
        .circle(x, y, this.joystickRadius, 0x101827, 0.48)
        .setStrokeStyle(2, 0xcbd5e1, 0.72)
        .setScrollFactor(0)
        .setDepth(60);
      this.joystickThumb = this.add
        .circle(x, y, 14, 0xe2e8f0, 0.86)
        .setScrollFactor(0)
        .setDepth(61);
    } else {
      this.joystickBase.setPosition(x, y);
      this.joystickThumb?.setPosition(x, y);
    }
  }

  private handleJoystickPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isBuildingPanelOpen || !this.joystickBase || this.joystickPointerId !== null) return;
    if (
      Phaser.Math.Distance.Between(pointer.x, pointer.y, this.joystickCenter.x, this.joystickCenter.y) >
      this.joystickRadius + 18
    ) {
      return;
    }

    this.joystickPointerId = pointer.id;
    this.updateJoystickFromPointer(pointer);
  }

  private handleJoystickPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.isBuildingPanelOpen || pointer.id !== this.joystickPointerId) return;
    this.updateJoystickFromPointer(pointer);
  }

  private handleJoystickPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.joystickPointerId) return;
    this.joystickPointerId = null;
    this.joystickVector.set(0, 0);
    this.joystickThumb?.setPosition(this.joystickCenter.x, this.joystickCenter.y);
  }

  private updateJoystickFromPointer(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.joystickCenter.x;
    const dy = pointer.y - this.joystickCenter.y;
    this.joystickVector.set(dx / this.joystickRadius, dy / this.joystickRadius).limit(1);
    this.joystickThumb?.setPosition(
      this.joystickCenter.x + this.joystickVector.x * this.joystickRadius,
      this.joystickCenter.y + this.joystickVector.y * this.joystickRadius
    );
  }

  /** Prepared proximity query for the next building-interaction milestone. */
  public getNearbyBuilding(maxDistance = 80): BuildingData | undefined {
    let nearestBuilding: BuildingData | undefined;
    let nearestDistance = maxDistance;

    for (const building of CANONICAL_BUILDINGS) {
      const sprite = this.buildings.get(building.id);
      if (!sprite) continue;

      const bounds = sprite.getBounds();
      const dx = Math.max(bounds.left - this.astronaut.x, 0, this.astronaut.x - bounds.right);
      const dy = Math.max(bounds.top - this.astronaut.y, 0, this.astronaut.y - bounds.bottom);
      const distance = Math.hypot(dx, dy);
      if (distance <= nearestDistance) {
        nearestBuilding = building;
        nearestDistance = distance;
      }
    }

    return nearestBuilding;
  }

  private isCompactViewport(): boolean {
    const { width, height } = this.scale;
    return width < 768 || height < 500;
  }

  private isMediumViewport(): boolean {
    return !this.isCompactViewport() && this.scale.width < 1400;
  }

  private getInitialCameraTarget(): TrackPoint {
    if (this.isCompactViewport()) return { x: 1000, y: 580 };
    if (this.isMediumViewport()) return { x: 1000, y: 750 };
    return { x: 1000, y: 750 };
  }

  private getBuildingPosition(building: BuildingData): { x: number; y: number } {
    if (this.isCompactViewport()) return COMPACT_BUILDING_POSITIONS[building.id] ?? building;
    if (this.isMediumViewport()) return MEDIUM_BUILDING_POSITIONS[building.id] ?? building;
    return building;
  }

  private updateResponsiveComposition(): void {
    const compact = this.isCompactViewport();
    const medium = this.isMediumViewport();

    for (const building of CANONICAL_BUILDINGS) {
      const sprite = this.buildings.get(building.id);
      const label = this.buildingLabels.get(building.id);
      if (!sprite) continue;

      const position = this.getBuildingPosition(building);
      const targetWidth =
        APPROVED_BUILDING_DISPLAY_WIDTHS[building.id] * (compact ? 0.95 : 1);
      sprite.setScale(targetWidth / sprite.width);
      sprite.setPosition(position.x, position.y);

      if (label) {
        label.setFontSize(compact ? 20 : medium ? 12 : 11);
        const badgeY = position.y + sprite.displayHeight / 2 + (compact ? 10 : 14);
        label.setPosition(position.x, badgeY);
        if (building.id === 'habitat') {
          if (compact) {
            label.setPosition(
              position.x + sprite.displayWidth / 2 + label.displayWidth / 2 + 8,
              badgeY
            );
          } else {
            label.setPosition(
              position.x,
              position.y - sprite.displayHeight / 2 - label.displayHeight / 2 - 10
            );
          }
        }
      }
    }

    const habitat = this.buildings.get('habitat');
    if (habitat && (!this.hasPositionedAstronaut || !this.isFollowingAstronaut)) {
      this.astronaut.setPosition(
        habitat.x,
        habitat.y +
          habitat.displayHeight / 2 +
          ASTRONAUT_DISPLAY_HEIGHT / 2 +
          (compact ? 0 : 8)
      );
      this.hasPositionedAstronaut = true;
    }

    this.astronautStatusLabel?.setFontSize(compact ? 16 : 9);
    this.positionAstronautStatusLabel();
  }

  private positionAstronautStatusLabel(): void {
    if (!this.astronautStatusLabel || !this.astronaut) return;
    const placeAbove =
      this.isCompactViewport() ||
      this.astronaut.y > WORLD_HEIGHT - ASTRONAUT_DISPLAY_HEIGHT;
    this.astronautStatusLabel.setPosition(
      this.astronaut.x,
      placeAbove
        ? this.astronaut.y - ASTRONAUT_DISPLAY_HEIGHT / 2 - 12
        : this.astronaut.y + ASTRONAUT_DISPLAY_HEIGHT / 2 + 8
    );
  }

  /**
   * Cover both the world bounds and any viewport overrun with one undistorted image.
   */
  private updateTerrainBackgroundCover(): void {
    const background = this.terrainBackground;
    if (!background) return;

    const camera = this.cameras.main;
    const viewWidth = camera.displayWidth;
    const viewHeight = camera.displayHeight;
    const excessWidth = Math.max(0, viewWidth - WORLD_WIDTH);
    const excessHeight = Math.max(0, viewHeight - WORLD_HEIGHT);
    const coverWidth = Math.max(WORLD_WIDTH, viewWidth) + excessWidth + 2;
    const coverHeight = Math.max(WORLD_HEIGHT, viewHeight) + excessHeight + 2;
    // In both the original (1672x941) and replacement (1448x1086) backgrounds,
    // visible terrain occupies the top ~75% of the source height. Scaling against
    // visible height prevents transparent margins across the 2000x1500 world.
    const visibleRatio = 0.75;
    const visibleTerrainHeight = background.height * visibleRatio;
    const uniformScale = Math.max(
      coverWidth / background.width,
      coverHeight / visibleTerrainHeight
    );

    background
      .setPosition(WORLD_WIDTH / 2, WORLD_HEIGHT / 2)
      .setScale(uniformScale);
  }

  /**
   * Accessors for testing and future milestone telemetry bindings.
   */
  public getBuildingSprite(id: string): Phaser.GameObjects.Sprite | undefined {
    return this.buildings.get(id);
  }

  public getAstronautSprite(): Phaser.GameObjects.Sprite {
    return this.astronaut;
  }

  public getDustEmitter(): Phaser.GameObjects.Particles.ParticleEmitter | undefined {
    return this.dustEmitter;
  }
}
