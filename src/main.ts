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
import { SpaceWeatherDialogUI } from './ui/space-weather-dialog';
import { createDefaultOfflineLoader } from './data/loader';
import { audioManager } from './audio/audio-manager';

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
  const audioButton = document.getElementById('btn-audio');
  const audioPopover = document.getElementById('audio-settings-popover');
  const audioCloseBtn = document.getElementById('btn-audio-close');
  const sliderVolume = document.getElementById('slider-master-volume') as HTMLInputElement | null;
  const labelVolume = document.getElementById('label-master-volume');
  const toggleMusicBtn = document.getElementById('btn-toggle-music');
  const toggleSfxBtn = document.getElementById('btn-toggle-sfx');
  const muteAllBtn = document.getElementById('btn-mute-all');
  const audioIcon = document.getElementById('btn-audio-icon');
  const viewportContainer = document.querySelector('.viewport-container');

  const updateAudioUi = (): void => {
    const settings = audioManager.getSettings();
    const muted = audioManager.isMuted();

    if (sliderVolume) {
      sliderVolume.value = String(Math.round(settings.masterVolume * 100));
    }
    if (labelVolume) {
      labelVolume.textContent = `${Math.round(settings.masterVolume * 100)}%`;
    }
    if (toggleMusicBtn) {
      toggleMusicBtn.textContent = settings.musicEnabled ? 'ON' : 'OFF';
      toggleMusicBtn.classList.toggle('is-active', settings.musicEnabled);
      toggleMusicBtn.setAttribute('aria-pressed', String(settings.musicEnabled));
    }
    if (toggleSfxBtn) {
      toggleSfxBtn.textContent = settings.sfxEnabled ? 'ON' : 'OFF';
      toggleSfxBtn.classList.toggle('is-active', settings.sfxEnabled);
      toggleSfxBtn.setAttribute('aria-pressed', String(settings.sfxEnabled));
    }
    if (muteAllBtn) {
      muteAllBtn.textContent = muted ? 'Unmute All' : 'Mute All';
    }
    if (audioIcon) {
      if (muted) {
        audioIcon.innerHTML = `
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <line x1="23" y1="9" x2="17" y2="15"></line>
          <line x1="17" y1="9" x2="23" y2="15"></line>
        `;
      } else {
        audioIcon.innerHTML = `
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        `;
      }
    }
  };
  updateAudioUi();

  const unlockAudioOnGesture = (): void => {
    audioManager.unlock().catch(() => {});
  };
  window.addEventListener('pointerdown', unlockAudioOnGesture, { once: true });
  window.addEventListener('keydown', unlockAudioOnGesture, { once: true });

  function showHudToast(title: string, message: string, type: 'info' | 'success' | 'warning' = 'info'): void {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `hud-toast hud-toast-${type}`;
    toast.setAttribute('role', 'status');
    const icon = type === 'success' ? '✓' : type === 'warning' ? '⚠' : 'ℹ';
    toast.innerHTML = `
      <span class="hud-toast-icon" aria-hidden="true">${icon}</span>
      <div class="hud-toast-content">
        <strong class="hud-toast-title">${title}</strong>
        <span class="hud-toast-message">${message}</span>
      </div>
    `;
    container.appendChild(toast);

    window.requestAnimationFrame(() => {
      toast.classList.add('is-visible');
    });

    window.setTimeout(() => {
      toast.classList.remove('is-visible');
      toast.classList.add('is-dismissed');
      window.setTimeout(() => {
        toast.remove();
      }, 350);
    }, 3800);
  }

  const updateMissionStatusFooter = (): void => {
    if (!missionStatusFooter) return;
    const crewStatus = currentState.crewSafety === 'nominal' ? 'Crew nominal' : `Crew ${currentState.crewSafety}`;
    missionStatusFooter.textContent = currentState.missionComplete
      ? `Mission complete · ${crewStatus}`
      : `Sol ${currentState.sol}/5 · ${crewStatus}`;

    const dots = document.querySelectorAll<HTMLElement>('.mini-sol-dot');
    dots.forEach((dot, index) => {
      const solNum = index + 1;
      const isCompleted = currentState.missionComplete || currentState.sol > solNum;
      const isCurrent = !currentState.missionComplete && currentState.sol === solNum;
      dot.classList.toggle('is-complete', isCompleted);
      dot.classList.toggle('is-active', isCurrent);
    });
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
  let spaceWeatherUi: SpaceWeatherDialogUI | null = null;
  let tutorialUi: FirstTimeTutorialUI | null = null;
  let resetChoiceUi: MissionResetChoiceUI | null = null;
  let nearbyBuilding: BuildingData | null = null;

  const spaceWeatherContainer = document.getElementById('space-weather-container');
  if (spaceWeatherContainer) {
    spaceWeatherUi = new SpaceWeatherDialogUI(spaceWeatherContainer, {
      onDecisionConfirmed: (outcome) => {
        currentState = outcome.state;
        saveGameState(currentState);
        updateMissionStatusFooter();
        hud?.update(currentState);
        interactionUi?.renderObjectives(currentState);
        audioManager.playSfx('taskComplete');
        showHudToast(
          'Space Weather Strategy Logged',
          outcome.decision === 'shelter'
            ? 'Storm Shelter bulkheads fortified (+18% shield).'
            : 'Colony power conserved (+8 kW power).',
          'success'
        );
      },
      onClose: () => {
        focusGame();
      },
    });
  }

  const focusGame = (): void => {
    gameInstance?.canvas.focus({ preventScroll: true });
  };

  const syncNavActiveStates = (): void => {
    const isScienceOpen = scienceUi?.isOpen() ?? false;
    const isHelpOpen = tutorialUi?.isVisible() ?? false;
    const isAudioOpen = audioPopover && !audioPopover.hidden;

    if (scienceLogButton) {
      scienceLogButton.classList.toggle('is-active', isScienceOpen);
      scienceLogButton.setAttribute('aria-pressed', isScienceOpen ? 'true' : 'false');
    }

    if (helpButton) {
      helpButton.classList.toggle('is-active', isHelpOpen);
      helpButton.setAttribute('aria-pressed', isHelpOpen ? 'true' : 'false');
    }

    if (audioButton) {
      audioButton.classList.toggle('is-active', Boolean(isAudioOpen));
      audioButton.setAttribute('aria-expanded', isAudioOpen ? 'true' : 'false');
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
      onOpenSpaceWeatherEvent: () => spaceWeatherUi?.open(currentState),
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
        if (outcome.state.missionComplete) {
          audioManager.playSfx('missionComplete');
        } else if (outcome.firstCompletion) {
          audioManager.playSfx('taskComplete');
        }
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
    spaceWeatherUi?.close();
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
    audioManager.playSfx('help');
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
    (window as unknown as { __OUTPOST_GAME__?: Phaser.Game }).__OUTPOST_GAME__ = gameInstance;
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
      audioManager.playSfx('buildingInspect');
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
      if (outcome.completedObjective) {
        if (outcome.state.missionComplete) {
          audioManager.playSfx('missionComplete');
        } else {
          audioManager.playSfx('taskComplete');
        }
        showHudToast('Objective Complete +1', `Sol ${outcome.completedObjective.sol}: ${outcome.completedObjective.title}`, 'success');

        if (outcome.nextObjective?.sol === 4 && !currentState.spaceWeatherEventTriggered) {
          window.setTimeout(() => {
            if (!spaceWeatherUi?.isOpen() && !scienceUi?.isOpen()) {
              showHudToast('Space Weather Alert', 'NASA DONKI advisory logged. Prepare Storm Shelter.', 'warning');
              spaceWeatherUi?.open(currentState);
            }
          }, 1500);
        }
      }
      tutorialUi?.markBuildingInteracted();
    });
    gameInstance.events.on(BUILDING_INTERACTION_EVENTS.panelClose, () => interactionUi?.close());

    if (currentState.sol === 4 && !currentState.spaceWeatherEventTriggered && !currentState.spaceWeatherDecision) {
      window.setTimeout(() => {
        if (!spaceWeatherUi?.isOpen() && !scienceUi?.isOpen()) {
          showHudToast('Space Weather Alert', 'NASA DONKI advisory logged. Prepare Storm Shelter.', 'warning');
          spaceWeatherUi?.open(currentState);
        }
      }, 2000);
    }
  });

  // 5. Bind Header Action Controls
  const btnSave = document.getElementById('btn-save-state');
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      audioManager.playSfx('save');
      const ok = saveGameState(currentState);
      if (ok) {
        const label = btnSave.querySelector<HTMLElement>('.btn-label');
        if (label) {
          label.textContent = 'Saved!';
          window.setTimeout(() => {
            label.textContent = 'Save';
          }, 1500);
        } else {
          btnSave.textContent = 'Saved!';
          window.setTimeout(() => {
            btnSave.textContent = 'Save';
          }, 1500);
        }
        showHudToast('Mission Saved', 'Current outpost telemetry recorded to local storage.', 'success');
      }
    });
  }

  scienceLogButton?.addEventListener('click', () => {
    audioManager.playSfx('scienceLog');
    if (scienceUi?.isOpen()) {
      scienceUi.close();
    } else {
      scienceUi?.openLog(currentState);
    }
    syncNavActiveStates();
  });

  resetButton?.addEventListener('click', () => {
    audioManager.playSfx('resetWarning');
    resetChoiceUi?.show(resetButton ?? undefined);
  });

  audioButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    audioManager.unlock().catch(() => {});
    if (audioPopover) {
      audioPopover.hidden = !audioPopover.hidden;
      syncNavActiveStates();
      if (!audioPopover.hidden) {
        sliderVolume?.focus({ preventScroll: true });
      }
    }
  });

  audioCloseBtn?.addEventListener('click', () => {
    if (audioPopover) {
      audioPopover.hidden = true;
      syncNavActiveStates();
      audioButton?.focus({ preventScroll: true });
    }
  });

  sliderVolume?.addEventListener('input', () => {
    const vol = Number(sliderVolume.value) / 100;
    audioManager.setMasterVolume(vol);
    updateAudioUi();
  });

  toggleMusicBtn?.addEventListener('click', () => {
    audioManager.toggleMusic();
    updateAudioUi();
  });

  toggleSfxBtn?.addEventListener('click', () => {
    const enabled = audioManager.toggleSfx();
    if (enabled) {
      audioManager.playSfx('help');
    }
    updateAudioUi();
  });

  muteAllBtn?.addEventListener('click', () => {
    audioManager.toggleMuteAll();
    updateAudioUi();
  });

  // Close audio popover on click outside or Escape
  document.addEventListener('click', (event) => {
    if (audioPopover && !audioPopover.hidden) {
      const target = event.target as Node;
      if (!audioPopover.contains(target) && !audioButton?.contains(target)) {
        audioPopover.hidden = true;
        syncNavActiveStates();
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && audioPopover && !audioPopover.hidden) {
      audioPopover.hidden = true;
      syncNavActiveStates();
      audioButton?.focus({ preventScroll: true });
    }
  });

  // Contain background focus when a blocking modal is open
  document.addEventListener('focusin', (event) => {
    const target = event.target as Node;
    if (scienceUi?.isOpen() && scienceContainer && !scienceContainer.contains(target)) {
      event.stopImmediatePropagation();
      scienceContainer.querySelector<HTMLElement>('[data-science-close]')?.focus({ preventScroll: true });
    } else if (resetChoiceContainer && !resetChoiceContainer.hidden && !resetChoiceContainer.contains(target)) {
      event.stopImmediatePropagation();
      resetChoiceContainer.querySelector<HTMLElement>('[data-reset-choice="replay"]')?.focus({ preventScroll: true });
    } else if (spaceWeatherUi?.isOpen() && spaceWeatherContainer && !spaceWeatherContainer.contains(target)) {
      event.stopImmediatePropagation();
      spaceWeatherContainer.querySelector<HTMLElement>('[data-weather-choice], [data-weather-confirm], [data-weather-close], [data-weather-done]')?.focus({ preventScroll: true });
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
