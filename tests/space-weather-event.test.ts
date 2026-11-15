import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../src/core/state';
import {
  HISTORICAL_DONKI_EVENT,
  applySpaceWeatherDecision,
  calculateMissionDebrief,
} from '../src/core/space-weather-event';
import { createDefaultOfflineLoader } from '../src/data/loader';

describe('NASA DONKI Space Weather Event & Debrief Engine', () => {
  it('correctly loads and references the bundled historical May 11, 2024 X5.8 flare', () => {
    // 1. Verify constant metadata
    expect(HISTORICAL_DONKI_EVENT.classType).toBe('X5.8');
    expect(HISTORICAL_DONKI_EVENT.activeRegion).toBe(13664);
    expect(HISTORICAL_DONKI_EVENT.flareId).toBe('2024-05-11T01:10:00-FLR-001');
    expect(HISTORICAL_DONKI_EVENT.instrument).toContain('GOES-P');
    expect(HISTORICAL_DONKI_EVENT.observationLocation).toBe('Earth Orbit (1 AU)');
    expect(HISTORICAL_DONKI_EVENT.limitations).toContain('does NOT measure radiation levels on the surface of Mars');

    // 2. Cross-verify with the actual offline bundled snapshot
    const loader = createDefaultOfflineLoader();
    const bundle = loader.loadAll();
    expect(bundle.success).toBe(true);

    const snapshotFlare = bundle.data.donki?.solarFlares.find((f) => f.classType === 'X5.8');
    expect(snapshotFlare).toBeDefined();
    expect(snapshotFlare?.activeRegionNum).toBe(13664);
    expect(snapshotFlare?.flareId).toBe('2024-05-11T01:10:00-FLR-001');
  });

  it('applies the "shelter" decision: increases storm shield and draws power', () => {
    const initialState = createInitialGameState();
    initialState.resources.power.current = 45;
    initialState.resources.stormShield.current = 70;

    const outcome = applySpaceWeatherDecision(initialState, 'shelter');

    expect(outcome.alreadyDecided).toBe(false);
    expect(outcome.decision).toBe('shelter');
    expect(outcome.state.spaceWeatherDecision).toBe('shelter');
    expect(outcome.state.spaceWeatherEventTriggered).toBe(true);

    // Power decreased by 10 kW (45 -> 35)
    expect(outcome.state.resources.power.current).toBe(35);
    // Storm shield increased by 18% (70 -> 88)
    expect(outcome.state.resources.stormShield.current).toBe(88);

    expect(outcome.resourceChanges).toHaveLength(2);
    expect(outcome.resourceChanges.some((c) => c.resource === 'power' && c.delta === -10)).toBe(true);
    expect(outcome.resourceChanges.some((c) => c.resource === 'stormShield' && c.delta === 18)).toBe(true);
  });

  it('handles low-power state gracefully during "shelter" decision without starving life support', () => {
    const initialState = createInitialGameState();
    // Only 8 kW power available: cannot draw full 10 kW without depleting reserve below 5 kW
    initialState.resources.power.current = 8;
    initialState.resources.stormShield.current = 50;

    const outcome = applySpaceWeatherDecision(initialState, 'shelter');

    expect(outcome.state.spaceWeatherDecision).toBe('shelter');
    // Draws 8 - 5 = 3 kW, leaving safe 5 kW
    expect(outcome.state.resources.power.current).toBe(5);
    // Gains proportional shielding: Math.round((3 / 10) * 18) = 5 -> max(6, 5) = 6%
    expect(outcome.state.resources.stormShield.current).toBe(56);
    expect(outcome.warningNotes).toBeDefined();
    expect(outcome.warningNotes).toContain('Emergency power throttling active');
  });

  it('applies the "power" decision: preserves power and incurs moderate shield degradation', () => {
    const initialState = createInitialGameState();
    initialState.resources.power.current = 40;
    initialState.resources.stormShield.current = 80;

    const outcome = applySpaceWeatherDecision(initialState, 'power');

    expect(outcome.alreadyDecided).toBe(false);
    expect(outcome.decision).toBe('power');
    expect(outcome.state.spaceWeatherDecision).toBe('power');
    expect(outcome.state.spaceWeatherEventTriggered).toBe(true);

    // Power increased by 8 kW (40 -> 48)
    expect(outcome.state.resources.power.current).toBe(48);
    // Storm shield reduced by 12% (80 -> 68)
    expect(outcome.state.resources.stormShield.current).toBe(68);
  });

  it('prevents repeated execution or exploitation of space-weather decisions', () => {
    const initialState = createInitialGameState();
    const firstOutcome = applySpaceWeatherDecision(initialState, 'shelter');
    expect(firstOutcome.alreadyDecided).toBe(false);

    // Attempt second execution
    const secondOutcome = applySpaceWeatherDecision(firstOutcome.state, 'power');
    expect(secondOutcome.alreadyDecided).toBe(true);
    expect(secondOutcome.decision).toBe('shelter'); // Preserves original decision
    expect(secondOutcome.resourceChanges).toHaveLength(0); // Zero additional changes
    expect(secondOutcome.state.resources.power.current).toBe(firstOutcome.state.resources.power.current);
    expect(secondOutcome.state.resources.stormShield.current).toBe(firstOutcome.state.resources.stormShield.current);
  });

  it('calculates comprehensive Mission Debrief across Science, Safety, and Sustainability', () => {
    const state = createInitialGameState();
    state.sol = 5;
    state.missionComplete = true;
    state.spaceWeatherDecision = 'shelter';
    state.completedScienceChallenges = ['solar-storm-alert', 'radiation-detective', 'supply-planner'];
    state.exploredBuildings = ['habitat', 'solar_farm', 'greenhouse', 'storm_shelter', 'mission_control'];
    state.resources.power.current = 50;
    state.resources.lifeSupport.current = 90;
    state.resources.stormShield.current = 85;
    state.crewSafety = 'nominal';

    const debrief = calculateMissionDebrief(state);

    expect(debrief.overallRank).toBe('gold');
    expect(debrief.overallRankTitle).toContain('OUTPOST COMMANDER');
    expect(debrief.averageScore).toBeGreaterThanOrEqual(80);

    // 1. Science
    expect(debrief.categories.science.score).toBe(100);
    expect(debrief.categories.science.tier).toBe('gold');
    expect(debrief.categories.science.summary).toContain('scientific investigation');

    // 2. Safety
    expect(debrief.categories.safety.score).toBe(100);
    expect(debrief.categories.safety.tier).toBe('gold');
    expect(debrief.categories.safety.summary).toContain('crew safety');

    // 3. Sustainability
    expect(debrief.categories.sustainability.score).toBeGreaterThan(80);
    expect(debrief.categories.sustainability.tier).toBe('gold');

    // Context note
    expect(debrief.nasaContextNote).toContain('Real Science vs. Game Simulation');
    expect(debrief.nasaContextNote).toContain('NASA DONKI satellites monitor real solar flares');
  });

  it('correctly evaluates lower performance in debrief for low-resource or caution states', () => {
    const state = createInitialGameState();
    state.sol = 5;
    state.missionComplete = true;
    state.spaceWeatherDecision = undefined; // Missed event
    state.completedScienceChallenges = []; // No challenges done
    state.exploredBuildings = ['habitat']; // Only 1 building visited
    state.resources.power.current = 8; // Low power
    state.resources.lifeSupport.current = 15; // Low life support
    state.resources.stormShield.current = 10; // Low shield
    state.crewSafety = 'danger';

    const debrief = calculateMissionDebrief(state);

    expect(debrief.overallRank).toBe('bronze');
    expect(debrief.categories.science.tier).toBe('bronze');
    expect(debrief.categories.safety.tier).toBe('bronze');
    expect(debrief.categories.sustainability.tier).toBe('bronze');
    expect(debrief.categories.safety.bulletPoints.some((b) => b.includes('danger'))).toBe(true);
  });
});
