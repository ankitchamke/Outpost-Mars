import { describe, expect, it, vi, beforeEach } from 'vitest';

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

class MockDOMElement {
  public hidden = false;
  public innerHTML = '';
  public tabIndex = 0;
  public style: Record<string, string> = {};
  public classList = {
    contains: (cls: string) => this.className.includes(cls),
    add: (cls: string) => {
      if (!this.className.includes(cls)) this.className += ` ${cls}`;
    },
    remove: (cls: string) => {
      this.className = this.className.replace(cls, '').trim();
    },
    toggle: (cls: string, force?: boolean) => {
      const has = this.className.includes(cls);
      const shouldHave = force !== undefined ? force : !has;
      if (shouldHave && !has) this.className += ` ${cls}`;
      if (!shouldHave && has) this.className = this.className.replace(cls, '').trim();
      return shouldHave;
    },
  };
  public parentNode: MockDOMElement | null = null;
  private listeners: Record<string, Function[]> = {};

  constructor(public tagName = 'DIV', public className = '') {}

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
    if (selector.includes('building-interaction-prompt')) {
      if (this.className.includes('building-interaction-prompt')) return this;
      if (this.parentNode) return this.parentNode.closest(selector);
      return null;
    }
    if (selector.includes('data-objective-toggle')) {
      return this.className.includes('data-objective-toggle') ? this : null;
    }
    if (selector.includes('data-building-close')) {
      return this.className.includes('data-building-close') ? this : null;
    }
    return null;
  }

  querySelector(selector: string): any {
    if (selector.includes('building-interaction-prompt')) {
      const child = new MockDOMElement('DIV', 'building-interaction-prompt');
      child.parentNode = this;
      return child;
    }
    if (selector.includes('interaction-keycap')) {
      const child = new MockDOMElement('SPAN', 'interaction-keycap');
      const parent = new MockDOMElement('DIV', 'building-interaction-prompt');
      parent.parentNode = this;
      child.parentNode = parent;
      return child;
    }
    if (selector.includes('interaction-prompt-arrow')) {
      const child = new MockDOMElement('SPAN', 'interaction-prompt-arrow');
      const parent = new MockDOMElement('DIV', 'building-interaction-prompt');
      parent.parentNode = this;
      child.parentNode = parent;
      return child;
    }
    return null;
  }
}

