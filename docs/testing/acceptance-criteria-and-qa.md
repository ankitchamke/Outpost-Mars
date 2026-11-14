# Acceptance Criteria, Testing Strategy & Risk Register

## 1. Acceptance Criteria by System

### A. Scientific Data Engine
- **AC-SCI-1:** The application loads bundled, verified NASA DONKI space-weather snapshots (P0: solar flares, CMEs, SEPs) and NASA RadLab telemetry snapshots (P0: documented instrument dosimetry) by default, reliably generating space-weather events and educational cards without requiring live network calls or API keys.
- **AC-SCI-2:** Radiation exposure calculations accurately apply the Gale Crater GCR baseline ($0.64 \pm 0.12\text{ mSv/day}$ `[REAL MSL Curiosity RAD, first 300 sols]`), compare against RadLab LEO telemetry (strictly tagged as LEO/ISS reference data and never presented as Mars surface dose), and model Storm Shield regolith attenuation factor ($80\%$ reduction `[GAME-SIMPLIFIED]`).
- **AC-SCI-3:** The solar storm event scenario clearly presents the $+50\text{ mSv}$ event as an intentionally exaggerated hypothetical game training drill, and the debrief distinguishes it from the $\approx 50\ \mu\text{Sv}$ ($0.05\text{ mSv}$) event observed by Curiosity on Mars in 2013.
- **AC-SCI-4:** Space biology research references from NASA OSDR (P1) on bone/muscle degradation ($1.0\%\text{--}1.5\%/\text{month}$ in 0g) are preserved with study conditions and explicitly note that partial $0.38g$ gravity adaptation on humans is scientifically unverified.
- **AC-SCI-5:** All displayed educational cards and glossary definitions display explicit `[REAL]`, `[DERIVED]`, or `[GAME-SIMPLIFIED]` taxonomy tags with preserved metadata (source URL, dataset id, retrieval date, units, methodology, and limitations).
- **AC-SCI-6:** Security & API key compliance: Zero API keys or secrets in frontend code, zero `VITE_*` secrets, zero credentials in browser JavaScript, zero committed `.env`. Offline-first playability verified with network disabled.

### B. Base Simulation & Grid (Phaser 2D Engine)
- **AC-SIM-1:** Player can select, place, inspect, and repair 4 essential MVP modules (Habitat, Solar Array & Battery, Life Support System, Storm Shield / Shelter) on the 2D Martian surface grid rendered via the approved **Phaser** 2D engine (cleanly replacing the Phase 01 Canvas foundation in Phase 03; zero dual-engine maintenance).
- **AC-SIM-2:** Construction requires sufficient materials and deducts resources immediately upon placement.
- **AC-SIM-3:** Day/Night cycle alternates every Sol: Solar Array produces $+20\text{ kW}$ Sun Power during Day and $0\text{ kW}$ at Night; the Battery discharges to cover the night heating and life-support baseline.
- **AC-SIM-4:** The 3 core resources (Sun Power, Life Support, Storm Shield) calculate balance each Sol. If Life Support reserves drop to zero or Sun Power depletes, non-essential systems pause and Crew Safety status transitions from Nominal to Caution.
- **AC-SIM-5:** **Crew Safety** functions strictly as an outcome indicator (Nominal $\rightarrow$ Caution $\rightarrow$ Critical) and cannot be directly spent as a currency.

### C. Mission Progression & Scenarios (Seven-Sol Campaign)
- **AC-EDU-1:** Structured **Seven-Sol campaign** progression: Sols 1–2 establish Sun Power and Life Support; Sols 3–4 issue space-weather warnings and require Storm Shield construction; Sol 5 tests shelter against the $+50\text{ mSv}$ surge; Sols 6–7 address recovery, astronaut workout countermeasures, and long-term sustainability.
- **AC-EDU-2:** Space-weather crises derived from verified NASA DONKI records trigger advance warnings based on calculated CME shock transit times.
- **AC-EDU-3:** Post-mission debrief presents scores across Science, Safety, and Sustainability, explicitly explaining the difference between real Mars observations and exaggerated training scenarios.

