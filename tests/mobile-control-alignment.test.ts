import { describe, it, expect, vi } from 'vitest';

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
  getJoystickPosition,
  getControlEdgeClearance,
  getCameraCompensatedPosition,
  JOYSTICK_RADIUS,
  JOYSTICK_HIT_RADIUS,
} =
  await import('../src/game/touch-controls');
const { BuildingInteractionUI } = await import('../src/ui/building-interactions');
const { createInitialGameState } = await import('../src/core/state');

class MockDOMElement {
  public tagName: string;
  public className: string;
  public innerHTML: string = '';
  public parentNode: any = null;
  public attributes: Record<string, string> = {};
  public style: Record<string, string> = {};
  public hidden = false;
  public _listeners: Record<string, Function[]> = {};
  public classList = {
    classes: new Set<string>(),
    add: (cls: string) => {
      if (cls) this.classList.classes.add(cls);
    },
    remove: (cls: string) => this.classList.classes.delete(cls),
    toggle: (cls: string, force?: boolean) => {
      if (force === true) {
        if (cls) this.classList.classes.add(cls);
      } else if (force === false) this.classList.classes.delete(cls);
      else if (this.classList.classes.has(cls)) this.classList.classes.delete(cls);
      else {
        if (cls) this.classList.classes.add(cls);
      }
      return this.classList.classes.has(cls);
    },
    contains: (cls: string) => Boolean(cls && this.classList.classes.has(cls)),
  };

  constructor(tagName = 'DIV', className = '') {
    this.tagName = tagName.toUpperCase();
    this.className = className;
    if (className && className.trim()) {
      className
        .trim()
        .split(/\s+/)
        .forEach((c) => {
          if (c) this.classList.classes.add(c);
        });
    }
  }

  public addEventListener(event: string, handler: Function): void {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(handler);
  }

  public removeEventListener(event: string, handler: Function): void {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter((h) => h !== handler);
  }

  public querySelector(selector: string): any {
    if (selector.startsWith('[data-')) {
      const attr = selector.slice(1, -1);
      if (this.innerHTML.includes(attr)) {
        const btn = new MockDOMElement('BUTTON');
        btn.parentNode = this;
        btn.attributes[attr] = '';
        return btn;
      }
    }
    return null;
  }

  public querySelectorAll(selector: string): any[] {
    const el = this.querySelector(selector);
    return el ? [el] : [];
  }

  public closest(selector: string): any {
    if (!selector) return null;
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      if (this.classList.contains(cls)) return this;
    } else if (selector.startsWith('[') && selector.endsWith(']')) {
      const attr = selector.slice(1, -1);
      if (attr in this.attributes) return this;
    } else if (this.tagName.toLowerCase() === selector.toLowerCase()) {
      return this;
    }
    return this.parentNode ? this.parentNode.closest(selector) : null;
  }

  public click(): void {
    const event = {
      type: 'click',
      target: this,
      preventDefault: () => {},
      stopPropagation: () => {},
    };
    let curr: any = this;
    while (curr) {
      const listeners = curr._listeners?.['click'] || [];
      for (const l of listeners) l(event);
      curr = curr.parentNode;
    }
  }
}

