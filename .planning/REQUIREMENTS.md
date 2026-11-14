# Requirements: OUTPOST: MARS

**Defined:** 2026-11-14 (Technical Direction Synchronization)  
**Total Budget:** 20 hours (Phase 00: 2h [COMPLETE], Phase 01: 1h [COMPLETE], Remaining Phases 02–08: Exactly 17h)  
**Core Value:** Translate real NASA and space agency data into an intuitive, empowering, and scientifically grounded 2D mission trainer where young learners discover how authentic science and engineering keep humans alive on Mars.

---

## v1 MVP Requirements (Exactly 17 Hours Remaining)

### 1. Scientific Data Integration (SCI)
- [ ] **SCI-01**: Application includes bundled, verified NASA DONKI space-weather snapshots (P0: solar flare, CME, and SEP events) and NASA RadLab telemetry snapshots (P0: documented instrument dosimetry) as the default data sources, feeding space-weather alerts and radiation education without requiring a live network connection or exposing credentials.
- [ ] **SCI-02**: Radiation model incorporates real MSL Curiosity RAD Gale Crater baseline measurements ($0.64 \pm 0.12\text{ mSv/day}$) as a representative surface baseline, utilizes NASA RadLab measurements for educational comparisons and shielding explanations (preserving instrument, spacecraft, trajectory, dose type, and units, and strictly never presenting ISS readings as Mars surface readings), labels the $+50\text{ mSv}$ storm surge as an intentionally exaggerated hypothetical game scenario (contrasted with the $\approx 50\ \mu\text{Sv}$ event observed on Mars in 2013), and labels 80% regolith attenuation as a hypothetical game-simplified parameter.
- [ ] **SCI-03**: Astronaut health model reflects biological spaceflight trade-offs informed by NASA OSDR (P1) public research metadata and studies (preserving organism, population, study conditions, and limitations; citing $1.0\%\text{--}1.5\%/\text{month}$ bone mineral density loss in weight-bearing bones from orbital human cohorts in $0g$), explicitly noting that human physiological adaptation to partial $0.38g$ gravity is scientifically unverified.
- [ ] **SCI-04**: Outpost environment reflects authentic Jezero Crater meteorological observations from Perseverance MEDA (representative $700\text{--}800\text{ Pa}$ surface pressure and extreme subzero daily temperature swings).
- [ ] **SCI-05**: Space food production and life support baseline values reflect NASA BVAD standards ($0.84\text{ kg } O_2\text{ / person-day}$, $2.0\text{--}2.5\text{ L/day}$ direct water intake, $\sim 2,700\text{--}3,000\text{ kcal/day}$), with CSA greenhouse research integrated as an optional scenario upgrade.

### 2. Base Simulation & Resource Systems (SIM)
- [ ] **SIM-01**: Simulation models 3 core managed resources: **Sun Power** (kW generation and battery storage), **Life Support** (combined consumable reserve with O2, direct water, and nutritional sub-values visible upon inspection), and **Storm Shield** (regolith and shelter shielding readiness).
- [ ] **SIM-02**: **Crew Safety** is modeled as a primary **outcome indicator** (Nominal / Caution / Danger), directly reflecting power stability, life-support reserves, and radiation exposure. Crew Safety is strictly non-spendable.
- [ ] **SIM-03**: Base grid supports placement and operation of 4 essential MVP modules:
  1. Habitat
  2. Solar Array & Battery
  3. Life Support System
  4. Storm Shield / Shelter
  *(Greenhouse available as an optional scenario upgrade).*
- [ ] **SIM-04**: Simulation executes in turn-based Sols (Martian days) across a structured **Seven-Sol campaign**, with non-punitive degraded states and educational recovery prompts when resources enter caution thresholds.

### 3. Mission Scenarios & Storytelling (EDU)
- [ ] **EDU-01**: **Seven-Sol progressive story campaign** scaled for ages 7–12, integrating verified NASA DONKI space-weather events and mission trade-offs across Seven Sols.
- [ ] **EDU-02**: NASA Science Fact cards pop up during key events, clearly distinguishing between `[REAL]` NASA data, `[DERIVED]` estimates, and `[GAME-SIMPLIFIED]` mechanics, preserving provenance metadata (source URL, dataset id, retrieval date, units, methodology, and limitations).
- [ ] **EDU-03**: Post-mission debrief evaluates player choices across Science, Safety, and Sustainability, explicitly explaining the difference between real Mars observations and exaggerated training scenarios, supported by NASA OSDR and RadLab educational research context.

