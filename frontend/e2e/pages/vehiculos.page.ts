import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * VehiculosPage - Page Object Model para el Módulo de Vehículos
 * Cátedra ISPC - Verificación y Validación de Programas (Sprint 4 - AUT-E2E-01 / TK215)
 *
 * Cumplimiento de Reglas de Oro POM:
 * - Regla 1: Un Page Object exclusivo para la gestión de Vehículos.
 * - Regla 2: Localizadores privados con jerarquía getByTestId > getByRole.
 * - Regla 3: Métodos con intención de negocio.
 * - Regla 5: Cero aserciones internas en el Page Object.
 * - Regla 6: Libre de esperas ciegas.
 */
export class VehiculosPage extends BasePage {
  readonly searchInput: Locator;
  readonly nuevoVehiculoButton: Locator;
  readonly vehiculosTable: Locator;
  readonly vehiculoRows: Locator;
  readonly modalVehiculo: Locator;
  readonly patenteInput: Locator;
  readonly marcaInput: Locator;
  readonly modeloInput: Locator;
  readonly anioInput: Locator;
  readonly tipoMotorSelect: Locator;
  readonly kilometrajeInput: Locator;
  readonly chasisInput: Locator;
  readonly clienteSearchInput: Locator;
  readonly guardarButton: Locator;
  readonly cancelarButton: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByTestId('vehiculo-buscar-input').or(page.locator('input[placeholder*="patente"], input[type="text"]'));
    this.nuevoVehiculoButton = page.getByTestId('vehiculo-nuevo-btn').or(page.getByRole('button', { name: /nuevo vehículo|nuevo vehiculo/i }));
    this.vehiculosTable = page.getByTestId('vehiculos-tabla').or(page.locator('table, [data-testid="tabla-vehiculos"], .vehiculos-table'));
    this.vehiculoRows = page.getByTestId('vehiculo-row').or(page.locator('table tbody tr'));
    this.modalVehiculo = page.getByTestId('modal-vehiculo').or(page.locator('app-vehiculo-form, .modal, [role="dialog"]'));
    this.patenteInput = page.getByTestId('vehiculo-patente-input').or(page.locator('input[name="patente"], input[formcontrolname="patente"]'));
    this.marcaInput = page.getByTestId('vehiculo-marca-input').or(page.locator('input[name="marca"], input[formcontrolname="marca"]'));
    this.modeloInput = page.getByTestId('vehiculo-modelo-input').or(page.locator('input[name="modelo"], input[formcontrolname="modelo"]'));
    this.anioInput = page.getByTestId('vehiculo-anio-input').or(page.locator('input[name="anio"], input[formcontrolname="anio"]'));
    this.tipoMotorSelect = page.getByTestId('vehiculo-tipo-motor-select').or(page.locator('select[formcontrolname="tipo_motor"]'));
    this.kilometrajeInput = page.locator('input[formcontrolname="kilometraje"]');
    this.chasisInput = page.getByTestId('vehiculo-chasis-input').or(page.locator('input[formcontrolname="nro_chasis"]'));
    this.clienteSearchInput = page.locator('input[placeholder*="Buscar por Nombre"]');
    this.guardarButton = page.getByTestId('vehiculo-guardar-btn').or(page.getByRole('button', { name: /guardar/i }));
    this.cancelarButton = page.getByTestId('vehiculo-cancelar-btn').or(page.getByRole('link', { name: /arrow_back/i }));
  }

  /**
   * Navega a la vista administrativa de vehículos.
   */
  async navigate(): Promise<void> {
    await this.setMockSession({ email: 'admin@taller.com', role: 'admin', nombre: 'Admin Taller' });
    await this.goto('/admin/vehiculos');
    await this.waitForLoaded();
  }

  /**
   * Navega directamente al formulario de alta de nuevo vehículo.
   */
  async navegarANuevo(): Promise<void> {
    await this.setMockSession({ email: 'admin@taller.com', role: 'admin', nombre: 'Admin Taller' });
    await this.goto('/admin/vehiculos/nuevo');
    await this.waitForLoaded();
  }

  /**
   * Busca un vehículo por patente en el listado.
   */
  async search(patente: string): Promise<void> {
    if (await this.searchInput.first().isVisible()) {
      await this.searchInput.first().fill(patente);
    }
  }

  /**
   * Busca y selecciona interactivamente al cliente propietario mediante el buscador typeahead.
   */
  async seleccionarClientePropietario(nombreOQuery: string): Promise<void> {
    await this.clienteSearchInput.fill(nombreOQuery);
    const dropdownItem = this.page.locator('div.divide-y div').filter({ hasText: nombreOQuery }).first();
    await dropdownItem.waitFor({ state: 'visible', timeout: 5000 });
    await dropdownItem.click();
  }

  /**
   * Completa los campos del formulario de vehículo.
   */
  async completarFormularioVehiculo(datos: {
    patente: string;
    marca: string;
    modelo: string;
    anio: number | string;
    tipo_motor?: 'NAFTERO' | 'GASOLERO' | 'GNC' | 'HIBRIDO_ELECTRICO';
    kilometraje?: number | string;
    nro_chasis?: string;
  }): Promise<void> {
    await this.marcaInput.fill(datos.marca);
    await this.modeloInput.fill(datos.modelo);
    await this.anioInput.fill(String(datos.anio));

    if (datos.tipo_motor && await this.tipoMotorSelect.isVisible()) {
      await this.tipoMotorSelect.selectOption(datos.tipo_motor);
    }
    await this.patenteInput.fill(datos.patente);

    if (datos.nro_chasis && await this.chasisInput.isVisible()) {
      await this.chasisInput.fill(datos.nro_chasis);
    }
    if (datos.kilometraje !== undefined && await this.kilometrajeInput.isVisible()) {
      await this.kilometrajeInput.fill(String(datos.kilometraje));
    }
  }

  /**
   * Guarda los cambios del vehículo enviando el formulario.
   */
  async guardar(): Promise<void> {
    await this.guardarButton.click();
  }

  /**
   * Flujo de negocio integrado: Alta completa de vehículo con cliente.
   */
  async crearVehiculo(clienteQuery: string, datos: {
    patente: string;
    marca: string;
    modelo: string;
    anio: number | string;
    tipo_motor?: 'NAFTERO' | 'GASOLERO' | 'GNC' | 'HIBRIDO_ELECTRICO';
    kilometraje?: number | string;
    nro_chasis?: string;
  }): Promise<void> {
    await this.navegarANuevo();
    await this.seleccionarClientePropietario(clienteQuery);
    await this.completarFormularioVehiculo(datos);
    await this.guardar();
  }
}
