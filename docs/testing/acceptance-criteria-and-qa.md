# Acceptance Criteria, Testing Strategy & Risk Register

## 1. Acceptance Criteria by System

### A. Scientific Data Engine
- **AC-SCI-1:** The application loads bundled, verified NASA DONKI space weather snapshots by default, reliably generating solar flare and CME events without requiring any network calls or API keys.
- **AC-SCI-2:** Radiation exposure calculations accurately apply the Gale Crater GCR baseline ($0.64 \pm 0.12\text{ mSv/day}$ `[REAL MSL Curiosity RAD, first 300 sols]`) and model the regolith attenuation factor ($80\%$ reduction `[GAME-SIMPLIFIED]`) when the Storm Shelter / Shielding module is constructed.
- **AC-SCI-3:** The solar storm event scenario clearly presents the $+50\text{ mSv}$ event as an intentionally exaggerated hypothetical game scenario, and the debrief distinguishes it from the $\approx 50\ \mu\text{Sv}$ ($0.05\text{ mSv}$) event observed by Curiosity on Mars in 2013.
- **AC-SCI-4:** All displayed educational cards and glossary definitions display explicit `[REAL]`, `[DERIVED]`, or `[GAME-SIMPLIFIED]` taxonomy tags.

### B. Base Simulation & Grid
- **AC-SIM-1:** Player can select, place, inspect, and repair 4 essential MVP modules (Habitat, Solar Array & Battery, Life Support System, Storm Shelter / Shielding) on the 2D Martian surface grid.
- **AC-SIM-2:** Construction requires sufficient materials and deducts resources immediately upon placement.
- **AC-SIM-3:** Day/Night cycle alternates every Sol: Solar Array produces $+20\text{ kW}$ during Day and $0\text{ kW}$ at Night; the Battery discharges to cover the night heating and life-support baseline.
- **AC-SIM-4:** The 3 core resources (Power, Life Support, Storm Protection) calculate balance each Sol. If Life Support reserves drop to zero or Power depletes, non-essential systems pause and Crew Safety status transitions from Nominal to Caution.
- **AC-SIM-5:** **Crew Safety** functions strictly as an outcome indicator (Nominal $\rightarrow$ Caution $\rightarrow$ Critical) and cannot be directly spent as a currency.

### C. Mission Progression & Scenarios
- **AC-EDU-1:** Mission 1 ("Touchdown") completes successfully when Power and Life Support remain positive for 5 consecutive Sols.
- **AC-EDU-2:** Mission 2 ("The Solar Storm") issues a 1-Sol advance warning when a CME is detected; the player must ensure Storm Protection is active before the storm arrives.
- **AC-EDU-3:** Mission 3 ("Sustainable Outpost") completes when the base survives through Sol 30 with Crew Safety remaining in Nominal status, optionally unlocking the CSA Greenhouse upgrade.

### D. User Interface & Accessibility
- **AC-UIX-1:** All interactive buttons and module placement tiles provide a minimum touch/click footprint of $44\times 44\text{ px}$.
- **AC-UIX-2:** Text-to-background contrast ratio meets or exceeds $4.5:1$ for body text and $3:1$ for large titles (WCAG 2.1 AA).
- **AC-UIX-3:** All 3 resource meters and the Crew Safety indicator feature dual encoding (color + distinct symbol/icon) for red-green colorblind accessibility.
- **AC-UIX-4:** The game can be fully navigated and operated via keyboard (`Tab`, `Enter`, `Space`, `Arrow Keys`).
- **AC-UIX-5:** The Web Audio procedural synthesizer includes a prominent, persistent single-click mute toggle.

---

## 2. Testing Strategy

### A. Automated Unit Testing
- **Test Framework:** Lightweight Node.js test runner or Vitest.
- **Target Test Suites:**
  - `test/simulation/resources.test.ts`: Verifies correct mathematical balancing across all Sol states (day generation, night battery depletion, life-support drain, and zero-power degraded states).
  - `test/simulation/crew-safety.test.ts`: Asserts that Crew Safety transitions correctly based on life support and radiation exposure without allowing illegal state mutations.
  - `test/science/dosimetry.test.ts`: Verifies radiation calculations with and without regolith shielding against Curiosity RAD baselines ($0.64\text{ mSv/day}$).
  - `test/data/snapshot-loader.test.ts`: Asserts that bundled NASA DONKI snapshots parse valid CME/flare records with zero network calls.

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

## 3. Comprehensive Risk Register (18 Hours Remaining)

| Risk ID | Risk Description | Severity | Likelihood | Mitigation Strategy |
|---|---|---|---|---|
| **RSK-01** | Dependency on live external APIs causing rate limits or downtime during judging | High | High | **Eliminated:** Core game relies 100% on bundled, verified NASA data snapshots. No live API dependency exists. |
| **RSK-02** | Time budget overrun in remaining 18h solo development | High | Medium | Strictly bound each phase to allocated hours. Streamlined to 3 resources and 4 MVP modules; deferred complex features to future enhancements. |
| **RSK-03** | Cognitive overload for target audience (ages 7–12) | Medium | Medium | Simplified HUD with dual-encoded gauges, explanatory sub-values (O2/water/food), and proactive guidance from Commander Aiko. |
| **RSK-04** | Performance lag on low-cost school hardware | Medium | Low | Zero heavy 3D frameworks; lightweight 2D HTML5 Canvas rendering + semantic HTML/CSS overlays. |
| **RSK-05** | Unverified or inaccurate scientific claims reducing judging score | High | Low | Conducted thorough scientific audit; established strict `[REAL]`, `[DERIVED]`, and `[GAME-SIMPLIFIED]` taxonomy with exact literature citations. |
| **RSK-06** | Accidental introduction of paid services or unexpected charges | Critical | Low | Zero cloud databases or external SaaS; static client-side architecture with free hosting on GitHub Pages / Vercel. |

---
*Audited and approved for Phase 00.*
