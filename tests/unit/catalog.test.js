import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { ROUTINES } from "../../src/domain/routines.js";
import {
  EXERCISE_CATALOG,
  getExerciseInfo,
} from "../../src/domain/exerciseCatalog.js";
import {
  estimateMinutes,
  lastCompleted,
  plannedSets,
} from "../../src/domain/plan.js";

const planned = Object.values(ROUTINES).flatMap((r) => r.exercises);

describe("catálogo de exercícios", () => {
  it("cobre todos os exercícios do plano e não tem entradas órfãs", () => {
    const ids = new Set(planned.map((e) => e.id));
    for (const id of ids) expect(EXERCISE_CATALOG[id], id).toBeDefined();
    for (const id of Object.keys(EXERCISE_CATALOG))
      expect(ids.has(id), id).toBe(true);
  });
  it("toda imagem referenciada existe em public/ e todo item tem instruções", () => {
    for (const id of Object.keys(EXERCISE_CATALOG)) {
      const info = getExerciseInfo(id);
      expect(info.instructions.exec.length).toBeGreaterThan(0);
      for (const path of info.media?.images ?? [])
        expect(existsSync(`public/${path}`), path).toBe(true);
      if (info.media) expect(["exact", "similar"]).toContain(info.media.match);
    }
  });
  it("não declara vídeo sem fonte verificada", () => {
    for (const e of Object.values(EXERCISE_CATALOG))
      expect(e.media?.video).toBeUndefined();
  });
});

describe("plano", () => {
  it("modo retorno limita a 2 séries por exercício e a estimativa é arredondada", () => {
    const a = ROUTINES.A.exercises;
    expect(plannedSets(a, "RETURN")).toBe(14);
    expect(plannedSets(a, "REFERENCE")).toBe(20);
    expect(estimateMinutes(a, "RETURN") % 5).toBe(0);
  });
  it("lastCompleted ignora excluídas e não concluídas", () => {
    const s = [
      {
        status: "COMPLETED",
        workoutCode: "A",
        date: "2026-01-01",
        deletedAt: "x",
      },
      { status: "COMPLETED", workoutCode: "A", date: "2026-01-02" },
      { status: "CANCELLED", workoutCode: "A", date: "2026-01-03" },
    ];
    expect(lastCompleted(s, "A").date).toBe("2026-01-02");
    expect(lastCompleted(s, "B")).toBeNull();
  });
});
