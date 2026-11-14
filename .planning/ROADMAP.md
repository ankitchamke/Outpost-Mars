# Roadmap: OUTPOST: MARS

## Overview

OUTPOST: MARS is developed across 9 sequential phases totaling exactly 20 working hours. Phase 00 (2 hours) and Phase 01 (1 hour) are complete (3 hours total). The remaining 17 working hours proceed through offline NASA scientific data integration, Phaser 2D engine integration and base simulation, the Seven-Sol narrative campaign, child-friendly UI/UX and educational explanations, audio-visual polish with Mars Trek references, rigorous testing, and final presentation packaging.

---

## Phases & Time Accounting

- [x] **Phase 00: Planning & Scope Lock** (2h) — [COMPLETE] Architecture, scientific validity audit, GSD setup, 100-point scorecard, and risk register.
- [x] **Phase 01: Project Foundation & Architecture** (1h) — [COMPLETE] Greenfield Vite + TypeScript scaffolding, HTML5 Canvas foundation, standard CSS layout, Vitest setup, and state persistence.
- [x] **Phase 02: Science & Data Integration Engine** (3h) — [COMPLETE] Endpoint verification, TypeScript contracts, runtime validation, and offline snapshot loaders for 4 NASA datasets: P0 DONKI (4 CMEs with verified Mars ENLIL arrivals: 2024-05-10T21:28:00-CME-001 [arrivals: 2024-05-13T23:50Z, 2024-05-14T06:18Z], 2024-05-11T01:36:00-CME-001 [arrivals: 2024-05-13T17:42Z, 2024-05-13T23:50Z, 2024-05-14T06:18Z], 2024-05-12T03:48:00-CME-001 [arrival: 2024-05-15T22:00Z], 2024-05-14T17:00:00-CME-001 [arrivals: 2024-05-16T20:47Z, 2024-05-17T02:11Z, 2024-05-16T19:08Z]; 3 solar flares: X3.9, X5.8, X8.7; 2 SEPs: 2024-05-10T12:59:00-SEP-001, 2024-05-10T13:35:00-SEP-001), P0 RadLab (8 DosTel1 LEO observation records with SEC-01 guards), P1 OSDR (2 spaceflight biology studies: OSD-661 & OSD-121), and MSL Curiosity RAD (2 empirical surface datasets: GCR baseline 0.64 mSv/day & Sol 242 SEP event 0.05 mSv integrated excess dose). Ingestion provides staged writes and rollback for handled failures (without claiming recovery from sudden unhandled process termination or power loss). 100% offline with zero network calls and zero API keys.
- [ ] **Phase 03: Phaser Integration, 2D Mars Base & Resource Simulation** (3h) — **[NEXT PHASE]** Integration of approved Phaser 2D game engine, cleanly replacing Phase 01 Canvas renderer (zero dual-engine maintenance); top-down 2D pixel-art Mars outpost; hybrid astronaut movement and building interaction; 5 confirmed initial buildings: Habitat, Solar Farm, Greenhouse, Storm Shelter, Mission Control; contextual interaction panels; 3 spendable resources: Power (UI may say Sun Power), Life Support, Shielding (UI may say Storm Shield); Crew Safety outcome indicator (non-spendable); turn-based Sol simulation (5-Sol MVP campaign).
- [ ] **Phase 04: Seven-Sol Mission Scenarios & Space-Weather Events** (3h) — Seven-Sol story campaign; verified NASA DONKI space-weather crises (CMEs, solar flares, particle events); emergency shelter protocols; and educational debriefs explaining the distinction between real observations and exaggerated scenarios.
- [ ] **Phase 05: Child-Friendly UI/UX, Accessibility & Educational Explanations** (2h) — Accessible HUD (Sun Power, Life Support, Storm Shield, Crew Safety); Commander Aiko advisor speech bubbles; WCAG 2.1 AA controls; interactive glossary; and educational explanations of astronaut health (bone, muscle, radiation) supported by NASA OSDR and RadLab research.
- [ ] **Phase 06: Audio, Visual Polish, Narrative & Mars Trek References** (2h) — Phaser visual polish and module operational states; selected NASA Mars Trek terrain visual references; Web Audio procedural sound synthesizer; and master mute toggle.
- [ ] **Phase 07: Testing, Edge Cases & Verification** (2h) — Automated Vitest test suite, browser/viewport compatibility checks, game balance tuning, and offline data verification.
- [ ] **Phase 08: Presentation, Video Demo & Submission** (2h) — 2-minute video pitch recording, slide deck, live deployment verification, and Space Apps submission packaging.

