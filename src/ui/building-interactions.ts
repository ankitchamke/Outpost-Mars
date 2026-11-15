import type { GameState, ResourceKey } from '../core/types';
import {
  FIVE_SOL_OBJECTIVES,
  getCurrentMissionObjective,
  getResourceName,
  type MissionInteractionOutcome,
} from '../core/mission';
import { calculateMissionDebrief, escapeHtml } from '../core/space-weather-event';
import type { CuriosityRadSnapshot } from '../data/types';
import type { BuildingData } from '../game/scenes/MarsScene';

export const BUILDING_LESSONS = [
  { id: 'habitat', name: 'Habitat', shortName: 'Hab', icon: '⌂', topic: 'Life support' },
  { id: 'solar_farm', name: 'Solar Farm', shortName: 'Solar', icon: '☀', topic: 'Power systems' },
  { id: 'greenhouse', name: 'Greenhouse', shortName: 'Grow', icon: '✳', topic: 'Growing food' },
  { id: 'storm_shelter', name: 'Storm Shelter', shortName: 'Shelter', icon: '⬡', topic: 'Radiation safety' },
  { id: 'mission_control', name: 'Mission Control', shortName: 'Control', icon: '⌁', topic: 'Mission operations' },
] as const;

export type ExploredBuildingId = (typeof BUILDING_LESSONS)[number]['id'];

export interface BuildingInteractionHandlers {
  onInteract: () => void;
  onClose: () => void;
  onOpenScienceConsole: () => void;
  onOpenSpaceWeatherEvent?: () => void;
}

export class BuildingInteractionUI {
  private focusedBeforePanel?: HTMLElement;
  private feedbackTimer?: number;
  private lastState?: GameState;
  private isObjectivesCollapsed = false;
  private hasCompletionFlash = false;

