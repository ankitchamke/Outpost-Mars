/**
 * OUTPOST: MARS — Interactive Mars Environmental Discoveries
 * Curated natural geological features and real Mars planetary science observations.
 * 100% verified against NASA Mars mission findings (Perseverance, Curiosity, Phoenix, MRO).
 */

export interface MarsDiscovery {
  id: string;
  name: string;
  category: 'Impact Geology' | 'Volcanic Geology' | 'Aeolian Terrain' | 'Surface Chemistry' | 'Sedimentary Geology';
  icon: string;
  x: number;
  y: number;
  radius: number;
  explanation: string;
  scientificFact: string;
  whyScientistsStudyIt: string;
  nasaAttribution: string;
}

export const MARS_DISCOVERIES: MarsDiscovery[] = [
  {
    id: 'crater_basin',
    name: 'Ancient Impact Crater',
    category: 'Impact Geology',
    icon: '☄️',
    x: 300,
    y: 240,
    radius: 95,
    explanation: 'A bowl-shaped hollow formed when a high-speed meteoroid slammed into the Martian surface millions of years ago.',
    scientificFact: 'Mars has over 600,000 craters larger than 1 kilometer wide because its ultra-thin atmosphere cannot incinerate incoming space debris the way Earth’s thick atmosphere does.',
    whyScientistsStudyIt: 'Impact blasts act like natural excavation drills, unearthing ancient rock layers from kilometers underground without needing heavy drilling rigs.',
    nasaAttribution: 'NASA Mars Reconnaissance Orbiter (HiRISE & CTX Cameras)',
  },
  {
    id: 'volcanic_boulder',
    name: 'Weathered Basalt Boulder',
    category: 'Volcanic Geology',
    icon: '🪨',
    x: 260,
    y: 520,
    radius: 75,
    explanation: 'A dark, dense volcanic rock cooled from ancient lava flows that poured across the Martian lowlands billions of years ago.',
    scientificFact: 'Iron inside Martian basalt slowly reacts with trace oxygen and water vapor in the atmosphere, creating iron oxide (rust) that gives the Red Planet its rusty orange color.',
    whyScientistsStudyIt: 'Analyzing volcanic mineral crystals reveals the temperature, chemical composition, and cooling history of early Mars’s molten mantle.',
    nasaAttribution: 'NASA Curiosity Rover (Alpha Particle X-Ray Spectrometer)',
  },
  {
    id: 'dune_ripples',
    name: 'Aeolian Sand Dunes',
    category: 'Aeolian Terrain',
    icon: '〰️',
    x: 920,
    y: 1430,
    radius: 95,
    explanation: 'Rippled mounds of dark basaltic mineral sand sculpted and shifted by Martian wind storms across Jezero Crater.',
    scientificFact: 'Even though Mars’s air pressure is less than 1% of Earth’s, seasonal dust devils and global wind storms can still reach speeds over 60 mph (100 km/h).',
    whyScientistsStudyIt: 'Active dunes show how atmospheric circulation works today and help rover drivers navigate away from loose sands where wheels can get stuck.',
    nasaAttribution: 'NASA Curiosity Rover (Bagnold Dunes Campaign) & HiRISE',
  },
  {
    id: 'regolith_patch',
    name: 'Martian Regolith & Soil',
    category: 'Surface Chemistry',
    icon: '🔬',
    x: 1000,
    y: 1140,
    radius: 80,
    explanation: 'The powdery layer of crushed rock, mineral dust, and volcanic ash that blankets the surface of Mars.',
    scientificFact: 'Martian regolith contains toxic perchlorate salts and bound water molecules. Rovers discovered that heating regolith in an oven releases usable water vapor.',
    whyScientistsStudyIt: 'Future human missions plan to pile regolith over habitats for cosmic radiation shielding and extract oxygen and water for life support.',
    nasaAttribution: 'NASA Phoenix Mars Lander & Curiosity SAM Instrument',
  },
  {
    id: 'bedrock_slab',
    name: 'Sedimentary Bedrock Slab',
    category: 'Sedimentary Geology',
    icon: '🧱',
    x: 1720,
    y: 720,
    radius: 85,
    explanation: 'Layered bedrock formed when fine mud and silt settled at the bottom of ancient rivers and dried over eons.',
    scientificFact: 'Rovers in Gale and Jezero craters found clay minerals that only form in neutral, non-acidic liquid water, proving ancient Mars had habitable lakes and streams.',
    whyScientistsStudyIt: 'Fine-grained sedimentary rocks are the best places in the solar system to preserve organic molecules and fossilized signatures of ancient microbial life.',
    nasaAttribution: 'NASA Mars 2020 (Perseverance Rover) & Mars Science Laboratory',
  },
];
