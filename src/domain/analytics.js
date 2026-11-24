import { topLoad, exerciseVolume } from "./metrics.js";
import { comparability } from "./progression.js";

/** Séries temporais por exercício (rótulo) entre sessões concluídas não excluídas. */
export function exerciseSeries(sessions, label, workoutCode) {
  const points = [];
  const sorted = sessions
    .filter(
      (s) =>
        s.status === "COMPLETED" &&
        !s.deletedAt &&
        (!workoutCode || s.workoutCode === workoutCode),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        String(a.completedAt).localeCompare(String(b.completedAt)),
    );
  let ref = null;
  for (const s of sorted) {
    const ex = s.exercises.find((e) => e.label === label);
    if (!ex) continue;
    const cmp = ref
      ? comparability(ref, ex)
      : { comparable: true, reason: "primeiro" };
    points.push({
      sessionId: s.id,
      date: s.date,
      topLoad: topLoad(normalize(ex)),
      volume: exerciseVolume(normalize(ex)),
      comparable: cmp.comparable,
      reason: cmp.reason,
    });
    if (cmp.comparable) ref = ex;
  }
  return points;
}

// Sessões canônicas usam loadKg numérico e completed; reaproveita as funções de métricas.
const normalize = (ex) => ({
  ...ex,
  sets: ex.sets.map((s) => ({ ...s, loadKg: s.loadKg ?? "" })),
});

export function distinctExercises(sessions) {
  const seen = new Map();
  for (const s of sessions) {
    if (s.status !== "COMPLETED" || s.deletedAt) continue;
    for (const e of s.exercises) {
      const k = `${s.workoutCode}|${e.label}`;
      if (!seen.has(k))
        seen.set(k, { label: e.label, workoutCode: s.workoutCode });
    }
  }
  return [...seen.values()].sort(
    (a, b) =>
      a.workoutCode.localeCompare(b.workoutCode) ||
      a.label.localeCompare(b.label),
  );
}
