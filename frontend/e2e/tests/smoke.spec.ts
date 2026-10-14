import { test, expect } from '../fixtures/test.fixture';

/**
 * Smoke Test de Arquitectura E2E (AUT-E2E-01 / TK215)
 * Cátedra: Verificación y Validación de Programas - ISPC
 *
 * Objetivo:
 * Validar la inicialización hermética del framework Playwright, la inyección
 * de dependencias mediante CustomFixtures y el cumplimiento de las 6 reglas
 * de oro del Page Object Model (POM).
 */
test.describe('AUT-E2E-01: Verificación de Arquitectura Base Playwright y Fixtures POM', () => {

  test.beforeEach(async ({ page }) => {
    // Intercepción determinista para aislar la prueba de backend
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', results: [] }),
      });
    });
  });

  test('TC-SMOKE-01: Inyección de fixtures POM y navegación reactiva en LoginPage', async ({ page, loginPage }) => {
    // Arrange & Act
    await loginPage.navigate();

    // Assert (Regla 5 POM: aserciones en el test spec, no en el Page Object)
    await expect(page).toHaveURL(/.*autenticacion/);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('TC-SMOKE-02: Navegación encapsulada a ClientesPage con sesión simulada', async ({ page, clientesPage }) => {
    // Arrange & Act
    await clientesPage.navigate();

    // Assert
    await expect(page).toHaveURL(/.*admin\/clientes/);
    await expect(clientesPage.nuevoClienteButton).toBeVisible();
  });

  test('TC-SMOKE-03: Inicialización de DashboardPage y verificación de controles de navegación', async ({ page, dashboardPage }) => {
    // Arrange & Act
    await dashboardPage.navigate();

    // Assert
    await expect(page).toHaveURL(/.*admin\/dashboard/);
  });
});
