/**
 * OUTPOST: MARS — Runtime Scientific Data Validation
 * Enforces strict scientific contracts, units, provenance, and truth taxonomy.
 */

import {
  AbsorbedDoseRateUnit,
  CmeClassificationType,
  DonkiCmeAnalysis,
  DonkiCmeRecord,
  DonkiEnlilSimulation,
  DonkiInstrument,
  DonkiLinkedEvent,
  DonkiPlanetaryImpact,
  DonkiSepRecord,
  DonkiSnapshot,
  DonkiSolarFlareRecord,
  DoseEquivalentRateUnit,
  OsdrPublication,
  OsdrSnapshot,
  OsdrStudyRecord,
  ParticleFluxUnit,
  RadLabObservationRecord,
  RadLabSnapshot,
  ScientificTruthClassification,
  SourceProvenance,
  ValidationError,
  ValidationResult,
} from './types';

// ============================================================================
// Low-Level Primitives & Validation Helpers
// ============================================================================

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateString(
  value: unknown,
  path: string,
  errors: ValidationError[],
  options: { allowEmpty?: boolean } = {}
): value is string {
  if (typeof value !== 'string') {
    errors.push({ path, message: `Expected string, received ${typeof value}`, value });
    return false;
  }
  if (!options.allowEmpty && value.trim().length === 0) {
    errors.push({ path, message: `String must not be empty`, value });
    return false;
  }
  return true;
}

export function validateNumber(
  value: unknown,
  path: string,
  errors: ValidationError[],
  options: { min?: number; max?: number } = {}
): value is number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    errors.push({ path, message: `Expected valid finite number, received ${String(value)}`, value });
    return false;
  }
  if (options.min !== undefined && value < options.min) {
    errors.push({ path, message: `Value ${value} is less than minimum allowed ${options.min}`, value });
    return false;
  }
  if (options.max !== undefined && value > options.max) {
    errors.push({ path, message: `Value ${value} is greater than maximum allowed ${options.max}`, value });
    return false;
  }
  return true;
}

export function validateTimestamp(value: unknown, path: string, errors: ValidationError[]): value is string {
  if (!validateString(value, path, errors, { allowEmpty: false })) {
    return false;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    errors.push({ path, message: `Invalid ISO-8601 timestamp string: '${value}'`, value });
    return false;
  }
  return true;
}

export function validateBoolean(value: unknown, path: string, errors: ValidationError[]): value is boolean {
  if (typeof value !== 'boolean') {
    errors.push({ path, message: `Expected boolean, received ${typeof value}`, value });
    return false;
  }
  return true;
}

// ============================================================================
// Scientific Truth Classification & Source Provenance
// ============================================================================

const VALID_CLASSIFICATIONS: Set<ScientificTruthClassification> = new Set([
  'REAL',
  'DERIVED',
  'GAME-SIMPLIFIED',
]);

export function validateClassification(
  value: unknown,
  path: string,
  errors: ValidationError[]
): value is ScientificTruthClassification {
  if (typeof value !== 'string' || !VALID_CLASSIFICATIONS.has(value as ScientificTruthClassification)) {
    errors.push({
      path,
      message: `Invalid scientific truth classification: '${String(value)}'. Expected 'REAL', 'DERIVED', or 'GAME-SIMPLIFIED'.`,
      value,
    });
    return false;
  }
  return true;
}

export function validateProvenance(
  value: unknown,
  path: string,
  errors: ValidationError[]
): SourceProvenance | undefined {
  if (!isObject(value)) {
    errors.push({ path, message: `Expected provenance object, received ${typeof value}`, value });
    return undefined;
  }

  let valid = true;
  const pSourceUrl = `${path}.sourceUrl`;
  const pDatasetId = `${path}.datasetId`;
  const pRetrievalDate = `${path}.retrievalDate`;

  if (!validateString(value.sourceUrl, pSourceUrl, errors, { allowEmpty: false })) {
    valid = false;
  } else if (!value.sourceUrl.startsWith('http://') && !value.sourceUrl.startsWith('https://')) {
    errors.push({ path: pSourceUrl, message: `Source URL must start with http:// or https://: '${value.sourceUrl}'`, value: value.sourceUrl });
    valid = false;
  }

  if (!validateString(value.datasetId, pDatasetId, errors, { allowEmpty: false })) {
    valid = false;
  }

  if (!validateTimestamp(value.retrievalDate, pRetrievalDate, errors)) {
    valid = false;
  }

  // Optional string fields
  if (value.instrument !== undefined && !validateString(value.instrument, `${path}.instrument`, errors)) {
    valid = false;
  }
  if (value.location !== undefined && !validateString(value.location, `${path}.location`, errors)) {
    valid = false;
  }
  if (value.timeContext !== undefined && !validateString(value.timeContext, `${path}.timeContext`, errors)) {
    valid = false;
  }
  if (value.methodology !== undefined && !validateString(value.methodology, `${path}.methodology`, errors)) {
    valid = false;
  }
  if (value.limitations !== undefined && !validateString(value.limitations, `${path}.limitations`, errors)) {
    valid = false;
  }

  if (!valid) return undefined;

  return {
    sourceUrl: value.sourceUrl as string,
    datasetId: value.datasetId as string,
    retrievalDate: value.retrievalDate as string,
    instrument: value.instrument as string | undefined,
    location: value.location as string | undefined,
    timeContext: value.timeContext as string | undefined,
    methodology: value.methodology as string | undefined,
    limitations: value.limitations as string | undefined,
  };
}

