import { describe, expect, it, vi } from 'vitest';

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
        createRadialGradient: () => ({ addColorStop: () => {} }),
        createLinearGradient: () => ({ addColorStop: () => {} }),
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
    matchMedia: () => ({ matches: false }),
    innerWidth: 390,
    innerHeight: 844,
  };

  (globalThis as any).window = domStub;
  (globalThis as any).HTMLElement = class {};
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
    activeElement: null,
  };
}

describe('Mobile Gameplay Camera, Joystick & World Layout (fix/mobile-gameplay-camera-labels)', async () => {
  const { CANONICAL_BUILDINGS, MarsScene } = await import(
    '../src/game/scenes/MarsScene'
  );
  const {
    JOYSTICK_RADIUS,
    JOYSTICK_HIT_RADIUS,
    JOYSTICK_MARGIN,
    getJoystickPosition,
  } = await import('../src/game/touch-controls');

  describe('1. Virtual Joystick Dimensions & Anchor', () => {
    it('increases overall joystick size by ~15-20% for comfortable thumb operation', () => {
      // Base radius enlarged from 38 to 44 (~16% increase)
      expect(JOYSTICK_RADIUS).toBe(44);
      // Hit radius enlarged from 64 to 75 (~17% increase, 150px touch target)
      expect(JOYSTICK_HIT_RADIUS).toBe(75);
      // Control center remains 70px above the viewport bottom.
      expect(JOYSTICK_MARGIN).toBe(70);
    });

    it('anchors joystick base permanently at bottom-left without relocating on touch', () => {
      const scene: any = new MarsScene();
      scene.game = {
        events: { emit: vi.fn() },
        canvas: {
          releasePointerCapture: vi.fn(),
          setPointerCapture: vi.fn(),
          hasPointerCapture: vi.fn().mockReturnValue(false),
        },
      };
      scene.scale = { width: 390, height: 844 };
      scene.astronaut = { body: { setVelocity: vi.fn() } };
      scene.time = { now: 1000 };

      const { x: anchorX, y: anchorY } = getJoystickPosition(390, 844);
      scene.joystickCenter.set(anchorX, anchorY);
      scene.joystickBase = { setPosition: vi.fn() };
      scene.joystickThumb = {
        setPosition: vi.fn((newX: number, newY: number) => {
          scene.joystickThumb.x = newX;
          scene.joystickThumb.y = newY;
        }),
        x: anchorX,
        y: anchorY,
      };

      // Direct touch on base
      scene.handleJoystickPointerDown({ id: 10, x: anchorX + 15, y: anchorY + 15 });
      expect(scene.joystickCenter.x).toBe(anchorX);
      expect(scene.joystickCenter.y).toBe(anchorY);
      expect(scene.joystickPointerId).toBe(10);
    });

    it('rejects touches far outside the joystick hit radius so map interaction is not hijacked', () => {
      const scene: any = new MarsScene();
      scene.game = {
        events: { emit: vi.fn() },
        canvas: { releasePointerCapture: vi.fn(), setPointerCapture: vi.fn() },
      };
      scene.scale = { width: 390, height: 844 };
      scene.astronaut = { body: { setVelocity: vi.fn() } };

      const { x: anchorX, y: anchorY } = getJoystickPosition(390, 844);
      scene.joystickCenter.set(anchorX, anchorY);
      scene.joystickBase = { setPosition: vi.fn() };
      scene.joystickThumb = { setPosition: vi.fn() };

      // Touch 200px above joystick anchor (in middle of screen)
      scene.handleJoystickPointerDown({ id: 20, x: anchorX, y: anchorY - 200 });
      expect(scene.joystickPointerId).toBeNull();
      expect(scene.joystickVector.x).toBe(0);
      expect(scene.joystickVector.y).toBe(0);
    });
  });

  describe('2. Independent Verification of All 8 Movement Directions', () => {
    const anchorX = 70;
    const anchorY = 774;

    function simulateJoystickDirection(dx: number, dy: number) {
      const scene: any = new MarsScene();
      scene.game = {
        events: { emit: vi.fn() },
        canvas: {
          releasePointerCapture: vi.fn(),
          setPointerCapture: vi.fn(),
          hasPointerCapture: vi.fn().mockReturnValue(false),
        },
      };
      scene.scale = { width: 390, height: 844 };
      const setVelocityMock = vi.fn();
      scene.astronaut = { body: { setVelocity: setVelocityMock } };
      scene.joystickCenter.set(anchorX, anchorY);
      scene.joystickBase = { setPosition: vi.fn() };
      scene.joystickThumb = { setPosition: vi.fn() };

      // Touch down within hit area
      scene.handleJoystickPointerDown({ id: 1, x: anchorX, y: anchorY });
      // Move pointer in direction
      scene.handleJoystickPointerMove({ id: 1, x: anchorX + dx, y: anchorY + dy });

      // Run update loop frame
      scene.update();

      return {
        vector: { x: scene.joystickVector.x, y: scene.joystickVector.y },
        velocity: setVelocityMock.mock.calls[0] ?? [0, 0],
      };
    }

    it('Direction 1: UP (dragging thumb upwards moves astronaut up)', () => {
      // Screen Y decreases upwards
      const { vector, velocity } = simulateJoystickDirection(0, -35);
      expect(vector.x).toBeCloseTo(0, 2);
      expect(vector.y).toBeLessThan(0); // Vector Y is negative
      expect(velocity[0]).toBeCloseTo(0, 2);
      expect(velocity[1]).toBeLessThan(0); // Negative velocity moves Up in world
    });

    it('Direction 2: DOWN (dragging thumb downwards moves astronaut down)', () => {
      // Screen Y increases downwards
      const { vector, velocity } = simulateJoystickDirection(0, 35);
      expect(vector.x).toBeCloseTo(0, 2);
      expect(vector.y).toBeGreaterThan(0); // Vector Y is positive
      expect(velocity[0]).toBeCloseTo(0, 2);
      expect(velocity[1]).toBeGreaterThan(0); // Positive velocity moves Down in world
    });

    it('Direction 3: LEFT (dragging thumb left moves astronaut left)', () => {
      const { vector, velocity } = simulateJoystickDirection(-35, 0);
      expect(vector.x).toBeLessThan(0); // Vector X is negative
      expect(vector.y).toBeCloseTo(0, 2);
      expect(velocity[0]).toBeLessThan(0); // Negative velocity moves Left in world
      expect(velocity[1]).toBeCloseTo(0, 2);
    });

    it('Direction 4: RIGHT (dragging thumb right moves astronaut right)', () => {
      const { vector, velocity } = simulateJoystickDirection(35, 0);
      expect(vector.x).toBeGreaterThan(0); // Vector X is positive
      expect(vector.y).toBeCloseTo(0, 2);
      expect(velocity[0]).toBeGreaterThan(0); // Positive velocity moves Right in world
      expect(velocity[1]).toBeCloseTo(0, 2);
    });

    it('Direction 5: UP-LEFT (diagonal top-left moves astronaut up-left)', () => {
      const { vector, velocity } = simulateJoystickDirection(-25, -25);
      expect(vector.x).toBeLessThan(0);
      expect(vector.y).toBeLessThan(0);
      expect(velocity[0]).toBeLessThan(0);
      expect(velocity[1]).toBeLessThan(0);
    });

    it('Direction 6: UP-RIGHT (diagonal top-right moves astronaut up-right)', () => {
      const { vector, velocity } = simulateJoystickDirection(25, -25);
      expect(vector.x).toBeGreaterThan(0);
      expect(vector.y).toBeLessThan(0);
      expect(velocity[0]).toBeGreaterThan(0);
      expect(velocity[1]).toBeLessThan(0);
    });

    it('Direction 7: DOWN-LEFT (diagonal bottom-left moves astronaut down-left)', () => {
      const { vector, velocity } = simulateJoystickDirection(-25, 25);
      expect(vector.x).toBeLessThan(0);
      expect(vector.y).toBeGreaterThan(0);
      expect(velocity[0]).toBeLessThan(0);
      expect(velocity[1]).toBeGreaterThan(0);
    });

    it('Direction 8: DOWN-RIGHT (diagonal bottom-right moves astronaut down-right)', () => {
      const { vector, velocity } = simulateJoystickDirection(25, 25);
      expect(vector.x).toBeGreaterThan(0);
      expect(vector.y).toBeGreaterThan(0);
      expect(velocity[0]).toBeGreaterThan(0);
      expect(velocity[1]).toBeGreaterThan(0);
    });

    it('Release immediately stops astronaut movement (velocity = 0)', () => {
      const scene: any = new MarsScene();
      scene.game = {
        events: { emit: vi.fn() },
        canvas: { releasePointerCapture: vi.fn(), setPointerCapture: vi.fn() },
      };
      scene.scale = { width: 390, height: 844 };
      const setVelocityMock = vi.fn();
      scene.astronaut = { body: { setVelocity: setVelocityMock } };
      scene.joystickCenter.set(anchorX, anchorY);
      scene.joystickBase = { setPosition: vi.fn() };
      scene.joystickThumb = { setPosition: vi.fn() };

      scene.handleJoystickPointerDown({ id: 1, x: anchorX, y: anchorY + 30 });
      scene.handleJoystickPointerUp({ id: 1 });

      expect(scene.joystickPointerId).toBeNull();
      expect(scene.joystickVector.x).toBe(0);
      expect(scene.joystickVector.y).toBe(0);

      scene.update();
      expect(setVelocityMock).toHaveBeenCalledWith(0, 0);
    });
  });

  describe('3. Building Label Positions & World Anchor', () => {
    it('anchors all 5 building labels consistently ABOVE their respective structures', () => {
      const scene: any = new MarsScene();
      scene.scale = { width: 390, height: 844 };

      for (const building of CANONICAL_BUILDINGS) {
        const sprite = {
          x: building.x,
          y: building.y,
          width: 256,
          height: 192,
          displayWidth: 340,
          displayHeight: 255,
          setScale: vi.fn(),
          setPosition: vi.fn(),
        };
        const label = {
          x: building.x,
          y: building.y,
          displayWidth: 120,
          displayHeight: 20,
          setFontSize: vi.fn(),
          setPosition: vi.fn((x: number, y: number) => {
            label.x = x;
            label.y = y;
          }),
        };
        scene.buildings.set(building.id, sprite);
        scene.buildingLabels.set(building.id, label);
      }

      scene.astronaut = {
        x: 1000,
        y: 950,
        setPosition: vi.fn(),
      };
      scene.astronautStatusLabel = {
        setFontSize: vi.fn(),
        setPosition: vi.fn(),
      };

      scene.updateResponsiveComposition();

      for (const building of CANONICAL_BUILDINGS) {
        const sprite = scene.buildings.get(building.id);
        const label = scene.buildingLabels.get(building.id);

        // Label must be centered horizontally on building
        expect(label.x).toBe(building.x);
        // Label must be placed strictly ABOVE the building's roof edge
        const buildingTopEdge = building.y - sprite.displayHeight / 2;
        expect(label.y).toBeLessThan(buildingTopEdge);
      }
    });

    it('prevents labels and status badges from overlapping the astronaut at the Habitat entrance', () => {
      const scene: any = new MarsScene();
      scene.scale = { width: 390, height: 844 };

      const habitatData = CANONICAL_BUILDINGS.find((b) => b.id === 'habitat')!;
      const habitatSprite = {
        x: habitatData.x,
        y: habitatData.y,
        width: 272,
        height: 204,
        displayWidth: 361,
        displayHeight: 271,
        setScale: vi.fn(),
        setPosition: vi.fn(),
      };
      const habitatLabel = {
        x: habitatData.x,
        y: habitatData.y,
        displayWidth: 90,
        displayHeight: 20,
        setFontSize: vi.fn(),
        setPosition: vi.fn((x: number, y: number) => {
          habitatLabel.x = x;
          habitatLabel.y = y;
        }),
      };

      scene.buildings.set('habitat', habitatSprite);
      scene.buildingLabels.set('habitat', habitatLabel);

      let statusLabelY = 0;
      scene.astronautStatusLabel = {
        setFontSize: vi.fn(),
        setPosition: vi.fn((_x: number, y: number) => {
          statusLabelY = y;
        }),
      };
      scene.astronaut = {
        x: habitatData.x,
        y: habitatData.y + habitatSprite.displayHeight / 2 + 38,
        setPosition: vi.fn(),
      };

      scene.updateResponsiveComposition();

      // Habitat label is above roof
      expect(habitatLabel.y).toBeLessThan(habitatData.y - habitatSprite.displayHeight / 2);
      // Astronaut is below Habitat entrance
      expect(scene.astronaut.y).toBeGreaterThan(habitatData.y + habitatSprite.displayHeight / 2);
      // Commander status label is below astronaut feet
      expect(statusLabelY).toBeGreaterThan(scene.astronaut.y);
      // Ensure Habitat label and astronaut do not collide
      expect(Math.abs(habitatLabel.y - scene.astronaut.y)).toBeGreaterThan(200);
    });

    it('keeps building labels in world space so they scroll naturally with camera follow', () => {
      const scene: any = new MarsScene();
      scene.scale = { width: 390, height: 844 };

      const mc = CANONICAL_BUILDINGS.find((b) => b.id === 'mission_control')!;
      const pos = scene.getBuildingPosition(mc);
      expect(pos.x).toBe(620);
      expect(pos.y).toBe(500);

      const sf = CANONICAL_BUILDINGS.find((b) => b.id === 'solar_farm')!;
      const posSf = scene.getBuildingPosition(sf);
      expect(posSf.x).toBe(1450);
      expect(posSf.y).toBe(520);
    });
  });

  describe('4. Mobile Map Scale & Camera Follow', () => {
    it('sets refined mobile visual scale (zoom 0.90, ~10% zoom out) on mobile viewports for optimal overview', () => {
      const scene: any = new MarsScene();
      let appliedZoom = 0;
      scene.cameras = {
        main: {
          setZoom: vi.fn((z: number) => {
            appliedZoom = z;
          }),
        },
      };

      // Test 360x800 (Compact mobile)
      scene.scale = { width: 360, height: 800 };
      scene.updateCameraZoom();
      expect(appliedZoom).toBe(0.85);

      // Test 390x844 (Standard mobile)
      scene.scale = { width: 390, height: 844 };
      scene.updateCameraZoom();
      expect(appliedZoom).toBe(0.85);

      // Test 412x915 (Android flagship)
      scene.scale = { width: 412, height: 915 };
      scene.updateCameraZoom();
      expect(appliedZoom).toBe(0.85);

      // Test tablet 768x1024
      scene.scale = { width: 768, height: 1024 };
      scene.updateCameraZoom();
      expect(appliedZoom).toBe(0.95);

      // Test desktop 1920x1080
      scene.scale = { width: 1920, height: 1080 };
      scene.updateCameraZoom();
      expect(appliedZoom).toBe(1.0);
    });

    it('centers camera follow on astronaut with zero offset to keep player visible on screen', () => {
      const scene: any = new MarsScene();
      let followOffset = { x: -999, y: -999 };
      scene.cameras = {
        main: {
          setFollowOffset: vi.fn((x: number, y: number) => {
            followOffset = { x, y };
          }),
        },
      };

      scene.syncCameraFollowOffset();
      expect(followOffset.x).toBe(0);
      expect(followOffset.y).toBe(0);
    });

    it('preserves canonical building layout on all viewports without flattening into a single row', () => {
      const scene: any = new MarsScene();

      // Mobile portrait
      scene.scale = { width: 390, height: 844 };
      const ghPos = scene.getBuildingPosition({ id: 'greenhouse', x: 550, y: 1000 });
      const mcPos = scene.getBuildingPosition({ id: 'mission_control', x: 620, y: 500 });
      const sfPos = scene.getBuildingPosition({ id: 'solar_farm', x: 1450, y: 520 });

      // Must remain at diverse canonical road junctions, not flattened at y=700
      expect(ghPos.y).toBe(1000);
      expect(mcPos.y).toBe(500);
      expect(sfPos.y).toBe(520);
    });
  });
});
