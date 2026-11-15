import { describe, expect, it } from 'vitest';
import {
  validateClassification,
  validateCuriosityGcrBaseline,
  validateCuriosityLocation,
  validateCuriosityRadSnapshot,
  validateCuriositySol242Event,
  validateDonkiCmeRecord,
  validateDonkiSepRecord,
  validateDonkiSnapshot,
  validateDonkiSolarFlareRecord,
  validateOsdrSnapshot,
  validateOsdrStudyRecord,
  validateProvenance,
  validateRadLabObservationRecord,
  validateRadLabSnapshot,
} from '../../src/data/validation';
import {
  SYNTHETIC_PROVENANCE_FIXTURE,
  SYNTHETIC_VALID_CME_FIXTURE,
  SYNTHETIC_VALID_CURIOSITY_RAD_SNAPSHOT_FIXTURE,
  SYNTHETIC_VALID_DONKI_SNAPSHOT_FIXTURE,
  SYNTHETIC_VALID_FLARE_FIXTURE,
  SYNTHETIC_VALID_OSDR_SNAPSHOT_FIXTURE,
  SYNTHETIC_VALID_OSDR_STUDY_FIXTURE,
  SYNTHETIC_VALID_RADLAB_RECORD_FIXTURE,
  SYNTHETIC_VALID_RADLAB_SNAPSHOT_FIXTURE,
  SYNTHETIC_VALID_SEP_FIXTURE,
} from './fixtures';