// ============================================================================
// NASA DONKI Validation
// ============================================================================

export function validateDonkiInstrument(
  value: unknown,
  path: string,
  errors: ValidationError[]
): DonkiInstrument | undefined {
  if (!isObject(value)) {
    errors.push({ path, message: `Expected instrument object, received ${typeof value}`, value });
    return undefined;
  }
  if (!validateString(value.displayName, `${path}.displayName`, errors, { allowEmpty: false })) {
    return undefined;
  }
  return { displayName: value.displayName as string };
}

export function validateDonkiPlanetaryImpact(
  value: unknown,
  path: string,
  errors: ValidationError[]
): DonkiPlanetaryImpact | undefined {
  if (!isObject(value)) {
    errors.push({ path, message: `Expected planetary impact object, received ${typeof value}`, value });
    return undefined;
  }

  let valid = true;
  if (!validateString(value.location, `${path}.location`, errors, { allowEmpty: false })) valid = false;
  if (!validateTimestamp(value.arrivalTime, `${path}.arrivalTime`, errors)) valid = false;
  if (!validateBoolean(value.isGlancingBlow, `${path}.isGlancingBlow`, errors)) valid = false;
  if (!validateBoolean(value.isMinorImpact, `${path}.isMinorImpact`, errors)) valid = false;

  if (!valid) return undefined;
  return {
    location: value.location as string,
    arrivalTime: value.arrivalTime as string,
    isGlancingBlow: value.isGlancingBlow as boolean,
    isMinorImpact: value.isMinorImpact as boolean,
  };
}

export function validateDonkiEnlilSimulation(
  value: unknown,
  path: string,
  errors: ValidationError[]
): DonkiEnlilSimulation | undefined {
  if (!isObject(value)) {
    errors.push({ path, message: `Expected ENLIL simulation object, received ${typeof value}`, value });
    return undefined;
  }

  let valid = true;
  if (!validateTimestamp(value.modelCompletionTime, `${path}.modelCompletionTime`, errors)) valid = false;
  if (!validateNumber(value.au, `${path}.au`, errors, { min: 0 })) valid = false;

  if (value.estimatedShockArrivalTime !== null && value.estimatedShockArrivalTime !== undefined) {
    if (!validateTimestamp(value.estimatedShockArrivalTime, `${path}.estimatedShockArrivalTime`, errors)) valid = false;
  }

  if (value.estimatedDurationHours !== null && value.estimatedDurationHours !== undefined) {
    if (!validateNumber(value.estimatedDurationHours, `${path}.estimatedDurationHours`, errors, { min: 0 })) valid = false;
  }

  const impacts: DonkiPlanetaryImpact[] = [];
  if (value.impactList !== undefined) {
    if (!Array.isArray(value.impactList)) {
      errors.push({ path: `${path}.impactList`, message: `impactList must be an array`, value: value.impactList });
      valid = false;
    } else {
      value.impactList.forEach((imp, i) => {
        const validated = validateDonkiPlanetaryImpact(imp, `${path}.impactList[${i}]`, errors);
        if (validated) impacts.push(validated);
        else valid = false;
      });
    }
  }

  if (!valid) return undefined;
  return {
    modelCompletionTime: value.modelCompletionTime as string,
    au: value.au as number,
    estimatedShockArrivalTime: (value.estimatedShockArrivalTime as string | null) ?? null,
    estimatedDurationHours: (value.estimatedDurationHours as number | null) ?? null,
    impactList: impacts,
  };
}

