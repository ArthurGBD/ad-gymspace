import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const chrome =
  process.env.CHROME_PATH ??
  ["/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync);
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    ...devices["Pixel 7"],
    launchOptions: chrome ? { executablePath: chrome } : {},
  },
  webServer: {
    command: "npm run build && node scripts/serve.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
});
