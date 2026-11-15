/**
 * OUTPOST: MARS — NASA DONKI Space Weather Mission Event & Debrief Engine
 * Educational integration of real historical NASA DONKI observation (May 11, 2024 X5.8 flare)
 * with meaningful gameplay trade-offs and five-Sol end-of-campaign debriefing.
 */

import type { GameState, ResourceKey } from './types';
import { normalizeFiveSolMissionState } from './mission';

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

export type SpaceWeatherChoice = 'shelter' | 'power';

export interface SpaceWeatherObservationData {
  flareId: string;
  classType: string;
  timestampUtc: string;
  sourceLocation: string;
  activeRegion: number;
  instrument: string;
  observationLocation: string;
  linkedCmeId: string;
  limitations: string;
  educationalContext: string;
}

export const HISTORICAL_DONKI_EVENT: SpaceWeatherObservationData = {
  flareId: '2024-05-11T01:10:00-FLR-001',
  classType: 'X5.8',
  timestampUtc: '2024-05-11 01:23 UTC',
  sourceLocation: 'S17W47',
  activeRegion: 13664,
  instrument: 'GOES-P: EXIS 1.0-8.0 X-ray Sensor',
  observationLocation: 'Earth Orbit (1 AU)',
  linkedCmeId: '2024-05-11T01:36:00-CME-001',
  limitations:
    'NASA DONKI records solar flares and modeled CME shock transit from Earth-orbiting satellites. It does NOT measure radiation levels on the surface of Mars.',
  educationalContext:
    'In this fictional Mars outpost simulation, real NASA satellite data provides historical space-weather awareness. The radiation effects and resource decisions below are game-simplified training scenarios.',
};

export interface SpaceWeatherResourceDelta {
  resource: ResourceKey;
  delta: number;
  unit: string;
  reason: string;
}

export interface SpaceWeatherDecisionOutcome {
  state: GameState;
  decision: SpaceWeatherChoice;
  alreadyDecided: boolean;
  resourceChanges: SpaceWeatherResourceDelta[];
  explanation: string;
  warningNotes?: string;
}

export interface DebriefCategoryScore {
  category: 'science' | 'safety' | 'sustainability';
  title: string;
  icon: string;
  score: number; // 0 to 100
  tier: 'gold' | 'silver' | 'bronze';
  summary: string;
  bulletPoints: string[];
}

export interface MissionDebrief {
  overallRank: 'gold' | 'silver' | 'bronze';
  overallRankTitle: string;
  averageScore: number;
  categories: {
    science: DebriefCategoryScore;
    safety: DebriefCategoryScore;
    sustainability: DebriefCategoryScore;
  };
  nasaContextNote: string;
}

/**
 * Applies the player's strategic response to the NASA DONKI space-weather advisory.
 * Handles low-resource states gracefully without arbitrary resource depletion.
 */
