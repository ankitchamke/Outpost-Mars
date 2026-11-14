# Gameplay Loop & Resource Simulation Model

## 1. Game Concept & Audience Framing

OUTPOST: MARS is a browser-based, turn-based 2D Mars outpost survival and astronaut mission trainer designed specifically for children aged 7–12. It emphasizes scientific discovery, engineering problem-solving, and causality over punitive failure.

### The Player's Role: Outpost Commander
The player commands a pioneer research outpost of 4 astronauts at Jezero Crater, Mars. Their mission is to establish, sustain, and protect the outpost across a focused **Seven-Sol campaign** (7 Martian days), responding to space-weather events and keeping their crew safe.

### Technical & Rendering Engine Architecture
- **2D Game Engine:** **Phaser** is the approved 2D game engine. Phase 01 provided an initial HTML5 Canvas foundation; in **Phase 03**, Phaser is cleanly integrated to replace the custom Canvas rendering code. **Do not maintain two competing game-rendering engines.**
- **UI HUD & Overlays:** Accessible semantic HTML and standard CSS (using CSS custom properties; zero UI framework bloat).
- **Audio:** Web Audio API procedural synthesizer with prominent mute control.
- **Testing:** Automated unit testing via Vitest.
- **Data & Runtime:** Bundled, verified NASA data snapshots default; 100% offline-playable. No backend, database, login, multiplayer, or paid services.

---

## 2. The Core Gameplay Loop

```
 ┌────────────────────────────────────────────────────────┐
 │                    1. MORNING BRIEF                    │
 │  Check Sun Power, Life Support, Storm Shield, & DONKI  │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │                 2. ENGINEERING PHASE                   │
 │   Place/repair 4 core modules, allocate daytime power  │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │                    3. SOL EXECUTION                    │
 │   Run Sol tick: resources balance, weather resolves    │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │                 4. DEBRIEF & DISCOVERY                 │
 │  Commander Aiko feedback, Crew Safety status updated   │
 └───────────────────────────┬────────────────────────────┘
```

1. **Morning Briefing:** The player reviews the 3 core resources (**Sun Power**, **Life Support**, **Storm Shield**), the **Crew Safety** outcome indicator, and the Sol's space-weather forecast (driven by authentic NASA DONKI snapshot records).
2. **Engineering Phase:** The player places or repairs modules on the 2D grid, manages power routing, and reinforces storm shielding before nightfall or storms.
3. **Sol Execution:** The Sol tick simulates day/night cycles and environmental demands. The 3 resources balance against the harsh Martian elements.
4. **Debrief & Discovery:** Outpost advisor "Commander Aiko" summarizes the Sol's results. If resources dip, Aiko explains the underlying science and suggests recovery actions. An authentic NASA Science Card is unlocked in the mission logbook.

---

## 3. The 3 Core Resources & Crew Safety Indicator

Rather than overwhelming young players with complex multi-meter systems, OUTPOST: MARS consolidates management into **3 intuitive resources** and **1 outcome indicator**:

### A. The 3 Managed Resources

| Resource | Description | Production Source | Drain Factors | Critical State Consequence |
|---|---|---|---|---|
| **1. Sun Power** | Kilowatts (kW) & Battery Storage (kWh) | Solar Array & Battery (+20 kW Day) | Habitat heating (-6 kW against extreme subzero night cold), Life Support (-6 kW), Storm Shield (-3 kW) | Night/Storm battery depletion; non-essential systems power down |
| **2. Life Support** | Combined consumable reserve (Sols of air, water, and food) | Life Support System (+4 Sols capacity/day when powered) | 4 Astronauts consume 1 Sol equivalent reserve per Sol | Buffer hits 0: Emergency reserve activates; Crew Safety declines |
| **3. Storm Shield** | Structural and radiation barrier readiness (%) | Storm Shield / Shelter module construction & maintenance | Degrades during severe space-weather events (CMEs, dust storms) | Shield readiness < 50%: Crew absorbs elevated radiation during solar storms |

> **Child-Friendly Transparency (Explanatory Sub-values):** Within the **Life Support** meter, players can tap to view the real NASA baseline figures:
> - **Oxygen ($O_2$):** $0.84\text{ kg / person-day}$ `[REAL NASA BVAD]`.
> - **Direct Water Intake:** $2.0\text{--}2.5\text{ L / person-day}$ for drinking and food preparation `[REAL NASA BVAD]`; total habitat demand supported by $>85\text{--}90\%$ closed-loop recycling.
> - **Nutritional Energy:** $\sim 2,700\text{--}3,000\text{ kcal / person-day}$ for active astronaut operations `[REAL NASA HIDH/BVAD]`.

### B. Crew Safety (Outcome Indicator)
- **Status:** **Crew Safety is an OUTCOME INDICATOR, NOT a spendable resource.**
- **Scale:** **Nominal (Green) $\rightarrow$ Caution (Yellow) $\rightarrow$ Critical (Red)**.
- **Behavior:** Reflects the combined health, radiation exposure, and life-support security of the 4 astronauts. If Sun Power runs out or Life Support depletes, Crew Safety shifts from Nominal to Caution. If uncorrected, it reaches Critical, triggering emergency rescue protocols.

---

## 4. The 4 Essential MVP Modules

To keep the development scope strictly manageable within our 20-hour budget (17h remaining) and ensure crisp gameplay balance, base construction revolves around **4 core modules**:

