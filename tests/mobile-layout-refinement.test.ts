import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const { MarsScene } = await import('../src/game/scenes/MarsScene');
const {
  JOYSTICK_RADIUS,
  JOYSTICK_HIT_RADIUS,
  JOYSTICK_MARGIN,
  getJoystickPosition,
} = await import('../src/game/touch-controls');
const { OutpostHud } = await import('../src/ui/hud');
const { createInitialGameState } = await import('../src/core/state');

class MockDOMElement {
  public tagName: string;
  public className: string;
  public innerHTML: string = '';
  public parentNode: any = null;
  public attributes: Record<string, string> = {};
  public style: Record<string, string> = {};

  constructor(tagName = 'DIV', className = '') {
    this.tagName = tagName.toUpperCase();
    this.className = className;
  }

  public closest(selector: string): any {
    if (!selector) return null;
    const cleanSel = selector.replace(/^\./, '').replace(/\[.*\]/, '');
    if (this.className && this.className.split(/\s+/).includes(cleanSel)) {
      return this;
    }
    return this.parentNode ? this.parentNode.closest(selector) : null;
  }

  public click(): void {
    if (this.parentNode && typeof this.parentNode.handleChildClick === 'function') {
      this.parentNode.handleChildClick(this);
    }
  }

  public getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  public setAttribute(name: string, val: string): void {
    this.attributes[name] = val;
  }
}

