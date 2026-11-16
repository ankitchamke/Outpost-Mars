import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { OutpostHud } from '../src/ui/hud';
import type { BuildingInteractionUI } from '../src/ui/building-interactions';

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

// DOM Mock for headless testing
class MockDOMElement {
  public hidden = false;
  public innerHTML = '';
  public tabIndex = 0;
  public style: Record<string, string> = {};
  public className = '';
  public classList = {
    contains: (cls: string) => this.className.includes(cls),
    add: (cls: string) => {
      if (!this.className.includes(cls)) this.className = `${this.className} ${cls}`.trim();
    },
    remove: (cls: string) => {
      this.className = this.className.replace(cls, '').trim();
    },
    toggle: (cls: string, force?: boolean) => {
      const has = this.className.includes(cls);
      const shouldHave = force !== undefined ? force : !has;
      if (shouldHave && !has) this.className = `${this.className} ${cls}`.trim();
      if (!shouldHave && has) this.className = this.className.replace(cls, '').trim();
      return shouldHave;
    },
  };
  public parentNode: MockDOMElement | null = null;
  private listeners: Record<string, Function[]> = {};

  focus() {}

  constructor(public tagName = 'DIV', className = '') {
    this.className = className;
  }

  get textContent(): string {
    return this.innerHTML.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  addEventListener(type: string, handler: Function) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }

  removeEventListener(type: string, handler: Function) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((h) => h !== handler);
    }
  }

  dispatchEvent(event: any): boolean {
    if (!event.target) event.target = this;
    const handlers = this.listeners[event.type] || [];
    for (const h of handlers) h(event);
    if (event.bubbles && this.parentNode) {
      this.parentNode.dispatchEvent(event);
    }
    return true;
  }

  click() {
    this.dispatchEvent({
      type: 'click',
      bubbles: true,
      target: this,
      defaultPrevented: false,
      preventDefault: () => {},
      stopPropagation: () => {},
    });
  }

  pointerup(pointerType = 'touch') {
    this.dispatchEvent({
      type: 'pointerup',
      bubbles: true,
      target: this,
      pointerType,
      defaultPrevented: false,
      preventDefault: () => {},
      stopPropagation: () => {},
    });
  }

  closest(selector: string): any {
    const cleanSelector = selector.replace(/[.[\]]/g, '');
    if (this.className.includes(cleanSelector) || (selector.startsWith('[') && this.innerHTML.includes(cleanSelector))) {
      return this;
    }
    if (this.parentNode) return this.parentNode.closest(selector);
    return null;
  }

  querySelector(selector: string): any {
    const cleanSelector = selector.replace(/[.[\]]/g, '');
    if (this.innerHTML.includes(cleanSelector)) {
      const el = new MockDOMElement('DIV', cleanSelector);
      el.parentNode = this;
      return el;
    }
    return null;
  }
}