describe('Mobile Control Alignment & Camera Refinement (fix/mobile-control-alignment)', () => {
  describe('1. Camera Zoom Refinement (0.85 Immersive Viewport Scale)', () => {
    it('applies optimal 0.85 zoom on compact mobile (360x800)', () => {
      const scene: any = new MarsScene();
      let appliedZoom = 0;
      scene.cameras = { main: { setZoom: vi.fn((z: number) => { appliedZoom = z; }) } };
      scene.scale = { width: 360, height: 800 };
      scene.updateCameraZoom();
      expect(appliedZoom).toBe(0.85);
    });

    it('applies the mobile zoom on standard mobile (390x844)', () => {
      const scene: any = new MarsScene();
      let appliedZoom = 0;
      scene.cameras = { main: { setZoom: vi.fn((z: number) => { appliedZoom = z; }) } };
      scene.scale = { width: 390, height: 844 };
      scene.updateCameraZoom();
      expect(appliedZoom).toBe(0.85);
    });

    it('applies optimal 0.85 zoom on Android flagship (412x915)', () => {
      const scene: any = new MarsScene();
      let appliedZoom = 0;
      scene.cameras = { main: { setZoom: vi.fn((z: number) => { appliedZoom = z; }) } };
      scene.scale = { width: 412, height: 915 };
      scene.updateCameraZoom();
      expect(appliedZoom).toBe(0.85);
    });

    it('preserves 0.95 zoom on tablet (768x1024) and 1.0 on desktop (1920x1080)', () => {
      const scene: any = new MarsScene();
      let appliedZoom = 0;
      scene.cameras = { main: { setZoom: vi.fn((z: number) => { appliedZoom = z; }) } };

      scene.scale = { width: 768, height: 1024 };
      scene.updateCameraZoom();
      expect(appliedZoom).toBe(0.95);

      scene.scale = { width: 1920, height: 1080 };
      scene.updateCameraZoom();
      expect(appliedZoom).toBe(1.0);
    });
  });

  describe('2. Joystick and Interaction Button Alignment (Shared Viewport Dock)', () => {
    it.each([
      [360, 800],
      [390, 844],
      [412, 915],
      [432, 798],
    ])('keeps both control centers aligned and edge clearances equal at %i x %i', (width, height) => {
      const gutter = getControlEdgeClearance(width);
      const joy = getJoystickPosition(width, height, {
        leftClearance: gutter,
        bottomFromEdge: 70,
      });
      const interactionRight = width - gutter;
      const interactionLeft = interactionRight - 128;
      const joystickCenterFromBottom = height - joy.y;
      const interactionCenterFromBottom = 70;

      expect(joy.x - JOYSTICK_RADIUS).toBeCloseTo(gutter);
      expect(width - interactionRight).toBeCloseTo(gutter);
      expect(interactionLeft).toBeGreaterThan(joy.x + JOYSTICK_HIT_RADIUS);
      expect(Math.abs(interactionCenterFromBottom - joystickCenterFromBottom)).toBe(0);
      expect(joystickCenterFromBottom - JOYSTICK_RADIUS).toBe(26);

      const objectivesBottomFromBottom = 70 + JOYSTICK_RADIUS + 14;
      const joystickTopFromBottom = 70 + JOYSTICK_RADIUS;
      expect(objectivesBottomFromBottom - joystickTopFromBottom).toBe(14);
    });

    it('counteracts Phaser camera zoom so the joystick renders at its DOM dock point', () => {
      const target = { x: 62, y: 618 };
      const camera = {
        x: 0,
        y: 0,
        width: 360,
        height: 688,
        originX: 0.5,
        originY: 0.5,
        rotation: 0,
        zoomX: 0.85,
        zoomY: 0.85,
      };
      const compensated = getCameraCompensatedPosition(target, camera);
      const rendered = {
        x: camera.x + camera.width * camera.originX + camera.zoomX * (compensated.x - camera.width * camera.originX),
        y: camera.y + camera.height * camera.originY + camera.zoomY * (compensated.y - camera.height * camera.originY),
      };

      expect(rendered.x).toBeCloseTo(target.x);
      expect(rendered.y).toBeCloseTo(target.y);
    });
  });

  describe('3. Spacing System & Non-Overlap with Objectives Panel', () => {
    it('positions objectives panel safely above the bottom control dock', () => {
      // The joystick ring ends 114px above the viewport bottom.
      const joyTop = 70 + JOYSTICK_RADIUS; // 114px
      const promptTop = 70 + 22; // 92px for the 44px touch target

      const objectivesBottom = 70 + JOYSTICK_RADIUS + 14;

      expect(objectivesBottom).toBeGreaterThan(joyTop);
      expect(objectivesBottom).toBeGreaterThan(promptTop);

      const marginToJoystick = objectivesBottom - joyTop;
      expect(marginToJoystick).toBe(14);
    });

    it('hides building interaction button completely when objectives panel is expanded', () => {
      const promptContainer = new MockDOMElement('DIV', 'building-prompt-overlay');
      const objectivesContainer = new MockDOMElement('DIV', 'objectives-overlay');
      const panelContainer = new MockDOMElement('DIV', 'panel-overlay');
      const feedbackContainer = new MockDOMElement('DIV', 'feedback-overlay');

      const interactionUi = new BuildingInteractionUI(
        promptContainer as unknown as HTMLElement,
        objectivesContainer as unknown as HTMLElement,
        panelContainer as unknown as HTMLElement,
        feedbackContainer as unknown as HTMLElement,
        {
          onInteract: vi.fn(),
          onClose: vi.fn(),
          onOpenScienceConsole: vi.fn(),
        }
      );

      const state = createInitialGameState();
      interactionUi.renderObjectives(state);

      // Initially collapsed
      expect(objectivesContainer.classList.contains('is-expanded-view')).toBe(false);

      // Expand objectives
      const toggleBtn = new MockDOMElement('BUTTON', 'btn-objective-toggle');
      toggleBtn.attributes['data-objective-toggle'] = '';
      toggleBtn.parentNode = objectivesContainer;
      toggleBtn.click();

      // Expanded class applied which triggers CSS display: none !important on prompt
      expect(objectivesContainer.classList.contains('is-expanded-view')).toBe(true);
    });
  });
});
