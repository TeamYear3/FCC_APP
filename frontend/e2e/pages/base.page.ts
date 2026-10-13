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
    await this.page.addInitScript((userData) => {
      const encodeBase64Url = (value: string) => btoa(value).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const token = [encodeBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' })), encodeBase64Url(JSON.stringify({ rol: userData.role })), 'e2U'].join('.');
      localStorage.setItem('fcc_auth_token', token);
      localStorage.setItem('fcc_refresh_token', 'mock_e2e_refresh_token_sample');
      localStorage.setItem('currentUser', JSON.stringify(userData));
      localStorage.setItem('userRole', userData.role);
    }, user);
  }

  async clearSession(): Promise<void> {
    await this.page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }
}