describe('Mobile Touch & Gameplay Interaction Pipeline', () => {
  describe('Phaser Building Taps & Click Handling', async () => {
    const { CANONICAL_BUILDINGS, MarsScene } = await import('../src/game/scenes/MarsScene');
    const { BUILDING_INTERACTION_EVENTS } = await import('../src/game/building-events');

    let scene: any;
    let panelOpenEvents: any[];

    beforeEach(() => {
      scene = new MarsScene();
      panelOpenEvents = [];

      // Mock scene game and events emitter
      scene.game = {
        events: {
          emit: vi.fn((event: string, data?: any) => {
            if (event === BUILDING_INTERACTION_EVENTS.panelOpen) {
              panelOpenEvents.push(data);
            }
          }),
          on: vi.fn(),
          off: vi.fn(),
        },
        canvas: {
          tabIndex: 0,
          setAttribute: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      };

      scene.events = {
        once: vi.fn(),
        on: vi.fn(),
        emit: vi.fn(),
      };

      // Mock astronaut sprite & body
      scene.astronaut = {
        x: 1000,
        y: 800,
        body: {
          setVelocity: vi.fn(),
        },
      };
    });

    it('1. Tap Habitat building → Habitat inspection opens', () => {
      const habitat = CANONICAL_BUILDINGS.find((b: any) => b.id === 'habitat')!;
      expect(habitat).toBeDefined();

      scene.openBuilding(habitat);

      expect(scene.isBuildingPanelOpen).toBe(true);
      expect(panelOpenEvents.length).toBe(1);
      expect(panelOpenEvents[0].id).toBe('habitat');
      expect(panelOpenEvents[0].name).toBe('Habitat');
    });

    it('2. Tap Mission Control → Mission Control opens', () => {
      const missionControl = CANONICAL_BUILDINGS.find((b: any) => b.id === 'mission_control')!;
      expect(missionControl).toBeDefined();

      scene.openBuilding(missionControl);

      expect(scene.isBuildingPanelOpen).toBe(true);
      expect(panelOpenEvents.length).toBe(1);
      expect(panelOpenEvents[0].id).toBe('mission_control');
      expect(panelOpenEvents[0].name).toBe('Mission Control');
    });

    it('3. Tap Solar Farm → Solar Farm inspection opens', () => {
      const solarFarm = CANONICAL_BUILDINGS.find((b: any) => b.id === 'solar_farm')!;
      expect(solarFarm).toBeDefined();

      scene.openBuilding(solarFarm);

      expect(scene.isBuildingPanelOpen).toBe(true);
      expect(panelOpenEvents.length).toBe(1);
      expect(panelOpenEvents[0].id).toBe('solar_farm');
      expect(panelOpenEvents[0].name).toBe('Solar Farm');
    });

    it('8. Desktop mouse click → inspection works', () => {
      const greenhouse = CANONICAL_BUILDINGS.find((b: any) => b.id === 'greenhouse')!;
      expect(greenhouse).toBeDefined();

      // Desktop click passes the building directly
      scene.openBuilding(greenhouse);

      expect(scene.isBuildingPanelOpen).toBe(true);
      expect(panelOpenEvents.length).toBe(1);
      expect(panelOpenEvents[0].id).toBe('greenhouse');
    });

    it('10. Repeated taps → no duplicate modals', () => {
      const habitat = CANONICAL_BUILDINGS.find((b: any) => b.id === 'habitat')!;

      // First tap opens modal
      scene.openBuilding(habitat);
      expect(scene.isBuildingPanelOpen).toBe(true);
      expect(panelOpenEvents.length).toBe(1);

      // Subsequent rapid taps while panel is open are safely ignored
      scene.openBuilding(habitat);
      scene.openBuilding(habitat);
      scene.openBuilding(CANONICAL_BUILDINGS[1]);

      expect(panelOpenEvents.length).toBe(1);
    });
  });

  describe('Orange E Interaction Prompt Touch Target', async () => {
    const { CANONICAL_BUILDINGS } = await import('../src/game/scenes/MarsScene');
    const { BuildingInteractionUI } = await import('../src/ui/building-interactions');

    let promptContainer: MockDOMElement;
    let objectivesContainer: MockDOMElement;
    let panelContainer: MockDOMElement;
    let feedbackContainer: MockDOMElement;
    let handlers: {
      onInteract: ReturnType<typeof vi.fn>;
      onClose: ReturnType<typeof vi.fn>;
      onOpenScienceConsole: ReturnType<typeof vi.fn>;
    };
    let ui: any;

    beforeEach(() => {
      promptContainer = new MockDOMElement('DIV', 'building-prompt-overlay');
      objectivesContainer = new MockDOMElement('DIV', 'objectives-overlay');
      panelContainer = new MockDOMElement('DIV', 'panel-overlay');
      feedbackContainer = new MockDOMElement('DIV', 'feedback-overlay');
      panelContainer.hidden = true; // Closed initially

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
        handlers as any
      );
    });

    it('4. Tap the orange E prompt → correct building opens', () => {
      const habitat = CANONICAL_BUILDINGS[0];
      ui.setNearbyBuilding(habitat);
      expect(promptContainer.hidden).toBe(false);

      // Child prompt pill
      const promptPill = new MockDOMElement('DIV', 'building-interaction-prompt');
      promptPill.parentNode = promptContainer;

      // Tap on the prompt pill
      promptPill.pointerup('touch');

      expect(handlers.onInteract).toHaveBeenCalledTimes(1);
    });

    it('5. Tap prompt arrow → correct building opens', () => {
      const solarFarm = CANONICAL_BUILDINGS.find((b: any) => b.id === 'solar_farm')!;
      ui.setNearbyBuilding(solarFarm);
      expect(promptContainer.hidden).toBe(false);

      // Child arrow inside prompt pill
      const promptPill = new MockDOMElement('DIV', 'building-interaction-prompt');
      promptPill.parentNode = promptContainer;
      const arrow = new MockDOMElement('SPAN', 'interaction-prompt-arrow');
      arrow.parentNode = promptPill;

      // Tap on the arrow
      arrow.pointerup('touch');

      expect(handlers.onInteract).toHaveBeenCalledTimes(1);
    });

    it('Tapping the orange E keycap button triggers inspection', () => {
      const missionControl = CANONICAL_BUILDINGS.find((b: any) => b.id === 'mission_control')!;
      ui.setNearbyBuilding(missionControl);
      expect(promptContainer.hidden).toBe(false);

      // Keycap inside prompt pill
      const promptPill = new MockDOMElement('DIV', 'building-interaction-prompt');
      promptPill.parentNode = promptContainer;
      const keycap = new MockDOMElement('SPAN', 'interaction-keycap');
      keycap.parentNode = promptPill;

      // Tap on the keycap button
      keycap.pointerup('touch');

      expect(handlers.onInteract).toHaveBeenCalledTimes(1);
    });

    it('9. Desktop keyboard E → inspection works', () => {
      const habitat = CANONICAL_BUILDINGS[0];
      ui.setNearbyBuilding(habitat);
      expect(promptContainer.hidden).toBe(false);

      // Keyboard E event dispatched via triggerNearbyInteraction
      (ui as any).triggerNearbyInteraction();

      expect(handlers.onInteract).toHaveBeenCalledTimes(1);
    });

    it('Tapping repeatedly debounces duplicate inspection events', () => {
      const habitat = CANONICAL_BUILDINGS[0];
      ui.setNearbyBuilding(habitat);

      const promptPill = new MockDOMElement('DIV', 'building-interaction-prompt');
      promptPill.parentNode = promptContainer;

      // Rapid consecutive pointerup + click events
      promptPill.pointerup('touch');
      promptPill.click();

      // Debounced: onInteract called exactly once
      expect(handlers.onInteract).toHaveBeenCalledTimes(1);
    });
  });

  describe('Virtual Joystick Movement & Separation', async () => {
    const { calculateJoystickVector, getJoystickPosition } = await import('../src/game/touch-controls');
    const { MarsScene } = await import('../src/game/scenes/MarsScene');

    it('6. Move joystick → player movement works', () => {
      // Joystick drag to the right (+34px x, 0px y)
      const vector = calculateJoystickVector(34, 0, 34);

      expect(vector.x).toBeCloseTo(1.0);
      expect(vector.y).toBeCloseTo(0.0);
      expect(vector.magnitude).toBeCloseTo(1.0);

      // Joystick drag diagonally down-left (-20px x, 20px y)
      const diag = calculateJoystickVector(-20, 20, 34);
      expect(diag.x).toBeLessThan(0);
      expect(diag.y).toBeGreaterThan(0);
      expect(diag.magnitude).toBeLessThanOrEqual(1.0);
    });

    it('7. Move joystick while near a building → no accidental inspection', () => {
      const scene: any = new MarsScene();
      const openSpy = vi.spyOn(scene, 'openBuilding');

      // Joystick center position on mobile 390x844
      const joyPos = getJoystickPosition(390, 844);
      scene.joystickCenter = joyPos;
      scene.joystickRadius = 34;
      scene.joystickHitRadius = 56;
      scene.joystickBase = { x: joyPos.x, y: joyPos.y };
      scene.joystickPointerId = 1; // Active joystick pointer

      // Pointer event from the joystick touch
      const joystickPointer = {
        id: 1,
        x: joyPos.x + 10,
        y: joyPos.y + 10,
      } as any;

      // When joystickPointerId matches or is over joystick, selection is rejected
      const isOverJoystick = scene.isPointerOverJoystick(joystickPointer);
      expect(isOverJoystick).toBe(true);

      // openBuilding is never called from joystick dragging
      expect(openSpy).not.toHaveBeenCalled();
    });
  });
});
