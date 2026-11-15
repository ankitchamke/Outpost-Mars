/**
 * OUTPOST: MARS — Cohesive Pixel-Art Color Palette
 * Aligned with authentic Jezero Crater Martian geology and near-future mission architecture.
 */

export const MARS_PALETTE = {
  // Natural Martian Terrain & Geology
  terrain: {
    spaceDeep: '#0f070d',
    bedrockDark: '#1b0c13',
    craterShadow: '#281019',
    regolithDeep: '#491b1a',
    regolithBase: '#782d21',
    regolithWarm: '#9a3c27',
    dustHighlight: '#c6593a',
    sandBright: '#de7d5c',
    silicaPebble: '#eab69e',
    treadMark: '#592017',
    rockBase: '#33171f',
    rockHighlight: '#8c4840',
    rockShadow: '#15080e',
  },

  // Astronaut EVA Pressure Suit
  astronaut: {
    suitWhite: '#f8fafc',
    suitShadow: '#94a3b8',
    suitDarkJoint: '#475569',
    visorGold: '#fbbf24',
    visorHighlight: '#ffffff',
    visorRim: '#b45309',
    packCyan: '#38bdf8',
    harnessDark: '#1e293b',
    bootCharcoal: '#0f172a',
    dropShadow: 'rgba(15, 7, 13, 0.45)',
  },

  // Outpost Buildings & Engineering Structures
  structures: {
    compositeWhite: '#f1f5f9',
    compositeShadow: '#94a3b8',
    frameSteel: '#334155',
    darkSteel: '#1e293b',
    airlockCyan: '#06b6d4',
    airlockGreen: '#10b981',
    accentOrange: '#f97316',
    radiatorDark: '#0f172a',

    // Solar Farm Specifics
    solarCellDeep: '#1e3a8a',
    solarCellMid: '#2563eb',
    solarCellLight: '#60a5fa',
    solarBusbar: '#bfdbfe',
    batteryAmber: '#f59e0b',
    cableDark: '#090d16',

    // Greenhouse Specifics
    greenhouseGlass: 'rgba(6, 182, 212, 0.35)',
    greenhouseFrame: '#cbd5e1',
    plantDark: '#14532d',
    plantMid: '#16a34a',
    plantLight: '#4ade80',
    growLedMagenta: '#ec4899',

    // Storm Shelter Specifics
    regolithConcrete: '#4c1d18',
    regolithConcreteDark: '#32120e',
    blastDoorSteel: '#64748b',
    blastDoorShadow: '#334155',
    hazardYellow: '#eab308',
    hazardBlack: '#0f172a',
    beaconAmber: '#f59e0b',

    // Mission Control Specifics
    antennaDishWhite: '#f8fafc',
    antennaDishShadow: '#cbd5e1',
    beaconRed: '#ef4444',
    consoleScreenBlue: '#38bdf8',
    sensorGold: '#eab308',

    // Shared Structure Shadows
    dropShadow: 'rgba(15, 7, 13, 0.55)',
  },
} as const;