**Time Accounting Summary:**
- Total Project Budget: 20.0 hours
- Time Spent (Phases 00, 01, 02): 6.0 hours [COMPLETE]
- Remaining Time (Phases 03–08): Exactly 14.0 hours

---

## Phase Details

### Phase 00: Planning & Scope Lock (2h) — COMPLETE
**Goal:** Establish concrete project requirements, validate NASA data feasibility, lock MVP scope to 3 resources and 4 modules, set up GSD planning infrastructure, and create non-duplicative domain documentation.  
**Depends on:** Greenfield start  
**Requirements:** Initial scoping, science audit, and governance  
**Success Criteria:**
1. GSD planning structure (`.planning/`) initialized and verified.
2. Scientific validity audit completed with REAL, DERIVED, and GAME-SIMPLIFIED labels.
3. 100-point multidisciplinary excellence scorecard and official judging dimension mapping documented.
4. Acceptance criteria, risk register, and submission plan established in `docs/`.  
**Plans:** 1 plan (00-01) [Complete]

---

### Phase 01: Project Foundation & Architecture (1h) — COMPLETE
**Goal:** Scaffold a zero-cost, zero-friction client-side web application foundation using Vite + TypeScript + HTML5 Canvas and standard CSS, with zero live API dependencies.  
**Depends on:** Phase 00  
**Requirements:** TECH-01, TECH-02  
**Success Criteria:**
1. Vite dev server boots cleanly with zero build errors and instant hot-reload.
2. Responsive 2D Canvas viewport foundation and semantic HTML/CSS HUD overlay render correctly.
3. Client-side state saves and restores reliably from `localStorage`.  
**Plans:** 1 plan (01-01) [Complete]

---

### Phase 02: Science & Data Integration Engine (3h) — COMPLETE
**Goal:** Establish the offline-first scientific data engine with schemas, ingestion pipelines, normalization, provenance tracking, and bundled validated snapshots for P0 NASA DONKI, P0 NASA RadLab, P1 NASA OSDR, and MSL Curiosity RAD; enforce strict SEC-01 cross-field guards, empirical dataset separation, and staged write failure safety with automatic rollback.  
**Depends on:** Phase 01  
**Requirements:** SCI-01, SCI-02, SCI-03, SCI-04, SCI-05, TECH-03  
**Success Criteria:**
1. [x] P0 NASA DONKI endpoints researched, TypeScript schemas defined, and authentic snapshot generated covering 4 CMEs (all verified with authentic WSA-ENLIL Mars shock arrival model predictions: `2024-05-10T21:28:00-CME-001` [Mars arrivals: 2024-05-13T23:50Z, 2024-05-14T06:18Z], `2024-05-11T01:36:00-CME-001` [Mars arrivals: 2024-05-13T17:42Z, 2024-05-13T23:50Z, 2024-05-14T06:18Z], `2024-05-12T03:48:00-CME-001` [Mars arrival: 2024-05-15T22:00Z], `2024-05-14T17:00:00-CME-001` [Mars arrivals: 2024-05-16T20:47Z, 2024-05-17T02:11Z, 2024-05-16T19:08Z]), 3 solar flares (Cycle 25 peak X8.7 on 2024-05-14, X5.8 on 2024-05-11, X3.9 on 2024-05-10), and 2 SEPs (>10 MeV: `2024-05-10T12:59:00-SEP-001`, `2024-05-10T13:35:00-SEP-001`) with verified provenance. DONKI data strictly labeled as heliospheric context and not Mars surface dose.
2. [x] P0 NASA RadLab API researched, instrument-specific datasets selected and normalized into snapshots (8 authentic DosTel1 LEO observation records from May 10, 2024 with exact `uGy/h` dose units: `RADLAB-ISS-DOSTEL1-20240510T120027-0` through `RADLAB-ISS-DOSTEL1-20240510T121400-7`). SEC-01 cross-field guards enforce that ISS/LEO observations cannot have a surface or Mars trajectory, nor claim Mars surface location in provenance.
3. [x] P1 NASA OSDR search API investigated and normalized into snapshots with 2 authentic spaceflight biology studies (`OSD-661` murine bone/muscle countermeasure study and `OSD-121` BRIC-16 plant seedling transcriptomics) preserving full metadata, DOIs, and scientific limitations.
4. [x] MSL Curiosity RAD Gale Crater empirical surface radiation datasets integrated (2 empirical datasets: GCR baseline $0.64 \pm 0.12\text{ mSv/day}$ [$0.21\text{ mGy/day}$ silicon, $0.24\text{ mGy/day}$ water] and Sol 242 SEP event with $260\ \mu\text{Gy/day}$ peak rate and $0.05\text{ mSv}$ integrated excess dose). Synthetic game simulation values (+50 mSv drill) strictly separated from empirical datasets.
5. [x] Ingestion pipeline failure safety implemented via staged temporary writes and automatic rollback from `.bak` backups for handled failures (`scripts/ingest-nasa-data.ts`). Accurately documented as protecting against handled write/validation failures without claiming impossible guarantees against unhandled sudden process termination (SIGKILL) or catastrophic power loss.
6. [x] Offline loader (`createDefaultOfflineLoader()`) integrates all 4 datasets with zero network calls, zero API keys, and comprehensive validation error reporting.
7. [x] All scientific models and outputs display clear `[REAL]`, `[DERIVED]`, or `[GAME-SIMPLIFIED]` taxonomy tags.  
**Plans:** 5 subphases completed (02.1 Scope & Boundaries, 02.2 Verification, 02.3A Data Models & Offline Loader, 02.3B Authentic Snapshots & Ingestion, 02.4-02.5 Final Integration & Verification) [Complete]

