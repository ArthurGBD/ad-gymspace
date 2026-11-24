import { METRIC, SCHEMA_VERSION, STATUS } from "./constants.js";
import { activeDurationSeconds } from "./workoutState.js";
import { AppError, ERR } from "../services/errors.js";
import { parseDecimal } from "../utils/numbers.js";
import { validateSession } from "../validation/session.js";

const toNum = (v) => {
  const n = parseDecimal(v);
  return n === null ? null : n;
};

/**
 * Converte rascunho (strings de formulário) em sessão canônica validada.
 * Valores inválidos NÃO são corrigidos: geram erro de validação com caminhos.
 * @returns {any} sessão canônica
 */
export function draftToSession(
  draft,
  { status = STATUS.COMPLETED, nowMs = Date.now() } = {},
) {
  const endedAt = draft.endedAt ?? new Date(nowMs).toISOString();
  const finished = { ...draft, endedAt };
  const num = (v, path, bad) => {
    const n = toNum(v);
    if (Number.isNaN(n)) bad.push(path);
    return n;
  };
  const bad = [];
  const session = {
    id: draft.id,
    schemaVersion: SCHEMA_VERSION,
    workoutCode: draft.workoutCode,
    mode: draft.mode,
    status,
    date: draft.date,
    capturedAt: endedAt,
    startedAt: draft.startedAt,
    completedAt: endedAt,
    durationSeconds: activeDurationSeconds(finished, nowMs),
    check: {
      energy: num(draft.check.energy, "check.energy", bad),
      sleep: num(draft.check.sleep, "check.sleep", bad),
      fatigue: num(draft.check.fatigue, "check.fatigue", bad),
      motivation: num(draft.check.motivation, "check.motivation", bad),
      shoulderPain: num(draft.check.shoulderPain, "check.shoulderPain", bad),
      kneePain: num(draft.check.kneePain, "check.kneePain", bad),
      lumbarPain: num(draft.check.lumbarPain, "check.lumbarPain", bad),
    },
    exercises: draft.exercises.map((e, i) => ({
      exerciseId: e.exerciseId,
      order: i + 1,
      label: e.label,
      metric: e.metric,
      target: e.target,
      variantType: e.variantType,
      equipmentMatch: e.equipmentMatch,
      equipmentLabel: e.equipmentLabel || null,
      rirLastSet: null,
      perception: e.perception || null,
      notes: e.notes || null,
      sets: e.sets.map((s, j) => ({
        setNumber: j + 1,
        loadKg: num(s.loadKg, `exercises[${i}].sets[${j}].loadKg`, bad),
        reps:
          e.metric === METRIC.TIME
            ? null
            : num(s.reps, `exercises[${i}].sets[${j}].reps`, bad),
        timeSeconds:
          e.metric === METRIC.TIME
            ? num(s.timeSeconds, `exercises[${i}].sets[${j}].timeSeconds`, bad)
            : null,
        rir: num(s.rir, `exercises[${i}].sets[${j}].rir`, bad),
        completed: Boolean(s.completed),
      })),
    })),
    cardio: {
      done: Boolean(draft.cardio.done),
      minutes: num(draft.cardio.minutes, "cardio.minutes", bad),
      speedMin: num(draft.cardio.speedMin, "cardio.speedMin", bad),
      speedMax: num(draft.cardio.speedMax, "cardio.speedMax", bad),
      distanceKm: num(draft.cardio.distanceKm, "cardio.distanceKm", bad),
    },
    post: {
      effort: num(draft.post.effort, "post.effort", bad),
      rating: num(draft.post.rating, "post.rating", bad),
      performance: num(draft.post.performance, "post.performance", bad),
      finalFatigue: num(draft.post.finalFatigue, "post.finalFatigue", bad),
      technique: num(draft.post.technique, "post.technique", bad),
      notes: draft.post.notes || null,
    },
    source: { kind: "app", appSchema: SCHEMA_VERSION },
    transformations: [],
  };
  const v = validateSession(session);
  if (bad.length || !v.ok) {
    throw new AppError(ERR.VALIDATION, {
      details: {
        fields: [...bad.map((b) => `${b}: número inválido`), ...v.errors],
      },
    });
  }
  return session;
}
