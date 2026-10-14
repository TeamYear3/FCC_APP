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
    this.searchInput = page.locator('input[type="text"], [data-testid="input-buscar-orden"]');
    this.nuevaOrdenButton = page.locator('button:has-text("Nueva Orden"), [data-testid="btn-nueva-orden"]');
    this.kanbanBoard = page.locator('[data-testid="ordenes-kanban"], .grid, .kanban-board');
    this.tablaOrdenes = page.locator('table');
    this.filasOrdenes = page.locator('tbody tr');
    this.expedienteActivo = page.locator('#expediente-activo');
    this.tituloVehiculoExpediente = page.locator('h2.typography-h2-section');
    this.badgeEstadoExpediente = page.locator('span.rounded-badge, span[class*="rounded-full"]:has-text("Ingresado"), span[class*="rounded-full"]:has-text("En Presupuesto"), span[class*="rounded-full"]:has-text("En Proceso"), span[class*="rounded-full"]:has-text("Aprobado")');
    this.totalPresupuestoHeader = page.locator('p.typography-h2-section.text-color-primary-accent');

    // Pestañas
    this.tabResumen = page.locator('button:has-text("Resumen")');
    this.tabPresupuesto = page.locator('button:has-text("Carga de Mano de Obra y Repuestos")');
    this.tabImagenes = page.locator('button:has-text("Imágenes")');

    // Formulario de presupuesto
    this.tipoItemRepuestoBtn = page.locator('.type-btn:has-text("Repuesto")');
    this.tipoItemManoDeObraBtn = page.locator('.type-btn:has-text("Mano de Obra")');
    this.descripcionItemInput = page.locator('input[placeholder*="Pastillas de freno"], input[placeholder*="Cambio de aceite"]');
    this.cantidadItemInput = page.locator('.form-group:has-text("Cantidad") input');
    this.precioUnitarioItemInput = page.locator('.form-group:has-text("Precio Unitario") input');
    this.subtotalItemBadge = page.locator('.subtotal-badge');
    this.totalEstimadoBadge = page.locator('.total-amount');
    this.agregarItemBtn = page.locator('button:has-text("Agregar Ítem")');
    this.tablaItemsPresupuesto = page.locator('.items-list-container');
    this.alertaExitoItem = page.locator('.alert-success');

    // Aprobación
    this.ctaPrincipalBtn = page.locator('button:has-text("Aprobar Presupuesto y Convertir en OT")');
    this.modalAprobarPresupuesto = page.locator('.fixed.inset-0:has(h3:has-text("Aprobar Presupuesto"))');
    this.canalWhatsAppBtn = page.locator('button:has-text("WhatsApp")');
    this.canalTelefonoBtn = page.locator('button:has-text("Llamada Telefónica")');
    this.canalPresencialBtn = page.locator('button:has-text("Atención Presencial")');
    this.confirmarAprobacionBtn = page.locator('button:has-text("Confirmar y Pasar a EN PROCESO")');
    this.cancelarAprobacionBtn = page.locator('button:has-text("Cancelar")');
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
    const fila = this.filasOrdenes.nth(index);
    if (await fila.isVisible()) {
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
