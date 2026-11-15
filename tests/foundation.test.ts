import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../src/core/state';

describe('Project Foundation & State Baseline', () => {
  it('creates an authentic initial GameState for Sol 1', () => {
    const state = createInitialGameState();

    // Verify Sol progression baseline
    expect(state.sol).toBe(1);
    expect(state.crewCount).toBe(4);
    expect(state.crewSafety).toBe('nominal');

    // Verify the 3 Core Resources
    expect(state.resources.power).toBeDefined();
    expect(state.resources.power.current).toBeGreaterThan(0);
    expect(state.resources.power.unit).toBe('kW');

    expect(state.resources.lifeSupport).toBeDefined();
    expect(state.resources.lifeSupport.current).toBe(92);
    expect(state.resources.lifeSupport.unit).toBe('%');

    expect(state.resources.stormShield).toBeDefined();
    expect(state.resources.stormShield.current).toBe(85);
    expect(state.resources.stormShield.unit).toBe('%');

    // Verify NASA BVAD Life Support Baseline figures
    expect(state.lifeSupportDetails.oxygenKgPerDay).toBeCloseTo(0.84, 2);
    expect(state.lifeSupportDetails.waterLitersPerDay).toBeGreaterThanOrEqual(2.0);
    expect(state.lifeSupportDetails.nutritionKcalPerDay).toBeGreaterThanOrEqual(2700);

    // Verify 4 Essential MVP Modules
    const moduleIds = state.modules.map((m) => m.id);
    expect(moduleIds).toContain('habitat');
    expect(moduleIds).toContain('solar_array');
    expect(moduleIds).toContain('life_support');
    expect(moduleIds).toContain('storm_shelter');
    expect(state.modules.length).toBe(4);
  });
});
