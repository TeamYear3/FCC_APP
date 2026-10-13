import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * DashboardPage - Page Object Model para el Panel Principal de Administración
 * Cátedra ISPC - Verificación y Validación de Programas (Sprint 4)
 *
 * Cumplimiento de Reglas de Oro POM:
 * - Regla 1: Un Page Object por pantalla/componente complejo.
 * - Regla 2: Localizadores privados/protegidos con selectores semánticos y resilientes.
 * - Regla 3: Métodos con intención de negocio.
 * - Regla 4: Navegaciones que devuelven el Page Object destino.
 * - Regla 5: Cero aserciones internas.
 */
export class DashboardPage extends BasePage {
  readonly navbar: Locator;
  readonly userBadge: Locator;
  readonly clientesLink: Locator;
  readonly vehiculosLink: Locator;
  readonly ordenesLink: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.navbar = page.locator('nav, [data-testid="navbar"]');
    this.userBadge = page.locator('[data-testid="user-badge"], .user-profile, .user-name').or(page.getByText(/admin|tecnico|recepcionista/i));
    this.clientesLink = page.getByRole('link', { name: /clientes/i }).or(page.locator('[data-testid="nav-clientes"]'));
    this.vehiculosLink = page.getByRole('link', { name: /vehículos|vehiculos/i }).or(page.locator('[data-testid="nav-vehiculos"]'));
    this.ordenesLink = page.getByRole('link', { name: /órdenes|ordenes/i }).or(page.locator('[data-testid="nav-ordenes"]'));
    this.logoutButton = page.getByRole('button', { name: /cerrar sesión|salir/i }).or(page.locator('[data-testid="btn-logout"]'));
  }

  /**
   * Navega directamente al Dashboard de administración.
   */
  async navigate(): Promise<void> {
    await this.goto('/admin/dashboard');
    await this.waitForLoaded();
  }

  /**
   * Cierra la sesión activa del usuario.
   */
  async cerrarSesion(): Promise<void> {
    if (await this.logoutButton.isVisible()) {
      await this.logoutButton.click();
    }
    await this.clearSession();
  }
}
