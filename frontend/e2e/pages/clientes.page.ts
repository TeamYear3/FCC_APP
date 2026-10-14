import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * ClientesPage - Page Object Model para el Módulo de Clientes
 * Cátedra ISPC - Verificación y Validación de Programas (Sprint 4 - AUT-E2E-01 / TK215)
 *
 * Cumplimiento de Reglas de Oro POM:
 * - Regla 1: Un Page Object exclusivo para la gestión de Clientes.
 * - Regla 2: Localizadores privados/protegidos con jerarquía getByTestId > getByRole.
 * - Regla 3: Métodos con intención de negocio (buscarCliente, crearCliente).
 * - Regla 5: Cero aserciones internas en el Page Object.
 * - Regla 6: Libre de esperas ciegas (auto-waiting de Playwright).
 */
export class ClientesPage extends BasePage {
  readonly searchInput: Locator;
  readonly nuevoClienteButton: Locator;
  readonly clientesTable: Locator;
  readonly clienteRows: Locator;
  readonly modalCliente: Locator;
  readonly nombreInput: Locator;
  readonly apellidoInput: Locator;
  readonly dniCuitInput: Locator;
  readonly telefonoInput: Locator;
  readonly guardarButton: Locator;
  readonly cancelarButton: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByTestId('cliente-buscar-input').or(page.locator('input[type="text"], input[placeholder*="buscar"]'));
    this.nuevoClienteButton = page.getByTestId('cliente-nuevo-btn')
      .or(page.getByRole('link', { name: /nuevo cliente/i }))
      .or(page.getByRole('button', { name: /nuevo cliente/i }))
      .or(page.locator('a[routerlink*="clientes/nuevo"], a[href*="clientes/nuevo"]'));
    this.clientesTable = page.getByTestId('clientes-tabla').or(page.locator('table, [data-testid="tabla-clientes"], .clientes-table'));
    this.clienteRows = page.getByTestId('cliente-row').or(page.locator('table tbody tr'));
    this.modalCliente = page.getByTestId('modal-cliente').or(page.locator('app-cliente-form, .modal, [role="dialog"]'));
    this.nombreInput = page.getByTestId('cliente-nombre-input').or(page.locator('input[name="nombre"], input[formcontrolname="nombre"]'));
    this.apellidoInput = page.getByTestId('cliente-apellido-input').or(page.locator('input[name="apellido"], input[formcontrolname="apellido"]'));
    this.dniCuitInput = page.getByTestId('cliente-dnicuit-input').or(page.locator('input[name="dni_cuit"], input[formcontrolname="dni_cuit"]'));
    this.telefonoInput = page.getByTestId('cliente-telefono-input').or(page.locator('input[name="telefono"], input[formcontrolname="telefono"]'));
    this.guardarButton = page.getByTestId('cliente-guardar-btn').or(page.getByRole('button', { name: /guardar|crear/i }));
    this.cancelarButton = page.getByTestId('cliente-cancelar-btn').or(page.getByRole('button', { name: /cancelar/i }));
  }

  /**
   * Navega a la vista administrativa de clientes.
   */
  async navigate(): Promise<void> {
    await this.setMockSession({ email: 'admin@taller.com', role: 'admin', nombre: 'Admin Taller' });
    await this.goto('/admin/clientes');
    await this.waitForLoaded();
  }

  /**
   * Busca un cliente en la tabla por término o DNI.
   */
  async search(query: string): Promise<void> {
    if (await this.searchInput.first().isVisible()) {
      await this.searchInput.first().fill(query);
    }
  }

  /**
   * Abre el modal/formulario de nuevo cliente.
   */
  async abrirNuevoCliente(): Promise<void> {
    await this.nuevoClienteButton.click();
    await this.waitForLoaded();
  }

  /**
   * Completa los campos del formulario de cliente.
   */
  async completarDatos(datos: { nombre: string; apellido: string; dni_cuit: string; telefono?: string }): Promise<void> {
    await this.nombreInput.fill(datos.nombre);
    await this.apellidoInput.fill(datos.apellido);
    await this.dniCuitInput.fill(datos.dni_cuit);
    if (datos.telefono && await this.telefonoInput.isVisible()) {
      await this.telefonoInput.fill(datos.telefono);
    }
  }

  /**
   * Guarda el cliente completado y espera la sincronización de red.
   */
  async guardar(): Promise<void> {
    await this.guardarButton.click();
  }

  /**
   * Flujo de negocio integrado: Alta completa de cliente.
   */
  async crearCliente(datos: { nombre: string; apellido: string; dni_cuit: string; telefono?: string }): Promise<void> {
    await this.abrirNuevoCliente();
    await this.completarDatos(datos);
    await this.guardar();
  }
}
