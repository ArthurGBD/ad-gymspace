/**
 * Converte entrada de formulário/legado em número.
 * Aceita vírgula decimal ("16,5"). Retorna null para vazio e NaN para inválido.
 * @param {unknown} v
 * @returns {number|null}
 */
export function parseDecimal(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  if (typeof v !== "string") return NaN;
  const s = v.trim().replace(",", ".");
  if (s === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s);
}

export const inRange = (n, [min, max]) =>
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;

export const round1 = (n) => Math.round(n * 10) / 10;

export function formatNumberBR(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return String(round1(n)).replace(".", ",");
}
