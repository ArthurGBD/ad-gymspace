import {
  MODE,
  REST_PRESETS,
  STATUS,
  WORKOUT_CODES,
} from "../domain/constants.js";
import { ROUTINES, suggestNextWorkout } from "../domain/routines.js";
import {
  addSet,
  createDraft,
  hasProgress,
  removeLastEmptySet,
  updateExercise,
  updateSection,
  updateSet,
} from "../domain/draft.js";
import { transition } from "../domain/workoutState.js";
import {
  exerciseProgress,
  restRemaining,
  setCounts,
  sessionVolume,
} from "../domain/metrics.js";
import { draftToSession } from "../domain/session.js";
import { exerciseSeries, distinctExercises } from "../domain/analytics.js";
import { suggestNext } from "../domain/progression.js";
import { getExerciseInfo } from "../domain/exerciseCatalog.js";
import { estimateMinutes, lastCompleted, plannedSets } from "../domain/plan.js";
import { loadChart } from "../components/loadChart.js";
import { exerciseMedia } from "../components/exerciseMedia.js";
import { exerciseInstructions } from "../components/exerciseInstructions.js";
import { toAppError, AppError, ERR } from "../services/errors.js";
import { buildBackup, buildCsv, summaryText } from "../services/exporter.js";
import { importText } from "../validation/importer.js";
import { formatDateBR, formatDuration } from "../utils/dates.js";
import { clear, h, icon } from "../utils/dom.js";

const CHECK_FIELDS = [
  ["energy", "Energia (1–5)", 1, 5],
  ["sleep", "Sono (1–5)", 1, 5],
  ["fatigue", "Cansaço (1–5)", 1, 5],
  ["motivation", "Motivação (1–5)", 1, 5],
  ["shoulderPain", "Ombro (0–10)", 0, 10],
  ["kneePain", "Joelho (0–10)", 0, 10],
  ["lumbarPain", "Lombar (0–10)", 0, 10],
];
const SUGGESTION_TEXT = {
  INCREASE_LOAD: "aumentar a carga (topo da faixa com RIR ≥ 1)",
  INCREASE_REPS: "tentar mais repetições mantendo a carga",
  MAINTAIN: "manter carga e repetições",
  REVIEW_DISCOMFORT: "revisar o desconforto antes de progredir",
};
const SAVE_DEBOUNCE_MS = 250;
const PAGE = 20;