export function validateDonkiCmeAnalysis(
  value: unknown,
  path: string,
  errors: ValidationError[]
): DonkiCmeAnalysis | undefined {
  if (!isObject(value)) {
    errors.push({ path, message: `Expected CME analysis object, received ${typeof value}`, value });
    return undefined;
  }

  let valid = true;
  if (!validateBoolean(value.isMostAccurate, `${path}.isMostAccurate`, errors)) valid = false;
  if (!validateTimestamp(value.time21_5, `${path}.time21_5`, errors)) valid = false;
  if (!validateNumber(value.latitude, `${path}.latitude`, errors, { min: -90, max: 90 })) valid = false;
  if (!validateNumber(value.longitude, `${path}.longitude`, errors, { min: -180, max: 180 })) valid = false;
  if (!validateNumber(value.halfAngle, `${path}.halfAngle`, errors, { min: 0, max: 180 })) valid = false;
  if (!validateNumber(value.speed, `${path}.speed`, errors, { min: 0 })) valid = false;

  if (value.speedUnit !== 'km/s') {
    errors.push({ path: `${path}.speedUnit`, message: `speedUnit must be exactly 'km/s', received '${String(value.speedUnit)}'`, value: value.speedUnit });
    valid = false;
  }

  if (!validateString(value.type, `${path}.type`, errors, { allowEmpty: false })) valid = false;

  if (value.featureCode !== undefined && !validateString(value.featureCode, `${path}.featureCode`, errors)) valid = false;
  if (value.note !== undefined && !validateString(value.note, `${path}.note`, errors, { allowEmpty: true })) valid = false;

  const enlilList: DonkiEnlilSimulation[] = [];
  if (value.enlilList !== undefined) {
    if (!Array.isArray(value.enlilList)) {
      errors.push({ path: `${path}.enlilList`, message: `enlilList must be an array`, value: value.enlilList });
      valid = false;
    } else {
      value.enlilList.forEach((enl, i) => {
        const validated = validateDonkiEnlilSimulation(enl, `${path}.enlilList[${i}]`, errors);
        if (validated) enlilList.push(validated);
        else valid = false;
      });
    }
  }

  if (!valid) return undefined;
  return {
    isMostAccurate: value.isMostAccurate as boolean,
    time21_5: value.time21_5 as string,
    latitude: value.latitude as number,
    longitude: value.longitude as number,
    halfAngle: value.halfAngle as number,
    speed: value.speed as number,
    speedUnit: 'km/s',
    type: value.type as CmeClassificationType | string,
    featureCode: value.featureCode as string | undefined,
    note: value.note as string | undefined,
    enlilList: enlilList.length > 0 ? enlilList : undefined,
  };
}

export function validateDonkiCmeRecord(
  value: unknown,
  path = 'cmeRecord'
): ValidationResult<DonkiCmeRecord> {
  const errors: ValidationError[] = [];
  if (!isObject(value)) {
    return { success: false, errors: [{ path, message: `Expected CME object, received ${typeof value}`, value }] };
  }

  let valid = true;
  if (!validateClassification(value.classification, `${path}.classification`, errors)) valid = false;
  const provenance = validateProvenance(value.provenance, `${path}.provenance`, errors);
  if (!provenance) valid = false;

  if (!validateString(value.activityId, `${path}.activityId`, errors, { allowEmpty: false })) valid = false;
  if (!validateTimestamp(value.startTime, `${path}.startTime`, errors)) valid = false;
  if (!validateString(value.sourceLocation, `${path}.sourceLocation`, errors, { allowEmpty: true })) valid = false;

  if (value.activeRegionNum !== null && value.activeRegionNum !== undefined) {
    if (!validateNumber(value.activeRegionNum, `${path}.activeRegionNum`, errors, { min: 0 })) valid = false;
  }

  if (value.note !== undefined && !validateString(value.note, `${path}.note`, errors, { allowEmpty: true })) valid = false;

  const instruments: DonkiInstrument[] = [];
  if (!Array.isArray(value.instruments) || value.instruments.length === 0) {
    errors.push({ path: `${path}.instruments`, message: `instruments must be a non-empty array`, value: value.instruments });
    valid = false;
  } else {
    value.instruments.forEach((inst, i) => {
      const vInst = validateDonkiInstrument(inst, `${path}.instruments[${i}]`, errors);
      if (vInst) instruments.push(vInst);
      else valid = false;
    });
  }

  const analyses: DonkiCmeAnalysis[] = [];
  if (!Array.isArray(value.analyses) || value.analyses.length === 0) {
    errors.push({ path: `${path}.analyses`, message: `analyses must be a non-empty array`, value: value.analyses });
    valid = false;
  } else {
    value.analyses.forEach((ana, i) => {
      const vAna = validateDonkiCmeAnalysis(ana, `${path}.analyses[${i}]`, errors);
      if (vAna) analyses.push(vAna);
      else valid = false;
    });
  }

  const linkedEvents: DonkiLinkedEvent[] = [];
  if (value.linkedEvents !== undefined && value.linkedEvents !== null) {
    if (!Array.isArray(value.linkedEvents)) {
      errors.push({ path: `${path}.linkedEvents`, message: `linkedEvents must be an array`, value: value.linkedEvents });
      valid = false;
    } else {
      value.linkedEvents.forEach((lnk, i) => {
        if (!isObject(lnk) || !validateString(lnk.activityId, `${path}.linkedEvents[${i}].activityId`, errors, { allowEmpty: false })) {
          valid = false;
        } else {
          linkedEvents.push({ activityId: lnk.activityId as string });
        }
      });
    }
  }

  if (!valid || !provenance) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      classification: value.classification as ScientificTruthClassification,
      provenance,
      activityId: value.activityId as string,
      startTime: value.startTime as string,
      sourceLocation: value.sourceLocation as string,
      activeRegionNum: (value.activeRegionNum as number | null) ?? null,
      note: value.note as string | undefined,
      instruments,
      analyses,
      linkedEvents: linkedEvents.length > 0 ? linkedEvents : undefined,
    },
    errors: [],
  };
}

