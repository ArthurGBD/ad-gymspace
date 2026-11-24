import { describe, expect, it } from "vitest";
import { STATUS, MODE, METRIC } from "../../src/domain/constants.js";
import {
  createDraft,
  updateSet,
  addSet,
  hasProgress,
} from "../../src/domain/draft.js";
import {
  transition,
  canTransition,
  activeDurationSeconds,
} from "../../src/domain/workoutState.js";
import {
  setCounts,
  exerciseVolume,
  isValidRir,
  restRemaining,
} from "../../src/domain/metrics.js";
import { suggestNext, comparability } from "../../src/domain/progression.js";
import { suggestNextWorkout } from "../../src/domain/routines.js";
import { draftToSession } from "../../src/domain/session.js";
import { parseDecimal } from "../../src/utils/numbers.js";
import {
  isIsoDate,
  localDateFromIso,
  formatDuration,
} from "../../src/utils/dates.js";

const T0 = Date.parse("2030-01-10T10:00:00Z");

describe("estado do treino", () => {
  it("aceita transições válidas e rejeita inválidas", () => {
    expect(canTransition(STATUS.NOT_STARTED, STATUS.IN_PROGRESS)).toBe(true);
    expect(canTransition(STATUS.COMPLETED, STATUS.IN_PROGRESS)).toBe(false);
    expect(canTransition(STATUS.CANCELLED, STATUS.PAUSED)).toBe(false);
    const d = createDraft({ day: "A", nowMs: T0 });
    expect(() => transition(d, STATUS.COMPLETED, T0)).toThrow(/permitida/);
  });
  it("desconta pausas da duração", () => {
    let d = transition(
      createDraft({ day: "A", nowMs: T0 }),
      STATUS.IN_PROGRESS,
      T0,
    );
    d = transition(d, STATUS.PAUSED, T0 + 60_000);
    d = transition(d, STATUS.IN_PROGRESS, T0 + 360_000);
    d = transition(d, STATUS.COMPLETED, T0 + 420_000);
    expect(activeDurationSeconds(d)).toBe(120);
  });
});

describe("rascunho, métricas e RIR", () => {
  it("modo retorno limita a 2 séries; modo completo usa o plano", () => {
    expect(
      createDraft({ day: "A", mode: MODE.RETURN }).exercises.every(
        (e) => e.sets.length <= 2,
      ),
    ).toBe(true);
    expect(
      createDraft({ day: "A", mode: MODE.REFERENCE }).exercises.some(
        (e) => e.sets.length >= 3,
      ),
    ).toBe(true);
  });
  it("calcula volume só de séries concluídas e aceita vírgula decimal", () => {
    let d = createDraft({ day: "A", mode: MODE.REFERENCE });
    d = updateSet(d, 0, 0, { loadKg: "20", reps: "10", completed: true });
    d = updateSet(d, 0, 1, { loadKg: "20,5", reps: "10", completed: false });
    expect(exerciseVolume(d.exercises[0])).toBe(200);
    expect(setCounts(d.exercises).done).toBe(1);
    expect(hasProgress(d)).toBe(true);
    expect(addSet(d, 0).exercises[0].sets.length).toBe(
      d.exercises[0].sets.length + 1,
    );
  });
  it("RIR 0–5 inteiro", () => {
    expect(["0", "5", ""].every(isValidRir)).toBe(true);
    expect(["6", "-1", "1.5", "x"].some(isValidRir)).toBe(false);
  });
  it("descanso baseado em instante-alvo", () => {
    expect(restRemaining(T0 + 5000, T0)).toBe(5);
    expect(restRemaining(T0 - 1, T0)).toBe(0);
  });
});

describe("números e datas", () => {
  it("parseDecimal", () => {
    expect(parseDecimal("16,5")).toBe(16.5);
    expect(parseDecimal("")).toBeNull();
    expect(Number.isNaN(parseDecimal("abc"))).toBe(true);
  });
  it("datas reais e fuso", () => {
    expect(isIsoDate("2030-02-30")).toBe(false);
    expect(isIsoDate("2032-02-29")).toBe(true);
    expect(localDateFromIso("2030-01-15T01:00:00.000Z", 180)).toBe(
      "2030-01-14",
    );
    expect(formatDuration(3725)).toMatch(/1:02:05|62:05/);
  });
});

describe("progressão", () => {
  const prev = {
    metric: METRIC.REPS,
    target: { min: 8, max: 12 },
    equipmentMatch: "SAME",
    variantType: "PLANNED",
    sets: [
      { reps: 12, rir: 2, completed: true },
      { reps: 12, rir: 1, completed: true },
    ],
  };
  it("sugere aumento apenas fora do modo retorno e é rotulado como sugestão", () => {
    expect(suggestNext(prev, { mode: MODE.REFERENCE })).toMatchObject({
      action: "INCREASE_LOAD",
      source: "SYSTEM_SUGGESTION",
    });
    expect(suggestNext(prev, { mode: MODE.RETURN }).action).toBe("NONE");
    expect(suggestNext(prev, { pain: 6 }).action).toBe("REVIEW_DISCOMFORT");
  });
  it("equipamentos/variantes diferentes não são comparáveis", () => {
    expect(
      comparability(
        { equipmentMatch: "SAME", variantType: "PLANNED" },
        { equipmentMatch: "DIFFERENT", variantType: "PLANNED" },
      ).comparable,
    ).toBe(false);
  });
  it("sugere o próximo treino na sequência A–E", () => {
    expect(suggestNextWorkout([])).toBe("A");
    expect(
      suggestNextWorkout([
        { status: "COMPLETED", workoutCode: "E", completedAt: "x", date: "x" },
      ]),
    ).toBe("A");
    expect(
      suggestNextWorkout([
        { status: "COMPLETED", workoutCode: "B", completedAt: "x", date: "x" },
      ]),
    ).toBe("C");
  });
});

describe("draftToSession", () => {
  it("não corrige valores inválidos em silêncio", () => {
    let d = transition(
      createDraft({ day: "A", nowMs: T0 }),
      STATUS.IN_PROGRESS,
      T0,
    );
    d = updateSet(d, 0, 0, { reps: "abc", completed: true });
    expect(() => draftToSession(d, { nowMs: T0 + 1000 })).toThrow();
    d = updateSet(d, 0, 0, { reps: "10", rir: "9", completed: true });
    expect(() => draftToSession(d, { nowMs: T0 + 1000 })).toThrow();
  });
  it("gera sessão canônica com id do rascunho (idempotência)", () => {
    let d = transition(
      createDraft({ day: "B", nowMs: T0, id: "fixed" }),
      STATUS.IN_PROGRESS,
      T0,
    );
    d = updateSet(d, 0, 0, {
      loadKg: "12,5",
      reps: "10",
      rir: "2",
      completed: true,
    });
    const s = draftToSession(transition(d, STATUS.COMPLETED, T0 + 600_000));
    expect(s).toMatchObject({
      id: "fixed",
      status: "COMPLETED",
      durationSeconds: 600,
    });
    expect(s.exercises[0].sets[0]).toMatchObject({
      loadKg: 12.5,
      reps: 10,
      rir: 2,
    });
  });
});
