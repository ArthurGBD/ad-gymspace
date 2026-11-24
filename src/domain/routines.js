import { METRIC } from "./constants.js";

/**
 * Plano de treinos A–E.
 * provenance:
 *  - "recovered-history": exercício/séries/faixa presentes em registros históricos (A: schema v9 com `target`).
 *  - "reconstruction": faixa indicativa da reconstrução offline v2 (nov/2026); NÃO é meta histórica verificada.
 * São "referências do plano", editáveis pelo usuário durante a sessão; o app não as trata como prescrição.
 */
const ex = (label, sets, min, max, muscle, extra = {}) => ({
  id: label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, ""),
  label,
  sets,
  min,
  max,
  muscle,
  metric: extra.metric ?? METRIC.REPS,
  provenance: extra.provenance ?? "reconstruction",
});
const T = { metric: METRIC.TIME };
const H = { provenance: "recovered-history" };

export const ROUTINES = Object.freeze({
  A: {
    code: "A",
    title: "Peito + bíceps",
    note: "Referência da 2ª passagem de 27/08/2026. No retorno, use as cargas antigas só como referência.",
    exercises: [
      ex("Supino Plano na Máquina", 4, 6, 8, "Peitoral", H),
      ex("Supino Inclinado na Máquina", 3, 8, 10, "Peitoral superior", H),
      ex("Crucifixo na Máquina (Peck Deck)", 2, 10, 15, "Peitoral", H),
      ex("Rosca Scott", 3, 8, 12, "Bíceps", H),
      ex("Rosca Martelo com Halteres", 3, 10, 12, "Bíceps/braquial", H),
      ex("Flexão de Punho na Polia com Apoio", 2, 12, 15, "Antebraço", H),
      ex("Prancha Frontal", 3, 30, 45, "Core", { ...H, ...T }),
    ],
  },
  B: {
    code: "B",
    title: "Pernas",
    note: "Exercícios/séries recuperados do histórico. Faixas de repetições são indicativas, não metas originais verificadas.",
    exercises: [
      ex("Leg Press / Hack", 3, 8, 12, "Quadríceps/glúteos"),
      ex("Hack Leg / Hack Squat", 3, 8, 12, "Quadríceps"),
      ex("Cadeira Flexora", 3, 8, 12, "Posteriores"),
      ex("Cadeira Extensora", 2, 10, 15, "Quadríceps"),
      ex("Cadeira Abdutora", 2, 10, 15, "Glúteos"),
      ex("Panturrilha Sentada", 3, 10, 15, "Panturrilha"),
    ],
  },
  C: {
    code: "C",
    title: "Costas + tríceps",
    note: "Recuperado do relatório de 20/08/2026. Ajuste ou substitua puxadas se houver desconforto no ombro.",
    exercises: [
      ex("Pulldown na Polia com Pegada Neutra Fechada", 3, 8, 12, "Dorsais"),
      ex("Remada com Peito Apoiado na Máquina", 3, 8, 12, "Costas"),
      ex("Pulldown com Corda e Braços Estendidos", 2, 10, 15, "Dorsais"),
      ex("Tríceps na Polia com Barra", 3, 10, 12, "Tríceps"),
      ex("Extensão de Tríceps Acima da Cabeça na Polia", 2, 10, 12, "Tríceps"),
    ],
  },
  D: {
    code: "D",
    title: "Peito + bíceps (variações)",
    note: "Recuperado do relatório de 24/08/2026. Atenção ao ombro nos movimentos de supino.",
    exercises: [
      ex("Supino Inclinado com Halteres", 3, 8, 12, "Peito superior"),
      ex("Chest Press na Máquina", 3, 8, 12, "Peito"),
      ex("Crucifixo no Cabo", 2, 10, 15, "Peito"),
      ex("Rosca Direta com Barra", 3, 8, 12, "Bíceps"),
      ex("Rosca Inclinada com Halteres", 2, 10, 12, "Bíceps"),
    ],
  },
  E: {
    code: "E",
    title: "Posteriores + glúteos",
    note: "Plano mais recente recuperado (27/08/2026), costas em manutenção. Versões anteriores do E divergem.",
    exercises: [
      ex("Cadeira Flexora", 3, 8, 12, "Posteriores"),
      ex("Elevação Pélvica no Smith", 3, 8, 12, "Glúteos"),
      ex("Leg Press 45°", 2, 10, 12, "Pernas"),
      ex("Remada com Peito Apoiado", 2, 10, 12, "Costas"),
      ex("Panturrilha no Leg Press", 3, 10, 15, "Panturrilha"),
      ex("Prancha Frontal", 3, 30, 45, "Core", T),
    ],
  },
});

/** Dia sugerido ao abrir o app: o treino seguinte ao último concluído (sugestão, não obrigação). */
export function suggestNextWorkout(sessions) {
  const codes = Object.keys(ROUTINES);
  const last = sessions
    .filter(
      (s) =>
        s.status === "COMPLETED" &&
        !s.deletedAt &&
        codes.includes(s.workoutCode),
    )
    .sort((a, b) =>
      (b.completedAt ?? b.date).localeCompare(a.completedAt ?? a.date),
    )[0];
  if (!last) return "A";
  return codes[(codes.indexOf(last.workoutCode) + 1) % codes.length];
}
