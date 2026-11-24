import { STATUS } from "./constants.js";
import { AppError, ERR } from "../services/errors.js";

/** Transições válidas da máquina de estados do treino. */
export const TRANSITIONS = Object.freeze({
  [STATUS.NOT_STARTED]: [STATUS.IN_PROGRESS, STATUS.CANCELLED],
  [STATUS.IN_PROGRESS]: [STATUS.PAUSED, STATUS.COMPLETED, STATUS.CANCELLED],
  [STATUS.PAUSED]: [STATUS.IN_PROGRESS, STATUS.CANCELLED],
  [STATUS.COMPLETED]: [],
  [STATUS.CANCELLED]: [],
});

export const isTerminal = (s) =>
  s === STATUS.COMPLETED || s === STATUS.CANCELLED;
export const canTransition = (from, to) =>
  (TRANSITIONS[from] ?? []).includes(to);

/**
 * Aplica transição e atualiza marcas de tempo; retorna novo rascunho (imutável).
 * @param {any} draft
 * @param {string} to
 * @param {number} [nowMs]
 */
export function transition(draft, to, nowMs = Date.now()) {
  if (!canTransition(draft.status, to)) {
    throw new AppError(ERR.STATE_TRANSITION, {
      details: { from: draft.status, to },
    });
  }
  const iso = new Date(nowMs).toISOString();
  const next = { ...draft, status: to };
  if (to === STATUS.IN_PROGRESS) {
    if (draft.status === STATUS.NOT_STARTED) next.startedAt = iso;
    if (draft.status === STATUS.PAUSED && draft.pausedAt) {
      next.pausedTotalMs =
        (draft.pausedTotalMs ?? 0) +
        Math.max(0, nowMs - Date.parse(draft.pausedAt));
      next.pausedAt = null;
    }
  } else if (to === STATUS.PAUSED) {
    next.pausedAt = iso;
  } else if (isTerminal(to)) {
    next.endedAt = iso;
    if (draft.status === STATUS.PAUSED && draft.pausedAt) {
      next.pausedTotalMs =
        (draft.pausedTotalMs ?? 0) +
        Math.max(0, nowMs - Date.parse(draft.pausedAt));
      next.pausedAt = null;
    }
  }
  return next;
}

/** Duração ativa (sem pausas) em segundos. */
export function activeDurationSeconds(draft, nowMs = Date.now()) {
  if (!draft.startedAt) return 0;
  const end = draft.endedAt
    ? Date.parse(draft.endedAt)
    : draft.pausedAt
      ? Date.parse(draft.pausedAt)
      : nowMs;
  return Math.max(
    0,
    Math.round(
      (end - Date.parse(draft.startedAt) - (draft.pausedTotalMs ?? 0)) / 1000,
    ),
  );
}
