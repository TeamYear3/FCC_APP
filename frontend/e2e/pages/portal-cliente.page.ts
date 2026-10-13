import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * PortalClientePage - Page Object Model para el Portal del Cliente
 * Representa la pantalla de seguimiento de vehículos, turnos y presupuestos.
 */
export class PortalClientePage extends BasePage {
  readonly pageHeader: Locator;
  readonly searchInput: Locator;
  readonly perfilButton: Locator;
  readonly orderCard: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeader = page.locator('header');
    this.searchInput = page.locator('input[placeholder*="patente"], [data-testid="input-buscar-patente"]');
    this.perfilButton = page.getByRole('button', { name: /Mi Perfil/i });
    this.orderCard = page.locator('[data-testid="orden-card"], .rounded-2xl');
  }

  async navigate(): Promise<void> {
    await this.setMockSession({ email: 'cliente@ejemplo.com', role: 'cliente', nombre: 'Juan Pérez' });
    await this.goto('/portal-cliente');
    await this.waitForLoaded();
  }

  async searchPatente(patente: string): Promise<void> {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(patente);
    }
  }

  async openPerfil(): Promise<void> {
    await this.perfilButton.click();
  }
}