---

### Phase 03: Phaser Integration, 2D Mars Base & Resource Simulation (3h) — NEXT PHASE
**Goal:** Integrate the approved Phaser 2D game engine into the project, cleanly replacing the Phase 01 custom Canvas renderer (no dual engines maintained); implement the confirmed gameplay direction: top-down 2D pixel-art Mars outpost; hybrid astronaut movement and building interaction; 5 confirmed initial buildings (Habitat, Solar Farm, Greenhouse, Storm Shelter, Mission Control); contextual interaction panels; interconnected 3-resource engine (Power [Sun Power], Life Support, Shielding [Storm Shield]) with Crew Safety outcome indicator (non-spendable); and turn-based Sol simulation (5-Sol MVP campaign).  
**Depends on:** Phase 02  
**Requirements:** SIM-01, SIM-02, SIM-03, SIM-04, ART-01  
**Success Criteria:**
1. Phaser is cleanly integrated as the sole 2D game engine, replacing the Phase 01 Canvas rendering code without regressions.
2. Top-down 2D pixel-art visual rendering of the Martian surface and outpost grid.
3. Hybrid interaction model: astronaut direct movement alongside contextual building interaction panels.
4. 5 confirmed initial buildings operational:
   - **Habitat:** Living quarters, communications hub, and crew exercise/health station.
   - **Solar Farm:** Photovoltaic solar array and battery storage supplying base Power.
   - **Greenhouse:** Hydroponic and protected environment food crop cultivation and supplemental biomass.
   - **Storm Shelter:** Regolith-reinforced storm bunker providing critical Shielding.
   - **Mission Control:** Operations center, telemetry coordination, and planetary surface monitoring station.
5. Turn-based Sol tick accurately balances 3 spendable resources: **Power** (kW generation and battery storage; UI may say Sun Power), **Life Support** (combined buffer with O2, direct water intake, and caloric breakdown), and **Shielding** (regolith and shelter readiness; UI may say Storm Shield) across a 5-Sol MVP campaign.
6. Crew Safety indicator dynamically reflects environmental hazards and resource stability strictly as an outcome indicator (non-spendable).
7. Degraded resource states trigger educational recovery prompts rather than abrupt game overs.
8. P2 NASA Mars Trek terrain references evaluated for lightweight environment background integration.  
**Plans:** 2 plans (03-01: Phaser integration & module grid; 03-02: Sol turn-loop & resource balancing)

---