  constructor(
    private readonly promptContainer: HTMLElement,
    private readonly objectivesContainer: HTMLElement,
    private readonly panelContainer: HTMLElement,
    private readonly feedbackContainer: HTMLElement,
    private readonly handlers: BuildingInteractionHandlers
  ) {
    this.objectivesContainer.addEventListener('click', (event) => {
      const toggle = (event.target as HTMLElement).closest('[data-objective-toggle]');
      if (toggle) {
        event.preventDefault();
        this.isObjectivesCollapsed = !this.isObjectivesCollapsed;
        if (this.lastState) {
          this.renderObjectives(this.lastState);
        }
      }
    });
    this.panelContainer.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-science-console]')) {
        this.handlers.onOpenScienceConsole();
      } else if (target.closest('[data-space-weather-open]')) {
        this.handlers.onClose();
        this.handlers.onOpenSpaceWeatherEvent?.();
      } else if (target.closest('[data-building-close]')) {
        this.handlers.onClose();
      }
    });
    this.feedbackContainer.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('[data-feedback-close]')) {
        this.dismissMissionFeedback();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.repeat) return;

      if (event.key === 'Escape' && !this.panelContainer.hidden) {
        event.preventDefault();
        this.handlers.onClose();
        return;
      }

      const activeElement = document.activeElement;
      const tagName = activeElement?.tagName?.toUpperCase();
      const isInput =
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        (typeof HTMLInputElement !== 'undefined' && activeElement instanceof HTMLInputElement) ||
        (typeof HTMLTextAreaElement !== 'undefined' && activeElement instanceof HTMLTextAreaElement) ||
        (typeof HTMLSelectElement !== 'undefined' && activeElement instanceof HTMLSelectElement);
      if (isInput) return;

      if (
        event.key.toLowerCase() === 'e' &&
        this.panelContainer.hidden &&
        !this.promptContainer.hidden
      ) {
        event.preventDefault();
        this.handlers.onInteract();
      }
    });
  }

  public triggerCompletionFlash(): void {
    this.hasCompletionFlash = true;
    if (this.lastState) this.renderObjectives(this.lastState);
    window.setTimeout(() => {
      this.hasCompletionFlash = false;
      const card = this.objectivesContainer.querySelector('.mission-log');
      card?.classList.remove('has-completion-flash');
    }, 2200);
  }

  public renderObjectives(state: GameState): void {
    this.lastState = state;
    const exploredBuildingIds = state.exploredBuildings ?? [];
    const explored = new Set(exploredBuildingIds);
    const completedTasks = new Set(state.missionObjectivesCompleted ?? []);
    const taskCount = FIVE_SOL_OBJECTIVES.filter((objective) => completedTasks.has(objective.id)).length;
    const buildingCount = BUILDING_LESSONS.filter((building) => explored.has(building.id)).length;
    const objective = getCurrentMissionObjective(state);
    const lowResource = getCriticalResourceHint(state);
    this.objectivesContainer.hidden = false;

    // Collapsed State: Sleek compact HUD bar
    if (this.isObjectivesCollapsed) {
      this.objectivesContainer.innerHTML = `
        <section class="mission-log is-collapsed ${this.hasCompletionFlash ? 'has-completion-flash' : ''}" aria-label="Five-Sol mission objectives (Minimized)">
          <div class="mission-log-collapsed-content">
            <span class="sol-badge">${state.missionComplete ? 'COMPLETE' : `SOL ${state.sol}/5`}</span>
            <div class="collapsed-text-group">
              <strong class="collapsed-title">${objective ? objective.title : 'Mission Complete'}</strong>
              <span class="collapsed-meta">${taskCount}/5 Tasks &bull; ${buildingCount}/5 Sites</span>
            </div>
            <button class="btn-objective-toggle" type="button" data-objective-toggle aria-label="Expand mission objectives card" title="Expand mission objectives">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              <span>Expand</span>
            </button>
          </div>
        </section>
      `;
      return;
    }

    // Expanded State: Structured NASA HUD Card with Connected Stepper
    const progressPercent = (taskCount / FIVE_SOL_OBJECTIVES.length) * 100;
    this.objectivesContainer.innerHTML = `
      <section class="mission-log ${this.hasCompletionFlash ? 'has-completion-flash' : ''}" aria-label="Five-Sol mission objectives">
        <div class="mission-log-header">
          <div class="sol-badge-group">
            <span class="sol-badge" aria-live="polite">${state.missionComplete ? 'MISSION COMPLETE' : `SOL ${state.sol} OF 5`}</span>
            <span class="mission-task-fraction">${taskCount} / 5 Tasks Complete</span>
          </div>
          <button class="btn-objective-toggle" type="button" data-objective-toggle aria-label="Minimize mission objectives card" title="Minimize mission objectives">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
            <span>Hide</span>
          </button>
        </div>

        ${objective ? `
          <div class="mission-log-current">
            <span class="mission-log-kicker">TODAY'S MISSION DIRECTIVE</span>
            <h3 class="mission-log-title">${objective.title}</h3>
            <p class="mission-log-action">${objective.action}</p>
          </div>
        ` : `
          <div class="mission-log-current is-complete">
            <span class="mission-log-kicker">MISSION OBJECTIVES ACCOMPLISHED</span>
            <h3 class="mission-log-title">Five-Sol Surface Survival Successful</h3>
            <p class="mission-log-action">All systems verified. Review the full mission summary at Mission Control.</p>
          </div>
        `}

        <div class="mission-stepper-wrap" aria-label="Five-Sol task progression">
          <div class="field-log-progress" role="progressbar" aria-label="Five-Sol mission progress" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${taskCount}">
            <span style="width: ${progressPercent}%"></span>
          </div>
          <ol class="mission-sol-list" aria-label="Sol task checklist">
            ${FIVE_SOL_OBJECTIVES.map((solObjective) => {
              const isComplete = completedTasks.has(solObjective.id);
              const isCurrent = !state.missionComplete && objective?.id === solObjective.id;
              const stateClass = isComplete ? 'is-complete' : isCurrent ? 'is-current' : 'is-locked';
              const shortName = BUILDING_LESSONS.find((building) => building.id === solObjective.buildingId)?.shortName ?? 'Base';
              return `
                <li class="${stateClass}" aria-label="Sol ${solObjective.sol}: ${solObjective.title}, ${isComplete ? 'complete' : isCurrent ? 'current' : 'locked'}" title="Sol ${solObjective.sol}: ${solObjective.title}">
                  <span class="mission-sol-step" aria-hidden="true">${isComplete ? '✓' : solObjective.sol}</span>
                  <small class="mission-sol-step-label">${shortName}</small>
                </li>
              `;
            }).join('')}
          </ol>
        </div>

        <div class="mission-log-foot">
          <span>OUTPOST EXPLORATION: <strong>${buildingCount}/5 SITES VISITED</strong></span>
        </div>

        ${lowResource ? `<div class="mission-resource-warning" role="status"><strong>⚠️ ${lowResource.title}</strong><span>${lowResource.message}</span></div>` : ''}
      </section>
    `;
  }

  public showMissionFeedback(outcome: MissionInteractionOutcome): void {
    if (!outcome.completedObjective && !outcome.recoveredResource) return;

    if (outcome.completedObjective) {
      this.triggerCompletionFlash();
    }

    const title = outcome.completedObjective
      ? `SOL ${outcome.completedObjective.sol} TASK COMPLETE`
      : 'RESOURCE RECOVERY CHECK';
    const nextAction = outcome.missionCompleted
      ? 'All five Sol tasks are complete. Review the mission report in Mission Control.'
      : outcome.nextObjective
        ? `Next: Sol ${outcome.nextObjective.sol} — ${outcome.nextObjective.title}.`
        : 'Keep exploring the outpost.';

    this.feedbackContainer.hidden = false;
    this.feedbackContainer.innerHTML = `
      <section class="mission-feedback-card" role="status" aria-live="polite">
        <button class="mission-feedback-close" type="button" data-feedback-close aria-label="Dismiss mission update">×</button>
        <span class="mission-feedback-kicker">MISSION SIMULATION UPDATE</span>
        <strong class="mission-feedback-title">${title}</strong>
        ${outcome.resourceChanges.length
          ? `<ul class="mission-change-list">${outcome.resourceChanges.map((change) => `<li><span class="mission-change-value">${change.delta > 0 ? '+' : ''}${change.delta} ${getResourceName(change.resource)} ${change.unit}</span><span>${change.reason}</span></li>`).join('')}</ul>`
          : '<p class="mission-feedback-copy">Objective recorded.</p>'}
        <p class="mission-next-action">${nextAction}</p>
      </section>
    `;

    if (this.feedbackTimer !== undefined) window.clearTimeout(this.feedbackTimer);
    this.feedbackTimer = window.setTimeout(() => this.dismissMissionFeedback(), 9000);
  }

  public dismissMissionFeedback(): void {
    if (this.feedbackTimer !== undefined) window.clearTimeout(this.feedbackTimer);
    this.feedbackTimer = undefined;
    this.feedbackContainer.hidden = true;
    this.feedbackContainer.innerHTML = '';
  }

  public setNearbyBuilding(building: BuildingData | null, tutorialHighlight = false): void {
    if (!building) {
      this.promptContainer.hidden = true;
      this.promptContainer.innerHTML = '';
      return;
    }

    this.promptContainer.hidden = false;
    this.promptContainer.innerHTML = `
      <div class="building-interaction-prompt${tutorialHighlight ? ' is-tutorial-highlight' : ''}" role="status" aria-label="Nearby structure: ${building.name}. Press E to inspect.">
        <span class="interaction-keycap" aria-hidden="true"><kbd>E</kbd></span>
        <div class="interaction-prompt-content">
          <div class="interaction-prompt-kicker">
            <span class="interaction-kicker-text">STRUCTURE PROXIMITY</span>
            ${tutorialHighlight ? '<span class="interaction-tutorial-label">NEAREST</span>' : ''}
          </div>
          <strong class="interaction-building-name">${building.name}</strong>
          <span class="interaction-hints">
            <span class="interaction-desktop-hint">Press <kbd>E</kbd> to inspect</span>
          </span>
        </div>
        <span class="interaction-prompt-arrow" aria-hidden="true">➔</span>
      </div>
    `;
  }

  public open(
    building: BuildingData,
    state: GameState,
    curiositySnapshot?: CuriosityRadSnapshot,
    outcome?: MissionInteractionOutcome
  ): void {
    const lesson = BUILDING_LESSONS.find((entry) => entry.id === building.id);
    if (!lesson) return;

    this.promptContainer.hidden = true;
    this.focusedBeforePanel = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    this.panelContainer.hidden = false;
    this.panelContainer.innerHTML = renderBuildingPanel(
      lesson,
      new Set(state.exploredBuildings ?? []).has(lesson.id),
      state,
      curiositySnapshot,
      outcome
    );
    this.panelContainer.querySelector<HTMLButtonElement>('[data-building-close]')?.focus({ preventScroll: true });
  }

  public close(): void {
    this.panelContainer.hidden = true;
    this.panelContainer.innerHTML = '';

    const canvas = document.querySelector<HTMLCanvasElement>('#game-container canvas');
    if (this.focusedBeforePanel?.isConnected && !this.panelContainer.contains(this.focusedBeforePanel)) {
      this.focusedBeforePanel.focus({ preventScroll: true });
    } else {
      canvas?.focus({ preventScroll: true });
    }
  }
}

