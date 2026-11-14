# Roadmap: OUTPOST: MARS

## Overview

OUTPOST: MARS is developed across 9 sequential phases totaling exactly 20 working hours. Phase 00 (2 hours) is complete. The remaining 18 working hours proceed through foundation scaffolding, offline NASA scientific data integration, the 3-resource simulation loop with 4 MVP modules, narrative mission scenarios, child-friendly UI/UX, procedural audio-visual polish, rigorous testing, and final presentation packaging.

---

## Phases & Time Accounting

- [x] **Phase 00: Planning & Scope Lock** (2h) — [COMPLETE] Architecture, scientific validity audit, GSD setup, 100-point scorecard, and risk register.
- [x] **Phase 01: Project Foundation & Architecture** (1h) — [COMPLETE] Greenfield Vite + TypeScript scaffolding, HTML5 Canvas viewport, standard CSS layout, and state persistence.
- [ ] **Phase 02: Science & Data Integration Engine** (3h) — Bundled NASA DONKI space weather snapshots, MSL Curiosity RAD Gale Crater dosimetry baseline ($0.64 \pm 0.12\text{ mSv/day}$), Perseverance MEDA meteorological ranges, and strict REAL/DERIVED/GAME-SIMPLIFIED labeling.
- [ ] **Phase 03: 2D Base Simulation & Resource Systems** (3h) — 4 essential MVP modules, 3-resource interdependent engine (Power, Life Support, Storm Protection), Crew Safety outcome indicator, and turn-based Sol progression.
- [ ] **Phase 04: Mission Scenarios & Space Weather Events** (3h) — 3-mission story campaign, CME/solar flare event handling, emergency shelter protocols, and educational debriefs explaining the distinction between real observations and exaggerated scenarios.
- [ ] **Phase 05: Child-Friendly UI/UX & Accessibility** (2h) — Accessible HUD, Commander Aiko advisor speech bubbles, WCAG 2.1 AA controls, and interactive scientific glossary.
- [ ] **Phase 06: Audio, Visual Polish & Narrative Feedback** (2h) — Canvas sprite rendering, module operational animation states, Web Audio procedural sound synthesizer, and master mute toggle.
- [ ] **Phase 07: Testing, Edge Cases & Verification** (2h) — Automated unit test suite, browser/viewport compatibility checks, game balance tuning, and edge-case hardening.
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

### Phase 01: Project Foundation & Architecture (1h)
**Goal:** Scaffold a zero-cost, zero-friction client-side web application foundation using Vite + TypeScript + HTML5 Canvas and standard CSS, with zero live API dependencies.
**Depends on:** Phase 00
**Requirements:** TECH-01, TECH-02
**Success Criteria:**
1. Vite dev server boots cleanly with zero build errors and instant hot-reload.
2. Responsive 2D Canvas viewport and semantic HTML/CSS HUD overlay render correctly.
3. Client-side state saves and restores reliably from `localStorage`.
**Plans:** 1 plan (01-01)

---

### Phase 02: Science & Data Integration Engine (3h)
**Goal:** Implement the offline-first scientific data engine with bundled authentic snapshots of NASA DONKI events, MSL Curiosity RAD Gale Crater dosimetry baselines ($0.64 \pm 0.12\text{ mSv/day}$), Perseverance MEDA meteorological bounds, and NASA BVAD standards.
**Depends on:** Phase 01
**Requirements:** SCI-01, SCI-02, SCI-03, SCI-04, SCI-05
**Success Criteria:**
1. Bundled NASA DONKI snapshot correctly feeds historical solar flare and CME event profiles into the event queue without network dependencies.
2. Radiation dosimetry model accurately applies Curiosity RAD Gale Crater baseline figures ($0.64 \pm 0.12\text{ mSv/day}$) and labels storm surges and regolith attenuation as game-simplified values.
3. Environmental models incorporate Perseverance MEDA pressure bounds ($700\text{--}800\text{ Pa}$) and qualitative daily thermal variation.
4. All scientific outputs display clear REAL, DERIVED, or GAME-SIMPLIFIED badges.
**Plans:** 2 plans (02-01: Data snapshots & loader; 02-02: Scientific calculation models & badges)

---

