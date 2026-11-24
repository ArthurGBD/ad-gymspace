import { METRIC, RANGES } from "./constants.js";
import { inRange, parseDecimal } from "../utils/numbers.js";

/** Séries concluídas / total de um conjunto de exercícios (rascunho ou sessão). */
export function setCounts(exercises) {
  let total = 0;
  let done = 0;
  for (const e of exercises) {
    for (const s of e.sets) {
      total++;
      if (s.completed) done++;
    }
  }
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function exerciseProgress(exercise) {
  const done = exercise.sets.filter((s) => s.completed).length;
  return {
    done,
    total: exercise.sets.length,
    complete: exercise.sets.length > 0 && done === exercise.sets.length,
  };
}

const num = (v) => {
  const n = parseDecimal(v);
  return n === null || Number.isNaN(n) ? null : n;
};

/** Volume = carga × repetições das séries concluídas (apenas exercícios por repetição). */
export function exerciseVolume(exercise) {
  if (exercise.metric === METRIC.TIME) return 0;
  let vol = 0;
  for (const s of exercise.sets) {
    if (!s.completed) continue;
    const load = num(s.loadKg ?? s.load);
    const reps = num(s.reps);
    if (load !== null && reps !== null) vol += load * reps;
  }
  return vol;
}

export const sessionVolume = (exercises) =>
  exercises.reduce((a, e) => a + exerciseVolume(e), 0);

export function topLoad(exercise) {
  let best = null;
  for (const s of exercise.sets) {
    if (!s.completed) continue;
    const l = num(s.loadKg);
    if (l !== null && (best === null || l > best)) best = l;
  }
  return best;
}

/** RIR válido: inteiro entre 0 e 5 (ou vazio). */
export function isValidRir(v) {
  if (v === "" || v === null || v === undefined) return true;
  const n = Number(v);
  return Number.isInteger(n) && inRange(n, RANGES.rir);
}

/** Tempo restante do descanso (segundos) a partir de um instante-alvo. */
export function restRemaining(endsAt, nowMs = Date.now()) {
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - nowMs) / 1000));
}

/** Verdadeiro se há ao menos uma série concluída. */
export const hasCompletedSets = (exercises) =>
  exercises.some((e) => e.sets.some((s) => s.completed));
