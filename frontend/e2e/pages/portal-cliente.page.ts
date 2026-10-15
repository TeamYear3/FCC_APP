import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * PortalClientePage - Page Object Model para el Portal del Cliente
 * Cátedra: Verificación y Validación de Programas - ISPC (Sprint 4 - TK230 #291)
 *
 * Representa la pantalla de seguimiento de vehículos, turnos y presupuestos
 * por parte de los clientes del taller mecánico.
 *
 * Cumplimiento de Reglas de Oro POM:
 * - Regla 5: NO contiene aserciones (reservadas para *.spec.ts).
 * - Regla 6: Cero esperas ciegas; usa auto-waiting y eventos de red.
 */
export class PortalClientePage extends BasePage {
  readonly pageHeader: Locator;
  readonly searchInput: Locator;
  readonly perfilButton: Locator;
  readonly logoutButton: Locator;
  readonly orderCards: Locator;
  readonly badgesEstado: Locator;
  readonly tabOrdenesBtn: Locator;
  readonly tabVehiculosBtn: Locator;

  // Modal de Historial y Trazabilidad de la OT
  readonly modalHistorial: Locator;
  readonly botonesVerHistorial: Locator;
  readonly cerrarModalHistorialBtn: Locator;
  readonly timelineItems: Locator;
  readonly badgeEstadoModal: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeader = page.getByRole('banner').or(page.locator('header'));
    this.searchInput = page.getByTestId('input-buscar-patente').or(page.getByPlaceholder(/patente/i));
    this.perfilButton = page.getByRole('button', { name: /Mi Perfil/i });
    this.logoutButton = page.getByRole('button', { name: /Cerrar Sesión/i });
    this.orderCards = page.getByTestId('orden-card').or(page.getByRole('article')).or(page.locator('[data-testid="orden-card"]'));
    this.badgesEstado = page.getByTestId('badge-estado-orden').or(page.getByText(/ingresado|en presupuesto|aprobado|en proceso|finalizado/i));
    this.tabOrdenesBtn = page.getByRole('button', { name: /órdenes de trabajo|ordenes de trabajo/i });
    this.tabVehiculosBtn = page.getByRole('button', { name: /mis vehículos|mis vehiculos/i });

    // Modal de Historial y trazabilidad
    this.modalHistorial = page.getByTestId('modal-historial').or(page.getByRole('dialog', { name: /historial de estados/i })).or(page.locator('[data-testid="modal-historial"]'));
    this.botonesVerHistorial = page.getByRole('button', { name: /ver historial de estados/i });
    this.cerrarModalHistorialBtn = this.modalHistorial.getByRole('button', { name: /cerrar|close/i });
    this.timelineItems = page.getByTestId('timeline-item').or(page.getByRole('listitem'));
    this.badgeEstadoModal = page.getByTestId('badge-estado-modal').or(this.modalHistorial.locator('span'));
  }

  async navigate(usuario: { email?: string; role?: string; nombre?: string } = {}): Promise<void> {
    await this.setMockSession({
      email: usuario.email || 'cliente@ejemplo.com',
      role: usuario.role || 'cliente',
      nombre: usuario.nombre || 'Juan Pérez'
    });
    await this.goto('/portal-cliente');
    await this.waitForLoaded();
  }

  async searchPatente(patente: string): Promise<void> {
    if (await this.searchInput.first().isVisible()) {
      await this.searchInput.first().fill(patente);
    }
  }

  async cambiarTabOrdenes(): Promise<void> {
    await this.tabOrdenesBtn.click();
  }

  async cambiarTabVehiculos(): Promise<void> {
    await this.tabVehiculosBtn.click();
  }

  async abrirHistorialOrden(index: number = 0): Promise<void> {
    const btn = this.botonesVerHistorial.nth(index);
    if (await btn.isVisible()) {
      await btn.click();
    } else {
      // Clic alternativo sobre la tarjeta de la orden
      const card = this.orderCards.nth(index);
      if (await card.isVisible()) {
        await card.click();
      }
    }
  }

  async cerrarHistorial(): Promise<void> {
    const btnCerrar = this.modalHistorial.getByRole('button', { name: /cerrar|close/i }).first();
    if (await btnCerrar.isVisible()) {
      await btnCerrar.click({ force: true });
      return;
    }
    const botonCruz = this.modalHistorial.getByRole('button', { name: /cerrar/i }).or(this.modalHistorial.locator('button[aria-label*="cerrar"]')).first();
    if (await botonCruz.isVisible()) {
      await botonCruz.click({ force: true });
    }
  }

  async openPerfil(): Promise<void> {
    await this.perfilButton.click();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }

  async obtenerTextoBadgeEstado(index: number = 0): Promise<string> {
    const badge = this.badgesEstado.nth(index);
    return (await badge.textContent())?.trim() || '';
  }
}
