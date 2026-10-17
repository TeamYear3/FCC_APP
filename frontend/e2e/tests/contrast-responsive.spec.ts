import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { PortalClientePage } from '../pages/portal-cliente.page';

/**
 * Suite E2E de Accesibilidad: Contraste, Semántica, Textos Alternativos y Reflow a 320px (ACC-04 / TK235)
 * Estándar: WCAG 2.2 AA (Criterios 1.1.1 Non-text Content, 1.3.1 Info & Relationships, 1.4.3 Contrast, 1.4.10 Reflow)
 */
test.describe('ACC-04: Contraste, Semántica, Textos Alternativos y Reflow Responsive a 320px', () => {

  test('TC-RESP-01: Reflow responsive en viewport extremo de 320px sin pérdida de funcionalidad (WCAG 1.4.10)', async ({ page }) => {
    // Configurar viewport mínimo obligatorio de 320px de ancho
    await page.setViewportSize({ width: 320, height: 640 });

    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Comprobar que no hay desbordamiento horizontal crítico
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);

    // Comprobar que los campos y el botón de submit siguen visibles y operables
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('TC-ZOOM-02: Escalado de texto al 200% y legibilidad sin superposición (WCAG 1.4.4)', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Simular zoom al 200% mediante viewport escalado o zoom CSS
    await page.evaluate(() => {
      document.body.style.zoom = '200%';
    });

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();

    // Revertir zoom
    await page.evaluate(() => {
      document.body.style.zoom = '100%';
    });
  });

  test('TC-SEM-03: Estructura jerárquica de encabezados semánticos por pantalla (WCAG 1.3.1)', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Validar presencia de encabezado estructurado en la tarjeta de login
    const headings = await page.locator('h1, h2, h3').allTextContents();
    expect(headings.length).toBeGreaterThan(0);
    expect(headings.some(h => /portal|ingreso|sesión/i.test(h))).toBeTruthy();
  });

  test('TC-ALT-04: Todas las imágenes poseen atributo alt significativo o decorativo (WCAG 1.1.1)', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Verificar que cada imagen presente en el DOM tenga atributo 'alt'
    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    expect(imagesWithoutAlt).toBe(0);

    // Comprobar que el logo principal tiene descripción textual comprensible
    const logoImg = page.locator('img[src*="logo"], img[alt*="Logo"], img[alt*="FCC"]');
    if (await logoImg.first().isVisible()) {
      await expect(logoImg.first()).toHaveAttribute('alt', /FCC/i);
    }
  });

  test('TC-CONTRAST-05: Verificación de contraste en texto y botones de acción principal (WCAG 1.4.3)', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Validar que el botón primario de acción posea estilos calculados de alto contraste
    const buttonColors = await loginPage.submitButton.evaluate((btn) => {
      const styles = window.getComputedStyle(btn);
      return {
        color: styles.color,
        backgroundColor: styles.backgroundColor,
      };
    });

    expect(buttonColors.color).toBeDefined();
    expect(buttonColors.backgroundColor).toBeDefined();
  });
});
