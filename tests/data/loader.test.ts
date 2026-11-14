import { describe, expect, it } from 'vitest';
import {
  loadDonkiSnapshotFromRaw,
  loadOsdrSnapshotFromRaw,
  loadRadLabSnapshotFromRaw,
  OfflineSnapshotLoader,
  parseRawSnapshotInput,
} from '../../src/data/loader';
import {
  SYNTHETIC_VALID_DONKI_SNAPSHOT_FIXTURE,
  SYNTHETIC_VALID_OSDR_SNAPSHOT_FIXTURE,
  SYNTHETIC_VALID_RADLAB_SNAPSHOT_FIXTURE,
} from './fixtures';

describe('Offline Snapshot Loader — Raw Parsing & Error Handling', () => {
  it('parses valid JSON string into object', () => {
    const jsonStr = JSON.stringify(SYNTHETIC_VALID_DONKI_SNAPSHOT_FIXTURE);
    const res = parseRawSnapshotInput(jsonStr, 'donki');
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.errors.length).toBe(0);
  });

  it('gracefully handles malformed JSON string without throwing unhandled exceptions', () => {
    const brokenJson = '{ "source": "NASA DONKI", broken json syntax';
    const res = parseRawSnapshotInput(brokenJson, 'donki');
    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.errors.length).toBe(1);
    expect(res.errors[0].path).toBe('donki');
    expect(res.errors[0].message).toContain('JSON parse error');
  });

  it('gracefully handles non-object, non-string input (numbers, booleans, null)', () => {
    const resNum = parseRawSnapshotInput(12345, 'test');
    expect(resNum.success).toBe(false);
    expect(resNum.errors[0].message).toContain('Expected JSON string or object');

    const resNull = parseRawSnapshotInput(null, 'test');
    expect(resNull.success).toBe(false);

    const resUndef = parseRawSnapshotInput(undefined, 'test');
    expect(resUndef.success).toBe(false);
  });

  it('loads valid DONKI snapshot from raw JSON string', () => {
    const jsonStr = JSON.stringify(SYNTHETIC_VALID_DONKI_SNAPSHOT_FIXTURE);
    const res = loadDonkiSnapshotFromRaw(jsonStr);
    expect(res.success).toBe(true);
    expect(res.data?.source).toBe('NASA DONKI');
    expect(res.data?.cmes.length).toBe(1);
  });

  it('loads valid RadLab snapshot from raw object', () => {
    const res = loadRadLabSnapshotFromRaw(SYNTHETIC_VALID_RADLAB_SNAPSHOT_FIXTURE);
    expect(res.success).toBe(true);
    expect(res.data?.source).toBe('NASA OSDR RadLab');
    expect(res.data?.records.length).toBe(1);
  });

  it('loads valid OSDR snapshot from raw object', () => {
    const res = loadOsdrSnapshotFromRaw(SYNTHETIC_VALID_OSDR_SNAPSHOT_FIXTURE);
    expect(res.success).toBe(true);
    expect(res.data?.source).toBe('NASA OSDR');
    expect(res.data?.studies.length).toBe(1);
  });

  it('returns validation errors when raw DONKI snapshot contains invalid data', () => {
    const invalidDonki = {
      ...SYNTHETIC_VALID_DONKI_SNAPSHOT_FIXTURE,
      schemaVersion: '9.9', // invalid
    };
    const res = loadDonkiSnapshotFromRaw(invalidDonki);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.path.includes('schemaVersion'))).toBe(true);
  });
});

