import './assets/styles.css';
import { createInitialGameState } from './core/state';
import { clearGameState, loadGameState, saveGameState } from './core/storage';
import { GameState } from './core/types';
import { MarsCanvasRenderer } from './rendering/canvas';
import { OutpostHud } from './ui/hud';

// Application State
let currentState: GameState;

function initApp(): void {
  // 1. Restore state from localStorage or create baseline
  const savedState = loadGameState();
  if (savedState) {
    currentState = savedState;
    console.info('[OUTPOST: MARS] Restored saved mission state from localStorage.');
  } else {
    currentState = createInitialGameState();
    saveGameState(currentState);
    console.info('[OUTPOST: MARS] Initialized new baseline mission state.');
  }

  // 2. Initialize Canvas Renderer
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('[OUTPOST: MARS] Viewport canvas element (#game-canvas) not found.');
    return;
  }
  const renderer = new MarsCanvasRenderer(canvas);
  renderer.render();

  // 3. Initialize HUD Telemetry
  const hudContainer = document.getElementById('hud-container');
  let hud: OutpostHud | null = null;
  if (hudContainer) {
    hud = new OutpostHud(hudContainer);
    hud.update(currentState);
  }

  // 4. Bind Header Action Controls
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

  const btnReset = document.getElementById('btn-reset-state');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      clearGameState();
      currentState = createInitialGameState();
      saveGameState(currentState);
      if (hud) hud.update(currentState);
      btnReset.textContent = 'Reset!';
      setTimeout(() => {
        btnReset.textContent = 'Reset';
      }, 1200);
    });
  }

  console.info('[OUTPOST: MARS] Phase 01 Foundation loaded successfully.');
}

// Boot application once DOM content is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
