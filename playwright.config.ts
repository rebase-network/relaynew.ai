import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

const isDeployedRun = process.env.E2E_DEPLOYED === "1";
const webBaseUrl = process.env.WEB_BASE_URL ?? "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: webBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: isDeployedRun
    ? undefined
    : [
        {
          command: "bash scripts/e2e-start-api.sh",
          url: "http://127.0.0.1:8787/health",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: "pnpm --filter @relaynews/web run dev -- --host 127.0.0.1 --port 4173",
          url: "http://127.0.0.1:4173",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: "pnpm --filter @relaynews/admin run dev -- --host 127.0.0.1 --port 4174",
          url: "http://127.0.0.1:4174",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
