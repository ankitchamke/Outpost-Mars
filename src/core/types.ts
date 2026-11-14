/**
 * OUTPOST: MARS — Core Simulation Types
 * Aligned with .planning/PROJECT.md and .planning/REQUIREMENTS.md
 */

export type ResourceKey = 'power' | 'lifeSupport' | 'stormShield';

export type CrewSafetyStatus = 'nominal' | 'caution' | 'danger';

export interface ResourceState {
  current: number;
  max: number;
  unit: string;
}

export interface LifeSupportSubValues {
  oxygenKgPerDay: number; // NASA BVAD standard ~0.84 kg/person-day
  waterLitersPerDay: number; // NASA BVAD direct intake ~2.0-2.5 L/person-day
  nutritionKcalPerDay: number; // NASA BVAD ~2700-3000 kcal/person-day
}

export type ModuleId = 'habitat' | 'solar_array' | 'life_support' | 'storm_shelter';

export interface BaseModule {
  id: ModuleId;
  name: string;
  status: 'active' | 'idle' | 'degraded';
  powerDrawKw: number;
}

export interface GameState {
  sol: number;
  missionId: string;
  missionName: string;
  crewCount: number;
  crewSafety: CrewSafetyStatus;
  resources: {
    power: ResourceState;
    lifeSupport: ResourceState;
    stormShield: ResourceState;
  };
  lifeSupportDetails: LifeSupportSubValues;
  modules: BaseModule[];
  createdAt: number;
  lastSavedAt: number;
}
