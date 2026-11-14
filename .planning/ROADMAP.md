# Roadmap: OUTPOST: MARS

## Overview

OUTPOST: MARS is developed across 9 sequential phases totaling exactly 20 working hours. Phase 00 (2 hours) and Phase 01 (1 hour) are complete (3 hours total). The remaining 17 working hours proceed through offline NASA scientific data integration, Phaser 2D engine integration and base simulation, the Seven-Sol narrative campaign, child-friendly UI/UX and educational explanations, audio-visual polish with Mars Trek references, rigorous testing, and final presentation packaging.

---

## Phases & Time Accounting

- [x] **Phase 00: Planning & Scope Lock** (2h) — [COMPLETE] Architecture, scientific validity audit, GSD setup, 100-point scorecard, and risk register.
- [x] **Phase 01: Project Foundation & Architecture** (1h) — [COMPLETE] Greenfield Vite + TypeScript scaffolding, HTML5 Canvas foundation, standard CSS layout, Vitest setup, and state persistence.
- [ ] **Phase 02: Science & Data Integration Engine** (3h) — **[CURRENT PHASE]** Endpoint research, schema definition, normalization, provenance, and snapshot pipelines for P0 NASA DONKI (solar flares, CMEs, SEPs) and P0 NASA RadLab (dosimetry telemetry); API investigation of P1 NASA OSDR (astronaut health); local ingestion security architecture; Curiosity RAD Gale Crater baseline ($0.64 \pm 0.12\text{ mSv/day}$); and strict REAL / DERIVED / GAME-SIMPLIFIED labeling.
- [ ] **Phase 03: Phaser Integration, 2D Mars Base & Resource Simulation** (3h) — Integration of approved Phaser 2D game engine, cleanly replacing Phase 01 Canvas renderer (zero dual-engine maintenance); evaluation of P2 NASA Mars Trek terrain references; 4 essential MVP modules; 3-resource engine (Sun Power, Life Support, Storm Shield); Crew Safety outcome indicator; and turn-based Sol simulation.
- [ ] **Phase 04: Seven-Sol Mission Scenarios & Space-Weather Events** (3h) — Seven-Sol story campaign; verified NASA DONKI space-weather crises (CMEs, solar flares, particle events); emergency shelter protocols; and educational debriefs explaining the distinction between real observations and exaggerated scenarios.
- [ ] **Phase 05: Child-Friendly UI/UX, Accessibility & Educational Explanations** (2h) — Accessible HUD (Sun Power, Life Support, Storm Shield, Crew Safety); Commander Aiko advisor speech bubbles; WCAG 2.1 AA controls; interactive glossary; and educational explanations of astronaut health (bone, muscle, radiation) supported by NASA OSDR and RadLab research.
- [ ] **Phase 06: Audio, Visual Polish, Narrative & Mars Trek References** (2h) — Phaser visual polish and module operational states; selected NASA Mars Trek terrain visual references; Web Audio procedural sound synthesizer; and master mute toggle.
- [ ] **Phase 07: Testing, Edge Cases & Verification** (2h) — Automated Vitest test suite, browser/viewport compatibility checks, game balance tuning, and offline data verification.
- [ ] **Phase 08: Presentation, Video Demo & Submission** (2h) — 2-minute video pitch recording, slide deck, live deployment verification, and Space Apps submission packaging.

**Time Accounting Summary:**
- Total Project Budget: 20.0 hours
- Time Spent (Phases 00 & 01): 3.0 hours [COMPLETE]
- Remaining Time (Phases 02–08): Exactly 17.0 hours

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

### Phase 02: Science & Data Integration Engine (3h) — CURRENT PHASE
**Goal:** Establish the offline-first scientific data engine with schemas, ingestion pipelines, normalization, provenance tracking, and bundled validated snapshots for P0 NASA DONKI and P0 NASA RadLab; investigate P1 NASA OSDR API capabilities; maintain Curiosity RAD Gale Crater baseline figures ($0.64 \pm 0.12\text{ mSv/day}$); and enforce strict API key security and data taxonomy.  
**Depends on:** Phase 01  
**Requirements:** SCI-01, SCI-02, SCI-03, SCI-04, SCI-05, TECH-03  
**Success Criteria:**
1. P0 NASA DONKI endpoints researched, schema defined, and snapshot generated covering historical solar flare, CME, and SEP event profiles with verified provenance (source URL, dataset id, retrieval date, units, limitations); DONKI data strictly labeled as heliospheric context and not Mars surface dose.
2. P0 NASA RadLab API researched, instrument-specific datasets selected and normalized into snapshots (preserving instrument, spacecraft, trajectory, dose type, units); telemetry strictly bounded to LEO/instrument context and never represented as Mars surface dose.
3. P1 NASA OSDR search API investigated for public space biology studies and metadata on astronaut bone/muscle health, without downloading unnecessary bulk datasets.
4. Strict API key and data security verified: Zero secrets in source code, zero `VITE_*` secrets, zero credentials exposed to browser; local ingestion scripts produce version-controlled snapshots for 100% offline gameplay.
5. All scientific models and outputs display clear `[REAL]`, `[DERIVED]`, or `[GAME-SIMPLIFIED]` taxonomy tags.  
**Plans:** 2 plans (02-01: Schemas, ingestion scripts, and snapshot generation; 02-02: Scientific calculation models, validation, and taxonomy badges)

---

### Phase 03: Phaser Integration, 2D Mars Base & Resource Simulation (3h)
**Goal:** Integrate the approved Phaser 2D game engine into the project, cleanly replacing the Phase 01 custom Canvas renderer (no dual engines maintained); evaluate P2 NASA Mars Trek terrain references for the Phaser environment; build the 4 essential MVP modules; and implement the interconnected 3-resource engine (Sun Power, Life Support, Storm Shield) with the Crew Safety outcome indicator.  
**Depends on:** Phase 02  
**Requirements:** SIM-01, SIM-02, SIM-03, SIM-04, ART-01  
**Success Criteria:**
1. Phaser is cleanly integrated as the sole 2D game engine, replacing the Phase 01 Canvas rendering code without regressions.
2. Player can select, place, and inspect 4 essential MVP modules (Habitat, Solar Array & Battery, Life Support System, Storm Shield / Shelter) on the Phaser 2D Martian surface grid.
3. Turn-based Sol tick accurately balances Sun Power (kW & battery kWh), Life Support (O2, H2O, food reserves), and Storm Shield readiness.
4. Crew Safety indicator dynamically reflects environmental hazards and resource stability strictly as an outcome indicator (non-spendable).
5. Degraded resource states trigger educational recovery prompts rather than abrupt game overs.
6. P2 NASA Mars Trek terrain references evaluated for lightweight environment background integration.  
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
