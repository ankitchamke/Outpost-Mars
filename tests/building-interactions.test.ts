import { describe, expect, it, vi, beforeEach } from 'vitest';

// Minimal DOM mock for Vitest Node environment
class MockElement {
  public hidden = false;
  public innerHTML = '';
  public tabIndex = 0;
  public children: MockElement[] = [];
  public parentNode: MockElement | null = null;
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
    if (selector.includes('data-building-interact')) {
      return this.innerHTML.includes('data-building-interact') ? this : null;
    }
    return null;
  }

  querySelector(_selector: string): any {
    const el = new MockElement('div');
    el.parentNode = this;
    return el;
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

import {
  calculateDistanceToAABB,
  resolveNearbyBuilding,
  applyBuildingHitArea,
  INTERACTION_MAX_DISTANCE,
} from '../src/game/building-hit-areas';
import {
  BuildingInteractionUI,
  BUILDING_LESSONS,
  type BuildingInteractionHandlers,
} from '../src/ui/building-interactions';
import {
  completeBuildingMissionTask,
  FIVE_SOL_OBJECTIVES,
} from '../src/core/mission';
import { createInitialGameState } from '../src/core/state';
import type { BuildingData } from '../src/game/scenes/MarsScene';

describe('Strict Proximity-Based Building Access & Interaction Correction', () => {
  const CANONICAL_BUILDINGS: BuildingData[] = [
    { id: 'habitat', name: 'Habitat', role: 'Living Quarters', texture: 'hab', x: 1000, y: 750 },
    { id: 'mission_control', name: 'Mission Control', role: 'Telemetry', texture: 'mc', x: 620, y: 500 },
    { id: 'solar_farm', name: 'Solar Farm', role: 'Power', texture: 'solar', x: 1450, y: 520 },
    { id: 'greenhouse', name: 'Greenhouse', role: 'Food', texture: 'gh', x: 550, y: 1000 },
    { id: 'storm_shelter', name: 'Storm Shelter', role: 'Shielding', texture: 'shelter', x: 1420, y: 1000 },
  ];

  const MOCK_BOUNDS = {
    habitat: { left: 820, right: 1180, top: 630, bottom: 870 },
    mission_control: { left: 450, right: 790, top: 385, bottom: 615 },
    solar_farm: { left: 1280, right: 1620, top: 425, bottom: 615 },
    greenhouse: { left: 380, right: 720, top: 885, bottom: 1115 },
    storm_shelter: { left: 1250, right: 1590, top: 885, bottom: 1115 },
  };

  const buildingList = CANONICAL_BUILDINGS.map((b) => ({
    building: b,
    bounds: MOCK_BOUNDS[b.id as keyof typeof MOCK_BOUNDS],
  }));

  describe('1. Proximity Distance Calculations & Distance Thresholds', () => {
    it('returns distance 0 when astronaut is inside the building bounds', () => {
      const dist = calculateDistanceToAABB(
        { x: 1000, y: 750 }, // Inside Habitat
        MOCK_BOUNDS.habitat
      );
      expect(dist).toBe(0);
    });

    it('returns exact Euclidean distance when astronaut is outside building bounds', () => {
      // 50px directly to the right of Habitat right edge (1180 + 50 = 1230, y = 750)
      const distEast = calculateDistanceToAABB(
        { x: 1230, y: 750 },
        MOCK_BOUNDS.habitat
      );
      expect(distEast).toBe(50);

      // Diagonal distance: dx = 30, dy = 40 -> hypot = 50
      const distDiagonal = calculateDistanceToAABB(
        { x: 1210, y: 910 }, // right=1180 (+30), bottom=870 (+40)
        MOCK_BOUNDS.habitat
      );
      expect(distDiagonal).toBe(50);
    });

    it('identifies building within maxDistance (<= 80px)', () => {
      // 70px to the left of Mission Control left edge (450 - 70 = 380, y = 500)
      const nearby = resolveNearbyBuilding(
        buildingList,
        { x: 380, y: 500 },
        INTERACTION_MAX_DISTANCE
      );
      expect(nearby).toBeDefined();
      expect(nearby?.id).toBe('mission_control');
    });

    it('returns undefined when astronaut is outside maxDistance (> 80px)', () => {
      // 95px to the left of Mission Control left edge (450 - 95 = 355, y = 500)
      const nearby = resolveNearbyBuilding(
        buildingList,
        { x: 355, y: 500 },
        INTERACTION_MAX_DISTANCE
      );
      expect(nearby).toBeUndefined();
    });

    it('clears nearby building when moving out of range', () => {
      // Step 1: Astronaut at 60px distance (inside range)
      const pos1 = { x: 450 - 60, y: 500 };
      expect(resolveNearbyBuilding(buildingList, pos1, 80)?.id).toBe('mission_control');

      // Step 2: Astronaut moves to 90px distance (outside range)
      const pos2 = { x: 450 - 90, y: 500 };
      expect(resolveNearbyBuilding(buildingList, pos2, 80)).toBeUndefined();
    });
  });

  describe('2. Overlapping Radii & Deterministic Resolution', () => {
    it('resolves two buildings with overlapping radii to the single strictly closer target', () => {
      // Create two test buildings whose 80px interaction zones overlap
      const buildingA = { id: 'building_alpha', name: 'Alpha', role: '', texture: '', x: 500, y: 500 };
      const buildingB = { id: 'building_beta', name: 'Beta', role: '', texture: '', x: 600, y: 500 };

      const overlappingBuildings = [
        { building: buildingA, bounds: { left: 450, right: 550, top: 450, bottom: 550 } },
        { building: buildingB, bounds: { left: 580, right: 680, top: 450, bottom: 550 } },
      ];

      // Point at x=560, y=500:
      // Distance to Alpha right edge (550) = 10px
      // Distance to Beta left edge (580) = 20px
      // Both are within 80px!
      const resolved = resolveNearbyBuilding(
        overlappingBuildings,
        { x: 560, y: 500 },
        80
      );
      expect(resolved?.id).toBe('building_alpha');
    });

    it('resolves equal-distance ties deterministically via alphabetical tie-breaker', () => {
      const buildingA = { id: 'building_b_station', name: 'B Station', role: '', texture: '', x: 400, y: 500 };
      const buildingB = { id: 'building_a_station', name: 'A Station', role: '', texture: '', x: 600, y: 500 };

      // Exact midpoint at x=500: distance to both is 50px
      const tiedBuildings = [
        { building: buildingA, bounds: { left: 350, right: 450, top: 450, bottom: 550 } },
        { building: buildingB, bounds: { left: 550, right: 650, top: 450, bottom: 550 } },
      ];

      const resolved = resolveNearbyBuilding(
        tiedBuildings,
        { x: 500, y: 500 },
        80
      );
      // Alphabetical order: building_a_station < building_b_station
      expect(resolved?.id).toBe('building_a_station');
    });
  });

  describe('3. Pointer & Click Disabling (Zero Remote or Click-to-Open)', () => {
    it('configures building hit areas with useHandCursor: false to prevent clickability illusion', () => {
      const mockSprite: any = {
        width: 340,
        height: 220,
        setInteractive: vi.fn(),
      };

      applyBuildingHitArea(mockSprite, 'habitat');

      expect(mockSprite.setInteractive).toHaveBeenCalledTimes(1);
      const callArg = mockSprite.setInteractive.mock.calls[0][0];
      expect(callArg.useHandCursor).toBe(false);
    });
  });

  describe('4. Keyboard "E" Proximity Enforcement via BuildingInteractionUI', () => {
    let promptContainer: any;
    let objectivesContainer: any;
    let panelContainer: any;
    let feedbackContainer: any;
    let handlers: BuildingInteractionHandlers;
    let ui: BuildingInteractionUI;

    beforeEach(() => {
      promptContainer = document.createElement('div');
      promptContainer.hidden = true;
      objectivesContainer = document.createElement('div');
      panelContainer = document.createElement('div');
      panelContainer.hidden = true;
      feedbackContainer = document.createElement('div');
      feedbackContainer.hidden = true;

      handlers = {
        onInteract: vi.fn(),
        onClose: vi.fn(),
        onOpenScienceConsole: vi.fn(),
      };

      ui = new BuildingInteractionUI(
        promptContainer,
        objectivesContainer,
        panelContainer,
        feedbackContainer,
        handlers
      );
    });

    it('pressing E outside interaction range (prompt hidden) does NOTHING', () => {
      expect(promptContainer.hidden).toBe(true);

      const event = new KeyboardEvent('keydown', { key: 'e', bubbles: true });
      document.dispatchEvent(event);

      expect(handlers.onInteract).not.toHaveBeenCalled();
    });

    it('pressing E when within interaction range (prompt visible) calls onInteract', () => {
      ui.setNearbyBuilding(CANONICAL_BUILDINGS[0]);
      expect(promptContainer.hidden).toBe(false);
      expect(promptContainer.textContent).toContain('Habitat');
      expect(promptContainer.textContent).toContain('Press E to inspect');

      const event = new KeyboardEvent('keydown', { key: 'e', bubbles: true });
      document.dispatchEvent(event);

      expect(handlers.onInteract).toHaveBeenCalledTimes(1);
    });

    it('moving out of range hides and clears the interaction prompt', () => {
      // 1. Enter range
      ui.setNearbyBuilding(CANONICAL_BUILDINGS[0]);
      expect(promptContainer.hidden).toBe(false);

      // 2. Move out of range
      ui.setNearbyBuilding(null);
      expect(promptContainer.hidden).toBe(true);
      expect(promptContainer.innerHTML).toBe('');

      // 3. Pressing E after moving out does nothing
      const event = new KeyboardEvent('keydown', { key: 'e', bubbles: true });
      document.dispatchEvent(event);
      expect(handlers.onInteract).not.toHaveBeenCalled();
    });

    it('clicking the prompt banner does NOT open the building (no click-to-open fallback)', () => {
      ui.setNearbyBuilding(CANONICAL_BUILDINGS[0]);
      expect(promptContainer.hidden).toBe(false);

      // Click directly on prompt container
      promptContainer.click();
      expect(handlers.onInteract).not.toHaveBeenCalled();
    });

    it('pressing E while holding key down (event.repeat = true) is ignored to prevent duplicate interactions', () => {
      ui.setNearbyBuilding(CANONICAL_BUILDINGS[0]);

      const repeatEvent = new KeyboardEvent('keydown', {
        key: 'e',
        repeat: true,
        bubbles: true,
      });
      document.dispatchEvent(repeatEvent);

      expect(handlers.onInteract).not.toHaveBeenCalled();
    });

    it('pressing E while panel is already open does not trigger duplicate onInteract', () => {
      ui.setNearbyBuilding(CANONICAL_BUILDINGS[0]);
      panelContainer.hidden = false; // Panel is open

      const event = new KeyboardEvent('keydown', { key: 'e', bubbles: true });
      document.dispatchEvent(event);

      expect(handlers.onInteract).not.toHaveBeenCalled();
    });
  });

  describe('5. Existing Building Functionality & Mission Progress Integrity', () => {
    it('preserves all five canonical building lessons and mission tasks', () => {
      const state = createInitialGameState();
      state.sol = 1;
      state.missionObjectivesCompleted = [];
      state.missionComplete = false;

      for (const building of CANONICAL_BUILDINGS) {
        const lesson = BUILDING_LESSONS.find((l) => l.id === building.id);
        expect(lesson, `Lesson for ${building.id} must exist`).toBeDefined();
      }

      // Sol 1 Habitat interaction advances mission
      const outcome = completeBuildingMissionTask(state, 'habitat');
      expect(outcome.completedObjective?.id).toBe('sol-1-habitat');
      expect(outcome.state.sol).toBe(2);
    });

    it('preserves Sol 4 Storm Shelter and Sol 5 Mission Control objectives', () => {
      const sol4Obj = FIVE_SOL_OBJECTIVES.find((o) => o.sol === 4);
      expect(sol4Obj?.buildingId).toBe('storm_shelter');

      const sol5Obj = FIVE_SOL_OBJECTIVES.find((o) => o.sol === 5);
      expect(sol5Obj?.buildingId).toBe('mission_control');
    });
  });
});
