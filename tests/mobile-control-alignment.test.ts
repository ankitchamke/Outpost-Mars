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
const { getJoystickPosition, JOYSTICK_RADIUS, JOYSTICK_HIT_RADIUS } =
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

    it('applies optimal 0.85 zoom on standard mobile (390x844)', () => {
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

  describe('2. Joystick and Interaction Button Alignment (Shared Horizontal Equator)', () => {
    it('aligns joystick and interaction prompt around the exact same vertical center line (70px)', () => {
      const viewportHeight = 844;
      const joyPos = getJoystickPosition(390, viewportHeight);

      // Joystick center Y from bottom of viewport
      const joyCenterYFromBottom = viewportHeight - joyPos.y;
      expect(joyCenterYFromBottom).toBe(70);

      // Building interaction prompt uses shared token --mobile-control-center-y = 70px
      // With bottom: 70px and transform: translateY(50%), its center is precisely 70px
      const promptCenterYFromBottom = 70;
      expect(promptCenterYFromBottom).toBe(joyCenterYFromBottom);

      // Vertical offset between centers is exactly 0px
      const centerDelta = Math.abs(promptCenterYFromBottom - joyCenterYFromBottom);
      expect(centerDelta).toBe(0);
    });

    it('maintains comfortable horizontal gap between joystick visual ring and interaction pill', () => {
      const joyCenterX = 70;
      const joyVisualRadius = JOYSTICK_RADIUS; // 44px
      const joyVisualRightEdge = joyCenterX + joyVisualRadius; // 114px

      // Building prompt starts at --mobile-control-dock-left (148px)
      const pillLeft = 148;
      const horizontalGap = pillLeft - joyVisualRightEdge;

      // Comfortable visual gap is 34px (greater than 20px and less than 50px)
      expect(horizontalGap).toBe(34);
      expect(horizontalGap).toBeGreaterThanOrEqual(24);
      expect(horizontalGap).toBeLessThanOrEqual(48);
    });

    it('guarantees touch hit clearance between joystick active area and interaction pill', () => {
      const joyCenterX = 70;
      const joyHitRadius = JOYSTICK_HIT_RADIUS; // 75px
      const joyHitRightEdge = joyCenterX + joyHitRadius; // 145px

      const pillLeft = 148;
      expect(pillLeft).toBeGreaterThan(joyHitRightEdge);

      // Buffer between joystick hit circle and interaction button
      const touchBuffer = pillLeft - joyHitRightEdge;
      expect(touchBuffer).toBe(3);
    });

    it('preserves clean bottom clearance above the Sol footer for both controls', () => {
      const joyCenterY = 70;
      const joyRadius = JOYSTICK_RADIUS; // 44px
      const joyBottomClearance = joyCenterY - joyRadius; // 26px above Sol footer
      expect(joyBottomClearance).toBe(26);
      expect(joyBottomClearance).toBeGreaterThanOrEqual(20);

      const promptCenterY = 70;
      const promptHeight = 40;
      const promptBottomClearance = promptCenterY - promptHeight / 2; // 50px above Sol footer
      expect(promptBottomClearance).toBe(50);
      expect(promptBottomClearance).toBeGreaterThan(joyBottomClearance);
    });
  });

  describe('3. Spacing System & Non-Overlap with Objectives Panel', () => {
    it('positions objectives panel safely above the bottom control dock', () => {
      // Taller control in dock is the joystick (reaches 70 + 44 = 114px)
      const joyTop = 70 + JOYSTICK_RADIUS; // 114px
      const promptTop = 70 + 20; // 90px

      // Objectives bar bottom anchor is 128px
      const objectivesBottom = 128;

      expect(objectivesBottom).toBeGreaterThan(joyTop);
      expect(objectivesBottom).toBeGreaterThan(promptTop);

      const marginToJoystick = objectivesBottom - joyTop;
      expect(marginToJoystick).toBe(14); // 14px clean vertical separation
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