/** @param {any} deps */
export function createApp({
  root,
  store,
  logger,
  clock = Date.now,
  download = defaultDownload,
}) {
  /** @type {any} */
  const state = {
    tab: "today",
    view: "home",
    draft: null,
    sessions: [],
    day: "A",
    selectedPreview: null,
    mode: MODE.RETURN,
    date: "",
    historyLimit: PAGE,
    evoKey: "",
    banner: null,
    theme: "dark",
    trash: false,
  };
  let saveTimer = null;
  let tick = null;
  /** @type {number|null} segundos restantes de um descanso pausado (não persistido) */
  let restHold = null;

  // ---------- infra ----------
  const main = h("main", { id: "main", tabindex: "-1" });
  const toasts = h("div", {
    class: "toasts",
    role: "status",
    "aria-live": "polite",
  });
  const bannerEl = h("div", { class: "banner", role: "alert", hidden: true });
  const nav = h("nav", { class: "bottom-nav", "aria-label": "Principal" });
  const header = h(
    "header",
    { class: "app-header" },
    h("span", { class: "brand" }, "AD ", h("b", null, "GymSpace")),
  );
  root.append(header, bannerEl, main, nav, toasts);

  function toast(msg, kind = "ok", code) {
    const t = h(
      "div",
      { class: `toast toast-${kind}` },
      msg,
      code ? h("small", null, ` (${code})`) : null,
    );
    toasts.append(t);
    setTimeout(() => t.remove(), kind === "error" ? 15000 : 3500);
  }
  function fail(event, e) {
    const err = toAppError(e);
    const fields = Array.isArray(err.details?.fields) ? err.details.fields : [];
    logger.error(event, {
      code: err.code,
      fields: fields.map((f) => String(f).split(":")[0]).slice(0, 10),
    });
    toast(
      fields.length
        ? `${err.userMessage} Campos: ${fields.slice(0, 4).join("; ")}${fields.length > 4 ? "…" : ""}`
        : err.userMessage,
      "error",
      err.code,
    );
    return err;
  }
  function showBanner(msg) {
    state.banner = msg;
    bannerEl.hidden = !msg;
    bannerEl.textContent = msg ?? "";
  }
  function guard(event, fn) {
    try {
      return fn();
    } catch (e) {
      if (e instanceof AppError && e.code === ERR.STORAGE_WRITE[0])
        showBanner(`${e.userMessage} (${e.code})`);
      fail(event, e);
      return undefined;
    }
  }

  function confirmDialog({ title, body, confirmLabel, danger = false }) {
    return new Promise((resolve) => {
      let settled = false;
      const settle = (value) => {
        if (settled) return;
        settled = true;
        if (dlg.open && typeof dlg.close === "function") dlg.close();
        dlg.remove();
        resolve(value);
      };
      const dlg = h(
        "dialog",
        { class: "dialog", "aria-labelledby": "dlg-title" },
        h("h2", { id: "dlg-title" }, title),
        h("p", null, body),
        h(
          "div",
          { class: "row end" },
          h(
            "button",
            {
              class: "btn",
              type: "button",
              "data-testid": "dlg-cancel",
              onclick: () => settle(false),
            },
            "Cancelar",
          ),
          h(
            "button",
            {
              class: `btn ${danger ? "btn-danger" : "btn-primary"}`,
              type: "button",
              "data-testid": "dlg-ok",
              onclick: () => settle(true),
            },
            confirmLabel,
          ),
        ),
      );
      dlg.addEventListener("cancel", () => settle(false));
      root.append(dlg);
      if (typeof dlg.showModal === "function") dlg.showModal();
      else dlg.setAttribute("open", "");
    });
  }

  // ---------- draft ----------
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, SAVE_DEBOUNCE_MS);
  }
  function flush() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!state.draft) return;
    try {
      store.saveDraft(state.draft);
      if (state.banner) showBanner(null);
    } catch (e) {
      showBanner(`${toAppError(e).userMessage} (${toAppError(e).code})`);
      logger.error("draft.save_failed", { code: toAppError(e).code });
    }
  }
  function setDraft(d, { immediate = false, rerender = false } = {}) {
    state.draft = d;
    immediate ? flush() : scheduleSave();
    if (rerender) render();
  }

  function startWorkout() {
    if (!state.selectedPreview) {
      toast("Escolha um treino antes de iniciar.", "warn");
      return;
    }
    if (state.draft) {
      toast(
        "Há um treino em andamento. Retome ou reinicie antes de iniciar outro.",
        "warn",
      );
      return;
    }
    const d = transition(
      createDraft({
        day: state.day,
        mode: state.mode,
        date: state.date || undefined,
        nowMs: clock(),
      }),
      STATUS.IN_PROGRESS,
      clock(),
    );
    state.draft = d;
    flush();
    logger.info("workout.started", { day: d.workoutCode, mode: d.mode });
    state.view = "checkin";
    render();
  }

  async function restartWorkout() {
    const ok = await confirmDialog({
      title: "Reiniciar treino atual?",
      body: "O progresso deste treino será zerado. Uma cópia fica recuperável em Dados. Treinos já salvos no histórico não são afetados.",
      confirmLabel: "Reiniciar",
      danger: true,
    });
    if (!ok || !state.draft) return;
    guard("workout.restart_failed", () => {
      if (hasProgress(state.draft)) store.stashDiscarded(state.draft);
      store.clearDraft();
      logger.info("workout.restarted", { day: state.draft.workoutCode });
      state.draft = null;
      state.view = "home";
      toast("Treino reiniciado. Cópia guardada em Dados.");
      render();
    });
  }

  function finishWorkout() {
    guard("workout.finish_failed", () => {
      const ended = transition(state.draft, STATUS.COMPLETED, clock());
      const session = draftToSession(ended, { nowMs: clock() });
      const { added, sessions } = store.addSession(session);
      state.sessions = sessions;
      store.clearDraft();
      logger.info("workout.completed", { day: session.workoutCode, added });
      state.lastSession = session;
      state.draft = null;
      state.view = "summary";
      render();
    });
  }

  // ---------- timer ----------
  function startRest(seconds) {
    setDraft(
      {
        ...state.draft,
        rest: { endsAt: clock() + seconds * 1000, durationS: seconds },
      },
      { immediate: true },
    );
    ensureTick();
    renderRest();
  }
  function ensureTick() {
    if (tick) return;
    tick = setInterval(() => {
      renderRest();
      if (!state.draft?.rest?.endsAt) {
        clearInterval(tick);
        tick = null;
      }
    }, 500);
  }
  function renderRest() {
    const el = document.getElementById("rest-box");
    if (!el || !state.draft) return;
    const r = state.draft.rest;
    const rem = restRemaining(r.endsAt, clock());
    const active = Boolean(r.endsAt && rem > 0);
    const timeEl = el.querySelector("[data-rest-time]");
    const ring = /** @type {any} */ (el.querySelector(".rest-ring"));
    let progress = 0;
    if (active) {
      timeEl.textContent = formatDuration(rem);
      progress = r.durationS ? 1 - rem / r.durationS : 0;
      el.dataset.state = "running";
    } else if (restHold) {
      timeEl.textContent = formatDuration(restHold);
      el.dataset.state = "paused";
    } else {
      timeEl.textContent = r.endsAt ? "Descanso concluído" : "—";
      el.dataset.state = r.endsAt ? "done" : "idle";
    }
    const toggleBtn = el.querySelector("[data-testid=rest-toggle]");
    if (toggleBtn)
      toggleBtn.textContent =
        el.dataset.state === "paused" ? "Continuar" : "Pausar";
    ring.style.setProperty("--p", String(Math.min(1, Math.max(0, progress))));
    if (r.endsAt && rem <= 0) {
      el.dataset.done = "true";
      document.getElementById("rest-live").textContent = "Descanso concluído";
      state.draft = { ...state.draft, rest: { endsAt: null, durationS: 0 } };
      flush();
    }
  }

  // ---------- views ----------
  function numInput(
    label,
    value,
    onInput,
    /** @type {{testid?: string, inputmode?: string, wide?: boolean, hint?: string}} */ {
      testid,
      inputmode = "decimal",
      wide = false,
      hint,
    } = {},
  ) {
    const id = `f-${Math.random().toString(36).slice(2, 8)}`;
    return h(
      "div",
      { class: `field${wide ? " wide" : ""}` },
      h("label", { for: id }, label),
      h("input", {
        id,
        type: "text",
        inputmode,
        autocomplete: "off",
        value,
        "data-testid": testid,
        oninput: (e) => onInput(e.target.value),
      }),
      hint ? h("small", { class: "hint" }, hint) : null,
    );
  }

  function statCard(label, value, note) {
    return h(
      "div",
      { class: "stat" },
      h("span", { class: "stat-value num" }, value),
      h("span", { class: "stat-label" }, label),
      note ? h("span", { class: "stat-note" }, note) : null,
    );
  }

  function viewHome() {
    const resumable = state.draft;
    const suggested = suggestNextWorkout(state.sessions);
    const completed = state.sessions.filter(
      (s) => !s.deletedAt && s.status === "COMPLETED",
    ).length;
    const latest = lastCompleted(state.sessions);
    const el = h("section", {
      class: "view home-view",
      "data-testid": "home-view",
    });

    el.append(
      h(
        "div",
        { class: "home-welcome" },
        h("p", { class: "eyebrow" }, "Treino do dia"),
        h("h1", null, "Qual treino vamos fazer hoje?"),
        h(
          "p",
          { class: "muted home-intro-text", "data-testid": "home-hint" },
          "Escolha sua rotina, confira cada exercício e comece quando estiver pronto.",
        ),
        h(
          "div",
          { class: "home-overview" },
          h(
            "span",
            { class: "overview-pill" },
            `${completed} treinos concluídos`,
          ),
          h(
            "span",
            { class: "overview-pill" },
            latest
              ? `Última sessão: ${latest.workoutCode} · ${formatDateBR(latest.date)}`
              : "Seu próximo treino começa aqui",
          ),
        ),
      ),
    );

    if (resumable) {
      const counts = setCounts(resumable.exercises);
      el.append(
        h(
          "aside",
          { class: "session-banner", "data-testid": "session-banner" },
          h(
            "div",
            { class: "session-banner-info" },
            h("p", { class: "eyebrow" }, "Sessão em andamento"),
            h("h2", null, `Treino ${resumable.workoutCode} pode ser retomado`),
            h(
              "p",
              { class: "muted" },
              `${counts.done}/${counts.total} séries registradas. Você pode ver outros treinos sem perder esta sessão.`,
            ),
          ),
          h(
            "div",
            { class: "session-banner-actions" },
            h(
              "button",
              {
                class: "btn btn-primary",
                type: "button",
                "data-testid": "resume",
                onclick: () => {
                  state.view =
                    resumable.check.energy !== "" ||
                    resumable.currentExercise > 0 ||
                    hasProgress(resumable)
                      ? "exec"
                      : "checkin";
                  render();
                },
              },
              icon("play"),
              "Continuar treino",
            ),
            h(
              "button",
              {
                class: "btn btn-danger-outline",
                type: "button",
                "data-testid": "restart",
                onclick: restartWorkout,
              },
              icon("restart"),
              "Reiniciar treino",
            ),
          ),
        ),
      );
    }

    el.append(
      h(
        "div",
        { class: "section-heading" },
        h(
          "div",
          null,
          h("p", { class: "eyebrow" }, "Minhas rotinas"),
          h(
            "h2",
            { "data-testid": "workout-selector-title" },
            "Selecione um treino",
          ),
        ),
        h("span", { class: "section-count" }, "5 opções"),
      ),
    );

    const list = h("div", {
      class: "workout-list",
      role: "group",
      "aria-label": "Treinos disponíveis A a E",
      "data-testid": "workout-selector",
    });
    for (const code of WORKOUT_CODES) {
      const routine = ROUTINES[code];
      const history = lastCompleted(state.sessions, code);
      const cover = getExerciseInfo(routine.exercises[0].id)?.media
        ?.images?.[0];
      const isSelected = state.selectedPreview === code;
      list.append(
        h(
          "button",
          {
            class: `workout-choice${isSelected ? " is-selected" : ""}`,
            type: "button",
            "aria-pressed": String(isSelected),
            "aria-label": `Ver treino ${code}: ${routine.title}`,
            "data-testid": `day-${code}`,
            onclick: () => {
              state.day = code;
              state.selectedPreview = code;
              render();
              main.querySelector("#selected-workout")?.scrollIntoView?.({
                behavior: "smooth",
                block: "start",
              });
            },
          },
          h(
            "span",
            { class: "choice-art", "aria-hidden": "true" },
            cover
              ? h("img", {
                  src: cover,
                  alt: "",
                  loading: "lazy",
                  decoding: "async",
                  onerror: (ev) => {
                    ev.currentTarget.hidden = true;
                  },
                })
              : null,
            h("span", { class: "choice-letter" }, code),
          ),
          h(
            "span",
            { class: "workout-body" },
            h("span", { class: "choice-overline" }, `TREINO ${code}`),
            h("strong", { class: "choice-title" }, routine.title),
            h(
              "span",
              { class: "choice-description" },
              `${routine.exercises.length} exercícios · ${plannedSets(routine.exercises, state.mode)} séries`,
            ),
            h(
              "span",
              { class: "choice-history" },
              history
                ? `Último: ${formatDateBR(history.date)}`
                : "Ainda não realizado",
            ),
          ),
          h(
            "span",
            { class: "choice-action" },
            code === suggested
              ? h("span", { class: "suggestion-mark" }, "Sugestão")
              : null,
            h("span", { class: "choice-arrow", "aria-hidden": "true" }, "›"),
          ),
        ),
      );
    }
    el.append(list);
    el.append(
      h(
        "p",
        { class: "hint" },
        `Sugestão de sequência: treino ${suggested}. Você decide qual rotina realizar; nenhuma sessão começa automaticamente.`,
      ),
    );

    if (!state.selectedPreview) {
      el.append(
        h(
          "div",
          {
            class: "preview-placeholder",
            "data-testid": "preview-placeholder",
          },
          h(
            "span",
            { class: "preview-placeholder-icon", "aria-hidden": "true" },
            "↗",
          ),
          h(
            "div",
            null,
            h("strong", null, "Escolha o treino acima para ver os exercícios"),
            h(
              "p",
              { class: "muted" },
              "Você poderá conferir a execução e as séries antes de começar.",
            ),
          ),
        ),
      );
      return el;
    }

    const code = state.selectedPreview;
    const routine = ROUTINES[code];
    const lastDay = lastCompleted(state.sessions, code);
    el.append(
      h(
        "section",
        {
          id: "selected-workout",
          class: "workout-preview",
          "data-testid": "day-detail",
          "aria-label": `Prévia do treino ${code}`,
        },
        h(
          "div",
          { class: "preview-header" },
          h(
            "div",
            null,
            h("p", { class: "eyebrow" }, `Prévia · Treino ${code}`),
            h("h2", null, routine.title),
            h("p", { class: "muted" }, routine.note),
          ),
          h(
            "button",
            {
              class: "btn btn-sm",
              type: "button",
              "data-testid": "close-preview",
              onclick: () => {
                state.selectedPreview = null;
                render();
              },
            },
            "Fechar",
          ),
        ),
        h(
          "div",
          { class: "stats preview-stats" },
          statCard("Exercícios", String(routine.exercises.length)),
          statCard(
            "Séries",
            String(plannedSets(routine.exercises, state.mode)),
          ),
          statCard(
            "Duração",
            `≈${estimateMinutes(routine.exercises, state.mode)} min`,
            "estimativa",
          ),
        ),
        h(
          "div",
          { class: "mode-field" },
          h("h3", null, "Como quer treinar?"),
          h(
            "div",
            { class: "seg", role: "group", "aria-label": "Modo do treino" },
            [
              [MODE.RETURN, "Voltando após pausa (máx. 2 séries)"],
              [MODE.REFERENCE, "Plano completo"],
            ].map(([m, label]) =>
              h(
                "button",
                {
                  class: "seg-btn",
                  type: "button",
                  "aria-pressed": String(state.mode === m),
                  "aria-checked": String(state.mode === m),
                  "data-testid": `mode-${m}`,
                  onclick: () => {
                    state.mode = m;
                    render();
                  },
                },
                label,
              ),
            ),
          ),
        ),
        h(
          "div",
          { class: "section-heading" },
          h("h3", null, "Exercícios deste treino"),
          h(
            "span",
            { class: "section-count" },
            `${routine.exercises.length} exercícios`,
          ),
        ),
        h(
          "ol",
          { class: "exercise-preview-list" },
          routine.exercises.map((ex, index) => {
            const info = getExerciseInfo(ex.id);
            const image = info?.media?.images?.[0];
            const target = `${ex.sets} séries · ${ex.min}${ex.max !== ex.min ? `–${ex.max}` : ""}${ex.metric === "TIME" ? " segundos" : " repetições"}`;
            return h(
              "li",
              { class: "exercise-preview-item" },
              h(
                "div",
                { class: "exercise-preview-row" },
                h(
                  "span",
                  { class: "exercise-preview-image", "aria-hidden": "true" },
                  image
                    ? h("img", {
                        src: image,
                        alt: "",
                        loading: "lazy",
                        decoding: "async",
                        onerror: (ev) => {
                          ev.currentTarget.hidden = true;
                        },
                      })
                    : h("span", null, "AD"),
                ),
                h(
                  "div",
                  { class: "exercise-preview-content" },
                  h(
                    "span",
                    { class: "exercise-counter" },
                    `EXERCÍCIO ${index + 1}`,
                  ),
                  h("strong", null, ex.label),
                  h("span", { class: "muted" }, target),
                  info
                    ? h(
                        "span",
                        { class: "exercise-meta" },
                        `${info.equipment}${info.media?.match === "similar" ? " · Imagem de variante próxima" : ""}`,
                      )
                    : null,
                ),
              ),
              info
                ? h(
                    "details",
                    { class: "exercise-preview-help" },
                    h("summary", null, "Ver instruções e cuidados"),
                    h(
                      "div",
                      { class: "exercise-preview-help-content" },
                      h("strong", null, "Preparação"),
                      h("p", null, info.instructions.prep.join(" ")),
                      h("strong", null, "Execução"),
                      h("p", null, info.instructions.exec.join(" ")),
                      h("strong", null, "Evite"),
                      h("p", null, info.instructions.mistakes.join(" ")),
                      info.general
                        ? h("small", { class: "hint" }, info.general)
                        : null,
                    ),
                  )
                : h(
                    "p",
                    { class: "hint" },
                    "Instruções disponíveis durante a execução.",
                  ),
            );
          }),
        ),
        h(
          "p",
          { class: "hint" },
          lastDay
            ? `Última sessão do treino ${code}: ${formatDateBR(lastDay.date)}.`
            : "Sem sessão anterior deste treino.",
        ),
        h(
          "p",
          { class: "hint" },
          "Imagens demonstrativas do catálogo local. Vídeos ainda não possuem fontes verificadas; não exibimos reproduções fictícias.",
        ),
        h(
          "div",
          { class: "action-bar preview-actions" },
          h(
            "button",
            {
              class: "btn btn-primary btn-lg",
              type: "button",
              disabled: Boolean(resumable),
              "data-testid": "start",
              onclick: startWorkout,
            },
            icon("play"),
            resumable
              ? "Conclua ou reinicie a sessão atual"
              : `Iniciar treino ${code}`,
          ),
        ),
      ),
    );
    return el;
  }

  function viewCheckin() {
    const d = state.draft;
    const el = h(
      "section",
      { class: "view" },
      h("h1", null, "Check-in pré-treino"),
      h(
        "p",
        { class: "muted" },
        "Opcional. Deixe em branco o que não quiser informar.",
      ),
    );
    const grid = h("div", { class: "grid2" });
    for (const [k, label, min, max] of CHECK_FIELDS) {
      grid.append(
        numInput(
          label,
          d.check[k],
          (v) =>
            setDraft(updateSection(state.draft, "check", { [k]: v }, clock())),
          { testid: `check-${k}`, inputmode: "numeric", hint: `${min}–${max}` },
        ),
      );
    }
    el.append(
      grid,
      h(
        "div",
        { class: "row" },
        h(
          "button",
          {
            class: "btn btn-primary btn-lg",
            type: "button",
            "data-testid": "to-exec",
            onclick: () => {
              if (!state.draft.check.energy)
                setDraft(
                  updateSection(
                    state.draft,
                    "check",
                    { energy: state.draft.check.energy },
                    clock(),
                  ),
                );
              flush();
              state.view = "exec";
              render();
            },
          },
          "Ir para o treino",
        ),
      ),
    );
    return el;
  }

  function viewExec() {
    const d = state.draft;
    const i = Math.min(d.currentExercise, d.exercises.length - 1);
    const ex = d.exercises[i];
    const counts = setCounts(d.exercises);
    const isTime = ex.metric === "TIME";
    const info = getExerciseInfo(ex.exerciseId);
    const planned = ROUTINES[d.workoutCode]?.exercises.find(
      (e) => e.label === ex.label,
    );
    const exDone = exerciseProgress(ex).complete;
    const remainingEx = d.exercises.filter(
      (e) => !exerciseProgress(e).complete,
    ).length;
    const el = h("section", { class: "view exec" });
    el.append(
      h(
        "div",
        { class: "exec-top" },
        h(
          "div",
          {
            class: "progress",
            role: "progressbar",
            "aria-valuenow": counts.pct,
            "aria-valuemin": 0,
            "aria-valuemax": 100,
            "aria-label": "Progresso do treino",
          },
          h("span", { style: { width: `${counts.pct}%` } }),
        ),
        h(
          "p",
          { class: "muted num", "data-testid": "exec-progress" },
          `Exercício ${i + 1} de ${d.exercises.length} · ${counts.done}/${counts.total} séries · faltam ${remainingEx} exercício${remainingEx === 1 ? "" : "s"}`,
        ),
      ),
    );
    el.append(
      h(
        "header",
        { class: "ex-head" },
        h(
          "div",
          { class: "chips" },
          planned ? h("span", { class: "chip" }, planned.muscle) : null,
          info ? h("span", { class: "chip" }, info.equipment) : null,
          exDone ? h("span", { class: "chip chip-ok" }, "Concluído") : null,
        ),
        h("h1", { "data-testid": "ex-title" }, ex.label),
        planned
          ? h(
              "p",
              { class: "plan-line num" },
              `Plano: ${planned.sets} × ${planned.min}${planned.max !== planned.min ? `–${planned.max}` : ""}${isTime ? " s" : " reps"}`,
            )
          : null,
      ),
    );
    if (info)
      el.append(
        exerciseMedia({
          media: info.media,
          variant: info.variant,
        }),
      );
    const prev = lastFor(ex.label);
    const sug =
      prev?.target && d.mode !== MODE.RETURN
        ? suggestNext(prev, { mode: d.mode })
        : null;
    if (prev)
      el.append(
        h(
          "p",
          { class: "prev-info num", "data-testid": "prev-info" },
          `Última vez (${formatDateBR(prev.date)}): ${
            prev.sets
              .filter((s) => s.completed)
              .map((s) =>
                isTime
                  ? `${s.timeSeconds}s`
                  : `${s.loadKg ?? "-"}kg×${s.reps ?? "-"}`,
              )
              .join(", ") || "sem séries concluídas"
          }`,
        ),
      );
    if (sug && SUGGESTION_TEXT[sug.action])
      el.append(
        h(
          "p",
          { class: "tag", "data-testid": "suggestion" },
          `Sugestão do sistema: ${SUGGESTION_TEXT[sug.action]}`,
        ),
      );
    if (d.mode === MODE.RETURN)
      el.append(
        h(
          "p",
          { class: "tag tag-warn" },
          "Retorno após pausa: RIR sugerido 2–4 · sem progressão automática",
        ),
      );

    const activeIdx = ex.sets.findIndex((s) => !s.completed);
    ex.sets.forEach((s, j) => {
      const stateName = s.completed
        ? "done"
        : j === activeIdx
          ? "active"
          : "pending";
      el.append(
        h(
          "div",
          {
            class: `set set-${stateName}`,
            "data-state": stateName,
            "data-testid": `set-${j}`,
          },
          h(
            "div",
            { class: "set-head" },
            h("span", { class: "set-n" }, `Série ${j + 1}`),
            h(
              "span",
              { class: "set-state" },
              { done: "Concluída", active: "Em execução", pending: "Pendente" }[
                stateName
              ],
            ),
          ),
          h(
            "div",
            { class: "set-fields" },
            isTime
              ? numInput(
                  "Tempo (s)",
                  s.timeSeconds,
                  (v) =>
                    setDraft(
                      updateSet(state.draft, i, j, { timeSeconds: v }, clock()),
                    ),
                  { testid: `time-${j}`, inputmode: "numeric" },
                )
              : [
                  numInput(
                    "Carga (kg)",
                    s.loadKg,
                    (v) =>
                      setDraft(
                        updateSet(state.draft, i, j, { loadKg: v }, clock()),
                      ),
                    { testid: `load-${j}` },
                  ),
                  numInput(
                    "Reps",
                    s.reps,
                    (v) =>
                      setDraft(
                        updateSet(state.draft, i, j, { reps: v }, clock()),
                      ),
                    { testid: `reps-${j}`, inputmode: "numeric" },
                  ),
                ],
            numInput(
              "RIR (0–5)",
              s.rir,
              (v) =>
                setDraft(updateSet(state.draft, i, j, { rir: v }, clock())),
              { testid: `rir-${j}`, inputmode: "numeric" },
            ),
          ),
          h(
            "button",
            {
              class: `btn complete-btn${s.completed ? " is-done" : ""}`,
              type: "button",
              "aria-pressed": String(s.completed),
              "aria-label": `Série ${j + 1} concluída`,
              "data-testid": `done-${j}`,
              onclick: () => {
                const nowDone = !s.completed;
                setDraft(
                  updateSet(state.draft, i, j, { completed: nowDone }, clock()),
                  { immediate: true },
                );
                if (nowDone) startRest(isTime ? 60 : 90);
                render();
              },
            },
            icon("check", 24),
            s.completed ? "Série concluída" : "Concluir série",
          ),
        ),
      );
    });
    el.append(
      h(
        "div",
        { class: "row" },
        h(
          "button",
          {
            class: "btn btn-sm",
            type: "button",
            "data-testid": "add-set",
            onclick: () =>
              setDraft(addSet(state.draft, i, clock()), {
                rerender: true,
                immediate: true,
              }),
          },
          icon("plus"),
          "Série",
        ),
        h(
          "button",
          {
            class: "btn btn-sm",
            type: "button",
            onclick: () =>
              setDraft(removeLastEmptySet(state.draft, i, clock()), {
                rerender: true,
                immediate: true,
              }),
          },
          "Remover última vazia",
        ),
      ),
    );

    el.append(restTimerCard());
    if (info) el.append(exerciseInstructions(info.instructions, info.general));

    el.append(
      h(
        "details",
        { class: "card" },
        h("summary", null, "Variante, equipamento e observações"),
        h(
          "div",
          { class: "grid2" },
          selectField(
            "Variante",
            ex.variantType,
            [
              ["PLANNED", "Planejada"],
              ["VARIANT", "Variante"],
              ["OTHER", "Outro"],
            ],
            (v) =>
              setDraft(
                updateExercise(state.draft, i, { variantType: v }, clock()),
              ),
          ),
          selectField(
            "Equipamento",
            ex.equipmentMatch,
            [
              ["UNKNOWN", "Não informado"],
              ["SAME", "Mesmo"],
              ["DIFFERENT", "Diferente"],
            ],
            (v) =>
              setDraft(
                updateExercise(state.draft, i, { equipmentMatch: v }, clock()),
              ),
          ),
          textField("Equipamento (texto)", ex.equipmentLabel, (v) =>
            setDraft(
              updateExercise(state.draft, i, { equipmentLabel: v }, clock()),
            ),
          ),
          textField("Observações", ex.notes, (v) =>
            setDraft(updateExercise(state.draft, i, { notes: v }, clock())),
          ),
        ),
      ),
    );

    el.append(
      h(
        "div",
        { class: "row end" },
        h(
          "button",
          { class: "btn btn-sm", type: "button", onclick: () => pauseToggle() },
          state.draft.status === STATUS.PAUSED ? "Retomar treino" : "Pausar",
        ),
        h(
          "button",
          {
            class: "btn btn-sm btn-danger-outline",
            type: "button",
            "data-testid": "restart",
            onclick: restartWorkout,
          },
          "Reiniciar treino",
        ),
      ),
    );

    const last = i === d.exercises.length - 1;
    el.append(
      h(
        "div",
        { class: "action-bar action-bar-split" },
        h(
          "button",
          {
            class: "btn",
            type: "button",
            disabled: i === 0,
            "data-testid": "prev-ex",
            "aria-label": "Exercício anterior",
            onclick: () => go(i - 1),
          },
          icon("chevronL"),
          "Anterior",
        ),
        last
          ? h(
              "button",
              {
                class: "btn btn-primary",
                type: "button",
                "data-testid": "to-post",
                onclick: () => {
                  flush();
                  state.view = "post";
                  render();
                },
              },
              "Finalizar",
            )
          : h(
              "button",
              {
                class: "btn btn-primary",
                type: "button",
                "data-testid": "next-ex",
                onclick: () => go(i + 1),
              },
              "Próximo",
              icon("chevronR"),
            ),
      ),
    );
    return el;
  }

  function restTimerCard() {
    const adjust = (/** @type {number} */ delta) => {
      const rem = state.draft.rest.endsAt
        ? restRemaining(state.draft.rest.endsAt, clock())
        : restHold;
      if (rem === null || rem === undefined || rem <= 0) return;
      const next = Math.max(5, rem + delta);
      if (state.draft.rest.endsAt) startRest(next);
      else {
        restHold = next;
        renderRest();
      }
    };
    const clearRest = () => {
      restHold = null;
      setDraft(
        { ...state.draft, rest: { endsAt: null, durationS: 0 } },
        { immediate: true },
      );
      renderRest();
    };
    return h(
      "div",
      { id: "rest-box", class: "card rest", "data-state": "idle" },
      h(
        "div",
        { class: "rest-main" },
        h(
          "div",
          { class: "rest-ring" },
          h("span", { "data-rest-time": true, class: "rest-time num" }, "—"),
        ),
        h(
          "div",
          { class: "rest-side" },
          h("strong", null, "Descanso"),
          h(
            "div",
            { class: "row wrap" },
            h(
              "button",
              {
                class: "btn btn-sm",
                type: "button",
                "data-testid": "rest-minus",
                "aria-label": "Reduzir 15 segundos",
                onclick: () => adjust(-15),
              },
              "−15s",
            ),
            h(
              "button",
              {
                class: "btn btn-sm",
                type: "button",
                "data-testid": "rest-toggle",
                onclick: () => {
                  if (state.draft.rest.endsAt) {
                    restHold = Math.max(
                      0,
                      restRemaining(state.draft.rest.endsAt, clock()),
                    );
                    setDraft(
                      { ...state.draft, rest: { endsAt: null, durationS: 0 } },
                      { immediate: true },
                    );
                    renderRest();
                  } else if (restHold) {
                    const sec = restHold;
                    restHold = null;
                    startRest(sec);
                  }
                },
              },
              "Pausar",
            ),
            h(
              "button",
              {
                class: "btn btn-sm",
                type: "button",
                "data-testid": "rest-plus",
                "aria-label": "Adicionar 15 segundos",
                onclick: () => adjust(15),
              },
              "+15s",
            ),
          ),
        ),
      ),
      h(
        "div",
        { class: "row wrap" },
        REST_PRESETS.map((sec) =>
          h(
            "button",
            {
              class: "btn btn-sm",
              type: "button",
              onclick: () => {
                restHold = null;
                startRest(sec);
              },
            },
            `${sec}s`,
          ),
        ),
        h(
          "button",
          {
            class: "btn btn-sm",
            type: "button",
            "data-testid": "rest-skip",
            onclick: clearRest,
          },
          "Pular",
        ),
      ),
      h("span", {
        id: "rest-live",
        class: "sr-only",
        "aria-live": "assertive",
      }),
    );
  }
  function go(idx) {
    setDraft({ ...state.draft, currentExercise: idx }, { immediate: true });
    render();
  }
  function pauseToggle() {
    guard("workout.pause_failed", () => {
      const to =
        state.draft.status === STATUS.PAUSED
          ? STATUS.IN_PROGRESS
          : STATUS.PAUSED;
      setDraft(transition(state.draft, to, clock()), {
        immediate: true,
        rerender: true,
      });
      logger.info(to === STATUS.PAUSED ? "workout.paused" : "workout.resumed");
    });
  }
  function lastFor(label) {
    const pts = state.sessions
      .filter(
        (s) =>
          !s.deletedAt &&
          s.status === "COMPLETED" &&
          s.workoutCode === state.draft.workoutCode,
      )
      .sort((a, b) => b.date.localeCompare(a.date));
    for (const s of pts) {
      const e = s.exercises.find((x) => x.label === label);
      if (e) return { ...e, date: s.date, mode: s.mode };
    }
    return null;
  }
  function selectField(label, value, opts, onChange) {
    const id = `s-${Math.random().toString(36).slice(2, 8)}`;
    return h(
      "div",
      { class: "field" },
      h("label", { for: id }, label),
      h(
        "select",
        { id, onchange: (e) => onChange(e.target.value) },
        opts.map(([v, t]) =>
          h("option", { value: v, selected: v === value }, t),
        ),
      ),
    );
  }
  function textField(label, value, onInput) {
    const id = `t-${Math.random().toString(36).slice(2, 8)}`;
    return h(
      "div",
      { class: "field wide" },
      h("label", { for: id }, label),
      h("input", {
        id,
        type: "text",
        maxlength: 500,
        value,
        oninput: (e) => onInput(e.target.value),
      }),
    );
  }

  function viewPost() {
    const d = state.draft;
    const el = h("section", { class: "view" }, h("h1", null, "Pós-treino"));
    const grid = h("div", { class: "grid2" });
    [
      ["rating", "Nota da sessão (0–10)"],
      ["effort", "Esforço (0–10)"],
      ["performance", "Desempenho (1–5)"],
      ["finalFatigue", "Fadiga final (1–5)"],
      ["technique", "Técnica (1–5)"],
    ].forEach(([k, l]) =>
      grid.append(
        numInput(
          l,
          d.post[k],
          (v) =>
            setDraft(updateSection(state.draft, "post", { [k]: v }, clock())),
          { testid: `post-${k}`, inputmode: "numeric" },
        ),
      ),
    );
    grid.append(
      textField("Observações gerais", d.post.notes, (v) =>
        setDraft(updateSection(state.draft, "post", { notes: v }, clock())),
      ),
    );
    el.append(
      grid,
      h(
        "div",
        { class: "card" },
        h("h2", null, "Cardio"),
        h(
          "label",
          { class: "check" },
          h("input", {
            type: "checkbox",
            checked: d.cardio.done,
            "data-testid": "cardio-done",
            onchange: (e) =>
              setDraft(
                updateSection(
                  state.draft,
                  "cardio",
                  { done: e.target.checked },
                  clock(),
                ),
              ),
          }),
          "Fiz cardio",
        ),
        h(
          "div",
          { class: "grid2" },
          numInput(
            "Minutos",
            d.cardio.minutes,
            (v) =>
              setDraft(
                updateSection(state.draft, "cardio", { minutes: v }, clock()),
              ),
            { testid: "cardio-minutes" },
          ),
          numInput(
            "Distância (km)",
            d.cardio.distanceKm,
            (v) =>
              setDraft(
                updateSection(
                  state.draft,
                  "cardio",
                  { distanceKm: v },
                  clock(),
                ),
              ),
            {},
          ),
          numInput(
            "Vel. mín (km/h)",
            d.cardio.speedMin,
            (v) =>
              setDraft(
                updateSection(state.draft, "cardio", { speedMin: v }, clock()),
              ),
            {},
          ),
          numInput(
            "Vel. máx (km/h)",
            d.cardio.speedMax,
            (v) =>
              setDraft(
                updateSection(state.draft, "cardio", { speedMax: v }, clock()),
              ),
            {},
          ),
        ),
      ),
    );
    const btn = h(
      "button",
      {
        class: "btn btn-primary btn-lg",
        type: "button",
        "data-testid": "finish",
        onclick: () => {
          btn.disabled = true;
          finishWorkout();
          btn.disabled = false;
        },
      },
      icon("check"),
      "Salvar treino",
    );
    el.append(
      btn,
      h(
        "button",
        {
          class: "btn",
          type: "button",
          onclick: () => {
            state.view = "exec";
            render();
          },
        },
        "Voltar",
      ),
    );
    return el;
  }

  function viewSummary() {
    const s = state.lastSession;
    const el = h(
      "section",
      { class: "view", "data-testid": "summary" },
      h("h1", null, "Treino salvo ✓"),
    );
    if (s) {
      el.append(
        h(
          "div",
          { class: "card" },
          h(
            "p",
            null,
            `Treino ${s.workoutCode} · ${formatDateBR(s.date)} · ${formatDuration(s.durationSeconds ?? 0)}`,
          ),
          h(
            "p",
            null,
            `Séries: ${setCounts(s.exercises).done}/${setCounts(s.exercises).total} · Volume: ${Math.round(sessionVolume(s.exercises.map((e) => ({ ...e, sets: e.sets.map((x) => ({ ...x, loadKg: x.loadKg ?? "" })) }))))} kg`,
          ),
        ),
      );
      el.append(
        h(
          "button",
          {
            class: "btn",
            type: "button",
            onclick: async () => {
              try {
                await navigator.clipboard.writeText(summaryText(s));
                toast("Resumo copiado.");
              } catch {
                toast("Não foi possível copiar.", "error");
              }
            },
          },
          "Copiar resumo",
        ),
      );
    }
    el.append(
      h(
        "button",
        {
          class: "btn btn-primary",
          type: "button",
          "data-testid": "back-home",
          onclick: () => {
            state.view = "home";
            state.tab = "today";
            render();
          },
        },
        "Voltar ao início",
      ),
    );
    return el;
  }

  function sessionCard(s) {
    const c = setCounts(s.exercises);
    return h(
      "li",
      { class: "card hist", "data-testid": "hist-item" },
      h(
        "div",
        { class: "row between" },
        h("strong", null, `Treino ${s.workoutCode}`),
        h("span", { class: "muted" }, formatDateBR(s.date)),
      ),
      h(
        "p",
        { class: "muted" },
        `${c.done}/${c.total} séries · ${s.mode === MODE.HISTORICAL ? "importado" : s.mode === MODE.RETURN ? "retorno" : "plano completo"}${s.source?.kind && s.source.kind !== "app" ? ` · origem: ${s.source.kind}` : ""}`,
      ),
      h(
        "details",
        null,
        h("summary", null, "Detalhes"),
        h(
          "ul",
          { class: "plain" },
          s.exercises.map((e) =>
            h(
              "li",
              null,
              `${e.label}: ${
                e.sets
                  .filter((x) => x.completed)
                  .map((x) =>
                    e.metric === "TIME"
                      ? `${x.timeSeconds}s`
                      : `${x.loadKg ?? "-"}×${x.reps ?? "-"}`,
                  )
                  .join(" · ") || "—"
              }`,
            ),
          ),
          s.transformations?.length
            ? h(
                "li",
                { class: "muted" },
                `Transformações na importação: ${s.transformations.length} (ver Dados → backup)`,
              )
            : null,
        ),
      ),
      h(
        "button",
        {
          class: "btn btn-sm btn-danger-outline",
          type: "button",
          "aria-label": `Excluir treino ${s.workoutCode} de ${formatDateBR(s.date)}`,
          "data-testid": "hist-delete",
          onclick: () =>
            guard("history.delete_failed", () => {
              state.sessions = store.softDelete(s.id);
              logger.info("history.soft_deleted");
              toast("Movido para a lixeira (Dados).");
              render();
            }),
        },
        icon("trash"),
        "Excluir",
      ),
    );
  }

  function viewHistory() {
    const visible = state.sessions
      .filter((s) => !s.deletedAt)
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          String(b.completedAt).localeCompare(String(a.completedAt)),
      );
    const el = h("section", { class: "view" }, h("h1", null, "Histórico"));
    if (!visible.length) {
      el.append(
        h(
          "div",
          { class: "empty", "data-testid": "history-empty" },
          h("p", null, "Nenhum treino salvo ainda."),
          h(
            "p",
            { class: "muted" },
            "Conclua um treino ou importe um backup em Dados.",
          ),
        ),
      );
      return el;
    }
    const list = h(
      "ul",
      { class: "plain list" },
      visible.slice(0, state.historyLimit).map(sessionCard),
    );
    el.append(list);
    if (visible.length > state.historyLimit)
      el.append(
        h(
          "button",
          {
            class: "btn",
            type: "button",
            onclick: () => {
              state.historyLimit += PAGE;
              render();
            },
          },
          `Mostrar mais (${visible.length - state.historyLimit})`,
        ),
      );
    const opts = distinctExercises(visible);
    el.append(h("h2", null, "Evolução"));
    const sel = h(
      "select",
      {
        "aria-label": "Exercício",
        "data-testid": "evo-select",
        onchange: (e) => {
          state.evoKey = e.target.value;
          render();
        },
      },
      h("option", { value: "" }, "Selecione um exercício"),
      opts.map((o) =>
        h(
          "option",
          {
            value: `${o.workoutCode}|${o.label}`,
            selected: state.evoKey === `${o.workoutCode}|${o.label}`,
          },
          `${o.workoutCode} · ${o.label}`,
        ),
      ),
    );
    el.append(sel);
    if (state.evoKey) {
      const [code, ...rest] = state.evoKey.split("|");
      const pts = exerciseSeries(visible, rest.join("|"), code);
      el.append(loadChart(pts));
      el.append(
        h(
          "table",
          { class: "table", "data-testid": "evo-table" },
          h("caption", null, "Maior carga e volume por sessão"),
          h(
            "thead",
            null,
            h(
              "tr",
              null,
              ["Data", "Maior carga", "Volume", "Comparável"].map((t) =>
                h("th", { scope: "col" }, t),
              ),
            ),
          ),
          h(
            "tbody",
            null,
            pts.map((p) =>
              h(
                "tr",
                null,
                h("td", null, formatDateBR(p.date)),
                h("td", null, p.topLoad ?? "—"),
                h("td", null, Math.round(p.volume)),
                h("td", null, p.comparable ? "sim" : `não (${p.reason})`),
              ),
            ),
          ),
        ),
      );
    }
    return el;
  }

  function viewData() {
    const el = h("section", { class: "view" }, h("h1", null, "Dados"));
    const fileInput = h("input", {
      type: "file",
      id: "file",
      accept: ".json,.csv,application/json,text/csv",
      multiple: true,
      class: "sr-only",
      "data-testid": "import-file",
      onchange: onImport,
    });
    el.append(
      h(
        "div",
        { class: "card" },
        h("h2", null, "Backup"),
        h(
          "p",
          { class: "muted" },
          "Tudo fica só neste aparelho. Exporte backups com frequência.",
        ),
        h(
          "div",
          { class: "row wrap" },
          h(
            "button",
            {
              class: "btn btn-primary",
              type: "button",
              "data-testid": "export-json",
              onclick: () =>
                guard("export.failed", () => {
                  download(
                    `adgymspace-backup-${new Date(clock()).toISOString().slice(0, 10)}.json`,
                    JSON.stringify(
                      buildBackup(state.sessions, clock()),
                      null,
                      2,
                    ),
                    "application/json",
                  );
                  logger.info("export.json", {
                    sessions: state.sessions.length,
                  });
                  toast("Backup exportado.");
                }),
            },
            "Exportar JSON",
          ),
          h(
            "button",
            {
              class: "btn",
              type: "button",
              onclick: () =>
                guard("export.failed", () => {
                  download(
                    "adgymspace-series.csv",
                    buildCsv(state.sessions),
                    "text/csv",
                  );
                  logger.info("export.csv");
                }),
            },
            "Exportar CSV",
          ),
          h("label", { class: "btn", for: "file" }, "Importar arquivos"),
          fileInput,
        ),
        h(
          "p",
          { class: "muted" },
          "Importar mescla com os dados atuais (não substitui) e cria um ponto de restauração.",
        ),
        h(
          "button",
          {
            class: "btn btn-sm",
            type: "button",
            onclick: () =>
              guard("import.undo_failed", () => {
                state.sessions = store.restoreSnapshot();
                toast("Restaurado ao estado anterior à última importação.");
                render();
              }),
          },
          "Desfazer última importação",
        ),
      ),
    );

    const trash = state.sessions.filter((s) => s.deletedAt);
    el.append(
      h(
        "div",
        { class: "card" },
        h("h2", null, `Lixeira (${trash.length})`),
        trash.length
          ? h(
              "ul",
              { class: "plain" },
              trash.map((s) =>
                h(
                  "li",
                  { class: "row between" },
                  `Treino ${s.workoutCode} · ${formatDateBR(s.date)}`,
                  h(
                    "span",
                    null,
                    h(
                      "button",
                      {
                        class: "btn btn-sm",
                        type: "button",
                        onclick: () =>
                          guard("history.restore_failed", () => {
                            state.sessions = store.restore(s.id);
                            render();
                          }),
                      },
                      icon("undo"),
                      "Restaurar",
                    ),
                    h(
                      "button",
                      {
                        class: "btn btn-sm btn-danger-outline",
                        type: "button",
                        onclick: async () => {
                          if (
                            await confirmDialog({
                              title: "Excluir definitivamente?",
                              body: "Não poderá ser desfeito. Considere exportar um backup antes.",
                              confirmLabel: "Excluir",
                              danger: true,
                            })
                          )
                            guard("history.purge_failed", () => {
                              state.sessions = store.purge(s.id);
                              render();
                            });
                        },
                      },
                      "Excluir",
                    ),
                  ),
                ),
              ),
            )
          : h("p", { class: "muted" }, "Vazia."),
      ),
    );

    const rec = store.listRecoverable();
    el.append(
      h(
        "div",
        { class: "card" },
        h("h2", null, `Treinos descartados (${rec.length})`),
        rec.length
          ? h(
              "ul",
              { class: "plain" },
              rec.map((r, idx) =>
                h(
                  "li",
                  { class: "row between" },
                  `Treino ${r.draft.workoutCode} · ${formatDateBR(r.draft.date)}`,
                  h(
                    "button",
                    {
                      class: "btn btn-sm",
                      type: "button",
                      "data-testid": "recover-draft",
                      onclick: () =>
                        guard("draft.recover_failed", () => {
                          if (state.draft) {
                            toast(
                              "Termine ou reinicie o treino atual antes.",
                              "error",
                            );
                            return;
                          }
                          state.draft = store.takeRecoverable(idx);
                          flush();
                          state.view = "exec";
                          state.tab = "today";
                          logger.info("draft.recovered");
                          render();
                        }),
                    },
                    "Recuperar",
                  ),
                ),
              ),
            )
          : h("p", { class: "muted" }, "Nenhum."),
      ),
    );

    el.append(
      h(
        "div",
        { class: "card" },
        h("h2", null, "Aparência e diagnóstico"),
        h(
          "button",
          { class: "btn", type: "button", onclick: toggleTheme },
          icon(state.theme === "dark" ? "sun" : "moon"),
          state.theme === "dark" ? "Tema claro" : "Tema escuro",
        ),
        h(
          "button",
          {
            class: "btn",
            type: "button",
            onclick: () =>
              guard("log.export_failed", () =>
                download(
                  "adgymspace-log.txt",
                  logger.exportText() || "sem eventos",
                  "text/plain",
                ),
              ),
          },
          "Exportar log local",
        ),
        h(
          "p",
          { class: "muted" },
          "O log contém apenas eventos e códigos de erro, nunca dados de treino.",
        ),
      ),
    );
    return el;
  }

  async function onImport(ev) {
    const files = [...ev.target.files];
    ev.target.value = "";
    let added = 0;
    let dup = 0;
    let rej = 0;
    for (const f of files) {
      try {
        if (f.size > 5 * 1024 * 1024) throw new AppError(ERR.IMPORT_TOO_LARGE);
        const res = importText(await f.text(), f.name);
        if (!res.sessions.length && !res.rejected.length)
          throw new AppError(ERR.IMPORT_EMPTY);
        const r = store.mergeImport(res);
        added += r.added;
        dup += r.duplicates;
        rej += r.rejected;
      } catch (e) {
        fail("import.failed", e);
      }
    }
    state.sessions = store.loadSessions().sessions;
    logger.info("import.done", { files: files.length, added, dup, rej });
    if (files.length)
      toast(
        `Importação: ${added} novas, ${dup} duplicadas, ${rej} rejeitadas.`,
        rej ? "warn" : "ok",
      );
    render();
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = state.theme;
    guard("meta.save_failed", () =>
      store.saveMeta({ ...store.loadMeta(), theme: state.theme }),
    );
    render();
  }

  // ---------- shell ----------
  const VIEWS = {
    home: viewHome,
    checkin: viewCheckin,
    exec: viewExec,
    post: viewPost,
    summary: viewSummary,
  };
  function render() {
    if (state.view !== "home" && !state.draft && state.view !== "summary")
      state.view = "home";
    clear(main);
    main.append(
      state.tab === "today"
        ? VIEWS[state.view]()
        : state.tab === "history"
          ? viewHistory()
          : viewData(),
    );
    clear(nav);
    [
      ["today", "Treino", "home"],
      ["history", "Histórico", "history"],
      ["data", "Dados", "data"],
    ].forEach(([t, label, ic]) =>
      nav.append(
        h(
          "button",
          {
            type: "button",
            class: "nav-btn",
            "aria-current": state.tab === t ? "page" : null,
            "data-testid": `tab-${t}`,
            onclick: () => {
              state.tab = t;
              if (t === "today") state.view = "home";
              render();
              main.focus();
            },
          },
          icon(ic),
          h("span", null, label),
        ),
      ),
    );
    if (state.draft?.rest?.endsAt) {
      ensureTick();
      renderRest();
    }
  }

  function init() {
    const t0 = clock();
    const meta = guard("meta.load_failed", () => store.loadMeta()) ?? {};
    state.theme = meta.theme ?? "dark";
    document.documentElement.dataset.theme = state.theme;
    const loaded = guard("data.load_failed", () => store.loadSessions()) ?? {
      sessions: [],
      corrupted: false,
    };
    state.sessions = loaded.sessions;
    if (loaded.corrupted)
      toast(ERR.STORAGE_READ[1], "warn", ERR.STORAGE_READ[0]);
    const dr = guard("draft.load_failed", () => store.loadDraft());
    if (dr?.corrupted) toast(ERR.STORAGE_READ[1], "warn", ERR.STORAGE_READ[0]);
    else if (
      dr?.value &&
      dr.value.workoutCode &&
      Array.isArray(dr.value.exercises)
    ) {
      state.draft = dr.value;
      logger.info("draft.recovered_on_open");
      state.view = "home";
    }
    state.day = suggestNextWorkout(state.sessions);
    render();
    logger.info("app.started", {
      sessions: state.sessions.length,
      ms: clock() - t0,
    });
    addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
    addEventListener("pagehide", flush);
    // Mantém o campo focado visível acima do teclado virtual e da barra fixa.
    addEventListener("focusin", (e) => {
      const t = /** @type {any} */ (e.target);
      if (t?.matches?.("input[type=text], select"))
        setTimeout(
          () => t.scrollIntoView({ block: "center", behavior: "auto" }),
          250,
        );
    });
    return api;
  }

  const api = { init, getState: () => state, flush, render };
  return api;
}

function defaultDownload(name, content, mime) {
  const url = URL.createObjectURL(
    new Blob([content], { type: `${mime};charset=utf-8` }),
  );
  const a = h("a", { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
