import { test, expect } from '../fixtures/test.fixture';

/**
 * Helper para generar un JWT sintético válido con payload decodificable por AuthService
 */
function crearJwtMock(rol: 'admin' | 'tecnico' | 'cliente', email: string, nombre: string = 'Usuario Test'): string {
  const b64Url = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const header = b64Url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64Url({
    email,
    rol,
    role: rol,
    user_role: rol,
    nombre,
    exp: Math.floor(Date.now() / 1000) + 86400 * 30,
  });
  return `${header}.${payload}.mock_signature_ispc_e2e`;
}

/**
 * AUT-E2E-03: Flujo Crítico 1 - Autenticación y Registro (Sprint 4 - TK228 #289)
 * Cátedra: Verificación y Validación de Programas - ISPC
 *
 * Módulos Evaluados:
 * - Módulo 1: Ingreso y Registro (HU-001: TEST-REG-001, TEST-REG-002, TEST-REG-004)
 * - Módulo 2: Login y Autenticación (HU-002: TEST-LOG-001, TEST-LOG-003, TEST-LOG-004)
 *
 * Cumplimiento de Reglas de Oro POM:
 * - Regla 1: Encapsulado en LoginPage.
 * - Regla 2: Localizadores únicos y resilientes con getByTestId y semánticos.
 * - Regla 3: Métodos con intención de negocio.
 * - Regla 4: Navegaciones que retornan el Page Object correspondiente.
 * - Regla 5: Las aserciones residen exclusivamente en este archivo spec.
 * - Regla 6: Cero esperas ciegas; sincronización reactiva por eventos y auto-waiting.
 */
