import './assets/styles.css';
import { createInitialGameState } from './core/state';
import { completeBuildingMissionTask, normalizeFiveSolMissionState } from './core/mission';
import { clearGameState, loadGameState, saveGameState } from './core/storage';
import { GameState } from './core/types';
import { normalizeCompletedScienceChallenges } from './core/science-challenges';
import { createOutpostGame } from './game';
import { BUILDING_INTERACTION_EVENTS } from './game/building-events';
import { TUTORIAL_EVENTS } from './game/tutorial-events';
import type { BuildingData } from './game/scenes/MarsScene';
import { FirstTimeTutorialUI, MissionResetChoiceUI } from './ui/first-time-tutorial';
import { OutpostHud } from './ui/hud';
import { ScienceChallengesUI } from './ui/science-challenges';
import {
  BuildingInteractionUI,
  normalizeExploredState,
} from './ui/building-interactions';
import { createDefaultOfflineLoader } from './data/loader';

// Application State
let currentState: GameState;
let gameInstance: Phaser.Game | null = null;

function initApp(): void {
  // 1. Restore state from localStorage or create baseline
  const savedState = loadGameState();
  if (savedState) {
    currentState = {
      ...normalizeFiveSolMissionState(normalizeExploredState(savedState)),
      completedScienceChallenges: normalizeCompletedScienceChallenges(savedState.completedScienceChallenges),
    };
    // Saves created before onboarding remain undisturbed; Help can launch the guide at any time.
    if (currentState.tutorialCompleted === undefined) currentState.tutorialCompleted = true;
    saveGameState(currentState);
    console.info('[OUTPOST: MARS] Restored saved mission state from localStorage.');
  } else {
    currentState = { ...normalizeFiveSolMissionState(createInitialGameState()), tutorialCompleted: false };
    saveGameState(currentState);
    console.info('[OUTPOST: MARS] Initialized new baseline mission state.');
  }

  const missionStatusFooter = document.getElementById('mission-status-footer');
  const tutorialContainer = document.getElementById('tutorial-container');
  const resetChoiceContainer = document.getElementById('reset-choice-container');
  const helpButton = document.getElementById('btn-help');
  const resetButton = document.getElementById('btn-reset-state');
  const scienceLogButton = document.getElementById('btn-science-log');
  const viewportContainer = document.querySelector('.viewport-container');
  const updateMissionStatusFooter = (): void => {
    if (!missionStatusFooter) return;
    const crewStatus = currentState.crewSafety === 'nominal' ? 'Crew nominal' : `Crew ${currentState.crewSafety}`;
    missionStatusFooter.textContent = currentState.missionComplete
      ? `Mission complete · ${crewStatus}`
      : `Sol ${currentState.sol}/5 · ${crewStatus}`;
  };
  updateMissionStatusFooter();

  // 2. Initialize Phaser 3 Game Viewport (safeguarded after DOM layout pass)
  const gameContainer = document.getElementById('game-container');
  if (!gameContainer) {
    console.error('[OUTPOST: MARS] Viewport container (#game-container) not found.');
    return;
  }
  // 3. Initialize HUD Telemetry
  const hudContainer = document.getElementById('hud-container');
  let hud: OutpostHud | null = null;
  if (hudContainer) {
    hud = new OutpostHud(hudContainer);
    hud.update(currentState);
  }

  // 4. Initialize the field log and the building learning panel.
  const promptContainer = document.getElementById('building-prompt-container');
  const objectivesContainer = document.getElementById('mission-objectives-container');
  const panelContainer = document.getElementById('building-panel-container');
  const feedbackContainer = document.getElementById('mission-feedback-container');
  const offlineScience = createDefaultOfflineLoader().loadAll();
  const scienceData = offlineScience.data;
  const curiositySnapshot = scienceData.curiosity;
  let interactionUi: BuildingInteractionUI | null = null;
  let scienceUi: ScienceChallengesUI | null = null;
  let tutorialUi: FirstTimeTutorialUI | null = null;
  let resetChoiceUi: MissionResetChoiceUI | null = null;
  let nearbyBuilding: BuildingData | null = null;

  const focusGame = (): void => {
    gameInstance?.canvas.focus({ preventScroll: true });
  };

  const syncNavActiveStates = (): void => {
    const isScienceOpen = scienceUi?.isOpen() ?? false;
    const isHelpOpen = tutorialUi?.isVisible() ?? false;

    if (scienceLogButton) {
      scienceLogButton.classList.toggle('is-active', isScienceOpen);
      scienceLogButton.setAttribute('aria-pressed', isScienceOpen ? 'true' : 'false');
    }

    if (helpButton) {
      helpButton.classList.toggle('is-active', isHelpOpen);
      helpButton.setAttribute('aria-pressed', isHelpOpen ? 'true' : 'false');
    }
  };

  const syncTutorialHighlights = (): void => {
    viewportContainer?.classList.toggle('has-active-tutorial', tutorialUi?.isVisible() ?? false);
    const highlightBuilding = tutorialUi?.shouldHighlightNearestBuilding() ?? false;
    interactionUi?.setNearbyBuilding(nearbyBuilding, highlightBuilding);
    gameInstance?.events.emit(
      TUTORIAL_EVENTS.highlightBuilding,
      highlightBuilding ? tutorialUi?.getNearestBuildingId() ?? null : null
    );
    hudContainer?.querySelector('.resource-gauges')?.classList.toggle(
      'tutorial-resource-highlight',
      tutorialUi?.shouldHighlightResources() ?? false
    );
    if (tutorialUi?.shouldHighlightResources() && panelContainer && !panelContainer.hidden) {
      // The lesson has been read; clear the field guide so the resource gauges are visible.
      gameInstance?.events.emit(BUILDING_INTERACTION_EVENTS.requestClose);
    }
  };

  if (promptContainer && objectivesContainer && panelContainer && feedbackContainer) {
    interactionUi = new BuildingInteractionUI(promptContainer, objectivesContainer, panelContainer, feedbackContainer, {
      onInteract: () => gameInstance?.events.emit(BUILDING_INTERACTION_EVENTS.requestInteract),
      onClose: () => gameInstance?.events.emit(BUILDING_INTERACTION_EVENTS.requestClose),
      onOpenScienceConsole: () => scienceUi?.openConsole(currentState),
    });
    interactionUi.renderObjectives(currentState);
  }

  const scienceContainer = document.getElementById('science-console-container');
  if (scienceContainer) {
    scienceUi = new ScienceChallengesUI(scienceContainer, scienceData, currentState, {
      onStateChange: (outcome) => {
        currentState = outcome.state;
        saveGameState(currentState);
        updateMissionStatusFooter();
        hud?.update(currentState);
        interactionUi?.renderObjectives(currentState);
      },
      onVisibilityChange: () => {
        syncNavActiveStates();
      },
    });
  }

  if (tutorialContainer) {
    tutorialUi = new FirstTimeTutorialUI(tutorialContainer, {
      onComplete: () => {
        // Completing onboarding only changes its own flag; mission state and progress stay intact.
        currentState = { ...currentState, tutorialCompleted: true };
        saveGameState(currentState);
        updateMissionStatusFooter();
        gameInstance?.events.emit(BUILDING_INTERACTION_EVENTS.requestClose);
        syncNavActiveStates();
      },
      onFocusGame: focusGame,
      onViewChange: () => {
        syncTutorialHighlights();
        syncNavActiveStates();
      },
    });
    if (!savedState || currentState.tutorialCompleted === false) tutorialUi.showWelcome();
  }

  const resetMission = (replayTutorial: boolean): void => {
    clearGameState();
    currentState = {
      ...normalizeFiveSolMissionState(createInitialGameState()),
      tutorialCompleted: !replayTutorial,
    };
    saveGameState(currentState);
    updateMissionStatusFooter();
    if (hud) hud.update(currentState);
    interactionUi?.renderObjectives(currentState);
    interactionUi?.dismissMissionFeedback();
    scienceUi?.close();
    tutorialUi?.hideWithoutCompleting();
    gameInstance?.events.emit(BUILDING_INTERACTION_EVENTS.requestClose);
    syncNavActiveStates();
    if (replayTutorial) tutorialUi?.showWelcome(helpButton ?? undefined);
    else focusGame();
  };

  if (resetChoiceContainer) {
    resetChoiceUi = new MissionResetChoiceUI(resetChoiceContainer, resetMission);
  }

  helpButton?.addEventListener('click', () => {
    if (tutorialUi?.isVisible()) {
      tutorialUi.hideWithoutCompleting();
      syncNavActiveStates();
      focusGame();
    } else {
      currentState = { ...currentState, tutorialCompleted: false };
      saveGameState(currentState);
      tutorialUi?.showWelcome(helpButton ?? undefined);
      syncNavActiveStates();
    }
  });

  window.requestAnimationFrame(() => {
    gameInstance = createOutpostGame(gameContainer);
    if (!interactionUi) return;

    gameInstance.events.on(TUTORIAL_EVENTS.playerMoved, () => tutorialUi?.markPlayerMoved());
    gameInstance.events.on(
      BUILDING_INTERACTION_EVENTS.nearby,
      (building: BuildingData | null) => {
        nearbyBuilding = building;
        tutorialUi?.setNearbyBuilding(building);
        syncTutorialHighlights();
      }
    );
    gameInstance.events.on(BUILDING_INTERACTION_EVENTS.panelOpen, (building: BuildingData) => {
      const outcome = completeBuildingMissionTask(currentState, building.id);
      const explored = outcome.state.exploredBuildings ?? [];
      if (!explored.includes(building.id)) {
        outcome.state.exploredBuildings = [...explored, building.id];
      }
      currentState = outcome.state;
      saveGameState(currentState);
      updateMissionStatusFooter();
      if (hud) hud.update(currentState);

      interactionUi?.renderObjectives(currentState);
      interactionUi?.open(building, currentState, curiositySnapshot, outcome);
      interactionUi?.showMissionFeedback(outcome);
      tutorialUi?.markBuildingInteracted();
    });
    gameInstance.events.on(BUILDING_INTERACTION_EVENTS.panelClose, () => interactionUi?.close());
  });

  // 5. Bind Header Action Controls
  const btnSave = document.getElementById('btn-save-state');
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      const ok = saveGameState(currentState);
      if (ok) {
        btnSave.textContent = 'Saved!';
        setTimeout(() => {
          btnSave.textContent = 'Save';
        }, 1200);
      }
    });
  }

  scienceLogButton?.addEventListener('click', () => {
    if (scienceUi?.isOpen()) {
      scienceUi.close();
    } else {
      scienceUi?.openLog(currentState);
    }
    syncNavActiveStates();
  });

  resetButton?.addEventListener('click', () => resetChoiceUi?.show(resetButton ?? undefined));

  // Contain background focus when a blocking modal is open
  document.addEventListener('focusin', (event) => {
    const target = event.target as Node;
    if (scienceUi?.isOpen() && scienceContainer && !scienceContainer.contains(target)) {
      event.stopImmediatePropagation();
      scienceContainer.querySelector<HTMLElement>('[data-science-close]')?.focus({ preventScroll: true });
    } else if (resetChoiceContainer && !resetChoiceContainer.hidden && !resetChoiceContainer.contains(target)) {
      event.stopImmediatePropagation();
      resetChoiceContainer.querySelector<HTMLElement>('[data-reset-choice="replay"]')?.focus({ preventScroll: true });
    } else if (
      tutorialUi?.isVisible() &&
      tutorialContainer?.classList.contains('is-welcome') &&
      !tutorialContainer.contains(target)
    ) {
      event.stopImmediatePropagation();
      tutorialContainer.querySelector<HTMLElement>('[data-tutorial-start]')?.focus({ preventScroll: true });
    }
  });

  syncNavActiveStates();

  console.info('[OUTPOST: MARS] Phase 03 M1 Viewport loaded successfully.');
}

export function getActiveGameInstance(): Phaser.Game | null {
  return gameInstance;
}

// Boot application once DOM content is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
