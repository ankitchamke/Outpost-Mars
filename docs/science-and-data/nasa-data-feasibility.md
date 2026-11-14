# NASA & Space Agency Data Feasibility & Scientific Foundations

## 1. Scientific Rigor & Data Taxonomy

To ensure absolute scientific integrity in OUTPOST: MARS, every parameter, dataset, and formula is classified under a strict three-tier taxonomy:

- **`[REAL]`**: Direct, empirical measurements from published scientific literature, verified space mission instruments, or raw space agency database feeds.
- **`[DERIVED]`**: Values calculated using verified physical, orbital, or physiological equations applied to known parameters.
- **`[GAME-SIMPLIFIED]`**: Pedagogical abstractions or game balance parameters designed for children aged 7–12, explicitly identified as hypothetical gameplay mechanics rather than NASA measurements or predictions.

---

## 2. NASA DONKI (Space Weather Database)

### What DONKI Actually Records `[REAL]`
- **Source:** NASA Goddard Space Flight Center Community Coordinated Modeling Center (CCMC).
- **Portal:** `https://api.nasa.gov/DONKI/`
- **Telemetry Fields:**
  - Coronal Mass Ejections (CME): Trajectory 3D coordinates, initial shock speed ($km/s$), half-angle width, arrival predictions at Earth and planetary targets.
  - Solar Flares (FLR): X-ray flux classification from NOAA GOES satellites (C-class, M-class, X-class with peak flux in $W/m^2$).
  - Solar Energetic Particles (SEP): Proton flux measurements at 1 AU ($>10\text{ MeV}$, $>100\text{ MeV}$ particles/$\text{cm}^2\cdot\text{s}\cdot\text{sr}$).
  - Geomagnetic Storms (GST): Planetary $Kp$ and disturbance storm time ($Dst$) indices at Earth.

### What DONKI Does NOT Provide (Scope Fence)
- **Critical Limitation:** DONKI records solar events in the heliosphere and models planetary arrival times. It **does NOT measure or provide surface radiation doses at a Mars surface outpost**.

### Application in OUTPOST: MARS
- **Data Pipeline:**
  1. `[REAL]`: The game loads bundled, verified historical DONKI records (e.g., major solar flare and CME events from Solar Cycle 25).
  2. `[DERIVED]`: Orbital transit time to Mars ($1.52\text{ AU}$) is calculated from CME shock speeds ($500\text{--}2,000\text{ km/s}$), providing a realistic 1-Sol advance warning.
  3. `[GAME-SIMPLIFIED]`: The game triggers an alert based on this transit time. The associated surface hazard is an intentionally exaggerated, hypothetical scenario (detailed in Section 3D).

---

## 3. Radiation Dosimetry: RadLab vs. Mars Surface Measurements

### A. NASA RadLab (ISS Orbit Telemetry) `[REAL]`
- **Source:** NASA Open Science Data Repository (OSDR) RadLab Database (`visualization.osdr.nasa.gov/radlab/api`).
- **Instruments:** Silicon semiconductor detectors (DosTel), ionizing radiation spectrometers (Liulin), and tissue equivalent proportional counters (TEPC).
- **Spacecraft & Trajectory:** International Space Station (ISS) in Low Earth Orbit (LEO) ($\sim 400\text{ km}$ altitude, $51.6^\circ$ inclination).
- **Units:** Absorbed dose rate in microgray per day ($\mu\text{Gy/day}$) and particle flux ($cm^{-2}\cdot s^{-1}$).
- **Applicability & Boundary:** ISS telemetry is shielded by Earth's geomagnetic field ($L$-shell deflection). It provides an authentic **reference baseline for human radiation exposure in Low Earth Orbit**, but **must not be misrepresented as Mars surface radiation**.

### B. Mars Surface Radiation Baseline (Curiosity RAD) `[REAL]`
- **Source & Citation:** Hassler et al., *Science* 343, 1244797 (2014), "Mars' Surface Radiation Environment Measured with the Mars Science Laboratory's Curiosity Rover".
- **Instrument:** Radiation Assessment Detector (RAD), Mars Science Laboratory (MSL).
- **Location:** Gale Crater, Mars ($4.59^\circ\text{S}, 137.44^\circ\text{E}$, elevation $\approx -4.4\text{ km}$).
- **Observation Period:** First 300 sols of Curiosity's surface mission (solar maximum conditions).
- **Measured Surface Dose Rates (Curiosity RAD):**
  - **Absorbed Dose Rate (GCR):** $0.210 \pm 0.040\text{ mGy/day}$ in silicon.
  - **Biological Dose Equivalent Rate (GCR):** **$0.64 \pm 0.12\text{ mSv/day}$** (using average quality factor $\bar{Q} \approx 3.05$).
