import { Page, Locator } from '@playwright/test';

/**
 * BasePage - Implementación base del patrón Page Object Model (POM)
 * Los Page Objects NO contienen aserciones (reservadas exclusivamente para los specs de test).
 */
export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  async waitForLoaded(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  async setMockSession(user: { email: string; role: string; nombre?: string }): Promise<void> {
    const headerStr = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payloadStr = Buffer.from(JSON.stringify({
      rol: user.role,
      role: user.role,
      user_role: user.role,
      email: user.email,
      nombre: user.nombre || 'Usuario',
      exp: Math.floor(Date.now() / 1000) + 360000
    })).toString('base64url');
    const mockJwt = `${headerStr}.${payloadStr}.mockSignature`;

    await this.page.addInitScript(({ token, userData }) => {
      localStorage.setItem('fcc_auth_token', token);
      localStorage.setItem('access_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('refresh_token', 'mock_refresh_token');
      localStorage.setItem('currentUser', JSON.stringify(userData));
      localStorage.setItem('userRole', userData.role);
    }, { token: mockJwt, userData: user });
  }

  async clearSession(): Promise<void> {
    await this.page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }
}
