import { MODE, RETURN_MODE_MAX_SETS } from "./constants.js";

/** Duração média assumida por série (execução + descanso). Apenas estimativa. */
export const MINUTES_PER_SET = 2.5;

/** @param {{sets:number}[]} exercises @param {string} [mode] */
export function plannedSets(exercises, mode) {
  const cap = mode === MODE.RETURN ? RETURN_MODE_MAX_SETS : Infinity;
  return exercises.reduce((n, e) => n + Math.min(e.sets, cap), 0);
}

/** Estimativa arredondada a 5 min; nunca um dado medido. */
export function estimateMinutes(exercises, mode) {
  return Math.max(
    5,
    Math.round((plannedSets(exercises, mode) * MINUTES_PER_SET) / 5) * 5,
  );
}

/** @param {{muscle:string}[]} exercises */
export function uniqueMuscles(exercises) {
  return [...new Set(exercises.map((e) => e.muscle))];
}

/** Última sessão concluída (não excluída) de um treino, ou de qualquer treino. */
export function lastCompleted(sessions, code) {
  return (
    sessions
      .filter(
        (s) =>
          s.status === "COMPLETED" &&
          !s.deletedAt &&
          (!code || s.workoutCode === code),
      )
      .sort((a, b) =>
        (b.completedAt ?? b.date).localeCompare(a.completedAt ?? a.date),
      )[0] ?? null
  );
}
