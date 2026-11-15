import type { GameState } from '../core/types';
import {
  calculateSupplyPlan,
  completeScienceChallenge,
  SCIENCE_CHALLENGES,
  type ScienceChallengeId,
  type ScienceChallengeOutcome,
  type ScienceResourceEffect,
} from '../core/science-challenges';
import type { LoadedScienceData } from '../data/loader';
import type { SourceProvenance } from '../data/types';

const BVAD_SOURCE = {
  datasetId: 'NASA/TP-2015-218570 Rev2 · February 2022',
  sourceUrl: 'https://ntrs.nasa.gov/api/citations/20210024855/downloads/BVAD_2.15.22-final.pdf?attachment=true',
  retrievalDate: '2026-11-15',
  methodology: 'Oxygen: Table 3-23, reference crewmember daily total. Water: Table 4-20, early planetary base allowance (2.00 kg drinking + 0.50 kg food rehydration per crewmember-day).',
  limitations: 'Planning assumptions from separate BVAD tables, not measured on Mars. This game estimate does not model storage reserves, losses, recycling, hygiene, or crop water.',
} satisfies SourceProvenance;

type ScienceMode = 'closed' | 'hub' | ScienceChallengeId;
type SolarChoice = 'shelter' | 'power';

interface ScienceChallengeHandlers {
  onStateChange: (outcome: ScienceChallengeOutcome) => void;
}

export class ScienceChallengesUI {
  private mode: ScienceMode = 'closed';
  private state: GameState;
  private returnFocus?: HTMLElement;
  private solarChoice: SolarChoice | null = null;
  private solarOutcome?: ScienceChallengeOutcome;
  private radiationStep = 0;
  private radiationAnswerCorrect: boolean | null = null;
  private radiationOutcome?: ScienceChallengeOutcome;
  private supplyCrewCount = 4;
  private supplyOxygenGuess = '';
  private supplyWaterGuess = '';
  private supplyError = false;
  private supplyOutcome?: ScienceChallengeOutcome;
  private supplyEstimate?: ReturnType<typeof calculateSupplyPlan>;

  constructor(
    private readonly container: HTMLElement,
    private readonly data: LoadedScienceData,
    initialState: GameState,
    private readonly handlers: ScienceChallengeHandlers
  ) {
    this.state = initialState;
    this.container.addEventListener('click', (event) => this.handleClick(event));
    this.container.addEventListener('change', (event) => this.handleChange(event));
    this.container.addEventListener('input', (event) => this.handleInput(event));
    document.addEventListener('keydown', (event) => this.handleKeyDown(event), true);
  }

  public openConsole(state: GameState): void {
    this.captureReturnFocus();
    this.state = state;
    this.mode = 'hub';
    this.render();
    this.focus('[data-science-close]');
  }

  public openLog(state: GameState): void {
    this.openConsole(state);
  }

  public refresh(state: GameState): void {
    this.state = state;
    if (this.mode !== 'closed') this.render();
  }

