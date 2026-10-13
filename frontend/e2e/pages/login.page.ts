import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * LoginPage - Page Object Model para la pantalla de Autenticación y Login
 * No contiene aserciones. Métodos orientados a interacción y localización de elementos.
 */
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly togglePasswordButton: Locator;
  readonly forgotPasswordButton: Locator;
  readonly googleLoginButton: Locator;
  readonly authCard: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[type="email"], [data-testid="input-email"]');
    this.passwordInput = page.locator('input[type="password"], input[name="password"], [data-testid="input-password"]');
    this.submitButton = page.locator('button[type="submit"], [data-testid="btn-login-submit"]');
    this.togglePasswordButton = page.locator('button[aria-label*="contraseña"]');
    this.forgotPasswordButton = page.getByRole('button', { name: /¿Olvidaste tu contraseña\?/i });
    this.googleLoginButton = page.locator('app-google-login-button button, [data-testid="btn-google-login"]');
    this.authCard = page.locator('.rounded-card, [data-testid="auth-card"]');
  }

  async navigate(): Promise<void> {
    await this.goto('/autenticacion');
    await this.waitForLoaded();
  }

  async enterEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async enterPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  async login(email: string, pass: string): Promise<void> {
    await this.enterEmail(email);
    await this.enterPassword(pass);
    await this.clickSubmit();
  }
}