describe('Scientific Truth Taxonomy & Provenance Validation', () => {
  it('accepts valid truth classifications: REAL, DERIVED, GAME-SIMPLIFIED', () => {
    const errors: Array<{ path: string; message: string }> = [];
    expect(validateClassification('REAL', 'test', errors)).toBe(true);
    expect(validateClassification('DERIVED', 'test', errors)).toBe(true);
    expect(validateClassification('GAME-SIMPLIFIED', 'test', errors)).toBe(true);
    expect(errors.length).toBe(0);
  });

  it('rejects invalid truth classifications', () => {
    const errors: Array<{ path: string; message: string }> = [];
    expect(validateClassification('HYPOTHETICAL', 'test.classification', errors)).toBe(false);
    expect(validateClassification('', 'test.classification', errors)).toBe(false);
    expect(validateClassification(123, 'test.classification', errors)).toBe(false);
    expect(errors.length).toBe(3);
    expect(errors[0].message).toContain('Expected \'REAL\', \'DERIVED\', or \'GAME-SIMPLIFIED\'');
  });

  it('validates a complete source provenance object', () => {
    const errors: Array<{ path: string; message: string }> = [];
    const res = validateProvenance(SYNTHETIC_PROVENANCE_FIXTURE, 'provenance', errors);
    expect(res).toBeDefined();
    expect(res?.sourceUrl).toBe(SYNTHETIC_PROVENANCE_FIXTURE.sourceUrl);
    expect(res?.datasetId).toBe(SYNTHETIC_PROVENANCE_FIXTURE.datasetId);
    expect(errors.length).toBe(0);
  });

  it('rejects provenance with non-http sourceUrl or missing datasetId', () => {
    const errors: Array<{ path: string; message: string }> = [];
    const invalidProv = {
      sourceUrl: 'ftp://not-allowed.org',
      datasetId: '',
      retrievalDate: 'invalid-date',
    };
    const res = validateProvenance(invalidProv, 'provenance', errors);
    expect(res).toBeUndefined();
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('NASA DONKI Validation', () => {
  it('validates a complete valid CME record with WSA-ENLIL Mars impact', () => {
    const res = validateDonkiCmeRecord(SYNTHETIC_VALID_CME_FIXTURE);
    expect(res.success).toBe(true);
    expect(res.data?.activityId).toBe('2024-05-10T07:12:00-CME-TEST-001');
    expect(res.data?.analyses[0].enlilList?.[0].impactList[0].location).toBe('Mars');
    expect(res.data?.analyses[0].speedUnit).toBe('km/s');
    expect(res.errors.length).toBe(0);
  });

  it('validates CME with optional fields omitted (null activeRegionNum, no enlilList)', () => {
    const minimalCme = {
      classification: 'DERIVED',
      provenance: SYNTHETIC_PROVENANCE_FIXTURE,
      activityId: '2024-05-10T07:12:00-CME-TEST-MINIMAL',
      startTime: '2024-05-10T07:12:00Z',
      sourceLocation: 'N10W20',
      activeRegionNum: null,
      instruments: [{ displayName: 'SOHO: LASCO/C2' }],
      analyses: [
        {
          isMostAccurate: true,
          time21_5: '2024-05-10T10:00:00Z',
          latitude: 0,
          longitude: 0,
          halfAngle: 30,
          speed: 600,
          speedUnit: 'km/s',
          type: 'C',
        },
      ],
    };
    const res = validateDonkiCmeRecord(minimalCme);
    expect(res.success).toBe(true);
    expect(res.data?.note).toBeUndefined();
    expect(res.data?.analyses[0].enlilList).toBeUndefined();
    expect(res.data?.activeRegionNum).toBeNull();
  });

  it('rejects CME with invalid speedUnit (unit preservation check)', () => {
    const badCme = {
      ...SYNTHETIC_VALID_CME_FIXTURE,
      analyses: [
        {
          ...SYNTHETIC_VALID_CME_FIXTURE.analyses[0],
          speedUnit: 'miles_per_hour',
        },
      ],
    };
    const res = validateDonkiCmeRecord(badCme);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.path.includes('speedUnit'))).toBe(true);
  });

  it('rejects CME with negative speed', () => {
    const badCme = {
      ...SYNTHETIC_VALID_CME_FIXTURE,
      analyses: [
        {
          ...SYNTHETIC_VALID_CME_FIXTURE.analyses[0],
          speed: -500,
        },
      ],
    };
    const res = validateDonkiCmeRecord(badCme);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.path.includes('speed'))).toBe(true);
  });

  it('validates a complete Solar Flare record', () => {
    const res = validateDonkiSolarFlareRecord(SYNTHETIC_VALID_FLARE_FIXTURE);
    expect(res.success).toBe(true);
    expect(res.data?.classType).toBe('X3.9');
    expect(res.data?.fluxUnit).toBe('W/m^2');
  });

  it('validates Solar Flare with ongoing null endTime and class fluxUnit', () => {
    const ongoingFlare = {
      ...SYNTHETIC_VALID_FLARE_FIXTURE,
      endTime: null,
      fluxUnit: 'class',
    };
    const res = validateDonkiSolarFlareRecord(ongoingFlare);
    expect(res.success).toBe(true);
    expect(res.data?.endTime).toBeNull();
    expect(res.data?.fluxUnit).toBe('class');
  });

  it('rejects Solar Flare with invalid fluxUnit', () => {
    const badFlare = {
      ...SYNTHETIC_VALID_FLARE_FIXTURE,
      fluxUnit: 'joules',
    };
    const res = validateDonkiSolarFlareRecord(badFlare);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.path.includes('fluxUnit'))).toBe(true);
  });

  it('validates a complete Solar Energetic Particle (SEP) record', () => {
    const res = validateDonkiSepRecord(SYNTHETIC_VALID_SEP_FIXTURE);
    expect(res.success).toBe(true);
    expect(res.data?.energyChannel).toBe('>10 MeV');
  });

  it('validates a full DONKI snapshot', () => {
    const res = validateDonkiSnapshot(SYNTHETIC_VALID_DONKI_SNAPSHOT_FIXTURE);
    expect(res.success).toBe(true);
    expect(res.data?.cmes.length).toBe(1);
    expect(res.data?.solarFlares.length).toBe(1);
    expect(res.data?.sepEvents.length).toBe(1);
  });

  it('rejects an empty DONKI snapshot with zero records', () => {
    const emptySnapshot = {
      schemaVersion: '1.0',
      generatedAt: '2026-11-14T12:00:00Z',
      source: 'NASA DONKI',
      cmes: [],
      solarFlares: [],
      sepEvents: [],
    };
    const res = validateDonkiSnapshot(emptySnapshot);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.message.includes('cannot be completely empty'))).toBe(true);
  });

  it('rejects a DONKI snapshot with incorrect schemaVersion or source', () => {
    const badSnapshot = {
      ...SYNTHETIC_VALID_DONKI_SNAPSHOT_FIXTURE,
      schemaVersion: '2.0',
      source: 'UNKNOWN_PROVIDER',
    };
    const res = validateDonkiSnapshot(badSnapshot);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.path.includes('schemaVersion'))).toBe(true);
    expect(res.errors.some((e) => e.path.includes('source'))).toBe(true);
  });
});

