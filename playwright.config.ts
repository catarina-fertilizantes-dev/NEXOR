import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ui',
  timeout: 30000,
  expect: { timeout: 8000 },
  use: {
    baseURL: 'https://nexor-dev.vercel.app',
    headless: false,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'pt-BR',
  },
  projects: [
    {
      name: 'edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
  ],
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/ui/report' }]],
});