export function validateDonkiSolarFlareRecord(
  value: unknown,
  path = 'solarFlareRecord'
): ValidationResult<DonkiSolarFlareRecord> {
  const errors: ValidationError[] = [];
  if (!isObject(value)) {
    return { success: false, errors: [{ path, message: `Expected solar flare object, received ${typeof value}`, value }] };
  }

  let valid = true;
  if (!validateClassification(value.classification, `${path}.classification`, errors)) valid = false;
  const provenance = validateProvenance(value.provenance, `${path}.provenance`, errors);
  if (!provenance) valid = false;

  if (!validateString(value.flareId, `${path}.flareId`, errors, { allowEmpty: false })) valid = false;
  if (!validateTimestamp(value.beginTime, `${path}.beginTime`, errors)) valid = false;
  if (!validateTimestamp(value.peakTime, `${path}.peakTime`, errors)) valid = false;

  if (value.endTime !== null && value.endTime !== undefined) {
    if (!validateTimestamp(value.endTime, `${path}.endTime`, errors)) valid = false;
  }

  if (!validateString(value.classType, `${path}.classType`, errors, { allowEmpty: false })) valid = false;

  if (value.fluxUnit !== 'W/m^2' && value.fluxUnit !== 'class') {
    errors.push({ path: `${path}.fluxUnit`, message: `fluxUnit must be 'W/m^2' or 'class', received '${String(value.fluxUnit)}'`, value: value.fluxUnit });
    valid = false;
  }

  if (!validateString(value.sourceLocation, `${path}.sourceLocation`, errors, { allowEmpty: true })) valid = false;

  if (value.activeRegionNum !== null && value.activeRegionNum !== undefined) {
    if (!validateNumber(value.activeRegionNum, `${path}.activeRegionNum`, errors, { min: 0 })) valid = false;
  }

  const instruments: DonkiInstrument[] = [];
  if (!Array.isArray(value.instruments) || value.instruments.length === 0) {
    errors.push({ path: `${path}.instruments`, message: `instruments must be a non-empty array`, value: value.instruments });
    valid = false;
  } else {
    value.instruments.forEach((inst, i) => {
      const vInst = validateDonkiInstrument(inst, `${path}.instruments[${i}]`, errors);
      if (vInst) instruments.push(vInst);
      else valid = false;
    });
  }

  const linkedEvents: DonkiLinkedEvent[] = [];
  if (value.linkedEvents !== undefined && value.linkedEvents !== null) {
    if (!Array.isArray(value.linkedEvents)) {
      errors.push({ path: `${path}.linkedEvents`, message: `linkedEvents must be an array`, value: value.linkedEvents });
      valid = false;
    } else {
      value.linkedEvents.forEach((lnk, i) => {
        if (!isObject(lnk) || !validateString(lnk.activityId, `${path}.linkedEvents[${i}].activityId`, errors, { allowEmpty: false })) {
          valid = false;
        } else {
          linkedEvents.push({ activityId: lnk.activityId as string });
        }
      });
    }
  }

  if (!valid || !provenance) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      classification: value.classification as ScientificTruthClassification,
      provenance,
      flareId: value.flareId as string,
      beginTime: value.beginTime as string,
      peakTime: value.peakTime as string,
      endTime: (value.endTime as string | null) ?? null,
      classType: value.classType as string,
      fluxUnit: value.fluxUnit as 'W/m^2' | 'class',
      sourceLocation: value.sourceLocation as string,
      activeRegionNum: (value.activeRegionNum as number | null) ?? null,
      instruments,
      linkedEvents: linkedEvents.length > 0 ? linkedEvents : undefined,
    },
    errors: [],
  };
}

