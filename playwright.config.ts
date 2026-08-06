import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests/ui',
  timeout: 30000,
  expect: { timeout: 8000 },
  use: {
    baseURL: 'https://nexor-dev.vercel.app',
    headless: isCI,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'pt-BR',
  },
  projects: [
    // Uso local — Edge com interface visível
    {
      name: 'edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    // CI — Chromium headless (Edge não disponível em Linux)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/ui/report' }]],
});
