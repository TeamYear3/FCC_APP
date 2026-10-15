import { test, expect } from '../fixtures/test.fixture';

/**
 * Helper para generar un JWT sintético válido con rol 'admin' decodificable por AuthService
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
 * AUT-E2E-04: Flujo Crítico 2 - Gestión Integral de Clientes y Flota de Vehículos (Sprint 4 - TK229 #290)
 * Cátedra: Verificación y Validación de Programas - ISPC
 *
 * Módulo Evaluado:
 * - Módulo 3: Gestión de Datos (Clientes y Vehículos)
 *   - TEST-CRUD-001: Alta de nuevo cliente con validación de CUIT y reflejo en directorio
 *   - TEST-CRUD-002: Alta de nuevo vehículo con vinculación asistida de propietario y patente Mercosur
 *   - TEST-CRUD-004: Edición de datos de contacto de cliente y garantía de inmutabilidad de CUIT
 *   - TEST-CRUD-005: Búsqueda reactiva en el directorio de clientes y filtrado de resultados
 *
 * Cumplimiento de Reglas de Oro POM:
 * - Regla 1: Encapsulamiento en ClientesPage y VehiculosPage.
 * - Regla 2: Localizadores únicos y semánticos basados en data-testid.
 * - Regla 3: Métodos con clara intención de negocio.
 * - Regla 4: Navegaciones tipadas mediante Page Objects.
 * - Regla 5: Las aserciones residen estrictamente en este archivo spec.
 * - Regla 6: Cero esperas ciegas; sincronización reactiva por eventos de red y auto-waiting.
 */
