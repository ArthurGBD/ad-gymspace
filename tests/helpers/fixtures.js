// Fixtures 100% sintéticas (valores inventados). Nunca copiar dados reais para cá.
export const legacyValores = (over = {}) => ({
  schema: "bodygym.session.v7",
  ciclo: 1,
  treino: "C",
  data: "2030-01-15T23:30:00.000Z",
  valores: {
    energia: "4",
    sono: "3",
    "cansaco-antes": "2",
    motivacao: "5",
    ombro: "7",
    lombar: "0",
    "e1-variante": "variant",
    "e1-s1-carga": "10",
    "e1-s1-reps": "16,5",
    "e1-s2-carga": "10",
    "e1-s2-reps": "",
    "e1-rir": "2",
    "e1-percepcao": "calm",
    "e2-s1-tempo": "40",
    "e2-s1-carga": "",
    "cardio-fez": "sim",
    "cardio-minutos": "12",
    performance: "4",
    nota: "8",
    "observacoes-gerais": "<img src=x onerror=alert(1)>",
    ...over,
  },
});
export const bodygymV9 = () => ({
  schema: "bodygym.session.v9",
  cycle_id: "c",
  workout_code: "A",
  captured_at: "2030-02-01T12:00:00.000Z",
  checkin: {
    energy: 3,
    sleep: 3,
    pre_fatigue: 2,
    motivation: 4,
    shoulder_pain_0_10: 1,
    lumbar_pain_0_10: 0,
  },
  exercises: [
    {
      order: 1,
      exercise_id: "x1",
      exercise_label: "Supino Teste",
      metric_type: "REPS",
      target: { sets: 3, min: 8, max: 12 },
      variant_type: "PLANNED",
      equipment_match: "SAME",
      equipment_label: "Barra",
      rir_last_set: 2,
      perception_code: "CALM",
      notes: "ok",
      sets: [
        {
          set_number: 1,
          load_kg: 20,
          reps: 12,
          time_seconds: 0,
          completed: true,
        },
        {
          set_number: 2,
          load_kg: 20,
          reps: 0,
          time_seconds: 0,
          completed: false,
        },
      ],
    },
    {
      order: 2,
      exercise_id: "x2",
      exercise_label: "Prancha Teste",
      metric_type: "TIME",
      target: { sets: 2, min: 30, max: 45 },
      variant_type: "PLANNED",
      equipment_match: "UNKNOWN",
      sets: [
        {
          set_number: 1,
          load_kg: 0,
          reps: 0,
          time_seconds: 35,
          completed: true,
        },
      ],
    },
  ],
  cardio: {
    done: "YES",
    minutes: 10,
    speed_min_kmh: 5,
    speed_max_kmh: 6,
    distance_km: 1,
  },
  post_workout: {
    performance: 4,
    final_fatigue: 3,
    technique: 4,
    session_rating_0_10: 8,
    general_notes: "sintético",
  },
});
export const offlineV1Backup = () => ({
  app: "AD GymSpace Offline Retorno",
  version: 1,
  exported_at: "2030-03-01T00:00:00.000Z",
  data: {
    history: [
      {
        id: 1893456000000,
        day: "B",
        title: "Treino B",
        date: "2030-01-01",
        mode: "return",
        check: {
          energy: 3,
          sleep: 4,
          fatigue: 2,
          shoulder: 0,
          knee: 1,
          back: 0,
        },
        extra: { effort: 6, cardio: 15, notes: "n" },
        series: [
          {
            exercise: "Remada Teste",
            sets: [{ load: 30, reps: 10, rir: 3, done: true }],
          },
          {
            exercise: "Prancha Frontal",
            sets: [{ load: 0, reps: 40, rir: "", done: true }],
          },
        ],
      },
    ],
  },
});
export const legacyCsv =
  '\uFEFFciclo;treino;data;campo;valor\r\n1;D;2030-01-20T10:00:00.000Z;e1-s1-carga;12\r\n1;D;2030-01-20T10:00:00.000Z;e1-s1-reps;"8,5"\r\n1;D;2030-01-20T10:00:00.000Z;observacoes;"linha1\nlinha2; com ""aspas"""\r\n';
export const memStorage = (opts = {}) => {
  const m = new Map();
  return {
    m,
    getItem: (k) => {
      if (opts.failRead) throw new Error("boom");
      return m.has(k) ? m.get(k) : null;
    },
    setItem: (k, v) => {
      if (opts.failWrite) throw new DOMException("quota", "QuotaExceededError");
      m.set(k, String(v));
    },
    removeItem: (k) => void m.delete(k),
  };
};
