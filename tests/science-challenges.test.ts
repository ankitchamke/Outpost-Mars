import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../src/core/state';
import {
  calculateSupplyPlan,
  completeScienceChallenge,
  normalizeCompletedScienceChallenges,
} from '../src/core/science-challenges';

describe('science challenge progress and estimates', () => {
  it('calculates transparent 30-day planning totals from the per-crewmember values', () => {
    expect(calculateSupplyPlan(4)).toEqual({
      crewCount: 4,
      days: 30,
      oxygenKg: 100.8,
      waterKg: 300,
    });
  });

  it('keeps mission objectives and Sol progress when logging a science challenge', () => {
    const state = {
      ...createInitialGameState(),
      sol: 3,
      missionObjectivesCompleted: ['sol-1-habitat', 'sol-2-solar-farm'],
      resources: {
        ...createInitialGameState().resources,
        stormShield: { current: 97, max: 100, unit: '%' },
      },
    };

    const outcome = completeScienceChallenge(state, 'solar-storm-alert', [
      { resource: 'stormShield', delta: 8, reason: 'training check' },
      { resource: 'power', delta: -2, reason: 'shelter systems' },
    ]);

    expect(outcome.firstCompletion).toBe(true);
    expect(outcome.state.sol).toBe(3);
    expect(outcome.state.missionObjectivesCompleted).toEqual(['sol-1-habitat', 'sol-2-solar-farm']);
    expect(outcome.state.completedScienceChallenges).toEqual(['solar-storm-alert']);
    expect(outcome.state.resources.stormShield.current).toBe(100);
    expect(outcome.resourceChanges[0]?.actualDelta).toBe(3);
  });

  it('does not apply a challenge resource effect more than once', () => {
    const state = {
      ...createInitialGameState(),
      completedScienceChallenges: ['solar-storm-alert'],
    };
    const outcome = completeScienceChallenge(state, 'solar-storm-alert', [
      { resource: 'power', delta: 10, reason: 'repeat' },
    ]);

    expect(outcome.firstCompletion).toBe(false);
    expect(outcome.resourceChanges).toEqual([]);
    expect(outcome.state.resources.power.current).toBe(45);
  });

  it('normalizes old or malformed Science Log entries', () => {
    expect(normalizeCompletedScienceChallenges([
      'radiation-detective',
      'unknown-entry',
      'radiation-detective',
      42,
    ])).toEqual(['radiation-detective']);
  });
});
