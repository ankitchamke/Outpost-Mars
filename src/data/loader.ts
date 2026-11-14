/**
 * OUTPOST: MARS — Offline Scientific Snapshot Loader
 * Loads and validates bundled local scientific data snapshots with zero network calls.
 */

import {
  DonkiSnapshot,
  OsdrSnapshot,
  RadLabSnapshot,
  ValidationError,
  ValidationResult,
} from './types';
import {
  validateDonkiSnapshot,
  validateOsdrSnapshot,
  validateRadLabSnapshot,
} from './validation';
import defaultDonkiSnapshot from './snapshots/donki-events.json';
import defaultRadLabSnapshot from './snapshots/radlab-dosimetry.json';
import defaultOsdrSnapshot from './snapshots/osdr-studies.json';

export type SnapshotKey = 'donki' | 'radlab' | 'osdr';

export interface LoadedScienceData {
  donki?: DonkiSnapshot;
  radlab?: RadLabSnapshot;
  osdr?: OsdrSnapshot;
}

export interface LoadAllResult {
  success: boolean;
  data: LoadedScienceData;
  errors: Record<string, ValidationError[]>;
}

/**
 * Safely parses raw string input into a JSON object if needed.
 */
export function parseRawSnapshotInput(raw: unknown, label = 'snapshot'): ValidationResult<unknown> {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return { success: true, data: parsed, errors: [] };
    } catch (err) {
      return {
        success: false,
        errors: [
          {
            path: label,
            message: `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
            value: raw,
          },
        ],
      };
    }
  }

  if (typeof raw === 'object' && raw !== null) {
    return { success: true, data: raw, errors: [] };
  }

  return {
    success: false,
    errors: [
      {
        path: label,
        message: `Expected JSON string or object, received ${typeof raw}`,
        value: raw,
      },
    ],
  };
}

/**
 * Validates and loads a raw DONKI snapshot payload.
 */
export function loadDonkiSnapshotFromRaw(raw: unknown): ValidationResult<DonkiSnapshot> {
  const parseRes = parseRawSnapshotInput(raw, 'donki');
  if (!parseRes.success || parseRes.data === undefined) {
    return { success: false, errors: parseRes.errors };
  }
  return validateDonkiSnapshot(parseRes.data);
}

/**
 * Validates and loads a raw RadLab snapshot payload.
 */
export function loadRadLabSnapshotFromRaw(raw: unknown): ValidationResult<RadLabSnapshot> {
  const parseRes = parseRawSnapshotInput(raw, 'radlab');
  if (!parseRes.success || parseRes.data === undefined) {
    return { success: false, errors: parseRes.errors };
  }
  return validateRadLabSnapshot(parseRes.data);
}

/**
 * Validates and loads a raw OSDR snapshot payload.
 */
export function loadOsdrSnapshotFromRaw(raw: unknown): ValidationResult<OsdrSnapshot> {
  const parseRes = parseRawSnapshotInput(raw, 'osdr');
  if (!parseRes.success || parseRes.data === undefined) {
    return { success: false, errors: parseRes.errors };
  }
  return validateOsdrSnapshot(parseRes.data);
}

/**
 * Offline scientific data snapshot loader registry.
 * Encapsulates offline-first snapshot retrieval without network calls or secrets.
 */
export class OfflineSnapshotLoader {
  private readonly rawRegistry = new Map<SnapshotKey, unknown>();
  private readonly cache: LoadedScienceData = {};

  constructor(initialSnapshots?: Partial<Record<SnapshotKey, unknown>>) {
    if (initialSnapshots) {
      Object.entries(initialSnapshots).forEach(([key, value]) => {
        if (value !== undefined) {
          this.registerSnapshot(key as SnapshotKey, value);
        }
      });
    }
  }

  /**
   * Registers a raw snapshot (JSON string or parsed object) under a known key.
   */
  public registerSnapshot(key: SnapshotKey, raw: unknown): void {
    this.rawRegistry.set(key, raw);
    delete this.cache[key];
  }

  /**
   * Returns true if a snapshot is registered for the specified key.
   */
  public hasSnapshot(key: SnapshotKey): boolean {
    return this.rawRegistry.has(key);
  }

  /**
   * Loads and validates the registered DONKI space-weather snapshot.
   */
  public loadDonki(): ValidationResult<DonkiSnapshot> {
    if (this.cache.donki) {
      return { success: true, data: this.cache.donki, errors: [] };
    }

    if (!this.rawRegistry.has('donki')) {
      return {
        success: false,
        errors: [{ path: 'donki', message: 'DONKI snapshot not found in offline bundle' }],
      };
    }

    const res = loadDonkiSnapshotFromRaw(this.rawRegistry.get('donki'));
    if (res.success && res.data) {
      this.cache.donki = res.data;
    }
    return res;
  }

  /**
   * Loads and validates the registered RadLab radiation telemetry snapshot.
   */
  public loadRadLab(): ValidationResult<RadLabSnapshot> {
    if (this.cache.radlab) {
      return { success: true, data: this.cache.radlab, errors: [] };
    }

    if (!this.rawRegistry.has('radlab')) {
      return {
        success: false,
        errors: [{ path: 'radlab', message: 'RadLab snapshot not found in offline bundle' }],
      };
    }

    const res = loadRadLabSnapshotFromRaw(this.rawRegistry.get('radlab'));
    if (res.success && res.data) {
      this.cache.radlab = res.data;
    }
    return res;
  }

  /**
   * Loads and validates the registered OSDR space biology study snapshot.
   */
  public loadOsdr(): ValidationResult<OsdrSnapshot> {
    if (this.cache.osdr) {
      return { success: true, data: this.cache.osdr, errors: [] };
    }

    if (!this.rawRegistry.has('osdr')) {
      return {
        success: false,
        errors: [{ path: 'osdr', message: 'OSDR snapshot not found in offline bundle' }],
      };
    }

    const res = loadOsdrSnapshotFromRaw(this.rawRegistry.get('osdr'));
    if (res.success && res.data) {
      this.cache.osdr = res.data;
    }
    return res;
  }

  /**
   * Loads all registered snapshots and returns an aggregated status.
   */
  public loadAll(): LoadAllResult {
    const data: LoadedScienceData = {};
    const errors: Record<string, ValidationError[]> = {};
    let overallSuccess = true;

    // Check each expected snapshot
    const donkiRes = this.loadDonki();
    if (donkiRes.success && donkiRes.data) {
      data.donki = donkiRes.data;
    } else {
      overallSuccess = false;
      errors.donki = donkiRes.errors;
    }

    const radlabRes = this.loadRadLab();
    if (radlabRes.success && radlabRes.data) {
      data.radlab = radlabRes.data;
    } else {
      overallSuccess = false;
      errors.radlab = radlabRes.errors;
    }

    const osdrRes = this.loadOsdr();
    if (osdrRes.success && osdrRes.data) {
      data.osdr = osdrRes.data;
    } else {
      overallSuccess = false;
      errors.osdr = osdrRes.errors;
    }

    return {
      success: overallSuccess,
      data,
      errors,
    };
  }

  /**
   * Clears all cached and registered snapshots.
   */
  public clear(): void {
    this.rawRegistry.clear();
    delete this.cache.donki;
    delete this.cache.radlab;
    delete this.cache.osdr;
  }
}

/**
 * Factory that returns an OfflineSnapshotLoader pre-populated with
 * statically bundled authentic NASA science data snapshots.
 * Zero network calls, zero API keys, validates every snapshot on retrieval.
 */
export function createDefaultOfflineLoader(): OfflineSnapshotLoader {
  return new OfflineSnapshotLoader({
    donki: defaultDonkiSnapshot,
    radlab: defaultRadLabSnapshot,
    osdr: defaultOsdrSnapshot,
  });
}

