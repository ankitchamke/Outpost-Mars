# OUTPOST: MARS

> **NASA Space Apps Challenge Project**  
> An educational 2D Mars outpost exploration and survival mission trainer designed for young explorers (ages 7–12).

---

## 1. Project Introduction

**OUTPOST: MARS** is a browser-based, educational space simulation game developed for the NASA Space Apps Challenge. Players step into the boots of a Mars outpost commander stationed at Jezero Crater. The core objective is to explore the Martian terrain, learn authentic space science from real NASA data, interact with colony infrastructure, and keep the life support, power, storm shielding, and crew safety systems operational across a challenging five-Sol campaign.

- **Target Audience:** Young explorers and students aged 7–12, educators, and space enthusiasts.
- **Core Mission:** Explore the red planet, investigate five mission-critical buildings, study real spaceflight telemetry, and balance essential outpost resources against the harsh Martian environment.

---

## 2. Features

- **Mars Surface Exploration & Astronaut Movement:** Smooth 4-directional exploration across a $1600 \times 1200$ Martian world bounded by rugged terrain and natural obstacles.
- **Directional Astronaut Animations:** Directional walking animations (up, down, left, right) with idle frames, mapped from an approved astronaut character spritesheet.
- **Five Interactive Colony Buildings:**
  - **Habitat:** Crew living quarters, atmospheric scrubbers, and life-support monitoring.
  - **Solar Farm:** Photovoltaic array generating base electrical power with dust mitigation needs.
  - **Greenhouse:** Hydroponic biological life-support facility for crop growth, food production, and air recycling.
  - **Storm Shelter:** Thick subterranean regolith shielding for radiation and solar storm protection.
  - **Mission Control:** Operations center with orbital telemetry links, communication relays, and science coordination.
- **Environmental Mars Decorations:** Craters of varying scale, rock clusters, geological boulder formations, stone scatters, dust patches, and an interconnected rover-track transit network.
- **Five-Sol Survival Campaign:** An educational progressive mission guiding players through five sequential Martian days (Sols) with contextual tasks, space weather hazards, and environmental events.
- **Resource Management Systems:** Real-time tracking and balance of **Power (kW)**, **Life Support (%)**, **Storm Shielding (%)**, and overall **Crew Safety** (`nominal`, `alert`, `safe`, `critical`).
- **Building-Specific Educational Field Guides:** Interactive dialog consoles featuring accessible scientific guides, educational trivia, and real mission parallels for every facility.
- **First-Time Player Tutorial:** Guided onboarding overlay teaching controls, movement, building proximity, interaction, and mission HUD navigation.
- **Three NASA Science Challenges:** Interactive science investigations evaluating solar storms, microgravity plant biology, and long-duration mission supplies.
- **Persistent Science Log:** A dedicated research journal logging solved scientific challenges, discoveries, and authentic data source citations.
- **State Persistence & Reset:** Full save/reload functionality backed by browser `localStorage`, with granular reset controls (replay tutorial or start fresh).
- **Responsive Viewport Support:** Built to run smoothly across desktop screens and mobile-landscape touch devices with responsive virtual controls.
- **Offline-First NASA Data Architecture:** Pre-bundled, type-safe snapshots from authentic NASA telemetry and repositories—no external API keys or live network requests required.

---

## 3. NASA Resources & Scientific Integrity

OUTPOST: MARS uses authentic NASA datasets and spaceflight literature to ground its gameplay in real science. Every piece of scientific information adheres to a three-tier truth taxonomy:

- <span style="color:#38bdf8; font-weight:bold;">REAL:</span> Directly reported empirical data from peer-reviewed publications, spacecraft sensors, or mission telemetry.
- <span style="color:#a855f7; font-weight:bold;">DERIVED:</span> Values calculated directly from source measurements using standard physical, orbital, or physiological equations.
- <span style="color:#f59e0b; font-weight:bold;">GAME-SIMPLIFIED:</span> Pedagogical approximations or balanced parameters designed to make complex concepts intuitive for young students.

### Bundled Offline Datasets (`src/data/snapshots/`)

