import { describe, expect, it } from 'vitest';

// Minimal DOM polyfill for headless Node execution of Phaser module
if (typeof window === 'undefined') {
  class MockCanvasElement {
    getContext() {
      return {
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: [0, 0, 0, 0] }),
        putImageData: () => {},
        createImageData: () => ({ data: [] }),
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        fillText: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        strokePath: () => {},
        fill: () => {},
        arc: () => {},
        ellipse: () => {},
        createRadialGradient: () => ({
          addColorStop: () => {},
        }),
        createLinearGradient: () => ({
          addColorStop: () => {},
        }),
      };
    }
    style = {};
    width = 800;
    height = 600;
    addEventListener() {}
    removeEventListener() {}
  }

  const domStub = {
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  };

  (globalThis as any).window = domStub;
  (globalThis as any).HTMLCanvasElement = MockCanvasElement;
  (globalThis as any).HTMLVideoElement = class {};
  (globalThis as any).HTMLAudioElement = class {};
  (globalThis as any).Image = class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    src = '';
    addEventListener() {}
    removeEventListener() {}
  };
  (globalThis as any).document = {
    ...domStub,
    createElement: (tag: string) => {
      if (tag === 'canvas') return new MockCanvasElement();
      return { style: {} };
    },
    documentElement: { style: {} },
  };
}

describe('Phaser 3 Foundation & Viewport Configuration (Phase 03 M1)', () => {
  it('generates valid GameConfig targeting the designated parent container', async () => {
    const { getGameConfig } = await import('../src/game/config');
    const Phaser = (await import('phaser')).default || (await import('phaser'));

    const config = getGameConfig('test-game-container');

    expect(config.type).toBe(Phaser.AUTO);
    expect(config.parent).toBe('test-game-container');
    expect(config.backgroundColor).toBe('#150d1a');
  });

  it('configures responsive scale manager with RESIZE mode for landscape/desktop/mobile support', async () => {
    const { getGameConfig } = await import('../src/game/config');
    const Phaser = (await import('phaser')).default || (await import('phaser'));

    const config = getGameConfig('game-container');

    expect(config.scale).toBeDefined();
    expect(config.scale?.mode).toBe(Phaser.Scale.RESIZE);
    expect(config.scale?.autoCenter).toBe(Phaser.Scale.CENTER_BOTH);
    expect(config.scale?.width).toBe('100%');
    expect(config.scale?.height).toBe('100%');
    expect(config.scale?.min?.width).toBe(320);
    expect(config.scale?.min?.height).toBe(240);
  });

  it('enforces crisp pixel-art rendering flags (no blur/bilinear interpolation)', async () => {
    const { getGameConfig } = await import('../src/game/config');

    const config = getGameConfig('game-container');

    expect(config.render).toBeDefined();
    expect(config.render?.pixelArt).toBe(true);
    expect(config.render?.antialias).toBe(false);
    expect(config.render?.antialiasGL).toBe(false);
    expect(config.render?.roundPixels).toBe(true);
  });

  it('configures arcade physics with zero gravity for top-down Mars outpost mechanics', async () => {
    const { getGameConfig } = await import('../src/game/config');

    const config = getGameConfig('game-container');

    expect(config.physics).toBeDefined();
    expect(config.physics?.default).toBe('arcade');
    expect(config.physics?.arcade?.gravity?.x).toBe(0);
    expect(config.physics?.arcade?.gravity?.y).toBe(0);
  });

  it('includes MarsScene in the initial scene registry', async () => {
    const { getGameConfig } = await import('../src/game/config');
    const { MarsScene } = await import('../src/game/scenes/MarsScene');

    const config = getGameConfig('game-container');

    expect(config.scene).toBeDefined();
    const scenes = Array.isArray(config.scene) ? config.scene : [config.scene];
    expect(scenes).toContain(MarsScene);
  });
});

describe('Mars World & Environment Composition (Phase 03 M2)', () => {
  it('defines 2000x1500 world boundaries', async () => {
    const { WORLD_WIDTH, WORLD_HEIGHT } = await import('../src/game/scenes/MarsScene');
    expect(WORLD_WIDTH).toBe(2000);
    expect(WORLD_HEIGHT).toBe(1500);
  });

  it('places exactly the five canonical buildings in the Mars outpost', async () => {
    const { CANONICAL_BUILDINGS, WORLD_WIDTH, WORLD_HEIGHT } = await import('../src/game/scenes/MarsScene');

    expect(CANONICAL_BUILDINGS.length).toBe(5);

    const names = CANONICAL_BUILDINGS.map((b) => b.name);
    expect(names).toContain('Habitat');
    expect(names).toContain('Solar Farm');
    expect(names).toContain('Greenhouse');
    expect(names).toContain('Storm Shelter');
    expect(names).toContain('Mission Control');

    // Ensure all 5 buildings are placed well within the 2000x1500 boundary
    for (const building of CANONICAL_BUILDINGS) {
      expect(building.x).toBeGreaterThan(100);
      expect(building.x).toBeLessThan(WORLD_WIDTH - 100);
      expect(building.y).toBeGreaterThan(100);
      expect(building.y).toBeLessThan(WORLD_HEIGHT - 100);
      expect(building.texture).toBeTruthy();
      expect(building.role).toBeTruthy();
    }
  });

  it('exposes a cohesive Martian color palette with geological and structural tokens', async () => {
    const { MARS_PALETTE } = await import('../src/game/textures/palette');

    expect(MARS_PALETTE.terrain.regolithBase).toBe('#782d21');
    expect(MARS_PALETTE.astronaut.visorGold).toBe('#fbbf24');
    expect(MARS_PALETTE.structures.solarCellDeep).toBe('#1e3a8a');
    expect(MARS_PALETTE.structures.hazardYellow).toBe('#eab308');
  });
});
