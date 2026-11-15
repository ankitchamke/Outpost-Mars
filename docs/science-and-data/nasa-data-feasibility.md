# NASA & Space Agency Data Feasibility & Scientific Foundations

## 1. Scientific Rigor, Metadata Preservation & Taxonomy

To ensure absolute scientific integrity in OUTPOST: MARS, every parameter, dataset, and formula is classified under a strict three-tier taxonomy:

- **`[REAL]`**: Direct, empirical measurements from published scientific literature, verified space mission instruments, or raw space agency database feeds.
- **`[DERIVED]`**: Values calculated using verified physical, orbital, or physiological equations applied to known parameters.
- **`[GAME-SIMPLIFIED]`**: Pedagogical abstractions or game-balance parameters designed for children aged 7–12, explicitly identified as hypothetical training mechanics rather than NASA measurements or predictions.

### Metadata Preservation Standard
Every ingested data record, snapshot, and science card must preserve the following provenance metadata whenever available:
1. **Source URL:** Direct URL to the API portal or publication.
2. **Dataset Identifier:** Official dataset, study, or telemetry ID (e.g., DONKI event ID, RadLab instrument ID, OSDR accession number).
3. **Retrieval Date:** ISO date stamp when data was retrieved or verified.
4. **Units:** Exact scientific units (e.g., $\text{mSv/day}$, $\mu\text{Gy/day}$, $\text{Pa}$, $\text{kg/person-day}$, $\text{km/s}$, $\text{W/m}^2$).
5. **Measurement Context:** Mission, spacecraft, instrument, sensor location, and environmental setting (e.g., LEO orbit vs. Gale Crater surface vs. heliosphere).
6. **Methodology & Limitations:** Known caveats, assumptions, or boundaries (e.g., orbit shielding vs. surface atmosphere).

> **Absolute Rule:** Never invent measurements or citations. Never equate DONKI event information with Mars surface dose. Never equate ISS RadLab measurements with Mars surface measurements.

---

## 2. NASA Resource Priorities & Phase Allocation

| Priority & Resource | Portals & Documentation | Purpose & Scope | Phase Allocation | Critical Scientific Boundaries |
|---|---|---|---|---|
| **P0 — NASA DONKI** | • Website: `https://ccmc.gsfc.nasa.gov/DONKI/`<br>• API Portal: `https://api.nasa.gov/` | Solar flares, coronal mass ejections (CMEs), solar energetic particle (SEP) events, space-weather event context. | • **Phase 02:** Endpoint research, schema, ingestion, normalization, provenance, and snapshots.<br>• **Phase 04:** Use verified event records to build mission scenarios. | **Critical Limitation:** DONKI records heliospheric events and models planetary transit; it **does NOT directly provide Mars surface radiation dose**. |
| **P0 — NASA RadLab** | • API: `https://visualization.osdr.nasa.gov/radlab/gui/data-api/` | Radiation measurements from ISS and other documented instruments; radiation education and shielding explanations. | • **Phase 02:** Query research, instrument-specific dataset selection, validation, and snapshots. | **Critical Boundary:** Preserve instrument, spacecraft, trajectory, dose type, and units. **Never present ISS readings as Mars surface readings**. |
| **P1 — NASA OSDR** | • Website: `https://osdr.nasa.gov/bio/repo/`<br>• Search API: `https://osdr.nasa.gov/osdr/data/search` | Space biology and astronaut health research; educational explanations of bone mineral loss, muscle atrophy, and countermeasure protocols. | • **Phase 02:** Investigate API capabilities, metadata, and relevant public studies (do not download large datasets unnecessarily).<br>• **Phase 05:** Use selected research to support educational explanations where appropriate. | **Critical Boundary:** Preserve organism, population, study conditions, and limitations. Note that partial $0.38g$ gravity adaptation on humans is scientifically unverified. |
| **P2 — NASA Mars Trek** | • Website: `https://trek.nasa.gov/mars/`<br>• API Doc: `https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars` | Mars surface imagery, elevation, and terrain references. | • **Phase 03:** Evaluate terrain references for the Phaser environment.<br>• **Phase 06:** Use selected terrain imagery and visual references for polish. | **Critical Boundary:** Do not build a complex GIS system. Keep asset integration lightweight and performant. |

---

## 3. API Key, Security Governance & Offline Architecture

### User API Key Protocol
- A free NASA API key will be generated personally by the user from `https://api.nasa.gov/`.
- **Do not request the key now.** Request the key only when the exact integration step requires it in Phase 02.

### Resource Pre-Verification Checklist
Before writing code or querying any external resource:
1. Verify the active, current endpoint.
2. Verify authentication requirements (some endpoints like DONKI accept `DEMO_KEY` or NASA API key; RadLab/OSDR endpoints have specific query schemas; some resources require no key). Do not assume every resource requires a NASA API key.
3. Check rate limits (e.g., standard api.nasa.gov hourly/daily limits) and caching behavior.
4. Verify response schema, data formats, and payload size.
5. Verify usage, licensing, and attribution constraints.

