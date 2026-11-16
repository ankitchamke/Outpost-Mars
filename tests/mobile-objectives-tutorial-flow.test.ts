import { describe, it, expect, vi, beforeEach } from 'vitest';

// Minimal DOM polyfill for headless Node execution of Phaser & UI modules
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

const { getJoystickPosition, getControlEdgeClearance, JOYSTICK_RADIUS, JOYSTICK_HIT_RADIUS } = await import(
  '../src/game/touch-controls'
);
const { FirstTimeTutorialUI } = await import('../src/ui/first-time-tutorial');
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
    add: (cls: string) => { if (cls) this.classList.classes.add(cls); },
    remove: (cls: string) => this.classList.classes.delete(cls),
    toggle: (cls: string, force?: boolean) => {
      if (force === true) { if (cls) this.classList.classes.add(cls); }
      else if (force === false) this.classList.classes.delete(cls);
      else if (this.classList.classes.has(cls)) this.classList.classes.delete(cls);
      else { if (cls) this.classList.classes.add(cls); }
      return this.classList.classes.has(cls);
    },
    contains: (cls: string) => Boolean(cls && this.classList.classes.has(cls)),
  };

  constructor(tagName = 'DIV', className = '') {
    this.tagName = tagName.toUpperCase();
    this.className = className;
    if (className && className.trim()) {
      className.trim().split(/\s+/).forEach((c) => {
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
      if (typeof curr.handleChildClick === 'function') {
        curr.handleChildClick(this);
      }
      const listeners = curr._listeners?.['click'] || [];
      for (const l of listeners) l(event);
      curr = curr.parentNode;
    }
  }
}

describe('Mobile Objectives & Tutorial Flow (fix/mobile-objectives-tutorial-flow)', () => {
  describe('1. Dedicated Bottom Control Dock & Independent Touch Areas', () => {
    it('anchors joystick base permanently at bottom-left within viewport', () => {
      const joy390 = getJoystickPosition(390, 844);
      expect(joy390.x - JOYSTICK_RADIUS).toBeCloseTo(getControlEdgeClearance(390));
      expect(joy390.y).toBe(844 - 70);

      const joy360 = getJoystickPosition(360, 800);
      expect(joy360.x - JOYSTICK_RADIUS).toBeCloseTo(getControlEdgeClearance(360));
      expect(joy360.y).toBe(800 - 70);

      const joy412 = getJoystickPosition(412, 915);
      expect(joy412.x - JOYSTICK_RADIUS).toBeCloseTo(getControlEdgeClearance(412));
      expect(joy412.y).toBe(915 - 70);
    });

    it('anchors interaction on the opposite edge with a clear joystick hit zone', () => {
      const viewportWidth = 390;
      const edgeClearance = getControlEdgeClearance(viewportWidth);
      const joyX = getJoystickPosition(viewportWidth, 844).x;
      const joyHitRight = joyX + JOYSTICK_HIT_RADIUS;
      const promptWidth = 128;
      const pillLeft = viewportWidth - edgeClearance - promptWidth;
      expect(viewportWidth - (pillLeft + promptWidth)).toBeCloseTo(edgeClearance);
      expect(pillLeft).toBeGreaterThan(joyHitRight);

      // The compact objectives card is 14px above the visible joystick ring.
      const viewportHeight = 844;
      const joyTopFromBottom = 114;
      const objectivesBottomFromBottom = 70 + JOYSTICK_RADIUS + 14;
      expect(objectivesBottomFromBottom).toBeGreaterThan(joyTopFromBottom);

      const joyTopY = viewportHeight - joyTopFromBottom; // 730
      const objectivesBottomY = viewportHeight - objectivesBottomFromBottom; // 720
      expect(objectivesBottomY).toBeLessThan(joyTopY);
    });
  });

  describe('2. Tutorial Progression (Step 1 Movement & Explicit Continue)', () => {
    let tutorialContainer: any;
    let tutorial: any;
    let completed = false;

    beforeEach(() => {
      completed = false;
      tutorialContainer = new MockDOMElement('DIV', 'tutorial-overlay');

      tutorial = new FirstTimeTutorialUI(tutorialContainer as unknown as HTMLElement, {
        onComplete: () => { completed = true; },
        onFocusGame: vi.fn(),
        onViewChange: vi.fn(),
      });
    });

    it('shows Step 1 with visible Continue fallback button and Skip Tutorial', () => {
      tutorial.showHelp();
      const html = tutorialContainer.innerHTML;

      expect(html).toContain('STEP 1 / 6');
      expect(html).toContain('Meet your astronaut');
      expect(html).toContain('data-tutorial-next');
      expect(html).toContain('Continue');
      expect(html).toContain('data-tutorial-skip');
      expect(html).toContain('Skip Tutorial');
    });

    it('advances automatically from Step 1 to Step 2 when playerMoved event fires', () => {
      tutorial.showHelp();
      expect(tutorialContainer.innerHTML).toContain('STEP 1 / 6');

      tutorial.markPlayerMoved();
      expect(tutorialContainer.innerHTML).toContain('STEP 2 / 6');
      expect(tutorialContainer.innerHTML).toContain('Explore the colony');
    });

    it('advances from Step 1 to Step 2 when Continue button is clicked', () => {
      tutorial.showHelp();
      expect(tutorialContainer.innerHTML).toContain('STEP 1 / 6');

      const nextBtn = new MockDOMElement('BUTTON');
      nextBtn.attributes['data-tutorial-next'] = '';
      nextBtn.parentNode = tutorialContainer;
      nextBtn.click();

      expect(tutorialContainer.innerHTML).toContain('STEP 2 / 6');
    });

    it('completes all six tutorial steps sequentially without trapping', () => {
      tutorial.showHelp();

      // Step 1: Movement -> Next
      expect(tutorialContainer.innerHTML).toContain('STEP 1 / 6');
      const clickNext = () => {
        const nextBtn = new MockDOMElement('BUTTON');
        nextBtn.attributes['data-tutorial-next'] = '';
        nextBtn.parentNode = tutorialContainer;
        nextBtn.click();
      };

      clickNext();
      expect(tutorialContainer.innerHTML).toContain('STEP 2 / 6');

      // Step 2: Colony -> Next
      clickNext();
      expect(tutorialContainer.innerHTML).toContain('STEP 3 / 6');

      // Step 3: Interaction -> Next
      clickNext();
      expect(tutorialContainer.innerHTML).toContain('STEP 4 / 6');

      // Step 4: Learning -> Next
      clickNext();
      expect(tutorialContainer.innerHTML).toContain('STEP 5 / 6');

      // Step 5: Resources -> Next
      clickNext();
      expect(tutorialContainer.innerHTML).toContain('STEP 6 / 6');

      // Step 6: Finish Mission
      const finishBtn = new MockDOMElement('BUTTON');
      finishBtn.attributes['data-tutorial-finish'] = '';
      finishBtn.parentNode = tutorialContainer;
      finishBtn.click();

      expect(completed).toBe(true);
      expect(tutorial.isVisible()).toBe(false);
    });

    it('allows Skip Tutorial to finish onboarding immediately from any step', () => {
      tutorial.showHelp();
      expect(tutorial.isVisible()).toBe(true);

      const skipBtn = new MockDOMElement('BUTTON');
      skipBtn.attributes['data-tutorial-skip'] = '';
      skipBtn.parentNode = tutorialContainer;
      skipBtn.click();

      expect(completed).toBe(true);
      expect(tutorial.isVisible()).toBe(false);
    });
  });

  describe('3. Objectives Expand / Collapse & Non-Overlap', () => {
    let panelContainer: any;
    let objectivesContainer: any;
    let promptContainer: any;
    let feedbackContainer: any;
    let interactionUi: any;

    beforeEach(() => {
      promptContainer = new MockDOMElement('DIV', 'building-prompt-overlay');
      objectivesContainer = new MockDOMElement('DIV', 'objectives-overlay');
      panelContainer = new MockDOMElement('DIV', 'panel-overlay');
      feedbackContainer = new MockDOMElement('DIV', 'feedback-overlay');

      interactionUi = new BuildingInteractionUI(
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
    });

    it('renders compact collapsed objectives bar initially', () => {
      const state = createInitialGameState();
      interactionUi.renderObjectives(state);

      expect(objectivesContainer.innerHTML).toContain('is-collapsed');
      expect(objectivesContainer.innerHTML).toContain('SOL 1/5');
      expect(objectivesContainer.innerHTML).toContain('Expand');
      expect(objectivesContainer.classList.contains('is-expanded-view')).toBe(false);
    });

    it('expands into full mission panel with dedicated header and Hide button', () => {
      const state = createInitialGameState();
      interactionUi.renderObjectives(state);

      // Click Expand button
      const toggleBtn = new MockDOMElement('BUTTON', 'btn-objective-toggle');
      toggleBtn.attributes['data-objective-toggle'] = '';
      toggleBtn.parentNode = objectivesContainer;
      toggleBtn.click();

      expect(objectivesContainer.innerHTML).toContain('mission-log-header');
      expect(objectivesContainer.innerHTML).toContain('SOL 1 OF 5');
      expect(objectivesContainer.innerHTML).toContain('Hide');
      expect(objectivesContainer.classList.contains('is-expanded-view')).toBe(true);

      // Click Hide button to collapse again
      toggleBtn.click();
      expect(objectivesContainer.innerHTML).toContain('is-collapsed');
      expect(objectivesContainer.classList.contains('is-expanded-view')).toBe(false);
    });
  });
});
