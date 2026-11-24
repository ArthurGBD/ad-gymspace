// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app/app.js";
import { createLogger, LEVELS } from "../../src/services/logger.js";
import { createStore, KEYS } from "../../src/storage/store.js";
import { legacyValores, memStorage } from "../helpers/fixtures.js";
import { importText } from "../../src/validation/importer.js";

function boot(storage = memStorage(), extra = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  HTMLDialogElement.prototype.showModal ??= function () {
    this.setAttribute("open", "");
  };
  const logger = createLogger({ level: LEVELS.DEBUG });
  const store = createStore({ storage, logger });
  const app = createApp({
    root: document.getElementById("app"),
    store,
    logger,
    ...extra,
  }).init();
  return { storage, logger, store, app };
}
const $ = (id) => document.querySelector(`[data-testid="${id}"]`);
const type = (el, v) => {
  el.value = v;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const click = (id) => $(id).click();

function completeOneSet() {
  click("day-B");
  click("start");
  click("to-exec");
  type($("load-0"), "30,5");
  type($("reps-0"), "10");
  type($("rir-0"), "2");
  click("done-0");
}

beforeEach(() => {
  vi.useRealTimers();
});

describe("fluxo de sessão", () => {
  it("inicia, registra, finaliza e aparece no histórico; draft é limpo", () => {
    const { storage, app, store } = boot();
    completeOneSet();
    app.getState().view = "post";
    app.render();
    click("finish");
    const { sessions } = store.loadSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].exercises[0].sets[0]).toMatchObject({
      loadKg: 30.5,
      reps: 10,
      rir: 2,
      completed: true,
    });
    expect(storage.getItem(KEYS.draft)).toBeNull();
    click("tab-history");
    expect(document.querySelectorAll('[data-testid="hist-item"]')).toHaveLength(
      1,
    );
  });

  it("duplo clique em salvar não duplica a sessão", () => {
    const { app, store } = boot();
    completeOneSet();
    const draft = app.getState().draft;
    app.getState().view = "post";
    app.render();
    click("finish");
    store.addSession({ ...store.loadSessions().sessions[0] });
    expect(store.loadSessions().sessions).toHaveLength(1);
    expect(draft.id).toBe(store.loadSessions().sessions[0].id);
  });

  it("retoma rascunho após fechar inesperadamente", () => {
    const storage = memStorage();
    const a = boot(storage);
    completeOneSet();
    a.app.flush();
    const b = boot(storage); // "reabre"
    expect(b.app.getState().draft.exercises[0].sets[0].reps).toBe("10");
    expect($("ex-title")).not.toBeNull();
  });

  it("reiniciar exige confirmação, guarda cópia recuperável e não toca no histórico", async () => {
    const { storage, app, store } = boot();
    store.addSession(
      importText(JSON.stringify(legacyValores()), "a.json").sessions[0],
    );
    completeOneSet();
    app.flush();
    click("restart");
    $("dlg-ok").click();
    await vi.waitFor(() => expect(app.getState().draft).toBeNull());
    expect(storage.getItem(KEYS.draft)).toBeNull();
    expect(store.loadSessions().sessions).toHaveLength(1);
    expect(store.listRecoverable()).toHaveLength(1);
    click("tab-data");
    click("recover-draft");
    expect(app.getState().draft.exercises[0].sets[0].reps).toBe("10");
  });

  it("cancelar a confirmação mantém o treino", async () => {
    const { app } = boot();
    completeOneSet();
    click("restart");
    $("dlg-cancel").click();
    await new Promise((r) => setTimeout(r, 10));
    expect(app.getState().draft).not.toBeNull();
  });
});

