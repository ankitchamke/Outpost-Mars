# Gameplay Loop & Resource Simulation Model

## 1. Game Concept & Audience Framing

OUTPOST: MARS is a 2D base-building and mission trainer designed specifically for children aged 7–12. It emphasizes discovery, problem-solving, and scientific causality over punitive failure.

### The Player's Role: Outpost Commander
The player commands a pioneer research outpost of 4 astronauts at Jezero Crater, Mars. Their mission is to build, sustain, and protect the outpost across 30 Sols (Martian days) while responding to space weather events and keeping their crew safe.

---

## 2. The Core Gameplay Loop

```
 ┌────────────────────────────────────────────────────────┐
 │                    1. MORNING BRIEF                    │
 │  Check Power, Life Support, Storm Protection, & DONKI  │
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
 │    Run Sol: resources tick, space weather resolves     │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │                 4. DEBRIEF & DISCOVERY                 │
 │  Commander Aiko feedback, Crew Safety status updated   │
 └───────────────────────────┬────────────────────────────┘
```

1. **Morning Briefing:** The player reviews the 3 core resources (Power, Life Support, Storm Protection), the Crew Safety indicator, and the Sol's space weather forecast (driven by authentic NASA DONKI snapshot records).
2. **Engineering Phase:** The player places or repairs modules on a 2D grid, manages power routing, and reinforces storm shielding before nightfall or storms.
3. **Sol Execution:** The Sol tick simulates day/night cycles and environmental demands. The 3 resources balance against the elements.
4. **Debrief & Discovery:** Outpost advisor "Commander Aiko" summarizes the Sol's results. If resources dip, Aiko explains the underlying science and suggests recovery actions. An authentic NASA Science Card is unlocked in the logbook.

---

## 3. The 3 Core Resources & Crew Safety Indicator

Rather than overwhelming young players with multiple independent meters, OUTPOST: MARS consolidates management into **3 intuitive resources** and **1 outcome indicator**:

### A. The 3 Managed Resources

| Resource | Description | Production Source | Drain Factors | Critical State Consequence |
|---|---|---|---|---|
| **1. Power** | Kilowatts (kW) & Battery Storage (kWh) | Solar Array & Battery (+20 kW Day) | Habitat heating (-6 kW against extreme subzero night cold), Life Support (-6 kW), Shielding (-3 kW) | Night/Storm battery depletion; non-essential systems power down |
| **2. Life Support** | Combined consumable reserve (Days of air, water, and food) | Life Support System (+4 Sols capacity/day when powered) | 4 Astronauts consume 1 Sol equivalent reserve per Sol | Buffer hits 0: Emergency reserve activates; Crew Safety declines |
| **3. Storm Protection** | Structural and radiation barrier readiness (%) | Storm Shelter / Shielding module construction & maintenance | Degrades during severe weather (CMEs, dust storms) | Protection < 50%: Crew absorbs elevated radiation during solar storms |

> **Child-Friendly Transparency (Explanatory Sub-values):** Within the **Life Support** meter, players can tap to view the real NASA baseline figures:
> - **Oxygen ($O_2$):** $0.84\text{ kg / person-day}$ `[REAL NASA BVAD]`.
> - **Direct Water Intake:** $2.0\text{--}2.5\text{ L / person-day}$ for drinking and food preparation `[REAL NASA BVAD]`; total habitat demand supported by $>85\text{--}90\%$ closed-loop recycling.
> - **Nutritional Energy:** $\sim 2,700\text{--}3,000\text{ kcal / person-day}$ for active astronaut operations `[REAL NASA HIDH/BVAD]`.

### B. Crew Safety (Outcome Indicator)
- **Status:** **Crew Safety is an OUTCOME INDICATOR, NOT a spendable resource.**
- **Scale:** **Nominal (Green) $\rightarrow$ Caution (Yellow) $\rightarrow$ Critical (Red)**.
- **Behavior:** Reflects the combined health, radiation exposure, and life-support security of the 4 astronauts. If Power runs out or Life Support depletes, Crew Safety shifts from Nominal to Caution. If uncorrected, it reaches Critical, triggering emergency rescue protocols.

---

## 4. The 4 Essential MVP Modules

