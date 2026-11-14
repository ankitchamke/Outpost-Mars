/**
 * SYNTHETIC TEST FIXTURES FOR SCIENTIFIC DATA TESTING
 * 
 * IMPORTANT:
 * All records in this file are SYNTHETIC TEST FIXTURES designed exclusively
 * for unit testing validators and snapshot loaders.
 * None of the entries in this file represent actual empirical NASA observations.
 */

import {
  DonkiCmeRecord,
  DonkiSepRecord,
  DonkiSnapshot,
  DonkiSolarFlareRecord,
  OsdrSnapshot,
  OsdrStudyRecord,
  RadLabObservationRecord,
  RadLabSnapshot,
  SourceProvenance,
} from '../../src/data/types';

export const SYNTHETIC_PROVENANCE_FIXTURE: SourceProvenance = {
  sourceUrl: 'https://ccmc.gsfc.nasa.gov/DONKI/test-fixture',
  datasetId: 'TEST_FIXTURE_SYNTHETIC_DATASET_001',
  retrievalDate: '2026-11-14T00:00:00Z',
  instrument: 'Synthetic Test Detector',
  location: 'Heliosphere Test Coordinate',
  timeContext: 'Synthetic Test Epoch',
  methodology: 'Automated unit test simulation data',
  limitations: 'Synthetic test fixture only; not real space observation',
};

export const SYNTHETIC_VALID_CME_FIXTURE: DonkiCmeRecord = {
  classification: 'REAL',
  provenance: SYNTHETIC_PROVENANCE_FIXTURE,
  activityId: '2024-05-10T07:12:00-CME-TEST-001',
  startTime: '2024-05-10T07:12:00Z',
  sourceLocation: 'S18W37',
  activeRegionNum: 13664,
  note: 'Synthetic CME test fixture representing a halo event',
  instruments: [{ displayName: 'SOHO: LASCO/C3' }],
  analyses: [
    {
      isMostAccurate: true,
      time21_5: '2024-05-10T10:35:00Z',
      latitude: -2.0,
      longitude: 31.0,
      halfAngle: 41.0,
      speed: 1018.0,
      speedUnit: 'km/s',
      type: 'O',
      featureCode: 'LE',
      enlilList: [
        {
          modelCompletionTime: '2024-05-10T13:19:00Z',
          au: 2.0,
          estimatedShockArrivalTime: '2024-05-12T14:00:00Z',
          estimatedDurationHours: 24.7,
          impactList: [
            {
              location: 'Mars',
              arrivalTime: '2024-05-15T22:00:00Z',
              isGlancingBlow: true,
              isMinorImpact: false,
            },
          ],
        },
      ],
    },
  ],
  linkedEvents: [{ activityId: '2024-05-10T06:27:00-FLR-TEST-001' }],
};

export const SYNTHETIC_VALID_FLARE_FIXTURE: DonkiSolarFlareRecord = {
  classification: 'REAL',
  provenance: SYNTHETIC_PROVENANCE_FIXTURE,
  flareId: '2024-05-10T06:27:00-FLR-TEST-001',
  beginTime: '2024-05-10T06:27:00Z',
  peakTime: '2024-05-10T06:54:00Z',
  endTime: '2024-05-10T07:06:00Z',
  classType: 'X3.9',
  fluxUnit: 'W/m^2',
  sourceLocation: 'S18W37',
  activeRegionNum: 13664,
  instruments: [{ displayName: 'GOES-P: EXIS 1.0-8.0' }],
  linkedEvents: [{ activityId: '2024-05-10T07:12:00-CME-TEST-001' }],
};

export const SYNTHETIC_VALID_SEP_FIXTURE: DonkiSepRecord = {
  classification: 'REAL',
  provenance: SYNTHETIC_PROVENANCE_FIXTURE,
  sepId: '2024-05-10T13:35:00-SEP-TEST-001',
  eventTime: '2024-05-10T13:35:00Z',
  energyChannel: '>10 MeV',
  instruments: [{ displayName: 'GOES-P: SEISS >10 MeV' }],
  linkedEvents: [{ activityId: '2024-05-10T06:27:00-FLR-TEST-001' }],
};