export function validateDonkiSepRecord(
  value: unknown,
  path = 'sepRecord'
): ValidationResult<DonkiSepRecord> {
  const errors: ValidationError[] = [];
  if (!isObject(value)) {
    return { success: false, errors: [{ path, message: `Expected SEP object, received ${typeof value}`, value }] };
  }

  let valid = true;
  if (!validateClassification(value.classification, `${path}.classification`, errors)) valid = false;
  const provenance = validateProvenance(value.provenance, `${path}.provenance`, errors);
  if (!provenance) valid = false;

  if (!validateString(value.sepId, `${path}.sepId`, errors, { allowEmpty: false })) valid = false;
  if (!validateTimestamp(value.eventTime, `${path}.eventTime`, errors)) valid = false;
  if (!validateString(value.energyChannel, `${path}.energyChannel`, errors, { allowEmpty: false })) valid = false;

  const instruments: DonkiInstrument[] = [];
  if (!Array.isArray(value.instruments) || value.instruments.length === 0) {
    errors.push({ path: `${path}.instruments`, message: `instruments must be a non-empty array`, value: value.instruments });
    valid = false;
  } else {
    value.instruments.forEach((inst, i) => {
      const vInst = validateDonkiInstrument(inst, `${path}.instruments[${i}]`, errors);
      if (vInst) instruments.push(vInst);
      else valid = false;
    });
  }

  const linkedEvents: DonkiLinkedEvent[] = [];
  if (value.linkedEvents !== undefined && value.linkedEvents !== null) {
    if (!Array.isArray(value.linkedEvents)) {
      errors.push({ path: `${path}.linkedEvents`, message: `linkedEvents must be an array`, value: value.linkedEvents });
      valid = false;
    } else {
      value.linkedEvents.forEach((lnk, i) => {
        if (!isObject(lnk) || !validateString(lnk.activityId, `${path}.linkedEvents[${i}].activityId`, errors, { allowEmpty: false })) {
          valid = false;
        } else {
          linkedEvents.push({ activityId: lnk.activityId as string });
        }
      });
    }
  }

  if (!valid || !provenance) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      classification: value.classification as ScientificTruthClassification,
      provenance,
      sepId: value.sepId as string,
      eventTime: value.eventTime as string,
      energyChannel: value.energyChannel as string,
      instruments,
      linkedEvents: linkedEvents.length > 0 ? linkedEvents : undefined,
    },
    errors: [],
  };
}

export function validateDonkiSnapshot(value: unknown): ValidationResult<DonkiSnapshot> {
  const errors: ValidationError[] = [];
  if (!isObject(value)) {
    return { success: false, errors: [{ path: 'snapshot', message: 'Snapshot payload must be a non-null object', value }] };
  }

  if (value.schemaVersion !== '1.0') {
    errors.push({ path: 'snapshot.schemaVersion', message: `Expected schemaVersion '1.0', received '${String(value.schemaVersion)}'`, value: value.schemaVersion });
  }

  if (!validateTimestamp(value.generatedAt, 'snapshot.generatedAt', errors)) {
    // timestamp error added
  }

  if (value.source !== 'NASA DONKI') {
    errors.push({ path: 'snapshot.source', message: `Expected source 'NASA DONKI', received '${String(value.source)}'`, value: value.source });
  }

  const cmes: DonkiCmeRecord[] = [];
  if (!Array.isArray(value.cmes)) {
    errors.push({ path: 'snapshot.cmes', message: 'cmes must be an array', value: value.cmes });
  } else {
    value.cmes.forEach((cme, i) => {
      const res = validateDonkiCmeRecord(cme, `snapshot.cmes[${i}]`);
      if (res.success && res.data) cmes.push(res.data);
      else errors.push(...res.errors);
    });
  }

  const solarFlares: DonkiSolarFlareRecord[] = [];
  if (!Array.isArray(value.solarFlares)) {
    errors.push({ path: 'snapshot.solarFlares', message: 'solarFlares must be an array', value: value.solarFlares });
  } else {
    value.solarFlares.forEach((flr, i) => {
      const res = validateDonkiSolarFlareRecord(flr, `snapshot.solarFlares[${i}]`);
      if (res.success && res.data) solarFlares.push(res.data);
      else errors.push(...res.errors);
    });
  }

  const sepEvents: DonkiSepRecord[] = [];
  if (!Array.isArray(value.sepEvents)) {
    errors.push({ path: 'snapshot.sepEvents', message: 'sepEvents must be an array', value: value.sepEvents });
  } else {
    value.sepEvents.forEach((sep, i) => {
      const res = validateDonkiSepRecord(sep, `snapshot.sepEvents[${i}]`);
      if (res.success && res.data) sepEvents.push(res.data);
      else errors.push(...res.errors);
    });
  }

  // Reject completely empty datasets
  if (cmes.length === 0 && solarFlares.length === 0 && sepEvents.length === 0 && errors.length === 0) {
    errors.push({ path: 'snapshot', message: 'DONKI snapshot cannot be completely empty; must contain at least one CME, flare, or SEP record.' });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      schemaVersion: '1.0',
      generatedAt: value.generatedAt as string,
      source: 'NASA DONKI',
      cmes,
      solarFlares,
      sepEvents,
    },
    errors: [],
  };
}

