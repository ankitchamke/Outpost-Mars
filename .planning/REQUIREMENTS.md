# Requirements: OUTPOST: MARS

**Defined:** 2026-11-14 (Phase 00 Final Audit)  
**Total Budget:** 20 hours (Phase 00: 2h [COMPLETE], Remaining Phases 01–08: Exactly 18h)  
**Core Value:** Translate real NASA and space agency data into an intuitive, empowering, and scientifically grounded 2D mission trainer where young learners discover how authentic science and engineering keep humans alive on Mars.

---

## v1 MVP Requirements (Exactly 18 Hours Remaining)

### 1. Scientific Data Integration (SCI)
- [ ] **SCI-01**: Application includes bundled, verified NASA DONKI space weather snapshots (CME and solar flare events) as the default data source, triggering simulated radiation alerts without requiring a live network connection.
- [ ] **SCI-02**: Radiation model incorporates real MSL Curiosity RAD Gale Crater baseline measurements ($0.64 \pm 0.12\text{ mSv/day}$) as a representative surface baseline, labels the $+50\text{ mSv}$ storm surge as an intentionally exaggerated hypothetical game scenario (contrasted with the $\approx 50\ \mu\text{Sv}$ event observed on Mars in 2013), and labels 80% regolith attenuation as a hypothetical game-simplified parameter.
- [ ] **SCI-03**: Astronaut health model reflects biological spaceflight trade-offs (citing $1.0\%\text{--}1.5\%/\text{month}$ bone mineral density loss in weight-bearing bones from orbital human cohorts in $0g$), explicitly noting that human physiological adaptation to partial $0.38g$ gravity is scientifically unverified.
- [ ] **SCI-04**: Outpost environment reflects authentic Jezero Crater meteorological observations from Perseverance MEDA (representative $700\text{--}800\text{ Pa}$ surface pressure and extreme subzero daily temperature swings).
- [ ] **SCI-05**: Space food production and life support baseline values reflect NASA BVAD standards ($0.84\text{ kg } O_2\text{ / person-day}$, $2.0\text{--}2.5\text{ L/day}$ direct water intake, $\sim 2,700\text{--}3,000\text{ kcal/day}$), with CSA greenhouse research integrated as an optional scenario upgrade.

### 2. Base Simulation & Resource Systems (SIM)
- [ ] **SIM-01**: Simulation models 3 core managed resources: **Power** (kW generation and battery storage), **Life Support** (combined consumable reserve with O2, direct water, and nutritional sub-values visible upon inspection), and **Storm Protection** (regolith and shelter shielding readiness).
- [ ] **SIM-02**: **Crew Safety** is modeled as a primary **outcome indicator** (Nominal / Caution / Danger), directly reflecting power stability, life-support reserves, and radiation exposure.
- [ ] **SIM-03**: Base grid supports placement and operation of 4 essential MVP modules:
  1. Habitat
  2. Solar Array & Battery
  3. Life Support System
  4. Storm Shelter / Shielding
  *(Greenhouse available as an optional scenario upgrade).*
- [ ] **SIM-04**: Simulation executes in turn-based Sols (Martian days), with non-punitive degraded states and educational recovery prompts when resources enter caution thresholds.

### 3. Mission Scenarios & Storytelling (EDU)
- [ ] **EDU-01**: 3-mission progressive story campaign scaled for ages 7–12 (Mission 1: Touchdown & Life Support; Mission 2: The Solar Storm; Mission 3: Sustainable Outpost).
- [ ] **EDU-02**: NASA Science Fact cards pop up during key events, clearly distinguishing between REAL NASA data, DERIVED estimates, and GAME-SIMPLIFIED mechanics.
- [ ] **EDU-03**: Post-mission debrief evaluates player choices across Science, Safety, and Sustainability, explicitly explaining the difference between real Mars observations and exaggerated training scenarios.

### 4. Child-Friendly UI/UX & Accessibility (UIX)
- [ ] **UIX-01**: Child-friendly HUD displaying the 3 core resources and the Crew Safety indicator using intuitive color-coded progress bars and dual-encoded icons.
- [ ] **UIX-02**: Virtual advisor "Commander Aiko" provides proactive speech-bubble guidance and non-punitive hints during crises.
- [ ] **UIX-03**: Interface adheres to WCAG 2.1 AA accessibility guidelines (minimum 44x44px touch targets, high-contrast text >4.5:1, colorblind-safe palettes, full keyboard navigability).
- [ ] **UIX-04**: Simplified terminology with click/tap glossary popups for complex scientific concepts (e.g., CME, Regolith, Sabatier, Dosimetry).

### 5. Visuals, Audio & Technical Architecture (ART/TECH)
- [ ] **ART-01**: Clean, responsive 2D Martian surface and module graphics rendered via HTML5 Canvas with visual operational states (active, idle, degraded).
- [ ] **ART-02**: Web Audio API procedural synthesizer providing atmospheric Martian wind, module hums, and alert sirens with a prominent one-click mute control.
- [ ] **TECH-01**: Zero-dependency, client-side web application built with Vite + TypeScript + HTML/CSS, running in modern desktop and tablet browsers without installation or live API dependencies.
- [ ] **TECH-02**: Client-side mission state persistence in browser `localStorage`.

### 6. Quality Assurance & Submission Package (QA/SUB)
- [ ] **QA-01**: Automated unit test suite verifying simulation balance, resource math equations, and offline snapshot data loading.
- [ ] **QA-02**: Cross-browser visual and functional verification on desktop and tablet viewports.
- [ ] **SUB-01**: Submission package including comprehensive README, architecture diagrams, verified science bibliography, and live demo link.
- [ ] **SUB-02**: 2-minute demonstration video and presentation deck aligning directly with official Space Apps judging dimensions.

---

## Future Enhancements (Deferred Post-MVP)

- **FUT-01**: Dedicated Greenhouse building module with crop selection (microgreens vs dwarf wheat).
- **FUT-02**: Procedural terrain generation using Mars Trek GeoTIFF elevation downloads.
- **FUT-03**: Multi-outpost network with autonomous rover trade routes.
- **FUT-04**: Real-time classroom multiplayer mode.
- **FUT-05**: Full voice narration and audio dialogue tracks.

---

## Traceability Matrix

| Requirement Group | Mapped Phase | Target Duration | Status |
|---|---|---|---|
| TECH-01, TECH-02 | Phase 01: Project Foundation & Architecture | 1h | Pending |
| SCI-01 to SCI-05 | Phase 02: Science & Data Integration Engine | 3h | Pending |
| SIM-01 to SIM-04 | Phase 03: 2D Base Simulation & Resource Systems | 3h | Pending |
| EDU-01 to EDU-03 | Phase 04: Mission Scenarios & Space Weather Events | 3h | Pending |
| UIX-01 to UIX-04 | Phase 05: Child-Friendly UI/UX & Accessibility | 2h | Pending |
| ART-01, ART-02 | Phase 06: Audio, Visual Polish & Narrative Feedback | 2h | Pending |
| QA-01, QA-02 | Phase 07: Testing, Edge Cases & Verification | 2h | Pending |
| SUB-01, SUB-02 | Phase 08: Presentation, Video Demo & Submission | 2h | Pending |

**Coverage Summary:**
- Total MVP Requirements: 21
- Mapped to Phases: 21 (100% mapped)
- Unmapped: 0
- Remaining Budget: Exactly 18.0 hours

---
*Requirements audited: 2026-11-14*
