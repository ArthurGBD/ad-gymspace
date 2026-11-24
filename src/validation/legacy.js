import {
  EQUIPMENT,
  METRIC,
  MODE,
  RANGES,
  SCHEMA_VERSION,
  STATUS,
  VARIANT,
  WORKOUT_CODES,
} from "../domain/constants.js";
import { canonicalStringify, checksum } from "../utils/hash.js";
import { isIsoDateTime, localDateFromIso } from "../utils/dates.js";
import { inRange, parseDecimal } from "../utils/numbers.js";

/**
 * Normalizadores de esquemas legados -> sessão canônica v2.
 * Regras: (1) o objeto original vai inteiro em `raw`; (2) nada é corrigido em silêncio —
 * cada transformação ou valor descartado do campo normalizado é listado em `transformations`.
 */

class Ctx {
  constructor() {
    this.notes = [];
    this.errors = [];
  }
  note(m) {
    if (!this.notes.includes(m)) this.notes.push(m);
  }
  /** número validado; fora do intervalo/inválido => null + nota (original segue em raw) */
  n(path, v, range, { integer = false } = {}) {
    const x = parseDecimal(v);
    if (x === null) return null;
    if (
      Number.isNaN(x) ||
      !inRange(x, range) ||
      (integer && !Number.isInteger(x))
    ) {
      this.note(
        `${path}: valor "${String(v).slice(0, 40)}" não numérico/fora do intervalo; mantido apenas em raw`,
      );
      return null;
    }
    return x;
  }
}

const VARIANT_MAP = {
  planned: VARIANT.PLANNED,
  variant: VARIANT.VARIANT,
  other: VARIANT.OTHER,
};
const text = (v) => (typeof v === "string" && v.trim() !== "" ? v : null);

function finish(ctx, base, raw, kind, originalSchema, offsetMinutes) {
  const date = localDateFromIso(base.capturedAt, offsetMinutes);
  const session = {
    ...base,
    schemaVersion: SCHEMA_VERSION,
    mode: MODE.HISTORICAL,
    status: STATUS.COMPLETED,
    date,
    completedAt: base.capturedAt,
    startedAt: null,
    durationSeconds: null,
    source: { kind, originalSchema, importedAt: null },
    transformations: ctx.notes,
    raw,
  };
  ctx.note(
    "date: derivada de capturedAt no fuso do aparelho que importou; capturedAt (UTC) é a fonte original",
  );
  session.id = `legacy_${checksum(canonicalStringify(raw))}`;
  return session;
}

