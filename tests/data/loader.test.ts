import { describe, expect, it } from 'vitest';
import {
  createDefaultOfflineLoader,
  loadCuriositySnapshotFromRaw,
  loadDonkiSnapshotFromRaw,
  loadOsdrSnapshotFromRaw,
  loadRadLabSnapshotFromRaw,
  OfflineSnapshotLoader,
  parseRawSnapshotInput,
} from '../../src/data/loader';
import {
  validateCuriosityRadSnapshot,
  validateDonkiSnapshot,
  validateOsdrSnapshot,
  validateRadLabSnapshot,
} from '../../src/data/validation';
import bundledDonki from '../../src/data/snapshots/donki-events.json';
import bundledRadLab from '../../src/data/snapshots/radlab-dosimetry.json';
import bundledOsdr from '../../src/data/snapshots/osdr-studies.json';
import bundledCuriosity from '../../src/data/snapshots/curiosity-rad.json';
import {
  SYNTHETIC_VALID_CURIOSITY_RAD_SNAPSHOT_FIXTURE,
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

  it('loads valid Curiosity RAD snapshot from raw object', () => {
    const res = loadCuriositySnapshotFromRaw(SYNTHETIC_VALID_CURIOSITY_RAD_SNAPSHOT_FIXTURE);
    expect(res.success).toBe(true);
    expect(res.data?.location.body).toBe('Mars');
    expect(res.data?.location.region).toBe('Gale Crater');
    expect(res.data?.datasets.gcrBaseline.doseEquivalentRate).toBe(0.64);
    expect(res.data?.datasets.sol242SepEvent.integratedExcessDoseEquivalent).toBe(0.05);
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

  it('returns validation errors when raw Curiosity snapshot contains invalid data', () => {
    const invalidCuriosity = {
      ...SYNTHETIC_VALID_CURIOSITY_RAD_SNAPSHOT_FIXTURE,
      schemaVersion: '9.9', // invalid
    };
    const res = loadCuriositySnapshotFromRaw(invalidCuriosity);
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
    expect(loader.hasSnapshot('curiosity')).toBe(false);

    const donkiRes = loader.loadDonki();
    expect(donkiRes.success).toBe(false);
    expect(donkiRes.errors[0].message).toContain('DONKI snapshot not found in offline bundle');

    const radlabRes = loader.loadRadLab();
    expect(radlabRes.success).toBe(false);
    expect(radlabRes.errors[0].message).toContain('RadLab snapshot not found in offline bundle');

    const osdrRes = loader.loadOsdr();
    expect(osdrRes.success).toBe(false);
    expect(osdrRes.errors[0].message).toContain('OSDR snapshot not found in offline bundle');

    const curiosityRes = loader.loadCuriosity();
    expect(curiosityRes.success).toBe(false);
    expect(curiosityRes.errors[0].message).toContain('Curiosity RAD snapshot not found in offline bundle');
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

    // Register Curiosity RAD
    loader.registerSnapshot('curiosity', SYNTHETIC_VALID_CURIOSITY_RAD_SNAPSHOT_FIXTURE);
    expect(loader.hasSnapshot('curiosity')).toBe(true);

    const curiosityRes = loader.loadCuriosity();
    expect(curiosityRes.success).toBe(true);
    expect(curiosityRes.data?.location.region).toBe('Gale Crater');
    expect(curiosityRes.data?.datasets.gcrBaseline.doseEquivalentRate).toBe(0.64);
  });

  it('caches loaded snapshot data on subsequent queries', () => {
    const loader = new OfflineSnapshotLoader({
      donki: SYNTHETIC_VALID_DONKI_SNAPSHOT_FIXTURE,
      curiosity: SYNTHETIC_VALID_CURIOSITY_RAD_SNAPSHOT_FIXTURE,
    });

    const firstLoad = loader.loadDonki();
    const secondLoad = loader.loadDonki();
    expect(firstLoad.success).toBe(true);
    expect(secondLoad.success).toBe(true);
    expect(firstLoad.data).toBe(secondLoad.data); // Same object reference from cache

    const firstCuriosity = loader.loadCuriosity();
    const secondCuriosity = loader.loadCuriosity();
    expect(firstCuriosity.success).toBe(true);
    expect(secondCuriosity.success).toBe(true);
    expect(firstCuriosity.data).toBe(secondCuriosity.data);
  });

  it('loads all snapshots and reports aggregated success or errors', () => {
    const loader = new OfflineSnapshotLoader({
      donki: SYNTHETIC_VALID_DONKI_SNAPSHOT_FIXTURE,
      radlab: SYNTHETIC_VALID_RADLAB_SNAPSHOT_FIXTURE,
      osdr: SYNTHETIC_VALID_OSDR_SNAPSHOT_FIXTURE,
      curiosity: SYNTHETIC_VALID_CURIOSITY_RAD_SNAPSHOT_FIXTURE,
    });

    const allRes = loader.loadAll();
    expect(allRes.success).toBe(true);
    expect(allRes.data.donki).toBeDefined();
    expect(allRes.data.radlab).toBeDefined();
    expect(allRes.data.osdr).toBeDefined();
    expect(allRes.data.curiosity).toBeDefined();
    expect(allRes.data.curiosity?.location.region).toBe('Gale Crater');
    expect(Object.keys(allRes.errors).length).toBe(0);
  });

  it('loadAll reports failure when one snapshot is missing or malformed', () => {
    const loader = new OfflineSnapshotLoader({
      donki: SYNTHETIC_VALID_DONKI_SNAPSHOT_FIXTURE,
      // radlab missing
      osdr: { invalid: 'schema' },
      // curiosity missing
    });

    const allRes = loader.loadAll();
    expect(allRes.success).toBe(false);
    expect(allRes.data.donki).toBeDefined();
    expect(allRes.data.radlab).toBeUndefined();
    expect(allRes.data.curiosity).toBeUndefined();
    expect(allRes.errors.radlab).toBeDefined();
    expect(allRes.errors.osdr).toBeDefined();
    expect(allRes.errors.curiosity).toBeDefined();
  });

  it('clears registry and cache properly', () => {
    const loader = new OfflineSnapshotLoader({
      donki: SYNTHETIC_VALID_DONKI_SNAPSHOT_FIXTURE,
      curiosity: SYNTHETIC_VALID_CURIOSITY_RAD_SNAPSHOT_FIXTURE,
    });
    expect(loader.hasSnapshot('donki')).toBe(true);
    expect(loader.hasSnapshot('curiosity')).toBe(true);
    expect(loader.loadDonki().success).toBe(true);
    expect(loader.loadCuriosity().success).toBe(true);

    loader.clear();
    expect(loader.hasSnapshot('donki')).toBe(false);
    expect(loader.hasSnapshot('curiosity')).toBe(false);
    expect(loader.loadDonki().success).toBe(false);
    expect(loader.loadCuriosity().success).toBe(false);
  });
});

describe('Phase 02.3B: Authentic Bundled Snapshots & Default Offline Loader', () => {
  it('validates the authentic bundled DONKI snapshot against strict contracts', () => {
    const res = validateDonkiSnapshot(bundledDonki);
    expect(res.success).toBe(true);
    expect(res.data?.source).toBe('NASA DONKI');
    expect(res.data?.cmes.length).toBe(4);
    expect(res.data?.solarFlares.length).toBe(3);
    expect(res.data?.sepEvents.length).toBe(2);

    // Verify 2013-04-11 CME is excluded from DONKI Mars records (since ENLIL only modeled Spitzer)
    const has2013Cme = res.data?.cmes.some((c) => c.activityId.startsWith('2013-04-11'));
    expect(has2013Cme).toBe(false);

    // Verify presence of historic X8.7 flare (largest of Cycle 25)
    const x87 = res.data?.solarFlares.find((f) => f.classType === 'X8.7');
    expect(x87).toBeDefined();
    expect(x87?.flareId).toBe('2024-05-14T16:46:00-FLR-001');

    // Verify all 4 CMEs possess authentic WSA-ENLIL Mars shock arrival model predictions
    for (const cme of res.data?.cmes || []) {
      const marsImpact = cme.analyses.some((a) =>
        a.enlilList?.some((sim) => sim.impactList.some((imp) => imp.location === 'Mars'))
      );
      expect(marsImpact).toBe(true);
      expect(cme.analyses[0].speedUnit).toBe('km/s');
    }

    expect(x87?.fluxUnit).toBe('class');
  });

  it('validates Curiosity RAD snapshot baseline, Sol 242 event, and GAME-SIMPLIFIED drill', () => {
    const valRes = validateCuriosityRadSnapshot(bundledCuriosity);
    expect(valRes.success).toBe(true);

    expect(bundledCuriosity.schemaVersion).toBe('1.0');
    expect(bundledCuriosity.instrument).toBe('Radiation Assessment Detector (RAD)');
    expect(bundledCuriosity.spacecraft).toBe('Mars Science Laboratory (Curiosity Rover)');
    expect(bundledCuriosity.location.region).toBe('Gale Crater');

    // GCR baseline verification
    const gcr = bundledCuriosity.datasets.gcrBaseline;
    expect(gcr.classification).toBe('REAL');
    expect(gcr.doseEquivalentRate).toBe(0.64);
    expect(gcr.doseEquivalentRateUncertainty).toBe(0.12);
    expect(gcr.doseEquivalentRateUnit).toBe('mSv/day');
    expect(gcr.absorbedDoseRateSilicon).toBe(0.21);
    expect(gcr.absorbedDoseRateSiliconUnit).toBe('mGy/day');

    // Sol 242 SEP event verification (peak rate enhancement vs integrated excess dose)
    const sol242 = bundledCuriosity.datasets.sol242SepEvent;
    expect(sol242.classification).toBe('REAL');
    expect(sol242.peakAbsorbedDoseRate).toBe(260);
    expect(sol242.peakAbsorbedDoseRateUnit).toBe('uGy/day');
    expect(sol242.integratedExcessDoseEquivalent).toBe(0.05);
    expect(sol242.integratedExcessDoseEquivalentUnit).toBe('mSv');
    expect(sol242.integratedExcessDoseEquivalentMicroSv).toBe(50);
    expect(sol242.measurementClarification).toContain('integrated excess dose equivalent');

    // Strict empirical separation: Curiosity RAD snapshot contains ONLY empirical observations (no game scenario)
    expect((bundledCuriosity.datasets as Record<string, unknown>).pedagogicalComparison).toBeUndefined();
    expect(Object.keys(bundledCuriosity.datasets)).toEqual(['gcrBaseline', 'sol242SepEvent']);
  });

  it('validates the authentic bundled RadLab snapshot against strict contracts & SEC-01', () => {
    const res = validateRadLabSnapshot(bundledRadLab);
    expect(res.success).toBe(true);
    expect(res.data?.source).toBe('NASA OSDR RadLab');
    expect(res.data?.records.length).toBeGreaterThan(0);

    for (const rec of res.data?.records || []) {
      expect(rec.spacecraft).toBe('ISS');
      expect(rec.trajectory).toBe('LEO');
      expect(rec.absorbedDoseRateUnit).toBe('uGy/h');
      expect(rec.instrument).toBe('DosTel1');
      // SEC-01 check: verify provenance location never claims Mars surface
      expect(rec.provenance.location?.toLowerCase().includes('mars')).toBe(false);
    }
  });

  it('validates the authentic bundled OSDR study snapshot against strict contracts', () => {
    const res = validateOsdrSnapshot(bundledOsdr);
    expect(res.success).toBe(true);
    expect(res.data?.source).toBe('NASA OSDR');
    expect(res.data?.studies.length).toBe(2);

    // OSD-661: Bone & muscle countermeasure study
    const study661 = res.data?.studies.find((s) => s.accession === 'OSD-661');
    expect(study661).toBeDefined();
    expect(study661?.organism).toBe('Mus musculus');
    expect(study661?.publications[0].doi).toBe('10.1016/j.isci.2023.107047');

    // OSD-121: Plant seedling transcriptomics study (BRIC-16)
    const study121 = res.data?.studies.find((s) => s.accession === 'OSD-121');
    expect(study121).toBeDefined();
    expect(study121?.organism).toBe('Arabidopsis thaliana');
    expect(study121?.publications.length).toBeGreaterThan(0);
  });

  it('CFG-01 & createDefaultOfflineLoader: loads all authentic bundled snapshots offline', () => {
    const loader = createDefaultOfflineLoader();
    expect(loader.hasSnapshot('donki')).toBe(true);
    expect(loader.hasSnapshot('radlab')).toBe(true);
    expect(loader.hasSnapshot('osdr')).toBe(true);
    expect(loader.hasSnapshot('curiosity')).toBe(true);

    // Verify individual typed load methods
    const donkiRes = loader.loadDonki();
    expect(donkiRes.success).toBe(true);
    expect(donkiRes.data?.cmes.length).toBe(4);

    const radlabRes = loader.loadRadLab();
    expect(radlabRes.success).toBe(true);
    expect(radlabRes.data?.records.length).toBe(8);

    const osdrRes = loader.loadOsdr();
    expect(osdrRes.success).toBe(true);
    expect(osdrRes.data?.studies.length).toBe(2);

    const curiosityRes = loader.loadCuriosity();
    expect(curiosityRes.success).toBe(true);
    expect(curiosityRes.data?.location.body).toBe('Mars');
    expect(curiosityRes.data?.location.region).toBe('Gale Crater');

    // Verify loadAll() aggregates all 4 snapshots with 0 errors
    const allRes = loader.loadAll();
    expect(allRes.success).toBe(true);
    expect(allRes.data.donki).toBeDefined();
    expect(allRes.data.radlab).toBeDefined();
    expect(allRes.data.osdr).toBeDefined();
    expect(allRes.data.curiosity).toBeDefined();
    expect(Object.keys(allRes.errors).length).toBe(0);

    // Verify truth classification and values on loaded records
    expect(allRes.data.donki?.cmes[0].classification).toBe('DERIVED');
    expect(allRes.data.donki?.solarFlares[0].classification).toBe('REAL');
    expect(allRes.data.radlab?.records[0].classification).toBe('REAL');
    expect(allRes.data.osdr?.studies[0].classification).toBe('REAL');
    expect(allRes.data.curiosity?.datasets.gcrBaseline.classification).toBe('REAL');
    expect(allRes.data.curiosity?.datasets.gcrBaseline.doseEquivalentRate).toBe(0.64);
    expect(allRes.data.curiosity?.datasets.sol242SepEvent.classification).toBe('REAL');
    expect(allRes.data.curiosity?.datasets.sol242SepEvent.integratedExcessDoseEquivalent).toBe(0.05);
  });
});

