import { defineConfig, devices } from "@playwright/test";

// Port 3100, not 3000 - the user's own `next dev` often already holds 3000,
// and killing that to free the port would destroy unrelated work in progress.
const PORT = 3100;
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/qa-persistent.json",
      },
      dependencies: ["setup"],
    },
  ],
  // `next dev` (not a production build) avoids the NextAuth v5 UntrustedHost
  // failure that `next start` hits locally without AUTH_TRUST_HOST=true (see
  // .claude/skills/verify/SKILL.md) and skips a rebuild on every test run.
  // reuseExistingServer covers the common case of a server already up on
  // this port from a previous run or manual start.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npx next dev -p ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
