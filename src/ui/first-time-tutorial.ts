import type { BuildingData } from '../game/scenes/MarsScene';

export type TutorialStep =
  | 'hidden'
  | 'welcome'
  | 'movement'
  | 'colony'
  | 'interaction'
  | 'learning'
  | 'resources'
  | 'mission';

const GUIDED_STEPS: TutorialStep[] = [
  'movement',
  'colony',
  'interaction',
  'learning',
  'resources',
  'mission',
];

interface TutorialHandlers {
  onComplete: () => void;
  onFocusGame: () => void;
  onViewChange: () => void;
}

export class FirstTimeTutorialUI {
  private step: TutorialStep = 'hidden';
  private movementComplete = false;
  private nearestBuilding: BuildingData | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly handlers: TutorialHandlers
  ) {
    this.container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-tutorial-start]')) {
        event.preventDefault();
        this.start();
      } else if (target.closest('[data-tutorial-skip]')) {
        event.preventDefault();
        this.finish();
      } else if (target.closest('[data-tutorial-next]')) {
        event.preventDefault();
        this.advance();
      } else if (target.closest('[data-tutorial-finish]')) {
        event.preventDefault();
        this.finish();
      }
    });
  }

  public showWelcome(): void {
    this.step = 'welcome';
    this.movementComplete = false;
    this.render();
    this.container.querySelector<HTMLButtonElement>('[data-tutorial-start]')?.focus({ preventScroll: true });
  }

  public showHelp(): void {
    this.movementComplete = false;
    this.step = 'movement';
    this.render();
    this.handlers.onFocusGame();
  }

  public hideWithoutCompleting(): void {
    this.step = 'hidden';
    this.container.hidden = true;
    this.container.innerHTML = '';
    this.handlers.onViewChange();
  }

  public markPlayerMoved(): void {
    if (this.step !== 'movement' || this.movementComplete) return;
    this.movementComplete = true;
    this.render();
  }

  public setNearbyBuilding(building: BuildingData | null): void {
    if (this.nearestBuilding?.id === building?.id) return;
    this.nearestBuilding = building;
    if (this.step === 'colony' || this.step === 'interaction') this.render();
    else this.handlers.onViewChange();
  }

  public markBuildingInteracted(): void {
    if (this.step !== 'interaction') return;
    this.step = 'learning';
    this.render();
  }

  public shouldHighlightNearestBuilding(): boolean {
    return (this.step === 'colony' || this.step === 'interaction') && !!this.nearestBuilding;
  }

  public getNearestBuildingId(): string | null {
    return this.nearestBuilding?.id ?? null;
  }

  public shouldHighlightResources(): boolean {
    return this.step === 'resources';
  }

  public isVisible(): boolean {
    return this.step !== 'hidden';
  }

  private start(): void {
    this.step = 'movement';
    this.movementComplete = false;
    this.render();
    this.handlers.onFocusGame();
  }

  private advance(): void {
    if (this.step === 'movement' && !this.movementComplete) return;

    const currentIndex = GUIDED_STEPS.indexOf(this.step);
    if (currentIndex < 0 || currentIndex >= GUIDED_STEPS.length - 1) return;
    this.step = GUIDED_STEPS[currentIndex + 1];
    this.render();
    this.handlers.onFocusGame();
  }

  private finish(): void {
    this.step = 'hidden';
    this.container.hidden = true;
    this.container.innerHTML = '';
    this.handlers.onViewChange();
    this.handlers.onComplete();
    this.handlers.onFocusGame();
  }

  private render(): void {
    this.container.hidden = false;
    this.container.className = `tutorial-overlay${this.step === 'welcome' ? ' is-welcome' : ''}${this.step === 'learning' ? ' is-learning' : ''}`;

    if (this.step === 'welcome') {
      this.container.innerHTML = `
        <section class="tutorial-card tutorial-welcome-card" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
          <span class="tutorial-kicker">FIRST-TIME FLIGHT BRIEFING</span>
          <h1 id="tutorial-title">OUTPOST: MARS</h1>
          <p>Your mission: Build knowledge, explore Mars and keep your crew safe.</p>
          <div class="tutorial-actions">
            <button class="tutorial-primary" type="button" data-tutorial-start>Start Mission</button>
            <button class="tutorial-secondary" type="button" data-tutorial-skip>Skip Tutorial</button>
          </div>
          <span class="tutorial-footnote">A quick, hands-on guide · about 2 minutes</span>
        </section>
      `;
      this.handlers.onViewChange();
      return;
    }

    if (this.step === 'hidden') {
      this.container.hidden = true;
      this.container.innerHTML = '';
      this.handlers.onViewChange();
      return;
    }

    const stepNumber = GUIDED_STEPS.indexOf(this.step) + 1;
    const stepContent = this.getStepContent();
    this.container.innerHTML = `
      <section class="tutorial-card tutorial-step-card" role="status" aria-live="polite" aria-labelledby="tutorial-step-title">
        <div class="tutorial-step-header"><span class="tutorial-kicker">EXPLORER BRIEFING</span><strong>STEP ${stepNumber} / 6</strong></div>
        <h2 id="tutorial-step-title">${stepContent.title}</h2>
        ${stepContent.content}
        <div class="tutorial-actions">
          ${stepContent.action}
          <button class="tutorial-secondary" type="button" data-tutorial-skip>Skip Tutorial</button>
        </div>
      </section>
    `;
    this.handlers.onViewChange();
  }

  private getStepContent(): { title: string; content: string; action: string } {
    switch (this.step) {
      case 'movement':
        return {
          title: this.movementComplete ? 'Nice work, Commander!' : 'Meet your astronaut',
          content: `
            <p>${this.movementComplete ? 'You moved your astronaut. Now explore the colony.' : 'Walk a short distance to try the controls.'}</p>
            <div class="tutorial-controls"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><i>or</i><span><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span><em>Mobile: use the joystick</em></div>
          `,
          action: this.movementComplete ? '<button class="tutorial-primary" type="button" data-tutorial-next>Continue</button>' : '<span class="tutorial-waiting">Move to continue</span>',
        };
      case 'colony':
        return {
          title: 'Explore the colony',
          content: `
            <p>Five buildings have different jobs. Walk around and the nearest building will glow.</p>
            ${this.nearestBuilding ? `<div class="tutorial-nearest">NEAREST BUILDING <strong>${this.nearestBuilding.name}</strong></div>` : '<span class="tutorial-waiting">Move near a building to see it glow</span>'}
          `,
          action: '<button class="tutorial-primary" type="button" data-tutorial-next>Continue</button>',
        };
      case 'interaction':
        return {
          title: 'Visit a building',
          content: `<p>${this.nearestBuilding ? `You’re near ${this.nearestBuilding.name}. Open its field guide.` : 'Approach a building entrance to open its field guide.'}</p><p class="tutorial-hint">Desktop: press <kbd>E</kbd>. Mobile: tap the highlighted building button.</p>`,
          action: '<span class="tutorial-waiting">Interact with the highlighted building</span>',
        };
      case 'learning':
        return {
          title: 'Learn about Mars',
          content: '<p>Building guides explain Mars science. NASA facts are labeled; other lessons are general science.</p><p class="tutorial-hint">Read one idea in the open field guide, then continue.</p>',
          action: '<button class="tutorial-primary" type="button" data-tutorial-next>Next: resources</button>',
        };
      case 'resources':
        return {
          title: 'Watch your colony resources',
          content: '<ul class="tutorial-resource-list"><li><strong>Power</strong> runs equipment.</li><li><strong>Life Support</strong> supports air and water.</li><li><strong>Storm Shielding</strong> tracks shelter readiness.</li></ul><p class="tutorial-hint">Crew Safety is the overall outcome—not a resource to spend.</p>',
          action: '<button class="tutorial-primary" type="button" data-tutorial-next>Next: mission</button>',
        };
      case 'mission':
        return {
          title: 'Your five-Sol challenge',
          content: '<p>Each Sol has one building task. Explore, learn, and keep the crew safe through Sol 5.</p>',
          action: '<button class="tutorial-primary" type="button" data-tutorial-finish>Begin 5-Sol Mission</button>',
        };
      default:
        return { title: '', content: '', action: '' };
    }
  }
}

