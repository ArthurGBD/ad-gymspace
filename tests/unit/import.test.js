import { describe, expect, it } from "vitest";
import { importText, normalizeImport } from "../../src/validation/importer.js";
import { validateSession } from "../../src/validation/session.js";
import { parseCsv, csvCell, toCsv } from "../../src/validation/csv.js";
import { buildBackup } from "../../src/services/exporter.js";
import { LIMITS } from "../../src/domain/constants.js";
import {
  bodygymV9,
  legacyCsv,
  legacyValores,
  offlineV1Backup,
} from "../helpers/fixtures.js";

const opts = { offsetMinutes: 180 };

describe("importação de formatos legados", () => {
  it("bodygym v2–v8 (valores): preserva raw, registra transformações, não inventa dados", () => {
    const r = importText(JSON.stringify(legacyValores()), "a.json", opts);
    expect(r.rejected).toEqual([]);
    const s = r.sessions[0];
    expect(s.workoutCode).toBe("C");
    expect(s.date).toBe("2030-01-15"); // 23:30Z em UTC-3 = 20:30 local do mesmo dia
    expect(s.exercises[0].sets[0].reps).toBe(16.5);
    expect(s.exercises[0].sets[1].completed).toBe(false);
    expect(s.exercises[1].metric).toBe("TIME");
    expect(s.check.shoulderPain).toBe(7);
    expect(s.raw.valores["e1-s1-reps"]).toBe("16,5");
    expect(s.transformations.length).toBeGreaterThan(0);
    expect(validateSession(s).ok).toBe(true);
  });
  it("valor fora do intervalo vira null com nota; original fica em raw", () => {
    const r = importText(
      JSON.stringify(legacyValores({ energia: "99" })),
      "a.json",
      opts,
    );
    expect(r.sessions[0].check.energy).toBeNull();
    expect(r.sessions[0].transformations.join()).toMatch(/energia/);
    expect(r.sessions[0].raw.valores.energia).toBe("99");
  });
  it("bodygym v9", () => {
    const s = importText(JSON.stringify(bodygymV9()), "v9.json", opts)
      .sessions[0];
    expect(s.exercises[1]).toMatchObject({ metric: "TIME" });
    expect(s.exercises[1].sets[0]).toMatchObject({
      timeSeconds: 35,
      reps: null,
    });
    expect(s.exercises[0].equipmentMatch).toBe("SAME");
    expect(s.cardio.done).toBe(true);
  });
  it("backup do app offline v1 (Prancha = segundos)", () => {
    const r = importText(JSON.stringify(offlineV1Backup()), "b.json", opts);
    expect(r.sessions).toHaveLength(1);
    expect(r.sessions[0].exercises[1].sets[0]).toMatchObject({
      timeSeconds: 40,
      reps: null,
    });
    expect(r.sessions[0].date).toBe("2030-01-01");
  });
  it("CSV legado com BOM, aspas e quebra de linha", () => {
    const s = importText(legacyCsv, "x.csv", opts).sessions[0];
    expect(s.workoutCode).toBe("D");
    expect(s.exercises[0].sets[0].reps).toBe(8.5);
    expect(s.post.notes).toBe('linha1\nlinha2; com "aspas"');
  });
  it("ids determinísticos: reimportar gera o mesmo id", () => {
    const a = importText(JSON.stringify(legacyValores()), "a.json", opts)
      .sessions[0].id;
    const b = importText(JSON.stringify(legacyValores()), "a.json", opts)
      .sessions[0].id;
    expect(a).toBe(b);
  });
});

describe("arquivos inválidos, incompletos e grandes", () => {
  it("rejeita não-JSON, formato desconhecido e excesso de tamanho", () => {
    expect(() => importText("{oops", "a.json")).toThrow(/JSON/);
    expect(() => importText('{"x":1}', "a.json")).toThrow(/formato/);
    expect(() =>
      importText(" ".repeat(LIMITS.maxImportBytes + 1), "a.json"),
    ).toThrow(/grande/);
  });
  it("rejeita __proto__ e profundidade excessiva", () => {
    expect(() =>
      importText(
        '{"__proto__":{"a":1},"format":"adgymspace.backup"}',
        "a.json",
      ),
    ).toThrow();
    let deep = "1";
    for (let i = 0; i < 30; i++) deep = `{"a":${deep}}`;
    expect(() => importText(deep, "a.json")).toThrow();
  });
  it("item inválido vai para rejeitados, os válidos são aceitos", () => {
    const data = {
      app: "AD GymSpace Offline Retorno",
      data: {
        history: [
          { day: "Z", date: "2030-01-01" },
          offlineV1Backup().data.history[0],
        ],
      },
    };
    const r = normalizeImport(data, opts);
    expect(r.sessions).toHaveLength(1);
    expect(r.rejected).toHaveLength(1);
  });
  it("CSV com aspas abertas e cabeçalho errado", () => {
    expect(() => parseCsv('a;"b')).toThrow();
    expect(() => importText("x;y\r\n1;2", "a.csv")).toThrow();
  });
  it("backup mais novo que o app é recusado; checksum divergente vira aviso", () => {
    expect(() =>
      normalizeImport({
        format: "adgymspace.backup",
        schemaVersion: 99,
        sessions: [],
      }),
    ).toThrow(/mais nova/);
    const s = importText(
      JSON.stringify(legacyValores()),
      "a.json",
      opts,
    ).sessions;
    const b = buildBackup(s);
    b.checksum = "bad";
    const r = normalizeImport(b);
    expect(r.sessions).toHaveLength(1);
    expect(r.warnings.join()).toMatch(/checksum/);
  });
  it("roundtrip export → import preserva tudo", () => {
    const s = importText(JSON.stringify(bodygymV9()), "v9.json", opts).sessions;
    const r = normalizeImport(JSON.parse(JSON.stringify(buildBackup(s))));
    expect(r.rejected).toEqual([]);
    expect(r.sessions).toEqual(s);
    expect(r.warnings).toEqual([]);
  });
});

describe("segurança CSV/XSS", () => {
  it("neutraliza injeção de fórmula na exportação", () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell("+1")).toBe("'+1");
    expect(toCsv([["a", 1]])).toBe("a;1");
  });
});
