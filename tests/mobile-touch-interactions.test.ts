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

describe('Mobile Proximity-Based Gameplay & Movement Pipeline', async () => {
  const { CANONICAL_BUILDINGS, MarsScene } = await import('../src/game/scenes/MarsScene');
  const { BUILDING_INTERACTION_EVENTS } = await import('../src/game/building-events');
  const { BuildingInteractionUI } = await import('../src/ui/building-interactions');
  const { getJoystickPosition, isPointInMovementZone } = await import(
    '../src/game/touch-controls'
  );

  let scene: any;
  let panelOpenEvents: any[];
  let distantClickEvents: any[];
  let nearbyEvents: any[];

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
    scene = new MarsScene();
    panelOpenEvents = [];
    distantClickEvents = [];
    nearbyEvents = [];

    // Mock scene game and events emitter
    scene.game = {
      events: {
        emit: vi.fn((event: string, data?: any) => {
          if (event === BUILDING_INTERACTION_EVENTS.panelOpen) {
            panelOpenEvents.push(data);
          } else if (event === BUILDING_INTERACTION_EVENTS.distantClick) {
            distantClickEvents.push(data);
          } else if (event === BUILDING_INTERACTION_EVENTS.nearby) {
            nearbyEvents.push(data);
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
        focus: vi.fn(),
      },
    };

    scene.events = {
      once: vi.fn(),
      on: vi.fn(),
      emit: vi.fn(),
    };

    scene.time = { now: 1000 };
    scene.scale = { width: 390, height: 844 };

    // Mock astronaut sprite & Arcade Physics body
    scene.astronaut = {
      x: 1000,
      y: 800,
      body: {
        setVelocity: vi.fn(),
      },
    };

    // Populate scene buildings with realistic bounds matching canonical coordinates
    scene.buildings = new Map();
    for (const b of CANONICAL_BUILDINGS) {
      scene.buildings.set(b.id, {
        x: b.x,
        y: b.y,
        displayWidth: 200,
        displayHeight: 150,
        getBounds: () => ({
          left: b.x - 100,
          right: b.x + 100,
          top: b.y - 75,
          bottom: b.y + 75,
        }),
      });
    }

    // Set up DOM interaction UI
    promptContainer = new MockDOMElement('DIV', 'building-prompt-overlay');
    objectivesContainer = new MockDOMElement('DIV', 'objectives-overlay');
    panelContainer = new MockDOMElement('DIV', 'panel-overlay');
    feedbackContainer = new MockDOMElement('DIV', 'feedback-overlay');
    panelContainer.hidden = true;

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

  it('1. Click distant Habitat with desktop mouse → no panel', () => {
    const habitat = CANONICAL_BUILDINGS.find((b: any) => b.id === 'habitat')!;
    // Place astronaut far away from Habitat (e.g. at (100, 100))
    scene.astronaut.x = 100;
    scene.astronaut.y = 100;

    const opened = scene.openBuilding(habitat);

    expect(opened).toBe(false);
    expect(scene.isBuildingPanelOpen).toBe(false);
    expect(panelOpenEvents.length).toBe(0);
    expect(distantClickEvents.length).toBe(1);
    expect(distantClickEvents[0].id).toBe('habitat');
  });

  it('2. Tap distant Habitat on mobile → no panel', () => {
    const habitat = CANONICAL_BUILDINGS.find((b: any) => b.id === 'habitat')!;
    // Place astronaut far away at Mission Control coordinates (620, 500)
    scene.astronaut.x = 620;
    scene.astronaut.y = 500;

    // Mobile tap handler calls openBuilding
    const opened = scene.openBuilding(habitat);

    expect(opened).toBe(false);
    expect(scene.isBuildingPanelOpen).toBe(false);
    expect(panelOpenEvents.length).toBe(0);
    expect(distantClickEvents.length).toBe(1);
    expect(distantClickEvents[0].id).toBe('habitat');
  });

  it('3. Move astronaut towards Habitat → position changes', () => {
    // Astronaut moving towards Habitat via joystick
    scene.joystickVector.set(0, 1);
    scene.astronaut.x = 1000;
    scene.astronaut.y = 650;

    scene.update();

    // Body velocity is driven towards Habitat at ASTRONAUT_MOVE_SPEED (190 px/s)
    expect(scene.astronaut.body.setVelocity).toHaveBeenCalledWith(0, 190);
    expect(scene.isFollowingAstronaut).toBe(true);
  });

  it('4. Enter Habitat radius → prompt appears', () => {
    // Place astronaut directly at Habitat entrance (1000, 800)
    scene.astronaut.x = 1000;
    scene.astronaut.y = 800;

    const nearby = scene.getNearbyBuilding();
    expect(nearby).toBeDefined();
    expect(nearby.id).toBe('habitat');

    scene.refreshNearbyBuilding();
    expect(scene.nearbyBuilding).toBeDefined();
    expect(scene.nearbyBuilding.id).toBe('habitat');

    // Notify UI that Habitat is in proximity
    ui.setNearbyBuilding(nearby);
    expect(promptContainer.hidden).toBe(false);
    expect(promptContainer.innerHTML).toContain('Habitat');
  });

  it('5. Tap prompt → Habitat panel opens', () => {
    const habitat = CANONICAL_BUILDINGS.find((b: any) => b.id === 'habitat')!;
    scene.astronaut.x = 1000;
    scene.astronaut.y = 800;
    ui.setNearbyBuilding(habitat);
    expect(promptContainer.hidden).toBe(false);

    // Tap on the prompt pill
    const promptPill = new MockDOMElement('DIV', 'building-interaction-prompt');
    promptPill.parentNode = promptContainer;
    promptPill.pointerup('touch');

    expect(handlers.onInteract).toHaveBeenCalledTimes(1);

    // When interact event is handled by scene
    scene.openNearbyBuildingPanel();

    expect(scene.isBuildingPanelOpen).toBe(true);
    expect(panelOpenEvents.length).toBe(1);
    expect(panelOpenEvents[0].id).toBe('habitat');
  });

  it('6. Press E nearby on desktop → Habitat panel opens', () => {
    const habitat = CANONICAL_BUILDINGS.find((b: any) => b.id === 'habitat')!;
    scene.astronaut.x = 1000;
    scene.astronaut.y = 800;
    scene.nearbyBuilding = habitat;

    // Desktop E interaction triggers openNearbyBuildingPanel
    scene.openNearbyBuildingPanel();

    expect(scene.isBuildingPanelOpen).toBe(true);
    expect(panelOpenEvents.length).toBe(1);
    expect(panelOpenEvents[0].id).toBe('habitat');
  });

  it('7. Leave Habitat radius → prompt disappears', () => {
    const habitat = CANONICAL_BUILDINGS.find((b: any) => b.id === 'habitat')!;
    scene.astronaut.x = 1000;
    scene.astronaut.y = 800;
    scene.refreshNearbyBuilding();
    ui.setNearbyBuilding(habitat);
    expect(promptContainer.hidden).toBe(false);

    // Astronaut walks away from Habitat
    scene.astronaut.x = 1000;
    scene.astronaut.y = 1200;

    const nearby = scene.getNearbyBuilding();
    expect(nearby).toBeUndefined();

    scene.refreshNearbyBuilding();
    expect(scene.nearbyBuilding).toBeUndefined();

    ui.setNearbyBuilding(null);
    expect(promptContainer.hidden).toBe(true);
  });

  it('8. Approach Solar Farm → correct prompt appears', () => {
    // Place astronaut near Solar Farm (x: 1450, y: 550)
    scene.astronaut.x = 1450;
    scene.astronaut.y = 550;

    const nearby = scene.getNearbyBuilding();
    expect(nearby).toBeDefined();
    expect(nearby.id).toBe('solar_farm');

    ui.setNearbyBuilding(nearby);
    expect(promptContainer.hidden).toBe(false);
    expect(promptContainer.innerHTML).toContain('Solar Farm');
  });

  it('9. Approach Mission Control → correct prompt appears', () => {
    // Place astronaut near Mission Control (x: 620, y: 530)
    scene.astronaut.x = 620;
    scene.astronaut.y = 530;

    const nearby = scene.getNearbyBuilding();
    expect(nearby).toBeDefined();
    expect(nearby.id).toBe('mission_control');

    ui.setNearbyBuilding(nearby);
    expect(promptContainer.hidden).toBe(false);
    expect(promptContainer.innerHTML).toContain('Mission Control');
  });

  it('10. Joystick movement does not accidentally trigger inspection', () => {
    const openSpy = vi.spyOn(scene, 'openBuilding');

    const joyPos = getJoystickPosition(390, 844);
    scene.joystickCenter = { x: joyPos.x, y: joyPos.y, set: vi.fn() };
    scene.joystickRadius = 34;
    scene.joystickHitRadius = 56;
    scene.joystickBase = { x: joyPos.x, y: joyPos.y, setPosition: vi.fn() };
    scene.joystickPointerId = 1; // Active drag pointer

    // Pointer dragging inside the movement zone
    const pointerInZone = { id: 1, x: 70, y: 780 } as any;

    expect(isPointInMovementZone(pointerInZone.x, pointerInZone.y, 390, 844)).toBe(true);

    // Building tap handler rejects touches matching joystickPointerId or within movement zone
    const shouldIgnore =
      scene.joystickPointerId === pointerInZone.id ||
      scene.isPointerOverJoystick(pointerInZone) ||
      isPointInMovementZone(pointerInZone.x, pointerInZone.y, 390, 844);

    expect(shouldIgnore).toBe(true);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('11. Simultaneous joystick and prompt interactions work', () => {
    const habitat = CANONICAL_BUILDINGS.find((b: any) => b.id === 'habitat')!;
    scene.astronaut.x = 1000;
    scene.astronaut.y = 800;
    ui.setNearbyBuilding(habitat);

    // Left thumb (pointerId = 1) is actively moving the joystick
    scene.joystickPointerId = 1;
    scene.joystickVector.set(0.5, 0.5);

    // Right thumb (pointerId = 2) taps the prompt
    const promptPill = new MockDOMElement('DIV', 'building-interaction-prompt');
    promptPill.parentNode = promptContainer;
    promptPill.pointerup('touch');

    expect(handlers.onInteract).toHaveBeenCalledTimes(1);

    // Right thumb releasing does NOT reset left thumb joystick
    const rightThumbReleaseEvent = { pointerId: 2, type: 'pointerup' } as PointerEvent;
    scene.handleWindowPointerUp(rightThumbReleaseEvent);

    expect(scene.joystickPointerId).toBe(1); // Joystick remains active during tap
    expect(scene.joystickVector.x).toBe(0.5);

    // Opening panel completes inspection and resets joystick cleanly
    scene.openNearbyBuildingPanel();
    expect(scene.isBuildingPanelOpen).toBe(true);
    expect(scene.joystickPointerId).toBeNull();
    expect(scene.joystickVector.x).toBe(0);
  });

  it('12. Existing desktop keyboard movement remains functional', () => {
    scene.cursorKeys = {
      left: { isDown: false },
      right: { isDown: true }, // Pressing Right arrow
      up: { isDown: false },
      down: { isDown: false },
    };
    scene.wasdKeys = {
      left: { isDown: false },
      right: { isDown: false },
      up: { isDown: false },
      down: { isDown: false },
    };

    scene.update();

    expect(scene.astronaut.body.setVelocity).toHaveBeenCalledWith(190, 0);
  });
});