test.describe('AUT-E2E-03: Flujo Crítico 1 - Autenticación Completa y Gestión de Acceso', () => {

  test.beforeEach(async ({ page }) => {
    // Intercepción base de API para aislar la suite de forma hermética y determinista
    await page.route('**/api/auth/google/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) });
    });
  });

  test.describe('Módulo 1: Ingreso y Registro (HU-001)', () => {

    test('TEST-REG-001: Registro exitoso de nuevo cliente con redirección a login', async ({ page, loginPage }) => {
      /**
       * HU: HU-001 - Registro de Cliente
       * TC: TEST-REG-001 - Registro exitoso con credenciales válidas
       * Capa: UI / E2E con intercepción de API REST
       */
      await page.route('**/api/auth/registro/', async (route) => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'cli-new-001',
            email: 'carlos.gomez@taller.com',
            nombre: 'Carlos',
            apellido: 'Gómez',
            rol: 'cliente',
            detail: 'Cliente registrado exitosamente.'
          })
        });
      });

      // 1. Navegar a autenticación y cambiar a formulario de registro
      await loginPage.navigate();
      await loginPage.irARegistro();
      await expect(loginPage.registerForm).toBeVisible();

      // 2. Completar formulario con datos válidos y enviar
      await loginPage.registrarCliente({
        nombre: 'Carlos',
        apellido: 'Gómez',
        email: 'carlos.gomez@taller.com',
        password: 'Password1234!',
        confirmPassword: 'Password1234!'
      });

      // 3. Verificar feedback visual de éxito y retorno a modo login
      await expect(loginPage.successMessage).toBeVisible();
      await expect(loginPage.successMessage).toContainText(/Registro exitoso/i);
      await expect(loginPage.submitButton).toBeVisible();
    });

    test('TEST-REG-002: Validación reactiva de contraseñas desiguales (mismatch)', async ({ loginPage }) => {
      /**
       * HU: HU-001 - Registro de Cliente
       * TC: TEST-REG-002 - Validación de contraseñas desiguales
       * Capa: UI / E2E reactiva en cliente Angular
       */
      // 1. Navegar y acceder a registro
      await loginPage.navigate();
      await loginPage.irARegistro();

      // 2. Completar campos con contraseñas que no coinciden
      await loginPage.completarFormularioRegistro({
        nombre: 'Ana',
        apellido: 'Martínez',
        email: 'ana.martinez@ejemplo.com',
        password: 'PasswordSeguro1',
        confirmPassword: 'PasswordDistinto2'
      });

      // 3. Forzar evento blur en confirmPassword para disparar validación touched
      await loginPage.registerConfirmPasswordInput.blur();

      // 4. Verificar mensaje de error visual y deshabilitación del botón submit
      await expect(loginPage.registerMismatchError).toBeVisible();
      await expect(loginPage.registerMismatchError).toContainText(/Las contraseñas no coinciden/i);
      await expect(loginPage.registerSubmitButton).toBeDisabled();
    });

    test('TEST-REG-004: Validación de formato de correo ante evento blur', async ({ loginPage }) => {
      /**
       * HU: HU-001 - Registro de Cliente
       * TC: TEST-REG-004 - Formato de email inválido
       * Capa: UI / E2E validación de controles reactivos
       */
      // 1. Navegar y acceder a registro
      await loginPage.navigate();
      await loginPage.irARegistro();

      // 2. Ingresar email con formato no válido y provocar blur
      await loginPage.registerEmailInput.fill('correo-sin-arroba-ni-dominio');
      await loginPage.registerEmailInput.blur();

      // 3. Verificar que el botón de registro permanezca deshabilitado por invalid control
      await expect(loginPage.registerSubmitButton).toBeDisabled();
    });

  });

  test.describe('Módulo 2: Login y Autenticación (HU-002)', () => {

    test('TEST-LOG-001: Login exitoso como Administrador, verificación de tokens y redirección a dashboard', async ({ page, loginPage, dashboardPage }) => {
      /**
       * HU: HU-002 - Inicio de Sesión
       * TC: TEST-LOG-001 - Login local exitoso con rol Administrador
       * Capa: UI / E2E con almacenamiento y redirección
       */
      const tokenAdmin = crearJwtMock('admin', 'admin@taller.com', 'Administrador General');
      const tokenRefresh = 'mock_refresh_token_admin_ispc';

      await page.route('**/api/auth/login/', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access: tokenAdmin,
            refresh: tokenRefresh,
          })
        });
      });

      // 1. Navegar a autenticación
      await loginPage.navigate();

      // 2. Iniciar sesión como administrador (Regla 4 POM: retorna DashboardPage)
      await loginPage.iniciarSesionComoAdmin('admin@taller.com', 'admin1234');

      // 3. Verificar redirección exitosa a /admin/dashboard
      await expect(page).toHaveURL(/.*admin\/dashboard/);

      // 4. Validar persistencia de tokens en localStorage
      const tokens = await loginPage.obtenerTokensAlmacenados();
      expect(tokens.access).toBe(tokenAdmin);
      expect(tokens.refresh).toBe(tokenRefresh);
    });

    test.describe('TEST-LOG-003: Login inválido parametrizado (4 combinaciones obligatorias)', () => {

      const combinacionesNegativas = [
        {
          id: 'TC-AUTH-INV-01',
          descripcion: 'Contraseña errónea (API 401 Unauthorized)',
          email: 'admin@taller.com',
          password: 'PasswordErroneo123',
          tipo: 'api' as const,
          errorBody: { detail: 'Correo electrónico o contraseña incorrectos.' },
          regexEsperada: /incorrectos|credenciales/i,
        },
        {
          id: 'TC-AUTH-INV-02',
          descripcion: 'Usuario inexistente en el sistema (API 401)',
          email: 'inexistente@taller.com',
          password: 'PasswordValido123',
          tipo: 'api' as const,
          errorBody: { detail: 'No existe una cuenta activa con las credenciales ingresadas.' },
          regexEsperada: /No existe una cuenta|incorrectos/i,
        },
        {
          id: 'TC-AUTH-INV-03',
          descripcion: 'Formato de email inválido sin arroba',
          email: 'usuario-sin-arroba-formato',
          password: 'PasswordValido123',
          tipo: 'cliente' as const,
        },
        {
          id: 'TC-AUTH-INV-04',
          descripcion: 'Campos incompletos o contraseña menor a 6 caracteres',
          email: 'admin@taller.com',
          password: '123',
          tipo: 'cliente' as const,
        },
      ];

      for (const caso of combinacionesNegativas) {
        test(`${caso.id}: ${caso.descripcion}`, async ({ page, loginPage }) => {
          /**
           * HU: HU-002 - Inicio de Sesión
           * TC: TEST-LOG-003 - Suite parametrizada de login negativo
           * Criterio: Al menos 4 combinaciones con feedback en pantalla o bloqueo de envío
           */
          if (caso.tipo === 'api') {
            await page.route('**/api/auth/login/', async (route) => {
              await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify(caso.errorBody),
              });
            });

            await loginPage.navigate();
            await loginPage.intentarLoginInvalido(caso.email, caso.password);

            // Verificación visual del mensaje de error
            await expect(loginPage.errorMessage).toBeVisible();
            await expect(loginPage.errorMessage).toContainText(caso.regexEsperada!);
            await expect(page).toHaveURL(/.*autenticacion/);
          } else {
            // Caso de validación reactiva en cliente Angular
            await loginPage.navigate();
            await loginPage.enterEmail(caso.email);
            await loginPage.enterPassword(caso.password);
            await loginPage.passwordInput.blur();

            // El botón de submit debe permanecer deshabilitado impidiendo envíos corruptos
            await expect(loginPage.submitButton).toBeDisabled();
            await expect(page).toHaveURL(/.*autenticacion/);
          }
        });
      }

    });

    test.describe('TEST-LOG-004: Control de acceso por rol (RoleGuard RBAC)', () => {

      test('RBAC-01: Redirección de usuario anónimo sin sesión al intentar acceder a /admin/dashboard', async ({ page }) => {
        /**
         * HU: HU-002 - Autenticación y Autorización
         * TC: TEST-LOG-004 - RoleGuard impidiendo acceso no autenticado
         */
        // Intentar ingresar directamente a la vista administrativa sin tokens
        await page.goto('/admin/dashboard');

        // RoleGuard debe interceptar y redirigir al login
        await expect(page).toHaveURL(/.*autenticacion/);
      });

      test('RBAC-02: Bloqueo y redirección a /acceso-denegado para rol "cliente" en rutas administrativas', async ({ page, loginPage }) => {
        /**
         * HU: HU-002 - Autenticación y Autorización
         * TC: TEST-LOG-004 - RoleGuard aislando rutas administrativas del rol cliente
         */
        // Inyectar sesión simulada de Cliente en localStorage
        await loginPage.setMockSession({
          email: 'cliente.aislado@ejemplo.com',
          role: 'cliente',
          nombre: 'Cliente Aislado'
        });

        // Intentar navegar hacia el panel administrativo
        await page.goto('/admin/dashboard');

        // RoleGuard debe redirigir a acceso denegado por estricta política RBAC
        await expect(page).toHaveURL(/.*acceso-denegado/);
      });

    });

  });

});

