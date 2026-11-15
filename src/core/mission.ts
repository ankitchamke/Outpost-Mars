import type { GameState, ResourceKey } from './types';

export const FIVE_SOL_OBJECTIVES = [
  {
    id: 'sol-1-habitat',
    sol: 1,
    buildingId: 'habitat',
    title: 'Inspect the Habitat',
    action: 'Verify the life-support systems.',
    lesson: 'A pressurized habitat keeps breathable air inside; crews also recycle water and plan for radiation protection.',
    effects: [{ resource: 'lifeSupport', amount: 6, reason: 'Air and water system checks restored life-support reserve.' }],
  },
  {
    id: 'sol-2-solar-farm',
    sol: 2,
    buildingId: 'solar_farm',
    title: 'Check the Solar Farm',
    action: 'Confirm the colony has stored power.',
    lesson: 'Solar cells turn sunlight into electricity, and batteries can save energy for later.',
    effects: [{ resource: 'power', amount: 12, reason: 'Battery checks made stored solar energy available.' }],
  },
  {
    id: 'sol-3-greenhouse',
    sol: 3,
    buildingId: 'greenhouse',
    title: 'Review Greenhouse Systems',
    action: 'Check plant-growing and water-recovery systems.',
    lesson: 'Plants need controlled light, air, water and temperature; recycling water helps conserve supplies.',
    effects: [
      { resource: 'power', amount: -2, reason: 'Grow lights and temperature controls use colony power.' },
      { resource: 'lifeSupport', amount: 4, reason: 'A water-recovery check improved the mission life-support reserve.' },
    ],
  },
  {
    id: 'sol-4-storm-shelter',
    sol: 4,
    buildingId: 'storm_shelter',
    title: 'Prepare the Storm Shelter',
    action: 'Check shielding and the crew retreat plan.',
    lesson: 'Thick shielding can reduce radiation exposure; Curiosity’s RAD sensor measured radiation at Gale Crater.',
    effects: [
      { resource: 'power', amount: -2, reason: 'Shelter sealing and readiness checks use a little power.' },
      { resource: 'stormShield', amount: 12, reason: 'The shelter check improved storm-shield readiness.' },
    ],
  },
  {
    id: 'sol-5-mission-control',
    sol: 5,
    buildingId: 'mission_control',
    title: 'Review the Colony',
    action: 'Visit Mission Control and complete the five-Sol review.',
    lesson: 'Radio messages between Mars and Earth take time to travel, so crews plan for communication delays.',
    effects: [{ resource: 'power', amount: -2, reason: 'The final data review and communications use a little power.' }],
  },
] as const;

export type MissionObjective = (typeof FIVE_SOL_OBJECTIVES)[number];

export interface MissionResourceChange {
  resource: ResourceKey;
  delta: number;
  unit: string;
  reason: string;
}

export interface MissionInteractionOutcome {
  state: GameState;
  completedObjective?: MissionObjective;
  nextObjective?: MissionObjective;
  resourceChanges: MissionResourceChange[];
  recoveredResource?: ResourceKey;
  missionCompleted: boolean;
}

const RESOURCE_NAMES: Record<ResourceKey, string> = {
  power: 'Power',
  lifeSupport: 'Life Support',
  stormShield: 'Storm Shielding',
};

const RESOURCE_RECOVERY: Partial<
  Record<string, { resource: ResourceKey; percent: number; reason: string }>
> = {
  habitat: { resource: 'lifeSupport', percent: 0.2, reason: 'Habitat recovery check restored emergency air and water reserves.' },
  solar_farm: { resource: 'power', percent: 0.25, reason: 'Solar Farm battery check brought stored power online.' },
  storm_shelter: { resource: 'stormShield', percent: 0.25, reason: 'Storm Shelter readiness check restored shielding capacity.' },
};