### Phase 04: Seven-Sol Mission Scenarios & Space-Weather Events (3h)
**Goal:** Build the Seven-Sol narrative story campaign and the dynamic event engine that injects authentic P0 NASA DONKI space-weather crises into gameplay.  
**Depends on:** Phase 03  
**Requirements:** EDU-01, EDU-02, EDU-03  
**Success Criteria:**
1. Player progresses through a structured Seven-Sol campaign arc (establishing outpost, managing resources, weathering space storms, achieving sustainability).
2. Space-weather events (CMEs, solar flares, SEPs) derived from verified DONKI records require tactical Sun Power management and Storm Shield shelter activation.
3. Post-mission debrief presents scores across Science, Safety, and Sustainability, explicitly explaining the distinction between real observations (Curiosity RAD 2013 event) and exaggerated game training scenarios (+50 mSv drill).  
**Plans:** 2 plans (04-01: Seven-Sol campaign engine; 04-02: Event generator & science debrief)

---

### Phase 05: Child-Friendly UI/UX, Accessibility & Educational Explanations (2h)
**Goal:** Refine the user interface to be intuitive, engaging, and accessible for 7–12 year-olds with high-contrast accessibility, and incorporate educational explanations of astronaut health and radiation shielding grounded in NASA OSDR (P1) and RadLab (P0) research.  
**Depends on:** Phase 04  
**Requirements:** UIX-01, UIX-02, UIX-03, UIX-04  
**Success Criteria:**
1. HUD displays prominent color-coded gauges and dual-encoded icons for Sun Power, Life Support, Storm Shield, and Crew Safety.
2. Commander Aiko advisor delivers friendly guidance, causal explanations, and crisis warnings.
3. All interactive buttons meet 44x44px minimum touch targets and keyboard navigation standards (WCAG 2.1 AA).
4. Interactive glossary pops up when clicking scientific terms (e.g. CME, Regolith, Sabatier, Dosimetry, Bone Mineral Density).
5. Educational explanations of astronaut health (bone/muscle preservation, exercise protocols, radiation shielding) incorporate selected OSDR and RadLab research context.  
**Plans:** 1 plan (05-01)

---

### Phase 06: Audio, Visual Polish, Narrative & Mars Trek References (2h)
**Goal:** Polish visual art assets, Phaser sprite states, lightweight NASA Mars Trek (P2) terrain visual references, Web Audio procedural sound synthesis, and tactile interaction feedback.  
**Depends on:** Phase 05  
**Requirements:** ART-02  
**Success Criteria:**
1. Modules have distinct operational, active, and degraded visual states rendered in Phaser.
2. Lightweight NASA Mars Trek terrain imagery and references provide authentic Martian surface context without complex GIS overhead.
3. Web Audio synthesizer provides procedural Martian wind, module hums, and alert tones with a prominent mute toggle.
4. Visual particle effects highlight solar storm warnings and successful Sol completions.  
**Plans:** 1 plan (06-01)

---

### Phase 07: Testing, Edge Cases & Verification (2h)
**Goal:** Execute full automated Vitest test suite, browser compatibility checks, game balance validation, and edge-case hardening.  
**Depends on:** Phase 06  
**Requirements:** QA-01, QA-02  
**Success Criteria:**
1. Automated Vitest test suite passes 100% of resource balance, simulation math, and offline data assertions.
2. Edge cases (zero Sun Power, instant solar storm, depleted life support) resolve gracefully with learning feedback.
3. Zero console errors across desktop and tablet screen viewports.
4. Offline-first execution verified with network disabled.  
**Plans:** 1 plan (07-01)

---

### Phase 08: Presentation, Video Demo & Submission (2h)
**Goal:** Prepare a compelling submission package matching official Space Apps judging criteria, including live demo link and video pitch.  
**Depends on:** Phase 07  
**Requirements:** SUB-01, SUB-02  
**Success Criteria:**
1. 2-minute demonstration video recorded and published according to the storyboard.
2. Project README, live deployment link, and NASA data citations (DONKI, RadLab, OSDR, Mars Trek, Curiosity RAD, MEDA, BVAD) completed.
3. Submission text verified against the 100-point internal scorecard and judging dimensions.  
**Plans:** 1 plan (08-01)

---
*Roadmap audited: 2026-11-14 (Technical Direction Synchronization)*