/** Esquemas `bodygym.session.v2…v8` e CSV (mapa `valores` chave→valor). */
/** @param {any} obj @param {{offsetMinutes?: number, kind?: string}} [opts] */
export function fromLegacyValores(
  obj,
  { offsetMinutes, kind = "legacy_json" } = {},
) {
  const ctx = new Ctx();
  const v = obj.valores ?? {};
  if (!WORKOUT_CODES.includes(obj.treino))
    return { errors: [`treino inválido: ${String(obj.treino).slice(0, 20)}`] };
  if (!isIsoDateTime(obj.data)) return { errors: ["data ausente ou inválida"] };

  const idx = new Set();
  for (const k of Object.keys(v)) {
    const m = /^e(\d+)-/.exec(k);
    if (m) idx.add(Number(m[1]));
  }
  const exercises = [...idx]
    .sort((a, b) => a - b)
    .map((n, order) => {
      const p = `e${n}`;
      let maxSet = 0;
      let isTime = false;
      for (const k of Object.keys(v)) {
        const m = new RegExp(`^${p}-s(\\d+)-(carga|reps|tempo)$`).exec(k);
        if (m) {
          maxSet = Math.max(maxSet, Number(m[1]));
          if (m[2] === "tempo") isTime = true;
        }
      }
      const sets = Array.from({ length: maxSet }, (_, j) => {
        const q = `${p}-s${j + 1}`;
        const loadKg = ctx.n(`${q}-carga`, v[`${q}-carga`], RANGES.loadKg);
        const reps = isTime
          ? null
          : ctx.n(`${q}-reps`, v[`${q}-reps`], RANGES.reps);
        const timeSeconds = isTime
          ? ctx.n(`${q}-tempo`, v[`${q}-tempo`], RANGES.timeSeconds)
          : null;
        const completed = (reps ?? 0) > 0 || (timeSeconds ?? 0) > 0;
        return {
          setNumber: j + 1,
          loadKg,
          reps,
          timeSeconds,
          rir: null,
          completed,
        };
      });
      ctx.note(
        "sets.completed: inferido por presença de repetições/tempo (formato legado não tem flag)",
      );
      ctx.note(
        'exercises.label: formato legado não traz o nome; usado "Exercício N" (sem adivinhar)',
      );
      const perc =
        text(v[`${p}-percepcao`]) ??
        (text(v[`${p}-dificuldade`])
          ? `dificuldade:${v[`${p}-dificuldade`]}`
          : null);
      return {
        order: order + 1,
        label: `Exercício ${n}`,
        metric: isTime ? METRIC.TIME : METRIC.REPS,
        target: null,
        variantType: VARIANT_MAP[v[`${p}-variante`]] ?? null,
        equipmentMatch: EQUIPMENT.UNKNOWN,
        equipmentLabel: null,
        rirLastSet: ctx.n(`${p}-rir`, v[`${p}-rir`], RANGES.rir, {
          integer: true,
        }),
        perception: perc,
        notes: text(v[`${p}-observacao`]),
        sets,
      };
    });

  const km = v["cardio-km"];
  const base = {
    workoutCode: obj.treino,
    capturedAt: obj.data,
    check: {
      energy: ctx.n("energia", v.energia, RANGES.scale5, { integer: true }),
      sleep: ctx.n("sono", v.sono, RANGES.scale5, { integer: true }),
      fatigue: ctx.n("cansaco-antes", v["cansaco-antes"], RANGES.scale5, {
        integer: true,
      }),
      motivation: ctx.n("motivacao", v.motivacao, RANGES.scale5, {
        integer: true,
      }),
      shoulderPain: ctx.n("ombro", v.ombro, RANGES.pain),
      kneePain: null,
      lumbarPain: ctx.n("lombar", v.lombar, RANGES.pain),
    },
    exercises,
    cardio: {
      done: String(v["cardio-fez"] ?? "").toLowerCase() === "sim",
      minutes: ctx.n(
        "cardio-minutos",
        v["cardio-minutos"],
        RANGES.cardioMinutes,
      ),
      speedMin: ctx.n("cardio-vel-min", v["cardio-vel-min"], RANGES.speedKmh),
      speedMax: ctx.n("cardio-vel-max", v["cardio-vel-max"], RANGES.speedKmh),
      distanceKm: ctx.n("cardio-km", km, RANGES.distanceKm),
    },
    post: {
      effort: null,
      performance: ctx.n("performance", v.performance, RANGES.scale5, {
        integer: true,
      }),
      finalFatigue: ctx.n("fadiga-final", v["fadiga-final"], RANGES.scale5, {
        integer: true,
      }),
      technique: ctx.n("tecnica", v.tecnica, RANGES.scale5, { integer: true }),
      rating: ctx.n("nota", v.nota, RANGES.rating10),
      notes:
        text(v["observacoes-gerais"]) ??
        text(v.observacoes) ??
        text(v.observacao),
    },
  };
  return {
    session: finish(
      ctx,
      base,
      obj,
      kind,
      obj.schema ?? "legacy",
      offsetMinutes,
    ),
  };
}

