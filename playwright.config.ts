import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run db:seed && npm run build && XDG_CONFIG_HOME=$PWD/.config next start --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: {
      E2E_TEST_SECRET: process.env.E2E_TEST_SECRET || "local-e2e-secret",
      E2E_STRIPE_MODE: "mock",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3100",
      NEXTAUTH_URL: "http://127.0.0.1:3100",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
