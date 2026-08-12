import { Routes } from '@angular/router';
import { roleGuardFn } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'autenticacion',
    loadComponent: () =>
      import('./features/autenticacion/autenticacion.component').then(
        (m) => m.AutenticacionComponent
      )
  },
  {
    path: 'no-autorizado',
    loadComponent: () =>
      import('./features/no-autorizado/no-autorizado.component').then(
        (m) => m.NoAutorizadoComponent
      )
  },
  {
    path: 'portal-cliente',
    canActivate: [roleGuardFn],
    data: { roles: ['cliente', 'tecnico', 'admin'] },
    loadComponent: () =>
      import('./features/portal-cliente/portal-cliente.component').then(
        (m) => m.PortalClienteComponent
      )
  },
  {
    path: 'transparencia',
    redirectTo: 'portal-cliente',
    pathMatch: 'full'
  },
  {
    path: 'admin',
    canActivate: [roleGuardFn],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('./features/admin/admin.component').then(
        (m) => m.AdminComponent
      )
  },
  {
    path: 'ordenes/nueva',
    canActivate: [roleGuardFn],
    data: { roles: ['admin', 'tecnico'] },
    loadComponent: () =>
      import('./features/ordenes/orden-form/orden-form.component').then(
        (m) => m.OrdenFormComponent
      )
  },
  {
    path: 'ordenes',
    canActivate: [roleGuardFn],
    data: { roles: ['admin', 'tecnico'] },
    loadComponent: () =>
      import('./features/ordenes/ordenes.component').then(
        (m) => m.OrdenesComponent
      )
  },
  {
    path: 'clientes/editar/:id',
    canActivate: [roleGuardFn],
    data: { roles: ['admin', 'tecnico'] },
    loadComponent: () =>
      import('./features/clientes/cliente-form/cliente-form.component').then(
        (m) => m.ClienteFormComponent
      )
  },
  {
    path: 'clientes/nuevo',
    canActivate: [roleGuardFn],
    data: { roles: ['admin', 'tecnico'] },
    loadComponent: () =>
      import('./features/clientes/cliente-form/cliente-form.component').then(
        (m) => m.ClienteFormComponent
      )
  },
  {
    path: 'clientes',
    canActivate: [roleGuardFn],
    data: { roles: ['admin', 'tecnico'] },
    loadComponent: () =>
      import('./features/clientes/clientes.component').then(
        (m) => m.ClientesComponent
      )
  },
  {
    path: 'vehiculos/editar/:id',
    canActivate: [roleGuardFn],
    data: { roles: ['admin', 'tecnico'] },
    loadComponent: () =>
      import('./features/vehiculos/vehiculo-form/vehiculo-form.component').then(
        (m) => m.VehiculoFormComponent
      )
  },
  {
    path: 'vehiculos/:id/historial',
    canActivate: [roleGuardFn],
    data: { roles: ['admin', 'tecnico'] },
    loadComponent: () =>
      import('./features/vehiculos/vehiculo-historial/vehiculo-historial.component').then(
        (m) => m.VehiculoHistorialComponent
      )
  },
  {
    path: 'vehiculos/nuevo',
    canActivate: [roleGuardFn],
    data: { roles: ['admin', 'tecnico'] },
    loadComponent: () =>
      import('./features/vehiculos/vehiculo-form/vehiculo-form.component').then(
        (m) => m.VehiculoFormComponent
      )
  },
  {
    path: 'auth',
    redirectTo: 'autenticacion',
    pathMatch: 'full'
  },
  {
    path: '',
    redirectTo: 'autenticacion',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'autenticacion'
  }
];
