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
    path: 'transparencia',
    canActivate: [roleGuardFn],
    data: { roles: ['cliente', 'tecnico', 'admin'] },
    loadComponent: () =>
      import('./features/portal-transparencia/portal-transparencia.component').then(
        (m) => m.PortalTransparenciaComponent
      )
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