test.describe('AUT-E2E-04: Flujo Crítico 2 - Gestión Integral de Clientes y Flota de Vehículos', () => {

  const clientesDirectorioInicial = [
    {
      id: 'cli-001',
      tipo_documento: 'CUIT',
      dni_cuit: '30-71122334-5',
      nombre: 'Transportes',
      apellido: 'del Centro SRL',
      condicion_iva: 'RI',
      telefono: '+54 351 444-5555',
      domicilio: 'Av. Colón 1234, Córdoba'
    },
    {
      id: 'cli-002',
      tipo_documento: 'DNI',
      dni_cuit: '32123456',
      nombre: 'Mariana',
      apellido: 'López',
      condicion_iva: 'CF',
      telefono: '+54 351 999-1122',
      domicilio: 'Bv. San Juan 789, Córdoba'
    }
  ];

  test.beforeEach(async ({ page }) => {
    // 1. Inyectar sesión de administrador antes de cualquier navegación para superar AuthGuard y RoleGuard
    const adminToken = crearJwtMock('admin', 'admin@taller.com', 'Admin Operaciones');
    await page.addInitScript((token) => {
      localStorage.setItem('fcc_auth_token', token);
      localStorage.setItem('access_token', token);
      localStorage.setItem('refresh_token', token);
      localStorage.setItem('userRole', 'admin');
    }, adminToken);

    // 2. Intercepción base hermética de API para evitar 401s o fallas de red
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/token/refresh/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ access: adminToken, refresh: adminToken })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
    });

    await page.route('**/api/auth/google/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) });
    });

    await page.route('**/api/taller/resumen-clientes/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/vehiculos/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
  });

  test('TEST-CRUD-001: Alta de nuevo cliente con validación estricta de CUIT y reflejo en directorio', async ({ page, clientesPage }) => {
    /**
     * HU: HU-003 - Gestión de Clientes
     * TC: TEST-CRUD-001 - Alta de cliente corporativo con CUIT y verificación en directorio
     */
    const nuevoCliente = {
      id: 'cli-new-099',
      tipo_documento: 'CUIT',
      dni_cuit: '30-71556677-8',
      nombre: 'Distribuidora',
      apellido: 'Mediterránea SA',
      condicion_iva: 'RI',
      telefono: '+54 351 600-7788',
      domicilio: 'Av. Circunvalación 5000, Córdoba'
    };

    let clienteCreado = false;

    await page.route('**/api/clientes/**', async (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        clienteCreado = true;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(nuevoCliente)
        });
      } else if (method === 'GET') {
        const lista = clienteCreado ? [nuevoCliente, ...clientesDirectorioInicial] : clientesDirectorioInicial;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(lista)
        });
      } else {
        await route.fallback();
      }
    });

    // 1. Navegar a la pantalla de alta de cliente
    await clientesPage.navigateNuevo();
    await expect(page).toHaveURL(/.*admin\/clientes\/nuevo/);
    await expect(clientesPage.formCliente).toBeVisible();

    // 2. Completar los campos del cliente corporativo
    await clientesPage.completarClienteForm({
      tipoDocumento: 'CUIT',
      dniCuit: '30-71556677-8',
      nombre: 'Distribuidora',
      apellido: 'Mediterránea SA',
      condicionIva: 'RI',
      telefono: '+54 351 600-7788',
      domicilio: 'Av. Circunvalación 5000, Córdoba'
    });

    // 3. Guardar el nuevo cliente y esperar la respuesta POST
    const respuestaPost = page.waitForResponse(resp => resp.url().includes('/api/clientes/') && resp.status() === 201);
    await clientesPage.guardarCliente();
    await respuestaPost;

    // 4. Assert: Redirección automática al directorio y visibilidad del nuevo registro
    await expect(page).toHaveURL(/.*admin\/clientes$/);
    await expect(clientesPage.tablaClientes).toBeVisible();

    const filaNuevo = clientesPage.obtenerFilaPorCuit('30-71556677-8');
    await expect(filaNuevo).toBeVisible();
    await expect(filaNuevo).toContainText('Distribuidora Mediterránea SA');
  });

  test('TEST-CRUD-002: Alta de nuevo vehículo con vinculación asistida de propietario y patente Mercosur', async ({ page, vehiculosPage }) => {
    /**
     * HU: HU-004 - Gestión de Vehículos y Flota
     * TC: TEST-CRUD-002 - Alta de vehículo vinculado a cliente existente con validación de patente
     */
    const nuevoVehiculo = {
      id: 'veh-new-888',
      cliente_id: 'cli-001',
      cliente_nombre: 'Transportes del Centro SRL',
      marca: 'Toyota',
      modelo: 'Hilux 4x4 DX',
      anio: 2024,
      tipo_motor: 'DIESEL',
      patente: 'AF999ZZ',
      numero_chasis: '8AJBA3CD8E1234567',
      kilometraje: 15000,
      color: 'Blanco Perlado'
    };

    await page.route('**/api/clientes/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(clientesDirectorioInicial)
      });
    });

    let vehiculoCreado = false;
    await page.route('**/api/vehiculos/**', async (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        vehiculoCreado = true;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(nuevoVehiculo)
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(vehiculoCreado ? [nuevoVehiculo] : [])
        });
      }
    });

    // 1. Navegar al formulario de nuevo vehículo
    await vehiculosPage.navigateNuevo();
    await expect(page).toHaveURL(/.*admin\/vehiculos\/nuevo/);
    await expect(vehiculosPage.formVehiculo).toBeVisible();

    // 2. Vincular propietario mediante buscador interactivo asistido
    await vehiculosPage.buscarYSeleccionarCliente('Transportes');
    await expect(vehiculosPage.clienteSeleccionadoCard).toBeVisible();
    await expect(vehiculosPage.clienteSeleccionadoCard).toContainText('Transportes');

    // 3. Completar especificaciones técnicas del vehículo
    await vehiculosPage.completarVehiculoForm({
      marca: 'Toyota',
      modelo: 'Hilux 4x4 DX',
      anio: 2024,
      tipoMotor: 'GASOLERO',
      patente: 'AF999ZZ',
      chasis: '8AJBA3CD8E1234567',
      kilometraje: 15000,
      color: 'Blanco Perlado'
    });

    // 4. Guardar vehículo y verificar solicitud REST exitosa
    const respuestaPost = page.waitForResponse(resp => resp.url().includes('/api/vehiculos/') && resp.status() === 201);
    await vehiculosPage.guardarVehiculo();
    await respuestaPost;

    // 5. Assert: Redirección reactiva al directorio general
    await expect(page).toHaveURL(/.*admin\/clientes/);
  });

  test('TEST-CRUD-004: Edición de datos de contacto de cliente y garantía de inmutabilidad del DNI/CUIT', async ({ page, clientesPage }) => {
    /**
     * HU: HU-003 - Gestión de Clientes
     * TC: TEST-CRUD-004 - Modificación de teléfono/domicilio y bloqueo de modificación en DNI/CUIT
     */
    const clienteExistente = {
      id: 'cli-001',
      tipo_documento: 'CUIT',
      dni_cuit: '30-71122334-5',
      nombre: 'Transportes',
      apellido: 'del Centro SRL',
      condicion_iva: 'RI',
      telefono: '+54 351 444-5555',
      domicilio: 'Av. Colón 1234, Córdoba'
    };

    let clienteActualizado = false;

    await page.route('**/api/clientes/**', async (route) => {
      const method = route.request().method();
      const url = route.request().url();

      if (url.includes('cli-001')) {
        if (method === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(clienteExistente)
          });
        } else if (method === 'PUT' || method === 'PATCH') {
          clienteActualizado = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...clienteExistente,
              telefono: '+54 351 777-9900',
              domicilio: 'Parque Industrial Ferreira, Córdoba'
            })
          });
        } else {
          await route.fallback();
        }
      } else {
        // GET lista general
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              ...clienteExistente,
              telefono: clienteActualizado ? '+54 351 777-9900' : clienteExistente.telefono,
              domicilio: clienteActualizado ? 'Parque Industrial Ferreira, Córdoba' : clienteExistente.domicilio
            }
          ])
        });
      }
    });

    // 1. Navegar en modo edición para el cliente cli-001
    await clientesPage.navigateEditar('cli-001');
    await expect(page).toHaveURL(/.*admin\/clientes\/editar\/cli-001/);
    await expect(clientesPage.formCliente).toBeVisible();

    // 2. Assert: Inmutabilidad del DNI/CUIT (bloqueado y no modificable en modo edición)
    await expect(clientesPage.dniCuitInput).toBeDisabled();
    await expect(clientesPage.tipoDocSelect).toBeDisabled();

    // 3. Modificar datos permitidos (teléfono y domicilio)
    await clientesPage.telefonoInput.clear();
    await clientesPage.telefonoInput.fill('+54 351 777-9900');
    await clientesPage.domicilioInput.clear();
    await clientesPage.domicilioInput.fill('Parque Industrial Ferreira, Córdoba');

    // 4. Guardar cambios y esperar respuesta PUT/PATCH
    const respuestaPut = page.waitForResponse(resp => resp.url().includes('/api/clientes/cli-001') && resp.status() === 200);
    await clientesPage.guardarCliente();
    await respuestaPut;

    // 5. Assert: Redirección al directorio y verificación de actualización de datos
    await expect(page).toHaveURL(/.*admin\/clientes$/);
    const fila = clientesPage.obtenerFilaPorCuit('30-71122334-5');
    await expect(fila).toBeVisible();
    await expect(fila).toContainText('+54 351 777-9900');
  });

  test('TEST-CRUD-005: Búsqueda reactiva en el directorio de clientes y filtrado instantáneo', async ({ page, clientesPage }) => {
    /**
     * HU: HU-003 - Gestión de Clientes
     * TC: TEST-CRUD-005 - Filtrado en tiempo real en la vista de clientes
     */
    await page.route('**/api/clientes/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(clientesDirectorioInicial)
      });
    });

    // 1. Navegar al directorio de clientes
    await clientesPage.navigate();
    await expect(page).toHaveURL(/.*admin\/clientes/);
    await expect(clientesPage.tablaClientes).toBeVisible();

    // 2. Verificar que inicialmente ambos clientes se encuentran en la vista
    await expect(clientesPage.obtenerFilaPorCuit('30-71122334-5')).toBeVisible();
    await expect(clientesPage.obtenerFilaPorCuit('32123456')).toBeVisible();

    // 3. Escribir término de búsqueda que sólo coincida con el primer cliente
    await clientesPage.buscarCliente('Transportes');

    // 4. Assert: La tabla se filtra reactivamente mostrando sólo el cliente coincidente
    await expect(clientesPage.obtenerFilaPorCuit('30-71122334-5')).toBeVisible();
    await expect(clientesPage.obtenerFilaPorCuit('32123456')).not.toBeVisible();

    // 5. Limpiar término de búsqueda y verificar restablecimiento completo
    await clientesPage.buscarCliente('');
    await expect(clientesPage.obtenerFilaPorCuit('30-71122334-5')).toBeVisible();
    await expect(clientesPage.obtenerFilaPorCuit('32123456')).toBeVisible();
  });

});
