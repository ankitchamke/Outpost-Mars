# Project State: OUTPOST: MARS

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-11-14 after Technical Direction Synchronization)

**Core Value:** Translate real NASA and space agency data into an intuitive, empowering, and scientifically grounded 2D mission trainer where young learners discover how authentic science and engineering keep humans alive on Mars.  
**Current Focus:** Technical Direction Synchronized → Ready for Phase 02: Science & Data Integration Engine (3h)

---

## Current Position

- **Phase:** 01 of 08 (Project Foundation & Architecture — Complete)
- **Current Phase:** Phase 02: Science & Data Integration Engine (3h) [Awaiting explicit user approval to begin implementation]
- **Time Accounting:**
  - Total Project Budget: 20.0 hours
  - Time Spent (Phase 00 & 01): 3.0 hours (Phase 00: 2.0h, Phase 01: 1.0h) [COMPLETE]
  - Remaining Time (Phases 02–08): Exactly 17.0 hours
- **Last Activity:** 2026-11-14 — Synchronized updated project decisions into planning and documentation:
  - Phaser approved as 2D game engine (scheduled for Phase 03 integration to replace Phase 01 Canvas foundation cleanly; no competing engines maintained).
  - Resources standardized to Sun Power, Life Support, Storm Shield with Crew Safety as an outcome indicator.
  - Campaign standardized to Seven Sols.
  - NASA resources prioritized: P0 DONKI, P0 RadLab, P1 OSDR, P2 Mars Trek with clear phase mappings and scientific boundaries.
  - Strict API key security and local ingestion architecture documented.
- **Progress:** [██░░░░░░░░] 15% (3h / 20h)

---

## Performance Metrics

**Velocity:**
- Total plans completed: 2 (Phase 00, Phase 01)
- Total execution time: 3.0 hours
- Remaining time: Exactly 17.0 hours

---

## Accumulated Context

### Locked Decisions
- **Approved 2D Game Engine:** **Phaser** is the approved 2D engine; Phase 01 Canvas renderer serves as foundation only and will be cleanly replaced in Phase 03 without maintaining two competing rendering engines.
- **Technology Stack:** Vite + TypeScript, Standard CSS for HTML HUD and overlays (CSS custom properties, zero bloat), Vitest, Web Audio API procedural sound with master mute, offline-first architecture. No backend, database, login, multiplayer or paid services.
- **Resource Model:** 3 core resources: **Sun Power** (kW and battery storage), **Life Support** (combined buffer with O2, direct water intake, and caloric breakdown), and **Storm Shield** (regolith and shelter shielding readiness).
- **Outcome Indicator:** **Crew Safety** is strictly an outcome indicator (Nominal / Caution / Danger), NOT a spendable resource.
- **Campaign Structure:** **Seven Sols** turn-based mission campaign with escalating space-weather events and non-punitive learning debriefs.
- **Base Modules:** 4 essential MVP modules: Habitat, Solar Array & Battery, Life Support System, and Storm Shield / Shelter. (CSA Greenhouse as optional scenario event).
- **NASA Resource Prioritization & Boundaries:**
  - **P0 NASA DONKI:** Solar flares, CMEs, SEPs, space-weather context. Phase 02: endpoint research, schema, ingestion, normalization, provenance, snapshots; Phase 04: scenario building. *Critical Boundary:* DONKI does NOT directly provide Mars surface radiation dose.
  - **P0 NASA RadLab:** ISS and documented instrument radiation measurements, education, and shielding. Phase 02: query research, dataset selection, validation, snapshots. *Critical Boundary:* Preserve instrument, spacecraft, trajectory, dose type, units; NEVER present ISS readings as Mars surface readings. MSL Curiosity RAD Gale Crater baseline ($0.64 \pm 0.12\text{ mSv/day}$) remains representative Mars surface baseline.
  - **P1 NASA OSDR:** Space biology and astronaut health research (bone/muscle). Phase 02: investigate API capabilities, metadata, public studies without unnecessary bulk downloads; Phase 05: educational explanations. *Critical Boundary:* Preserve organism, population, study conditions, limitations; partial 0.38g gravity effect on humans is unverified.
  - **P2 NASA Mars Trek:** Mars surface imagery, elevation, terrain references. Phase 03: evaluate terrain references for Phaser environment; Phase 06: visual polish. *Critical Boundary:* Lightweight asset integration, not a complex GIS.
- **API Key & Security Governance:**
  - User generates free NASA API key from `api.nasa.gov` when required. Not requested now; requested only when exact integration step requires it.
  - Verification checklist before using resources: endpoint, auth, rate limits, schema, licensing. Do not assume every resource requires an API key.
  - Never hardcode secrets, never use `VITE_*` for secrets, never expose credentials in browser JS, never commit `.env`.
  - Private local ingestion scripts generate version-controlled snapshots. Offline-first deployment.
- **Scientific Rigor:** Strict `[REAL]`, `[DERIVED]`, and `[GAME-SIMPLIFIED]` taxonomy tags. Full metadata preservation (source URL, dataset id, retrieval date, units, methodology, limitations). Never invent measurements or citations.

### Pending Todos
- [ ] Awaiting explicit user approval to begin Phase 02 implementation.

### Blockers / Concerns
- None.

---

## Session Continuity

- **Current Session:** 2026-11-14
- **Completed:** Technical Direction Synchronization across planning and documentation.
- **Next Step:** Awaiting user approval to proceed to Phase 02: Science & Data Integration Engine (3h).
