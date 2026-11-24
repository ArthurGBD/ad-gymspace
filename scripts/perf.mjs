// Mede (sem inventar): tempo de import/validação, startup e render com histórico sintético grande.
import { chromium } from "@playwright/test";
import { existsSync, statSync } from "node:fs";
import { importText } from "../src/validation/importer.js";
import { buildBackup } from "../src/services/exporter.js";

const N = Number(process.env.N ?? 2000);
const synth = (i) => ({
  schema: "bodygym.session.v7",
  ciclo: 1,
  treino: "ABCDE"[i % 5],
  data: new Date(Date.UTC(2020, 0, 1) + i * 86400000).toISOString(),
  valores: Object.fromEntries(
    ["1", "2", "3", "4", "5", "6"].flatMap((e) =>
      [1, 2, 3].flatMap((s) => [
        [`e${e}-s${s}-carga`, String(10 + (i % 7))],
        [`e${e}-s${s}-reps`, "10"],
      ]),
    ),
  ),
});
let t = performance.now();
const sessions = Array.from(
  { length: N },
  (_, i) => importText(JSON.stringify(synth(i)), "s.json").sessions[0],
);
const tImport = performance.now() - t;
t = performance.now();
const json = JSON.stringify(buildBackup(sessions));
const tExport = performance.now() - t;
t = performance.now();
const back = importText(json, "b.json");
const tReimport = performance.now() - t;

const chrome = ["/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync);
const browser = await chromium.launch({ executablePath: chrome });
const page = await (
  await browser.newContext({ viewport: { width: 412, height: 915 } })
).newPage();
await page.goto("http://127.0.0.1:4173/");
await page.evaluate(
  (s) => localStorage.setItem("adgymspace.v2.sessions", s),
  JSON.stringify(sessions),
);
const runs = [];
for (let k = 0; k < 5; k++) {
  await page.reload();
  runs.push(
    await page.evaluate(() => {
      const n = performance.getEntriesByType("navigation")[0];
      return { dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd };
    }),
  );
}
await page.getByTestId("tab-history").click();
const hist = await page.evaluate(
  () => document.querySelectorAll("[data-testid=hist-item]").length,
);
const heap = await page.evaluate(
  () => performance.memory?.usedJSHeapSize ?? null,
);
await browser.close();
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
console.log(
  JSON.stringify(
    {
      sessions: N,
      backupBytes: json.length,
      bundleBytes: statSync("dist/app.js").size,
      normalizeAndValidate_ms: Math.round(tImport),
      exportJson_ms: Math.round(tExport),
      reimportBackup_ms: Math.round(tReimport),
      reimported: back.sessions.length,
      startup_median_ms: {
        domContentLoaded: Math.round(med(runs.map((r) => r.dcl))),
        load: Math.round(med(runs.map((r) => r.load))),
      },
      historyItemsRenderedFirstPage: hist,
      jsHeapBytes: heap,
    },
    null,
    2,
  ),
);
