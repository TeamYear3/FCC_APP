import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

/**
 * Suite E2E de Verificación de Alertas Forenses y Regresión (AUT-E2E-07)
 * Criterio de Aceptación: Demostrar que el arnés de pruebas genera reporte HTML navegable,
 * captura de pantalla (.png), video (.webm) y archivo de trace (.zip) ante regresiones.
 */
test.describe('AUT-E2E-07: Generación de Evidencias E2E y Registro Forense de Fallo', () => {

  test('TC-E2E-07-PASS: Flujo base de navegación y carga estable en Login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    await expect(page).toHaveTitle(/FCC APP/i);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('TC-E2E-07-FAIL: Verificación controlada de alerta ante regresión (Captura de trace, screenshot y video)', async ({ page }) => {
    // Aserción intencional exigida por la cátedra para verificar la capacidad del arnés
    // de generar evidencias forenses completas (trace.zip, screenshot .png y video .webm).
    test.fail(true, 'Fallo intencional para auditoría forense de regresiones');

    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    await expect(loginPage.emailInput).toBeVisible();

    // Elemento no existente que simula una regresión de renderizado
    await expect(page.locator('[data-testid="elemento-regresion-critica"]')).toBeVisible({ timeout: 1500 });
  });
});