type BuildingLesson = (typeof BUILDING_LESSONS)[number];

function renderBuildingPanel(
  lesson: BuildingLesson,
  isExplored: boolean,
  state: GameState,
  curiositySnapshot?: CuriosityRadSnapshot,
  outcome?: MissionInteractionOutcome
): string {
  const commonFacts: Record<ExploredBuildingId, string[]> = {
    habitat: [
      'Air systems provide oxygen and keep the living space at a safe pressure.',
      'Filters help recycle water so the crew can use supplies carefully.',
      'Walls and storm shelters add protection from radiation coming from space.',
    ],
    solar_farm: [
      'Solar cells change sunlight into electrical energy.',
      'Batteries can save some energy for later use.',
      'Dusty skies and night reduce sunlight, so crews watch their power supply.',
    ],
    greenhouse: [
      'Plants need the right light, air, water and temperature to grow.',
      'A greenhouse controls these conditions inside a protected space.',
      'Recycling water helps save supplies; growing food also takes time and care.',
    ],
    storm_shelter: [
      'Space radiation can pass through thin walls and can be harmful to people.',
      'Extra shielding, such as thick soil or stored water, can reduce exposure.',
      'A shelter gives the crew a more protected place during a solar storm.',
    ],
    mission_control: [
      'Mission teams plan science work and watch information sent back by spacecraft.',
      'Radio messages between Earth and Mars take time to travel.',
      'That delay means a crew and its robots must handle many tasks without an instant reply.',
    ],
  };

  const isHabitat = lesson.id === 'habitat';
  const gcr = curiositySnapshot?.datasets.gcrBaseline;
  const isShelter = lesson.id === 'storm_shelter' && !!gcr;
  const learningTag = isHabitat || isShelter ? 'GENERAL SCIENCE · OFFLINE NASA REFERENCE' : 'GENERAL SCIENCE';
  const lifeSupport = state.lifeSupportDetails;
  const currentObjective = getCurrentMissionObjective(state);

  const spaceWeatherCallout = lesson.id === 'storm_shelter'
    ? state.spaceWeatherDecision
      ? `<aside class="space-weather-shelter-callout is-decided">
          <div class="callout-heading">
            <span class="callout-tag">NASA DONKI · SPACE WEATHER DRILL</span>
            <span class="callout-status">DECISION RECORDED</span>
          </div>
          <strong>Strategy: ${state.spaceWeatherDecision === 'shelter' ? 'Fortify Storm Shelter' : 'Conserve Colony Power'}</strong>
          <p>${state.spaceWeatherDecision === 'shelter' ? 'Bulkheads sealed and magnetic coils energized for active radiation defense.' : 'Power conserved for life support while accepting lower shield readiness.'}</p>
        </aside>`
      : state.sol >= 4
        ? `<aside class="space-weather-shelter-callout is-alert">
            <div class="callout-heading">
              <span class="callout-tag">⚠️ NASA DONKI ADVISORY · MAY 11, 2024</span>
              <span class="callout-status is-alert">DECISION REQUIRED</span>
            </div>
            <strong>Historical X5.8 Solar Flare Advisory</strong>
            <p>A simulated solar particle storm approaches Jezero Crater. The colony needs your tactical defense decision.</p>
            <button class="btn btn-sm btn-primary" type="button" data-space-weather-open>Review Space Weather Advisory</button>
          </aside>`
        : ''
    : '';

  const referenceCard = isHabitat
    ? `<aside class="learning-reference"><span>OFFLINE NASA BVAD PLANNING REFERENCE</span><strong>${lifeSupport.oxygenKgPerDay.toFixed(2)} kg O₂ · ${lifeSupport.waterLitersPerDay.toFixed(1)} L water</strong><p>Per person, per day. Planning values—not a measurement from Mars.</p></aside>`
    : isShelter && gcr
      ? `<aside class="learning-reference"><span>NASA CURIOSITY RAD · GALE CRATER</span><strong>${gcr.doseEquivalentRate.toFixed(2)} ± ${gcr.doseEquivalentRateUncertainty.toFixed(2)} mSv/day</strong><p>Average measured during Curiosity’s first 300 sols (2012–2013); a past rover result, not a forecast.</p></aside>`
      : '';
  const taskCallout = outcome?.completedObjective
    ? `<aside class="mission-task-callout is-success"><span>✓ SOL ${outcome.completedObjective.sol} TASK LOGGED</span><strong>${outcome.completedObjective.title}</strong><p>${outcome.nextObjective ? `Next: Sol ${outcome.nextObjective.sol} — ${outcome.nextObjective.title}.` : 'All five Sols complete. Your mission report is below.'}</p>${renderInlineResourceChanges(outcome)}</aside>`
    : outcome?.recoveredResource
      ? `<aside class="mission-task-callout is-recovery"><span>RECOVERY ACTION</span><strong>${getResourceName(outcome.recoveredResource)} reserve restored</strong><p>Your resource meter has been brought back above its critical warning level where possible.</p>${renderInlineResourceChanges(outcome)}</aside>`
      : state.missionComplete
        ? ''
        : currentObjective
          ? `<aside class="mission-task-callout"><span>CURRENT MISSION · SOL ${currentObjective.sol}</span><strong>${currentObjective.title}</strong><p>${currentObjective.action}</p></aside>`
          : '';
  const missionSummary = state.missionComplete ? renderMissionSummary(state) : '';
  const scienceConsole = lesson.id === 'mission_control'
    ? `<aside class="science-console-entry"><span>OFFLINE NASA SCIENCE</span><strong>${state.completedScienceChallenges?.length ?? 0}/3 challenges logged</strong><p>Review real NASA records and try three short training activities.</p><button class="science-primary" type="button" data-science-console>Open Science Console</button></aside>`
    : '';

  return `
    <section class="building-lesson-card" role="dialog" aria-modal="true" aria-labelledby="building-lesson-title">
      <header class="building-lesson-header">
        <span class="building-lesson-icon" aria-hidden="true">${lesson.icon}</span>
        <div class="building-lesson-title-block">
          <span class="building-lesson-kicker">FIELD GUIDE · ${lesson.topic.toUpperCase()}</span>
          <h2 id="building-lesson-title">${lesson.name}</h2>
        </div>
        <button class="building-lesson-close" type="button" data-building-close aria-label="Close ${lesson.name} panel">×</button>
      </header>
      <div class="building-lesson-body">
        <p class="building-lesson-tag">${learningTag}</p>
        ${taskCallout}
        <ul class="building-lesson-facts">${commonFacts[lesson.id].map((fact) => `<li>${fact}</li>`).join('')}</ul>
        ${referenceCard}
        ${spaceWeatherCallout}
        ${scienceConsole}
        ${missionSummary}
      </div>
      <footer class="building-lesson-footer">
        <span class="building-discovery-state"><span aria-hidden="true">${isExplored ? '✓' : '✦'}</span> ${isExplored ? 'DISCOVERED' : 'NEW DISCOVERY'}</span>
        <span class="building-close-hint">${isExplored ? 'Keep exploring Mars' : 'Press Esc or close to continue'}</span>
      </footer>
    </section>
  `;
}

