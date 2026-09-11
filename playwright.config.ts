import { defineConfig } from '@playwright/test';

/**
 * Integration tests for scene v2 (T24). They drive the real page in Chromium,
 * so they need the Vite dev server: `reuseExistingServer` keeps a dev server
 * that is already on 5199 (the port used for visual QA) instead of fighting it
 * for the port.
 *
 * `e2e/` is deliberately outside `tsconfig.app.json` ("src") and
 * `vitest.config.ts` ("src/**"): `npm test` stays a pure unit run and
 * `npx tsc -b` keeps typechecking only what ships.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5199',
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 5199',
    url: 'http://localhost:5199',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
