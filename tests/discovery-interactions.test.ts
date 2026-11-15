import { describe, expect, it, vi, beforeEach } from 'vitest';

// Minimal DOM mock for Vitest Node environment
class MockElement {
  public hidden = false;
  public innerHTML = '';
  public tabIndex = 0;
  public children: MockElement[] = [];
  public parentNode: MockElement | null = null;
  public isConnected = true;
  private listeners: Record<string, Function[]> = {};

  constructor(public tagName = 'div', public className = '') {}

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
    });
  }

  contains(el: any): boolean {
    return el === this;
  }

  closest(selector: string): any {
    if (selector.includes('data-discovery-close')) {
      return this.innerHTML.includes('data-discovery-close') ? this : null;
    }
    return null;
  }

  querySelector(selector: string): any {
    if (selector.includes('data-discovery-close') && this.innerHTML.includes('data-discovery-close')) {
      const el = new MockElement('button');
      el.parentNode = this;
      return el;
    }
    return null;
  }

  focus() {}
  remove() {}
}

class MockDocument extends MockElement {
  public body = new MockElement('body');
  public documentElement = new MockElement('html');
  public activeElement: any = null;

  constructor() {
    super('#document');
    this.activeElement = this.body;
  }

  createElement(tag: string) {
    return new MockElement(tag);
  }
}

class MockKeyboardEvent {
  public defaultPrevented = false;
  public target: any = null;
  public key: string;
  public repeat: boolean;
  public bubbles: boolean;

