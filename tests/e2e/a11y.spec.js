import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const theme of ["dark", "light"]) {
  test(`axe WCAG 2.x A/AA sem violações (${theme})`, async ({ page }) => {
    await page.goto("/");
    await page.evaluate((th) => {
      document.documentElement.dataset.theme = th;
    }, theme);
    const run = async (label) => {
      const r = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        r.violations.map((v) => `${label}:${v.id}:${v.nodes[0].target}`),
      ).toEqual([]);
    };
    await run("home");
    await page.getByTestId("day-A").click();
    await page.getByTestId("start").click();
    await run("checkin");
    await page.getByTestId("to-exec").click();
    await page.getByTestId("done-0").click();
    await run("exec");
    await page.getByTestId("tab-history").click();
    await run("history");
    await page.getByTestId("tab-data").click();
    await run("data");
  });
}