describe('OfflineSnapshotLoader Registry & Workflow', () => {
  it('instantiates empty loader and handles missing snapshots gracefully', () => {
    const loader = new OfflineSnapshotLoader();
    expect(loader.hasSnapshot('donki')).toBe(false);
    expect(loader.hasSnapshot('radlab')).toBe(false);
    expect(loader.hasSnapshot('osdr')).toBe(false);

    const donkiRes = loader.loadDonki();
    expect(donkiRes.success).toBe(false);
    expect(donkiRes.errors[0].message).toContain('DONKI snapshot not found in offline bundle');

    const radlabRes = loader.loadRadLab();
    expect(radlabRes.success).toBe(false);
    expect(radlabRes.errors[0].message).toContain('RadLab snapshot not found in offline bundle');

    const osdrRes = loader.loadOsdr();
    expect(osdrRes.success).toBe(false);
    expect(osdrRes.errors[0].message).toContain('OSDR snapshot not found in offline bundle');
  });

  it('registers snapshots dynamically and loads typed data without network calls', () => {
    const loader = new OfflineSnapshotLoader();

    // Register DONKI
    loader.registerSnapshot('donki', SYNTHETIC_VALID_DONKI_SNAPSHOT_FIXTURE);
    expect(loader.hasSnapshot('donki')).toBe(true);

    const donkiRes = loader.loadDonki();
    expect(donkiRes.success).toBe(true);
    expect(donkiRes.data?.cmes[0].activityId).toBe('2024-05-10T07:12:00-CME-TEST-001');

    // Register RadLab
    loader.registerSnapshot('radlab', SYNTHETIC_VALID_RADLAB_SNAPSHOT_FIXTURE);
    expect(loader.hasSnapshot('radlab')).toBe(true);

    const radlabRes = loader.loadRadLab();
    expect(radlabRes.success).toBe(true);
    expect(radlabRes.data?.records[0].spacecraft).toBe('ISS');

    // Register OSDR
    loader.registerSnapshot('osdr', SYNTHETIC_VALID_OSDR_SNAPSHOT_FIXTURE);
    expect(loader.hasSnapshot('osdr')).toBe(true);

    const osdrRes = loader.loadOsdr();
    expect(osdrRes.success).toBe(true);
    expect(osdrRes.data?.studies[0].accession).toBe('OSD-661');
  });

  it('caches loaded snapshot data on subsequent queries', () => {
    const loader = new OfflineSnapshotLoader({
      donki: SYNTHETIC_VALID_DONKI_SNAPSHOT_FIXTURE,
    });

    const firstLoad = loader.loadDonki();
    const secondLoad = loader.loadDonki();
    expect(firstLoad.success).toBe(true);
    expect(secondLoad.success).toBe(true);
    expect(firstLoad.data).toBe(secondLoad.data); // Same object reference from cache
  });

  it('loads all snapshots and reports aggregated success or errors', () => {
    const loader = new OfflineSnapshotLoader({
      donki: SYNTHETIC_VALID_DONKI_SNAPSHOT_FIXTURE,
      radlab: SYNTHETIC_VALID_RADLAB_SNAPSHOT_FIXTURE,
      osdr: SYNTHETIC_VALID_OSDR_SNAPSHOT_FIXTURE,
    });

    const allRes = loader.loadAll();
    expect(allRes.success).toBe(true);
    expect(allRes.data.donki).toBeDefined();
    expect(allRes.data.radlab).toBeDefined();
    expect(allRes.data.osdr).toBeDefined();
    expect(Object.keys(allRes.errors).length).toBe(0);
  });

  it('loadAll reports failure when one snapshot is missing or malformed', () => {
    const loader = new OfflineSnapshotLoader({
      donki: SYNTHETIC_VALID_DONKI_SNAPSHOT_FIXTURE,
      // radlab missing
      osdr: { invalid: 'schema' },
    });

    const allRes = loader.loadAll();
    expect(allRes.success).toBe(false);
    expect(allRes.data.donki).toBeDefined();
    expect(allRes.data.radlab).toBeUndefined();
    expect(allRes.errors.radlab).toBeDefined();
    expect(allRes.errors.osdr).toBeDefined();
  });

  it('clears registry and cache properly', () => {
    const loader = new OfflineSnapshotLoader({
      donki: SYNTHETIC_VALID_DONKI_SNAPSHOT_FIXTURE,
    });
    expect(loader.hasSnapshot('donki')).toBe(true);
    expect(loader.loadDonki().success).toBe(true);

    loader.clear();
    expect(loader.hasSnapshot('donki')).toBe(false);
    expect(loader.loadDonki().success).toBe(false);
  });
});
