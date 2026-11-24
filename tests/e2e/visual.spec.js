import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

const SIZES = [
  [360, 800],
  [390, 844],
  [412, 915],
  [768, 1024],
  [1440, 900],
];
const OUT = "test-results/screens";
mkdirSync(OUT, { recursive: true });
const t = (page, id) => page.getByTestId(id);

async function noHorizontalOverflow(page) {
  const o = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(o).toBeLessThanOrEqual(0);
}

/** O elemento focado/ação principal não pode ficar atrás da navegação fixa. */
async function notBehindNav(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const [box, nav] = await Promise.all([
    locator.boundingBox(),
    page.locator(".bottom-nav").boundingBox(),
  ]);
  expect(box.y + box.height).toBeLessThanOrEqual(nav.y + 1);
}

for (const [w, h] of SIZES) {
  test(`telas principais ${w}x${h}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(t(page, "day-A")).toBeVisible();
    await noHorizontalOverflow(page);
    await page.screenshot({ path: `${OUT}/${w}-home.png` });
    await t(page, "day-A").click();
    await notBehindNav(page, t(page, "start"));
    await t(page, "start").click();
    await page.screenshot({ path: `${OUT}/${w}-checkin.png` });
    await t(page, "check-energy").fill("4");
    await t(page, "to-exec").click();
    await expect(t(page, "ex-title")).toBeVisible();
    await noHorizontalOverflow(page);
    await page.screenshot({ path: `${OUT}/${w}-exec.png` });
    await notBehindNav(page, t(page, "next-ex"));

    await t(page, "load-0").fill("40");
    await t(page, "reps-0").fill("8");
    await t(page, "rir-0").fill("2");
    await t(page, "done-0").click();
    await expect(page.locator("#rest-box")).toHaveAttribute(
      "data-state",
      "running",
    );
    await page.screenshot({ path: `${OUT}/${w}-exec-rest.png` });

    for (const tab of ["history", "data"]) {
      await t(page, `tab-${tab}`).click();
      await noHorizontalOverflow(page);
      await page.screenshot({ path: `${OUT}/${w}-${tab}.png` });
    }
    expect(errors).toEqual([]);
    await ctx.close();
  });
}

test("alvos de toque da execução ≥ 44px", async ({ page }) => {
  await page.goto("/");
  if ((await t(page, "start").count()) === 0) await t(page, "day-A").click();
  await t(page, "start").click();
  await t(page, "check-energy").fill("4");
  await t(page, "to-exec").click();
  for (const id of ["done-0", "load-0", "reps-0", "rir-0", "next-ex"]) {
    const b = await t(page, id).boundingBox();
    expect(b.height, id).toBeGreaterThanOrEqual(44);
    expect(b.width, id).toBeGreaterThanOrEqual(44);
  }
});

test("mídia: carrega, expande, alterna posição e mostra a variante", async ({
  page,
}) => {
  await page.goto("/");
  if ((await t(page, "start").count()) === 0) await t(page, "day-A").click();
  await t(page, "start").click();
  await t(page, "check-energy").fill("4");
  await t(page, "to-exec").click();
  const img = t(page, "media-img");
  await expect(img).toBeVisible();
  await expect
    .poll(() => img.evaluate((i) => i.complete && i.naturalWidth > 0))
    .toBe(true);
  await t(page, "media-expand").click();
  await expect(t(page, "media")).toHaveAttribute("data-size", "large");
  await t(page, "media-toggle").click();
  await expect(t(page, "media-img")).toHaveAttribute("src", /-1\.jpg$/);
});

test("mídia: falha de rede mostra estado informativo, sem imagem quebrada", async ({
  page,
}) => {
  await page.route("**/media/exercises/**", (r) => r.abort());
  await page.goto("/");
  if ((await t(page, "start").count()) === 0) await t(page, "day-A").click();
  await t(page, "start").click();
  await t(page, "check-energy").fill("4");
  await t(page, "to-exec").click();
  await expect(
    page.getByRole("status").filter({ hasText: "Não foi possível" }),
  ).toBeVisible();
  await expect(t(page, "media-img")).toHaveCount(0);
  await expect(t(page, "set-0")).toBeVisible();
});

test("exercício sem mídia verificada mostra só instruções", async ({
  page,
}) => {
  await page.goto("/");
  await t(page, "day-C").click();
  if ((await t(page, "start").count()) === 0) await t(page, "day-A").click();
  await t(page, "start").click();
  await t(page, "check-energy").fill("4");
  await t(page, "to-exec").click();
  await t(page, "next-ex").click(); // Remada com peito apoiado na máquina
  await expect(t(page, "media-empty")).toBeVisible();
  await page.getByTestId("instructions").locator("summary").click();
  await expect(page.getByText("Preparação")).toBeVisible();
});

test("descanso: pausar, continuar, ajustar e pular", async ({ page }) => {
  await page.goto("/");
  if ((await t(page, "start").count()) === 0) await t(page, "day-A").click();
  await t(page, "start").click();
  await t(page, "check-energy").fill("4");
  await t(page, "to-exec").click();
  await t(page, "load-0").fill("40");
  await t(page, "reps-0").fill("8");
  await t(page, "rir-0").fill("2");
  await t(page, "done-0").click();
  const box = page.locator("#rest-box");
  await t(page, "rest-toggle").click();
  await expect(box).toHaveAttribute("data-state", "paused");
  await t(page, "rest-plus").click();
  await t(page, "rest-toggle").click();
  await expect(box).toHaveAttribute("data-state", "running");
  await t(page, "rest-skip").click();
  await expect(box).toHaveAttribute("data-state", "idle");
});

test("histórico vazio: gráfico não inventa dados", async ({ page }) => {
  await page.goto("/");
  await t(page, "tab-history").click();
  await expect(t(page, "history-empty")).toBeVisible();
  await expect(t(page, "evo-chart")).toHaveCount(0);
});
