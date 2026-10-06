import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 8788);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    // Fresh database + production Worker build every run.
    command: "bash scripts/e2e-server.sh",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
