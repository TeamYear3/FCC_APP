import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * OrdenesPage - Page Object Model para el Módulo de Órdenes de Trabajo (OT)
 * Cátedra: Verificación y Validación de Programas - ISPC (Sprint 4 - TK230 #291)
 *
 * Cumplimiento de Reglas de Oro POM:
 * - Regla 5: NO contiene aserciones (las aserciones pertenecen a los archivos *.spec.ts).
 * - Regla 6: Cero esperas ciegas; aprovecha auto-waiting y eventos de red/DOM.
 */
export class OrdenesPage extends BasePage {
  readonly searchInput: Locator;
  readonly nuevaOrdenButton: Locator;
  readonly kanbanBoard: Locator;
  readonly tablaOrdenes: Locator;
  readonly filasOrdenes: Locator;
  readonly expedienteActivo: Locator;
  readonly tituloVehiculoExpediente: Locator;
  readonly badgeEstadoExpediente: Locator;
  readonly totalPresupuestoHeader: Locator;

  // Pestañas del Expediente
  readonly tabResumen: Locator;
  readonly tabPresupuesto: Locator;
  readonly tabImagenes: Locator;

  // Formulario de Carga de Ítems de Presupuesto (PresupuestoFormComponent)
  readonly tipoItemRepuestoBtn: Locator;
  readonly tipoItemManoDeObraBtn: Locator;
  readonly descripcionItemInput: Locator;
  readonly cantidadItemInput: Locator;
  readonly precioUnitarioItemInput: Locator;
  readonly subtotalItemBadge: Locator;
  readonly totalEstimadoBadge: Locator;
  readonly agregarItemBtn: Locator;
  readonly tablaItemsPresupuesto: Locator;
  readonly alertaExitoItem: Locator;

  // CTA Principal y Modal de Aprobación de Presupuesto
  readonly ctaPrincipalBtn: Locator;
  readonly modalAprobarPresupuesto: Locator;
  readonly canalWhatsAppBtn: Locator;
  readonly canalTelefonoBtn: Locator;
  readonly canalPresencialBtn: Locator;
  readonly confirmarAprobacionBtn: Locator;
  readonly cancelarAprobacionBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByTestId('input-buscar-orden').or(page.getByPlaceholder(/buscar/i)).or(page.locator('input[type="text"]'));
    this.nuevaOrdenButton = page.getByTestId('btn-nueva-orden').or(page.getByRole('button', { name: /nueva orden/i }));
    this.kanbanBoard = page.getByTestId('ordenes-kanban').or(page.locator('[data-testid="ordenes-kanban"]')).or(page.getByRole('table')).or(page.getByRole('heading', { name: /Expediente Operativo de Taller/i }));
    this.tablaOrdenes = page.getByTestId('tabla-ordenes').or(page.getByRole('table'));
    this.filasOrdenes = page.getByTestId('orden-fila').or(page.getByRole('row')).or(page.locator('tbody tr'));
    this.expedienteActivo = page.getByTestId('expediente-activo').or(page.locator('#expediente-activo'));
    this.tituloVehiculoExpediente = page.getByTestId('titulo-vehiculo-expediente').or(page.getByRole('heading', { level: 2 }));
    this.badgeEstadoExpediente = page.getByTestId('badge-estado-expediente').or(page.getByText(/ingresado|en presupuesto|en proceso|aprobado/i));
    this.totalPresupuestoHeader = page.getByTestId('total-presupuesto-header').or(page.locator('[data-testid="total-presupuesto-header"]'));

    // Pestañas semánticas
    this.tabResumen = page.getByRole('tab', { name: /resumen/i }).or(page.getByRole('button', { name: /resumen/i }));
    this.tabPresupuesto = page.getByRole('tab', { name: /repuestos y mano de obra|mano de obra y repuestos/i }).or(page.getByRole('button', { name: /repuestos y mano de obra|mano de obra y repuestos/i }));
    this.tabImagenes = page.getByRole('tab', { name: /imágenes|imagenes|multimedia/i }).or(page.getByRole('button', { name: /imágenes|imagenes|multimedia/i }));

    // Formulario de presupuesto sin clases CSS de presentación
    this.tipoItemRepuestoBtn = page.getByTestId('tipo-item-repuesto-btn');
    this.tipoItemManoDeObraBtn = page.getByTestId('tipo-item-mano-obra-btn');
    this.descripcionItemInput = page.getByTestId('item-descripcion-input').or(page.getByPlaceholder(/pastillas de freno|cambio de aceite/i));
    this.cantidadItemInput = page.getByTestId('item-cantidad-input').or(page.getByLabel(/^cantidad$/i));
    this.precioUnitarioItemInput = page.getByTestId('item-precio-unitario-input').or(page.getByLabel(/precio unitario/i));
    this.subtotalItemBadge = page.getByTestId('subtotal-badge');
    this.totalEstimadoBadge = page.getByTestId('total-amount');
    this.agregarItemBtn = page.getByTestId('agregar-item-btn').or(page.getByRole('button', { name: /agregar ítem|agregar item/i }));
    this.tablaItemsPresupuesto = page.getByTestId('items-presupuesto-tabla').or(page.getByRole('table'));
    this.alertaExitoItem = page.getByTestId('alerta-exito-item').or(page.getByRole('alert')).or(page.getByRole('status'));

    // Aprobación y Modales
    this.ctaPrincipalBtn = page.getByTestId('cta-aprobar-presupuesto-btn').or(page.getByRole('button', { name: /aprobar presupuesto/i }));
    this.modalAprobarPresupuesto = page.getByTestId('modal-aprobar-presupuesto').or(page.getByRole('dialog', { name: /aprobar presupuesto/i })).or(page.locator('[data-testid="modal-aprobar-presupuesto"]'));
    this.canalWhatsAppBtn = page.getByTestId('canal-whatsapp-btn').or(page.getByRole('button', { name: /whatsapp/i }));
    this.canalTelefonoBtn = page.getByTestId('canal-telefono-btn').or(page.getByRole('button', { name: /llamada telefónica|llamada telefonica/i }));
    this.canalPresencialBtn = page.getByTestId('canal-presencial-btn').or(page.getByRole('button', { name: /atención presencial|atencion presencial/i }));
    this.confirmarAprobacionBtn = page.getByTestId('confirmar-aprobacion-btn').or(page.getByRole('button', { name: /confirmar y pasar a en proceso/i }));
    this.cancelarAprobacionBtn = page.getByTestId('cancelar-aprobacion-btn').or(page.getByRole('button', { name: /cancelar/i }));
  }

  async navigate(): Promise<void> {
    await this.setMockSession({ email: 'admin@taller.com', role: 'admin', nombre: 'Admin Taller' });
    await this.goto('/admin/ordenes');
    await this.waitForLoaded();
  }

  async search(query: string): Promise<void> {
    if (await this.searchInput.first().isVisible()) {
      await this.searchInput.first().fill(query);
    }
  }

  async seleccionarOrden(index: number = 0): Promise<void> {
    const verOrdenBtn = this.page.getByRole('button', { name: /ver orden/i }).nth(index);
    try {
      await verOrdenBtn.waitFor({ state: 'visible', timeout: 6000 });
      await verOrdenBtn.click();
    } catch {
      const fila = this.page.locator('tbody tr').nth(index);
      await fila.click();
    }
  }

  async cambiarTabPresupuesto(): Promise<void> {
    await this.tabPresupuesto.click();
  }

  async cambiarTabResumen(): Promise<void> {
    await this.tabResumen.click();
  }

  async cambiarTabImagenes(): Promise<void> {
    await this.tabImagenes.click();
  }

  async seleccionarTipoItem(tipo: 'repuesto' | 'mano_de_obra'): Promise<void> {
    if (tipo === 'repuesto') {
      await this.tipoItemRepuestoBtn.click();
    } else {
      await this.tipoItemManoDeObraBtn.click();
    }
  }

  async agregarItemPresupuesto(
    tipo: 'repuesto' | 'mano_de_obra',
    descripcion: string,
    cantidad: number,
    precioUnitario: number
  ): Promise<void> {
    await this.seleccionarTipoItem(tipo);
    await this.descripcionItemInput.fill(descripcion);
    await this.cantidadItemInput.fill(cantidad.toString());
    await this.precioUnitarioItemInput.fill(precioUnitario.toString());
    await this.agregarItemBtn.click();
  }

  async obtenerSubtotalNuevoItem(): Promise<string> {
    return (await this.subtotalItemBadge.textContent())?.trim() || '';
  }

  async obtenerTotalPresupuesto(): Promise<string> {
    return (await this.totalEstimadoBadge.textContent())?.trim() || '';
  }

  async abrirModalAprobarPresupuesto(): Promise<void> {
    await this.ctaPrincipalBtn.click();
  }

  async seleccionarCanalAprobacion(canal: 'whatsapp' | 'telefono' | 'presencial'): Promise<void> {
    switch (canal) {
      case 'whatsapp':
        await this.canalWhatsAppBtn.click();
        break;
      case 'telefono':
        await this.canalTelefonoBtn.click();
        break;
      case 'presencial':
        await this.canalPresencialBtn.click();
        break;
    }
  }

  async confirmarAprobacionPresupuesto(): Promise<void> {
    await this.confirmarAprobacionBtn.click();
  }
}
