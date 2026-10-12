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
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/clientes')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, nombre: 'Carlos', apellido: 'Gómez', email: 'carlos@taller.com', telefono: '351444555', dni: '28111222', cuit: '20-28111222-3', activo: true }
          ])
        });
      } else if (url.includes('/ordenes')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, numero_orden: 'OT-0001', estado: 'DIAGNOSTICO', vehiculo: 'AA123BB', cliente: 1, descripcion: 'Revisión técnica' }
          ])
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
    await page.screenshot({ path: path.join(outputDir, 'captura_lighthouse_autenticacion.png'), fullPage: true });
  });

  test('Capturar pantalla: Portal del Cliente', async ({ page }) => {
    const portalPage = new PortalClientePage(page);
    await portalPage.navigate();
    await page.screenshot({ path: path.join(outputDir, 'captura_lighthouse_portal_cliente.png'), fullPage: true });
  });

  test('Capturar pantalla: Gestión de Clientes', async ({ page }) => {
    const clientesPage = new ClientesPage(page);
    await clientesPage.navigate();
    await page.screenshot({ path: path.join(outputDir, 'captura_lighthouse_clientes.png'), fullPage: true });
  });

  test('Capturar pantalla: Órdenes de Trabajo', async ({ page }) => {
    const ordenesPage = new OrdenesPage(page);
    await ordenesPage.navigate();
    await page.screenshot({ path: path.join(outputDir, 'captura_lighthouse_ordenes.png'), fullPage: true });
  });
});
