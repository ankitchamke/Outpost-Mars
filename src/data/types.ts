/**
 * OUTPOST: MARS — Science Data Models & Truth Taxonomy
 * Aligned with Phase 02 Technical Specifications and NASA Resource Verification
 */

// ============================================================================
// 1. Scientific Truth Classification & Source Provenance
// ============================================================================

/**
 * Three-tier scientific truth taxonomy enforced across the application.
 * - REAL: Direct empirical measurements from verified instruments or publications.
 * - DERIVED: Values calculated via verified physical, orbital, or physiological equations.
 * - GAME-SIMPLIFIED: Pedagogical abstractions or game-balance parameters.
 */
export type ScientificTruthClassification = 'REAL' | 'DERIVED' | 'GAME-SIMPLIFIED';

/**
 * Provenance tracking contract attached to every authentic scientific record.
 */
export interface SourceProvenance {
  /** Canonical URL to the data source or publication */
  sourceUrl: string;
  /** Unique dataset identifier, study accession, or event ID */
  datasetId: string;
  /** ISO-8601 date string when data was verified/retrieved (e.g., '2026-11-14') */
  retrievalDate: string;
  /** Instrument or detector that generated the telemetry */
  instrument?: string;
  /** Spatial/orbital location (e.g., 'Heliosphere', 'LEO (ISS)', 'Gale Crater') */
  location?: string;
  /** Temporal or mission context (e.g., 'Solar Cycle 25', 'First 300 Sols MSL') */
  timeContext?: string;
  /** Measurement methodology or analytical technique */
  methodology?: string;
  /** Known scientific constraints, caveats, or boundaries */
  limitations?: string;
}

/**
 * Base contract for all scientific records.
 */
export interface ScientificRecord {
  classification: ScientificTruthClassification;
  provenance: SourceProvenance;
}

// ============================================================================
// 2. NASA DONKI Models (Space Weather Database)
// ============================================================================

export type CmeClassificationType = 'S' | 'C' | 'O' | 'R' | 'ER';

export interface DonkiInstrument {
  displayName: string;
}

export interface DonkiLinkedEvent {
  activityId: string;
}

/**
 * Planetary shock impact prediction from WSA-ENLIL heliospheric simulations.
 */
export interface DonkiPlanetaryImpact {
  /** Target body name (e.g., 'Mars', 'Earth', 'Parker Solar Probe') */
  location: string;
  /** Predicted shock arrival timestamp (ISO-8601 UTC) */
  arrivalTime: string;
  /** Whether the impact is modeled as a glancing blow */
  isGlancingBlow: boolean;
  /** Whether the impact is modeled as minor */
  isMinorImpact: boolean;
}

/**
 * WSA-ENLIL solar wind and shock propagation simulation run.
 */
export interface DonkiEnlilSimulation {
  modelCompletionTime: string;
  au: number;
  estimatedShockArrivalTime: string | null;
  estimatedDurationHours: number | null;
  impactList: DonkiPlanetaryImpact[];
}

/**
 * CME geometric and kinematics analysis.
 */
export interface DonkiCmeAnalysis {
  isMostAccurate: boolean;
  time21_5: string; // Timestamp when shock front reached 21.5 solar radii
  latitude: number; // Heliographic latitude in degrees (-90 to 90)
  longitude: number; // Heliographic longitude in degrees (-180 to 180)
  halfAngle: number; // Angular half-width in degrees
  speed: number; // Initial propagation velocity
  speedUnit: 'km/s';
  type: CmeClassificationType | string;
  featureCode?: string;
  note?: string;
  enlilList?: DonkiEnlilSimulation[];
}

/**
 * Normalized Coronal Mass Ejection (CME) event record.
 */
export interface DonkiCmeRecord extends ScientificRecord {
  activityId: string; // e.g., '2024-05-10T07:12:00-CME-001'
  startTime: string; // ISO-8601 UTC
  sourceLocation: string; // e.g., 'S18W37'
  activeRegionNum: number | null;
  note?: string;
  instruments: DonkiInstrument[];
  analyses: DonkiCmeAnalysis[];
  linkedEvents?: DonkiLinkedEvent[];
}

/**
 * Normalized Solar Flare (FLR) event record.
 */