  public close(): void {
    this.mode = 'closed';
    this.container.hidden = true;
    this.container.innerHTML = '';
    if (this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
    this.returnFocus = undefined;
  }

  private captureReturnFocus(): void {
    if (this.mode === 'closed') {
      this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.mode === 'closed') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }
    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      event.stopPropagation();
      if (!(event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement)) {
        event.preventDefault();
      }
    }
  }

  private handleChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement && target.matches('[data-supply-crew]')) {
      const crewCount = Number(target.value);
      this.supplyCrewCount = Number.isFinite(crewCount) ? crewCount : this.state.crewCount;
      this.supplyOxygenGuess = '';
      this.supplyWaterGuess = '';
      this.supplyError = false;
      this.render();
      this.focus('[data-supply-oxygen-guess]');
    }
  }

  private handleInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.matches('[data-supply-oxygen-guess]')) this.supplyOxygenGuess = target.value;
    if (target.matches('[data-supply-water-guess]')) this.supplyWaterGuess = target.value;
    this.supplyError = false;
  }

  private handleClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.closest('[data-science-close]')) {
      this.close();
      return;
    }
    if (target.closest('[data-science-back]')) {
      this.mode = 'hub';
      this.resetChallengeTransientState();
      this.render();
      this.focus('[data-science-close]');
      return;
    }

    const challengeId = target.closest<HTMLButtonElement>('[data-challenge-open]')?.dataset.challengeOpen;
    if (challengeId && SCIENCE_CHALLENGES.some((challenge) => challenge.id === challengeId)) {
      this.openChallenge(challengeId as ScienceChallengeId);
      return;
    }

    const solarChoice = target.closest<HTMLButtonElement>('[data-solar-choice]')?.dataset.solarChoice;
    if (solarChoice === 'shelter' || solarChoice === 'power') {
      this.solarChoice = solarChoice;
      this.solarOutcome = undefined;
      this.render();
      this.focus('[data-solar-confirm]');
      return;
    }
    if (target.closest('[data-solar-confirm]')) {
      this.applySolarChoice();
      this.render();
      this.focus('[data-science-back]');
      return;
    }

    const radiationAnswer = target.closest<HTMLButtonElement>('[data-radiation-answer]')?.dataset.radiationAnswer;
    if (radiationAnswer) {
      const expected = this.radiationStep === 0 ? 'curiosity' : 'no';
      this.radiationAnswerCorrect = radiationAnswer === expected;
      this.radiationStep += 1;
      if (this.radiationStep === 3) this.radiationOutcome = this.complete('radiation-detective');
      this.render();
      this.focus(this.radiationStep === 3 ? '[data-science-back]' : '[data-radiation-next]');
      return;
    }
    if (target.closest('[data-radiation-next]')) {
      if (this.radiationStep === 1) {
        this.radiationStep = 2;
        this.radiationAnswerCorrect = null;
      }
      this.render();
      this.focus('[data-radiation-answer]');
      return;
    }

    if (target.closest('[data-supply-calculate]')) {
      const oxygenInput = this.container.querySelector<HTMLInputElement>('[data-supply-oxygen-guess]');
      const waterInput = this.container.querySelector<HTMLInputElement>('[data-supply-water-guess]');
      const oxygenGuess = oxygenInput?.value.trim() ?? '';
      const waterGuess = waterInput?.value.trim() ?? '';
      if (!oxygenGuess || !waterGuess || !Number.isFinite(Number(oxygenGuess)) || !Number.isFinite(Number(waterGuess)) || Number(oxygenGuess) < 0 || Number(waterGuess) < 0) {
        this.supplyError = true;
        this.render();
        this.focus(!oxygenGuess ? '[data-supply-oxygen-guess]' : '[data-supply-water-guess]');
        return;
      }
      this.supplyOxygenGuess = oxygenGuess;
      this.supplyWaterGuess = waterGuess;
      this.supplyEstimate = calculateSupplyPlan(this.supplyCrewCount, 30);
      this.supplyOutcome = this.complete('supply-planner');
      this.render();
      this.focus('[data-science-back]');
    }
  }

  private openChallenge(id: ScienceChallengeId): void {
    this.mode = id;
    this.resetChallengeTransientState();
    if (id === 'supply-planner') this.supplyCrewCount = this.state.crewCount;
    this.render();
    this.focus('[data-science-back]');
  }

  private resetChallengeTransientState(): void {
    this.solarChoice = null;
    this.solarOutcome = undefined;
    this.radiationStep = 0;
    this.radiationAnswerCorrect = null;
    this.radiationOutcome = undefined;
    this.supplyOutcome = undefined;
    this.supplyEstimate = undefined;
    this.supplyOxygenGuess = '';
    this.supplyWaterGuess = '';
    this.supplyError = false;
  }

  private applySolarChoice(): void {
    if (!this.solarChoice) return;
    const effects: ScienceResourceEffect[] = this.solarChoice === 'shelter'
      ? [
          { resource: 'stormShield', delta: 8, reason: 'The shelter readiness check increased shielding in this training scenario.' },
          { resource: 'power', delta: -2, reason: 'Running the shelter systems used power in this training scenario.' },
        ]
      : [
          { resource: 'power', delta: 4, reason: 'Keeping solar systems online increased stored power in this training scenario.' },
          { resource: 'stormShield', delta: -5, reason: 'Shield readiness was not reinforced in this training scenario.' },
        ];
    this.solarOutcome = this.complete('solar-storm-alert', effects);
  }

  private complete(id: ScienceChallengeId, effects: ScienceResourceEffect[] = []): ScienceChallengeOutcome {
    const outcome = completeScienceChallenge(this.state, id, effects);
    this.state = outcome.state;
    this.handlers.onStateChange(outcome);
    return outcome;
  }

  private render(): void {
    this.container.hidden = this.mode === 'closed';
    if (this.mode === 'closed') {
      this.container.innerHTML = '';
      return;
    }
    this.container.innerHTML = this.mode === 'hub'
      ? this.renderHub()
      : this.mode === 'solar-storm-alert'
        ? this.renderSolarChallenge()
        : this.mode === 'radiation-detective'
          ? this.renderRadiationChallenge()
          : this.renderSupplyChallenge();
  }

  private renderHub(): string {
    const completed = new Set(this.state.completedScienceChallenges ?? []);
    const doneCount = SCIENCE_CHALLENGES.filter(({ id }) => completed.has(id)).length;
    const descriptions: Record<ScienceChallengeId, string> = {
      'solar-storm-alert': 'Read a real solar event, choose a preparation, and see a clearly simulated outcome.',
      'radiation-detective': 'Compare Curiosity’s Mars reading with one explicitly labeled ISS reading.',
      'supply-planner': 'Estimate 30-day oxygen and potable water for a crew using NASA planning values.',
    };

    return `<section class="science-panel" role="dialog" aria-modal="true" aria-labelledby="science-title">
      <header class="science-header"><div><span class="science-kicker">MISSION CONTROL · OFFLINE SCIENCE</span><h2 id="science-title">Science Log <small>${doneCount}/3 complete</small></h2></div><button class="science-close" type="button" data-science-close aria-label="Close Science Log">×</button></header>
      <div class="science-body">
        <p class="science-intro">Three quick challenges. NASA records are labeled <strong>REAL</strong>; calculations are <strong>DERIVED</strong>; game outcomes are <strong>GAME-SIMPLIFIED</strong>.</p>
        <div class="science-challenge-list">${SCIENCE_CHALLENGES.map(({ id, title }) => `<article class="science-challenge-card">
          <div class="science-card-heading"><h3>${escapeHtml(title)}</h3><span class="science-status${completed.has(id) ? ' is-complete' : ''}">${completed.has(id) ? '✓ COMPLETE' : 'READY'}</span></div>
          <p>${descriptions[id]}</p>
          <button class="science-primary" type="button" data-challenge-open="${id}">${completed.has(id) ? 'Review challenge' : 'Start challenge'}</button>
        </article>`).join('')}</div>
        <details class="science-library"><summary>Other bundled NASA research</summary>
          <p><strong>OSD-661</strong> covers mouse muscle and bone research with archived spaceflight tissue and Earth-based unloading experiments. <strong>OSD-121</strong> covers Arabidopsis seedlings flown in dark microgravity canisters. These are not human Mars measurements.</p>
          ${this.data.osdr?.studies.map((study) => `<a href="${escapeHtml(study.provenance.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(study.accession)} · ${escapeHtml(study.studyTitle)}</a>`).join('') ?? '<span>No OSDR study snapshot is available offline.</span>'}
        </details>
      </div>
      <footer class="science-footer"><span>Local snapshots · no network needed to play</span><button class="science-secondary" type="button" data-science-close>Return to outpost</button></footer>
    </section>`;
  }

  private renderSolarChallenge(): string {
    const flare = this.data.donki?.solarFlares.find((record) => record.classType === 'X5.8')
      ?? this.data.donki?.solarFlares[0];
    const alreadyComplete = (this.state.completedScienceChallenges ?? []).includes('solar-storm-alert');
    const sourceCard = flare
      ? `<article class="science-data-card"><div class="science-card-heading"><span class="science-truth is-real">REAL · SOLAR EVENT</span><span>${escapeHtml(formatDate(flare.beginTime))}</span></div><strong>${escapeHtml(flare.classType)} solar flare</strong><p>NASA DONKI logged this burst of energy from the Sun. Its X-ray class is not a measurement of radiation on Mars.</p>${renderProvenance(flare.provenance)}</article>`
      : `<article class="science-data-card"><span class="science-truth is-sim">GAME-SIMPLIFIED · EDUCATIONAL SIMULATION</span><p>No suitable historical flare record is in the offline bundle. This exercise uses no NASA event data.</p></article>`;
    const result = this.solarOutcome
      ? `<div class="science-result" role="status"><strong>${alreadyComplete && !this.solarOutcome.firstCompletion ? 'Challenge already in the log' : 'Preparation recorded'}</strong><p>This is a GAME-SIMPLIFIED training outcome, not a claim that the historical flare affected Mars.</p>${renderResourceChanges(this.solarOutcome)}</div>`
      : '';
    return this.renderShell('Solar Storm Alert', `${sourceCard}
      <section class="science-activity"><span class="science-truth is-sim">GAME-SIMPLIFIED · CHOOSE A PREPARATION</span><p>A historical Sun event can help us practice planning. It does not tell us that Mars had a storm or a measured surface dose.</p>
        <div class="science-choice-list">
          <button class="science-choice${this.solarChoice === 'shelter' ? ' is-selected' : ''}" type="button" data-solar-choice="shelter"><strong>Move the crew to the shelter</strong><span>In this game scenario: stronger shield readiness, a small power cost.</span></button>
          <button class="science-choice${this.solarChoice === 'power' ? ' is-selected' : ''}" type="button" data-solar-choice="power"><strong>Keep solar systems online</strong><span>In this game scenario: more stored power, less shield readiness.</span></button>
        </div>${this.solarChoice ? `<button class="science-primary" type="button" data-solar-confirm${this.solarOutcome ? ' disabled' : ''}>${this.solarOutcome ? 'Preparation saved' : 'Apply preparation'}</button>` : ''}
      </section>${result}`);
  }

  private renderRadiationChallenge(): string {
    const curiosity = this.data.curiosity?.datasets.gcrBaseline;
    const iss = this.data.radlab?.records[0];
    const dataAvailable = Boolean(curiosity && iss);
    const dataCards = `<div class="science-data-grid">
      ${curiosity ? `<article class="science-data-card"><div class="science-card-heading"><span class="science-truth is-real">REAL · MARS SURFACE</span><span>Curiosity RAD</span></div><strong>${curiosity.doseEquivalentRate.toFixed(2)} ± ${curiosity.doseEquivalentRateUncertainty.toFixed(2)} ${escapeHtml(curiosity.doseEquivalentRateUnit)}</strong><p>Gale Crater background, measured during the first 300 sols (2012–2013).</p>${renderProvenance(curiosity.provenance)}</article>` : `<article class="science-data-card"><span class="science-truth is-missing">NO LOCAL CURIOSITY RECORD</span><p>No Mars surface measurement is available in this offline bundle.</p></article>`}
      ${iss ? `<article class="science-data-card"><div class="science-card-heading"><span class="science-truth is-real">REAL · ISS / LOW EARTH ORBIT</span><span>NASA OSDR RadLab</span></div><strong>${iss.absorbedDoseRate.toFixed(2)} ${escapeHtml(iss.absorbedDoseRateUnit)}</strong><p>One DosTel1 reading from the ISS Columbus Laboratory, ${escapeHtml(formatDate(iss.timestamp))}. This is an ISS measurement, not a Mars reading.</p>${renderProvenance(iss.provenance)}</article>` : `<article class="science-data-card"><span class="science-truth is-missing">NO LOCAL ISS RECORD</span><p>No RadLab ISS observation is available in this offline bundle.</p></article>`}
    </div>`;
    const alreadyComplete = (this.state.completedScienceChallenges ?? []).includes('radiation-detective');
    let activity: string;
    if (!dataAvailable) {
      activity = '<p class="science-missing-note">This comparison is unavailable because one or both offline snapshots are missing. No substitute measurements are being invented.</p>';
    } else if (this.radiationStep === 0) {
      activity = `<section class="science-activity"><p>Radiation is energy carried by particles or waves. Which data card was measured on Mars?</p><div class="science-choice-list"><button class="science-choice" type="button" data-radiation-answer="curiosity"><strong>Curiosity RAD</strong><span>Gale Crater surface</span></button><button class="science-choice" type="button" data-radiation-answer="iss"><strong>RadLab DosTel1</strong><span>ISS in low Earth orbit</span></button></div></section>`;
    } else if (this.radiationStep === 1) {
      const correct = this.radiationAnswerCorrect;
      activity = `<div class="science-result" role="status"><strong>${correct ? 'Correct observation!' : 'Good try — here is the clue.'}</strong><p>${correct ? 'Curiosity RAD measured the Mars surface at Gale Crater.' : 'Curiosity RAD is the Mars surface record. RadLab DosTel1 is from the ISS.'}</p><button class="science-primary" type="button" data-radiation-next>Next clue</button></div>`;
    } else if (this.radiationStep === 3) {
      const correct = this.radiationAnswerCorrect;
      const completion = this.radiationOutcome?.firstCompletion ? '✓ ADDED TO SCIENCE LOG' : alreadyComplete ? '✓ ALREADY IN SCIENCE LOG' : '';
      activity = `<div class="science-result" role="status"><strong>${correct ? 'Great data detective work!' : 'Good try — compare the labels.'}</strong><p>${correct ? 'Right: the ISS and Mars readings have different environments, instruments and units. They are not direct substitutes.' : 'The readings cannot be directly compared as if they described the same place. ISS shielding, orbit, detector and units differ from Curiosity’s Mars surface measurement.'}</p><span class="science-status is-complete">${completion}</span></div>`;
    } else {
      activity = `<section class="science-activity"><p>Can we treat the ISS number as a direct Mars-surface comparison?</p><div class="science-choice-list"><button class="science-choice" type="button" data-radiation-answer="yes"><strong>Yes</strong><span>Same number means same environment.</span></button><button class="science-choice" type="button" data-radiation-answer="no"><strong>No</strong><span>Different place, detector context and units.</span></button></div></section>`;
    }
    const takeaway = '<p class="science-takeaway"><strong>Takeaway:</strong> Space radiation matters because energetic particles can pass through materials and affect people. Shielding helps; measurements from Mars and the ISS describe different environments and cannot be swapped.</p>';
    return this.renderShell('Radiation Detective', `${dataCards}${activity}${takeaway}`, dataAvailable);
  }

  private renderSupplyChallenge(): string {
    const crewOptions = [2, 3, 4, 5, 6].map((count) => `<option value="${count}"${this.supplyCrewCount === count ? ' selected' : ''}>${count} astronauts</option>`).join('');
    const estimate = this.supplyEstimate;
    const alreadyComplete = (this.state.completedScienceChallenges ?? []).includes('supply-planner');
    const result = estimate
      ? `<div class="science-result" role="status"><span class="science-truth is-derived">DERIVED · GAME-SIMPLIFIED 30-DAY SCENARIO</span><p>Your estimate: ${escapeHtml(this.supplyOxygenGuess)} kg oxygen and ${escapeHtml(this.supplyWaterGuess)} kg water.</p><strong>${estimate.oxygenKg.toFixed(1)} kg oxygen</strong><p>0.84 kg × ${estimate.crewCount} astronauts × 30 days.</p><strong>${formatAmount(estimate.waterKg)} kg potable water</strong><p>2.50 kg × ${estimate.crewCount} astronauts × 30 days (2.00 drinking + 0.50 food rehydration).</p><p>${alreadyComplete && !this.supplyOutcome?.firstCompletion ? 'This challenge is already in your log; replaying it does not change mission resources.' : 'Recycling can reduce fresh water needed. Plants may add food, but need light, water and time; neither is calculated here.'}</p>${this.supplyOutcome?.firstCompletion ? '<span class="science-status is-complete">✓ ADDED TO SCIENCE LOG</span>' : ''}</div>`
      : `<section class="science-activity"><p>Choose a crew size. Make a quick estimate for 30 days, then compare it with the planning math.</p><label class="science-select-label" for="science-crew-count">Crew size</label><select id="science-crew-count" data-supply-crew>${crewOptions}</select><div class="science-estimate-grid"><label>Oxygen guess <span>kg</span><input type="number" min="0" step="0.1" inputmode="decimal" data-supply-oxygen-guess value="${escapeHtml(this.supplyOxygenGuess)}" aria-label="Your oxygen estimate in kilograms"></label><label>Water guess <span>kg</span><input type="number" min="0" step="1" inputmode="decimal" data-supply-water-guess value="${escapeHtml(this.supplyWaterGuess)}" aria-label="Your water estimate in kilograms"></label></div>${this.supplyError ? '<p class="science-form-error" role="alert">Enter a number for both estimates. Zero is okay for a first guess.</p>' : ''}<button class="science-primary" type="button" data-supply-calculate>Check my estimate</button></section>`;
    return this.renderShell('30-Day Supply Problem', `${renderProvenance(BVAD_SOURCE, 'REAL')}
      <div class="science-source-note"><span class="science-truth is-real">REAL · NASA PLANNING REFERENCE</span><p>Per crewmember each day: <strong>0.84 kg oxygen</strong> and <strong>2.50 kg water</strong> (2.00 kg drinking + 0.50 kg food rehydration). These are planning assumptions, not measurements on Mars. The report is cited for offline use; no BVAD JSON snapshot is bundled.</p></div>
      ${result}<p class="science-method-note"><strong>GAME-SIMPLIFIED:</strong> These values come from different BVAD planning tables and are combined only for this learning exercise. The estimate excludes storage margin, system losses, recycling and greenhouse crop needs.</p>`, true);
  }

  private renderShell(title: string, content: string, available = true): string {
    const id = this.mode === 'hub' ? '' : this.mode;
    const isComplete = id ? (this.state.completedScienceChallenges ?? []).includes(id) : false;
    return `<section class="science-panel" role="dialog" aria-modal="true" aria-labelledby="science-title">
      <header class="science-header"><div><button class="science-back" type="button" data-science-back>← Science Log</button><span class="science-kicker">NASA DATA · OFFLINE ACTIVITY</span><h2 id="science-title">${escapeHtml(title)}</h2></div><button class="science-close" type="button" data-science-close aria-label="Close science challenge">×</button></header>
      <div class="science-body">${content}</div>
      <footer class="science-footer"><span>${isComplete ? 'Challenge recorded in this save' : available ? 'Progress saves with your mission' : 'Some offline source data is unavailable'}</span><button class="science-secondary" type="button" data-science-close>Return to outpost</button></footer>
    </section>`;
  }

  private focus(selector: string): void {
    this.container.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
  }
}

function renderProvenance(provenance: SourceProvenance, classification: 'REAL' | 'DERIVED' = 'REAL'): string {
  const method = provenance.methodology ? `<dt>Method</dt><dd>${escapeHtml(provenance.methodology)}</dd>` : '';
  const location = provenance.location ? `<dt>Location</dt><dd>${escapeHtml(provenance.location)}</dd>` : '';
  const time = provenance.timeContext ? `<dt>Time context</dt><dd>${escapeHtml(provenance.timeContext)}</dd>` : '';
  const limitation = provenance.limitations ? `<dt>Limit</dt><dd>${escapeHtml(provenance.limitations)}</dd>` : '';
  return `<details class="science-provenance"><summary>Dataset ${escapeHtml(provenance.datasetId)} · retrieved ${escapeHtml(provenance.retrievalDate)} · source</summary>
    <dl>${location}${time}${method}${limitation}<dt>Dataset ID</dt><dd>${escapeHtml(provenance.datasetId)}</dd><dt>Retrieved</dt><dd>${escapeHtml(provenance.retrievalDate)}</dd></dl>
    <a href="${escapeHtml(provenance.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open source record</a>
    <span class="science-truth ${classification === 'REAL' ? 'is-real' : 'is-derived'}">${classification}</span>
  </details>`;
}

function renderResourceChanges(outcome: ScienceChallengeOutcome): string {
  if (!outcome.firstCompletion) return '<p>Replay does not apply the resource change again.</p>';
  if (outcome.resourceChanges.length === 0) return '<p>No mission resource was changed.</p>';
  const names: Record<string, string> = { power: 'Power', lifeSupport: 'Life Support', stormShield: 'Storm Shielding' };
  return `<ul class="science-change-list">${outcome.resourceChanges.map((change) => `<li><strong>${change.actualDelta > 0 ? '+' : ''}${change.actualDelta} ${escapeHtml(change.unit)} ${escapeHtml(names[change.resource] ?? change.resource)}</strong><span>${escapeHtml(change.reason)}</span></li>`).join('')}</ul>`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function formatAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}