// ============================================================================
// NASA RadLab Validation
// ============================================================================

const VALID_DOSE_RATE_UNITS: Set<AbsorbedDoseRateUnit> = new Set(['uGy/h', 'uGy/day', 'mGy/day']);
const VALID_DOSE_EQUIV_UNITS: Set<DoseEquivalentRateUnit> = new Set(['uSv/h', 'uSv/day', 'mSv/day']);
const VALID_FLUX_UNITS: Set<ParticleFluxUnit> = new Set(['cm^-2 s^-1']);

export function validateRadLabObservationRecord(
  value: unknown,
  path = 'radLabRecord'
): ValidationResult<RadLabObservationRecord> {
  const errors: ValidationError[] = [];
  if (!isObject(value)) {
    return { success: false, errors: [{ path, message: `Expected RadLab observation object, received ${typeof value}`, value }] };
  }

  let valid = true;
  if (!validateClassification(value.classification, `${path}.classification`, errors)) valid = false;
  const provenance = validateProvenance(value.provenance, `${path}.provenance`, errors);
  if (!provenance) valid = false;

  if (!validateString(value.observationId, `${path}.observationId`, errors, { allowEmpty: false })) valid = false;
  if (!validateTimestamp(value.timestamp, `${path}.timestamp`, errors)) valid = false;
  if (!validateString(value.spacecraft, `${path}.spacecraft`, errors, { allowEmpty: false })) valid = false;
  if (!validateString(value.trajectory, `${path}.trajectory`, errors, { allowEmpty: false })) valid = false;
  if (!validateString(value.instrument, `${path}.instrument`, errors, { allowEmpty: false })) valid = false;
  if (!validateString(value.detectorId, `${path}.detectorId`, errors, { allowEmpty: false })) valid = false;

  if (value.module !== undefined && !validateString(value.module, `${path}.module`, errors)) valid = false;

  if (!validateNumber(value.absorbedDoseRate, `${path}.absorbedDoseRate`, errors, { min: 0 })) valid = false;

  if (
    typeof value.absorbedDoseRateUnit !== 'string' ||
    !VALID_DOSE_RATE_UNITS.has(value.absorbedDoseRateUnit as AbsorbedDoseRateUnit)
  ) {
    errors.push({
      path: `${path}.absorbedDoseRateUnit`,
      message: `Invalid absorbedDoseRateUnit: '${String(value.absorbedDoseRateUnit)}'. Expected 'uGy/h', 'uGy/day', or 'mGy/day'.`,
      value: value.absorbedDoseRateUnit,
    });
    valid = false;
  }

  if (value.doseEquivalentRate !== undefined && value.doseEquivalentRate !== null) {
    if (!validateNumber(value.doseEquivalentRate, `${path}.doseEquivalentRate`, errors, { min: 0 })) valid = false;
    if (
      typeof value.doseEquivalentRateUnit !== 'string' ||
      !VALID_DOSE_EQUIV_UNITS.has(value.doseEquivalentRateUnit as DoseEquivalentRateUnit)
    ) {
      errors.push({
        path: `${path}.doseEquivalentRateUnit`,
        message: `Invalid doseEquivalentRateUnit: '${String(value.doseEquivalentRateUnit)}'. Expected 'uSv/h', 'uSv/day', or 'mSv/day'.`,
        value: value.doseEquivalentRateUnit,
      });
      valid = false;
    }
  }

  if (value.flux !== undefined && value.flux !== null) {
    if (!validateNumber(value.flux, `${path}.flux`, errors, { min: 0 })) valid = false;
    if (
      typeof value.fluxUnit !== 'string' ||
      !VALID_FLUX_UNITS.has(value.fluxUnit as ParticleFluxUnit)
    ) {
      errors.push({
        path: `${path}.fluxUnit`,
        message: `Invalid fluxUnit: '${String(value.fluxUnit)}'. Expected 'cm^-2 s^-1'.`,
        value: value.fluxUnit,
      });
      valid = false;
    }
  }

  if (value.latitude !== undefined && value.latitude !== null) {
    if (!validateNumber(value.latitude, `${path}.latitude`, errors, { min: -90, max: 90 })) valid = false;
  }
  if (value.longitude !== undefined && value.longitude !== null) {
    if (!validateNumber(value.longitude, `${path}.longitude`, errors, { min: -180, max: 180 })) valid = false;
  }
  if (value.altitudeKm !== undefined && value.altitudeKm !== null) {
    if (!validateNumber(value.altitudeKm, `${path}.altitudeKm`, errors, { min: 0 })) valid = false;
  }
  if (value.lShell !== undefined && value.lShell !== null) {
    if (!validateNumber(value.lShell, `${path}.lShell`, errors, { min: 0 })) valid = false;
  }

  if (!valid || !provenance) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      classification: value.classification as ScientificTruthClassification,
      provenance,
      observationId: value.observationId as string,
      timestamp: value.timestamp as string,
      spacecraft: value.spacecraft as string,
      trajectory: value.trajectory as string,
      instrument: value.instrument as string,
      detectorId: value.detectorId as string,
      module: value.module as string | undefined,
      absorbedDoseRate: value.absorbedDoseRate as number,
      absorbedDoseRateUnit: value.absorbedDoseRateUnit as AbsorbedDoseRateUnit,
      doseEquivalentRate: value.doseEquivalentRate as number | undefined,
      doseEquivalentRateUnit: value.doseEquivalentRateUnit as DoseEquivalentRateUnit | undefined,
      flux: value.flux as number | undefined,
      fluxUnit: value.fluxUnit as ParticleFluxUnit | undefined,
      latitude: value.latitude as number | undefined,
      longitude: value.longitude as number | undefined,
      altitudeKm: value.altitudeKm as number | undefined,
      lShell: value.lShell as number | undefined,
    },
    errors: [],
  };
}

