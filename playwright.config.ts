import {defineConfig, devices} from '@playwright/test';
import {loadEnvConfig} from '@next/env';

loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: '.',
  testMatch: 'site-audit.spec.ts',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3010',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3010',
    // A interface deve iniciar mesmo quando o banco local não está configurado.
    // A conexão com o banco continua coberta pelo teste dedicado de /api/health.
    url: 'http://127.0.0.1:3010',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {name: 'chromium', use: {...devices['Desktop Chrome']}},
  ],
});