function renderMissionSummary(state: GameState): string {
  const debrief = calculateMissionDebrief(state);
  const discovered = new Set(state.exploredBuildings ?? []);
  const resources = Object.entries(state.resources) as [ResourceKey, GameState['resources'][ResourceKey]][];
  const crewStatus = state.crewSafety === 'nominal' ? 'SAFE · NOMINAL' : state.crewSafety.toUpperCase();
  const medalIcon = debrief.overallRank === 'gold' ? '🥇' : debrief.overallRank === 'silver' ? '🥈' : '🥉';
  const learning = BUILDING_LESSONS
    .filter((building) => discovered.has(building.id))
    .map((building) => `<span>${building.icon} ${building.name}</span>`)
    .join('');

  return `
    <section class="mission-summary-card mission-debrief-card" aria-label="Five-Sol mission debrief">
      <!-- Debrief Header -->
      <div class="mission-summary-heading">
        <span class="debrief-eyebrow">FIVE-SOL MISSION DEBRIEF</span>
        <strong class="debrief-rank-title">${medalIcon} ${escapeHtml(debrief.overallRankTitle)}</strong>
        <span class="debrief-score-badge">Performance Score: ${debrief.averageScore}/100</span>
      </div>

      <div class="debrief-overview-row">
        <div class="debrief-stat-chip">
          <small>CREW STATUS</small>
          <strong>${crewStatus}</strong>
        </div>
        <div class="debrief-stat-chip">
          <small>SOLS SURVIVED</small>
          <strong>5 / 5 SOLS</strong>
        </div>
        <div class="debrief-stat-chip">
          <small>COLONY SITES</small>
          <strong>${discovered.size} / 5 VISITED</strong>
        </div>
      </div>

      <!-- 3 Understandable Evaluation Categories -->
      <div class="debrief-categories-grid">
        <!-- Category 1: Science Investigation -->
        <article class="debrief-category-box tier-${debrief.categories.science.tier}">
          <div class="debrief-category-header">
            <div class="debrief-cat-title">
              <span class="debrief-cat-icon">${debrief.categories.science.icon}</span>
              <h4>${debrief.categories.science.title}</h4>
            </div>
            <span class="debrief-tier-pill is-${debrief.categories.science.tier}">${debrief.categories.science.tier.toUpperCase()} · ${debrief.categories.science.score}/100</span>
          </div>
          <p class="debrief-cat-summary">${debrief.categories.science.summary}</p>
          <ul class="debrief-evidence-list">
            ${debrief.categories.science.bulletPoints.map((bp) => `<li>${escapeHtml(bp)}</li>`).join('')}
          </ul>
        </article>

        <!-- Category 2: Colony Safety -->
        <article class="debrief-category-box tier-${debrief.categories.safety.tier}">
          <div class="debrief-category-header">
            <div class="debrief-cat-title">
              <span class="debrief-cat-icon">${debrief.categories.safety.icon}</span>
              <h4>${debrief.categories.safety.title}</h4>
            </div>
            <span class="debrief-tier-pill is-${debrief.categories.safety.tier}">${debrief.categories.safety.tier.toUpperCase()} · ${debrief.categories.safety.score}/100</span>
          </div>
          <p class="debrief-cat-summary">${debrief.categories.safety.summary}</p>
          <ul class="debrief-evidence-list">
            ${debrief.categories.safety.bulletPoints.map((bp) => `<li>${escapeHtml(bp)}</li>`).join('')}
          </ul>
        </article>

        <!-- Category 3: Resource Sustainability -->
        <article class="debrief-category-box tier-${debrief.categories.sustainability.tier}">
          <div class="debrief-category-header">
            <div class="debrief-cat-title">
              <span class="debrief-cat-icon">${debrief.categories.sustainability.icon}</span>
              <h4>${debrief.categories.sustainability.title}</h4>
            </div>
            <span class="debrief-tier-pill is-${debrief.categories.sustainability.tier}">${debrief.categories.sustainability.tier.toUpperCase()} · ${debrief.categories.sustainability.score}/100</span>
          </div>
          <p class="debrief-cat-summary">${debrief.categories.sustainability.summary}</p>
          <ul class="debrief-evidence-list">
            ${debrief.categories.sustainability.bulletPoints.map((bp) => `<li>${escapeHtml(bp)}</li>`).join('')}
          </ul>
        </article>
      </div>

      <!-- Final Colony Reserves -->
      <div class="debrief-reserves-section">
        <p class="mission-summary-label">FINAL COLONY RESERVES</p>
        <div class="mission-summary-resources">
          ${resources.map(([key, resource]) => `<span><span>${getResourceName(key)}</span><strong>${resource.current} / ${resource.max} ${resource.unit}</strong></span>`).join('')}
        </div>
      </div>

      <!-- Tasks Completed -->
      <p class="mission-summary-label">FIVE-SOL OBJECTIVES</p>
      <ol class="mission-summary-tasks">${FIVE_SOL_OBJECTIVES.map((objective) => `<li>✓ Sol ${objective.sol} · ${objective.title}</li>`).join('')}</ol>

      <p class="mission-summary-label">CONCEPTS DISCOVERED</p>
      <div class="mission-summary-learning">${learning || '<span>No building guides discovered yet.</span>'}</div>

      <!-- Educational NASA Context Note -->
      <div class="debrief-educational-card">
        <span class="debrief-edu-badge">NASA SCIENTIFIC PROVENANCE</span>
        <p>${escapeHtml(debrief.nasaContextNote)}</p>
      </div>
    </section>
  `;
}

