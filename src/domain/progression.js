import { EQUIPMENT, METRIC, MODE } from "./constants.js";
import { parseDecimal } from "../utils/numbers.js";

/**
 * Duas execuções são comparáveis diretamente apenas se o equipamento/variante não for
 * declaradamente diferente. UNKNOWN é tratado como "indicativo" (comparável com ressalva).
 */
export function comparability(prev, curr) {
  if (!prev || !curr) return { comparable: false, reason: "sem-referencia" };
  if (
    prev.equipmentMatch === EQUIPMENT.DIFFERENT ||
    curr.equipmentMatch === EQUIPMENT.DIFFERENT
  ) {
    return { comparable: false, reason: "equipamento-diferente" };
  }
  if (prev.variantType !== curr.variantType)
    return { comparable: false, reason: "variante-diferente" };
  const caveat =
    prev.equipmentMatch === EQUIPMENT.UNKNOWN ||
    curr.equipmentMatch === EQUIPMENT.UNKNOWN;
  return {
    comparable: true,
    reason: caveat ? "equipamento-desconhecido" : "ok",
  };
}

const n = (v) => {
  const x = parseDecimal(v);
  return x === null || Number.isNaN(x) ? null : x;
};

/**
 * Sugestão do SISTEMA (não é regra do plano histórico nem dado do usuário). Nunca aplicada automaticamente.
 * Regra conservadora: só sugere progredir se todas as séries foram concluídas, no topo da faixa,
 * com RIR final ≥ 1 e sem desconforto relevante. Em modo retorno não há sugestão.
 * @param {{sets:any[], metric:string, target:{min:number,max:number}, equipmentMatch:string, variantType:string}} prev
 * @param {{mode?: string, pain?: number}} ctx
 */
export function suggestNext(prev, ctx = {}) {
  const base = { source: "SYSTEM_SUGGESTION" };
  if (ctx.mode === MODE.RETURN)
    return { ...base, action: "NONE", reason: "modo-retorno" };
  if (prev.metric === METRIC.TIME)
    return { ...base, action: "NONE", reason: "exercicio-por-tempo" };
  if ((ctx.pain ?? 0) >= 4)
    return {
      ...base,
      action: "REVIEW_DISCOMFORT",
      reason: "desconforto-relevante",
    };
  const done = prev.sets.filter((s) => s.completed);
  if (!done.length || done.length < prev.sets.length)
    return { ...base, action: "MAINTAIN", reason: "series-incompletas" };
  const reps = done.map((s) => n(s.reps));
  if (reps.some((r) => r === null))
    return { ...base, action: "MAINTAIN", reason: "dados-incompletos" };
  const lastRir = n(done[done.length - 1].rir);
  const allTop = reps.every((r) => r >= prev.target.max);
  if (allTop && lastRir !== null && lastRir >= 1)
    return { ...base, action: "INCREASE_LOAD", reason: "topo-da-faixa" };
  if (reps.every((r) => r >= prev.target.min))
    return { ...base, action: "INCREASE_REPS", reason: "dentro-da-faixa" };
  return { ...base, action: "MAINTAIN", reason: "abaixo-da-faixa" };
}
