import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { LoginPage } from '../pages/login.page';
import { PortalClientePage } from '../pages/portal-cliente.page';
import { ClientesPage } from '../pages/clientes.page';
import { OrdenesPage } from '../pages/ordenes.page';

/**
 * Suite de Pruebas de Accesibilidad Automatizada (ACC-01 / US-03)
 * Estándar: WCAG 2.2 Nivel AA
 * Criterio de Aceptación: 0 violaciones de impacto Critical o Serious
 */
test.describe('ACC-01: Auditoría Automatizada de Accesibilidad con axe-core (WCAG 2.2 AA)', () => {

  test.beforeEach(async ({ page }) => {
    // Interceptar llamadas al backend DRF para garantizar determinismo y aislamiento E2E
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/clientes')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, nombre: 'Juan', apellido: 'Pérez', email: 'juan@test.com', telefono: '351111222', dni: '30111222', cuit: '20-30111222-3', activo: true }
          ])
        });
      } else if (url.includes('/ordenes')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, numero_orden: 'OT-0001', estado: 'DIAGNOSTICO', vehiculo: 'AA123BB', cliente: 1, descripcion: 'Cambio de pastillas' }
          ])
        });
      } else if (url.includes('/vehiculos')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, patente: 'AA123BB', marca: 'Toyota', modelo: 'Corolla', anio: 2020, cliente: 1 }
          ])
        });
      } else if (url.includes('/turnos')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({})
        });
      }
    });
  });

  test('TC-ACC-01: Login y Autenticación cumple con WCAG 2.2 AA sin violaciones críticas/graves', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    const criticalOrSeriousViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalOrSeriousViolations, `Violaciones graves o críticas detectadas: ${JSON.stringify(criticalOrSeriousViolations.map(v => ({ id: v.id, impact: v.impact, help: v.help })))}`).toHaveLength(0);
  });

  test('TC-ACC-02: Portal del Cliente cumple con WCAG 2.2 AA sin violaciones críticas/graves', async ({ page }) => {
    const portalPage = new PortalClientePage(page);
    await portalPage.navigate();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    const criticalOrSeriousViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalOrSeriousViolations, `Violaciones graves o críticas detectadas: ${JSON.stringify(criticalOrSeriousViolations.map(v => ({ id: v.id, impact: v.impact, help: v.help })))}`).toHaveLength(0);
  });

  test('TC-ACC-03: Módulo de Gestión de Clientes cumple con WCAG 2.2 AA sin violaciones críticas/graves', async ({ page }) => {
    const clientesPage = new ClientesPage(page);
    await clientesPage.navigate();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    const criticalOrSeriousViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalOrSeriousViolations, `Violaciones graves o críticas detectadas: ${JSON.stringify(criticalOrSeriousViolations.map(v => ({ id: v.id, impact: v.impact, help: v.help })))}`).toHaveLength(0);
  });

  test('TC-ACC-04: Módulo de Órdenes de Trabajo cumple con WCAG 2.2 AA sin violaciones críticas/graves', async ({ page }) => {
    const ordenesPage = new OrdenesPage(page);
    await ordenesPage.navigate();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    const criticalOrSeriousViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalOrSeriousViolations, `Violaciones graves o críticas detectadas: ${JSON.stringify(criticalOrSeriousViolations.map(v => ({ id: v.id, impact: v.impact, help: v.help })))}`).toHaveLength(0);
  });

  test('TC-ACC-05: Verificación de controles interactivos con nombres accesibles y etiquetas legibles', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Comprobar que los botones y campos de entrada poseen nombres accesibles
    const emailInput = page.getByRole('textbox', { name: /correo/i });
    const submitButton = page.getByRole('button', { name: 'Iniciar Sesión', exact: true });
    const googleButton = page.getByRole('button', { name: /google/i });

    await expect(emailInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(googleButton).toBeVisible();
  });
});