| Module Name | Function & Trade-off | Power Dynamic | Science Grounding |
|---|---|---|---|
| **1. Habitat** | Core living dome, communications center, and astronaut exercise station. | Consumes 6 kW continuously (heating against extreme subzero night cold at Jezero). | Preserves astronaut bone and muscle health `[REAL ISS countermeasure principle; partial 0.38g gravity effect is hypothetical]`. |
| **2. Solar Array & Battery** | Photovoltaic energy generator and overnight chemical battery storage (supplying Sun Power). | Generates +20 kW during Day; stores up to 60 kWh for night. | Models the 24h 39m Sol diurnal cycle and dust accumulation `[REAL]`. |
| **3. Life Support System** | Consolidated Sabatier reactor, water recycler, and nutritional supply unit. | Consumes 6 kW; generates fresh Life Support buffer. | Models closed-loop recycling and atmospheric $CO_2$ conversion `[REAL NASA BVAD principles]`. |
| **4. Storm Shield / Shelter** | Compacted Martian regolith berm and radiation shelter. | Consumes 3 kW when active radiation shields are engaged. | Attenuates solar energetic particle flux during storm events `[80% reduction is a GAME-SIMPLIFIED parameter]`. |

### Optional Upgrade: CSA Greenhouse `[Scenario Action / Milestone Reward]`
- The **Canadian Space Agency (CSA) Greenhouse** is integrated as an optional scenario upgrade in Sol 7. When activated, it supplements the Life Support reserve with fresh hydroponic crops and boosts crew morale.

---

## 5. Child-Centric Pedagogical Game Design (Ages 7–12)

### A. Non-Punitive Educational Feedback
In typical survival games, resource failure causes an abrupt game over. In OUTPOST: MARS:
- Depleting Life Support or Sun Power triggers an **Emergency Backup Protocol** for 1 Sol.
- Commander Aiko intervenes with clear causal reasoning:
  > *"Commander! Our batteries ran dry during the night because the dust storm blocked the sun. Real Mars rovers like Opportunity faced this too! Let's power down non-essentials and clean our solar panels!"*
- The player is guided to fix the imbalance, teaching resilience and engineering logic.

### B. Space Weather Crisis & The Exaggerated Game Scenario
- **Sol 5 ("The Solar Storm Surge"):** Challenges players with a major solar storm event featuring a hypothetical **$+50\text{ mSv}$** radiation spike.
- **Educational Debrief:** Commander Aiko explicitly explains the scientific context:
  > *"Great job sheltering the crew, Commander! In real life, Curiosity's RAD instrument detected a solar storm in 2013 that only added about 50 micro-Sieverts (0.05 mSv) to the surface because Mars's atmosphere absorbed most of it. Our +50 mSv storm was an exaggerated worst-case training drill—and thanks to our regolith Storm Shield, our crew stayed completely safe!"*

---

## 6. The Seven-Sol Mission Campaign

The campaign is structured as an intensive **Seven-Sol mission** where each Sol introduces authentic space agency science and engineering choices:

1. **Sol 1: Touchdown at Jezero Crater**
   - *Goal:* Deploy Solar Array & Battery; establish daytime Sun Power generation and overnight battery reserves.
   - *Science Focus:* Martian diurnal cycle (24h 39m), extreme diurnal temperature swings from Perseverance MEDA records.

2. **Sol 2: Atmospheric Extraction & Water Recycling**
   - *Goal:* Construct Life Support System; extract oxygen from thin $CO_2$ atmosphere and start closed-loop water recovery.
   - *Science Focus:* NASA BVAD human metabolic baselines ($0.84\text{ kg } O_2/\text{day}$, $2.0\text{--}2.5\text{ L/day}$ direct water intake).

3. **Sol 3: Space Weather Watch & Radiation Telemetry**
   - *Goal:* Ingest NASA DONKI space-weather alerts; compare LEO radiation data from NASA RadLab with Curiosity RAD surface baseline ($0.64 \pm 0.12\text{ mSv/day}$).
   - *Science Focus:* Heliospheric monitoring, difference between orbital magnetosphere-shielded radiation (RadLab ISS) and unshielded planetary surface radiation.

4. **Sol 4: Coronal Mass Ejection (CME) Warning**
   - *Goal:* DONKI detects high-speed CME shock front with 1-Sol transit time to Mars. Construct and reinforce Storm Shield regolith berm.
   - *Science Focus:* CME transit time physics (`[DERIVED]` from shock speed), regolith shielding properties (`[GAME-SIMPLIFIED]` 80% attenuation vs. secondary neutron physics).

5. **Sol 5: The Solar Storm Surge**
   - *Goal:* Major solar energetic particle (SEP) storm impacts Jezero Crater (+50 mSv hypothetical training drill). Shelter crew inside Storm Shield and route emergency Sun Power.
   - *Science Focus:* Real vs. exaggerated solar particle events (Curiosity 2013 actual $0.05\text{ mSv}$ event vs. $+50\text{ mSv}$ training drill).

6. **Sol 6: Aftermath & Health Countermeasures**
   - *Goal:* Clear solar dust deposits to restore Sun Power; conduct mandatory astronaut gym workout in Habitat.
   - *Science Focus:* NASA OSDR space biology research on microgravity bone mineral loss ($1.0\%\text{--}1.5\%/\text{month}$) and muscle atrophy; unverified nature of human adaptation to partial $0.38g$ gravity.

7. **Sol 7: Long-Term Sustainability & Mission Certification**
   - *Goal:* Balance all 3 resources across winter temperature drop; optional CSA Greenhouse activation; receive comprehensive Mission Commander certification.
   - *Science Focus:* Closed-loop life-support sustainability, space agriculture, and engineering debrief across Science, Safety, and Sustainability scores.

---
*Audited and synchronized: 2026-11-14 (Technical Direction Synchronization)*
