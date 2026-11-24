import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const t = (page, id) => page.getByTestId(id);

async function fillSet(page, i, load, reps, rir) {
  await t(page, `load-${i}`).fill(load);
  await t(page, `reps-${i}`).fill(reps);
  await t(page, `rir-${i}`).fill(rir);
  await t(page, `done-${i}`).click();
}

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (e) => {
    throw e;
  });
  await page.goto("/");
});

test("fluxo completo: treino → histórico → exportar backup", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: "Qual treino vamos fazer hoje?" }),
  ).toBeVisible();
  await t(page, "day-B").click();
  await t(page, "start").click();
  await t(page, "check-energy").fill("4");
  await t(page, "to-exec").click();

  await fillSet(page, 0, "40,5", "10", "2");
  await expect(page.locator("#rest-box [data-rest-time]")).toContainText(
    /\d:\d\d/,
  ); // descanso iniciado
  await fillSet(page, 1, "40", "9", "1");

  const titles = [];
  for (let n = 0; n < 20; n++) {
    titles.push(await t(page, "ex-title").textContent());
    if (await t(page, "to-post").count()) break;
    await t(page, "next-ex").click();
  }
  expect(new Set(titles).size).toBeGreaterThan(3);
  await t(page, "to-post").click();
  await t(page, "post-rating").fill("8");
  await t(page, "finish").click();
  await expect(t(page, "summary")).toBeVisible();

  await t(page, "tab-history").click();
  await expect(t(page, "hist-item")).toHaveCount(1);

  await t(page, "tab-data").click();
  const [dl] = await Promise.all([
    page.waitForEvent("download"),
    t(page, "export-json").click(),
  ]);
  const backup = JSON.parse(readFileSync(await dl.path(), "utf8"));
  expect(backup.format).toBe("adgymspace.backup");
  expect(backup.sessions).toHaveLength(1);
  expect(backup.sessions[0].exercises[0].sets[0]).toMatchObject({
    loadKg: 40.5,
    reps: 10,
    rir: 2,
  });
});

test("reabrir após fechamento inesperado retoma o rascunho; reiniciar preserva histórico", async ({
  page,
}) => {
  if ((await t(page, "start").count()) === 0) await t(page, "day-A").click();
  await t(page, "start").click();
  await t(page, "to-exec").click();
  await fillSet(page, 0, "20", "12", "3");
  await page.reload();
  await t(page, "resume").click();
  await expect(t(page, "load-0")).toHaveValue("20");
  await expect(t(page, "done-0")).toHaveAttribute("aria-pressed", "true");

  await t(page, "restart").first().click();
  await t(page, "dlg-ok").click();
  await expect(t(page, "day-A")).toBeVisible();
  await expect(t(page, "session-banner")).toHaveCount(0);
  await t(page, "tab-data").click();
  await expect(t(page, "recover-draft")).toHaveCount(1);
  await t(page, "recover-draft").click();
  await expect(t(page, "load-0")).toHaveValue("20");
});

test("estado vazio e navegação mobile", async ({ page }) => {
  await t(page, "tab-history").click();
  await expect(t(page, "history-empty")).toBeVisible();
  const box = await t(page, "tab-data").boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
});

test("dados corrompidos não derrubam o app e são preservados", async ({
  page,
}) => {
  await page.evaluate(() => {
    localStorage.setItem("adgymspace.v2.sessions", "{quebrado");
    localStorage.setItem("adgymspace.v2.draft", "xx");
  });
  await page.reload();
  await expect(t(page, "day-A")).toBeVisible();
  await expect(page.locator(".toast").first()).toContainText("AD-STO-002");
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(
    keys.filter((k) => k.includes("corrupt")).length,
  ).toBeGreaterThanOrEqual(1);
});

test("importação: arquivo inválido mostra erro com código; legado válido é mesclado sem duplicar", async ({
  page,
}) => {
  await t(page, "tab-data").click();
  await t(page, "import-file").setInputFiles({
    name: "ruim.json",
    mimeType: "application/json",
    buffer: Buffer.from("{nao json"),
  });
  await expect(page.locator(".toast-error")).toContainText("AD-IMP-002");

  const ok = {
    schema: "bodygym.session.v7",
    ciclo: 1,
    treino: "C",
    data: "2030-01-15T12:00:00.000Z",
    valores: {
      "e1-s1-carga": "10",
      "e1-s1-reps": "8,5",
      observacoes: "<img src=x onerror=window.__x=1>",
    },
  };
  const file = {
    name: "sint.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(ok)),
  };
  await t(page, "import-file").setInputFiles(file);
  await expect(page.locator(".toast").last()).toContainText("1 novas");
  await t(page, "import-file").setInputFiles(file);
  await expect(page.locator(".toast").last()).toContainText("1 duplicadas");
  await t(page, "tab-history").click();
  await expect(t(page, "hist-item")).toHaveCount(1);
  expect(await page.evaluate(() => window.__x)).toBeUndefined();
});

test("CSP bloqueia script inline", async ({ page }) => {
  const blocked = await page.evaluate(
    () =>
      new Promise((res) => {
        document.addEventListener("securitypolicyviolation", () => res(true));
        const s = document.createElement("script");
        s.textContent = "window.__pwn=1";
        document.body.append(s);
        setTimeout(() => res(false), 500);
      }),
  );
  expect(blocked).toBe(true);
});