describe('NASA RadLab Validation', () => {
  it('validates a complete RadLab observation record', () => {
    const res = validateRadLabObservationRecord(SYNTHETIC_VALID_RADLAB_RECORD_FIXTURE);
    expect(res.success).toBe(true);
    expect(res.data?.spacecraft).toBe('ISS');
    expect(res.data?.absorbedDoseRate).toBe(245.5);
    expect(res.data?.absorbedDoseRateUnit).toBe('uGy/day');
    expect(res.data?.doseEquivalentRateUnit).toBe('uSv/day');
    expect(res.data?.fluxUnit).toBe('cm^-2 s^-1');
  });

  it('validates RadLab observation with optional orbital fields omitted', () => {
    const minimalRadLab = {
      classification: 'REAL',
      provenance: SYNTHETIC_VALID_RADLAB_RECORD_FIXTURE.provenance,
      observationId: 'RADLAB-TEST-MINIMAL-001',
      timestamp: '2009-07-31T07:30:05Z',
      spacecraft: 'ISS',
      trajectory: 'LEO',
      instrument: 'DosTel1',
      detectorId: 'Det1',
      absorbedDoseRate: 10.5,
      absorbedDoseRateUnit: 'uGy/h',
    };
    const res = validateRadLabObservationRecord(minimalRadLab);
    expect(res.success).toBe(true);
    expect(res.data?.doseEquivalentRate).toBeUndefined();
    expect(res.data?.flux).toBeUndefined();
    expect(res.data?.latitude).toBeUndefined();
  });

  it('rejects RadLab observation with invalid dose unit (unit preservation)', () => {
    const badRadLab = {
      ...SYNTHETIC_VALID_RADLAB_RECORD_FIXTURE,
      absorbedDoseRateUnit: 'rads_per_sec',
    };
    const res = validateRadLabObservationRecord(badRadLab);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.path.includes('absorbedDoseRateUnit'))).toBe(true);
  });

  it('rejects RadLab observation with negative absorbedDoseRate', () => {
    const badRadLab = {
      ...SYNTHETIC_VALID_RADLAB_RECORD_FIXTURE,
      absorbedDoseRate: -15,
    };
    const res = validateRadLabObservationRecord(badRadLab);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.path.includes('absorbedDoseRate'))).toBe(true);
  });

  it('validates a complete RadLab snapshot', () => {
    const res = validateRadLabSnapshot(SYNTHETIC_VALID_RADLAB_SNAPSHOT_FIXTURE);
    expect(res.success).toBe(true);
    expect(res.data?.records.length).toBe(1);
    expect(res.data?.source).toBe('NASA OSDR RadLab');
  });

  it('SEC-01: rejects RadLab observation where ISS spacecraft claims surface/Mars trajectory', () => {
    const invalidIssSurface = {
      ...SYNTHETIC_VALID_RADLAB_RECORD_FIXTURE,
      spacecraft: 'ISS',
      trajectory: 'Surface',
    };
    const res = validateRadLabObservationRecord(invalidIssSurface);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.path.includes('trajectory'))).toBe(true);
    expect(res.errors.some((e) => e.message.includes('ISS/LEO observations cannot have a surface or Mars trajectory'))).toBe(true);
  });

  it('SEC-01: rejects RadLab observation where ISS/LEO claims Mars surface in provenance location', () => {
    const invalidIssLocation = {
      ...SYNTHETIC_VALID_RADLAB_RECORD_FIXTURE,
      spacecraft: 'ISS',
      trajectory: 'LEO',
      provenance: {
        ...SYNTHETIC_VALID_RADLAB_RECORD_FIXTURE.provenance,
        location: 'Mars Surface (Gale Crater)',
      },
    };
    const res = validateRadLabObservationRecord(invalidIssLocation);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.path.includes('provenance.location'))).toBe(true);
    expect(res.errors.some((e) => e.message.includes('ISS/LEO observations cannot claim Mars surface location'))).toBe(true);
  });

  it('rejects an empty RadLab snapshot with zero records', () => {
    const emptyRadLab = {
      schemaVersion: '1.0',
      generatedAt: '2026-11-14T12:00:00Z',
      source: 'NASA OSDR RadLab',
      mission: 'Test-Mission',
      records: [],
    };
    const res = validateRadLabSnapshot(emptyRadLab);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.message.includes('must not be empty'))).toBe(true);
  });
});

