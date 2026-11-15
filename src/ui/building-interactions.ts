import type { GameState, ResourceKey } from '../core/types';
import {
  FIVE_SOL_OBJECTIVES,
  getCurrentMissionObjective,
  getResourceName,
  type MissionInteractionOutcome,
} from '../core/mission';
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
}

export class BuildingInteractionUI {
  private focusedBeforePanel?: HTMLElement;
  private feedbackTimer?: number;

  constructor(
    private readonly promptContainer: HTMLElement,
    private readonly objectivesContainer: HTMLElement,
    private readonly panelContainer: HTMLElement,
    private readonly feedbackContainer: HTMLElement,
    private readonly handlers: BuildingInteractionHandlers
  ) {
    this.promptContainer.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('[data-building-interact]')) {
        this.handlers.onInteract();
      }
    });
    this.panelContainer.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-science-console]')) {
        this.handlers.onOpenScienceConsole();
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
      if (event.key === 'Escape' && !this.panelContainer.hidden) {
        event.preventDefault();
        this.handlers.onClose();
        return;
      }

      const activeElement = document.activeElement;
      const gameHasFocus =
        activeElement === document.body ||
        activeElement === document.documentElement ||
        activeElement === document.querySelector('#game-container canvas');
      if (
        event.key.toLowerCase() === 'e' &&
        this.panelContainer.hidden &&
        !this.promptContainer.hidden &&
        (gameHasFocus || this.promptContainer.contains(activeElement))
      ) {
        event.preventDefault();
        this.handlers.onInteract();
      }
    });
  }

  public renderObjectives(state: GameState): void {
    const exploredBuildingIds = state.exploredBuildings ?? [];
    const explored = new Set(exploredBuildingIds);
    const completedTasks = new Set(state.missionObjectivesCompleted ?? []);
    const taskCount = FIVE_SOL_OBJECTIVES.filter((objective) => completedTasks.has(objective.id)).length;
    const buildingCount = BUILDING_LESSONS.filter((building) => explored.has(building.id)).length;
    const objective = getCurrentMissionObjective(state);
    const lowResource = getCriticalResourceHint(state);
    this.objectivesContainer.hidden = false;
    this.objectivesContainer.innerHTML = `
      <section class="mission-log" aria-label="Five-Sol mission objectives">
        <div class="field-log-heading">
          <span class="field-log-kicker">COLONY SURVIVAL · MISSION COMMANDER</span>
          <strong aria-live="polite">${state.missionComplete ? 'COMPLETE' : `SOL ${state.sol}`}<span>${state.missionComplete ? '' : ' / 5'}</span></strong>
        </div>
        ${objective ? `
          <div class="mission-log-current">
            <span class="mission-log-label">TODAY’S OBJECTIVE</span>
            <strong>${objective.title}</strong>
            <span>${objective.action}</span>
          </div>
        ` : '<div class="mission-log-current is-complete"><strong>Five-Sol mission complete</strong><span>Review the final report in Mission Control.</span></div>'}
        <div class="field-log-heading mission-count-heading"><span class="mission-log-label">TASKS · SITES ${buildingCount}/5</span><strong>${taskCount}<span> / 5 complete</span></strong></div>
        <div class="field-log-progress" role="progressbar" aria-label="Five-Sol mission progress" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${taskCount}">
          <span style="width:${(taskCount / FIVE_SOL_OBJECTIVES.length) * 100}%"></span>
        </div>
        <ol class="mission-sol-list" aria-label="Sol task checklist">
          ${FIVE_SOL_OBJECTIVES.map((solObjective) => {
            const isComplete = completedTasks.has(solObjective.id);
            const isCurrent = !state.missionComplete && objective?.id === solObjective.id;
            const stateClass = isComplete ? 'is-complete' : isCurrent ? 'is-current' : '';
            const shortName = BUILDING_LESSONS.find((building) => building.id === solObjective.buildingId)?.shortName ?? 'Base';
            return `<li class="${stateClass}" aria-label="Sol ${solObjective.sol}: ${solObjective.title}, ${isComplete ? 'complete' : isCurrent ? 'current' : 'remaining'}" title="Sol ${solObjective.sol}: ${solObjective.title}"><span class="mission-sol-step" aria-hidden="true">${isComplete ? '✓' : solObjective.sol}</span><small>${shortName}</small></li>`;
          }).join('')}
        </ol>
        ${lowResource ? `<div class="mission-resource-warning" role="status"><strong>${lowResource.title}</strong><span>${lowResource.message}</span></div>` : ''}
      </section>
    `;
  }

  public showMissionFeedback(outcome: MissionInteractionOutcome): void {
    if (!outcome.completedObjective && !outcome.recoveredResource) return;

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
      <button class="building-interaction-prompt${tutorialHighlight ? ' is-tutorial-highlight' : ''}" type="button" data-building-interact aria-label="Interact with ${building.name}">
        <span class="interaction-prompt-icon" aria-hidden="true">＋</span>
        <span class="interaction-prompt-copy">${tutorialHighlight ? '<em class="interaction-tutorial-label">NEAREST BUILDING</em>' : ''}<strong>${building.name}</strong><span class="interaction-desktop-hint">Press <kbd>E</kbd> to interact</span><span class="interaction-mobile-hint">Tap to explore</span></span>
      </button>
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
  const discovered = new Set(state.exploredBuildings ?? []);
  const resources = Object.entries(state.resources) as [ResourceKey, GameState['resources'][ResourceKey]][];
  const crewStatus = state.crewSafety === 'nominal' ? 'SAFE · NOMINAL' : state.crewSafety.toUpperCase();
  const learning = BUILDING_LESSONS
    .filter((building) => discovered.has(building.id))
    .map((building) => `<span>${building.icon} ${building.name}</span>`)
    .join('');

  return `
    <section class="mission-summary-card" aria-label="Five-Sol mission summary">
      <div class="mission-summary-heading"><span>FIVE-SOL SURVIVAL MISSION</span><strong>MISSION COMPLETE</strong></div>
      <p class="mission-summary-crew">CREW STATUS · ${crewStatus}</p>
      <p class="mission-summary-label">FINAL COLONY RESERVES</p>
      <div class="mission-summary-resources">${resources.map(([key, resource]) => `<span>${getResourceName(key)}<strong>${resource.current} / ${resource.max} ${resource.unit}</strong></span>`).join('')}</div>
      <p class="mission-summary-label">TASKS COMPLETED · ${state.missionObjectivesCompleted?.length ?? 0}/5</p>
      <ol class="mission-summary-tasks">${FIVE_SOL_OBJECTIVES.map((objective) => `<li>✓ Sol ${objective.sol} · ${objective.title}</li>`).join('')}</ol>
      <p class="mission-summary-label">CONCEPTS DISCOVERED</p>
      <div class="mission-summary-learning">${learning || '<span>No building guides discovered yet.</span>'}</div>
      <p class="mission-summary-note">Resource changes are part of the simplified mission simulation. NASA reference facts are labeled in the field guides.</p>
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
