export const APP_VERSION = "3.0.0";
export const SCHEMA_VERSION = 2;
export const BACKUP_FORMAT = "adgymspace.backup";
export const LEGACY_OFFLINE_APP = "AD GymSpace Offline Retorno";

export const WORKOUT_CODES = ["A", "B", "C", "D", "E"];

/** Estados explícitos do treino. */
export const STATUS = Object.freeze({
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
});

export const MODE = Object.freeze({
  RETURN: "RETURN",
  REFERENCE: "REFERENCE",
  HISTORICAL: "HISTORICAL",
});
export const METRIC = Object.freeze({ REPS: "REPS", TIME: "TIME" });
export const VARIANT = Object.freeze({
  PLANNED: "PLANNED",
  VARIANT: "VARIANT",
  OTHER: "OTHER",
});
export const EQUIPMENT = Object.freeze({
  SAME: "SAME",
  DIFFERENT: "DIFFERENT",
  UNKNOWN: "UNKNOWN",
});

/** Regra do modo retorno (reconstrução offline v2, nov/2026): no máximo 2 séries por exercício. */
export const RETURN_MODE_MAX_SETS = 2;
export const RETURN_MODE_RIR_HINT = "2–4";

/** @type {Record<string, [number, number]>} */
export const RANGES = Object.freeze({
  loadKg: [0, 1000],
  reps: [0, 1000],
  timeSeconds: [0, 86400],
  rir: [0, 5],
  scale5: [1, 5],
  pain: [0, 10],
  rating10: [0, 10],
  cardioMinutes: [0, 1440],
  speedKmh: [0, 60],
  distanceKm: [0, 500],
});

/** Limites de entrada (defesa contra arquivos excessivos). */
/** @type {Record<string, number>} */
export const LIMITS = Object.freeze({
  maxImportBytes: 5 * 1024 * 1024,
  maxSessions: 5000,
  maxExercises: 40,
  maxSets: 30,
  maxString: 4000,
  maxLabel: 200,
  maxJsonDepth: 12,
  maxCsvRows: 50000,
  maxQuarantine: 100,
  maxRecoverableDrafts: 5,
  maxLogEntries: 200,
});

export const REST_PRESETS = [60, 90, 120, 180];
