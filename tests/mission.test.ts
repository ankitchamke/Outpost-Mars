import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../src/core/state';
import {
  completeBuildingMissionTask,
  FIVE_SOL_OBJECTIVES,
  normalizeFiveSolMissionState,
} from '../src/core/mission';

describe('Five-Sol colony survival mission', () => {
  it('keeps the current objective active until its matching building is visited', () => {
    const initial = normalizeFiveSolMissionState(createInitialGameState());
    const wrongBuilding = completeBuildingMissionTask(initial, 'solar_farm');

    expect(wrongBuilding.completedObjective).toBeUndefined();
    expect(wrongBuilding.state.sol).toBe(1);
    expect(wrongBuilding.state.missionObjectivesCompleted).toEqual([]);
  });

  it('completes all five Sols in order and keeps resources within their limits', () => {
    let state = normalizeFiveSolMissionState(createInitialGameState());

    for (const objective of FIVE_SOL_OBJECTIVES) {
      const result = completeBuildingMissionTask(state, objective.buildingId);
      expect(result.completedObjective?.id).toBe(objective.id);
      state = result.state;
    }

    expect(state.missionComplete).toBe(true);
    expect(state.sol).toBe(5);
    expect(state.missionObjectivesCompleted).toHaveLength(5);
    expect(state.crewSafety).toBe('nominal');
    for (const resource of Object.values(state.resources)) {
      expect(resource.current).toBeGreaterThanOrEqual(0);
      expect(resource.current).toBeLessThanOrEqual(resource.max);
    }
  });

  it('offers deterministic recovery at a resource-support building when a reserve is critical', () => {
    const state = normalizeFiveSolMissionState(createInitialGameState());
    state.resources.power.current = 8;

    const result = completeBuildingMissionTask(state, 'solar_farm');

    expect(result.recoveredResource).toBe('power');
    expect(result.state.resources.power.current).toBeGreaterThan(8);
    expect(result.resourceChanges.some((change) => change.reason.includes('stored power'))).toBe(true);
  });

  it('migrates older saves without mission task progress to Sol 1', () => {
    const olderSave = createInitialGameState();
    olderSave.sol = 4;
    delete olderSave.missionObjectivesCompleted;

    expect(normalizeFiveSolMissionState(olderSave).sol).toBe(1);
  });
});
