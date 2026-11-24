const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Data local (YYYY-MM-DD) sem depender de UTC. */
export function localDateString(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Valida data de calendário real (rejeita 2026-02-30). */
export function isIsoDate(s) {
  if (typeof s !== "string") return false;
  const m = ISO_DATE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === mo - 1 &&
    dt.getUTCDate() === d
  );
}

export function isIsoDateTime(s) {
  return (
    typeof s === "string" &&
    s.length <= 40 &&
    /^\d{4}-\d{2}-\d{2}T/.test(s) &&
    !Number.isNaN(Date.parse(s))
  );
}

export const formatDateBR = (iso) =>
  isIsoDate(iso) ? iso.split("-").reverse().join("/") : "—";

/**
 * Converte instante ISO em data local.
 * @param {string} iso
 * @param {number} [offsetMinutes] minutos como em Date#getTimezoneOffset (UTC-3 => 180)
 */
export function localDateFromIso(iso, offsetMinutes) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const off = offsetMinutes ?? new Date(t).getTimezoneOffset();
  return new Date(t - off * 60000).toISOString().slice(0, 10);
}

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}