function renderInlineResourceChanges(outcome: MissionInteractionOutcome): string {
  if (outcome.resourceChanges.length === 0) return '';
  return `<ul class="mission-task-change-list">${outcome.resourceChanges.map((change) => `<li><strong>${change.delta > 0 ? '+' : ''}${change.delta} ${getResourceName(change.resource)} ${change.unit}</strong><span>${change.reason}</span></li>`).join('')}</ul>`;
}

function getCriticalResourceHint(state: GameState): { title: string; message: string } | undefined {
  const recoveryGuidance: Record<ResourceKey, { building: string; reason: string }> = {
    power: { building: 'Solar Farm', reason: 'Check the batteries for stored power.' },
    lifeSupport: { building: 'Habitat', reason: 'Check air and water recovery systems.' },
    stormShield: { building: 'Storm Shelter', reason: 'Run the shelter readiness check.' },
  };

  const critical = (Object.entries(state.resources) as [ResourceKey, GameState['resources'][ResourceKey]][])
    .find(([, resource]) => resource.current <= resource.max * 0.2);
  if (!critical) return undefined;

  const [resourceKey, resource] = critical;
  const guidance = recoveryGuidance[resourceKey];
  return {
    title: `LOW ${getResourceName(resourceKey).toUpperCase()} · ${resource.current}/${resource.max} ${resource.unit}`,
    message: `${guidance.reason} Visit the ${guidance.building} for a recovery check.`,
  };
}

export function normalizeExploredBuildings(value: unknown): ExploredBuildingId[] {
  if (!Array.isArray(value)) return [];
  const allowedIds = new Set<string>(BUILDING_LESSONS.map((building) => building.id));
  return Array.from(new Set(value.filter((id): id is ExploredBuildingId => typeof id === 'string' && allowedIds.has(id))));
}

export function normalizeExploredState(state: GameState): GameState {
  return { ...state, exploredBuildings: normalizeExploredBuildings(state.exploredBuildings) };
}