/** Esquema `bodygym.session.v9`. */
/** @param {any} obj @param {{offsetMinutes?: number}} [opts] */
export function fromBodygymV9(obj, { offsetMinutes } = {}) {
  const ctx = new Ctx();
  if (!WORKOUT_CODES.includes(obj.workout_code))
    return { errors: ["workout_code inválido"] };
  if (!isIsoDateTime(obj.captured_at))
    return { errors: ["captured_at ausente ou inválido"] };
  const ci = obj.checkin ?? {};
  const exercises = (Array.isArray(obj.exercises) ? obj.exercises : []).map(
    (e, i) => {
      const isTime = e.metric_type === "TIME";
      ctx.note(
        "sets: zeros de séries não concluídas mantidos; reps (TIME) e time_seconds (REPS) placeholders ignorados no campo normalizado",
      );
      return {
        order: e.order ?? i + 1,
        exerciseId: text(e.exercise_id)?.slice(0, 80) ?? undefined,
        label: text(e.exercise_label) ?? `Exercício ${i + 1}`,
        metric: isTime ? METRIC.TIME : METRIC.REPS,
        target:
          e.target && isObjNum(e.target)
            ? { sets: e.target.sets, min: e.target.min, max: e.target.max }
            : null,
        variantType: Object.values(VARIANT).includes(e.variant_type)
          ? e.variant_type
          : null,
        equipmentMatch: Object.values(EQUIPMENT).includes(e.equipment_match)
          ? e.equipment_match
          : EQUIPMENT.UNKNOWN,
        equipmentLabel: text(e.equipment_label),
        rirLastSet: ctx.n("rir_last_set", e.rir_last_set, RANGES.rir, {
          integer: true,
        }),
        perception: text(e.perception_code),
        notes: text(e.notes),
        sets: (Array.isArray(e.sets) ? e.sets : []).map((s, j) => ({
          setNumber: s.set_number ?? j + 1,
          loadKg: ctx.n("load_kg", s.load_kg, RANGES.loadKg),
          reps: isTime ? null : ctx.n("reps", s.reps, RANGES.reps),
          timeSeconds: isTime
            ? ctx.n("time_seconds", s.time_seconds, RANGES.timeSeconds)
            : null,
          rir: null,
          completed: s.completed === true,
        })),
      };
    },
  );
  const c = obj.cardio ?? {};
  const p = obj.post_workout ?? {};
  const base = {
    workoutCode: obj.workout_code,
    capturedAt: obj.captured_at,
    check: {
      energy: ctx.n("energy", ci.energy, RANGES.scale5, { integer: true }),
      sleep: ctx.n("sleep", ci.sleep, RANGES.scale5, { integer: true }),
      fatigue: ctx.n("pre_fatigue", ci.pre_fatigue, RANGES.scale5, {
        integer: true,
      }),
      motivation: ctx.n("motivation", ci.motivation, RANGES.scale5, {
        integer: true,
      }),
      shoulderPain: ctx.n("shoulder_pain", ci.shoulder_pain_0_10, RANGES.pain),
      kneePain: null,
      lumbarPain: ctx.n("lumbar_pain", ci.lumbar_pain_0_10, RANGES.pain),
    },
    exercises,
    cardio: {
      done: String(c.done ?? "").toUpperCase() === "YES",
      minutes: ctx.n("cardio.minutes", c.minutes, RANGES.cardioMinutes),
      speedMin: ctx.n("cardio.speed_min", c.speed_min_kmh, RANGES.speedKmh),
      speedMax: ctx.n("cardio.speed_max", c.speed_max_kmh, RANGES.speedKmh),
      distanceKm: ctx.n("cardio.distance", c.distance_km, RANGES.distanceKm),
    },
    post: {
      effort: null,
      performance: ctx.n("post.performance", p.performance, RANGES.scale5, {
        integer: true,
      }),
      finalFatigue: ctx.n(
        "post.final_fatigue",
        p.final_fatigue,
        RANGES.scale5,
        { integer: true },
      ),
      technique: ctx.n("post.technique", p.technique, RANGES.scale5, {
        integer: true,
      }),
      rating: ctx.n(
        "post.session_rating",
        p.session_rating_0_10,
        RANGES.rating10,
      ),
      notes: text(p.general_notes),
    },
  };
  return {
    session: finish(ctx, base, obj, "legacy_json", obj.schema, offsetMinutes),
  };
}