### Phase 03: 2D Base Simulation & Resource Systems (3h)
**Goal:** Build the interactive 2D base-building grid and the interconnected 3-resource engine (Power, Life Support, Storm Protection) with the Crew Safety outcome indicator.
**Depends on:** Phase 02
**Requirements:** SIM-01, SIM-02, SIM-03, SIM-04
**Success Criteria:**
1. Player can select and construct 4 essential MVP modules (Habitat, Solar Array & Battery, Life Support System, Storm Shelter / Shielding) on the 2D Martian grid.
2. Turn-based Sol tick accurately balances Power, Life Support (with O2/H2O/nutritional sub-values), and Storm Protection.
3. Crew Safety indicator dynamically reflects environmental hazards and resource stability without acting as a spendable resource.
4. Degraded resource states trigger educational recovery prompts rather than abrupt game overs.
**Plans:** 2 plans (03-01: Grid placement & module state; 03-02: Sol turn-loop & resource balancing)

---

### Phase 04: Mission Scenarios & Space Weather Events (3h)
**Goal:** Build the 3-mission narrative campaign and the dynamic event engine that injects authentic space weather crises into gameplay.
**Depends on:** Phase 03
**Requirements:** EDU-01, EDU-02, EDU-03
**Success Criteria:**
1. Player progresses through 3 structured missions (Touchdown, The Solar Storm, Sustainable Outpost).
2. Space weather events (CME particle storms, dust storms, thermal drops) require tactical resource shifts and storm shelter activation.
3. Post-mission debrief presents scores across Science, Safety, and Sustainability, explicitly explaining the difference between real Mars observations and exaggerated scenarios.
**Plans:** 2 plans (04-01: Narrative mission engine; 04-02: Event generator & science debrief)

---

### Phase 05: Child-Friendly UI/UX & Accessibility (2h)
**Goal:** Refine the user interface to be intuitive, engaging, and accessible for 7–12 year-olds with high-contrast accessibility.
**Depends on:** Phase 04
**Requirements:** UIX-01, UIX-02, UIX-03, UIX-04
**Success Criteria:**
1. HUD displays prominent color-coded gauges and dual-encoded icons for Power, Life Support, Storm Protection, and Crew Safety.
2. Commander Aiko advisor delivers friendly guidance and crisis warnings.
3. All interactive buttons meet 44x44px minimum touch targets and keyboard navigation standards (WCAG 2.1 AA).
4. Interactive glossary pops up when clicking scientific terms.
**Plans:** 1 plan (05-01)

---

### Phase 06: Audio, Visual Polish & Narrative Feedback (2h)
**Goal:** Polish visual art assets, sprite states, Web Audio procedural sound synthesis, and tactile interaction feedback.
**Depends on:** Phase 05
**Requirements:** ART-01, ART-02
**Success Criteria:**
1. Modules have distinct operational, active, and degraded visual states on the Canvas.
2. Web Audio synthesizer provides procedural Martian wind, module hums, and alert tones with a prominent mute toggle.
3. Visual particle effects highlight dust storms, solar flare warnings, and successful Sol completions.
**Plans:** 1 plan (06-01)

---

### Phase 07: Testing, Edge Cases & Verification (2h)
**Goal:** Execute full automated unit tests, browser compatibility checks, game balance validation, and edge-case hardening.
**Depends on:** Phase 06
**Requirements:** QA-01, QA-02
**Success Criteria:**
1. Automated unit test suite passes 100% of resource balance, simulation math, and offline data assertions.
2. Edge cases (zero power, instant solar storm, depleted life support) resolve gracefully with learning feedback.
3. Zero console errors across desktop and tablet screen viewports.
**Plans:** 1 plan (07-01)

---

### Phase 08: Presentation, Video Demo & Submission (2h)
**Goal:** Prepare a compelling submission package matching official Space Apps judging criteria, including live demo link and video pitch.
**Depends on:** Phase 07
**Requirements:** SUB-01, SUB-02
**Success Criteria:**
1. 2-minute demonstration video recorded and published according to the storyboard.
2. Project README, live deployment link, and NASA data citations completed.
3. Submission text verified against the 100-point internal scorecard and judging dimensions.
**Plans:** 1 plan (08-01)

---
*Roadmap audited: 2026-11-14*
