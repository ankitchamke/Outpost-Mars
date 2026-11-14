import { GameState } from '../core/types';

/**
 * OUTPOST: MARS — HUD Overlay Component
 * Manages semantic, accessible DOM overlay for resource gauges and status indicators.
 */
export class OutpostHud {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Updates the HUD display with the latest game state.
   */
  public update(state: GameState): void {
    const { power, lifeSupport, stormShield } = state.resources;
    const safety = state.crewSafety;

    const powerPercent = Math.min(100, Math.round((power.current / power.max) * 100));
    const lifeSupportPercent = Math.min(100, Math.round((lifeSupport.current / lifeSupport.max) * 100));
    const stormShieldPercent = Math.min(100, Math.round((stormShield.current / stormShield.max) * 100));

    this.container.innerHTML = `
      <section class="hud-panel resource-gauges" aria-label="Life Support & Resource Telemetry">
        <!-- Power Gauge -->
        <div class="gauge-row">
          <div class="gauge-label">
            <span>⚡ Power</span>
            <span aria-live="polite">${power.current} / ${power.max} ${power.unit}</span>
          </div>
          <div 
            class="gauge-track" 
            role="progressbar" 
            aria-valuenow="${power.current}" 
            aria-valuemin="0" 
            aria-valuemax="${power.max}" 
            aria-label="Power reserve"
          >
            <div class="gauge-fill gauge-power" style="width: ${powerPercent}%"></div>
          </div>
        </div>

        <!-- Life Support Gauge -->
        <div class="gauge-row">
          <div class="gauge-label">
            <span>🫁 Life Support</span>
            <span aria-live="polite">${lifeSupport.current}${lifeSupport.unit}</span>
          </div>
          <div 
            class="gauge-track" 
            role="progressbar" 
            aria-valuenow="${lifeSupport.current}" 
            aria-valuemin="0" 
            aria-valuemax="${lifeSupport.max}" 
            aria-label="Life support reserve"
          >
            <div class="gauge-fill gauge-life-support" style="width: ${lifeSupportPercent}%"></div>
          </div>
        </div>

        <!-- Storm Protection Gauge -->
        <div class="gauge-row">
          <div class="gauge-label">
            <span>🛡️ Storm Shielding</span>
            <span aria-live="polite">${stormShield.current}${stormShield.unit}</span>
          </div>
          <div 
            class="gauge-track" 
            role="progressbar" 
            aria-valuenow="${stormShield.current}" 
            aria-valuemin="0" 
            aria-valuemax="${stormShield.max}" 
            aria-label="Storm shielding readiness"
          >
            <div class="gauge-fill gauge-storm-shield" style="width: ${stormShieldPercent}%"></div>
          </div>
        </div>
      </section>

      <!-- Status & Crew Safety Panel -->
      <section class="hud-panel" aria-label="Mission and Crew Status">
        <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end;">
          <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-secondary); font-weight: 700;">
            Crew Safety (4 Astronauts)
          </div>
          <div class="safety-badge ${safety}" role="status" aria-label="Crew safety status: ${safety}">
            <span aria-hidden="true">${safety === 'nominal' ? '🟢' : safety === 'caution' ? '🟡' : '🔴'}</span>
            <span>${safety.toUpperCase()}</span>
          </div>
        </div>
      </section>
    `;
  }
}
