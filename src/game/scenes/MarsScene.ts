import Phaser from 'phaser';
import { generateAllBuildingTextures } from '../textures/buildings';
import { BUILDING_INTERACTION_EVENTS } from '../building-events';
import { DISCOVERY_EVENTS } from '../discovery-events';
import { TUTORIAL_EVENTS } from '../tutorial-events';
import { MARS_DISCOVERIES, type MarsDiscovery } from '../../data/discoveries';
import {
  isTouchDevice,
  getJoystickPosition,
  calculateJoystickVector,
  isPointInMovementZone,
  JOYSTICK_RADIUS,
  JOYSTICK_HIT_RADIUS,
} from '../touch-controls';
import {
  applyBuildingHitArea,
  resolveNearbyBuilding,
  INTERACTION_MAX_DISTANCE,
} from '../building-hit-areas';

export const WORLD_WIDTH = 2000;
export const WORLD_HEIGHT = 1500;
const TERRAIN_BACKGROUND_TEXTURE = 'mars_terrain_background';
const BUILDING_SCALE_FACTOR = 1.33;
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
  // Curated Environmental Props from environmental-props
  { key: 'environment_prop_flag_nasa', file: 'prop-flag-nasa.png' },
  { key: 'environment_prop_comm_antenna', file: 'prop-comm-antenna.png' },
  { key: 'environment_prop_sensor_dish', file: 'prop-sensor-dish.png' },
  { key: 'environment_prop_floodlight', file: 'prop-floodlight.png' },
  { key: 'environment_prop_power_storage', file: 'prop-power-storage.png' },
  { key: 'environment_prop_water_tanks', file: 'prop-water-tanks.png' },
  { key: 'environment_prop_cargo_crates', file: 'prop-cargo-crates.png' },
  { key: 'environment_prop_hazard_barrier', file: 'prop-hazard-barrier.png' },
  { key: 'environment_prop_beacon', file: 'prop-beacon.png' },
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
  { key: 'environment_m5_boulder_01', file: 'boulder-01.png' },
  { key: 'environment_m5_boulder_02', file: 'boulder-02.png' },
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

  // Central Plaza: OUTPOST: MARS Colony Flag & Outpost Infrastructure Props
  { texture: 'environment_prop_flag_nasa', x: 740, y: 680, displayWidth: 56, depth: 21 },
  { texture: 'environment_prop_comm_antenna', x: 820, y: 440, displayWidth: 46, depth: 21 },
  { texture: 'environment_prop_sensor_dish', x: 440, y: 340, displayWidth: 44, depth: 21 },
  { texture: 'environment_prop_floodlight', x: 420, y: 580, displayWidth: 38, depth: 21 },
  { texture: 'environment_prop_power_storage', x: 1240, y: 480, displayWidth: 58, depth: 21 },
  { texture: 'environment_prop_floodlight', x: 1650, y: 580, displayWidth: 38, depth: 21 },
  { texture: 'environment_prop_water_tanks', x: 340, y: 960, displayWidth: 50, depth: 21 },
  { texture: 'environment_prop_cargo_crates', x: 1220, y: 840, displayWidth: 58, depth: 21 },
  { texture: 'environment_prop_beacon', x: 860, y: 220, displayWidth: 38, depth: 8 },
  { texture: 'environment_prop_hazard_barrier', x: 840, y: 1320, displayWidth: 62, depth: 8 },
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
  private nearbyDiscovery?: MarsDiscovery;
  private isDiscoveryPanelOpen = false;
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
  private readonly joystickRadius = JOYSTICK_RADIUS;
  private readonly joystickHitRadius = JOYSTICK_HIT_RADIUS;
  private touchInputActive = false;

  constructor() {
    super({ key: 'MarsScene' });
  }

  preload(): void {
    // 1. Load the approved Mars surface background as the base world layer.
    this.load.image(TERRAIN_BACKGROUND_TEXTURE, 'assets/environment/terrain/mars-terrain-background.png');

    // 2. Load separately derived track pieces. Original extracted candidates stay untouched.
    const trackPrefix = 'assets/environment/tracks/';
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

    // 6. Load replacement crater assets, derived environmental props, rocks, and terrain assets.
    for (const asset of CRATER_ASSETS) {
      this.load.image(asset.key, `${prefix}environment/craters/${asset.file}`);
    }
    for (const asset of DERIVED_ENVIRONMENT_ASSETS) {
      const subfolder = asset.file.startsWith('prop-')
        ? 'props'
        : asset.file.startsWith('soil-') || asset.file.startsWith('dune-')
          ? 'terrain'
          : 'rocks';
      this.load.image(asset.key, `${prefix}environment/${subfolder}/${asset.file}`);
    }
    for (const asset of M5_ENVIRONMENT_ASSETS) {
      this.load.image(asset.key, `${prefix}environment/props/${asset.file}`);
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
      applyBuildingHitArea(sprite, b.id);

      let lastBuildingTapTime = 0;
      const handleSelectBuilding = (pointer: Phaser.Input.Pointer) => {
        if (this.isBuildingPanelOpen || this.isDiscoveryPanelOpen) return;
        if (
          this.joystickPointerId === pointer.id ||
          this.isPointerOverJoystick(pointer) ||
          isPointInMovementZone(pointer.x, pointer.y, this.scale.width, this.scale.height)
        ) {
          return;
        }
        const now = Date.now();
        if (now - lastBuildingTapTime < 300) return;
        lastBuildingTapTime = now;
        this.openBuilding(b);
      };

      sprite.on('pointerdown', handleSelectBuilding);
      sprite.on('pointerup', handleSelectBuilding);
      this.buildings.set(b.id, sprite);

      // Building Label Plaque (High-contrast, accessible) anchored consistently above roof
      const plaque = this.add.text(position.x, position.y, b.name.toUpperCase(), {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '11px',
        color: '#f8fafc',
        backgroundColor: 'rgba(18, 24, 34, 0.88)',
        padding: { x: 8, y: 3 },
        align: 'center',
      }).setOrigin(0.5).setStroke('#38bdf8', 1);

      plaque.setPosition(
        position.x,
        position.y - sprite.displayHeight / 2 - plaque.displayHeight / 2 - 10
      );

      plaque.setDepth(25);
      plaque.setInteractive({ useHandCursor: true });
      plaque.on('pointerdown', handleSelectBuilding);
      plaque.on('pointerup', handleSelectBuilding);
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
    this.setupDomPointerListeners();
    this.input.on('pointerdown', this.onPointerDownGeneral, this);
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
    this.game.events.on(
      DISCOVERY_EVENTS.requestInspect,
      this.openNearbyDiscovery,
      this
    );
    this.game.events.on(
      DISCOVERY_EVENTS.panelClose,
      this.handleDiscoveryPanelClosed,
      this
    );
    this.game.events.on(
      TUTORIAL_EVENTS.highlightBuilding,
      this.setTutorialHighlightBuilding,
      this
    );
    this.syncVirtualJoystick();
    this.input.on('pointerdown', this.handleJoystickPointerDown, this);
    this.input.on('pointermove', this.handleJoystickPointerMove, this);
    this.input.on('pointerup', this.handleJoystickPointerUp, this);
    this.input.on('pointerupoutside', this.handleJoystickPointerUp, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanupScene, this);

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
    camera.startFollow(this.astronaut, true, 0.12, 0.12, 0, 0);
    this.isFollowingAstronaut = true;
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
   * Maintains full, immersive world scale across mobile, tablet, and desktop (matching desktop 1.0 scale).
   * Camera follows the astronaut without shrinking or miniaturizing the Mars world.
   */
  private updateCameraZoom(): void {
    const { width, height } = this.scale;
    const camera = this.cameras.main;

    if (width >= 1400 && height >= 850) {
      camera.setZoom(1.0);
    } else if (width >= 768 && height >= 500) {
      camera.setZoom(0.95);
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
    camera.setFollowOffset(0, 0);
  }

  /**
   * Renders the continuous, natural compacted Martian dirt road network.
   * Features gentle curves, consistent ~52px roadbed width, compacted aprons
   * beneath building entrances, and parallel rover tire impressions at depth 1.
   */
  private renderRoverTrackNetwork(): void {
    for (const track of this.roverTrackSprites) track.destroy();
    this.roverTrackSprites = [];

    const textureKey = 'martian_road_network';
    let roadCanvas = this.textures.get(textureKey) as Phaser.Textures.CanvasTexture | null;
    if (!roadCanvas || !this.textures.exists(textureKey)) {
      roadCanvas = this.textures.createCanvas(textureKey, WORLD_WIDTH, WORLD_HEIGHT);
    }

    if (roadCanvas) {
      const ctx = roadCanvas.getContext();
      if (ctx) {
        ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.drawDesktopRoads(ctx);
        roadCanvas.refresh();
      }

      const roadImage = this.add
        .image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, textureKey)
        .setOrigin(0.5)
        .setDepth(1);
      this.roverTrackSprites.push(roadImage);
    }
  }

  private drawDesktopRoads(ctx: CanvasRenderingContext2D): void {
    const routes: { p0: TrackPoint; p1: TrackPoint; p2: TrackPoint; p3: TrackPoint }[] = [
      // 1. Central Plaza Spine (Habitat wings to junctions)
      { p0: { x: 760, y: 750 }, p1: { x: 880, y: 750 }, p2: { x: 1120, y: 750 }, p3: { x: 1240, y: 750 } },
      // 2. Habitat to Mission Control (Northwest corridor -> MC entrance ramp)
      { p0: { x: 760, y: 750 }, p1: { x: 700, y: 730 }, p2: { x: 640, y: 660 }, p3: { x: 620, y: 580 } },
      // 3. Habitat to Greenhouse (Southwest corridor -> GH front apron)
      { p0: { x: 760, y: 750 }, p1: { x: 700, y: 780 }, p2: { x: 620, y: 880 }, p3: { x: 550, y: 920 } },
      // 4. Habitat to Solar Farm (Northeast corridor -> SF service apron)
      { p0: { x: 1240, y: 750 }, p1: { x: 1300, y: 720 }, p2: { x: 1380, y: 660 }, p3: { x: 1450, y: 600 } },
      // 5. Habitat to Storm Shelter (Southeast corridor -> SS bunker entrance)
      { p0: { x: 1240, y: 750 }, p1: { x: 1300, y: 780 }, p2: { x: 1380, y: 880 }, p3: { x: 1420, y: 920 } },
      // 6. North Crater Wilderness Route (radiating past Colony flag to north ridge)
      { p0: { x: 760, y: 680 }, p1: { x: 780, y: 550 }, p2: { x: 810, y: 380 }, p3: { x: 820, y: 200 } },
      // 7. Southeast Dunes Wilderness Route (radiating past Storm Shelter to southeast dunes)
      { p0: { x: 1420, y: 940 }, p1: { x: 1480, y: 1040 }, p2: { x: 1580, y: 1180 }, p3: { x: 1720, y: 1300 } },
    ];

    const traceRoute = (seg: { p0: TrackPoint; p1: TrackPoint; p2: TrackPoint; p3: TrackPoint }) => {
      ctx.beginPath();
      ctx.moveTo(seg.p0.x, seg.p0.y);
      if (typeof ctx.bezierCurveTo === 'function') {
        ctx.bezierCurveTo(seg.p1.x, seg.p1.y, seg.p2.x, seg.p2.y, seg.p3.x, seg.p3.y);
      } else {
        ctx.lineTo(seg.p3.x, seg.p3.y);
      }
    };

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Pass 1: Outer softened regolith shoulder
    ctx.lineWidth = 56;
    ctx.strokeStyle = 'rgba(108, 44, 28, 0.42)';
    if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
    for (const r of routes) {
      traceRoute(r);
      ctx.stroke();
    }

    // Pass 2: Compacted Martian roadbed
    ctx.lineWidth = 44;
    ctx.strokeStyle = 'rgba(126, 54, 36, 0.88)';
    for (const r of routes) {
      traceRoute(r);
      ctx.stroke();
    }

    // Pass 3: Center worn dirt surface
    ctx.lineWidth = 28;
    ctx.strokeStyle = 'rgba(146, 68, 47, 0.72)';
    for (const r of routes) {
      traceRoute(r);
      ctx.stroke();
    }

    // Pass 4 & 5: Parallel dual tire ruts with dashed track impressions
    this.drawTireRuts(ctx, routes, 13);

    // Compacted entrance aprons and plaza junctions
    const aprons = [
      { x: 1000, y: 750, r: 52 },
      { x: 620, y: 580, r: 36 },
      { x: 1450, y: 600, r: 36 },
      { x: 550, y: 920, r: 36 },
      { x: 1420, y: 920, r: 36 },
      { x: 760, y: 750, r: 40 },
      { x: 1240, y: 750, r: 40 },
    ];

    for (const a of aprons) {
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r + 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(108, 44, 28, 0.35)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(126, 54, 36, 0.85)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(146, 68, 47, 0.65)';
      ctx.fill();
    }
  }

  private drawTireRuts(
    ctx: CanvasRenderingContext2D,
    routes: { p0: TrackPoint; p1: TrackPoint; p2: TrackPoint; p3: TrackPoint }[],
    offset: number
  ): void {
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(58, 20, 12, 0.65)';
    if (typeof ctx.setLineDash === 'function') ctx.setLineDash([7, 5]);

    for (const r of routes) {
      const steps = 60;
      const leftPts: TrackPoint[] = [];
      const rightPts: TrackPoint[] = [];

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        const x = mt * mt * mt * r.p0.x + 3 * mt * mt * t * r.p1.x + 3 * mt * t * t * r.p2.x + t * t * t * r.p3.x;
        const y = mt * mt * mt * r.p0.y + 3 * mt * mt * t * r.p1.y + 3 * mt * t * t * r.p2.y + t * t * t * r.p3.y;

        const dx = 3 * mt * mt * (r.p1.x - r.p0.x) + 6 * mt * t * (r.p2.x - r.p1.x) + 3 * t * t * (r.p3.x - r.p2.x);
        const dy = 3 * mt * mt * (r.p1.y - r.p0.y) + 6 * mt * t * (r.p2.y - r.p1.y) + 3 * t * t * (r.p3.y - r.p2.y);
        const len = Math.hypot(dx, dy);

        if (len > 0) {
          const nx = -dy / len;
          const ny = dx / len;
          leftPts.push({ x: x - nx * offset, y: y - ny * offset });
          rightPts.push({ x: x + nx * offset, y: y + ny * offset });
        }
      }

      if (leftPts.length > 1) {
        ctx.beginPath();
        ctx.moveTo(leftPts[0].x, leftPts[0].y);
        for (let i = 1; i < leftPts.length; i++) ctx.lineTo(leftPts[i].x, leftPts[i].y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rightPts[0].x, rightPts[0].y);
        for (let i = 1; i < rightPts.length; i++) ctx.lineTo(rightPts[i].x, rightPts[i].y);
        ctx.stroke();
      }
    }

    if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
  }

  update(): void {
    const body = this.astronaut.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    if (this.isBuildingPanelOpen && this.escapeKey && Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      this.closeBuildingPanel();
    } else if (this.isDiscoveryPanelOpen && this.escapeKey && Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      this.closeDiscoveryPanel();
    } else if (
      !this.isBuildingPanelOpen &&
      !this.isDiscoveryPanelOpen &&
      this.nearbyBuilding &&
      this.interactKey &&
      Phaser.Input.Keyboard.JustDown(this.interactKey)
    ) {
      this.openNearbyBuildingPanel();
    } else if (
      !this.isBuildingPanelOpen &&
      !this.isDiscoveryPanelOpen &&
      !this.nearbyBuilding &&
      this.nearbyDiscovery &&
      this.interactKey &&
      Phaser.Input.Keyboard.JustDown(this.interactKey)
    ) {
      this.openNearbyDiscovery();
    }

    const canMove = !this.isBuildingPanelOpen && !this.isDiscoveryPanelOpen;
    let velocityX = canMove ? this.joystickVector.x : 0;
    let velocityY = canMove ? this.joystickVector.y : 0;

    if (canMove && !this.isUiControlFocused()) {
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
    this.refreshNearbyDiscovery();
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
    if (this.isBuildingPanelOpen || this.isDiscoveryPanelOpen) return;

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

  public isNearBuilding(building: BuildingData, maxDistance = INTERACTION_MAX_DISTANCE): boolean {
    const nearby = this.getNearbyBuilding(maxDistance);
    return nearby?.id === building.id;
  }

  public openBuilding(building?: BuildingData): boolean {
    if (this.isBuildingPanelOpen) return false;
    if (this.isDiscoveryPanelOpen) {
      this.closeDiscoveryPanel();
    }

    const nearby = this.getNearbyBuilding();
    // Proximity enforcement: if a specific building was targeted, astronaut MUST be in range
    if (building && (!nearby || nearby.id !== building.id)) {
      this.game.events.emit(BUILDING_INTERACTION_EVENTS.distantClick, building);
      return false;
    }

    const targetBuilding = building ?? nearby;
    if (!targetBuilding) return false;

    this.isBuildingPanelOpen = true;
    this.nearbyBuilding = undefined;
    this.game.events.emit(BUILDING_INTERACTION_EVENTS.nearby, null);
    this.resetJoystick();
    (this.astronaut.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
    this.game.events.emit(BUILDING_INTERACTION_EVENTS.panelOpen, targetBuilding);
    return true;
  }

  private openNearbyBuildingPanel = (): void => {
    if (this.isBuildingPanelOpen) return;
    const nearby = this.getNearbyBuilding();
    if (!nearby) return;
    this.openBuilding(nearby);
  };

  private closeBuildingPanel(): void {
    if (!this.isBuildingPanelOpen) return;

    this.isBuildingPanelOpen = false;
    this.game.events.emit(BUILDING_INTERACTION_EVENTS.panelClose);
    this.refreshNearbyBuilding();
    this.refreshNearbyDiscovery();
  }

  public getNearbyDiscovery(): MarsDiscovery | undefined {
    if (!this.astronaut) return undefined;
    const ax = this.astronaut.x;
    const ay = this.astronaut.y;

    let closest: MarsDiscovery | undefined;
    let closestDistSq = Infinity;

    for (const d of MARS_DISCOVERIES) {
      const distSq = (d.x - ax) ** 2 + (d.y - ay) ** 2;
      const radiusSq = d.radius ** 2;
      if (distSq <= radiusSq && distSq < closestDistSq) {
        closest = d;
        closestDistSq = distSq;
      }
    }
    return closest;
  }

  private refreshNearbyDiscovery(): void {
    if (this.isBuildingPanelOpen || this.isDiscoveryPanelOpen || this.nearbyBuilding) {
      if (this.nearbyDiscovery) {
        this.nearbyDiscovery = undefined;
        this.game.events.emit(DISCOVERY_EVENTS.nearby, null);
      }
      return;
    }

    const nearby = this.getNearbyDiscovery();
    if (nearby?.id === this.nearbyDiscovery?.id) return;

    this.nearbyDiscovery = nearby;
    this.game.events.emit(DISCOVERY_EVENTS.nearby, nearby ?? null);
  }

  public openNearbyDiscovery = (): void => {
    if (this.isBuildingPanelOpen || this.isDiscoveryPanelOpen) return;

    const nearby = this.getNearbyDiscovery();
    if (!nearby) return;

    this.isDiscoveryPanelOpen = true;
    this.nearbyDiscovery = undefined;
    this.game.events.emit(DISCOVERY_EVENTS.nearby, null);
    this.resetJoystick();
    (this.astronaut.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
    this.game.events.emit(DISCOVERY_EVENTS.panelOpen, nearby);
  };

  public closeDiscoveryPanel(): void {
    if (!this.isDiscoveryPanelOpen) return;

    this.isDiscoveryPanelOpen = false;
    this.game.events.emit(DISCOVERY_EVENTS.panelClose);
    this.refreshNearbyBuilding();
    this.refreshNearbyDiscovery();
  }

  private handleDiscoveryPanelClosed = (): void => {
    this.isDiscoveryPanelOpen = false;
    this.refreshNearbyBuilding();
    this.refreshNearbyDiscovery();
  };

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
    this.game.events.off(
      DISCOVERY_EVENTS.requestInspect,
      this.openNearbyDiscovery,
      this
    );
    this.game.events.off(
      DISCOVERY_EVENTS.panelClose,
      this.handleDiscoveryPanelClosed,
      this
    );
  }

  private isUiControlFocused(): boolean {
    if (typeof document === 'undefined') return false;
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    if (typeof HTMLElement !== 'undefined' && !(activeElement instanceof HTMLElement)) return false;
    if (
      activeElement === document.body ||
      activeElement === document.documentElement ||
      activeElement === this.game.canvas
    ) {
      return false;
    }

    return Boolean(
      (activeElement as HTMLElement).closest?.('button, input, textarea, select, a[href], [contenteditable="true"], [role="button"]')
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

  private isPointerTouch(pointer: Phaser.Input.Pointer): boolean {
    if (pointer.wasTouch) return true;
    const raw = pointer.event as PointerEvent | undefined;
    return raw?.pointerType === 'touch';
  }

  private onPointerDownGeneral(pointer: Phaser.Input.Pointer): void {
    this.focusGameCanvas();
    if (this.isPointerTouch(pointer) && !this.touchInputActive) {
      this.touchInputActive = true;
      this.syncVirtualJoystick();
    }
  }

  private isPointerOverJoystick(pointer: Phaser.Input.Pointer): boolean {
    if (!this.joystickBase) return false;
    return (
      Phaser.Math.Distance.Between(
        pointer.x,
        pointer.y,
        this.joystickCenter.x,
        this.joystickCenter.y
      ) <= this.joystickHitRadius
    );
  }

  private syncVirtualJoystick(): void {
    const isTouch =
      this.touchInputActive ||
      isTouchDevice() ||
      this.scale.width < 768 ||
      this.scale.height < 500;
    if (!isTouch) {
      this.destroyVirtualJoystick();
      return;
    }

    const { x, y } = getJoystickPosition(this.scale.width, this.scale.height);
    this.joystickCenter.set(x, y);

    if (!this.joystickBase) {
      // Fixed base: familiar mobile game joystick with outer ring and high-contrast thumb
      this.joystickBase = this.add
        .circle(x, y, this.joystickRadius, 0x090e17, 0.65)
        .setStrokeStyle(2, 0x38bdf8, 0.8)
        .setScrollFactor(0)
        .setDepth(60);
      this.joystickThumb = this.add
        .circle(x, y, 21, 0x0284c7, 0.95)
        .setStrokeStyle(2.5, 0xf0f9ff, 0.95)
        .setScrollFactor(0)
        .setDepth(61);
    } else {
      this.joystickBase.setPosition(x, y);
      if (this.joystickPointerId === null) {
        this.joystickThumb?.setPosition(x, y);
      }
    }
  }

  private handleJoystickPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isPointerTouch(pointer) && !this.touchInputActive) {
      this.touchInputActive = true;
      this.syncVirtualJoystick();
    }

    if (
      this.isBuildingPanelOpen ||
      this.isDiscoveryPanelOpen ||
      !this.joystickBase ||
      this.joystickPointerId !== null
    ) {
      return;
    }

    const isDirectHit = this.isPointerOverJoystick(pointer);
    if (!isDirectHit) {
      return;
    }

    // Permanently anchored: base NEVER moves from bottom-left!
    this.joystickPointerId = pointer.id;
    this.capturePointer(pointer);
    this.updateJoystickFromPointer(pointer);
  }

  private handleJoystickPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.isBuildingPanelOpen || this.isDiscoveryPanelOpen || pointer.id !== this.joystickPointerId) return;
    this.updateJoystickFromPointer(pointer);
  }

  private handleJoystickPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.joystickPointerId) return;
    this.releasePointer(pointer.id);
    this.resetJoystick();
  }

  private updateJoystickFromPointer(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.joystickCenter.x;
    const dy = pointer.y - this.joystickCenter.y;
    const vector = calculateJoystickVector(dx, dy, this.joystickRadius);
    this.joystickVector.set(vector.x, vector.y);
    this.joystickThumb?.setPosition(
      this.joystickCenter.x + this.joystickVector.x * this.joystickRadius,
      this.joystickCenter.y + this.joystickVector.y * this.joystickRadius
    );
  }

  private capturePointer(pointer: Phaser.Input.Pointer): void {
    const rawEvent = pointer.event as PointerEvent | undefined;
    if (rawEvent && typeof rawEvent.pointerId === 'number' && this.game.canvas.setPointerCapture) {
      try {
        this.game.canvas.setPointerCapture(rawEvent.pointerId);
      } catch {
        // Safe fallback in test or headless environments
      }
    }
  }

  private releasePointer(pointerId: number): void {
    if (this.game.canvas.releasePointerCapture) {
      try {
        if (this.game.canvas.hasPointerCapture?.(pointerId)) {
          this.game.canvas.releasePointerCapture(pointerId);
        }
      } catch {
        // Safe fallback
      }
    }
  }

  private setupDomPointerListeners(): void {
    const canvas = this.game.canvas;
    canvas.addEventListener('pointercancel', this.handleDomPointerCancel);
    window.addEventListener('pointercancel', this.handleDomPointerCancel);
    window.addEventListener('pointerup', this.handleWindowPointerUp);
    window.addEventListener('blur', this.handleWindowBlur);
  }

  private removeDomPointerListeners(): void {
    const canvas = this.game.canvas;
    canvas.removeEventListener('pointercancel', this.handleDomPointerCancel);
    window.removeEventListener('pointercancel', this.handleDomPointerCancel);
    window.removeEventListener('pointerup', this.handleWindowPointerUp);
    window.removeEventListener('blur', this.handleWindowBlur);
  }

  private handleDomPointerCancel = (event: PointerEvent): void => {
    if (this.joystickPointerId !== null && this.joystickPointerId === event.pointerId) {
      this.resetJoystick();
    }
  };

  private handleWindowPointerUp = (event: PointerEvent): void => {
    if (this.joystickPointerId === event.pointerId) {
      this.resetJoystick();
    }
  };

  private handleWindowBlur = (): void => {
    this.resetJoystick();
  };

  public resetJoystick(): void {
    if (this.joystickPointerId !== null) {
      this.releasePointer(this.joystickPointerId);
      this.joystickPointerId = null;
    }
    this.joystickVector.set(0, 0);
    const { x, y } = getJoystickPosition(this.scale.width, this.scale.height);
    this.joystickCenter.set(x, y);
    if (this.joystickBase) {
      this.joystickBase.setPosition(x, y);
    }
    if (this.joystickThumb) {
      this.joystickThumb.setPosition(x, y);
    }
    if (this.astronaut?.body) {
      (this.astronaut.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
    }
  }

  private destroyVirtualJoystick(): void {
    this.resetJoystick();
    this.joystickBase?.destroy();
    this.joystickThumb?.destroy();
    this.joystickBase = undefined;
    this.joystickThumb = undefined;
  }

  private cleanupScene(): void {
    this.destroyVirtualJoystick();
    this.removeDomPointerListeners();
    this.input.off('pointerdown', this.onPointerDownGeneral, this);
    this.input.off('pointerdown', this.handleJoystickPointerDown, this);
    this.input.off('pointermove', this.handleJoystickPointerMove, this);
    this.input.off('pointerup', this.handleJoystickPointerUp, this);
    this.input.off('pointerupoutside', this.handleJoystickPointerUp, this);
    this.scale.off('resize', this.handleResize, this);
    this.removeBuildingInteractionListeners();
  }

  public getJoystickBase(): Phaser.GameObjects.Arc | undefined {
    return this.joystickBase;
  }

  public getJoystickThumb(): Phaser.GameObjects.Arc | undefined {
    return this.joystickThumb;
  }

  public getJoystickCenter(): Phaser.Math.Vector2 {
    return this.joystickCenter;
  }

  public getJoystickVector(): Phaser.Math.Vector2 {
    return this.joystickVector;
  }

  public getJoystickPointerId(): number | null {
    return this.joystickPointerId;
  }

  public isTouchActive(): boolean {
    return this.touchInputActive || isTouchDevice();
  }

  /**
   * Authoritative proximity query: finds the single nearby building within maxDistance.
   * Resolves deterministically if multiple buildings are in range.
   */
  public getNearbyBuilding(maxDistance = INTERACTION_MAX_DISTANCE): BuildingData | undefined {
    const list: Array<{
      building: BuildingData;
      bounds: { left: number; right: number; top: number; bottom: number };
    }> = [];

    for (const building of CANONICAL_BUILDINGS) {
      const sprite = this.buildings.get(building.id);
      if (!sprite) continue;

      const bounds = sprite.getBounds();
      list.push({
        building,
        bounds: {
          left: bounds.left,
          right: bounds.right,
          top: bounds.top,
          bottom: bounds.bottom,
        },
      });
    }

    return resolveNearbyBuilding(
      list,
      { x: this.astronaut.x, y: this.astronaut.y },
      maxDistance
    );
  }

  private getInitialCameraTarget(): TrackPoint {
    return { x: 1000, y: 750 };
  }

  private getBuildingPosition(building: BuildingData): { x: number; y: number } {
    return building;
  }

  private updateResponsiveComposition(): void {
    for (const building of CANONICAL_BUILDINGS) {
      const sprite = this.buildings.get(building.id);
      const label = this.buildingLabels.get(building.id);
      if (!sprite) continue;

      const position = this.getBuildingPosition(building);
      const targetWidth = APPROVED_BUILDING_DISPLAY_WIDTHS[building.id];
      sprite.setScale(targetWidth / sprite.width);
      sprite.setPosition(position.x, position.y);

      if (label) {
        label.setFontSize(11);
        const labelY = position.y - sprite.displayHeight / 2 - label.displayHeight / 2 - 10;
        label.setPosition(position.x, labelY);
      }
    }

    const habitat = this.buildings.get('habitat');
    if (habitat && (!this.hasPositionedAstronaut || !this.isFollowingAstronaut)) {
      this.astronaut.setPosition(
        habitat.x,
        habitat.y +
          habitat.displayHeight / 2 +
          ASTRONAUT_DISPLAY_HEIGHT / 2 +
          8
      );
      this.hasPositionedAstronaut = true;
    }

    this.astronautStatusLabel?.setFontSize(9);
    this.positionAstronautStatusLabel();
  }

  private positionAstronautStatusLabel(): void {
    if (!this.astronautStatusLabel || !this.astronaut) return;
    const placeAbove = this.astronaut.y > WORLD_HEIGHT - ASTRONAUT_DISPLAY_HEIGHT;
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