- **Important Distinction:** This is a verified empirical measurement **specifically at Gale Crater during the first 300 sols**. It is **NOT** a direct Jezero Crater measurement. Jezero Crater floor is at $\approx -2.5\text{ km}$ elevation ($1.9\text{ km}$ higher than Gale's floor, corresponding to a slightly thinner atmospheric column), so surface dose would vary slightly. OUTPOST: MARS uses $0.64\text{ mSv/day}$ as a representative Martian baseline without claiming a validated Jezero conversion.

### C. Solar-Particle Event: Observed Science vs. Exaggerated Game Scenario
- **Observed Science (Curiosity RAD) `[REAL]`:** During the first 300 sols, Curiosity RAD detected an SPE on 11–12 April 2013 (associated with an M6.5 solar flare and CME). The observed surface dose equivalent from this actual event was **approximately $50\ \mu\text{Sv}$ ($0.05\text{ mSv}$)**. The Martian atmosphere provided significant shielding against the solar energetic particles.
- **Hypothetical Game Scenario `[GAME-SIMPLIFIED]`:** OUTPOST: MARS features a major solar storm crisis scenario with a hypothetical **$+50\text{ mSv}$** surge.
  > **Crucial Educational Distinction:** $+50\text{ mSv}$ is **1,000 times larger** than the $\approx 50\ \mu\text{Sv}$ event observed by Curiosity. It represents an **intentionally exaggerated, hypothetical worst-case game scenario** (analogous to an unshielded deep-space event or extreme historical storm) designed to create clear gameplay stakes for children. It is **NOT** an observed Mars surface measurement or an official NASA prediction. The game UI and debrief explicitly state this distinction.

### D. Regolith Shielding Physics vs. Game Parameter
- **Real Shielding Physics:** NASA radiation transport modeling (e.g., Simonsen et al., NASA TP-3682) demonstrates that Martian regolith attenuates primary charged ions from galactic cosmic rays. However, heavy ions interacting with regolith also produce secondary neutrons and nuclear spallation fragments. Actual shielding effectiveness depends heavily on material chemical composition (hydrogen content/hydrated minerals), layer thickness/areal density ($\text{g/cm}^2$), incident particle energy, and secondary radiation buildup.
- **Hypothetical Game Parameter `[GAME-SIMPLIFIED]`:** The **"80% attenuation"** from constructing a 1-meter regolith shield is a **hypothetical game-balance parameter**, NOT a measurement established by NASA TP-3682. It serves as a simplified game mechanic to demonstrate the basic principle that piling Martian soil over a habitat reduces crew radiation exposure.

---

## 4. Jezero Crater Meteorological Environment

- **Mission & Instrument `[REAL]`:** Mars Environmental Dynamics Analyzer (MEDA) on NASA's Perseverance Rover at Jezero Crater floor ($18.38^\circ\text{N}, 77.58^\circ\text{E}$) (Rodríguez-Manfredi et al., *Space Sci. Rev.* 2021; Sánchez-Lavega et al., *JGR Planets* 2022).
- **Atmospheric Surface Pressure:**
  - **Representative Range `[REAL]`:** Typically **$700\text{--}800\text{ Pa}$** ($\approx 0.7\text{--}0.8\text{ kPa}$, less than $1\%$ of Earth's sea-level pressure).
  - **Variability:** Exhibits seasonal variations of up to $25\%$ driven by global $CO_2$ sublimation and condensation at the Martian polar caps, along with daily pressure fluctuations caused by atmospheric thermal tides.
- **Surface & Air Temperature `[REAL - Qualitative Variation]`:**
  - Mars has a very thin atmosphere ($95\%\ CO_2$) with negligible greenhouse heat retention, producing **extreme diurnal and seasonal temperature variations**.
  - Perseverance MEDA records demonstrate wide daily temperature swings: daytime highs can rise toward near-freezing during summer noon, while night temperatures routinely plunge to severe subzero conditions (often below $-80^\circ\text{C}$ to $-100^\circ\text{C}$ at ground level).
  - *Note on Modeling:* Exact single-number temperature endpoints vary significantly by season, sensor boom height (0.84m vs 1.45m), ground versus air measurement, and local dust opacity. OUTPOST: MARS uses these qualitative extremes to justify the continuous electrical heating load required by the Habitat and Life Support modules.

---

## 5. Life-Support Baseline Values

- **Primary Source:** NASA Life Support Baseline Values and Assumptions Document (BVAD, NASA/TP-2015-218570; Anderson et al.).

### A. Oxygen Consumption `[REAL]`
- **Value:** **$0.84\text{ kg } O_2\text{ / person-day}$**.
- **Context:** Nominal metabolic consumption rate for an active adult astronaut under standard habitat pressure and atmosphere composition.

### B. Water Consumption & System Flows `[REAL]`
- **Direct Intake (Drinking & Food Hydration):** Approximately **$2.0\text{--}2.5\text{ kg/day}$ per person** ($1.5\text{--}2.0\text{ L}$ direct drinking water + $\sim 0.5\text{ L}$ in food preparation).
- **Total Habitat Water Flow (Including Hygiene & Reuse):** Total daily water demand per crew member is significantly higher when including hygiene, hand washing, shower (if equipped), and urinal flush ($\sim 5\text{--}15\text{ L/day}$ depending on outpost architecture).
- **Outpost Model:** The Life Support module models a closed-loop recovery system where wastewater and humidity condensate are recycled at $>85\text{--}90\%$ efficiency, matching current ISS and planned Mars exploration standards.

### C. Energy & Caloric Requirements `[REAL]`
- **Value:** NASA Human Integration Design Handbook (HIDH) and BVAD calculate astronaut daily energy expenditures between **$2,700\text{ and } 3,100\text{ kcal/day}$** for active adult crew (varying by body mass, sex, and EVA workload).
- **Game Simplification:** The combined Life Support reserve simplifies nutritional requirements into general Sol equivalents without simulating individual macronutrients.

---

## 6. Spaceflight Biology & Astronaut Health

### A. Bone Mineral Density & Muscle Loss `[REAL in 0g]`
- **Source & Population:** Studies on human astronauts during 4- to 6-month orbital missions aboard Mir and the ISS without advanced resistance countermeasures (e.g., LeBlanc et al., *J. Musculoskelet. Neuronal Interact.* 2000; Lang et al., *J. Bone Miner. Res.* 2004).
- **Clinical Observation:** Astronauts experienced an average bone mineral density loss of **$1.0\%\text{--}1.5\%$ per month** specifically in weight-bearing skeletal regions (lumbar spine, femoral neck, trochanter), accompanied by up to $20\%$ loss of calf muscle volume.

### B. Unverified Application to Martian Gravity `[DERIVED / HYPOTHETICAL]`
- **Martian Gravity:** $0.38g$ ($38\%$ of Earth's gravity).
- **Crucial Scientific Uncertainty:** **Human physiological adaptation to partial gravity ($0.38g$) has NEVER been experimentally tested on humans.** It is scientifically unknown whether $0.38g$ is sufficient to prevent, slow, or alter microgravity-induced bone and muscle atrophy.
- **Game Modeling:** Modeling daily astronaut exercise inside the Habitat as a health countermeasure on Mars is a **hypothetical pedagogical adaptation**, teaching students the real-world importance of physical exercise protocols in space exploration.

---

## 7. Master Scientific Parameters Summary

| Parameter | Model Value in Game | Primary Scientific Source | Scientific Classification |
|---|---|---|---|
| Gale Crater GCR Dose Rate | $0.64 \pm 0.12\text{ mSv/day}$ | MSL Curiosity RAD (Hassler et al. 2014) | **`[REAL (Gale)]`** *(Representative baseline; not a direct Jezero measurement)* |
| Real Observed SPE Dose (2013) | $\approx 50\ \mu\text{Sv}$ ($0.05\text{ mSv}$) | MSL Curiosity RAD (Hassler et al. 2014) | **`[REAL (Gale Crater Surface)]`** |
| Game Solar Storm Scenario | $+50\text{ mSv/event}$ | Hypothetical game scenario | **`[GAME-SIMPLIFIED]`** *(1,000x exaggerated vs 2013 observed event)* |
| Regolith Shielding Attenuation | $80\%$ reduction | Simplified game parameter | **`[GAME-SIMPLIFIED]`** *(Actual physics depends on composition, depth, secondaries)* |
| Jezero Surface Pressure | Representative $700\text{--}800\text{ Pa}$ | Perseverance MEDA (Rodríguez-Manfredi et al. 2021) | **`[REAL]`** *(Exhibits seasonal polar CO2 and diurnal tidal cycles)* |
| Jezero Temperature Extremes | Severe daily swings ($<-80^\circ\text{C}$ to near freezing) | Perseverance MEDA (Rodríguez-Manfredi et al. 2021) | **`[REAL - Qualitative]`** *(Endpoints vary by sensor, height, season, dust)* |
| Astronaut Oxygen Demand | $0.84\text{ kg } O_2\text{ / person-day}$ | NASA Life Support BVAD (NASA/TP-2015-218570) | **`[REAL]`** |
| Astronaut Direct Water Intake | $2.0\text{--}2.5\text{ L/day}$ (drinking + food rehydration) | NASA Life Support BVAD (NASA/TP-2015-218570) | **`[REAL]`** *(Total habitat flows higher with hygiene/recycling)* |
| Astronaut Energy Demand | $\sim 2,700\text{--}3,100\text{ kcal/day}$ | NASA HIDH & BVAD | **`[REAL]`** |
| Bone Loss (Microgravity) | $1.0\%\text{--}1.5\%/\text{month}$ (weight-bearing bones in $0g$) | ISS / Mir clinical cohorts (Lang et al. 2004) | **`[REAL in 0g]`** *(Partial 0.38g gravity effect is scientifically unverified)* |
| DONKI Space Weather Alerts | Flare class, CME shock speed & arrival prediction | NASA GSFC DONKI database | **`[REAL (Heliosphere)]`** *(Does not provide Mars surface doses)* |
| RadLab Dosimetry Telemetry | $\mu\text{Gy/day}$ absorbed dose in LEO | ISS detectors (DosTel, Liulin, TEPC) | **`[REAL in LEO]`** *(Orbital reference baseline, not Mars surface telemetry)* |

---
*Audited and approved for Phase 00.*