export interface DonkiSolarFlareRecord extends ScientificRecord {
  flareId: string; // e.g., '2024-05-10T06:27:00-FLR-001'
  beginTime: string; // ISO-8601 UTC
  peakTime: string; // ISO-8601 UTC
  endTime: string | null; // ISO-8601 UTC or null if ongoing
  classType: string; // NOAA GOES class (e.g., 'X3.9', 'M8.8', 'C1.2')
  fluxUnit: 'W/m^2' | 'class';
  sourceLocation: string;
  activeRegionNum: number | null;
  instruments: DonkiInstrument[];
  linkedEvents?: DonkiLinkedEvent[];
}

/**
 * Normalized Solar Energetic Particle (SEP) event record.
 */
export interface DonkiSepRecord extends ScientificRecord {
  sepId: string; // e.g., '2024-05-10T13:35:00-SEP-001'
  eventTime: string; // ISO-8601 UTC
  energyChannel: string; // e.g., '>10 MeV', '>100 MeV'
  instruments: DonkiInstrument[];
  linkedEvents?: DonkiLinkedEvent[];
}

/**
 * Bundled offline DONKI space-weather snapshot envelope.
 */
export interface DonkiSnapshot {
  schemaVersion: '1.0';
  generatedAt: string;
  source: 'NASA DONKI';
  cmes: DonkiCmeRecord[];
  solarFlares: DonkiSolarFlareRecord[];
  sepEvents: DonkiSepRecord[];
}

// ============================================================================
// 3. NASA RadLab Models (Radiation Telemetry API)
// ============================================================================

export type AbsorbedDoseRateUnit = 'uGy/h' | 'uGy/day' | 'mGy/day';
export type DoseEquivalentRateUnit = 'uSv/h' | 'uSv/day' | 'mSv/day';
export type ParticleFluxUnit = 'cm^-2 s^-1';

/**
 * Normalized radiation telemetry record from RadLab (e.g., ISS detectors).
 */
export interface RadLabObservationRecord extends ScientificRecord {
  observationId: string;
  timestamp: string; // ISO-8601 UTC
  spacecraft: string; // e.g., 'ISS'
  trajectory: 'LEO' | 'Surface' | 'BLEO' | string;
  instrument: string; // e.g., 'DosTel1', 'Liulin', 'TEPC'
  detectorId: string;
  module?: string; // Sub-spacecraft location e.g., 'US Lab'
  absorbedDoseRate: number;
  absorbedDoseRateUnit: AbsorbedDoseRateUnit;
  doseEquivalentRate?: number;
  doseEquivalentRateUnit?: DoseEquivalentRateUnit;
  flux?: number;
  fluxUnit?: ParticleFluxUnit;
  latitude?: number;
  longitude?: number;
  altitudeKm?: number;
  lShell?: number; // McIlwain L-shell parameter
}

/**
 * Bundled offline RadLab radiation telemetry snapshot envelope.
 */
export interface RadLabSnapshot {
  schemaVersion: '1.0';
  generatedAt: string;
  source: 'NASA OSDR RadLab';
  mission: string;
  records: RadLabObservationRecord[];
}

// ============================================================================
// 4. NASA OSDR Models (Open Science Data Repository)
// ============================================================================

export interface OsdrPublication {
  title: string;
  authors: string[];
  doi?: string;
  journal?: string;
  year?: number;
}

/**
 * Normalized spaceflight biological/health research study metadata record.
 */
export interface OsdrStudyRecord extends ScientificRecord {
  accession: string; // e.g., 'OSD-661', 'OSD-121'
  studyTitle: string;
  organism: string; // e.g., 'Mus musculus', 'Homo sapiens'
  studyPopulation: string; // Sample description/cohort
  materialType: string; // Target tissue (e.g., 'Lumbar Spine', 'Femur', 'Soleus')
  flightProgram: string; // e.g., 'International Space Station (ISS)'
  missionName?: string; // e.g., 'SpaceX-4 (RR-1)'
  exposureDurationDays?: number;
  experimentalConditions: string;
  assayType: string; // e.g., 'Dual-Energy X-Ray Absorptiometry (DXA)', 'microCT'
  measuredParameters: string[];
  keyFindings: string;
  publications: OsdrPublication[];
  limitations: string;
}

/**
 * Bundled offline OSDR biological study metadata snapshot envelope.
 */
export interface OsdrSnapshot {
  schemaVersion: '1.0';
  generatedAt: string;
  source: 'NASA OSDR';
  studies: OsdrStudyRecord[];
}

// ============================================================================
// 5. Validation & Loading Contracts
// ============================================================================

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: ValidationError[];
}
