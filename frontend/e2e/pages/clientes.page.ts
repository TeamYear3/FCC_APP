import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * ClientesPage - Page Object Model para el Módulo Administrativo de Clientes
 * No contiene aserciones.
 */
export class ClientesPage extends BasePage {
  readonly searchInput: Locator;
  readonly nuevoClienteButton: Locator;
  readonly clientesTable: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.locator('input[type="text"], [data-testid="input-buscar-cliente"]');
    this.nuevoClienteButton = page.locator('button:has-text("Nuevo Cliente"), [data-testid="btn-nuevo-cliente"]');
    this.clientesTable = page.locator('table, [data-testid="tabla-clientes"]');
  }

  async navigate(): Promise<void> {
    await this.setMockSession({ email: 'admin@taller.com', role: 'admin', nombre: 'Admin Taller' });
    await this.goto('/admin/clientes');
    await this.waitForLoaded();
  }

  async search(query: string): Promise<void> {
    if (await this.searchInput.first().isVisible()) {
      await this.searchInput.first().fill(query);
    }
  }
}