export function applySpaceWeatherDecision(
  inputState: GameState,
  choice: SpaceWeatherChoice
): SpaceWeatherDecisionOutcome {
  const state = normalizeFiveSolMissionState(inputState);

  // Prevent duplicate execution / exploitation
  if (state.spaceWeatherDecision) {
    return {
      state,
      decision: state.spaceWeatherDecision,
      alreadyDecided: true,
      resourceChanges: [],
      explanation: `The colony already logged a decision for this event: ${
        state.spaceWeatherDecision === 'shelter' ? 'Fortify Storm Shelter' : 'Conserve Colony Power'
      }.`,
    };
  }

  const resourceChanges: SpaceWeatherResourceDelta[] = [];
  const power = state.resources.power;
  const stormShield = state.resources.stormShield;

  let explanation = '';
  let warningNotes: string | undefined;

  if (choice === 'shelter') {
    // Option A: Prioritize Storm Shelter
    // Normal: -10 kW Power, +18% Storm Shielding
    const requestedPower = 10;
    let actualPowerCost = requestedPower;
    let shieldGain = 18;

    // Graceful handling for low power: leave at least 5 kW for life support
    if (power.current < requestedPower + 5) {
      const availableDraw = Math.max(0, power.current - 5);
      actualPowerCost = Math.min(requestedPower, availableDraw);
      // Proportionally scale shielding gain
      shieldGain = Math.max(6, Math.round((actualPowerCost / requestedPower) * 18));
      warningNotes =
        actualPowerCost < requestedPower
          ? 'Emergency power throttling active: reserved 5 kW for critical life support, providing partial shelter fortification.'
          : undefined;
    }

    // Apply Power Cost
    if (actualPowerCost > 0) {
      power.current = Math.max(0, power.current - actualPowerCost);
      resourceChanges.push({
        resource: 'power',
        delta: -actualPowerCost,
        unit: power.unit,
        reason: 'Shelter airlock seals and magnetic deflection coils drew electrical power.',
      });
    }

    // Apply Shielding Gain
    const shieldBefore = stormShield.current;
    stormShield.current = Math.min(stormShield.max, stormShield.current + shieldGain);
    const actualShieldGain = stormShield.current - shieldBefore;
    if (actualShieldGain > 0) {
      resourceChanges.push({
        resource: 'stormShield',
        delta: actualShieldGain,
        unit: stormShield.unit,
        reason: 'Reinforced regolith shielding and pre-charged coils raised storm readiness.',
      });
    }

    explanation =
      'The crew was ordered into the regolith Storm Shelter with reinforced magnetic coils, prioritizing crew radiation protection.';
  } else {
    // Option B: Preserve Colony Power
    // Normal: +8 kW Power, -12% Storm Shielding
    const requestedShieldLoss = 12;
    const shieldBefore = stormShield.current;
    stormShield.current = Math.max(0, stormShield.current - requestedShieldLoss);
    const actualShieldLoss = shieldBefore - stormShield.current;

    if (actualShieldLoss > 0) {
      resourceChanges.push({
        resource: 'stormShield',
        delta: -actualShieldLoss,
        unit: stormShield.unit,
        reason: 'Exterior sensors and unshielded surface arrays experienced minor particle degradation.',
      });
    }

    const powerBefore = power.current;
    power.current = Math.min(power.max, power.current + 8);
    const actualPowerGain = power.current - powerBefore;

    if (actualPowerGain > 0) {
      resourceChanges.push({
        resource: 'power',
        delta: actualPowerGain,
        unit: power.unit,
        reason: 'Solar battery banks remained fully connected to primary colony storage.',
      });
    }

    if (stormShield.current <= 20) {
      warningNotes = 'Storm shield reserve is now low. Consider visiting the Storm Shelter for a recovery check.';
    }

    explanation =
      'Colony power was conserved for life support and greenhouses, accepting reduced storm shield readiness.';
  }

  // Update game state
  state.spaceWeatherDecision = choice;
  state.spaceWeatherEventTriggered = true;

  // Also ensure solar-storm-alert is marked completed in science challenges log
  const existingScience = state.completedScienceChallenges ?? [];
  if (!existingScience.includes('solar-storm-alert')) {
    state.completedScienceChallenges = [...existingScience, 'solar-storm-alert'];
  }

  // Re-assess crew safety
  const updatedState = normalizeFiveSolMissionState(state);

  return {
    state: updatedState,
    decision: choice,
    alreadyDecided: false,
    resourceChanges,
    explanation,
    warningNotes,
  };
}

/**
 * Calculates a comprehensive, evidence-based Mission Debrief at the end of the 5-Sol campaign.
 * Evaluates Science, Safety, and Sustainability with explanations understandable to children aged 7–12.
 */
