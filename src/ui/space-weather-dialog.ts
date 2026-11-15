/**
 * OUTPOST: MARS — Space Weather Mission Event Dialog UI
 * Accessible, responsive dialog presenting the NASA DONKI historical space-weather advisory
 * with meaningful strategic trade-offs for the five-Sol campaign.
 */

import type { GameState } from '../core/types';
import {
  HISTORICAL_DONKI_EVENT,
  SpaceWeatherChoice,
  SpaceWeatherDecisionOutcome,
  applySpaceWeatherDecision,
  escapeHtml,
} from '../core/space-weather-event';

export interface SpaceWeatherDialogHandlers {
  onDecisionConfirmed: (outcome: SpaceWeatherDecisionOutcome) => void;
  onClose: () => void;
}

export class SpaceWeatherDialogUI {
  private selectedChoice: SpaceWeatherChoice | null = null;
  private currentOutcome?: SpaceWeatherDecisionOutcome;
  private focusedBeforeOpen?: HTMLElement;

  constructor(
    private readonly container: HTMLElement,
    private readonly handlers: SpaceWeatherDialogHandlers
  ) {
    this.container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;

      // Close button
      if (target.closest('[data-weather-close]')) {
        event.preventDefault();
        this.close();
        return;
      }

      // Choice selection
      const choiceBtn = target.closest<HTMLButtonElement>('[data-weather-choice]');
      if (choiceBtn && !this.currentOutcome) {
        event.preventDefault();
        const choice = choiceBtn.dataset.weatherChoice as SpaceWeatherChoice;
        if (choice === 'shelter' || choice === 'power') {
          this.selectedChoice = choice;
          this.render();
          this.container.querySelector<HTMLButtonElement>('[data-weather-confirm]')?.focus({ preventScroll: true });
        }
        return;
      }

      // Confirm button
      if (target.closest('[data-weather-confirm]') && this.selectedChoice && !this.currentOutcome) {
        event.preventDefault();
        this.confirmDecision();
        return;
      }

      // Done button
      if (target.closest('[data-weather-done]')) {
        event.preventDefault();
        this.close();
        return;
      }
    });

    document.addEventListener('keydown', (event) => {
      if (this.isOpen() && event.key === 'Escape') {
        event.preventDefault();
        this.close();
      }
    });
  }

  private state!: GameState;

  public open(state: GameState, returnFocus?: HTMLElement): void {
    this.state = state;
    this.focusedBeforeOpen = returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : undefined);
    this.selectedChoice = state.spaceWeatherDecision ?? null;
    this.currentOutcome = undefined;

    this.container.hidden = false;
    this.render();

    const firstInteractive = this.container.querySelector<HTMLElement>(
      this.selectedChoice ? '[data-weather-confirm], [data-weather-done]' : '[data-weather-choice]'
    );
    firstInteractive?.focus({ preventScroll: true });
  }

  public close(): void {
    this.container.hidden = true;
    this.container.innerHTML = '';
    this.handlers.onClose();

    if (this.focusedBeforeOpen?.isConnected) {
      this.focusedBeforeOpen.focus({ preventScroll: true });
    }
  }

  public isOpen(): boolean {
    return !this.container.hidden;
  }

  private confirmDecision(): void {
    if (!this.selectedChoice) return;
    const outcome = applySpaceWeatherDecision(this.state, this.selectedChoice);
    this.currentOutcome = outcome;
    this.state = outcome.state;
    this.handlers.onDecisionConfirmed(outcome);
    this.render();
    this.container.querySelector<HTMLButtonElement>('[data-weather-done]')?.focus({ preventScroll: true });
  }

  private render(): void {
    const isAlreadyDecided = Boolean(this.state.spaceWeatherDecision && !this.currentOutcome);
    const decision = this.state.spaceWeatherDecision ?? this.selectedChoice;
    const powerCurrent = this.state.resources.power.current;
    const isLowPower = powerCurrent < 15;
    const event = HISTORICAL_DONKI_EVENT;

    // Power cost preview
    const powerDraw = isLowPower ? Math.max(3, Math.max(0, powerCurrent - 5)) : 10;
    const shieldGain = isLowPower ? Math.max(6, Math.round((powerDraw / 10) * 18)) : 18;

    this.container.innerHTML = `
      <div class="space-weather-backdrop" data-weather-close></div>
      <section class="space-weather-card" role="dialog" aria-modal="true" aria-labelledby="space-weather-title">
        <header class="space-weather-header">
          <div class="space-weather-title-group">
            <span class="space-weather-kicker">SOL 4 · MISSION EVENT ADVISORY</span>
            <h2 id="space-weather-title">Space Weather Alert: Solar Flare ${escapeHtml(event.classType)}</h2>
          </div>
          <button class="space-weather-close" type="button" data-weather-close aria-label="Close space weather advisory">×</button>
        </header>

        <div class="space-weather-body">
          <!-- Real NASA Observation Data Card -->
          <article class="space-weather-provenance">
            <div class="provenance-top-row">
              <span class="provenance-tag">REAL NASA DONKI OBSERVATION</span>
              <span class="provenance-date">${escapeHtml(event.timestampUtc)}</span>
            </div>
            <strong class="provenance-headline">Historical ${escapeHtml(event.classType)} Flare from Active Region ${event.activeRegion}</strong>
            <p class="provenance-desc">NASA's Space Weather Database (DONKI) cataloged a major X-ray flare and coronal mass ejection observed by the ${escapeHtml(event.instrument)} in ${escapeHtml(event.observationLocation)}.</p>
            <div class="provenance-meta-grid">
              <span><strong>Instrument:</strong> ${escapeHtml(event.instrument)}</span>
              <span><strong>Location:</strong> ${escapeHtml(event.observationLocation)}</span>
              <span><strong>Source Region:</strong> NOAA AR ${event.activeRegion} (${escapeHtml(event.sourceLocation)})</span>
            </div>
            <p class="provenance-disclaimer"><em>Important:</em> ${escapeHtml(event.limitations)}</p>
          </article>

          <!-- Educational Simulation Context -->
          <div class="space-weather-sim-notice">
            <span class="sim-badge">EDUCATIONAL SIMULATION</span>
            <p>${escapeHtml(event.educationalContext)} A simulated solar particle event is reaching Jezero Crater. Choose how the colony allocates its resources.</p>
          </div>

          ${
            this.currentOutcome
              ? `
              <div class="space-weather-outcome-panel" role="status">
                <span class="outcome-kicker">STRATEGY EXECUTED</span>
                <strong class="outcome-title">${this.currentOutcome.decision === 'shelter' ? 'Storm Shelter Fortified' : 'Colony Power Conserved'}</strong>
                <p class="outcome-desc">${escapeHtml(this.currentOutcome.explanation)}</p>
                ${
                  this.currentOutcome.warningNotes
                    ? `<div class="space-weather-warning-note">⚠️ ${escapeHtml(this.currentOutcome.warningNotes)}</div>`
                    : ''
                }
                <ul class="space-weather-changes">
                  ${this.currentOutcome.resourceChanges
                    .map(
                      (change) =>
                        `<li><span class="change-delta">${change.delta > 0 ? '+' : ''}${change.delta} ${change.unit} ${change.resource === 'power' ? 'Power' : 'Storm Shielding'}</span><span>${escapeHtml(change.reason)}</span></li>`
                    )
                    .join('')}
                </ul>
                <div class="space-weather-actions">
                  <button class="btn btn-primary" type="button" data-weather-done>Continue Sol 4 Mission</button>
                </div>
              </div>
            `
              : isAlreadyDecided
              ? `
              <div class="space-weather-outcome-panel" role="status">
                <span class="outcome-kicker">PREVIOUSLY LOGGED</span>
                <strong class="outcome-title">Strategy: ${decision === 'shelter' ? 'Fortify Storm Shelter' : 'Conserve Colony Power'}</strong>
                <p class="outcome-desc">The colony already executed its tactical defense plan for this space-weather event. Results are recorded in the five-Sol mission telemetry.</p>
                <div class="space-weather-actions">
                  <button class="btn btn-secondary" type="button" data-weather-close>Close Advisory</button>
                </div>
              </div>
            `
              : `
              <!-- Decision Selection Choices -->
              <div class="space-weather-choices" role="radiogroup" aria-label="Colony defense strategy">
                <button
                  type="button"
                  class="space-weather-choice-btn${decision === 'shelter' ? ' is-selected' : ''}"
                  data-weather-choice="shelter"
                  role="radio"
                  aria-checked="${decision === 'shelter'}"
                >
                  <div class="choice-heading">
                    <span class="choice-icon">🛡️</span>
                    <div>
                      <strong>Fortify Storm Shelter</strong>
                      <span class="choice-sub">Prioritize crew radiation protection</span>
                    </div>
                  </div>
                  <p class="choice-detail">Orders the crew into the regolith storm shelter and energizes magnetic coils.</p>
                  <div class="choice-impacts">
                    <span class="impact-positive">+${shieldGain}% Storm Shielding</span>
                    <span class="impact-negative">-${powerDraw} kW Power</span>
                  </div>
                  ${isLowPower ? '<small class="choice-warning">Low power reserve: throttled to preserve life support.</small>' : ''}
                </button>

                <button
                  type="button"
                  class="space-weather-choice-btn${decision === 'power' ? ' is-selected' : ''}"
                  data-weather-choice="power"
                  role="radio"
                  aria-checked="${decision === 'power'}"
                >
                  <div class="choice-heading">
                    <span class="choice-icon">⚡</span>
                    <div>
                      <strong>Conserve Colony Power</strong>
                      <span class="choice-sub">Maintain energy reserves for operations</span>
                    </div>
                  </div>
                  <p class="choice-detail">Keeps battery banks connected to primary hydroponics and life-support compressors.</p>
                  <div class="choice-impacts">
                    <span class="impact-positive">+8 kW Power Stored</span>
                    <span class="impact-negative">-12% Storm Shielding</span>
                  </div>
                </button>
              </div>

              <div class="space-weather-actions">
                <button
                  class="btn btn-primary space-weather-confirm-btn"
                  type="button"
                  data-weather-confirm
                  ${!this.selectedChoice ? 'disabled' : ''}
                >
                  Confirm Defense Strategy
                </button>
                <button class="btn btn-secondary" type="button" data-weather-close>Postpone Decision</button>
              </div>
            `
          }
        </div>
      </section>
    `;
  }
}