  constructor(public type: string, init: any = {}) {
    this.key = init.key ?? '';
    this.repeat = Boolean(init.repeat);
    this.bubbles = Boolean(init.bubbles);
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

if (typeof globalThis.document === 'undefined') {
  (globalThis as any).HTMLElement = MockElement;
  (globalThis as any).document = new MockDocument();
  (globalThis as any).KeyboardEvent = MockKeyboardEvent;
  (globalThis as any).MouseEvent = class {
    constructor(public type: string, public init: any = {}) {
      this.bubbles = Boolean(init.bubbles);
    }
    bubbles: boolean;
  };
}

import { MARS_DISCOVERIES, type MarsDiscovery } from '../src/data/discoveries';
import { BuildingInteractionUI } from '../src/ui/building-interactions';
import { DiscoveryDialogUI } from '../src/ui/discovery-dialog';
import type { BuildingData } from '../src/game/scenes/MarsScene';

describe('Mars Environmental Discoveries Data', () => {
  it('contains 5 verified educational geological discoveries', () => {
    expect(MARS_DISCOVERIES.length).toBe(5);
  });

  it('includes required scientific fields and verified NASA attributions on every discovery', () => {
    for (const d of MARS_DISCOVERIES) {
      expect(d.id).toBeTruthy();
      expect(d.name).toBeTruthy();
      expect(d.category).toBeTruthy();
      expect(d.icon).toBeTruthy();
      expect(d.x).toBeGreaterThan(0);
      expect(d.y).toBeGreaterThan(0);
      expect(d.radius).toBeGreaterThanOrEqual(60);
      expect(d.explanation.length).toBeGreaterThan(20);
      expect(d.scientificFact.length).toBeGreaterThan(20);
      expect(d.whyScientistsStudyIt.length).toBeGreaterThan(20);
      expect(d.nasaAttribution).toMatch(/NASA/);
    }
  });

  it('covers major geological zones across the Mars surface map', () => {
    const categories = MARS_DISCOVERIES.map((d) => d.category);
    expect(categories).toContain('Impact Geology');
    expect(categories).toContain('Volcanic Geology');
    expect(categories).toContain('Aeolian Terrain');
    expect(categories).toContain('Surface Chemistry');
    expect(categories).toContain('Sedimentary Geology');
  });
});

describe('BuildingInteractionUI — Discovery Prompt & Precedence', () => {
  let promptContainer: any;
  let objectivesContainer: any;
  let panelContainer: any;
  let feedbackContainer: any;
  let onInteract: () => void;
  let onInteractDiscovery: () => void;
  let onClose: () => void;
  let onOpenScienceConsole: () => void;
  let interactionUi: BuildingInteractionUI;

  const mockBuilding: BuildingData = {
    id: 'habitat',
    name: 'Habitat',
    texture: 'building_habitat',
    x: 1000,
    y: 750,
    role: 'Life Support',
  };

  const mockDiscovery: MarsDiscovery = MARS_DISCOVERIES[0];

  beforeEach(() => {
    promptContainer = new MockElement('div');
    objectivesContainer = new MockElement('div');
    panelContainer = new MockElement('div');
    panelContainer.hidden = true;
    feedbackContainer = new MockElement('div');
    onInteract = vi.fn();
    onInteractDiscovery = vi.fn();
    onClose = vi.fn();
    onOpenScienceConsole = vi.fn();

    interactionUi = new BuildingInteractionUI(
      promptContainer as any,
      objectivesContainer as any,
      panelContainer as any,
      feedbackContainer as any,
      {
        onInteract,
        onInteractDiscovery,
        onClose,
        onOpenScienceConsole,
      }
    );
  });

  it('renders field discovery prompt with [E] DISCOVER when discovery is nearby', () => {
    interactionUi.setNearbyDiscovery(mockDiscovery);

    expect(promptContainer.hidden).toBe(false);
    expect(promptContainer.innerHTML).toContain('is-discovery-prompt');
    expect(promptContainer.innerHTML).toContain('FIELD DISCOVERY');
    expect(promptContainer.innerHTML).toContain(mockDiscovery.name);
    expect(promptContainer.innerHTML).toContain('Press <kbd>E</kbd> to discover');
  });

  it('prioritizes building prompt over discovery prompt when both are present', () => {
    interactionUi.setNearbyDiscovery(mockDiscovery);
    interactionUi.setNearbyBuilding(mockBuilding);

    expect(promptContainer.hidden).toBe(false);
    expect(promptContainer.innerHTML).toContain('STRUCTURE PROXIMITY');
    expect(promptContainer.innerHTML).toContain(mockBuilding.name);
    expect(promptContainer.innerHTML).not.toContain('is-discovery-prompt');
  });

  it('restores discovery prompt when building proximity is cleared', () => {
    interactionUi.setNearbyDiscovery(mockDiscovery);
    interactionUi.setNearbyBuilding(mockBuilding);
    expect(promptContainer.innerHTML).toContain('STRUCTURE PROXIMITY');

    interactionUi.setNearbyBuilding(null);
    expect(promptContainer.hidden).toBe(false);
    expect(promptContainer.innerHTML).toContain('is-discovery-prompt');
    expect(promptContainer.innerHTML).toContain(mockDiscovery.name);
  });

  it('clears prompt completely when both building and discovery are cleared', () => {
    interactionUi.setNearbyDiscovery(mockDiscovery);
    expect(promptContainer.hidden).toBe(false);

    interactionUi.setNearbyDiscovery(null);
    expect(promptContainer.hidden).toBe(true);
    expect(promptContainer.innerHTML).toBe('');
  });

  it('triggers onInteractDiscovery on E keydown when discovery prompt is active', () => {
    interactionUi.setNearbyDiscovery(mockDiscovery);

    const event = new MockKeyboardEvent('keydown', { key: 'e', bubbles: true });
    (globalThis.document as any).dispatchEvent(event);

    expect(onInteractDiscovery).toHaveBeenCalledTimes(1);
    expect(onInteract).not.toHaveBeenCalled();
  });

  it('triggers onInteract (building) on E keydown when building prompt is active', () => {
    interactionUi.setNearbyBuilding(mockBuilding);

    const event = new MockKeyboardEvent('keydown', { key: 'e', bubbles: true });
    (globalThis.document as any).dispatchEvent(event);

    expect(onInteract).toHaveBeenCalledTimes(1);
    expect(onInteractDiscovery).not.toHaveBeenCalled();
  });
});

describe('DiscoveryDialogUI', () => {
  let container: any;
  let onClose: () => void;
  let onDiscoveryLogged: (id: string) => void;
  let dialogUi: DiscoveryDialogUI;
  const mockDiscovery: MarsDiscovery = MARS_DISCOVERIES[1]; // volcanic boulder

  beforeEach(() => {
    container = new MockElement('div');
    container.hidden = true;

    onClose = vi.fn();
    onDiscoveryLogged = vi.fn();
    dialogUi = new DiscoveryDialogUI(container as any, {
      onClose,
      onDiscoveryLogged,
    });
  });

  it('opens and renders all 5 required educational sections', () => {
    dialogUi.open(mockDiscovery);

    expect(dialogUi.isOpen()).toBe(true);
    expect(container.hidden).toBe(false);

    // 1. Name & category
    expect(container.textContent).toContain(mockDiscovery.name);
    expect(container.textContent).toContain(mockDiscovery.category.toUpperCase());

    // 2. Kid-friendly explanation (7-12)
    expect(container.textContent).toContain(mockDiscovery.explanation);

    // 3. Scientific fact
    expect(container.textContent).toContain(mockDiscovery.scientificFact);

    // 4. Why scientists study it
    expect(container.textContent).toContain(mockDiscovery.whyScientistsStudyIt);

    // 5. NASA source attribution
    expect(container.textContent).toContain(mockDiscovery.nasaAttribution);

    // Callback fired
    expect(onDiscoveryLogged).toHaveBeenCalledWith(mockDiscovery.id);
    expect(dialogUi.getDiscoveredCount()).toBe(1);
  });

  it('closes via close button and fires onClose handler', () => {
    dialogUi.open(mockDiscovery);
    expect(dialogUi.isOpen()).toBe(true);

    container.dispatchEvent({
      type: 'click',
      target: {
        closest: (sel: string) => (sel.includes('data-discovery-close') ? {} : null),
      },
      preventDefault: () => {},
    });

    expect(dialogUi.isOpen()).toBe(false);
    expect(container.hidden).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key press', () => {
    dialogUi.open(mockDiscovery);
    expect(dialogUi.isOpen()).toBe(true);

    const escapeEvent = new MockKeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    (globalThis.document as any).dispatchEvent(escapeEvent);

    expect(dialogUi.isOpen()).toBe(false);
    expect(container.hidden).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Discovery Proximity Detection Calculation', () => {
  function getNearbyDiscoveryForTest(
    astronaut: { x: number; y: number },
    discoveries = MARS_DISCOVERIES
  ): MarsDiscovery | undefined {
    let closest: MarsDiscovery | undefined;
    let closestDistSq = Infinity;

    for (const d of discoveries) {
      const distSq = (d.x - astronaut.x) ** 2 + (d.y - astronaut.y) ** 2;
      const radiusSq = d.radius ** 2;
      if (distSq <= radiusSq && distSq < closestDistSq) {
        closest = d;
        closestDistSq = distSq;
      }
    }
    return closest;
  }

  it('detects Ancient Impact Crater when astronaut is at (300, 240)', () => {
    const nearby = getNearbyDiscoveryForTest({ x: 300, y: 240 });
    expect(nearby?.id).toBe('crater_basin');
  });

  it('detects Ancient Impact Crater within its interaction radius (95px)', () => {
    const nearby = getNearbyDiscoveryForTest({ x: 350, y: 240 }); // distance 50 <= 95
    expect(nearby?.id).toBe('crater_basin');
  });

  it('does NOT detect Ancient Impact Crater outside its interaction radius', () => {
    const nearby = getNearbyDiscoveryForTest({ x: 450, y: 240 }); // distance 150 > 95
    expect(nearby).toBeUndefined();
  });

  it('detects Weathered Basalt Boulder at (260, 520)', () => {
    const nearby = getNearbyDiscoveryForTest({ x: 260, y: 520 });
    expect(nearby?.id).toBe('volcanic_boulder');
  });

  it('detects Aeolian Sand Dunes at (920, 1430)', () => {
    const nearby = getNearbyDiscoveryForTest({ x: 920, y: 1430 });
    expect(nearby?.id).toBe('dune_ripples');
  });

  it('detects Martian Regolith & Soil at (1000, 1140)', () => {
    const nearby = getNearbyDiscoveryForTest({ x: 1000, y: 1140 });
    expect(nearby?.id).toBe('regolith_patch');
  });

  it('detects Sedimentary Bedrock Slab at (1720, 720)', () => {
    const nearby = getNearbyDiscoveryForTest({ x: 1720, y: 720 });
    expect(nearby?.id).toBe('bedrock_slab');
  });
});
