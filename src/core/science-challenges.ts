import type { GameState, ResourceKey } from './types';
import { normalizeFiveSolMissionState } from './mission';

export const SCIENCE_CHALLENGES = [
  { id: 'solar-storm-alert', title: 'Solar Storm Alert' },
  { id: 'radiation-detective', title: 'Radiation Detective' },
  { id: 'supply-planner', title: '30-Day Supply Problem' },
] as const;

export type ScienceChallengeId = (typeof SCIENCE_CHALLENGES)[number]['id'];

export interface ScienceResourceEffect {
  resource: ResourceKey;
  delta: number;
  reason: string;
}

export interface ScienceResourceChange extends ScienceResourceEffect {
  actualDelta: number;
  unit: string;
}

export interface ScienceChallengeOutcome {
  state: GameState;
  firstCompletion: boolean;
  resourceChanges: ScienceResourceChange[];
}

export interface SupplyPlanEstimate {
  crewCount: number;
  days: number;
  oxygenKg: number;
  waterKg: number;
}

const KNOWN_CHALLENGE_IDS = new Set<string>(SCIENCE_CHALLENGES.map(({ id }) => id));

export function normalizeCompletedScienceChallenges(value: unknown): ScienceChallengeId[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value.filter((id): id is ScienceChallengeId => typeof id === 'string' && KNOWN_CHALLENGE_IDS.has(id))
  ));
}

/** Completes a science activity once and safely applies any explicitly simulated resource effects. */
export function completeScienceChallenge(
  inputState: GameState,
  id: ScienceChallengeId,
  effects: ScienceResourceEffect[] = []
): ScienceChallengeOutcome {
  const completed = normalizeCompletedScienceChallenges(inputState.completedScienceChallenges);
  if (completed.includes(id)) {
    return {
      state: { ...inputState, completedScienceChallenges: completed },
      firstCompletion: false,
      resourceChanges: [],
    };
  }

  const state = normalizeFiveSolMissionState(inputState);
  const resources: GameState['resources'] = {
    power: { ...state.resources.power },
    lifeSupport: { ...state.resources.lifeSupport },
    stormShield: { ...state.resources.stormShield },
  };
  const resourceChanges: ScienceResourceChange[] = [];

  for (const effect of effects) {
    if (!Number.isFinite(effect.delta)) continue;
    const resource = resources[effect.resource];
    const before = Math.min(resource.max, Math.max(0, resource.current));
    const after = Math.min(resource.max, Math.max(0, before + effect.delta));
    const actualDelta = after - before;
    resource.current = after;
    if (actualDelta !== 0) {
      resourceChanges.push({ ...effect, actualDelta, unit: resource.unit });
    }
  }

  const nextState = normalizeFiveSolMissionState({
    ...state,
    resources,
    completedScienceChallenges: [...completed, id],
  });
  return { state: nextState, firstCompletion: true, resourceChanges };
}

/**
 * GAME-SIMPLIFIED planning calculation using the displayed per-crewmember BVAD values:
 * 0.84 kg O₂/day and 2.50 kg potable water/day (2.00 drinking + 0.50 food rehydration).
 */
export function calculateSupplyPlan(crewCount: number, days = 30): SupplyPlanEstimate {
  const crew = Math.max(1, Math.min(8, Math.round(Number.isFinite(crewCount) ? crewCount : 1)));
  const duration = Math.max(1, Math.min(365, Math.round(Number.isFinite(days) ? days : 30)));
  return {
    crewCount: crew,
    days: duration,
    oxygenKg: crew * duration * 0.84,
    waterKg: crew * duration * 2.5,
  };
}
