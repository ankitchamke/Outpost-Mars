import { GameState } from '../core/types';

interface ResourceSnapshot {
  power: number;
  lifeSupport: number;
  stormShield: number;
}

type TrendDirection = 'up' | 'down' | 'stable';

interface AstronautProfile {
  callsign: string;
  role: string;
  title: string;
}

const CREW_ROSTER: AstronautProfile[] = [
  { callsign: 'CDR', role: 'Commander', title: 'Mission Commander · Surface Ops' },
  { callsign: 'GEO', role: 'Geologist', title: 'Geologist · Sample Exploration' },
  { callsign: 'ENG', role: 'Engineer', title: 'Systems Engineer · Power & ECLSS' },
  { callsign: 'BIO', role: 'Biologist', title: 'Astrobiologist · Greenhouse & ECLSS' },
];

/**
 * OUTPOST: MARS — HUD Overlay Component
 * Manages semantic, accessible DOM overlay for resource gauges and status indicators.
 * Styled in high-contrast NASA mission control aesthetic.
 */
export class OutpostHud {
  private container: HTMLElement;
  private previousSnapshot?: ResourceSnapshot;
  private isCrewExpanded = false;
  private isTelemetryExpanded = true;
  private lastState?: GameState;

  constructor(container: HTMLElement) {
    this.container = container;

    // Delegated click handler for the crew and telemetry toggles
    this.container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('.btn-crew-toggle') || target.closest('.crew-summary-trigger')) {
        this.isCrewExpanded = !this.isCrewExpanded;
        if (this.lastState) {
          this.update(this.lastState);
        }
      } else if (target.closest('.btn-telemetry-toggle') || target.closest('.telemetry-summary-trigger')) {
        this.isTelemetryExpanded = !this.isTelemetryExpanded;
        if (this.lastState) {
          this.update(this.lastState);
        }
      }
    });
  }

  /**
   * Updates the HUD display with the latest game state.
   */
  public update(state: GameState): void {
    this.lastState = state;
    const { power, lifeSupport, stormShield } = state.resources;
    const safety = state.crewSafety;

    const powerPercent = Math.min(100, Math.max(0, Math.round((power.current / power.max) * 100)));
    const lifeSupportPercent = Math.min(100, Math.max(0, Math.round((lifeSupport.current / lifeSupport.max) * 100)));
    const stormShieldPercent = Math.min(100, Math.max(0, Math.round((stormShield.current / stormShield.max) * 100)));

    // Calculate trends
    const powerTrend = this.getTrend(power.current, this.previousSnapshot?.power);
    const lifeSupportTrend = this.getTrend(lifeSupport.current, this.previousSnapshot?.lifeSupport);
    const stormShieldTrend = this.getTrend(stormShield.current, this.previousSnapshot?.stormShield);

    // Update snapshot for subsequent calls
    this.previousSnapshot = {
      power: power.current,
      lifeSupport: lifeSupport.current,
      stormShield: stormShield.current,
    };

    // Determine threshold levels
    const powerLevel = this.getLevelClass(powerPercent);
    const lifeSupportLevel = this.getLevelClass(lifeSupportPercent);
    const stormShieldLevel = this.getLevelClass(stormShieldPercent);

    // Crew status display mapping
    const safetyConfig = {
      nominal: {
        label: 'NOMINAL',
        chipStatus: 'Nominal',
        colorClass: 'nominal',
        icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
      },
      caution: {
        label: 'WARNING',
        chipStatus: 'Caution',
        colorClass: 'caution',
        icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      },
      danger: {
        label: 'CRITICAL',
        chipStatus: 'Alert',
        colorClass: 'danger',
        icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      },
    }[safety];

    this.container.innerHTML = `
      <!-- Compact Resource Telemetry Widget (Top-Left) -->
      <section class="hud-panel resource-gauges ${this.isTelemetryExpanded ? '' : 'is-collapsed'}" aria-label="Life Support & Resource Telemetry">
        <div class="hud-panel-header hud-compact-header telemetry-summary-trigger" role="button" tabindex="0" aria-expanded="${this.isTelemetryExpanded}" aria-label="Toggle telemetry panel">
          <div class="hud-header-left">
            <span class="hud-panel-title">TELEMETRY</span>
            <span class="hud-live-tag" aria-hidden="true">LIVE</span>
          </div>
          <div class="telemetry-compact-preview" aria-hidden="true">
            <span class="mini-gauge-val" title="Power">⚡ ${power.current}</span>
            <span class="mini-gauge-val" title="Life Support">🫁 ${lifeSupport.current}%</span>
            <span class="mini-gauge-val" title="Storm Shielding">🛡️ ${stormShield.current}%</span>
          </div>
          <button class="btn-telemetry-toggle" type="button" aria-expanded="${this.isTelemetryExpanded}" aria-label="${this.isTelemetryExpanded ? 'Collapse telemetry' : 'Expand telemetry'}" title="${this.isTelemetryExpanded ? 'Hide telemetry details' : 'Show telemetry details'}">
            <span aria-hidden="true">${this.isTelemetryExpanded ? '▲' : '▼'}</span>
          </button>
        </div>

        <!-- Power Gauge -->
        <div 
          class="gauge-row ${powerLevel.isCritical ? 'gauge-row-critical' : ''}" 
          title="Power Systems: Photovoltaic solar array and battery storage. Generates electrical energy for outpost systems."
          tabindex="0"
          role="region"
          aria-label="Power system telemetry"
        >
          <div class="gauge-label">
            <div class="gauge-identity">
              <span class="gauge-icon" aria-hidden="true">⚡</span>
              <span class="gauge-name">Power</span>
            </div>
            <div class="gauge-value-group">
              <span class="trend-badge trend-${powerTrend.direction}" aria-label="Trend: ${powerTrend.label}">
                <span class="trend-symbol" aria-hidden="true">${powerTrend.symbol}</span>
              </span>
              <span class="gauge-number" aria-live="polite">${power.current} / ${power.max} <small>${power.unit}</small></span>
            </div>
          </div>
          <div 
            class="gauge-track" 
            role="progressbar" 
            aria-valuenow="${power.current}" 
            aria-valuemin="0" 
            aria-valuemax="${power.max}" 
            aria-label="Power reserve: ${powerPercent}%"
          >
            <div class="gauge-fill gauge-power ${powerLevel.className}" style="width: ${powerPercent}%"></div>
          </div>
          <div class="hud-tooltip" role="tooltip">
            Generates and distributes solar energy to run base systems and survival equipment.
          </div>
        </div>

        <!-- Life Support Gauge -->
        <div 
          class="gauge-row ${lifeSupportLevel.isCritical ? 'gauge-row-critical' : ''}" 
          title="Life Support (ECLSS): Recovers breathable air, maintains cabin pressure, and recycles potable water."
          tabindex="0"
          role="region"
          aria-label="Life support telemetry"
        >
          <div class="gauge-label">
            <div class="gauge-identity">
              <span class="gauge-icon" aria-hidden="true">🫁</span>
              <span class="gauge-name">Life Support</span>
            </div>
            <div class="gauge-value-group">
              <span class="trend-badge trend-${lifeSupportTrend.direction}" aria-label="Trend: ${lifeSupportTrend.label}">
                <span class="trend-symbol" aria-hidden="true">${lifeSupportTrend.symbol}</span>
              </span>
              <span class="gauge-number" aria-live="polite">${lifeSupport.current} <small>${lifeSupport.unit}</small></span>
            </div>
          </div>
          <div 
            class="gauge-track" 
            role="progressbar" 
            aria-valuenow="${lifeSupport.current}" 
            aria-valuemin="0" 
            aria-valuemax="${lifeSupport.max}" 
            aria-label="Life support reserve: ${lifeSupportPercent}%"
          >
            <div class="gauge-fill gauge-life-support ${lifeSupportLevel.className}" style="width: ${lifeSupportPercent}%"></div>
          </div>
          <div class="hud-tooltip" role="tooltip">
            Recovers air, regulates atmospheric pressure, and recycles drinking water for the crew.
          </div>
        </div>

        <!-- Storm Protection Gauge -->
        <div 
          class="gauge-row ${stormShieldLevel.isCritical ? 'gauge-row-critical' : ''}" 
          title="Storm Shielding: Active magnetic coils and regolith shielding against solar particle events."
          tabindex="0"
          role="region"
          aria-label="Storm shielding telemetry"
        >
          <div class="gauge-label">
            <div class="gauge-identity">
              <span class="gauge-icon" aria-hidden="true">🛡️</span>
              <span class="gauge-name">Storm Shielding</span>
            </div>
            <div class="gauge-value-group">
              <span class="trend-badge trend-${stormShieldTrend.direction}" aria-label="Trend: ${stormShieldTrend.label}">
                <span class="trend-symbol" aria-hidden="true">${stormShieldTrend.symbol}</span>
              </span>
              <span class="gauge-number" aria-live="polite">${stormShield.current} <small>${stormShield.unit}</small></span>
            </div>
          </div>
          <div 
            class="gauge-track" 
            role="progressbar" 
            aria-valuenow="${stormShield.current}" 
            aria-valuemin="0" 
            aria-valuemax="${stormShield.max}" 
            aria-label="Storm shielding readiness: ${stormShieldPercent}%"
          >
            <div class="gauge-fill gauge-storm-shield ${stormShieldLevel.className}" style="width: ${stormShieldPercent}%"></div>
          </div>
          <div class="hud-tooltip" role="tooltip">
            Protects habitat modules and crew members from hazardous solar particle events and cosmic radiation.
          </div>
        </div>
      </section>

      <!-- Compact Crew Status Widget (Top-Right) -->
      <section class="hud-panel crew-safety-panel" aria-label="Mission and Crew Status">
        <div class="crew-compact-summary crew-summary-trigger" role="button" tabindex="0" aria-expanded="${this.isCrewExpanded}" aria-label="Toggle crew details panel">
          <div class="crew-summary-left">
            <span class="crew-summary-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </span>
            <div class="crew-summary-labels">
              <span class="crew-summary-title">CREW SAFETY</span>
              <span class="crew-summary-subtitle">4 ASTRONAUTS</span>
            </div>
          </div>

          <div class="crew-summary-right">
            <div class="safety-badge ${safetyConfig.colorClass}" role="status" aria-label="Crew safety status: ${safetyConfig.label}">
              <span class="safety-badge-icon" aria-hidden="true">${safetyConfig.icon}</span>
              <span class="safety-badge-text">${safetyConfig.label}</span>
            </div>
            <button class="btn-crew-toggle" type="button" aria-expanded="${this.isCrewExpanded}" aria-label="${this.isCrewExpanded ? 'Collapse crew roster' : 'Expand crew roster'}" title="${this.isCrewExpanded ? 'Hide crew details' : 'Show crew details'}">
              <span aria-hidden="true">${this.isCrewExpanded ? '▲' : '▼'}</span>
            </button>
          </div>
        </div>

        ${this.isCrewExpanded ? `
          <div class="crew-chips-grid is-expanded" role="list" aria-label="Individual astronaut status">
            ${CREW_ROSTER.map((astronaut, idx) => {
              const memberStatus = this.getIndividualCrewStatus(safety, idx);
              return `
                <div class="crew-chip ${memberStatus.statusClass}" role="listitem" title="${astronaut.title}: ${memberStatus.label}">
                  <div class="crew-chip-avatar" aria-hidden="true">
                    <span class="crew-chip-callsign">${astronaut.callsign}</span>
                  </div>
                  <div class="crew-chip-details">
                    <span class="crew-chip-role">${astronaut.role}</span>
                    <span class="crew-chip-status"><span class="crew-status-dot" aria-hidden="true"></span>${memberStatus.label}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
      </section>
    `;
  }

  private getTrend(current: number, previous?: number): { direction: TrendDirection; symbol: string; label: string } {
    if (previous === undefined || current === previous) {
      return { direction: 'stable', symbol: '―', label: 'stable' };
    }
    if (current > previous) {
      return { direction: 'up', symbol: '▲', label: 'increasing' };
    }
    return { direction: 'down', symbol: '▼', label: 'decreasing' };
  }

  private getLevelClass(percent: number): { className: string; isCritical: boolean } {
    if (percent >= 60) {
      return { className: 'level-nominal', isCritical: false };
    }
    if (percent >= 30) {
      return { className: 'level-caution', isCritical: false };
    }
    return { className: 'level-critical is-pulsing', isCritical: true };
  }

  private getIndividualCrewStatus(safety: GameState['crewSafety'], index: number): { label: string; statusClass: string } {
    if (safety === 'nominal') {
      return { label: 'Nominal', statusClass: 'status-nominal' };
    }
    if (safety === 'caution') {
      if (index === 2 || index === 1) {
        return { label: 'Monitoring', statusClass: 'status-caution' };
      }
      return { label: 'Nominal', statusClass: 'status-nominal' };
    }
    return { label: 'Sheltered', statusClass: 'status-danger' };
  }
}
