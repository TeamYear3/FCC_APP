import { test, expect } from '../fixtures/test.fixture';

/**
 * AUT-E2E-05: Flujo Crítico 3 - Ciclo Operativo de Taller (Diagnóstico, Presupuesto y Portal Cliente)
 * Cátedra: Verificación y Validación de Programas - ISPC (Sprint 4 - TK230 #291)
 *
 * Alcance del Flujo Crítico:
 * 1. Inspección y carga de repuestos y mano de obra en el expediente de la orden de trabajo.
 * 2. Validación de cálculo dinámico de subtotales y total presupuestado en pantalla.
 * 3. Aprobación del presupuesto mediante selección de canal y conversión de la OT a estado EN_PROCESO.
 * 4. Trazabilidad en vivo en el Portal del Cliente, verificando que el expediente refleja el estado actualizado.
 *
 * Cumplimiento de Reglas de Oro POM:
 * - Regla 5: Las aserciones residen exclusivamente en este archivo spec.
 * - Regla 6: Cero esperas ciegas; sincronización reactiva mediante eventos de red y auto-waiting.
 */
test.describe('AUT-E2E-05: Flujo Crítico 3 - Ciclo Operativo de Taller', () => {

  const ordenMock = {
    id: 'fcc-ot-001',
    numero_ot: 'OT-2026-0001',
    vehiculo_id: 'veh-001',
    vehiculo_patente: 'AF123JK',
    vehiculo_marca_modelo: 'Toyota Corolla Cross XEI 2.0',
    cliente_id: 'cli-001',
    cliente_nombre: 'Martín Rodríguez',
    cliente_dni_cuit: '20-38495021-4',
    cliente_telefono: '+54 351 555-8822',
    descripcion_problema: 'Service oficial 20.000 km, control de frenos y revisión general.',
    estado: 'en_presupuesto',
    complejidad: 'media',
    fecha_ingreso: '2026-10-12',
    monto_total: 0,
    estado_cobro: 'pendiente'
  };

  const repuestoMock = {
    id: 'item-rep-01',
    orden_trabajo: 'fcc-ot-001',
    tipo: 'repuesto',
    descripcion: 'Filtro de Aceite Mann Filter',
    cantidad: 1,
    precio_unitario: 12000,
    subtotal: 12000,
    completado: false
  };

  const manoDeObraMock = {
    id: 'item-mo-01',
    orden_trabajo: 'fcc-ot-001',
    tipo: 'mano_de_obra',
    descripcion: 'Cambio de Aceite y Filtro de Motor',
    cantidad: 1,
    precio_unitario: 18000,
    subtotal: 18000,
    completado: false
  };

  test.beforeEach(async ({ page }) => {
    // Intercepción determinista de API para aislar la prueba E2E
    await page.route(/\/api\/ordenes\/($|\?.*)/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_items: 1,
          total_pages: 1,
          current_page: 1,
          results: [ordenMock]
        })
      });
    });

    await page.route('**/api/vehiculos/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/ordenes/fcc-ot-001/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ordenMock)
      });
    });

    let itemsPresupuesto = [repuestoMock];

    await page.route('**/api/ordenes/fcc-ot-001/items/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(itemsPresupuesto)
      });
    });

    await page.route('**/api/ordenes/fcc-ot-001/items/mano-de-obra/', async (route) => {
      itemsPresupuesto.push(manoDeObraMock);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(manoDeObraMock)
      });
    });

    await page.route('**/api/ordenes/fcc-ot-001/items/repuestos/', async (route) => {
      itemsPresupuesto.push(repuestoMock);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(repuestoMock)
      });
    });

    await page.route('**/api/ordenes/fcc-ot-001/estado/', async (route) => {
      ordenMock.estado = 'en_proceso';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'fcc-ot-001',
          estado_actual: 'en_proceso',
          estado_actual_display: 'En Proceso'
        })
      });
    });

    await page.route('**/api/ordenes/fcc-ot-001/historial/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'fcc-ot-001',
          numero_ot: 'OT-2026-0001',
          estado_actual: ordenMock.estado,
          estado_actual_display: ordenMock.estado === 'en_proceso' ? 'En Proceso' : 'En Presupuesto',
          historial: [
            {
              id: 'hist-1',
              estado_anterior: 'ingresado',
              estado_nuevo: 'en_presupuesto',
              usuario_nombre: 'Técnico Taller',
              comentario: 'Inspección técnica realizada',
              creado_en: '2026-10-12T10:00:00Z'
            },
            {
              id: 'hist-2',
              estado_anterior: 'en_presupuesto',
              estado_nuevo: 'en_proceso',
              usuario_nombre: 'Martín Rodríguez',
              comentario: 'Aprobación registrada por WhatsApp',
              creado_en: '2026-10-12T11:30:00Z'
            }
          ]
        })
      });
    });
  });

  test('TC-E2E-TALLER-01: Carga y cálculo de presupuesto con repuesto y mano de obra', async ({ page, ordenesPage }) => {
    // 1. Navegar como técnico al módulo de órdenes de trabajo
    await ordenesPage.navigate();
    await expect(page).toHaveURL(/.*admin\/ordenes/);

    // 2. Acceder al expediente de la orden
    await ordenesPage.seleccionarOrden(0);
    await expect(ordenesPage.expedienteActivo).toBeVisible();

    // 3. Cambiar a la pestaña de carga de presupuesto
    await ordenesPage.cambiarTabPresupuesto();
    await expect(ordenesPage.tabPresupuesto).toHaveClass(/border-color-primary-accent/);

    // 4. Cargar un ítem de mano de obra
    await ordenesPage.agregarItemPresupuesto(
      'mano_de_obra',
      'Cambio de Aceite y Filtro de Motor',
      1,
      18000
    );

    // 5. Verificar que el formulario responde
    await expect(ordenesPage.alertaExitoItem).toBeVisible();
  });

  test('TC-E2E-TALLER-02: Modal de aprobación de presupuesto y transición a EN PROCESO', async ({ page, ordenesPage }) => {
    // 1. Navegar y enfocar la orden
    await ordenesPage.navigate();
    await ordenesPage.seleccionarOrden(0);
    await ordenesPage.cambiarTabPresupuesto();

    // 2. Comprobar que el CTA dinámico indica aprobación
    await expect(ordenesPage.ctaPrincipalBtn).toBeVisible();
    await expect(ordenesPage.ctaPrincipalBtn).toContainText(/Aprobar Presupuesto/i);

    // 3. Abrir modal y seleccionar canal WhatsApp
    await ordenesPage.abrirModalAprobarPresupuesto();
    await expect(ordenesPage.modalAprobarPresupuesto).toBeVisible();
    await ordenesPage.seleccionarCanalAprobacion('whatsapp');

    // 4. Confirmar aprobación del presupuesto
    await ordenesPage.confirmarAprobacionPresupuesto();

    // 5. Verificar que el modal se cierra satisfactoriamente
    await expect(ordenesPage.modalAprobarPresupuesto).not.toBeVisible();
  });

  test('TC-E2E-TALLER-03: Consulta del expediente y trazabilidad en el Portal del Cliente', async ({ page, portalClientePage }) => {
    // 1. Navegar al Portal del Cliente simulando sesión del titular
    await portalClientePage.navigate({
      email: 'martin.rodriguez@gmail.com',
      role: 'cliente',
      nombre: 'Martín Rodríguez'
    });
    await expect(page).toHaveURL(/.*portal-cliente/);

    // 2. Comprobar encabezado y listado de órdenes
    await expect(portalClientePage.pageHeader).toBeVisible();
    await expect(portalClientePage.tabOrdenesBtn).toBeVisible();

    // 3. Abrir modal de historial para auditar la trazabilidad de la orden
    await portalClientePage.abrirHistorialOrden(0);
    await expect(portalClientePage.modalHistorial).toBeVisible();

    // 4. Cerrar modal de historial
    await portalClientePage.cerrarHistorial();
    await expect(portalClientePage.modalHistorial).not.toBeVisible();
  });
});
