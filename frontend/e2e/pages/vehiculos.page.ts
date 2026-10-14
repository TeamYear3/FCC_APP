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
  readonly clienteSelect: Locator;
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
    this.clienteSelect = page.getByTestId('vehiculo-cliente-select').or(page.locator('select[name="cliente"], select[formcontrolname="cliente"]'));
    this.guardarButton = page.getByTestId('vehiculo-guardar-btn').or(page.getByRole('button', { name: /guardar|crear/i }));
    this.cancelarButton = page.getByTestId('vehiculo-cancelar-btn').or(page.getByRole('button', { name: /cancelar/i }));
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
   * Busca un vehículo por patente en el listado.
   */
  async search(patente: string): Promise<void> {
    if (await this.searchInput.first().isVisible()) {
      await this.searchInput.first().fill(patente);
    }
  }

  /**
   * Abre el formulario o modal para registrar un nuevo vehículo.
   */
  async abrirNuevoVehiculo(): Promise<void> {
    await this.nuevoVehiculoButton.click();
    await this.waitForLoaded();
  }

  /**
   * Completa los campos básicos de un vehículo.
   */
  async completarDatos(datos: { patente: string; marca: string; modelo: string; anio?: string }): Promise<void> {
    await this.patenteInput.fill(datos.patente);
    await this.marcaInput.fill(datos.marca);
    await this.modeloInput.fill(datos.modelo);
    if (datos.anio && await this.anioInput.isVisible()) {
      await this.anioInput.fill(datos.anio);
    }
  }

  /**
   * Guarda los cambios del vehículo.
   */
  async guardar(): Promise<void> {
    await this.guardarButton.click();
  }

  /**
   * Flujo de negocio integrado: Alta completa de vehículo.
   */
  async crearVehiculo(datos: { patente: string; marca: string; modelo: string; anio?: string }): Promise<void> {
    await this.abrirNuevoVehiculo();
    await this.completarDatos(datos);
    await this.guardar();
  }
}