export function calculateMissionDebrief(state: GameState): MissionDebrief {
  const completedScience = state.completedScienceChallenges ?? [];
  const explored = state.exploredBuildings ?? [];
  const decision = state.spaceWeatherDecision;

  // --------------------------------------------------------------------------
  // 1. Science Understanding (0–100)
  // --------------------------------------------------------------------------
  let sciencePoints = 0;
  const scienceBullets: string[] = [];

  // Reviewed space-weather event? (40 pts)
  if (decision) {
    sciencePoints += 40;
    scienceBullets.push('Responded to real NASA DONKI historical space-weather data from May 11, 2024.');
  } else {
    scienceBullets.push('Did not complete the space-weather alert drill.');
  }

  // Completed offline science challenges? (Up to 40 pts)
  const challengeCount = completedScience.length;
  const challengePoints = Math.min(40, challengeCount * 14);
  sciencePoints += challengePoints;
  if (challengeCount >= 3) {
    scienceBullets.push('Mastered all 3 NASA Science Log challenges (Radiation, Solar Weather, and Supply Planning).');
  } else if (challengeCount > 0) {
    scienceBullets.push(`Completed ${challengeCount} of 3 NASA Science Log training challenges.`);
  } else {
    scienceBullets.push('No optional NASA Science Log challenges attempted.');
  }

  // Explored buildings? (Up to 20 pts)
  const buildingPoints = Math.min(20, explored.length * 4);
  sciencePoints += buildingPoints;
  scienceBullets.push(`Visited ${explored.length} of 5 outpost facilities to investigate their scientific systems.`);

  const scienceScore = Math.max(0, Math.min(100, sciencePoints));
  const scienceTier: 'gold' | 'silver' | 'bronze' =
    scienceScore >= 80 ? 'gold' : scienceScore >= 55 ? 'silver' : 'bronze';

  const scienceSummary =
    scienceTier === 'gold'
      ? 'Outstanding scientific investigation! You compared real NASA space observations with simulation models.'
      : scienceTier === 'silver'
      ? 'Great scientific curiosity! You learned how NASA monitors space weather to keep astronauts safe.'
      : 'Good start exploring Mars science! Further study of solar radiation data will strengthen your mission.';

  // --------------------------------------------------------------------------
  // 2. Colony Safety (0–100)
  // --------------------------------------------------------------------------
  let safetyPoints = 0;
  const safetyBullets: string[] = [];

  // Crew Safety Status (up to 50 pts)
  if (state.crewSafety === 'nominal') {
    safetyPoints += 50;
    safetyBullets.push('Crew health remained fully nominal throughout the entire five-Sol surface mission.');
  } else if (state.crewSafety === 'caution') {
    safetyPoints += 30;
    safetyBullets.push('Crew experienced caution alert due to low resource reserves, but stayed safe.');
  } else {
    safetyPoints += 15;
    safetyBullets.push('Crew experienced danger conditions due to critically depleted colony reserves.');
  }

  // Space Weather Decision (up to 30 pts)
  if (decision === 'shelter') {
    safetyPoints += 30;
    safetyBullets.push('Reinforced the Storm Shelter bulkheads during the solar storm alert (+18% shield readiness).');
  } else if (decision === 'power') {
    safetyPoints += 20;
    safetyBullets.push('Maintained continuous power to life-support systems while managing lower shield readiness.');
  } else {
    safetyPoints += 10;
    safetyBullets.push('No proactive space-weather defense logged before the storm.');
  }

  // Storm Shield Reserve (up to 20 pts)
  const shieldPercent = state.resources.stormShield.max > 0
    ? (state.resources.stormShield.current / state.resources.stormShield.max) * 100
    : 0;
  if (shieldPercent >= 75) {
    safetyPoints += 20;
    safetyBullets.push(`Storm shielding finished at a robust ${Math.round(shieldPercent)}%.`);
  } else if (shieldPercent >= 40) {
    safetyPoints += 14;
    safetyBullets.push(`Storm shielding maintained at ${Math.round(shieldPercent)}%.`);
  } else {
    safetyPoints += 8;
    safetyBullets.push(`Storm shielding finished low at ${Math.round(shieldPercent)}%.`);
  }

  const safetyScore = Math.max(0, Math.min(100, safetyPoints));
  const safetyTier: 'gold' | 'silver' | 'bronze' =
    safetyScore >= 80 ? 'gold' : safetyScore >= 55 ? 'silver' : 'bronze';

  const safetySummary =
    safetyTier === 'gold'
      ? 'Exemplary crew safety! You protected your astronauts and fortified the outpost against radiation.'
      : safetyTier === 'silver'
      ? 'Solid colony protection! Your crew completed the mission safely through balanced decisions.'
      : 'Challenging surface conditions! The crew survived, but greater shield readiness will reduce risks.';

  // --------------------------------------------------------------------------
  // 3. Colony Sustainability (0–100)
  // --------------------------------------------------------------------------
  let sustainPoints = 0;
  const sustainBullets: string[] = [];

  const powerRatio = state.resources.power.max > 0 ? state.resources.power.current / state.resources.power.max : 0;
  const lifeRatio = state.resources.lifeSupport.max > 0 ? state.resources.lifeSupport.current / state.resources.lifeSupport.max : 0;
  const shieldRatio = state.resources.stormShield.max > 0 ? state.resources.stormShield.current / state.resources.stormShield.max : 0;

  // Power Score (up to 35 pts)
  const powerPts = Math.round(powerRatio * 35);
  sustainPoints += powerPts;
  sustainBullets.push(
    `Electrical power: ${state.resources.power.current} / ${state.resources.power.max} kW (${Math.round(powerRatio * 100)}%).`
  );

  // Life Support Score (up to 35 pts)
  const lifePts = Math.round(lifeRatio * 35);
  sustainPoints += lifePts;
  sustainBullets.push(
    `Life support: ${state.resources.lifeSupport.current} / ${state.resources.lifeSupport.max} % (${Math.round(lifeRatio * 100)}%).`
  );

  // Shielding Score (up to 30 pts)
  const shieldPts = Math.round(shieldRatio * 30);
  sustainPoints += shieldPts;
  sustainBullets.push(
    `Storm shield readiness: ${state.resources.stormShield.current} / ${state.resources.stormShield.max} %.`
  );

  // Check critical thresholds
  const minRatio = Math.min(powerRatio, lifeRatio, shieldRatio);
  if (minRatio > 0.4) {
    sustainBullets.push('All colony reserves remained safely above critical depletion levels.');
  } else if (minRatio > 0.15) {
    sustainBullets.push('Managed tight reserves without total system failure.');
  } else {
    sustainBullets.push('One or more systems experienced near-depletion.');
  }

  const sustainScore = Math.max(0, Math.min(100, sustainPoints));
  const sustainTier: 'gold' | 'silver' | 'bronze' =
    sustainScore >= 80 ? 'gold' : sustainScore >= 55 ? 'silver' : 'bronze';

  const sustainSummary =
    sustainTier === 'gold'
      ? 'Flawless resource stewardship! Your power, oxygen, water, and shield reserves finished in prime condition.'
      : sustainTier === 'silver'
      ? 'Balanced resource management! You maintained adequate power and life-support throughout the five Sols.'
      : 'Resource reserves were heavily taxed. Managing power and water recycling more conservatively will help.';

  // --------------------------------------------------------------------------
  // Overall Rank & Averages
  // --------------------------------------------------------------------------
  const averageScore = Math.round((scienceScore + safetyScore + sustainScore) / 3);
  let overallRank: 'gold' | 'silver' | 'bronze' = 'bronze';
  let overallRankTitle = 'SURVIVOR BRONZE · QUALIFIED MARS PIONEER';

  if (averageScore >= 80) {
    overallRank = 'gold';
    overallRankTitle = 'OUTPOST COMMANDER · GOLD RANK';
  } else if (averageScore >= 60) {
    overallRank = 'silver';
    overallRankTitle = 'MISSION SPECIALIST · SILVER RANK';
  }

  const nasaContextNote =
    'Real Science vs. Game Simulation: NASA DONKI satellites monitor real solar flares and CMEs in space to protect astronauts and satellites. In our game, the Mars surface effects and resource numbers are simplified simulations to help you practice making mission decisions!';

  return {
    overallRank,
    overallRankTitle,
    averageScore,
    categories: {
      science: {
        category: 'science',
        title: 'Science Investigation',
        icon: '🔬',
        score: scienceScore,
        tier: scienceTier,
        summary: scienceSummary,
        bulletPoints: scienceBullets,
      },
      safety: {
        category: 'safety',
        title: 'Colony Safety & Protection',
        icon: '🛡️',
        score: safetyScore,
        tier: safetyTier,
        summary: safetySummary,
        bulletPoints: safetyBullets,
      },
      sustainability: {
        category: 'sustainability',
        title: 'Resource Sustainability',
        icon: '⚡',
        score: sustainScore,
        tier: sustainTier,
        summary: sustainSummary,
        bulletPoints: sustainBullets,
      },
    },
    nasaContextNote,
  };
}
