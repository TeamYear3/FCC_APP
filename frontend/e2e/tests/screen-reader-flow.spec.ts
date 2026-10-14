import { test, expect } from '@playwright/test';
import { PortalClientePage } from '../pages/portal-cliente.page';

/**
 * Suite E2E de Auditoría del Árbol de Accesibilidad para Lector de Pantalla NVDA (ACC-05 / TK236)
 * Valida que cada elemento interactivo exponga roles, nombres accesibles y estados descriptivos
 * para una locución oral clara, concisa y sin ambigüedades.
 */
test.describe('ACC-05: Auditoría del Flujo Crítico para Lector de Pantalla (NVDA)', () => {

  test.beforeEach(async ({ page }) => {
    // Aislar WebSocket para evitar conexiones externas colgadas durante el cierre del contexto
    await page.addInitScript(() => {
      class MockWebSocket extends EventTarget {
        url: string;
        readyState = 1;
        onopen: any = null;
        onmessage: any = null;
        onclose: any = null;
        onerror: any = null;
        constructor(url: string) {
          super();
          this.url = url;
          setTimeout(() => {
            if (this.onopen) this.onopen(new Event('open'));
            this.dispatchEvent(new Event('open'));
          }, 10);
        }
        send() {}
        close() {
          this.readyState = 3;
          if (this.onclose) this.onclose(new Event('close'));
          this.dispatchEvent(new Event('close'));
        }
      }
      (window as any).WebSocket = MockWebSocket;
    });

    // Interceptar backend DRF con datos deterministas para el Portal del Cliente
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/ordenes')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total_items: 1,
            total_pages: 1,
            current_page: 1,
            results: [
              {
                id: '101',
                numero_ot: 'OT-2026-0042',
                estado: 'DIAGNOSTICO',
                vehiculo_patente: 'AE456CD',
                vehiculo_marca_modelo: 'Toyota Corolla',
                descripcion_problema: 'Mantenimiento programado y chequeo de frenos',
                fecha_ingreso: '2026-10-10',
                monto_total: '125000.00'
              }
            ]
          })
        });
      } else if (url.includes('/vehiculos')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
      }
    });
  });

  test('TC-SR-01: Verificación de estructura landmark y roles semánticos en Portal del Cliente', async ({ page }) => {
    const portalPage = new PortalClientePage(page);
    await portalPage.navigate();

    // Comprobar la presencia de regiones landmarks requeridas por NVDA
    const header = page.locator('header');
    await expect(header).toBeVisible();

    const heading = page.getByRole('heading', { name: /portal del cliente/i, level: 1 });
    await expect(heading).toBeVisible();
  });

  test('TC-SR-02: Verificación de nombres accesibles y estados en controles interactivos', async ({ page }) => {
    const portalPage = new PortalClientePage(page);
    await portalPage.navigate();

    // Botón Mi Perfil
    const perfilBtn = page.getByRole('button', { name: /mi perfil/i });
    await expect(perfilBtn).toBeVisible();

    // Comprobar que no existen botones con nombres vacíos en el árbol accesible
    const namelessButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.filter(b => {
        const text = (b.innerText || b.getAttribute('aria-label') || '').trim();
        return text.length === 0;
      }).length;
    });

    expect(namelessButtons, 'Se encontraron botones interactivos sin texto ni aria-label accesible').toBe(0);
  });

  test('TC-SR-03: Anuncios accesibles de estado dinámico sin saturación sonora', async ({ page }) => {
    const portalPage = new PortalClientePage(page);
    await portalPage.navigate();

    // Validar que el indicador en vivo tenga texto legible
    const statusBadge = page.locator('header').getByText(/en vivo|conectando/i);
    await expect(statusBadge).toBeVisible();
  });
});