describe("persistência e falhas", () => {
  it("falha de gravação mostra aviso com código e não perde o estado em memória", () => {
    const storage = memStorage({ failWrite: true });
    const { app } = boot(storage);
    click("day-A");
    click("start");
    app.flush();
    expect(document.querySelector(".banner").hidden).toBe(false);
    expect(document.querySelector(".banner").textContent).toMatch(/AD-STO-001/);
    expect(app.getState().draft).not.toBeNull();
  });
  it("dados corrompidos são preservados em chave separada e o app abre vazio", () => {
    const storage = memStorage();
    storage.setItem(KEYS.sessions, "{corrompido");
    const { app } = boot(storage);
    expect(app.getState().sessions).toEqual([]);
    expect([...storage.m.keys()].some((k) => k.startsWith(KEYS.corrupt))).toBe(
      true,
    );
    expect(
      storage.m.get(
        [...storage.m.keys()].find((k) => k.startsWith(KEYS.corrupt)),
      ),
    ).toBe("{corrompido");
  });
  it("sessão inválida salva vai para quarentena em vez de ser descartada", () => {
    const storage = memStorage();
    storage.setItem(KEYS.sessions, JSON.stringify([{ id: "x", foo: 1 }]));
    const { store } = boot(storage);
    expect(store.loadSessions().sessions).toEqual([]);
    expect(store.listQuarantine().length).toBeGreaterThan(0);
  });
});

describe("importação/exportação", () => {
  it("mescla sem substituir, deduplica e permite desfazer", () => {
    const { store } = boot();
    const r = importText(JSON.stringify(legacyValores()), "a.json");
    expect(store.mergeImport(r)).toMatchObject({ added: 1, duplicates: 0 });
    expect(store.mergeImport(r)).toMatchObject({ added: 0, duplicates: 1 });
    store.mergeImport(
      importText(
        JSON.stringify(legacyValores({ energia: "2", "e1-s1-reps": "9" })),
        "b.json",
      ),
    );
    expect(store.loadSessions().sessions).toHaveLength(2);
    expect(store.restoreSnapshot()).toHaveLength(1);
  });
  it("exclusão é lógica e restaurável", () => {
    const { store } = boot();
    const s = importText(JSON.stringify(legacyValores()), "a.json").sessions[0];
    store.addSession(s);
    expect(store.softDelete(s.id)[0].deletedAt).toBeTruthy();
    expect(store.restore(s.id)[0].deletedAt).toBeUndefined();
  });
});

describe("segurança (regressão XSS)", () => {
  it("conteúdo malicioso importado nunca vira HTML", () => {
    const evil = JSON.stringify({
      app: "AD GymSpace Offline Retorno",
      data: {
        history: [
          {
            id: 1,
            day: "A",
            title: "<img src=x onerror=window.__xss=1>",
            date: "2030-01-01",
            series: [
              {
                exercise: "<img src=x onerror=window.__xss=1>",
                sets: [{ load: 1, reps: 1, done: true }],
              },
            ],
          },
        ],
      },
    });
    const storage = memStorage();
    const seed = boot(storage);
    seed.store.mergeImport(importText(evil, "e.json"));
    boot(storage);
    click("tab-history");
    document.querySelector("details summary").click();
    expect(document.querySelector("#app img")).toBeNull();
    expect(document.querySelector("#app").textContent).toContain("<img src=x");
    expect(window.__xss).toBeUndefined();
  });
});

describe("logger", () => {
  it("remove chaves sensíveis e limita o buffer", () => {
    const l = createLogger({ level: LEVELS.DEBUG });
    l.info("x", { notes: "segredo", sets: [1], day: "A", code: "AD-1" });
    const e = l.entries()[0];
    expect(JSON.stringify(e)).not.toMatch(/segredo/);
    expect(e.day).toBe("A");
    for (let i = 0; i < 500; i++) l.info("e");
    expect(l.entries().length).toBeLessThanOrEqual(200);
  });
  it("não registra DEBUG em nível INFO", () => {
    const l = createLogger({ level: LEVELS.INFO });
    l.debug("x");
    expect(l.entries()).toHaveLength(0);
  });
});
