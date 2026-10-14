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
  readonly tipoDocumentoSelect: Locator;
  readonly condicionIvaSelect: Locator;
  readonly telefonoInput: Locator;
  readonly domicilioInput: Locator;
  readonly guardarButton: Locator;
  readonly cancelarButton: Locator;
  readonly editarLegajoButton: Locator;
  readonly expedienteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByTestId('cliente-buscar-input').or(page.locator('input[type="text"], input[placeholder*="buscar"]'));
    this.nuevoClienteButton = page.getByTestId('cliente-nuevo-btn')
      .or(page.getByRole('link', { name: /nuevo cliente/i }))
      .or(page.getByRole('button', { name: /nuevo cliente/i }))
      .or(page.locator('a[routerlink*="clientes/nuevo"], a[href*="clientes/nuevo"]'));
    this.clientesTable = page.getByTestId('clientes-tabla').or(page.locator('table, [data-testid="tabla-clientes"], .clientes-table, cdk-virtual-scroll-viewport'));
    this.clienteRows = page.getByTestId('cliente-row').or(page.locator('table tbody tr, .rounded-card[data-testid="cliente-row"]'));
    this.modalCliente = page.getByTestId('modal-cliente').or(page.locator('app-cliente-form, .modal, [role="dialog"]'));
    this.tipoDocumentoSelect = page.getByTestId('cliente-tipo-doc-select').or(page.locator('#tipo_documento, select[formcontrolname="tipo_documento"]'));
    this.dniCuitInput = page.getByTestId('cliente-dnicuit-input').or(page.locator('#dni_cuit, input[formcontrolname="dni_cuit"]'));
    this.nombreInput = page.getByTestId('cliente-nombre-input').or(page.locator('#nombre, input[formcontrolname="nombre"]'));
    this.apellidoInput = page.getByTestId('cliente-apellido-input').or(page.locator('#apellido, input[formcontrolname="apellido"]'));
    this.condicionIvaSelect = page.getByTestId('cliente-condicion-iva-select').or(page.locator('#condicion_iva, select[formcontrolname="condicion_iva"]'));
    this.telefonoInput = page.getByTestId('cliente-telefono-input').or(page.locator('#telefono, input[formcontrolname="telefono"]'));
    this.domicilioInput = page.getByTestId('cliente-domicilio-input').or(page.locator('#domicilio, input[formcontrolname="domicilio"]'));
    this.guardarButton = page.getByTestId('cliente-guardar-btn').or(page.getByRole('button', { name: /guardar/i }));
    this.cancelarButton = page.getByTestId('cliente-cancelar-btn').or(page.getByRole('button', { name: /cancelar/i }));
    this.editarLegajoButton = page.getByTestId('cliente-editar-btn').or(page.getByRole('link', { name: /editar legajo/i }));
    this.expedienteButton = page.getByTestId('cliente-expediente-btn').or(page.getByRole('button', { name: /expediente/i }));
  }

  /**
   * Navega a la vista administrativa de clientes con sesión de admin inyectada.
   */
  async navigate(): Promise<void> {
    await this.setMockSession({ email: 'admin@taller.com', role: 'admin', nombre: 'Admin Taller' });
    await this.goto('/admin/clientes');
    await this.waitForLoaded();
  }

  /**
   * Navega directamente al formulario de alta de nuevo cliente.
   */
  async navegarANuevo(): Promise<void> {
    await this.setMockSession({ email: 'admin@taller.com', role: 'admin', nombre: 'Admin Taller' });
    await this.goto('/admin/clientes/nuevo');
    await this.waitForLoaded();
  }

  /**
   * Navega al formulario de edición de un cliente por su ID.
   */
  async navegarAEdicion(clienteId: number): Promise<void> {
    await this.setMockSession({ email: 'admin@taller.com', role: 'admin', nombre: 'Admin Taller' });
    await this.goto(`/admin/clientes/editar/${clienteId}`);
    await this.waitForLoaded();
  }

  /**
   * Busca un cliente en el directorio filtrando interactivamente por texto.
   */
  async search(query: string): Promise<void> {
    if (await this.searchInput.first().isVisible()) {
      await this.searchInput.first().fill(query);
    }
  }

  /**
   * Abre el formulario de nuevo cliente haciendo clic en el botón de acción principal.
   */
  async abrirNuevoCliente(): Promise<void> {
    await this.nuevoClienteButton.click();
    await this.waitForLoaded();
  }

  /**
   * Completa los campos del formulario de cliente (Alta o Edición).
   */
  async completarFormularioAlta(datos: {
    tipo_documento?: 'DNI' | 'CUIT';
    dni_cuit: string;
    nombre: string;
    apellido: string;
    condicion_iva?: string;
    telefono?: string;
    domicilio?: string;
  }): Promise<void> {
    if (datos.tipo_documento && await this.tipoDocumentoSelect.isVisible()) {
      await this.tipoDocumentoSelect.selectOption(datos.tipo_documento);
    }
    await this.dniCuitInput.fill(datos.dni_cuit);
    await this.nombreInput.fill(datos.nombre);
    await this.apellidoInput.fill(datos.apellido);

    if (datos.condicion_iva && await this.condicionIvaSelect.isVisible()) {
      await this.condicionIvaSelect.selectOption(datos.condicion_iva);
    }
    if (datos.telefono && await this.telefonoInput.isVisible()) {
      await this.telefonoInput.fill(datos.telefono);
    }
    if (datos.domicilio && await this.domicilioInput.isVisible()) {
      await this.domicilioInput.fill(datos.domicilio);
    }
  }

  /**
   * Completa la edición de campos de contacto (teléfono y domicilio).
   */
  async completarEdicionContacto(datos: { telefono?: string; domicilio?: string }): Promise<void> {
    if (datos.telefono !== undefined) {
      await this.telefonoInput.fill(datos.telefono);
    }
    if (datos.domicilio !== undefined) {
      await this.domicilioInput.fill(datos.domicilio);
    }
  }

  /**
   * Guarda el formulario de cliente y espera la persistencia.
   */
  async guardar(): Promise<void> {
    await this.guardarButton.click();
  }

  /**
   * Flujo de negocio integrado: Alta completa de cliente.
   */
  async crearCliente(datos: {
    tipo_documento?: 'DNI' | 'CUIT';
    dni_cuit: string;
    nombre: string;
    apellido: string;
    condicion_iva?: string;
    telefono?: string;
    domicilio?: string;
  }): Promise<void> {
    await this.navegarANuevo();
    await this.completarFormularioAlta(datos);
    await this.guardar();
  }
}
