import { LIMITS } from "../domain/constants.js";
import { inRange } from "../utils/numbers.js";

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/** Rejeita chaves perigosas e profundidade excessiva (prototype pollution / DoS). */
export function findUnsafeKey(value, depth = 0, path = "$") {
  if (depth > LIMITS.maxJsonDepth) return `${path}: profundidade excessiva`;
  if (value && typeof value === "object") {
    for (const k of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(k)) return `${path}.${k}: chave proibida`;
      const r = findUnsafeKey(value[k], depth + 1, `${path}.${k}`);
      if (r) return r;
    }
  }
  return null;
}

/** Coletor de erros/avisos com caminho. */
export function createReport() {
  const errors = [];
  const warnings = [];
  return {
    errors,
    warnings,
    err: (path, msg) => errors.push(`${path}: ${msg}`),
    warn: (path, msg) => warnings.push(`${path}: ${msg}`),
  };
}

export const isObj = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

export function str(
  r,
  path,
  v,
  { max = LIMITS.maxString, required = false, nullable = true } = {},
) {
  if (v === null || v === undefined) {
    if (required || !nullable) r.err(path, "obrigatório");
    return null;
  }
  if (typeof v !== "string") {
    r.err(path, "deve ser texto");
    return null;
  }
  if (v.length > max) {
    r.err(path, `texto excede ${max} caracteres`);
    return null;
  }
  return v;
}

export function numIn(r, path, v, range, { integer = false } = {}) {
  if (v === null || v === undefined) return null;
  if (typeof v !== "number" || !Number.isFinite(v)) {
    r.err(path, "deve ser número");
    return null;
  }
  if (!inRange(v, range)) {
    r.err(path, `fora do intervalo ${range[0]}–${range[1]}`);
    return null;
  }
  if (integer && !Number.isInteger(v)) {
    r.err(path, "deve ser inteiro");
    return null;
  }
  return v;
}

export function oneOf(r, path, v, options, { nullable = false } = {}) {
  if ((v === null || v === undefined) && nullable) return null;
  if (!options.includes(v)) {
    r.err(path, `valor inválido (${options.join("|")})`);
    return null;
  }
  return v;
}
