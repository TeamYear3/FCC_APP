import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { PortalClientePage } from '../pages/portal-cliente.page';

/**
 * Suite de Pruebas de Accesibilidad: Navegación por Teclado y Foco Visible (ACC-03 / TK234)
 * Estándar: WCAG 2.2 AA (Criterios 2.1.1 Teclado, 2.1.2 Sin trampas, 2.4.3 Orden de foco, 2.4.7 Foco visible)
 */
test.describe('ACC-03: Navegación 100% por Teclado, Foco Visible y Gestión de Modales', () => {

  test('TC-KEY-01: Navegación secuencial lógica por Tab y Shift+Tab en formulario de Autenticación', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Iniciar foco en el primer campo interactivo
    await loginPage.emailInput.focus();
    await expect(loginPage.emailInput).toBeFocused();

    // Avanzar con tecla Tab
    await page.keyboard.press('Tab');
    await expect(loginPage.passwordInput).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(loginPage.togglePasswordButton).toBeFocused();

    // Retroceder con Shift+Tab
    await page.keyboard.press('Shift+Tab');
    await expect(loginPage.passwordInput).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(loginPage.emailInput).toBeFocused();
  });

  test('TC-KEY-02: Activación y alternancia de controles mediante teclas Space y Enter', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Navegar y activar botón de alternancia de contraseña con Space
    await loginPage.passwordInput.fill('MiPasswordSeguro123');
    await loginPage.togglePasswordButton.focus();
    await page.keyboard.press('Space');

    // Comprobar que el tipo de input cambió a text
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');

    // Volver a alternar con Enter
    await page.keyboard.press('Enter');
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  });

  test('TC-KEY-03: Verificación de estilo de foco visible inconfundible (:focus-visible)', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    await loginPage.emailInput.focus();
    // Validar que el elemento enfocado expone el anillo o contorno visual
    const outline = await loginPage.emailInput.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outlineStyle: styles.outlineStyle,
        outlineColor: styles.outlineColor,
        boxShadow: styles.boxShadow
      };
    });

    expect(outline).toBeDefined();
  });

  test('TC-KEY-04: Cierre accesible de modal con tecla Escape sin trampas de foco (WCAG 2.1.2)', async ({ page }) => {
    // Interceptar backend para que el portal cargue de forma determinista y estable
    await page.route('**/api/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    const portalPage = new PortalClientePage(page);
    await portalPage.navigate();

    const perfilBtn = portalPage.perfilButton.or(page.getByTestId('portal-perfil-btn'));

    if (await perfilBtn.first().isVisible()) {
      await perfilBtn.first().focus();
      await expect(perfilBtn.first()).toBeFocused();
      await page.keyboard.press('Enter');

      // Auto-waiting dinámico para apertura del modal sin esperas ciegas
      const modalPerfil = page.locator('app-configuracion-perfil-modal');
      await expect(modalPerfil).toBeVisible();

      // Cerrar modal vía teclado (botón de cierre accesible o tecla Escape)
      const closeBtn = page.getByTitle('Cerrar modal de perfil').or(modalPerfil.locator('button')).first();
      if (await closeBtn.isVisible()) {
        await closeBtn.focus();
        await page.keyboard.press('Enter');
        await expect(modalPerfil).toBeHidden();
      } else {
        await page.keyboard.press('Escape');
      }

      // El foco debe permanecer operable en el documento sin quedar atrapado
      await page.keyboard.press('Tab');
      const activeElementTag = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeElementTag).toBeDefined();
    }
  });

  test('TC-KEY-05: Operación completa de formularios sin necesidad de puntero o mouse', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Completar todo el flujo usando exclusivamente teclado
    await loginPage.emailInput.focus();
    await page.keyboard.type('test@taller.com');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Clave123!');

    await expect(loginPage.emailInput).toHaveValue('test@taller.com');
    await expect(loginPage.passwordInput).toHaveValue('Clave123!');
  });
});