To keep the 18-hour solo development scope strictly manageable and ensure crisp gameplay balance, the base building revolves around **4 core modules**:

| Module Icon / Name | Function & Trade-off | Power Dynamic | Science Grounding |
|---|---|---|---|
| **1. Habitat** | Core living dome, communications center, and astronaut exercise station. | Consumes 6 kW continuously (heating against extreme subzero night cold at Jezero). | Preserves astronaut bone and muscle health `[REAL ISS countermeasure principle; partial 0.38g gravity effect is hypothetical]`. |
| **2. Solar Array & Battery** | Consolidated photovoltaic energy generator and overnight chemical battery storage. | Generates +20 kW during Day; stores up to 60 kWh for night. | Models the 24h 39m Sol diurnal cycle and dust accumulation `[REAL]`. |
| **3. Life Support System** | Consolidated Sabatier reactor, water recycler, and nutritional supply unit. | Consumes 6 kW; generates fresh Life Support buffer. | Models closed-loop recycling and atmospheric $CO_2$ conversion `[REAL NASA BVAD principles]`. |
| **4. Storm Shelter / Shielding** | Compacted Martian regolith berm and radiation shelter. | Consumes 3 kW when active radiation shields are engaged. | Attenuates solar energetic particle flux during storm events `[80% reduction is a GAME-SIMPLIFIED parameter]`. |

### Optional Upgrade: CSA Greenhouse `[Scenario Action / Milestone Reward]`
- The **Canadian Space Agency (CSA) Greenhouse** is integrated as an optional scenario upgrade in Mission 3. When activated, it supplements the Life Support reserve with fresh hydroponic crops and boosts crew morale.

---

## 5. Child-Centric Pedagogical Game Design (Ages 7–12)

### A. Non-Punitive Educational Feedback
In typical survival games, resource failure causes an abrupt game over. In OUTPOST: MARS:
- Depleting Life Support or Power triggers an **Emergency Backup Protocol** for 1 Sol.
- Commander Aiko intervenes with clear causal reasoning:
  > *"Commander! Our batteries ran dry during the night because the dust storm blocked the sun. Real Mars rovers like Opportunity faced this too! Let's power down non-essentials and clean our solar panels!"*
- The player is guided to fix the imbalance, teaching resilience and engineering logic.

### B. Space Weather Crisis & The Exaggerated Game Scenario
- **Mission 2 ("The Solar Storm"):** Challenges players with a major solar storm event featuring a hypothetical **$+50\text{ mSv}$** radiation spike.
- **Educational Debrief:** Commander Aiko explicitly explains the scientific context:
  > *"Great job sheltering the crew, Commander! In real life, Curiosity's RAD instrument detected a solar storm in 2013 that only added about 50 micro-Sieverts (0.05 mSv) to the surface because Mars's atmosphere absorbed most of it. Our +50 mSv storm was an exaggerated worst-case training drill—and thanks to our regolith shielding, our crew stayed completely safe!"*

---

## 6. Three-Mission Progressive Story Campaign

1. **Mission 1: Touchdown at Jezero Crater (Sols 1–5)**
   - *Goal:* Establish basic energy and life support for 4 astronauts.
   - *Actions:* Deploy Solar Array & Battery and activate the Life Support System.
   - *Key Science:* Converting thin Martian air and recycled water into life-support reserves.

2. **Mission 2: Surviving the Solar Storm (Sols 6–15)**
   - *Goal:* Weather a major Coronal Mass Ejection detected by NASA DONKI sensors.
   - *Actions:* Construct Storm Shelter / Shielding, store reserve power, and shelter the crew.
   - *Key Science:* Space weather forecasting, CME transit times, real vs. simulated storm doses, and regolith shielding.

3. **Mission 3: Sustainable Outpost (Sols 16–30)**
   - *Goal:* Maintain high Crew Safety while operating all systems under winter thermal drops.
   - *Actions:* Unlock the CSA Greenhouse upgrade, manage closed-loop recycling, and achieve self-sufficiency.
   - *Key Science:* Long-term human sustainability, closed-loop agriculture, and extreme cold survival.

---
*Audited and approved for Phase 00.*
