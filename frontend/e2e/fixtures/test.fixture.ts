import { test as baseTest, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { ClientesPage } from '../pages/clientes.page';
import { VehiculosPage } from '../pages/vehiculos.page';
import { OrdenesPage } from '../pages/ordenes.page';
import { PortalClientePage } from '../pages/portal-cliente.page';

/**
 * CustomFixtures - Inyección tipada de dependencias para suites de prueba E2E
 * Cátedra ISPC - Verificación y Validación de Programas (Sprint 4 - AUT-E2E-01 / TK215)
 *
 * Desacopla la instanciación de Page Objects de los tests (*.spec.ts), permitiendo
 * recibir instancias listas para usar como argumentos de cada test.
 */
type CustomFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  clientesPage: ClientesPage;
  vehiculosPage: VehiculosPage;
  ordenesPage: OrdenesPage;
  portalClientePage: PortalClientePage;
};

export const test = baseTest.extend<CustomFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  clientesPage: async ({ page }, use) => {
    await use(new ClientesPage(page));
  },
  vehiculosPage: async ({ page }, use) => {
    await use(new VehiculosPage(page));
  },
  ordenesPage: async ({ page }, use) => {
    await use(new OrdenesPage(page));
  },
  portalClientePage: async ({ page }, use) => {
    await use(new PortalClientePage(page));
  },
});

export { expect };