export function validateRadLabSnapshot(value: unknown): ValidationResult<RadLabSnapshot> {
  const errors: ValidationError[] = [];
  if (!isObject(value)) {
    return { success: false, errors: [{ path: 'snapshot', message: 'Snapshot payload must be an object', value }] };
  }

  if (value.schemaVersion !== '1.0') {
    errors.push({ path: 'snapshot.schemaVersion', message: `Expected schemaVersion '1.0', received '${String(value.schemaVersion)}'`, value: value.schemaVersion });
  }

  validateTimestamp(value.generatedAt, 'snapshot.generatedAt', errors);

  if (value.source !== 'NASA OSDR RadLab') {
    errors.push({ path: 'snapshot.source', message: `Expected source 'NASA OSDR RadLab', received '${String(value.source)}'`, value: value.source });
  }

  validateString(value.mission, 'snapshot.mission', errors, { allowEmpty: false });

  const records: RadLabObservationRecord[] = [];
  if (!Array.isArray(value.records)) {
    errors.push({ path: 'snapshot.records', message: 'records must be an array', value: value.records });
  } else {
    if (value.records.length === 0) {
      errors.push({ path: 'snapshot.records', message: 'RadLab snapshot records array must not be empty' });
    } else {
      value.records.forEach((rec, i) => {
        const res = validateRadLabObservationRecord(rec, `snapshot.records[${i}]`);
        if (res.success && res.data) records.push(res.data);
        else errors.push(...res.errors);
      });
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      schemaVersion: '1.0',
      generatedAt: value.generatedAt as string,
      source: 'NASA OSDR RadLab',
      mission: value.mission as string,
      records,
    },
    errors: [],
  };
}

// ============================================================================
// NASA OSDR Validation
// ============================================================================

export function validateOsdrPublication(
  value: unknown,
  path: string,
  errors: ValidationError[]
): OsdrPublication | undefined {
  if (!isObject(value)) {
    errors.push({ path, message: `Expected publication object, received ${typeof value}`, value });
    return undefined;
  }

  let valid = true;
  if (!validateString(value.title, `${path}.title`, errors, { allowEmpty: false })) valid = false;

  const authors: string[] = [];
  if (!Array.isArray(value.authors) || value.authors.length === 0) {
    errors.push({ path: `${path}.authors`, message: `authors must be a non-empty string array`, value: value.authors });
    valid = false;
  } else {
    value.authors.forEach((aut, i) => {
      if (validateString(aut, `${path}.authors[${i}]`, errors, { allowEmpty: false })) {
        authors.push(aut as string);
      } else {
        valid = false;
      }
    });
  }

  if (value.doi !== undefined && !validateString(value.doi, `${path}.doi`, errors)) valid = false;
  if (value.journal !== undefined && !validateString(value.journal, `${path}.journal`, errors)) valid = false;
  if (value.year !== undefined && !validateNumber(value.year, `${path}.year`, errors, { min: 1950, max: 2100 })) valid = false;

  if (!valid) return undefined;

  return {
    title: value.title as string,
    authors,
    doi: value.doi as string | undefined,
    journal: value.journal as string | undefined,
    year: value.year as number | undefined,
  };
}

