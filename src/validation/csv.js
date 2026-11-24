import { LIMITS } from "../domain/constants.js";
import { AppError, ERR } from "../services/errors.js";

/** Parser CSV (RFC 4180 + delimitador configurável, aspas e quebras de linha em campos). */
export function parseCsv(text, delimiter = ";") {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
      if (rows.length > LIMITS.maxCsvRows)
        throw new AppError(ERR.IMPORT_TOO_LARGE, {
          details: { rows: rows.length },
        });
    } else field += c;
  }
  if (inQuotes)
    throw new AppError(ERR.IMPORT_NOT_JSON, {
      message: "CSV com aspas não fechadas.",
    });
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Evita injeção de fórmulas em planilhas: prefixa texto iniciado por = + - @ TAB CR. */
export function csvCell(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v);
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export const toCsv = (rows) =>
  rows.map((r) => r.map(csvCell).join(";")).join("\r\n");