export const SYNTHETIC_VALID_DONKI_SNAPSHOT_FIXTURE: DonkiSnapshot = {
  schemaVersion: '1.0',
  generatedAt: '2026-11-14T12:00:00Z',
  source: 'NASA DONKI',
  cmes: [SYNTHETIC_VALID_CME_FIXTURE],
  solarFlares: [SYNTHETIC_VALID_FLARE_FIXTURE],
  sepEvents: [SYNTHETIC_VALID_SEP_FIXTURE],
};

export const SYNTHETIC_VALID_RADLAB_RECORD_FIXTURE: RadLabObservationRecord = {
  classification: 'REAL',
  provenance: {
    sourceUrl: 'https://visualization.osdr.nasa.gov/radlab/api/',
    datasetId: 'TEST_FIXTURE_RADLAB_001',
    retrievalDate: '2026-11-14T00:00:00Z',
    instrument: 'DosTel1',
    location: 'LEO (ISS)',
    limitations: 'LEO orbit data; must never be equated with Mars surface measurements',
  },
  observationId: 'RADLAB-TEST-OBS-001',
  timestamp: '2009-07-31T07:30:05Z',
  spacecraft: 'ISS',
  trajectory: 'LEO',
  instrument: 'DosTel1',
  detectorId: 'DosTel1-DetA',
  module: 'Columbus',
  absorbedDoseRate: 245.5,
  absorbedDoseRateUnit: 'uGy/day',
  doseEquivalentRate: 750.2,
  doseEquivalentRateUnit: 'uSv/day',
  flux: 1.42,
  fluxUnit: 'cm^-2 s^-1',
  latitude: 25.4,
  longitude: -80.2,
  altitudeKm: 405.2,
  lShell: 1.15,
};

export const SYNTHETIC_VALID_RADLAB_SNAPSHOT_FIXTURE: RadLabSnapshot = {
  schemaVersion: '1.0',
  generatedAt: '2026-11-14T12:00:00Z',
  source: 'NASA OSDR RadLab',
  mission: 'ISS-Expedition-20-Synthetic',
  records: [SYNTHETIC_VALID_RADLAB_RECORD_FIXTURE],
};

export const SYNTHETIC_VALID_OSDR_STUDY_FIXTURE: OsdrStudyRecord = {
  classification: 'REAL',
  provenance: {
    sourceUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/661',
    datasetId: 'TEST_FIXTURE_OSDR_OSD-661',
    retrievalDate: '2026-11-14T00:00:00Z',
    location: 'ISS & Ground Control',
    limitations: 'Rodent model in microgravity 0g; partial 0.38g gravity adaptation unverified on humans',
  },
  accession: 'OSD-661',
  studyTitle: 'Toward countering muscle and bone loss with spaceflight: GSK3 as a potential target',
  organism: 'Mus musculus',
  studyPopulation: 'Female C57BL/6J mice',
  materialType: 'Lumbar Spine',
  flightProgram: 'International Space Station (ISS)',
  missionName: 'SpaceX-4 (RR-1)',
  exposureDurationDays: 37,
  experimentalConditions: 'Microgravity spaceflight vs ground vivarium and hindlimb unloading',
  assayType: 'Dual-Energy X-Ray Absorptiometry (DXA)',
  measuredParameters: ['Bone Mineral Density (BMD)', 'Bone Mineral Content (BMC)'],
  keyFindings: 'Spaceflight induced site-specific loss in lumbar spine bone density; resistance target counteracts loss.',
  publications: [
    {
      title: 'Toward countering muscle and bone loss with spaceflight',
      authors: ['Baranowski RW', 'Braun JL', 'Fajardo VA'],
      doi: '10.1016/j.isci.2023.107047',
      year: 2023,
    },
  ],
  limitations: 'Tested in 0g LEO; partial 0.38g Mars adaptation is unverified on humans.',
};

export const SYNTHETIC_VALID_OSDR_SNAPSHOT_FIXTURE: OsdrSnapshot = {
  schemaVersion: '1.0',
  generatedAt: '2026-11-14T12:00:00Z',
  source: 'NASA OSDR',
  studies: [SYNTHETIC_VALID_OSDR_STUDY_FIXTURE],
};
