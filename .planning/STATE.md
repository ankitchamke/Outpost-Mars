# Project State: OUTPOST: MARS

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-11-14 after Final Phase 00 Scientific Notes)

**Core Value:** Translate real NASA and space agency data into an intuitive, empowering, and scientifically grounded 2D mission trainer where young learners discover how authentic science and engineering keep humans alive on Mars.  
**Current Focus:** Phase 00 — Planning & Scope Lock [COMPLETE] → Ready for Phase 01

---

## Current Position

- **Phase:** 00 of 08 (Planning & Scope Lock — Complete)
- **Next Phase:** Phase 01: Project Foundation & Architecture (1h)
- **Time Accounting:**
  - Total Project Budget: 20.0 hours
  - Time Spent (Phase 00): 2.0 hours [COMPLETE]
  - Remaining Time (Phases 01–08): Exactly 18.0 hours
- **Last Activity:** 2026-11-14 — Completed final Phase 00 scientific corrections:
  - Corrected Curiosity RAD Gale Crater baseline to $0.64 \pm 0.12\text{ mSv/day}$ (first 300 sols).
  - Explicitly differentiated between the observed $\approx 50\ \mu\text{Sv}$ surface event in 2013 and the exaggerated $+50\text{ mSv}$ hypothetical game scenario.
  - Clarified regolith shielding 80% attenuation as a hypothetical game-simplified parameter.
  - Set Jezero pressure to representative $700\text{--}800\text{ Pa}$ and temperature to qualitative daily/seasonal swings.
  - Refined life support values based on NASA BVAD ($0.84\text{ kg } O_2/\text{day}$, $2.0\text{--}2.5\text{ L/day}$ direct intake, $\sim 2,700\text{--}3,000\text{ kcal/day}$).
  - Documented $1.0\%\text{--}1.5\%/\text{month}$ bone loss as weight-bearing $0g$ microgravity research, noting Mars $0.38g$ effect as scientifically unverified in humans.
  - Synchronized schedule to exactly 18.0 hours remaining.
- **Progress:** [█░░░░░░░░░] 10% (2h / 20h)

---

## Performance Metrics

**Velocity:**
- Total plans completed: 1 (Phase 00)
- Total execution time: 2.0 hours
- Remaining time: Exactly 18.0 hours

---

## Accumulated Context

### Locked Decisions
- **Technology Stack:** Vite + TypeScript + HTML5 Canvas, HTML/CSS for HUD/menus/overlays (standard CSS with variables), Web Audio API for procedural audio with master mute control.
- **Data Architecture:** Bundled, verified NASA data snapshots as default; zero dependency on live network APIs for core gameplay. No judge-facing API key input.
- **Resource Model:** 3 core resources: Power, Life Support (with O2, water intake, and nutritional sub-values), and Storm Protection.
- **Outcome Indicator:** Crew Safety is an outcome indicator (Nominal / Caution / Danger), NOT a spendable resource.
- **Base Modules:** 4 essential MVP modules: Habitat, Solar Array & Battery, Life Support System, and Storm Shelter / Shielding. (Greenhouse is an optional scenario upgrade).
- **Scientific Rigor:** Strict REAL, DERIVED, and GAME-SIMPLIFIED labeling with exact literature citations and clear boundaries between observed science and pedagogical gameplay mechanics.

### Pending Todos
- [ ] Await user approval on Phase 00 completion to begin Phase 01 scaffolding.

### Blockers / Concerns
- None.

---

## Session Continuity

- **Current Session:** 2026-11-14
- **Completed:** Final Phase 00 scientific corrections, GSD roadmap/progress synchronization, and documentation audit.
- **Next Step:** Awaiting user approval to proceed to Phase 01: Project Foundation & Architecture (1h).