export class MissionResetChoiceUI {
  constructor(
    private readonly container: HTMLElement,
    private readonly onReset: (replayTutorial: boolean) => void
  ) {
    this.container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const choice = target.closest<HTMLButtonElement>('[data-reset-choice]')?.dataset.resetChoice;
      if (choice === 'replay') this.choose(true);
      else if (choice === 'skip') this.choose(false);
      else if (target.closest('[data-reset-cancel]')) this.hide();
    });
  }

  public show(): void {
    this.container.hidden = false;
    this.container.innerHTML = `
      <section class="reset-choice-card" role="dialog" aria-modal="true" aria-labelledby="reset-choice-title">
        <span class="tutorial-kicker">MISSION RESET</span>
        <h2 id="reset-choice-title">Start the colony again?</h2>
        <p>This restarts Sol progress, supplies, and building discoveries. Choose whether to replay the guide.</p>
        <div class="reset-choice-actions">
          <button class="tutorial-primary" type="button" data-reset-choice="replay">Restart &amp; replay tutorial</button>
          <button class="tutorial-secondary" type="button" data-reset-choice="skip">Restart without tutorial</button>
          <button class="reset-cancel" type="button" data-reset-cancel>Cancel</button>
        </div>
      </section>
    `;
    this.container.querySelector<HTMLButtonElement>('[data-reset-choice="replay"]')?.focus({ preventScroll: true });
  }

  public hide(): void {
    this.container.hidden = true;
    this.container.innerHTML = '';
  }

  private choose(replayTutorial: boolean): void {
    this.hide();
    this.onReset(replayTutorial);
  }
}
