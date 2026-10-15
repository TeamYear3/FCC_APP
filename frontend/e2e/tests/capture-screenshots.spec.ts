import { test, expect } from '@playwright/test';
import * as path from 'path';
import { LoginPage } from '../pages/login.page';
import { PortalClientePage } from '../pages/portal-cliente.page';
import { ClientesPage } from '../pages/clientes.page';
import { OrdenesPage } from '../pages/ordenes.page';

/**
 * Captura automatizada de pantallas para auditoría de accesibilidad Lighthouse (ACC-02 / TK233)
 */
test.describe('ACC-02: Captura de Pantallas para Auditoría de Accesibilidad Lighthouse', () => {

  const outputDir = path.resolve(__dirname, '../../../docs/evidencias_accesibilidad');

  test.beforeEach(async ({ page }) => {
    // Interceptar API DRF para renderizado completo y determinista
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/clientes')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'cliente-e2e-1', nombre: 'Carlos', apellido: 'Gómez', tipo_documento: 'DNI', dni_cuit: '28111222', condicion_iva: 'CF', telefono: '351444555', activo: true }
          ])
        });
      } else if (url.includes('/ordenes')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total_items: 1,
            total_pages: 1,
            current_page: 1,
            results: [
              { id: 'orden-e2e-1', numero_ot: 'OT-0001', estado: 'DIAGNOSTICO', vehiculo_patente: 'AA123BB', cliente_nombre: 'Carlos Gómez', descripcion_problema: 'Revisión técnica' }
            ]
          })
        });
      } else if (url.includes('/vehiculos')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, patente: 'AA123BB', marca: 'Ford', modelo: 'Focus', anio: 2019, cliente: 1 }
          ])
        });
      } else if (url.includes('/turnos')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
      }
    });
  });

  test('Capturar pantalla: Login / Autenticación', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await expect(loginPage.emailInput).toBeVisible();
    await page.screenshot({ path: path.join(outputDir, 'captura_lighthouse_autenticacion.png'), fullPage: true });
  });

  test('Capturar pantalla: Portal del Cliente', async ({ page }) => {
    const portalPage = new PortalClientePage(page);
    await portalPage.navigate();
    await expect(portalPage.pageHeader).toBeVisible();
    await page.screenshot({ path: path.join(outputDir, 'captura_lighthouse_portal_cliente.png'), fullPage: true });
  });

  test('Capturar pantalla: Gestión de Clientes', async ({ page }) => {
    const clientesPage = new ClientesPage(page);
    await clientesPage.navigate();
    await expect(clientesPage.clientesTable).toBeVisible();
    await page.screenshot({ path: path.join(outputDir, 'captura_lighthouse_clientes.png'), fullPage: true });
  });

  test('Capturar pantalla: Órdenes de Trabajo', async ({ page }) => {
    const ordenesPage = new OrdenesPage(page);
    await ordenesPage.navigate();
    await expect(ordenesPage.kanbanBoard.first()).toBeVisible();
    await page.screenshot({ path: path.join(outputDir, 'captura_lighthouse_ordenes.png'), fullPage: true });
  });
});
