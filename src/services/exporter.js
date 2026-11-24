import {
  APP_VERSION,
  BACKUP_FORMAT,
  SCHEMA_VERSION,
} from "../domain/constants.js";
import { canonicalStringify, checksum } from "../utils/hash.js";
import { toCsv } from "../validation/csv.js";

/** Backup JSON completo (inclui excluídas e dados brutos). Checksum detecta só corrupção acidental. */
export function buildBackup(sessions, nowMs = Date.now()) {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date(nowMs).toISOString(),
    checksum: checksum(canonicalStringify(sessions)),
    sessions,
  };
}

export function buildCsv(sessions) {
  const rows = [
    [
      "sessao",
      "data",
      "treino",
      "modo",
      "exercicio",
      "serie",
      "carga_kg",
      "reps",
      "tempo_s",
      "concluida",
    ],
  ];
  for (const s of sessions.filter((x) => !x.deletedAt)) {
    for (const e of s.exercises) {
      for (const st of e.sets)
        rows.push([
          s.id,
          s.date,
          s.workoutCode,
          s.mode,
          e.label,
          st.setNumber ?? "",
          st.loadKg,
          st.reps,
          st.timeSeconds,
          st.completed ? "sim" : "nao",
        ]);
    }
  }
  return toCsv(rows);
}

export function summaryText(session) {
  const lines = [
    `AD GymSpace — Treino ${session.workoutCode} (${session.date})`,
  ];
  for (const e of session.exercises) {
    const done = e.sets.filter((s) => s.completed);
    if (!done.length) continue;
    lines.push(
      `${e.label}: ${done.map((s) => (e.metric === "TIME" ? `${s.timeSeconds ?? "-"}s` : `${s.loadKg ?? "-"}kg×${s.reps ?? "-"}`)).join(", ")}`,
    );
  }
  return lines.join("\n");
}
