import { expect, test } from "@playwright/test";

const t = (page, id) => page.getByTestId(id);
const CODES = ["A", "B", "C", "D", "E"];

test("início: seleção A–E visível e nenhuma sessão começa sozinha", async ({
  page,
}) => {
  await page.goto("/");
  await expect(t(page, "workout-selector-title")).toBeVisible();
  for (const c of CODES) await expect(t(page, `day-${c}`)).toBeVisible();
  await expect(t(page, "preview-placeholder")).toBeVisible();
  await expect(t(page, "start")).toHaveCount(0);
  await t(page, "day-B").click();
  expect(
    await page.evaluate(() => Object.keys(localStorage).join(",")),
  ).not.toContain("draft");
});

test("prévia: B mostra exercícios do B, troca para C e fecha sem iniciar", async ({
  page,
}) => {
  await page.goto("/");
  await t(page, "day-B").click();
  await expect(t(page, "day-detail")).toContainText("Leg Press");
  await expect(t(page, "start")).toBeEnabled();
  await t(page, "day-C").click();
  await expect(t(page, "day-detail")).toContainText("Pulldown");
  await expect(t(page, "day-detail")).not.toContainText("Leg Press");
  await t(page, "close-preview").click();
  await expect(t(page, "start")).toHaveCount(0);
});

test("rascunho: seleção visível, iniciar bloqueado e retomada correta", async ({
  page,
}) => {
  await page.goto("/");
  await t(page, "day-B").click();
  await t(page, "start").click();
  await t(page, "check-energy").fill("4");
  await t(page, "to-exec").click();
  await t(page, "tab-today").click();
  await expect(t(page, "session-banner")).toBeVisible();
  for (const c of CODES) await expect(t(page, `day-${c}`)).toBeVisible();
  await t(page, "day-C").click();
  await expect(t(page, "start")).toBeDisabled();
  await page.reload();
  await expect(t(page, "session-banner")).toBeVisible();
  await expect(t(page, "session-banner")).toContainText("Treino B");
  await t(page, "resume").click();
  await expect(t(page, "ex-title")).toContainText("Leg Press");
});

test("reiniciar com rascunho libera nova escolha sem apagar histórico", async ({
  page,
}) => {
  await page.goto("/");
  await t(page, "day-A").click();
  await t(page, "start").click();
  await t(page, "tab-today").click();
  await t(page, "restart").click();
  await page
    .getByRole("button", { name: "Reiniciar", exact: true })
    .last()
    .click();
  await expect(t(page, "session-banner")).toHaveCount(0);
  await t(page, "day-D").click();
  await expect(t(page, "start")).toBeEnabled();
});

test("imagens da prévia carregam", async ({ page }) => {
  await page.goto("/");
  await t(page, "day-A").click();
  const imgs = t(page, "day-detail").locator("img");
  await expect(imgs.first()).toBeVisible();
  await imgs.first().scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      imgs.evaluateAll((l) =>
        l.every((i) => i.hidden || (i.complete && i.naturalWidth > 0)),
      ),
    )
    .toBe(true);
});

for (const [w, h] of [
  [360, 800],
  [390, 844],
  [412, 915],
  [768, 1024],
  [1440, 900],
]) {
  test(`layout ${w}px: sem overflow e captura`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/");
    await page.screenshot({ path: `test-results/screens/sel-${w}-home.png` });
    await t(page, "day-E").click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await t(page, "day-detail").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `test-results/screens/sel-${w}-preview.png`,
    });
  });
}