describe('NASA OSDR Validation', () => {
  it('validates a complete OSDR biological study record', () => {
    const res = validateOsdrStudyRecord(SYNTHETIC_VALID_OSDR_STUDY_FIXTURE);
    expect(res.success).toBe(true);
    expect(res.data?.accession).toBe('OSD-661');
    expect(res.data?.organism).toBe('Mus musculus');
    expect(res.data?.materialType).toBe('Lumbar Spine');
    expect(res.data?.publications[0].doi).toBe('10.1016/j.isci.2023.107047');
    expect(res.data?.limitations).toContain('0g LEO');
  });

  it('validates OSDR study record with optional fields omitted', () => {
    const minimalStudy = {
      classification: 'REAL',
      provenance: SYNTHETIC_VALID_OSDR_STUDY_FIXTURE.provenance,
      accession: 'OSD-121',
      studyTitle: 'Site-specific bone degradation in microgravity',
      organism: 'Mus musculus',
      studyPopulation: 'Female mice',
      materialType: 'Lumbar 4',
      flightProgram: 'ISS',
      experimentalConditions: 'Microgravity 37 days',
      assayType: 'microCT',
      measuredParameters: ['Bone volume / total volume'],
      keyFindings: 'Site-specific bone degradation confirmed in weight-bearing lumbar spine.',
      publications: [
        {
          title: 'ASGSR 2016 Meeting Abstract',
          authors: ['NASA Ames ARC Team'],
        },
      ],
      limitations: 'Rodent model, 0g environment.',
    };
    const res = validateOsdrStudyRecord(minimalStudy);
    expect(res.success).toBe(true);
    expect(res.data?.missionName).toBeUndefined();
    expect(res.data?.exposureDurationDays).toBeUndefined();
    expect(res.data?.publications[0].doi).toBeUndefined();
  });

  it('rejects OSDR study record with missing required studyTitle', () => {
    const badStudy = {
      ...SYNTHETIC_VALID_OSDR_STUDY_FIXTURE,
      studyTitle: '',
    };
    const res = validateOsdrStudyRecord(badStudy);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.path.includes('studyTitle'))).toBe(true);
  });

  it('rejects OSDR study record with empty measuredParameters array', () => {
    const badStudy = {
      ...SYNTHETIC_VALID_OSDR_STUDY_FIXTURE,
      measuredParameters: [],
    };
    const res = validateOsdrStudyRecord(badStudy);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.path.includes('measuredParameters'))).toBe(true);
  });

  it('validates a complete OSDR snapshot', () => {
    const res = validateOsdrSnapshot(SYNTHETIC_VALID_OSDR_SNAPSHOT_FIXTURE);
    expect(res.success).toBe(true);
    expect(res.data?.studies.length).toBe(1);
    expect(res.data?.source).toBe('NASA OSDR');
  });

  it('rejects an empty OSDR snapshot with zero studies', () => {
    const emptyOsdr = {
      schemaVersion: '1.0',
      generatedAt: '2026-11-14T12:00:00Z',
      source: 'NASA OSDR',
      studies: [],
    };
    const res = validateOsdrSnapshot(emptyOsdr);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.message.includes('must not be empty'))).toBe(true);
  });
});