### Critical Security Rules
- **Never hardcode secrets** in scripts, configuration files, or documentation.
- **Never put secrets in frontend `VITE_*` environment variables.**
- **Never expose credentials or API keys in browser JavaScript.**
- **Never commit `.env` files or credentials to Git.**
- **Local Ingestion Scripts:** Ingestion and normalization scripts must run locally and privately to produce validated, version-controlled JSON snapshots stored under `src/data/snapshots/`.
- **Offline-First Playability:** The deployed game must run 100% offline with zero external network calls or judge-facing API key requirements.

---

## 4. Detailed Scientific Telemetry & Analysis

### A. NASA DONKI (Space Weather Database) `[REAL]`
- **Telemetry Fields:**
  - Coronal Mass Ejections (CME): Initial shock speed ($km/s$), 3D half-angle width, trajectory vectors, planetary target arrival estimates.
  - Solar Flares (FLR): NOAA GOES X-ray peak flux ($W/m^2$), class (C, M, X).
  - Solar Energetic Particles (SEP): Flux at 1 AU ($>10\text{ MeV}$, $>100\text{ MeV}$).
- **Calculated Transit Time `[DERIVED]`:** Using shock speeds ($500\text{--}2,000\text{ km/s}$) over Mars orbital distance ($1.52\text{ AU}$), providing a realistic 1- to 2-Sol advance warning.
- **Boundary:** DONKI provides solar event trigger data, not Mars surface doses.

### B. NASA RadLab (ISS Orbit Telemetry) `[REAL in LEO]`
- **Source:** NASA OSDR RadLab Database (`visualization.osdr.nasa.gov/radlab/gui/data-api/`).
- **Instruments:** DosTel (silicon semiconductor detectors), Liulin (ionizing radiation spectrometers), TEPC (tissue-equivalent proportional counters).
- **Environment:** Low Earth Orbit (LEO, $\sim 400\text{ km}$, $51.6^\circ$ inclination), protected by Earth's magnetosphere.
- **Units:** $\mu\text{Gy/day}$ absorbed dose, particle flux ($cm^{-2}\cdot s^{-1}$).
- **Educational Role:** Provides a verified human spaceflight baseline for radiation education and shielding comparisons. Strictly tagged as LEO orbital data, never Mars surface data.

### C. Mars Surface Radiation Baseline (Curiosity RAD) `[REAL]`
- **Source & Citation:** Hassler et al., *Science* 343, 1244797 (2014).
- **Instrument:** Radiation Assessment Detector (RAD), Mars Science Laboratory (MSL) Curiosity.
- **Location:** Gale Crater, Mars ($4.59^\circ\text{S}, 137.44^\circ\text{E}$, elevation $\approx -4.4\text{ km}$).
- **Measured Surface Baseline:** **$0.64 \pm 0.12\text{ mSv/day}$** biological dose equivalent (GCR).
- **Distinction:** Serves as a representative Martian surface baseline. (Jezero Crater at $-2.5\text{ km}$ elevation has a slightly thinner atmospheric column, but $0.64\text{ mSv/day}$ is our established representative value).

### D. Solar Storm Scenario: Real Science vs. Exaggerated Training Scenario
- **Curiosity 2013 Observed SPE `[REAL]`:** On 11–12 April 2013, Curiosity RAD detected an actual solar storm (associated with an M6.5 flare and CME). The observed surface dose equivalent was **approximately $50\ \mu\text{Sv}$ ($0.05\text{ mSv}$)** because the Martian $CO_2$ atmosphere absorbed the majority of particles.
- **Hypothetical Game Scenario `[GAME-SIMPLIFIED]`:** OUTPOST: MARS features a major solar storm crisis with a hypothetical **$+50\text{ mSv}$** surge.
  > **Crucial Educational Distinction:** $+50\text{ mSv}$ is **1,000 times larger** than the observed 2013 event. It represents an **intentionally exaggerated hypothetical worst-case training drill** to teach shielding mechanics to children aged 7–12. The game UI and debrief explicitly communicate this distinction.

### E. Regolith Shielding Physics vs. Game Parameter
- **Real Physics:** Regolith attenuates charged particles, but interaction with heavy cosmic ions creates secondary neutrons and spallation products (Simonsen et al., NASA TP-3682).
- **Game Parameter `[GAME-SIMPLIFIED]`:** The **80% attenuation** factor from Storm Shield / regolith berms is a simplified pedagogical game-balance parameter, clearly tagged as such.

### F. Jezero Crater Meteorology (Perseverance MEDA) `[REAL]`
- **Pressure:** Representative **$700\text{--}800\text{ Pa}$** with seasonal $CO_2$ polar cap cycles and diurnal thermal tides (Rodríguez-Manfredi et al. 2021).
- **Temperature:** Extreme diurnal swings ($<-80^\circ\text{C}$ to near freezing at midday), justifying continuous habitat heating demands.