const isObjNum = (t) =>
  [t.sets, t.min, t.max].every((x) => typeof x === "number");

/** Registro do histórico do app offline v1/v2 (chave `adgymspace-offline-retorno-v1`). */
/** @param {any} rec @param {{offsetMinutes?: number}} [opts] */
export function fromOfflineV1Record(rec, { offsetMinutes } = {}) {
  const ctx = new Ctx();
  if (!WORKOUT_CODES.includes(rec?.day)) return { errors: ["day inválido"] };
  if (typeof rec.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(rec.date))
    return { errors: ["date inválida"] };
  const ck = rec.check ?? {};
  const ex = rec.extra ?? {};
  const exercises = (Array.isArray(rec.series) ? rec.series : []).map(
    (e, i) => {
      const label = String(e.exercise ?? `Exercício ${i + 1}`).slice(0, 200);
      const isTime = /prancha/i.test(label);
      if (isTime)
        ctx.note(
          'Prancha: campo único "reps/segundos" do app v1 interpretado como timeSeconds',
        );
      const sets = (Array.isArray(e.sets) ? e.sets : []).map((s, j) => {
        const v = ctx.n("reps", s.reps, RANGES.reps);
        return {
          setNumber: j + 1,
          loadKg: ctx.n("load", s.load, RANGES.loadKg),
          reps: isTime ? null : v,
          timeSeconds: isTime ? v : null,
          rir: ctx.n("rir", s.rir, RANGES.rir, { integer: true }),
          completed: s.done === true,
        };
      });
      return {
        order: i + 1,
        label,
        metric: isTime ? METRIC.TIME : METRIC.REPS,
        target: null,
        variantType: null,
        equipmentMatch: EQUIPMENT.UNKNOWN,
        equipmentLabel: null,
        rirLastSet: null,
        perception: null,
        notes: null,
        sets,
      };
    },
  );
  const capturedAt =
    Number.isFinite(rec.id) && rec.id > 0
      ? new Date(rec.id).toISOString()
      : `${rec.date}T12:00:00.000Z`;
  if (!(Number.isFinite(rec.id) && rec.id > 0))
    ctx.note("capturedAt: ausente no registro v1; usado meio-dia UTC da data");
  const base = {
    workoutCode: rec.day,
    capturedAt,
    check: {
      energy: ctx.n("energy", ck.energy, RANGES.scale5, { integer: true }),
      sleep: ctx.n("sleep", ck.sleep, RANGES.scale5, { integer: true }),
      fatigue: ctx.n("fatigue", ck.fatigue, RANGES.scale5, { integer: true }),
      motivation: null,
      shoulderPain: ctx.n("shoulder", ck.shoulder, RANGES.pain),
      kneePain: ctx.n("knee", ck.knee, RANGES.pain),
      lumbarPain: ctx.n("back", ck.back, RANGES.pain),
    },
    exercises,
    cardio: {
      done: ctx.n("cardio", ex.cardio, RANGES.cardioMinutes) > 0,
      minutes: ctx.n("cardio", ex.cardio, RANGES.cardioMinutes),
      speedMin: null,
      speedMax: null,
      distanceKm: null,
    },
    post: {
      effort: ctx.n("effort", ex.effort, RANGES.rating10),
      performance: null,
      finalFatigue: null,
      technique: null,
      rating: null,
      notes: text(ex.notes),
    },
  };
  const s = finish(
    ctx,
    base,
    rec,
    "offline_v1",
    "adgymspace-offline-retorno-v1",
    offsetMinutes,
  );
  s.mode = rec.mode === "full" ? MODE.REFERENCE : MODE.RETURN;
  s.date = rec.date; // a data do v1 já é local e escolhida pelo usuário
  s.transformations = s.transformations.filter((t) => !t.startsWith("date:"));
  s.id = `v1_${rec.id ?? checksum(canonicalStringify(rec))}`;
  return { session: s };
}
