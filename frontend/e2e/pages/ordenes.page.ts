import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * OrdenesPage - Page Object Model para el Módulo de Órdenes de Trabajo (OT)
 * No contiene aserciones.
 */
export class OrdenesPage extends BasePage {
  readonly searchInput: Locator;
  readonly nuevaOrdenButton: Locator;
  readonly kanbanBoard: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.locator('input[type="text"], [data-testid="input-buscar-orden"]');
    this.nuevaOrdenButton = page.locator('button:has-text("Nueva Orden"), [data-testid="btn-nueva-orden"]');
    this.kanbanBoard = page.locator('[data-testid="ordenes-kanban"], .grid, .kanban-board');
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
}