### G. Life-Support Baseline Values (NASA BVAD) `[REAL]`
- **Oxygen Demand:** **$0.84\text{ kg } O_2\text{ / person-day}$** (NASA/TP-2015-218570).
- **Water Consumption:** Direct intake of **$2.0\text{--}2.5\text{ kg/day}$ per person** (drinking + food hydration); total habitat flows recycled at $>85\text{--}90\%$.
- **Caloric Demand:** **$2,700\text{--}3,100\text{ kcal/day}$** for active crew (NASA HIDH & BVAD).

### H. Spaceflight Biology & Astronaut Health (NASA OSDR) `[REAL in 0g]`
- **Bone & Muscle Loss:** Human cohorts in microgravity aboard Mir/ISS show **$1.0\%\text{--}1.5\%/\text{month}$** bone mineral density loss in weight-bearing bones (Lang et al. 2004) and up to $20\%$ muscle volume loss without resistance exercise.
- **Scientific Limitation:** Human adaptation to partial $0.38g$ Martian gravity has **never been tested on humans**. Modeling habitat gym workouts as a health countermeasure is a pedagogical application of space station countermeasure principles.

---

## 5. Master Scientific Parameters Summary

| Parameter | Model Value in Game | Primary Scientific Source | Scientific Classification |
|---|---|---|---|
| Gale Crater GCR Dose Rate | $0.64 \pm 0.12\text{ mSv/day}$ | MSL Curiosity RAD (Hassler et al. 2014) | **`[REAL (Gale)]`** *(Representative baseline; not direct Jezero)* |
| Real Observed SPE Dose (2013) | $\approx 50\ \mu\text{Sv}$ ($0.05\text{ mSv}$) | MSL Curiosity RAD (Hassler et al. 2014) | **`[REAL (Gale Crater Surface)]`** |
| Game Solar Storm Scenario | $+50\text{ mSv/event}$ | Hypothetical game training drill | **`[GAME-SIMPLIFIED]`** *(1,000x exaggerated vs 2013 observed event)* |
| Storm Shield Regolith Attenuation | $80\%$ reduction | Simplified game balance parameter | **`[GAME-SIMPLIFIED]`** *(Real physics includes secondary neutrons)* |
| Jezero Surface Pressure | Representative $700\text{--}800\text{ Pa}$ | Perseverance MEDA (Rodríguez-Manfredi et al. 2021) | **`[REAL]`** *(Seasonal polar CO2 & diurnal cycles)* |
| Jezero Temperature Extremes | Severe daily swings ($<-80^\circ\text{C}$ to near freezing) | Perseverance MEDA (Rodríguez-Manfredi et al. 2021) | **`[REAL - Qualitative]`** *(Justifies continuous habitat heating)* |
| Astronaut Oxygen Demand | $0.84\text{ kg } O_2\text{ / person-day}$ | NASA Life Support BVAD (NASA/TP-2015-218570) | **`[REAL]`** |
| Astronaut Direct Water Intake | $2.0\text{--}2.5\text{ L/day}$ | NASA Life Support BVAD (NASA/TP-2015-218570) | **`[REAL]`** *(Direct drinking & food hydration)* |
| Astronaut Energy Demand | $\sim 2,700\text{--}3,100\text{ kcal/day}$ | NASA HIDH & BVAD | **`[REAL]`** |
| Bone Loss (Microgravity) | $1.0\%\text{--}1.5\%/\text{month}$ ($0g$ weight-bearing) | ISS / Mir clinical cohorts (Lang et al. 2004) | **`[REAL in 0g]`** *(Partial 0.38g gravity effect unverified on humans)* |
| DONKI Space Weather Events | Solar flare class, CME shock speed, SEP flux | NASA GSFC DONKI (`api.nasa.gov`) | **`[REAL (Heliosphere)]`** *(Does not provide Mars surface doses)* |
| RadLab Dosimetry Telemetry | Absorbed dose ($\mu\text{Gy/day}$), particle flux | ISS instruments (DosTel, Liulin, TEPC) | **`[REAL in LEO]`** *(Orbital reference baseline, not Mars surface telemetry)* |
| OSDR Space Biology Studies | Spaceflight physiological adaptation metadata | NASA OSDR (`osdr.nasa.gov`) | **`[REAL in LEO/Lab]`** *(Preserves study conditions and limitations)* |
| Mars Trek Terrain References | Surface imagery and elevation references | NASA Mars Trek (`trek.nasa.gov/mars/`) | **`[REAL (Orbital Imagery)]`** *(Lightweight 2D visual reference, no heavy GIS)* |

---
*Audited and synchronized: 2026-11-14 (Technical Direction Synchronization)*