describe('NASA Curiosity RAD Surface Dosimetry Validation', () => {
  it('validates a complete Curiosity RAD snapshot with empirical Gale Crater data', () => {
    const res = validateCuriosityRadSnapshot(SYNTHETIC_VALID_CURIOSITY_RAD_SNAPSHOT_FIXTURE);
    expect(res.success).toBe(true);
    expect(res.data?.location.body).toBe('Mars');
    expect(res.data?.location.region).toBe('Gale Crater');
    expect(res.data?.datasets.gcrBaseline.doseEquivalentRate).toBe(0.64);
    expect(res.data?.datasets.gcrBaseline.doseEquivalentRateUnit).toBe('mSv/day');
    expect(res.data?.datasets.sol242SepEvent.integratedExcessDoseEquivalent).toBe(0.05);
    expect(res.data?.datasets.sol242SepEvent.peakAbsorbedDoseRate).toBe(260);
  });

  it('validates Curiosity location and rejects non-Mars body', () => {
    const locRes = validateCuriosityLocation(SYNTHETIC_VALID_CURIOSITY_RAD_SNAPSHOT_FIXTURE.location);
    expect(locRes.success).toBe(true);
    expect(locRes.data?.body).toBe('Mars');

    const earthLoc = {
      ...SYNTHETIC_VALID_CURIOSITY_RAD_SNAPSHOT_FIXTURE.location,
      body: 'Earth',
    };
    const badRes = validateCuriosityLocation(earthLoc);
    expect(badRes.success).toBe(false);
    expect(badRes.errors[0].message).toContain("Expected body 'Mars'");
  });

  it('validates GCR baseline units and rejects invalid units', () => {
    const validGcr = SYNTHETIC_VALID_CURIOSITY_RAD_SNAPSHOT_FIXTURE.datasets.gcrBaseline;
    const res = validateCuriosityGcrBaseline(validGcr);
    expect(res.success).toBe(true);

    const badUnits = {
      ...validGcr,
      doseEquivalentRateUnit: 'uSv/h',
    };
    const badRes = validateCuriosityGcrBaseline(badUnits);
    expect(badRes.success).toBe(false);
    expect(badRes.errors.some((e) => e.path.includes('doseEquivalentRateUnit'))).toBe(true);
  });

  it('validates Sol 242 event and rejects invalid units or negative rates', () => {
    const validSol = SYNTHETIC_VALID_CURIOSITY_RAD_SNAPSHOT_FIXTURE.datasets.sol242SepEvent;
    const res = validateCuriositySol242Event(validSol);
    expect(res.success).toBe(true);

    const badRate = {
      ...validSol,
      peakAbsorbedDoseRate: -10,
    };
    const badRes = validateCuriositySol242Event(badRate);
    expect(badRes.success).toBe(false);
    expect(badRes.errors.some((e) => e.path.includes('peakAbsorbedDoseRate'))).toBe(true);
  });

  it('guards against synthetic game simulation values or training scenarios inside empirical snapshot', () => {
    const syntheticSnapshot = {
      ...SYNTHETIC_VALID_CURIOSITY_RAD_SNAPSHOT_FIXTURE,
      datasets: {
        ...SYNTHETIC_VALID_CURIOSITY_RAD_SNAPSHOT_FIXTURE.datasets,
        gcrBaseline: {
          ...SYNTHETIC_VALID_CURIOSITY_RAD_SNAPSHOT_FIXTURE.datasets.gcrBaseline,
          trainingScenario: 'Emergency drill +50 mSv dose',
        },
      },
    };
    const res = validateCuriosityRadSnapshot(syntheticSnapshot);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.message.includes('synthetic game values or training scenarios'))).toBe(true);
  });

  it('rejects Curiosity RAD snapshot when spacecraft does not identify Curiosity / MSL', () => {
    const alienSpacecraft = {
      ...SYNTHETIC_VALID_CURIOSITY_RAD_SNAPSHOT_FIXTURE,
      spacecraft: 'Voyager 1',
    };
    const res = validateCuriosityRadSnapshot(alienSpacecraft);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.path.includes('spacecraft'))).toBe(true);
  });
});
