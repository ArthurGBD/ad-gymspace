import { LIMITS } from "../domain/constants.js";

export const LEVELS = Object.freeze({
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
});

// Campos que nunca são registrados (podem conter dados pessoais ou payloads de sessão).
const BLOCKED_KEYS =
  /note|obs|payload|check|sets|exercises|post|cardio|raw|label|text|body|content|data|session|draft/i;

/** Mantém apenas escalares curtos; objetos/arrays viram contagens. */
export function sanitizeContext(ctx) {
  const out = {};
  if (!ctx || typeof ctx !== "object") return out;
  for (const [k, v] of Object.entries(ctx)) {
    if (BLOCKED_KEYS.test(k) && !/^(count|total)/i.test(k)) continue;
    if (typeof v === "number" || typeof v === "boolean" || v === null)
      out[k] = v;
    else if (typeof v === "string")
      out[k] = v.length > 80 ? `${v.slice(0, 80)}…` : v;
  }
  return out;
}

/**
 * Logger estruturado local. Sem serviços externos.
 * @param {{level?: number, sink?: (e:object)=>void, persist?: Storage|null, key?: string, clock?: ()=>number}} [opts]
 */
export function createLogger(opts = {}) {
  const {
    level = LEVELS.INFO,
    sink = null,
    persist = null,
    key = "adgymspace.log",
    clock = Date.now,
  } = opts;
  /** @type {object[]} */
  let buffer = [];
  if (persist) {
    try {
      const parsed = JSON.parse(persist.getItem(key) ?? "[]");
      if (Array.isArray(parsed)) buffer = parsed.slice(-LIMITS.maxLogEntries);
    } catch {
      buffer = [];
    }
  }
  let currentLevel = level;

  function write(name, event, ctx = {}) {
    if (LEVELS[name] < currentLevel) return;
    const entry = {
      t: new Date(clock()).toISOString(),
      level: name,
      event,
      ...sanitizeContext(ctx),
    };
    buffer.push(entry);
    if (buffer.length > LIMITS.maxLogEntries)
      buffer = buffer.slice(-LIMITS.maxLogEntries);
    if (persist && LEVELS[name] >= LEVELS.INFO) {
      try {
        persist.setItem(key, JSON.stringify(buffer));
      } catch {
        /* o log nunca pode derrubar o app */
      }
    }
    if (sink) sink(entry);
  }

  return {
    debug: (e, c) => write("DEBUG", e, c),
    info: (e, c) => write("INFO", e, c),
    warn: (e, c) => write("WARN", e, c),
    error: (e, c) => write("ERROR", e, c),
    /** Registra um AppError com código (sem mensagem livre do usuário). */
    errorCode: (event, err, ctx = {}) =>
      write("ERROR", event, { ...ctx, code: err?.code ?? "AD-UNX-001" }),
    setLevel: (l) => {
      currentLevel = l;
    },
    entries: () => buffer.slice(),
    clear: () => {
      buffer = [];
      try {
        persist?.removeItem(key);
      } catch {
        /* ignore */
      }
    },
    exportText: () => buffer.map((e) => JSON.stringify(e)).join("\n"),
  };
}
