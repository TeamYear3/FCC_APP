import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { DashboardPage } from './dashboard.page';
import { PortalClientePage } from './portal-cliente.page';

/**
 * LoginPage - Page Object Model para la pantalla de Autenticación y Login
 * Cátedra ISPC - Verificación y Validación de Programas (Sprint 4 - AUT-E2E-01 / TK215)
 *
 * Cumplimiento de las 6 Reglas de Oro POM:
 * - Regla 1: Un Page Object exclusivo para la vista de login/autenticación.
 * - Regla 2: Localizadores únicos con jerarquía de selectores resilientes (getByTestId > getByRole > semántico).
 * - Regla 3: Métodos con intención de negocio (iniciarSesionComoAdmin, intentarLoginInvalido).
 * - Regla 4: Navegaciones que devuelven el Page Object destino (DashboardPage, PortalClientePage).
 * - Regla 5: Cero aserciones internas en el Page Object.
 * - Regla 6: Tests desacoplados de selectores y esperas ciegas.
 */
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly registerLink: Locator;
  readonly togglePasswordButton: Locator;
  readonly forgotPasswordButton: Locator;
  readonly googleLoginButton: Locator;
  readonly authCard: Locator;

  // Selectores para Formulario de Registro (TK228 - Módulo 1)
  readonly registerForm: Locator;
  readonly registerNombreInput: Locator;
  readonly registerApellidoInput: Locator;
  readonly registerEmailInput: Locator;
  readonly registerPasswordInput: Locator;
  readonly registerConfirmPasswordInput: Locator;
  readonly registerSubmitButton: Locator;
  readonly registerMismatchError: Locator;

  constructor(page: Page) {
    super(page);
    // Jerarquía de selectores resilientes (getByTestId con fallback semántico)
    this.emailInput = page.getByTestId('login-email-input').or(page.locator('#login-email, [data-testid="input-email"], input[type="email"]'));
    this.passwordInput = page.getByTestId('login-password-input').or(page.locator('#login-password, [data-testid="input-password"], input[formcontrolname="password"], input[name="password"], input[type="password"]'));
    this.submitButton = page.getByTestId('login-submit-button').or(page.locator('button[type="submit"], [data-testid="btn-login-submit"]'));
    this.errorMessage = page.getByTestId('login-error-message').or(page.locator('[role="alert"], .alert-danger, .error-message, .text-red-500'));
    this.successMessage = page.getByTestId('auth-success-message').or(page.locator('.alert-success, .text-emerald-400'));
    this.registerLink = page.getByTestId('register-link').or(page.getByRole('button', { name: /regístrate|registrate|crear cuenta/i }));
    this.togglePasswordButton = page.locator('button[aria-label*="contraseña"]').or(page.getByRole('button', { name: /mostrar|ocultar/i }));
    this.forgotPasswordButton = page.getByRole('button', { name: /¿Olvidaste tu contraseña\?/i }).or(page.getByText(/olvidaste tu contraseña/i));
    this.googleLoginButton = page.locator('app-google-login-button button, [data-testid="btn-google-login"]');
    this.authCard = page.locator('.rounded-card, [data-testid="auth-card"], form');

    // Inicialización de selectores de Registro
    this.registerForm = page.getByTestId('register-form').or(page.locator('form[data-testid="register-form"]'));
    this.registerNombreInput = page.getByTestId('register-nombre-input').or(page.locator('input[formcontrolname="nombre"]'));
    this.registerApellidoInput = page.getByTestId('register-apellido-input').or(page.locator('input[formcontrolname="apellido"]'));
    this.registerEmailInput = page.getByTestId('register-email-input').or(page.locator('form[data-testid="register-form"] input[type="email"]'));
    this.registerPasswordInput = page.getByTestId('register-password-input').or(page.locator('input[formcontrolname="password"]'));
    this.registerConfirmPasswordInput = page.getByTestId('register-confirm-password-input').or(page.locator('input[formcontrolname="confirmPassword"]'));
    this.registerSubmitButton = page.getByTestId('register-submit-button').or(page.locator('button[data-testid="register-submit-button"]'));
    this.registerMismatchError = page.getByTestId('register-mismatch-error');
  }

  /**
   * Navega a la vista de autenticación.
   */
  async navigate(): Promise<void> {
    await this.goto('/autenticacion');
    await this.waitForLoaded();
  }

  /**
   * Cambia el modo a 'registro' mediante el enlace interactivo.
   */
  async irARegistro(): Promise<void> {
    await this.registerLink.click();
    await this.registerSubmitButton.waitFor({ state: 'attached' });
  }

  /**
   * Completa los campos del formulario de registro.
   */
  async completarFormularioRegistro(datos: {
    nombre?: string;
    apellido?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }): Promise<void> {
    if (datos.nombre !== undefined) {
      await this.registerNombreInput.fill(datos.nombre);
    }
    if (datos.apellido !== undefined) {
      await this.registerApellidoInput.fill(datos.apellido);
    }
    if (datos.email !== undefined) {
      await this.registerEmailInput.fill(datos.email);
    }
    if (datos.password !== undefined) {
      await this.registerPasswordInput.fill(datos.password);
    }
    if (datos.confirmPassword !== undefined) {
      await this.registerConfirmPasswordInput.fill(datos.confirmPassword);
    }
  }

  /**
   * Ejecuta el submit del formulario de registro.
   */
  async clickRegistroSubmit(): Promise<void> {
    await this.registerSubmitButton.click();
  }

  /**
   * Flujo de negocio: Completa y envía el formulario de registro.
   */
  async registrarCliente(datos: {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    confirmPassword?: string;
  }): Promise<void> {
    await this.completarFormularioRegistro({
      ...datos,
      confirmPassword: datos.confirmPassword ?? datos.password,
    });
    await this.clickRegistroSubmit();
  }

  /**
   * Completa el campo de correo electrónico en login.
   */
  async enterEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /**
   * Completa el campo de contraseña en login.
   */
  async enterPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /**
   * Ejecuta el submit del formulario de login.
   */
  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Flujo de negocio: Inicia sesión con credenciales de Administrador y navega al Dashboard.
   * Regla 4 POM: Retorna el Page Object de destino (DashboardPage).
   */
  async iniciarSesionComoAdmin(email: string = 'admin@taller.com', pass: string = 'admin1234'): Promise<DashboardPage> {
    await this.enterEmail(email);
    await this.enterPassword(pass);
    await this.clickSubmit();
    const dashboard = new DashboardPage(this.page);
    await dashboard.waitForLoaded();
    return dashboard;
  }

  /**
   * Flujo de negocio: Inicia sesión con credenciales de Cliente y navega al Portal de Cliente.
   * Regla 4 POM: Retorna el Page Object de destino (PortalClientePage).
   */
  async iniciarSesionComoCliente(email: string = 'cliente@ejemplo.com', pass: string = 'cliente1234'): Promise<PortalClientePage> {
    await this.enterEmail(email);
    await this.enterPassword(pass);
    await this.clickSubmit();
    const portal = new PortalClientePage(this.page);
    await portal.waitForLoaded();
    return portal;
  }

  /**
   * Flujo de negocio: Intento de autenticación inválido.
   * Permanece en la vista actual para permitir aserciones sobre mensajes de error y validaciones reactivas.
   */
  async intentarLoginInvalido(email: string, pass: string): Promise<void> {
    if (email) {
      await this.enterEmail(email);
    } else {
      await this.emailInput.clear();
    }
    if (pass) {
      await this.enterPassword(pass);
    } else {
      await this.passwordInput.clear();
    }
    await this.clickSubmit();
  }

  /**
   * Obtiene los tokens almacenados en localStorage (fcc_auth_token y fcc_refresh_token).
   */
  async obtenerTokensAlmacenados(): Promise<{ access: string | null; refresh: string | null }> {
    return this.page.evaluate(() => ({
      access: localStorage.getItem('fcc_auth_token'),
      refresh: localStorage.getItem('fcc_refresh_token'),
    }));
  }

  /**
   * Método de compatibilidad para suites previas.
   */
  async login(email: string, pass: string): Promise<void> {
    await this.enterEmail(email);
    await this.enterPassword(pass);
    await this.clickSubmit();
  }
}
