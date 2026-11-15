import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialGameState } from '../src/core/state';
import { clearGameState, loadGameState, saveGameState } from '../src/core/storage';

describe('Storage Persistence (TECH-02)', () => {
  const TEST_KEY = 'test_outpost_mars_state';

  beforeEach(() => {
    clearGameState(TEST_KEY);
  });

  it('saves and loads GameState correctly', () => {
    const originalState = createInitialGameState();
    originalState.sol = 5;
    originalState.resources.power.current = 32;

    const saved = saveGameState(originalState, TEST_KEY);
    expect(saved).toBe(true);

    const loaded = loadGameState(TEST_KEY);
    expect(loaded).not.toBeNull();
    expect(loaded?.sol).toBe(5);
    expect(loaded?.resources.power.current).toBe(32);
    expect(loaded?.crewSafety).toBe('nominal');
    expect(loaded?.lastSavedAt).toBeGreaterThan(0);
  });

  it('persists five-Sol progress, discoveries, and resource levels', () => {
    const state = createInitialGameState();
    state.sol = 3;
    state.missionObjectivesCompleted = ['sol-1-habitat', 'sol-2-solar-farm'];
    state.exploredBuildings = ['habitat', 'solar_farm'];
    state.resources.power.current = 53;
    state.crewSafety = 'nominal';
    state.tutorialCompleted = true;

    expect(saveGameState(state, TEST_KEY)).toBe(true);
    const loaded = loadGameState(TEST_KEY);

    expect(loaded?.sol).toBe(3);
    expect(loaded?.missionObjectivesCompleted).toEqual(['sol-1-habitat', 'sol-2-solar-farm']);
    expect(loaded?.exploredBuildings).toEqual(['habitat', 'solar_farm']);
    expect(loaded?.resources.power.current).toBe(53);
    expect(loaded?.tutorialCompleted).toBe(true);
  });

  it('clears saved state cleanly', () => {
    const originalState = createInitialGameState();
    saveGameState(originalState, TEST_KEY);
    expect(loadGameState(TEST_KEY)).not.toBeNull();

    clearGameState(TEST_KEY);
    expect(loadGameState(TEST_KEY)).toBeNull();
  });

  it('returns null when loading non-existent key', () => {
    expect(loadGameState('non_existent_key_999')).toBeNull();
  });
});