describe('Mobile Layout Refinement (fix/mobile-layout-refinement)', () => {
  describe('1. Camera Zoom (~10% Zoom Out for Mobile Viewports)', () => {
    it('applies 0.90 zoom on compact mobile (360x800)', () => {
      const scene: any = new MarsScene();
      let zoom = 0;
      scene.cameras = { main: { setZoom: vi.fn((z: number) => { zoom = z; }) } };
      scene.scale = { width: 360, height: 800 };
      scene.updateCameraZoom();
      expect(zoom).toBe(0.90);
    });

    it('applies 0.90 zoom on standard mobile (390x844)', () => {
      const scene: any = new MarsScene();
      let zoom = 0;
      scene.cameras = { main: { setZoom: vi.fn((z: number) => { zoom = z; }) } };
      scene.scale = { width: 390, height: 844 };
      scene.updateCameraZoom();
      expect(zoom).toBe(0.90);
    });

    it('applies 0.90 zoom on Android flagship (412x915)', () => {
      const scene: any = new MarsScene();
      let zoom = 0;
      scene.cameras = { main: { setZoom: vi.fn((z: number) => { zoom = z; }) } };
      scene.scale = { width: 412, height: 915 };
      scene.updateCameraZoom();
      expect(zoom).toBe(0.90);
    });

    it('preserves 0.95 zoom on tablet (768x1024) and 1.0 on desktop (1920x1080)', () => {
      const scene: any = new MarsScene();
      let zoom = 0;
      scene.cameras = { main: { setZoom: vi.fn((z: number) => { zoom = z; }) } };

      scene.scale = { width: 768, height: 1024 };
      scene.updateCameraZoom();
      expect(zoom).toBe(0.95);

      scene.scale = { width: 1920, height: 1080 };
      scene.updateCameraZoom();
      expect(zoom).toBe(1.0);
    });
  });

  describe('2. Fixed Virtual Joystick at Bottom-Left', () => {
    it('maintains fixed bottom-left anchor coordinates and comfortable size', () => {
      expect(JOYSTICK_RADIUS).toBe(44);
      expect(JOYSTICK_HIT_RADIUS).toBe(75);
      expect(JOYSTICK_MARGIN).toBe(70);

      const pos360 = getJoystickPosition(360, 800);
      expect(pos360.x).toBe(70);
      expect(pos360.y).toBe(800 - 70);

      const pos390 = getJoystickPosition(390, 844);
      expect(pos390.x).toBe(70);
      expect(pos390.y).toBe(844 - 70);

      const pos412 = getJoystickPosition(412, 915);
      expect(pos412.x).toBe(70);
      expect(pos412.y).toBe(915 - 70);
    });

    it('stops astronaut movement immediately on release', () => {
      const scene: any = new MarsScene();
      scene.astronaut = { body: { setVelocity: vi.fn() } };
      scene.releasePointer = vi.fn();
      scene.scale = { width: 390, height: 844 };
      scene.resetJoystick();

      expect(scene.astronaut.body.setVelocity).toHaveBeenCalledWith(0, 0);
      expect(scene.joystickVector.x).toBe(0);
      expect(scene.joystickVector.y).toBe(0);
    });
  });

  describe('3. Telemetry & Resource Indicators Distributed Left & Right', () => {
    let container: any;
    let hud: any;

    beforeEach(() => {
      container = new MockDOMElement('DIV', 'hud-overlay');
      container.handleChildClick = (child: any) => {
        const listeners = container._listeners || [];
        for (const l of listeners) {
          l({ target: child });
        }
      };
      container.addEventListener = (_event: string, handler: any) => {
        container._listeners = container._listeners || [];
        container._listeners.push(handler);
      };

      hud = new OutpostHud(container as unknown as HTMLElement);
    });

    it('renders Left Group (Power & Life Support) and Right Group (Shield & Crew)', () => {
      const state = createInitialGameState();
      hud.update(state);
      const html = container.innerHTML;

      // Outer strip
      expect(html).toContain('hud-mobile-strip');

      // Left group
      expect(html).toContain('hud-mobile-left');
      expect(html).toContain('hud-mobile-telemetry');
      expect(html).toContain('val-power');
      expect(html).toContain('⚡ 45');
      expect(html).toContain('val-lifesupport');
      expect(html).toContain('🫁 92%');

      // Right group
      expect(html).toContain('hud-mobile-right');
      expect(html).toContain('hud-mobile-crew');
      expect(html).toContain('val-shield');
      expect(html).toContain('🛡️ 85%');
      expect(html).toContain('hud-mobile-crew-badge');
      expect(html).toContain('CREW ✓');
    });

    it('opens colony telemetry drawer when Left Group is tapped', () => {
      const state = createInitialGameState();
      hud.update(state);
      expect(container.innerHTML).not.toContain('hud-telemetry-drawer');

      const leftPill = new MockDOMElement('BUTTON', 'hud-mobile-pill hud-mobile-left hud-mobile-telemetry');
      leftPill.parentNode = container;
      leftPill.click();

      expect(container.innerHTML).toContain('hud-telemetry-drawer');
      expect(container.innerHTML).toContain('COLONY TELEMETRY');
    });

    it('opens crew roster drawer when Right Group is tapped', () => {
      const state = createInitialGameState();
      hud.update(state);
      expect(container.innerHTML).not.toContain('hud-crew-drawer');

      const rightPill = new MockDOMElement('BUTTON', 'hud-mobile-pill hud-mobile-right hud-mobile-crew');
      rightPill.parentNode = container;
      rightPill.click();

      expect(container.innerHTML).toContain('hud-crew-drawer');
      expect(container.innerHTML).toContain('CREW ROSTER');
    });
  });

  describe('4. Spatial Layout & Non-Overlap Verification', () => {
    it('verifies joystick bounding box is separated from objectives panel in mobile layout', () => {
      const viewportHeight = 844;
      const { x: joyX, y: joyY } = getJoystickPosition(390, viewportHeight);

      // Joystick bounding circle
      const joyTop = joyY - JOYSTICK_RADIUS; // 774 - 44 = 730
      const joyBottom = joyY + JOYSTICK_RADIUS; // 774 + 44 = 818
      const joyRight = joyX + JOYSTICK_RADIUS; // 70 + 44 = 114

      expect(joyRight).toBe(114);
      expect(joyTop).toBe(730);
      expect(joyBottom).toBe(818);

      // Objectives bar bottom anchor: 128px from bottom
      // At bottom 128px, objectives bar bottom Y is: 844 - 128 = 716
      const objectivesBottomY = viewportHeight - 128; // 716
      // Since objectivesBottomY (716) < joyTop (730), objectives sits cleanly above joystick
      expect(objectivesBottomY).toBeLessThan(joyTop);
    });
  });
});