### 4. Child-Friendly UI/UX & Accessibility (UIX)
- [ ] **UIX-01**: Child-friendly HUD displaying the 3 core resources (Sun Power, Life Support, Storm Shield) and the Crew Safety outcome indicator using intuitive color-coded progress bars and dual-encoded icons.
- [ ] **UIX-02**: Virtual advisor "Commander Aiko" provides proactive speech-bubble guidance and non-punitive hints during crises.
- [ ] **UIX-03**: Interface adheres to WCAG 2.1 AA accessibility guidelines (minimum 44x44px touch targets, high-contrast text >4.5:1, colorblind-safe palettes, full keyboard navigability).
- [ ] **UIX-04**: Simplified terminology with click/tap glossary popups for complex scientific concepts (e.g., CME, Regolith, Sabatier, Dosimetry, Bone Mineral Density).

### 5. Visuals, Audio & Technical Architecture (ART/TECH)
- [ ] **ART-01**: 2D Martian surface and module graphics rendered using the approved **Phaser** 2D game engine (integrated in Phase 03 to cleanly replace the Phase 01 Canvas foundation without dual engines), displaying visual operational states (active, idle, degraded) and incorporating lightweight NASA Mars Trek (P2) terrain references.
- [ ] **ART-02**: Web Audio API procedural synthesizer providing atmospheric Martian wind, module hums, and alert sirens with a prominent one-click mute control.
- [x] **TECH-01**: Zero-dependency, client-side web application built with Vite + TypeScript + HTML/CSS HUD + Vitest, running in modern desktop and tablet browsers without installation or live API dependencies. No backend, database, login, multiplayer, or paid services.
- [x] **TECH-02**: Client-side mission state persistence in browser `localStorage`.
- [ ] **TECH-03**: Security & API Key governance: Zero hardcoded secrets, zero secrets in frontend `VITE_*` variables, zero credentials in browser JavaScript, zero `.env` commits. Ingestion scripts run locally to produce version-controlled snapshots. 100% offline gameplay reliability.

### 6. Quality Assurance & Submission Package (QA/SUB)
- [ ] **QA-01**: Automated Vitest test suite verifying simulation balance, resource math equations, and offline snapshot data loading.
- [ ] **QA-02**: Cross-browser visual and functional verification on desktop and tablet viewports.
- [ ] **SUB-01**: Submission package including comprehensive README, architecture diagrams, verified science bibliography, and live demo link.
- [ ] **SUB-02**: 2-minute demonstration video and presentation deck aligning directly with official Space Apps judging dimensions.

---

## Future Enhancements (Deferred Post-MVP)

- **FUT-01**: Dedicated Greenhouse building module with crop selection (microgreens vs dwarf wheat).
- **FUT-02**: Procedural terrain generation using Mars Trek GeoTIFF elevation downloads (full GIS system).
- **FUT-03**: Multi-outpost network with autonomous rover trade routes.
- **FUT-04**: Real-time classroom multiplayer mode.
- **FUT-05**: Full voice narration and audio dialogue tracks.

---

## Traceability Matrix

| Requirement Group | Mapped Phase | Target Duration | Status |
|---|---|---|---|
| TECH-01, TECH-02 | Phase 01: Project Foundation & Architecture | 1h | Completed |
| SCI-01 to SCI-05, TECH-03 | Phase 02: Science & Data Integration Engine | 3h | Current (Pending) |
| SIM-01 to SIM-04, ART-01 | Phase 03: Phaser Integration, 2D Mars Base & Resource Simulation | 3h | Pending |
| EDU-01 to EDU-03 | Phase 04: Seven-Sol Mission Scenarios & Space-Weather Events | 3h | Pending |
| UIX-01 to UIX-04 | Phase 05: Child-Friendly UI/UX, Accessibility & Educational Explanations | 2h | Pending |
| ART-02, Mars Trek Polish | Phase 06: Audio, Visual Polish, Narrative & Mars Trek References | 2h | Pending |
| QA-01, QA-02 | Phase 07: Testing, Edge Cases & Verification | 2h | Pending |
| SUB-01, SUB-02 | Phase 08: Presentation, Video Demo & Submission | 2h | Pending |

**Coverage Summary:**
- Total MVP Requirements: 22
- Mapped to Phases: 22 (100% mapped)
- Unmapped: 0
- Total Project Budget: 20.0 hours
- Time Spent (Phases 00 & 01): 3.0 hours [COMPLETE]
- Remaining Budget: Exactly 17.0 hours

---
*Requirements audited: 2026-11-14 (Technical Direction Synchronization)*
