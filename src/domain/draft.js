import {
  EQUIPMENT,
  METRIC,
  MODE,
  RETURN_MODE_MAX_SETS,
  SCHEMA_VERSION,
  STATUS,
  VARIANT,
  LIMITS,
} from "./constants.js";
import { ROUTINES } from "./routines.js";
import { newId } from "../utils/ids.js";
import { localDateString } from "../utils/dates.js";

export const emptySet = () => ({
  loadKg: "",
  reps: "",
  timeSeconds: "",
  rir: "",
  completed: false,
});

export function plannedSetCount(exercise, mode) {
  return mode === MODE.RETURN
    ? Math.min(RETURN_MODE_MAX_SETS, exercise.sets)
    : exercise.sets;
}

/**
 * Cria rascunho de treino (valores de formulário mantidos como string).
 * @param {{day: string, mode?: string, date?: string, nowMs?: number, id?: string}} p
 */
export function createDraft({
  day,
  mode = MODE.RETURN,
  date,
  nowMs = Date.now(),
  id,
}) {
  const routine = ROUTINES[day];
  if (!routine) throw new RangeError(`Treino inválido: ${day}`);
  return {
    id: id ?? newId("s"),
    schemaVersion: SCHEMA_VERSION,
    workoutCode: day,
    mode,
    date: date ?? localDateString(new Date(nowMs)),
    status: STATUS.NOT_STARTED,
    createdAt: new Date(nowMs).toISOString(),
    startedAt: null,
    pausedAt: null,
    pausedTotalMs: 0,
    endedAt: null,
    updatedAt: new Date(nowMs).toISOString(),
    currentExercise: 0,
    rest: { endsAt: null, durationS: 0 },
    check: {
      energy: "",
      sleep: "",
      fatigue: "",
      motivation: "",
      shoulderPain: "",
      kneePain: "",
      lumbarPain: "",
    },
    exercises: routine.exercises.map((e) => ({
      exerciseId: e.id,
      label: e.label,
      metric: e.metric,
      target: { sets: plannedSetCount(e, mode), min: e.min, max: e.max },
      variantType: VARIANT.PLANNED,
      equipmentMatch: EQUIPMENT.UNKNOWN,
      equipmentLabel: "",
      perception: "",
      notes: "",
      sets: Array.from({ length: plannedSetCount(e, mode) }, emptySet),
    })),
    cardio: {
      done: false,
      minutes: "",
      speedMin: "",
      speedMax: "",
      distanceKm: "",
    },
    post: {
      effort: "",
      performance: "",
      finalFatigue: "",
      technique: "",
      rating: "",
      notes: "",
    },
  };
}

const touch = (d, nowMs) => ({
  ...d,
  updatedAt: new Date(nowMs ?? Date.now()).toISOString(),
});

export function updateSet(draft, exIdx, setIdx, patch, nowMs) {
  const ex = draft.exercises[exIdx];
  if (!ex || !ex.sets[setIdx]) return draft;
  const sets = ex.sets.map((s, i) => (i === setIdx ? { ...s, ...patch } : s));
  const exercises = draft.exercises.map((e, i) =>
    i === exIdx ? { ...e, sets } : e,
  );
  return touch({ ...draft, exercises }, nowMs);
}

export function updateExercise(draft, exIdx, patch, nowMs) {
  if (!draft.exercises[exIdx]) return draft;
  const exercises = draft.exercises.map((e, i) =>
    i === exIdx ? { ...e, ...patch } : e,
  );
  return touch({ ...draft, exercises }, nowMs);
}

export function addSet(draft, exIdx, nowMs) {
  const ex = draft.exercises[exIdx];
  if (!ex || ex.sets.length >= LIMITS.maxSets) return draft;
  return updateExercise(
    draft,
    exIdx,
    { sets: [...ex.sets, emptySet()] },
    nowMs,
  );
}

export function removeLastEmptySet(draft, exIdx, nowMs) {
  const ex = draft.exercises[exIdx];
  if (!ex || ex.sets.length <= 1) return draft;
  const last = ex.sets[ex.sets.length - 1];
  if (
    last.completed ||
    last.loadKg !== "" ||
    last.reps !== "" ||
    last.timeSeconds !== ""
  )
    return draft;
  return updateExercise(draft, exIdx, { sets: ex.sets.slice(0, -1) }, nowMs);
}

export function updateSection(draft, section, patch, nowMs) {
  return touch({ ...draft, [section]: { ...draft[section], ...patch } }, nowMs);
}

/** Há algo digitado/marcado que seria perdido ao descartar? */
export function hasProgress(draft) {
  if (!draft) return false;
  const anySet = draft.exercises.some((e) =>
    e.sets.some(
      (s) =>
        s.completed ||
        s.loadKg !== "" ||
        s.reps !== "" ||
        s.timeSeconds !== "" ||
        s.rir !== "",
    ),
  );
  const anyCheck = Object.values(draft.check).some((v) => v !== "");
  const anyPost =
    Object.values(draft.post).some((v) => v !== "") ||
    draft.cardio.done ||
    draft.cardio.minutes !== "";
  return anySet || anyCheck || anyPost;
}

export const isTimeExercise = (e) => e.metric === METRIC.TIME;
