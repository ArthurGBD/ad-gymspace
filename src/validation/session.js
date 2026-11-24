import {
  EQUIPMENT,
  LIMITS,
  METRIC,
  MODE,
  RANGES,
  SCHEMA_VERSION,
  STATUS,
  VARIANT,
  WORKOUT_CODES,
} from "../domain/constants.js";
import { isIsoDate, isIsoDateTime } from "../utils/dates.js";
import {
  createReport,
  findUnsafeKey,
  isObj,
  numIn,
  oneOf,
  str,
} from "./primitives.js";

const KNOWN_TOP = new Set([
  "id",
  "schemaVersion",
  "workoutCode",
  "mode",
  "status",
  "date",
  "capturedAt",
  "startedAt",
  "completedAt",
  "durationSeconds",
  "check",
  "exercises",
  "cardio",
  "post",
  "source",
  "transformations",
  "raw",
  "deletedAt",
  "unknown",
]);

function validateSet(r, p, s) {
  if (!isObj(s)) return void r.err(p, "série inválida");
  numIn(r, `${p}.loadKg`, s.loadKg, RANGES.loadKg);
  numIn(r, `${p}.reps`, s.reps, RANGES.reps);
  numIn(r, `${p}.timeSeconds`, s.timeSeconds, RANGES.timeSeconds);
  numIn(r, `${p}.rir`, s.rir, RANGES.rir, { integer: true });
  if (typeof s.completed !== "boolean")
    r.err(`${p}.completed`, "deve ser booleano");
}

function validateExercise(r, p, e) {
  if (!isObj(e)) return void r.err(p, "exercício inválido");
  str(r, `${p}.label`, e.label, { max: LIMITS.maxLabel, required: true });
  oneOf(r, `${p}.metric`, e.metric, Object.values(METRIC));
  oneOf(r, `${p}.variantType`, e.variantType, Object.values(VARIANT), {
    nullable: true,
  });
  oneOf(r, `${p}.equipmentMatch`, e.equipmentMatch, Object.values(EQUIPMENT), {
    nullable: true,
  });
  str(r, `${p}.equipmentLabel`, e.equipmentLabel);
  numIn(r, `${p}.rirLastSet`, e.rirLastSet, RANGES.rir, { integer: true });
  str(r, `${p}.perception`, e.perception, { max: 100 });
  str(r, `${p}.notes`, e.notes);
  if (!Array.isArray(e.sets) || e.sets.length > LIMITS.maxSets)
    return void r.err(`${p}.sets`, `lista de até ${LIMITS.maxSets} séries`);
  e.sets.forEach((s, i) => validateSet(r, `${p}.sets[${i}]`, s));
}

/**
 * Valida uma sessão canônica (schema v2). Não altera dados; apenas reporta.
 * @returns {{ok:boolean, errors:string[], warnings:string[], value:any}}
 */
export function validateSession(s) {
  const r = createReport();
  if (!isObj(s)) {
    r.err("$", "sessão deve ser um objeto");
    return { ok: false, errors: r.errors, warnings: r.warnings, value: null };
  }
  const unsafe = findUnsafeKey(s);
  if (unsafe) r.err("$", unsafe);
  str(r, "id", s.id, { max: 80, required: true });
  if (s.schemaVersion !== SCHEMA_VERSION)
    r.err("schemaVersion", `esperado ${SCHEMA_VERSION}`);
  oneOf(r, "workoutCode", s.workoutCode, WORKOUT_CODES);
  oneOf(r, "mode", s.mode, Object.values(MODE));
  oneOf(r, "status", s.status, [STATUS.COMPLETED, STATUS.CANCELLED]);
  if (!isIsoDate(s.date)) r.err("date", "data inválida (YYYY-MM-DD)");
  for (const k of ["capturedAt", "startedAt", "completedAt", "deletedAt"]) {
    if (s[k] != null && !isIsoDateTime(s[k]))
      r.err(k, "data/hora ISO inválida");
  }
  if (
    s.startedAt &&
    s.completedAt &&
    Date.parse(s.completedAt) < Date.parse(s.startedAt)
  ) {
    r.err("completedAt", "anterior a startedAt");
  }
  numIn(r, "durationSeconds", s.durationSeconds, [0, 86400 * 2]);

  if (!isObj(s.check)) r.err("check", "objeto obrigatório");
  else {
    for (const k of ["energy", "sleep", "fatigue", "motivation"])
      numIn(r, `check.${k}`, s.check[k], RANGES.scale5, { integer: true });
    for (const k of ["shoulderPain", "kneePain", "lumbarPain"])
      numIn(r, `check.${k}`, s.check[k], RANGES.pain);
  }
  if (!Array.isArray(s.exercises) || s.exercises.length > LIMITS.maxExercises)
    r.err("exercises", `lista de até ${LIMITS.maxExercises}`);
  else s.exercises.forEach((e, i) => validateExercise(r, `exercises[${i}]`, e));

  if (s.cardio != null) {
    if (!isObj(s.cardio)) r.err("cardio", "objeto");
    else {
      numIn(r, "cardio.minutes", s.cardio.minutes, RANGES.cardioMinutes);
      numIn(r, "cardio.speedMin", s.cardio.speedMin, RANGES.speedKmh);
      numIn(r, "cardio.speedMax", s.cardio.speedMax, RANGES.speedKmh);
      numIn(r, "cardio.distanceKm", s.cardio.distanceKm, RANGES.distanceKm);
    }
  }
  if (s.post != null) {
    if (!isObj(s.post)) r.err("post", "objeto");
    else {
      numIn(r, "post.effort", s.post.effort, RANGES.rating10);
      numIn(r, "post.rating", s.post.rating, RANGES.rating10);
      for (const k of ["performance", "finalFatigue", "technique"])
        numIn(r, `post.${k}`, s.post[k], RANGES.scale5, { integer: true });
      str(r, "post.notes", s.post.notes);
    }
  }
  if (!isObj(s.source)) r.err("source", "objeto obrigatório");
  if (
    s.transformations != null &&
    (!Array.isArray(s.transformations) || s.transformations.length > 200)
  ) {
    r.err("transformations", "lista inválida");
  }
  if (s.raw != null && JSON.stringify(s.raw).length > LIMITS.maxImportBytes)
    r.err("raw", "excede o limite");

  const unknownKeys = Object.keys(s).filter((k) => !KNOWN_TOP.has(k));
  if (unknownKeys.length)
    r.warn(
      "$",
      `campos desconhecidos preservados em "unknown": ${unknownKeys.join(", ")}`,
    );
  return {
    ok: r.errors.length === 0,
    errors: r.errors,
    warnings: r.warnings,
    value: r.errors.length ? null : s,
  };
}

/** Move campos desconhecidos para `unknown` (sem descartá-los). */
export function preserveUnknown(s) {
  const unknown = {};
  const out = {};
  for (const [k, v] of Object.entries(s))
    (KNOWN_TOP.has(k) ? out : unknown)[k] = v;
  if (Object.keys(unknown).length)
    out.unknown = { ...(s.unknown ?? {}), ...unknown };
  return out;
}
