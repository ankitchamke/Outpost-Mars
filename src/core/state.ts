import { GameState } from './types';

/**
 * Creates the initial baseline state for Mission 1 (Touchdown).
 * Values reflect the 3 managed resources + Crew Safety outcome indicator.
 */
export function createInitialGameState(): GameState {
  const now = Date.now();
  return {
    sol: 1,
    missionId: 'mission-01',
    missionName: 'Touchdown & Life Support',
    crewCount: 4,
    crewSafety: 'nominal',
    resources: {
      power: {
        current: 45,
        max: 60,
        unit: 'kW',
      },
      lifeSupport: {
        current: 92,
        max: 100,
        unit: '%',
      },
      stormShield: {
        current: 85,
        max: 100,
        unit: '%',
      },
    },
    lifeSupportDetails: {
      oxygenKgPerDay: 0.84, // NASA BVAD standard
      waterLitersPerDay: 2.5, // NASA BVAD direct intake
      nutritionKcalPerDay: 2800, // NASA BVAD daily caloric intake
    },
    modules: [
      { id: 'habitat', name: 'Crew Habitat & Comms', status: 'active', powerDrawKw: 15 },
      { id: 'solar_array', name: 'Photovoltaic Array & Battery', status: 'active', powerDrawKw: 0 },
      { id: 'life_support', name: 'Atmospheric & Water Recycling', status: 'active', powerDrawKw: 18 },
      { id: 'storm_shelter', name: 'Regolith Storm Shelter', status: 'idle', powerDrawKw: 5 },
    ],
    createdAt: now,
    lastSavedAt: now,
  };
}