export function validateOsdrStudyRecord(
  value: unknown,
  path = 'osdrRecord'
): ValidationResult<OsdrStudyRecord> {
  const errors: ValidationError[] = [];
  if (!isObject(value)) {
    return { success: false, errors: [{ path, message: `Expected OSDR study object, received ${typeof value}`, value }] };
  }

  let valid = true;
  if (!validateClassification(value.classification, `${path}.classification`, errors)) valid = false;
  const provenance = validateProvenance(value.provenance, `${path}.provenance`, errors);
  if (!provenance) valid = false;

  if (!validateString(value.accession, `${path}.accession`, errors, { allowEmpty: false })) valid = false;
  if (!validateString(value.studyTitle, `${path}.studyTitle`, errors, { allowEmpty: false })) valid = false;
  if (!validateString(value.organism, `${path}.organism`, errors, { allowEmpty: false })) valid = false;
  if (!validateString(value.studyPopulation, `${path}.studyPopulation`, errors, { allowEmpty: false })) valid = false;
  if (!validateString(value.materialType, `${path}.materialType`, errors, { allowEmpty: false })) valid = false;
  if (!validateString(value.flightProgram, `${path}.flightProgram`, errors, { allowEmpty: false })) valid = false;

  if (value.missionName !== undefined && !validateString(value.missionName, `${path}.missionName`, errors)) valid = false;
  if (value.exposureDurationDays !== undefined && value.exposureDurationDays !== null) {
    if (!validateNumber(value.exposureDurationDays, `${path}.exposureDurationDays`, errors, { min: 0 })) valid = false;
  }

  if (!validateString(value.experimentalConditions, `${path}.experimentalConditions`, errors, { allowEmpty: false })) valid = false;
  if (!validateString(value.assayType, `${path}.assayType`, errors, { allowEmpty: false })) valid = false;

  const measuredParameters: string[] = [];
  if (!Array.isArray(value.measuredParameters) || value.measuredParameters.length === 0) {
    errors.push({ path: `${path}.measuredParameters`, message: 'measuredParameters must be a non-empty string array', value: value.measuredParameters });
    valid = false;
  } else {
    value.measuredParameters.forEach((param, i) => {
      if (validateString(param, `${path}.measuredParameters[${i}]`, errors, { allowEmpty: false })) {
        measuredParameters.push(param as string);
      } else {
        valid = false;
      }
    });
  }

  if (!validateString(value.keyFindings, `${path}.keyFindings`, errors, { allowEmpty: false })) valid = false;

  const publications: OsdrPublication[] = [];
  if (!Array.isArray(value.publications) || value.publications.length === 0) {
    errors.push({ path: `${path}.publications`, message: 'publications must be a non-empty array', value: value.publications });
    valid = false;
  } else {
    value.publications.forEach((pub, i) => {
      const vPub = validateOsdrPublication(pub, `${path}.publications[${i}]`, errors);
      if (vPub) publications.push(vPub);
      else valid = false;
    });
  }

  if (!validateString(value.limitations, `${path}.limitations`, errors, { allowEmpty: false })) valid = false;

  if (!valid || !provenance) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      classification: value.classification as ScientificTruthClassification,
      provenance,
      accession: value.accession as string,
      studyTitle: value.studyTitle as string,
      organism: value.organism as string,
      studyPopulation: value.studyPopulation as string,
      materialType: value.materialType as string,
      flightProgram: value.flightProgram as string,
      missionName: value.missionName as string | undefined,
      exposureDurationDays: value.exposureDurationDays as number | undefined,
      experimentalConditions: value.experimentalConditions as string,
      assayType: value.assayType as string,
      measuredParameters,
      keyFindings: value.keyFindings as string,
      publications,
      limitations: value.limitations as string,
    },
    errors: [],
  };
}

export function validateOsdrSnapshot(value: unknown): ValidationResult<OsdrSnapshot> {
  const errors: ValidationError[] = [];
  if (!isObject(value)) {
    return { success: false, errors: [{ path: 'snapshot', message: 'Snapshot payload must be an object', value }] };
  }

  if (value.schemaVersion !== '1.0') {
    errors.push({ path: 'snapshot.schemaVersion', message: `Expected schemaVersion '1.0', received '${String(value.schemaVersion)}'`, value: value.schemaVersion });
  }

  validateTimestamp(value.generatedAt, 'snapshot.generatedAt', errors);

  if (value.source !== 'NASA OSDR') {
    errors.push({ path: 'snapshot.source', message: `Expected source 'NASA OSDR', received '${String(value.source)}'`, value: value.source });
  }

  const studies: OsdrStudyRecord[] = [];
  if (!Array.isArray(value.studies)) {
    errors.push({ path: 'snapshot.studies', message: 'studies must be an array', value: value.studies });
  } else {
    if (value.studies.length === 0) {
      errors.push({ path: 'snapshot.studies', message: 'OSDR snapshot studies array must not be empty' });
    } else {
      value.studies.forEach((std, i) => {
        const res = validateOsdrStudyRecord(std, `snapshot.studies[${i}]`);
        if (res.success && res.data) studies.push(res.data);
        else errors.push(...res.errors);
      });
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      schemaVersion: '1.0',
      generatedAt: value.generatedAt as string,
      source: 'NASA OSDR',
      studies,
    },
    errors: [],
  };
}
