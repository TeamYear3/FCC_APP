import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración oficial de Playwright E2E y Accesibilidad (WCAG 2.2 AA)
 * Materia: Verificación y Validación de Programas - Cátedra ISPC
 * Criterios: Pirámide de Cohn, Auto-waiting nativo, POM desacoplado y evidencias forenses
 */
export default defineConfig({
  testDir: './e2e/tests',
  outputDir: './e2e/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : 2,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/test-results.json' }]
  ],
  use: {
    baseURL: process.env['E2E_BASE_URL'] || 'http://localhost:4300',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10 * 1000,
    navigationTimeout: 15 * 1000,
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