describe('Mobile UX Polish & Game Controls Verification', async () => {
  const { OutpostHud } = await import('../src/ui/hud');
  const { BuildingInteractionUI } = await import('../src/ui/building-interactions');
  const { CANONICAL_BUILDINGS, MarsScene } = await import('../src/game/scenes/MarsScene');
  const {
    JOYSTICK_RADIUS,
    JOYSTICK_HIT_RADIUS,
    JOYSTICK_MARGIN,
    getJoystickPosition,
    isPointInMovementZone,
  } = await import('../src/game/touch-controls');
  const { createInitialGameState } = await import('../src/core/state');

  describe('1. Fixed Virtual Joystick Anchor', () => {
    it('defines fixed ergonomic joystick dimensions', () => {
      expect(JOYSTICK_RADIUS).toBe(38);
      expect(JOYSTICK_HIT_RADIUS).toBe(64);
      expect(JOYSTICK_MARGIN).toBe(62);
    });

    it('calculates stationary bottom-left anchor position based on viewport size', () => {
      const pos390 = getJoystickPosition(390, 844);
      expect(pos390.x).toBe(62);
      expect(pos390.y).toBe(844 - 62);

      const pos360 = getJoystickPosition(360, 800);
      expect(pos360.x).toBe(62);
      expect(pos360.y).toBe(800 - 62);
    });

    it('identifies touch within bottom-left movement zone without moving base', () => {
      const width = 390;
      const height = 844;
      const anchor = getJoystickPosition(width, height);

      // Touch near anchor
      expect(isPointInMovementZone(anchor.x + 10, anchor.y - 10, width, height)).toBe(true);
      // Touch in upper half is NOT movement zone
      expect(isPointInMovementZone(anchor.x, 200, width, height)).toBe(false);
      // Touch on right side is NOT movement zone
      expect(isPointInMovementZone(300, anchor.y, width, height)).toBe(false);
    });

    it('anchors joystick base permanently during touch down and only updates knob vector', () => {
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

      // Initialize joystick center
      const { x, y } = getJoystickPosition(390, 844);
      scene.joystickCenter.set(x, y);
      scene.joystickBase = { setPosition: vi.fn() };
      scene.joystickThumb = {
        setPosition: vi.fn((newX: number, newY: number) => {
          scene.joystickThumb.x = newX;
          scene.joystickThumb.y = newY;
        }),
        x,
        y,
      };

      const fixedAnchorX = scene.joystickCenter.x;
      const fixedAnchorY = scene.joystickCenter.y;
      expect(fixedAnchorX).toBe(62);
      expect(fixedAnchorY).toBe(844 - 62);

      // Simulate touch down at an offset position within hit radius
      const touchDownPointer = {
        id: 1,
        x: fixedAnchorX + 20,
        y: fixedAnchorY - 15,
      };

      scene.handleJoystickPointerDown(touchDownPointer);

      // CRITICAL: Base anchor must NOT relocate to touch point!
      expect(scene.joystickCenter.x).toBe(fixedAnchorX);
      expect(scene.joystickCenter.y).toBe(fixedAnchorY);
      expect(scene.joystickPointerId).toBe(1);

      // Thumb knob reflects deflection vector
      expect(scene.joystickThumb.setPosition).toHaveBeenCalledWith(fixedAnchorX + 20, fixedAnchorY - 15);
      expect(scene.joystickVector.x).toBeGreaterThan(0);
      expect(scene.joystickVector.y).toBeLessThan(0);

      // Release immediately resets
      scene.handleJoystickPointerUp({ id: 1 });
      expect(scene.joystickPointerId).toBeNull();
      expect(scene.joystickVector.x).toBe(0);
      expect(scene.joystickVector.y).toBe(0);
      expect(scene.joystickThumb.setPosition).toHaveBeenCalledWith(fixedAnchorX, fixedAnchorY);
    });
  });

  describe('2. Clean Mobile HUD Status Strip & Drawers', () => {
    let container: MockDOMElement;
    let hud: OutpostHud;
    let state: any;

    beforeEach(() => {
      container = new MockDOMElement('DIV', 'hud-overlay');
      hud = new OutpostHud(container as any);
      state = createInitialGameState();
      state.resources.power.current = 45;
      state.resources.lifeSupport.current = 92;
      state.resources.stormShield.current = 85;
      state.crewSafety = 'nominal';
    });

    it('renders compact mobile status strip with icons and values (⚡ 45 | 🫁 92% | 🛡️ 85% | CREW ✓)', () => {
      hud.update(state);
      const html = container.innerHTML;

      expect(html).toContain('hud-mobile-strip');
      expect(html).toContain('hud-mobile-telemetry');
      expect(html).toContain('⚡ 45');
      expect(html).toContain('🫁 92%');
      expect(html).toContain('🛡️ 85%');
      expect(html).toContain('CREW ✓');
    });

    it('renders both mobile strip and desktop panels in DOM for responsive media queries', () => {
      hud.update(state);
      const html = container.innerHTML;

      expect(html).toContain('hud-mobile-strip');
      expect(html).toContain('desktop-hud-panel');
      expect(html).toContain('resource-gauges');
      expect(html).toContain('crew-safety-panel');
    });

    it('toggles telemetry drawer on mobile when telemetry pill is tapped', () => {
      hud.update(state);
      expect(container.innerHTML).not.toContain('hud-telemetry-drawer');

      // Click telemetry pill
      const telemetryPill = new MockDOMElement('BUTTON', 'hud-mobile-pill hud-mobile-telemetry');
      telemetryPill.parentNode = container;
      telemetryPill.click();

      expect(container.innerHTML).toContain('hud-telemetry-drawer');
      expect(container.innerHTML).toContain('COLONY TELEMETRY');
      expect(container.innerHTML).toContain('btn-drawer-close');

      // Click close drawer button
      const closeBtn = new MockDOMElement('BUTTON', 'btn-drawer-close');
      closeBtn.parentNode = container;
      closeBtn.click();

      expect(container.innerHTML).not.toContain('hud-telemetry-drawer');
    });

    it('toggles crew drawer on mobile when crew pill is tapped', () => {
      hud.update(state);
      expect(container.innerHTML).not.toContain('hud-crew-drawer');

      // Click crew pill
      const crewPill = new MockDOMElement('BUTTON', 'hud-mobile-pill hud-mobile-crew');
      crewPill.parentNode = container;
      crewPill.click();

      expect(container.innerHTML).toContain('hud-crew-drawer');
      expect(container.innerHTML).toContain('CREW ROSTER');
      expect(container.innerHTML).toContain('CDR');
      expect(container.innerHTML).toContain('GEO');
    });
  });

  describe('3. Compact Building Interaction Prompt', () => {
    let promptContainer: MockDOMElement;
    let panelContainer: MockDOMElement;
    let objectivesContainer: MockDOMElement;
    let feedbackContainer: MockDOMElement;
    let handlers: any;
    let ui: BuildingInteractionUI;

    beforeEach(() => {
      promptContainer = new MockDOMElement('DIV', 'building-prompt-overlay');
      panelContainer = new MockDOMElement('DIV', 'panel-overlay');
      panelContainer.hidden = true;
      objectivesContainer = new MockDOMElement('DIV', 'objectives-overlay');
      feedbackContainer = new MockDOMElement('DIV', 'feedback-overlay');
      feedbackContainer.hidden = true;
      handlers = {
        onInteract: vi.fn(),
        onClose: vi.fn(),
        onOpenScienceConsole: vi.fn(),
      };
      ui = new BuildingInteractionUI(
        promptContainer as any,
        objectivesContainer as any,
        panelContainer as any,
        feedbackContainer as any,
        handlers
      );
    });

    it('renders building icon and interaction arrow in proximity prompt', () => {
      const habitat = CANONICAL_BUILDINGS.find((b: any) => b.id === 'habitat')!;
      ui.setNearbyBuilding(habitat);
      expect(promptContainer.hidden).toBe(false);

      const html = promptContainer.innerHTML;
      expect(html).toContain('interaction-mobile-icon');
      expect(html).toContain('Habitat');
      expect(html).toContain('interaction-prompt-arrow');
      expect(html).toContain('➔');
    });

    it('tapping the mobile interaction pill triggers building inspection', () => {
      const habitat = CANONICAL_BUILDINGS.find((b: any) => b.id === 'habitat')!;
      ui.setNearbyBuilding(habitat);
      const promptEl = new MockDOMElement('DIV', 'building-interaction-prompt');
      promptEl.parentNode = promptContainer;

      promptEl.pointerup('touch');
      expect(handlers.onInteract).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. Educational Visual Content & Progressive Disclosure', () => {
    let promptContainer: MockDOMElement;
    let panelContainer: MockDOMElement;
    let objectivesContainer: MockDOMElement;
    let feedbackContainer: MockDOMElement;
    let handlers: any;
    let ui: BuildingInteractionUI;

    beforeEach(() => {
      promptContainer = new MockDOMElement('DIV', 'building-prompt-overlay');
      panelContainer = new MockDOMElement('DIV', 'panel-overlay');
      panelContainer.hidden = true;
      objectivesContainer = new MockDOMElement('DIV', 'objectives-overlay');
      feedbackContainer = new MockDOMElement('DIV', 'feedback-overlay');
      handlers = {
        onInteract: vi.fn(),
        onClose: vi.fn(),
        onOpenScienceConsole: vi.fn(),
      };
      ui = new BuildingInteractionUI(
        promptContainer as any,
        objectivesContainer as any,
        panelContainer as any,
        feedbackContainer as any,
        handlers
      );
    });

    it('renders 3 visual concept cards per building in the field guide', () => {
      const habitat = CANONICAL_BUILDINGS.find((b: any) => b.id === 'habitat')!;
      const state = createInitialGameState();
      ui.open(habitat, state);

      const html = panelContainer.innerHTML;
      expect(html).toContain('building-concept-cards');
      expect(html).toContain('concept-card');
      expect(html).toContain('Life-Sustaining Air');
      expect(html).toContain('Closed-Loop Water');
      expect(html).toContain('Composite Radiation Shield');
    });

    it('renders Planetary Benchmark comparison grid (Earth vs Mars)', () => {
      const habitat = CANONICAL_BUILDINGS.find((b: any) => b.id === 'habitat')!;
      const state = createInitialGameState();
      ui.open(habitat, state);

      const html = panelContainer.innerHTML;
      expect(html).toContain('building-comparison-section');
      expect(html).toContain('PLANETARY BENCHMARKS');
      expect(html).toContain('Surface Pressure');
      expect(html).toContain('101.3 kPa');
      expect(html).toContain('0.6 kPa');
      expect(html).toContain('Outside Temperature');
    });

    it('includes progressive disclosure for real NASA scientific records with real vs simulation badges', () => {
      const habitat = CANONICAL_BUILDINGS.find((b: any) => b.id === 'habitat')!;
      const state = createInitialGameState();
      ui.open(habitat, state);

      const html = panelContainer.innerHTML;
      expect(html).toContain('nasa-science-disclosure');
      expect(html).toContain('Real NASA Scientific Records');
      expect(html).toContain('distinction-pill real');
      expect(html).toContain('REAL NASA DATA');
      expect(html).toContain('distinction-pill sim');
      expect(html).toContain('SIMULATION');
    });

    it('renders sticky header with prominent close button that fits modal container', () => {
      const habitat = CANONICAL_BUILDINGS.find((b: any) => b.id === 'habitat')!;
      const state = createInitialGameState();
      ui.open(habitat, state);

      const html = panelContainer.innerHTML;
      expect(html).toContain('building-lesson-header');
      expect(html).toContain('building-lesson-close');
      expect(html).toContain('data-building-close');
      expect(html).toContain('building-lesson-body');
      expect(html).toContain('building-lesson-footer');
    });
  });
});
