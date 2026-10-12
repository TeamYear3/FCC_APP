import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración oficial de Playwright E2E y Accesibilidad (WCAG 2.2 AA)
 * Verificación y Validación de Programas - Cátedra ISPC
 */
export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/test-results.json' }]
  ],
  use: {
    baseURL: process.env['E2E_BASE_URL'] || 'http://localhost:4300',
    trace: process.env['RECORD_EVIDENCE'] ? 'on' : 'retain-on-failure',
    screenshot: process.env['RECORD_EVIDENCE'] ? 'on' : 'only-on-failure',
    video: process.env['RECORD_EVIDENCE'] ? 'on' : 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node ./e2e/serve-dist.js',
    url: 'http://localhost:4300',
    reuseExistingServer: !process.env['CI'],
    timeout: 30 * 1000,
  },
});