| Dataset | Snapshot File | Source & Provenance | Truth Classification | Notes & Scientific Clarifications |
| :--- | :--- | :--- | :--- | :--- |
| **NASA DONKI** | `donki-events.json` | [NASA Space Weather Database Of Notifications, Knowledge, Information (DONKI)](https://kauai.ccmc.gsfc.nasa.gov/DONKI/) | **REAL** / **DERIVED** | Historical Coronal Mass Ejection (CME), Solar Flare, and Solar Energetic Particle (SEP) event profiles from Solar Cycle 25 (May 2024 storm). Kinematic shock models are derived via WSA-ENLIL simulations. |
| **Curiosity RAD** | `curiosity-rad.json` | [NASA PDS / Science (Hassler et al., 2014)](https://pds.nasa.gov/ds-view/pds/viewProfile.jsp?dsid=MSL-M-RAD-3-RDR-V1.0) | **REAL** | Gale Crater surface radiation dosimetry baseline ($0.64 \pm 0.12\text{ mSv/day}$) measured by the Mars Science Laboratory (MSL) Radiation Assessment Detector over its first 300 sols, including the Sol 242 solar event. |
| **NASA OSDR RadLab** | `radlab-dosimetry.json` | [NASA Open Science Data Repository (OSDR) RadLab](https://visualization.osdr.nasa.gov/radlab/api/) | **REAL** | Dosimetric observations from DOSIS 3D (DosTel1) aboard the International Space Station (ISS Columbus laboratory). **Important:** These measurements were taken in Low Earth Orbit (LEO) behind geomagnetic and station shielding; they are space radiation reference benchmarks, **not** Mars surface measurements. |
| **NASA OSDR Studies** | `osdr-studies.json` | [NASA OSDR Biological Studies](https://osdr.nasa.gov/bio/repo/data/studies/OSD-661) | **REAL** | Spaceflight biological research metadata (e.g., OSD-661 / OSD-121) examining musculoskeletal disuse, bone mineral density changes, and radiation markers during spaceflight. |
| **NASA BVAD Reference** | *Referenced in code & Field Guides* | [NASA Baseline Values for Exploration Populations (BVAD 2022)](https://ntrs.nasa.gov/api/citations/20210024855/downloads/BVAD_2.15.22-final.pdf?attachment=true) | **REAL** (Reference) / **GAME-SIMPLIFIED** (Math) | Human metabolic life-support baselines: $0.84\text{ kg } O_2/\text{person-day}$ and $2.50\text{ L } H_2O/\text{person-day}$ intake. **Important:** BVAD values are planning reference standards for exploration mission design, **not** measurements taken on the Martian surface. No standalone BVAD JSON file is bundled; values are cited directly. |

> [!NOTE]
> All offline snapshots undergo automated schema validation and integrity checks during startup and testing (`tests/data/`). No external network requests are made during runtime.

---

## 4. Gameplay Guide

### Controls
- **Movement:** `W`, `A`, `S`, `D` or `Arrow Keys` to walk across the Martian surface.
- **Interact:** Press `E` when standing near a colony building to open its Field Guide and complete mission tasks.
- **Close Panels:** Press `Escape` or click the on-screen close button (`✕`) to close dialogs, field guides, and the Science Log.
- **Mobile / Touch Controls:** On touchscreens and mobile-landscape devices, an interactive virtual directional pad and on-screen action buttons are provided.

### Mission Flow
1. **Sol 1 — Habitat Life Support:** Walk to the Habitat to inspect life-support systems, scrubbers, and crew vitals.
2. **Sol 2 — Solar Power Generation:** Navigate along the rover tracks to the Solar Farm to inspect photovoltaic output and clear dust accumulation.
3. **Sol 3 — Greenhouse Hydroponics:** Visit the Greenhouse to monitor crop hydration, oxygen generation, and humidity levels.
4. **Sol 4 — Space Weather Storm Alert:** NASA DONKI detects an incoming Coronal Mass Ejection! Sound the alert and shelter the crew in the Storm Shelter before the solar shock arrives.
5. **Sol 5 — Mission Control Debrief:** Report to Mission Control, sync telemetry with Earth, and complete the five-Sol expedition.

### Science Challenges
Open the **Science Log** from the top header to tackle interactive scientific investigations:
- **Challenge 1 (Radiation Detective):** Analyze solar flare classifications (X-class vs. M-class) and calculate galactic cosmic ray surface exposure using Curiosity RAD benchmarks.
- **Challenge 2 (Space Botanist):** Configure light wavelengths and nutrient balances for Martian greenhouse crops based on NASA space biology research.
- **Challenge 3 (Life Support Logistics):** Compute 30-day consumable requirements (oxygen and water) for a 4-person crew using NASA BVAD exploration planning baselines.

---

## 5. Technology Stack

- **Game Engine & Rendering:** [Phaser 3](https://phaser.io/) (`phaser` ^3.90.0) — 2D canvas and WebGL renderer utilizing Arcade Physics, sprite animators, camera viewports, and custom event dispatchers.
- **Language:** [TypeScript](https://www.typescriptlang.org/) (`typescript` ^5.7.2) — Strict type safety for game state models, telemetry schemas, and scientific data taxonomy.
- **Build System & Tooling:** [Vite](https://vitejs.dev/) (`vite` ^6.2.0) — Fast frontend development server and Rollup-based production bundler.
- **Test Framework:** [Vitest](https://vitest.dev/) (`vitest` ^5.1.0) — Automated unit, integration, and schema validation testing suite.
- **Script Bundling:** [esbuild](https://esbuild.github.io/) (`esbuild` ^0.25.12) — High-velocity bundling for scientific data ingestion and snapshot generation scripts.
- **UI & Accessibility:** Semantic HTML5, CSS Grid/Flexbox styling, accessible ARIA roles, responsive typography, and high-contrast color palettes.
- **Persistence:** Browser Web Storage API (`localStorage`) for offline-capable mission save states.

---

## 6. Project Structure

```text
Outpost-Mars/
├── public/
│   └── assets/                    # Static runtime game assets
│       ├── buildings/             # Approved building sprites (habitat, greenhouse, etc.)
│       ├── characters/            # Approved astronaut spritesheet and static fallback
│       └── environment/           # Terrain background, craters, rocks, boulders, and rover tracks
├── src/
│   ├── assets/                    # Source CSS styles and design reference sheets
│   │   └── styles.css             # Responsive HUD, modals, tutorial, and overlay styling
│   ├── core/                      # Pure core business and game logic
│   │   ├── mission.ts             # Five-Sol objective rules, Sol transitions, and recovery logic
│   │   ├── science-challenges.ts  # Science challenge data models and BVAD calculations
│   │   ├── state.ts               # GameState factory, default resources, and persistence helpers
│   │   └── types.ts               # Core TypeScript interfaces for game entities and state
│   ├── data/                      # NASA scientific data subsystem
│   │   ├── snapshots/             # Verified offline JSON data snapshots
│   │   ├── loader.ts              # Snapshot loader with fail-safe error handling
│   │   ├── types.ts               # Scientific taxonomy, provenance, and dataset models
│   │   └── validation.ts          # Runtime validators ensuring snapshot structural integrity
│   ├── game/                      # Phaser 3 game implementation
│   │   ├── building-events.ts     # Building interaction custom event constants
│   │   ├── config.ts              # Phaser GameConfig, scale modes, and rendering options
│   │   ├── index.ts               # Phaser game lifecycle instance initializer
│   │   ├── tutorial-events.ts     # Onboarding tutorial event bus
│   │   ├── scenes/
│   │   │   └── MarsScene.ts       # Main exploration scene: terrain, sprites, physics, camera
│   │   └── textures/              # Procedural texture fallbacks and Martian color palette
│   ├── ui/                        # DOM HUD and interactive overlay managers
│   │   ├── building-interactions.ts # Field guide dialogs and mission objective displays
│   │   ├── first-time-tutorial.ts # New player interactive onboarding tour
│   │   ├── hud.ts                 # Resource status indicators (Power, Life Support, Shield)
│   │   └── science-challenges.ts  # Science console dialogs and persistent Science Log UI
│   └── main.ts                    # Application entry point wiring Phaser with DOM UI
├── tests/                         # Vitest automated test suite
│   ├── data/
│   │   ├── fixtures.ts            # Test fixtures for data snapshots
│   │   ├── ingestion-safety.test.ts # Atomic snapshot writes and transaction rollback tests
│   │   ├── loader.test.ts         # Snapshot loading and data access tests
│   │   └── validation.test.ts     # Strict schema validation test suite
│   ├── foundation.test.ts         # Initial state baseline and resource bounds tests
│   ├── mission.test.ts            # Five-Sol campaign progression and recovery tests
│   ├── phaser-foundation.test.ts  # Phaser config, viewport scale, and boundary tests
│   ├── science-challenges.test.ts # Challenge validation and supply calculation tests
│   └── storage.test.ts            # LocalStorage persistence and migration tests
├── index.html                     # Application HTML5 shell with viewport containers
├── package.json                   # Project dependencies and scripts
├── tsconfig.json                  # TypeScript compiler configuration
└── vite.config.ts                 # Vite bundler and path alias configuration
```

---

## 7. Installation & Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` (v9.0.0 or higher)

### Setup & Execution Commands

```bash
# 1. Install project dependencies
npm install

# 2. Launch local development server with Hot Module Replacement (HMR)
npm run dev

# 3. Run automated unit and integration test suite
npm test

# 4. Perform strict TypeScript type checking without emitting files
npx tsc --noEmit

# 5. Compile and bundle for production distribution
npm run build

# 6. Preview the production build locally
npm run preview
```

---

## 8. Testing & Verification

The project includes an automated test suite executed via Vitest, covering core state management, five-Sol mission progression, storage persistence, NASA science snapshot validation, and Phaser configuration.

### Verified Test Suite Results

```text
 ✓ tests/foundation.test.ts (1 test)
 ✓ tests/mission.test.ts (4 tests)
 ✓ tests/science-challenges.test.ts (4 tests)
 ✓ tests/storage.test.ts (4 tests)
 ✓ tests/data/validation.test.ts (35 tests)
 ✓ tests/data/loader.test.ts (20 tests)
 ✓ tests/data/ingestion-safety.test.ts (5 tests)
 ✓ tests/phaser-foundation.test.ts (8 tests)

 Test Files  8 passed (8)
      Tests  81 passed (81)
```

- **Foundation & Baseline (`tests/foundation.test.ts`):** Validates initial resource ranges, NASA BVAD planning values, and module registration.
- **Mission Engine (`tests/mission.test.ts`):** Validates sequential Sol 1–5 progression, building interaction triggers, deterministic emergency power recovery, and legacy save migration.
- **Science Challenges (`tests/science-challenges.test.ts`):** Verifies supply calculation mathematics, idempotent rewards, and log normalization.
- **Storage Persistence (`tests/storage.test.ts`):** Verifies state serialization to `localStorage`, discovery flags, and reset routines.
- **Phaser 3 Foundation (`tests/phaser-foundation.test.ts`):** Verifies GameConfig parameters, responsive scale manager, pixel-art rendering flags, zero-gravity physics, canonical building coordinates, and color palette tokens.
- **NASA Data Subsystem (`tests/data/`):** 60 tests verifying strict schema validation, offline loading, atomic file updates, and rollback failure safety.

---

## 9. Credits & Disclaimer

### Scientific Data Credits
- **NASA Space Weather Database Of Notifications, Knowledge, Information (DONKI):** Coronal Mass Ejection, solar flare, and shock simulation event records.
- **NASA Planetary Data System (PDS) & MSL RAD Team:** Surface radiation dosimetry from Mars Science Laboratory Curiosity Rover (Hassler et al., *Science* 343, 2014).
- **NASA Open Science Data Repository (OSDR) & RadLab:** Space radiation dosimetry from the ISS DOSIS 3D experiment and microgravity biological studies.
- **NASA Baseline Values for Exploration Populations (BVAD 2022):** Human exploration life support planning standards.

### Disclaimer
**OUTPOST: MARS** is an educational game developed as a project for the **NASA Space Apps Challenge**. It is an independent educational effort and is **not** an official product of the National Aeronautics and Space Administration (NASA), nor is it endorsed by NASA. All trademarks and datasets belong to their respective owners.