### D. User Interface & Accessibility
- **AC-UIX-1:** All interactive buttons and module placement tiles provide a minimum touch/click footprint of $44\times 44\text{ px}$.
- **AC-UIX-2:** Text-to-background contrast ratio meets or exceeds $4.5:1$ for body text and $3:1$ for large titles (WCAG 2.1 AA).
- **AC-UIX-3:** All 3 resource meters (Sun Power, Life Support, Storm Shield) and the Crew Safety indicator feature dual encoding (color + distinct symbol/icon) for red-green colorblind accessibility.
- **AC-UIX-4:** The game can be fully navigated and operated via keyboard (`Tab`, `Enter`, `Space`, `Arrow Keys`).
- **AC-UIX-5:** The Web Audio procedural synthesizer includes a prominent, persistent single-click mute toggle.

---

## 2. Testing Strategy

### A. Automated Unit Testing
- **Test Framework:** Vitest.
- **Target Test Suites:**
  - `tests/simulation/resources.test.ts`: Verifies correct mathematical balancing across all Sol states (Sun Power generation, night battery depletion, life-support drain, and zero-power degraded states).
  - `tests/simulation/crew-safety.test.ts`: Asserts that Crew Safety transitions correctly based on life support and radiation exposure without allowing illegal state mutations.
  - `tests/science/dosimetry.test.ts`: Verifies radiation calculations with and without Storm Shield regolith attenuation against Curiosity RAD baselines ($0.64\text{ mSv/day}$).
  - `tests/data/snapshot-loader.test.ts`: Asserts that bundled NASA DONKI and RadLab snapshots parse valid records with zero network calls and preserved metadata.
  - `tests/rendering/phaser-integration.test.ts`: Verifies Phaser game lifecycle, clean replacement of Phase 01 Canvas renderer, and asset loading in Phase 03.

### B. Usability & Accessibility Testing
- **Lighthouse Audit Target:** $\ge 95$ Accessibility, $\ge 95$ Performance, $\ge 95$ Best Practices.
- **Child-Friendly Verification Checklist:**
  - Can an 8-year-old understand why a module is degraded?
  - Does Commander Aiko explain problems without frustration or punitive game overs?
  - Are all technical terms clickable to view the simple glossary?
- **Supported Viewports:**
  - Desktop: 1920x1080, 1440x900.
  - School Chromebook / Laptop: 1366x768.
  - Tablet: iPad portrait (768x1024) and landscape (1024x768).

---

## 3. Comprehensive Risk Register (17 Hours Remaining)

| Risk ID | Risk Description | Severity | Likelihood | Mitigation Strategy |
|---|---|---|---|---|
| **RSK-01** | Dependency on live external APIs causing rate limits or downtime during judging | High | High | **Eliminated:** Core game relies 100% on bundled, verified NASA data snapshots. No live API dependency exists. |
| **RSK-02** | Time budget overrun in remaining 17h solo development | High | Medium | Strictly bound each phase to allocated hours. Streamlined to 3 resources (Sun Power, Life Support, Storm Shield), 4 MVP modules, and Seven Sols; deferred complex features to future enhancements. |
| **RSK-03** | Engine transition debt between Phase 01 Canvas and Phaser | Medium | Low | Phaser is scheduled in Phase 03 to cleanly replace Phase 01 Canvas rendering code; zero dual-engine maintenance. |
| **RSK-04** | API key or credential leak in frontend code | Critical | Low | Zero secrets in client-side code; no `VITE_*` secrets; local ingestion scripts produce static JSON snapshots; user provides key on request. |
| **RSK-05** | Cognitive overload for target audience (ages 7–12) | Medium | Medium | Simplified HUD with dual-encoded gauges, explanatory sub-values (O2/water/food), and proactive guidance from Commander Aiko. |
| **RSK-06** | Unverified or inaccurate scientific claims reducing judging score | High | Low | Established strict `[REAL]`, `[DERIVED]`, and `[GAME-SIMPLIFIED]` taxonomy with exact literature citations and clear boundaries (DONKI $\neq$ surface dose; RadLab ISS $\neq$ Mars surface). |
| **RSK-07** | Accidental introduction of paid services or unexpected charges | Critical | Low | Zero cloud databases, backend servers, or external SaaS; static client-side architecture with free hosting on GitHub Pages / Vercel. |

---
*Audited and synchronized: 2026-11-14 (Technical Direction Synchronization)*
