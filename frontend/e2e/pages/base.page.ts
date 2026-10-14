import { Page, Locator } from '@playwright/test';

/**
 * BasePage - Clase base abstracta del patrón Page Object Model (POM)
 * Cátedra ISPC - Verificación y Validación de Programas (Sprint 4)
 *
 * Cumplimiento de Reglas de Oro POM:
 * - Regla 5: Los Page Objects NO contienen aserciones (reservadas para *.spec.ts).
 * - Regla 6: Cero esperas ciegas (sleep/waitForTimeout); se utiliza auto-waiting y eventos de red.
 */
export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navega a la ruta relativa indicada.
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Espera a que el DOM esté completamente cargado.
   */
  async waitForLoaded(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Espera a que la red no registre peticiones pendientes (útil tras submits asíncronos).
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Espera reactiva hasta que la URL coincida con el patrón esperado.
   */
  async waitForURL(pattern: string | RegExp): Promise<void> {
    await this.page.waitForURL(pattern);
  }

  /**
   * Retorna el título del documento actual.
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Obtiene la URL actual del navegador.
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Configura una sesión JWT simulada en el almacenamiento local antes de cargar la página.
   * Genera un token JWT sintético válido con payload decodificable por Angular AuthService (fcc_auth_token).
   */
  async setMockSession(user: { email: string; role: 'admin' | 'tecnico' | 'cliente' | string; nombre?: string }): Promise<void> {
    await this.page.addInitScript((userData) => {
      const b64 = (str: string) => btoa(unescape(encodeURIComponent(str))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = b64(JSON.stringify({
        email: userData.email,
        rol: userData.role,
        role: userData.role,
        user_role: userData.role,
        nombre: userData.nombre || 'Usuario E2E',
        exp: Math.floor(Date.now() / 1000) + 86400 * 30,
      }));
      const mockJwt = `${header}.${payload}.mock_signature_ispc_e2e`;

      localStorage.setItem('fcc_auth_token', mockJwt);
      localStorage.setItem('access_token', mockJwt);
      localStorage.setItem('refresh_token', mockJwt);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      localStorage.setItem('userRole', userData.role);
    }, user);
  }

  /**
   * Limpia las credenciales y tokens del almacenamiento del navegador.
   */
  async clearSession(): Promise<void> {
    await this.page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }
}
