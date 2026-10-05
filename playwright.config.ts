import { existsSync, readdirSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/** Prefer a pre-installed Chromium (PLAYWRIGHT_BROWSERS_PATH) over downloading one. */
function chromiumPath(): string | undefined {
  if (process.env.PW_CHROMIUM) return process.env.PW_CHROMIUM;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  if (!existsSync(root)) return undefined;
  for (const d of readdirSync(root).filter((n) => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const p = `${root}/${d}/chrome-linux/chrome`;
    if (existsSync(p)) return p;
  }
  return undefined;
}

// iPhone 14 Pro geometry on Chromium (the only browser installed here): 393×852 @3x, touch.
const iphone = {
  ...devices['iPhone 14 Pro'],
  browserName: 'chromium' as const,
  defaultBrowserType: 'chromium' as const,
};

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    ...iphone,
    baseURL: 'http://localhost:4173',
    serviceWorkers: 'block' as const,
    launchOptions: { executablePath: chromiumPath(), args: ['--autoplay-policy=no-user-gesture-required'] },
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/soundscapes/',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
