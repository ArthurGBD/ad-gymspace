import {
  BACKUP_FORMAT,
  LEGACY_OFFLINE_APP,
  LIMITS,
  SCHEMA_VERSION,
} from "../domain/constants.js";
import { AppError, ERR } from "../services/errors.js";
import { canonicalStringify, checksum } from "../utils/hash.js";
import { parseCsv } from "./csv.js";
import {
  fromBodygymV9,
  fromLegacyValores,
  fromOfflineV1Record,
} from "./legacy.js";
import { findUnsafeKey, isObj } from "./primitives.js";
import { preserveUnknown, validateSession } from "./session.js";

/** Impressão digital de conteúdo para detectar duplicatas com ids diferentes. */
export function fingerprint(s) {
  return checksum(
    canonicalStringify({
      c: s.capturedAt,
      w: s.workoutCode,
      d: s.date,
      e: s.exercises,
    }),
  );
}

export function checkSize(bytes) {
  if (bytes > LIMITS.maxImportBytes)
    throw new AppError(ERR.IMPORT_TOO_LARGE, { details: { bytes } });
}

export function parseJsonText(text) {
  checkSize(text.length);
  let data;
  try {
    data = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch {
    throw new AppError(ERR.IMPORT_NOT_JSON);
  }
  const unsafe = findUnsafeKey(data);
  if (unsafe)
    throw new AppError(ERR.IMPORT_SCHEMA, { details: { reason: unsafe } });
  return data;
}

/** CSV legado (ciclo;treino;data;campo;valor) -> objeto legado equivalente ao JSON. */
export function legacyCsvToObject(text) {
  const rows = parseCsv(text, ";");
  const head = (rows[0] ?? []).map((x) => x.trim().toLowerCase());
  if (head.join(",") !== "ciclo,treino,data,campo,valor")
    throw new AppError(ERR.IMPORT_SCHEMA);
  const valores = Object.create(null);
  for (const r of rows.slice(1)) valores[r[3]] = r[4] ?? "";
  const first = rows[1] ?? [];
  return {
    schema: "legacy.csv",
    ciclo: first[0],
    treino: first[1],
    data: first[2],
    valores: { ...valores },
  };
}

export function detect(data) {
  if (isObj(data) && data.format === BACKUP_FORMAT) return "backup";
  if (isObj(data) && data.app === LEGACY_OFFLINE_APP) return "offline_v1";
  if (isObj(data) && data.schema === "bodygym.session.v9") return "bodygym_v9";
  if (
    isObj(data) &&
    typeof data.schema === "string" &&
    data.schema.startsWith("bodygym") &&
    isObj(data.valores)
  )
    return "bodygym_valores";
  if (isObj(data) && data.treino && isObj(data.valores))
    return "bodygym_valores";
  return null;
}

/**
 * Normaliza conteúdo importado em sessões canônicas válidas.
 * @param {any} data @param {{offsetMinutes?: number}} [opts]
 * @returns {{format:string, sessions:any[], rejected:{item:any,errors:string[]}[], warnings:string[]}}
 */
export function normalizeImport(data, { offsetMinutes } = {}) {
  const format = detect(data);
  if (!format) throw new AppError(ERR.IMPORT_SCHEMA);
  const sessions = [];
  const rejected = [];
  const warnings = [];
  const accept = (s, original) => {
    const v = validateSession(s);
    if (!v.ok) return void rejected.push({ item: original, errors: v.errors });
    warnings.push(...v.warnings);
    sessions.push(s);
  };
  const legacy = (res, original) =>
    res.errors
      ? rejected.push({ item: original, errors: res.errors })
      : accept(res.session, original);

  if (format === "backup") {
    if (data.schemaVersion > SCHEMA_VERSION)
      throw new AppError(ERR.IMPORT_VERSION);
    if (!Array.isArray(data.sessions))
      throw new AppError(ERR.IMPORT_SCHEMA, {
        details: { reason: "sessions ausente" },
      });
    if (data.sessions.length > LIMITS.maxSessions)
      throw new AppError(ERR.IMPORT_TOO_LARGE, {
        details: { count: data.sessions.length },
      });
    if (
      data.checksum &&
      data.checksum !== checksum(canonicalStringify(data.sessions))
    ) {
      warnings.push(
        "checksum do backup não confere: arquivo pode ter sido alterado ou corrompido",
      );
    }
    for (const s of data.sessions) accept(isObj(s) ? preserveUnknown(s) : s, s);
  } else if (format === "offline_v1") {
    const hist = data.data?.history;
    if (!Array.isArray(hist))
      throw new AppError(ERR.IMPORT_SCHEMA, {
        details: { reason: "history ausente" },
      });
    if (hist.length > LIMITS.maxSessions)
      throw new AppError(ERR.IMPORT_TOO_LARGE, {
        details: { count: hist.length },
      });
    for (const rec of hist)
      legacy(fromOfflineV1Record(rec ?? {}, { offsetMinutes }), rec);
  } else if (format === "bodygym_v9") {
    legacy(fromBodygymV9(data, { offsetMinutes }), data);
  } else {
    legacy(fromLegacyValores(data, { offsetMinutes }), data);
  }
  return { format, sessions, rejected, warnings: [...new Set(warnings)] };
}

/** Detecta JSON vs CSV pelo nome/conteúdo e normaliza. */
export function importText(text, filename = "", opts) {
  const isCsv = /\.csv$/i.test(filename) || /^\uFEFF?ciclo;/i.test(text);
  checkSize(text.length);
  return normalizeImport(
    isCsv ? legacyCsvToObject(text) : parseJsonText(text),
    opts,
  );
}
