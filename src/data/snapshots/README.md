# NASA Scientific Data Snapshots

This directory houses verified, offline-first data snapshots from authentic NASA, RadLab, OSDR, and CSA sources for **OUTPOST: MARS**.

## Structure & Phase 02 Integration Plan

1. **`donki-space-weather.json` (Phase 02)**
   - Curated historical Coronal Mass Ejection (CME) and solar flare event profiles from NASA DONKI.
   - Used to drive space weather event queues without requiring live external network APIs or judge-facing API keys.

2. **`curiosity-rad-dosimetry.json` (Phase 02)**
   - Gale Crater surface radiation dosimetry baseline ($0.64 \pm 0.12\text{ mSv/day}$) observed over the first 300 sols by MSL Curiosity RAD.
   - Reference figures for distinguishing authentic surface measurements from exaggerated training scenario surges ($+50\text{ mSv}$).

3. **`perseverance-meda-meteorology.json` (Phase 02)**
   - Jezero Crater surface meteorological ranges ($700\text{--}800\text{ Pa}$ atmospheric pressure bounds and diurnal thermal swings) from Perseverance MEDA.

4. **`nasa-bvad-life-support.json` (Phase 02)**
   - Baseline human life-support metabolic standards ($0.84\text{ kg } O_2/\text{day}$, $2.0\text{--}2.5\text{ L/day}$ water intake, $\sim 2,700\text{--}3,000\text{ kcal/day}$) from the NASA Baseline Values for Exploration Populations (BVAD).
