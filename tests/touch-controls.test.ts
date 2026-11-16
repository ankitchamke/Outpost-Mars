import { afterEach, describe, expect, it, vi } from 'vitest';

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

import {
  calculateJoystickVector,
  getControlEdgeClearance,
  getJoystickPosition,
  isTouchDevice,
  isPointInMovementZone,
  JOYSTICK_MARGIN,
  JOYSTICK_RADIUS,
} from '../src/game/touch-controls';

describe('Touch Controls & Capability Detection (Phase 07.1)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isTouchDevice()', () => {
    it('detects touch support when navigator.maxTouchPoints > 0', () => {
      vi.stubGlobal('navigator', { maxTouchPoints: 5 });

      expect(isTouchDevice()).toBe(true);
    });

    it('detects touch support on iOS/Safari via ontouchstart in window', () => {
      vi.stubGlobal('navigator', { maxTouchPoints: 0 });
      (globalThis.window as any).ontouchstart = null;

      expect(isTouchDevice()).toBe(true);

      delete (globalThis.window as any).ontouchstart;
    });

    it('detects touch support when pointer: coarse media query matches', () => {
      vi.stubGlobal('navigator', { maxTouchPoints: 0 });
      (globalThis.window as any).matchMedia = (query: string) => ({
        matches: query.includes('pointer: coarse'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      expect(isTouchDevice()).toBe(true);
    });

    it('returns false for traditional desktop without touch support', () => {
      vi.stubGlobal('navigator', { maxTouchPoints: 0 });
      delete (globalThis.window as any).ontouchstart;
      (globalThis.window as any).matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      expect(isTouchDevice()).toBe(false);
    });
  });

  describe('getJoystickPosition() - Tablet & Mobile Responsive Positioning', () => {
    it('positions joystick at bottom-left on tablet portrait (768 x 1024)', () => {
      const pos = getJoystickPosition(768, 1024);
      expect(pos.x).toBe(JOYSTICK_RADIUS + getControlEdgeClearance(768));
      expect(pos.y).toBe(1024 - JOYSTICK_MARGIN); // 968
    });

    it('positions joystick at bottom-left on tablet landscape (1024 x 768)', () => {
      const pos = getJoystickPosition(1024, 768);
      expect(pos.x).toBe(JOYSTICK_RADIUS + getControlEdgeClearance(1024));
      expect(pos.y).toBe(768 - JOYSTICK_MARGIN); // 712
    });

    it('positions joystick at bottom-left on mobile portrait (375 x 812)', () => {
      const pos = getJoystickPosition(375, 812);
      expect(pos.x).toBe(JOYSTICK_RADIUS + getControlEdgeClearance(375));
      expect(pos.y).toBe(812 - JOYSTICK_MARGIN); // 756
    });

    it('positions joystick at bottom-left on mobile landscape (844 x 390)', () => {
      const pos = getJoystickPosition(844, 390);
      expect(pos.x).toBe(JOYSTICK_RADIUS + getControlEdgeClearance(844));
      expect(pos.y).toBe(390 - JOYSTICK_MARGIN); // 334
    });

    it('clamps coordinates safely on extremely compact viewports', () => {
      const pos = getJoystickPosition(80, 80, {
        leftClearance: 56,
        bottomFromEdge: 56,
      });
      expect(pos.x).toBeGreaterThanOrEqual(24);
      expect(pos.y).toBeGreaterThanOrEqual(24);
    });

    it('keeps the joystick ring clear of the viewport edge and honors CSS dock insets', () => {
      const pos = getJoystickPosition(390, 844, {
        leftClearance: 20,
        bottomFromEdge: 70,
      });
      expect(pos.x - JOYSTICK_RADIUS).toBe(20);
      expect(844 - pos.y).toBe(70);
    });
  });

  describe('calculateJoystickVector() - Movement Normalization', () => {
    it('returns zero vector when pointer is at the center', () => {
      const vec = calculateJoystickVector(0, 0, JOYSTICK_RADIUS);
      expect(vec.x).toBe(0);
      expect(vec.y).toBe(0);
      expect(vec.magnitude).toBe(0);
    });

    it('produces pure horizontal right movement', () => {
      const vec = calculateJoystickVector(JOYSTICK_RADIUS, 0, JOYSTICK_RADIUS);
      expect(vec.x).toBeCloseTo(1, 4);
      expect(vec.y).toBe(0);
      expect(vec.magnitude).toBeCloseTo(1, 4);
    });

    it('produces pure vertical up movement', () => {
      const vec = calculateJoystickVector(0, -JOYSTICK_RADIUS, JOYSTICK_RADIUS);
      expect(vec.x).toBe(0);
      expect(vec.y).toBeCloseTo(-1, 4);
      expect(vec.magnitude).toBeCloseTo(1, 4);
    });

    it('clamps vector magnitude to 1 when dragged far beyond joystick radius', () => {
      const vec = calculateJoystickVector(200, 200, JOYSTICK_RADIUS);
      expect(vec.magnitude).toBeCloseTo(1, 4);
      expect(vec.x).toBeCloseTo(Math.SQRT1_2, 4);
      expect(vec.y).toBeCloseTo(Math.SQRT1_2, 4);
    });

    it('preserves proportional small deflections within deadzone and radius', () => {
      const vec = calculateJoystickVector(JOYSTICK_RADIUS * 0.5, 0, JOYSTICK_RADIUS);
      expect(vec.x).toBeCloseTo(0.5, 4);
      expect(vec.y).toBe(0);
      expect(vec.magnitude).toBeCloseTo(0.5, 4);
    });

    it('calculates equal components for diagonal movement', () => {
      const vec = calculateJoystickVector(30, 30, JOYSTICK_RADIUS);
      expect(Math.abs(vec.x - vec.y)).toBeLessThan(1e-5);
      expect(vec.magnitude).toBeLessThanOrEqual(1);
    });
  });

  describe('isPointInMovementZone() - Ergonomic Touch Control Area', () => {
    it('returns true for touchdown in the bottom-left zone on mobile portrait (375x812)', () => {
      expect(isPointInMovementZone(60, 750, 375, 812)).toBe(true);
      expect(isPointInMovementZone(120, 700, 375, 812)).toBe(true);
    });

    it('returns true for touchdown in bottom-left zone on tablet (768x1024)', () => {
      expect(isPointInMovementZone(100, 900, 768, 1024)).toBe(true);
    });

    it('returns false for touches in the top half of the screen', () => {
      expect(isPointInMovementZone(50, 100, 375, 812)).toBe(false);
      expect(isPointInMovementZone(100, 300, 768, 1024)).toBe(false);
    });

    it('returns false for touches on the right side of the screen (prompt/telemetry area)', () => {
      expect(isPointInMovementZone(320, 750, 375, 812)).toBe(false);
      expect(isPointInMovementZone(600, 900, 768, 1024)).toBe(false);
    });
  });

  describe('Game Config Multi-Touch & Input Setup', () => {
    it('configures activePointers >= 3 and touch: true to support simultaneous joystick movement and button taps', async () => {
      const { getGameConfig } = await import('../src/game/config');
      const config = getGameConfig('game-container');
      expect(config.input).toBeDefined();
      expect(typeof config.input === 'object' && config.input !== null).toBe(true);
      if (typeof config.input === 'object' && config.input !== null) {
        expect(config.input.activePointers).toBeGreaterThanOrEqual(3);
        expect(config.input.touch).toBe(true);
      }
    });
  });
});
