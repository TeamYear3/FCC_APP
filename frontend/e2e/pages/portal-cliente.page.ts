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
    this.pageHeader = page.locator('header');
    this.searchInput = page.locator('input[placeholder*="patente"], [data-testid="input-buscar-patente"]');
    this.perfilButton = page.getByRole('button', { name: /Mi Perfil/i });
    this.logoutButton = page.getByRole('button', { name: /Cerrar Sesión/i });
    this.orderCards = page.locator('[data-testid="orden-card"], .rounded-2xl.border, .border-\\[\\#2A2A2A\\]');
    this.badgesEstado = page.locator('span[class*="rounded"]:has-text("Ingresado"), span[class*="rounded"]:has-text("En Presupuesto"), span[class*="rounded"]:has-text("Aprobado"), span[class*="rounded"]:has-text("En Proceso"), span[class*="rounded"]:has-text("Finalizado")');
    this.tabOrdenesBtn = page.locator('button:has-text("Órdenes de Trabajo")');
    this.tabVehiculosBtn = page.locator('button:has-text("Mis Vehículos")');

    // Modal de Historial
    this.modalHistorial = page.locator('.fixed.inset-0:has(h3:has-text("Historial de Estados"))');
    this.botonesVerHistorial = page.locator('button:has-text("Ver Historial de Estados")');
    this.cerrarModalHistorialBtn = this.modalHistorial.locator('button:has-text("Cerrar")');
    this.timelineItems = page.locator('.space-y-4 .flex.gap-4, .timeline-item');
    this.badgeEstadoModal = page.locator('.modal span[class*="rounded-full"]');
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
    const btnCerrar = this.modalHistorial.locator('button:has-text("Cerrar")').first();
    if (await btnCerrar.isVisible()) {
      await btnCerrar.click({ force: true });
      return;
    }
    const botonCruz = this.modalHistorial.locator('button').filter({ has: this.page.locator('path[d*="M6 18L18 6"]') }).first();
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