export function normalizeFiveSolMissionState(state: GameState): GameState {
  const knownObjectiveIds = new Set<string>(FIVE_SOL_OBJECTIVES.map((objective) => objective.id));
  const hasMissionProgress = Array.isArray(state.missionObjectivesCompleted);
  const completedObjectives = hasMissionProgress
    ? Array.from(new Set(state.missionObjectivesCompleted!.filter((id) => knownObjectiveIds.has(id))))
    : [];
  const missionComplete = Boolean(state.missionComplete) || completedObjectives.length === FIVE_SOL_OBJECTIVES.length;
  const migratedSol = hasMissionProgress ? state.sol : 1;
  const sol = Math.max(1, Math.min(5, Math.floor(Number.isFinite(migratedSol) ? migratedSol : 1)));

  const defaults: GameState['resources'] = {
    power: { current: 45, max: 60, unit: 'kW' },
    lifeSupport: { current: 92, max: 100, unit: '%' },
    stormShield: { current: 85, max: 100, unit: '%' },
  };
  const resources = { ...defaults };
  for (const key of Object.keys(defaults) as ResourceKey[]) {
    const value = state.resources?.[key];
    const max = value && Number.isFinite(value.max) && value.max > 0 ? value.max : defaults[key].max;
    const current = value && Number.isFinite(value.current) ? Math.min(max, Math.max(0, value.current)) : 0;
    resources[key] = {
      current,
      max,
      unit: value && typeof value.unit === 'string' ? value.unit : defaults[key].unit,
    };
  }

  const normalized: GameState = {
    ...state,
    resources,
    missionName: 'Five-Sol Colony Survival',
    sol: missionComplete ? 5 : sol,
    missionObjectivesCompleted: completedObjectives,
    missionComplete,
    spaceWeatherDecision:
      state.spaceWeatherDecision === 'shelter' || state.spaceWeatherDecision === 'power'
        ? state.spaceWeatherDecision
        : undefined,
    spaceWeatherEventTriggered: Boolean(state.spaceWeatherEventTriggered),
  };
  normalized.crewSafety = assessCrewSafety(normalized);
  return normalized;
}

export function getCurrentMissionObjective(state: GameState): MissionObjective | undefined {
  if (state.missionComplete) return undefined;
  return FIVE_SOL_OBJECTIVES.find((objective) => objective.sol === state.sol);
}

export function completeBuildingMissionTask(
  inputState: GameState,
  buildingId: string
): MissionInteractionOutcome {
  let state = normalizeFiveSolMissionState(inputState);
  const resourceChanges: MissionResourceChange[] = [];
  const currentObjective = getCurrentMissionObjective(state);
  const completedObjective = currentObjective?.buildingId === buildingId ? currentObjective : undefined;

  if (completedObjective) {
    for (const effect of completedObjective.effects) {
      applyResourceChange(state, effect.resource, effect.amount, effect.reason, resourceChanges);
    }
    state.missionObjectivesCompleted = [
      ...(state.missionObjectivesCompleted ?? []),
      completedObjective.id,
    ];

    if (completedObjective.sol < FIVE_SOL_OBJECTIVES.length) {
      applyResourceChange(state, 'power', -2, 'Routine colony systems used power during the next Sol.', resourceChanges);
      applyResourceChange(state, 'lifeSupport', -1, 'Crew air and water use lowered the reserve slightly during the next Sol.', resourceChanges);
      state.sol = completedObjective.sol + 1;
    } else {
      state.missionComplete = true;
      state.sol = 5;
    }
  }

  let recoveredResource: ResourceKey | undefined;
  const recovery = RESOURCE_RECOVERY[buildingId];
  if (recovery) {
    const resource = state.resources[recovery.resource];
    const criticalThreshold = resource.max * 0.2;
    if (resource.current <= criticalThreshold) {
      const amount = Math.max(1, Math.ceil(resource.max * recovery.percent));
      const change = applyResourceChange(state, recovery.resource, amount, recovery.reason, resourceChanges);
      if (change > 0) recoveredResource = recovery.resource;
    }
  }

  state = { ...state, crewSafety: assessCrewSafety(state) };
  const nextObjective = getCurrentMissionObjective(state);

  return {
    state,
    completedObjective,
    nextObjective,
    resourceChanges,
    recoveredResource,
    missionCompleted: Boolean(state.missionComplete),
  };
}

function applyResourceChange(
  state: GameState,
  resourceKey: ResourceKey,
  requestedDelta: number,
  reason: string,
  changeList: MissionResourceChange[]
): number {
  const resource = state.resources[resourceKey];
  const max = Number.isFinite(resource.max) && resource.max > 0 ? resource.max : 0;
  const before = Number.isFinite(resource.current)
    ? Math.min(max, Math.max(0, resource.current))
    : 0;
  const after = Math.min(max, Math.max(0, before + requestedDelta));
  resource.max = max;
  const actualDelta = after - before;
  resource.current = after;

  if (actualDelta !== 0) {
    changeList.push({ resource: resourceKey, delta: actualDelta, unit: resource.unit, reason });
  }
  return actualDelta;
}

function assessCrewSafety(state: GameState): GameState['crewSafety'] {
  const reserves = Object.values(state.resources).map((resource) =>
    resource.max > 0 ? resource.current / resource.max : 0
  );
  const lowestReserve = Math.min(...reserves);
  if (lowestReserve <= 0.1) return 'danger';
  if (lowestReserve <= 0.2) return 'caution';
  return 'nominal';
}

export function getResourceName(resource: ResourceKey): string {
  return RESOURCE_NAMES[resource];
}
