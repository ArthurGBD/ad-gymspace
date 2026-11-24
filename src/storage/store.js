import { LIMITS, SCHEMA_VERSION } from "../domain/constants.js";
import { AppError, ERR, toAppError } from "../services/errors.js";
import { newId } from "../utils/ids.js";
import { fingerprint } from "../validation/importer.js";
import { validateSession } from "../validation/session.js";

export const KEYS = {
  sessions: "adgymspace.v2.sessions",
  draft: "adgymspace.v2.draft",
  meta: "adgymspace.v2.meta",
  quarantine: "adgymspace.v2.quarantine",
  snapshot: "adgymspace.v2.preimport",
  recoverable: "adgymspace.v2.recoverable",
  corrupt: "adgymspace.v2.corrupt.",
  legacyV1: "adgymspace-offline-retorno-v1",
};

/**
 * Persistência desacoplada: recebe qualquer objeto com getItem/setItem/removeItem.
 * Dados corrompidos são preservados em chave `corrupt.*` (nunca descartados em silêncio).
 */
export function createStore({ storage, logger, now = () => Date.now() }) {
  const readRaw = (key) => {
    try {
      return storage.getItem(key);
    } catch (cause) {
      throw new AppError(ERR.STORAGE_READ, { cause });
    }
  };
  const writeRaw = (key, value) => {
    try {
      storage.setItem(key, value);
    } catch (cause) {
      logger?.error("storage.write_failed", {
        key,
        code: ERR.STORAGE_WRITE[0],
      });
      throw new AppError(ERR.STORAGE_WRITE, { cause });
    }
  };

  function readJson(key, fallback) {
    const raw = readRaw(key);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      try {
        storage.setItem(`${KEYS.corrupt}${now()}`, raw);
      } catch {
        /* sem espaço: mantém original no lugar */
      }
      logger?.error("storage.corrupt", {
        key,
        bytes: raw.length,
        code: ERR.STORAGE_READ[0],
      });
      return { __corrupt: true, fallback };
    }
  }

  const loadJson = (key, fallback) => {
    const v = readJson(key, fallback);
    return v && v.__corrupt
      ? { value: v.fallback, corrupted: true }
      : { value: v, corrupted: false };
  };

  function loadSessions() {
    const { value, corrupted } = loadJson(KEYS.sessions, []);
    const list = Array.isArray(value) ? value : [];
    const sessions = [];
    const invalid = [];
    for (const s of list) (validateSession(s).ok ? sessions : invalid).push(s);
    if (invalid.length) {
      logger?.warn("storage.invalid_sessions", {
        count: invalid.length,
        code: ERR.VALIDATION[0],
      });
      saveQuarantine(
        invalid.map((item) => ({ item, errors: ["inválida ao carregar"] })),
      );
    }
    return { sessions, corrupted, invalidCount: invalid.length };
  }

  const persistSessions = (sessions) =>
    writeRaw(KEYS.sessions, JSON.stringify(sessions));

  function saveQuarantine(entries) {
    const cur = loadJson(KEYS.quarantine, []).value;
    const merged = [...(Array.isArray(cur) ? cur : []), ...entries].slice(
      -LIMITS.maxQuarantine,
    );
    writeRaw(KEYS.quarantine, JSON.stringify(merged));
  }

  /** Salva sessão finalizada; id repetido = no-op (evita duplicação por duplo clique). */
  function addSession(session) {
    const { sessions } = loadSessions();
    if (sessions.some((s) => s.id === session.id)) {
      logger?.warn("session.duplicate_blocked", { code: ERR.DUPLICATE[0] });
      return { added: false, sessions };
    }
    const next = [...sessions, session];
    persistSessions(next);
    return { added: true, sessions: next };
  }

  function softDelete(id) {
    const { sessions } = loadSessions();
    const next = sessions.map((s) =>
      s.id === id ? { ...s, deletedAt: new Date(now()).toISOString() } : s,
    );
    persistSessions(next);
    return next;
  }
  function restore(id) {
    const { sessions } = loadSessions();
    const next = sessions.map((s) => {
      if (s.id !== id) return s;
      const { deletedAt: _d, ...rest } = s;
      return rest;
    });
    persistSessions(next);
    return next;
  }
  function purge(id) {
    const { sessions } = loadSessions();
    const next = sessions.filter((s) => !(s.id === id && s.deletedAt));
    persistSessions(next);
    return next;
  }

  /** Mescla importação: snapshot prévio, dedupe por id e por fingerprint. */
  function mergeImport({ sessions: incoming, rejected = [] }) {
    const { sessions: current } = loadSessions();
    writeRaw(
      KEYS.snapshot,
      JSON.stringify({ at: new Date(now()).toISOString(), sessions: current }),
    );
    const ids = new Set(current.map((s) => s.id));
    const prints = new Set(current.map(fingerprint));
    const added = [];
    let duplicates = 0;
    for (const s of incoming) {
      const fp = fingerprint(s);
      if (ids.has(s.id) || prints.has(fp)) {
        duplicates++;
        continue;
      }
      ids.add(s.id);
      prints.add(fp);
      added.push({
        ...s,
        source: { ...s.source, importedAt: new Date(now()).toISOString() },
      });
    }
    if (added.length) persistSessions([...current, ...added]);
    if (rejected.length) saveQuarantine(rejected);
    return { added: added.length, duplicates, rejected: rejected.length };
  }

  function restoreSnapshot() {
    const snap = loadJson(KEYS.snapshot, null).value;
    if (!snap || !Array.isArray(snap.sessions))
      throw new AppError(ERR.NOT_FOUND);
    persistSessions(snap.sessions);
    return snap.sessions;
  }

  // Rascunho
  const loadDraft = () => loadJson(KEYS.draft, null);
  const saveDraft = (draft) => writeRaw(KEYS.draft, JSON.stringify(draft));
  const clearDraft = () => {
    try {
      storage.removeItem(KEYS.draft);
    } catch (cause) {
      throw new AppError(ERR.STORAGE_WRITE, { cause });
    }
  };
  function stashDiscarded(draft) {
    const cur = loadJson(KEYS.recoverable, []).value;
    const list = [
      ...(Array.isArray(cur) ? cur : []),
      { discardedAt: new Date(now()).toISOString(), draft },
    ].slice(-LIMITS.maxRecoverableDrafts);
    writeRaw(KEYS.recoverable, JSON.stringify(list));
  }
  const listRecoverable = () => {
    const v = loadJson(KEYS.recoverable, []).value;
    return Array.isArray(v) ? v : [];
  };
  function takeRecoverable(index) {
    const list = listRecoverable();
    const [item] = list.splice(index, 1);
    if (!item) throw new AppError(ERR.NOT_FOUND);
    writeRaw(KEYS.recoverable, JSON.stringify(list));
    return item.draft;
  }

  // Meta (tema, migração)
  const loadMeta = () => {
    const v = loadJson(KEYS.meta, {}).value;
    return v && typeof v === "object" ? v : {};
  };
  const saveMeta = (m) => writeRaw(KEYS.meta, JSON.stringify(m));
  const legacyV1Raw = () => readRaw(KEYS.legacyV1);

  return {
    loadSessions,
    addSession,
    softDelete,
    restore,
    purge,
    mergeImport,
    restoreSnapshot,
    loadDraft,
    saveDraft,
    clearDraft,
    stashDiscarded,
    listRecoverable,
    takeRecoverable,
    loadMeta,
    saveMeta,
    legacyV1Raw,
    listQuarantine: () => loadJson(KEYS.quarantine, []).value,
    SCHEMA_VERSION,
    newId,
    toAppError,
  };
}
