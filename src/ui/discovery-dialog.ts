import type { MarsDiscovery } from '../data/discoveries';
import { escapeHtml } from '../core/space-weather-event';

export interface DiscoveryDialogHandlers {
  onClose: () => void;
  onDiscoveryLogged?: (discoveryId: string) => void;
}

export class DiscoveryDialogUI {
  private currentDiscovery?: MarsDiscovery;
  private focusedBeforeOpen?: HTMLElement;
  private discoveredIds = new Set<string>();

  constructor(
    private readonly container: HTMLElement,
    private readonly handlers: DiscoveryDialogHandlers
  ) {
    this.container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-discovery-close]')) {
        event.preventDefault();
        this.close();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (this.isOpen() && event.key === 'Escape') {
        event.preventDefault();
        this.close();
      }
    });
  }

  public open(discovery: MarsDiscovery, returnFocus?: HTMLElement): void {
    this.currentDiscovery = discovery;
    this.focusedBeforeOpen =
      returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : undefined);
    this.discoveredIds.add(discovery.id);
    this.handlers.onDiscoveryLogged?.(discovery.id);

    this.container.hidden = false;
    this.render();

    const closeBtn = this.container.querySelector<HTMLButtonElement>('[data-discovery-close]');
    closeBtn?.focus({ preventScroll: true });
  }

  public close(): void {
    if (this.container.hidden) return;
    this.container.hidden = true;
    this.container.innerHTML = '';
    this.currentDiscovery = undefined;
    this.handlers.onClose();

    if (this.focusedBeforeOpen?.isConnected) {
      this.focusedBeforeOpen.focus({ preventScroll: true });
    }
  }

  public isOpen(): boolean {
    return !this.container.hidden;
  }

  public getDiscoveredCount(): number {
    return this.discoveredIds.size;
  }

  private render(): void {
    if (!this.currentDiscovery) return;
    const d = this.currentDiscovery;

    this.container.innerHTML = `
      <div class="discovery-backdrop" data-discovery-close></div>
      <section class="discovery-card" role="dialog" aria-modal="true" aria-labelledby="discovery-title">
        <header class="discovery-header">
          <span class="discovery-icon" aria-hidden="true">${d.icon}</span>
          <div class="discovery-title-block">
            <span class="discovery-kicker">FIELD DISCOVERY · ${escapeHtml(d.category.toUpperCase())}</span>
            <h2 id="discovery-title">${escapeHtml(d.name)}</h2>
          </div>
          <button class="discovery-close-btn" type="button" data-discovery-close aria-label="Close discovery log">×</button>
        </header>

        <div class="discovery-body">
          <p class="discovery-explanation">${escapeHtml(d.explanation)}</p>

          <div class="discovery-fact-box">
            <span class="discovery-box-tag">💡 REAL MARS SCIENCE FACT</span>
            <p>${escapeHtml(d.scientificFact)}</p>
          </div>

          <div class="discovery-science-box">
            <span class="discovery-box-tag">🔍 WHY SCIENTISTS STUDY THIS</span>
            <p>${escapeHtml(d.whyScientistsStudyIt)}</p>
          </div>

          <div class="discovery-provenance-box">
            <span class="discovery-box-tag">🛰️ NASA OBSERVATION REFERENCE</span>
            <p>${escapeHtml(d.nasaAttribution)}</p>
          </div>
        </div>

        <footer class="discovery-footer">
          <span class="discovery-badge"><span aria-hidden="true">✓</span> DISCOVERY LOGGED</span>
          <span class="discovery-close-hint">Press Esc or close to continue exploring</span>
        </footer>
      </section>
    `;
  }
}
