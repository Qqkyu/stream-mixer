import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

const systemChrome = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
].find((path): path is string => Boolean(path && existsSync(path)));

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4323",
    viewport: { width: 2048, height: 1152 },
    launchOptions: systemChrome ? { executablePath: systemChrome } : {},
  },
  webServer: {
    command: "pnpm preview --host 127.0.0.1 --port 4323",
    url: "http://127.0.0.1:4323",
    reuseExistingServer: false,
  },
});
