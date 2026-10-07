import { Routes } from '@angular/router';
import { roleGuardFn } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'autenticacion',
    title: 'FCC APP | Iniciar Sesión',
    loadComponent: () =>
      import('./features/autenticacion/autenticacion.component').then(
        (m) => m.AutenticacionComponent
      )
  },
  {
    path: 'acceso-denegado',
    title: 'FCC APP | Acceso Denegado',
    loadComponent: () =>
      import('./features/acceso-denegado/acceso-denegado.component').then(
        (m) => m.AccesoDenegadoComponent
      )
  },
  {
    path: 'portal-cliente',
    title: 'FCC APP | Portal del Cliente',
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
    title: 'FCC APP | Administración',
    canActivate: [roleGuardFn],
    data: { roles: ['admin', 'tecnico'] },
    loadComponent: () =>
      import('./features/admin/admin.component').then(
        (m) => m.AdminComponent
      ),
    children: [
      {
        path: 'dashboard',
        title: 'FCC APP | Panel de Control',
        loadComponent: () =>
          import('./features/admin/taller-dashboard/taller-dashboard.component').then(
            (m) => m.TallerDashboardComponent
          )
      },
      {
        path: 'clientes',
        title: 'FCC APP | Gestión de Clientes',
        loadComponent: () =>
          import('./features/clientes/clientes.component').then(
            (m) => m.ClientesComponent
          )
      },
      {
        path: 'clientes/nuevo',
        title: 'FCC APP | Nuevo Cliente',
        canActivate: [roleGuardFn],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./features/clientes/cliente-form/cliente-form.component').then(
            (m) => m.ClienteFormComponent
          )
      },
      {
        path: 'clientes/editar/:id',
        title: 'FCC APP | Editar Cliente',
        canActivate: [roleGuardFn],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./features/clientes/cliente-form/cliente-form.component').then(
            (m) => m.ClienteFormComponent
          )
      },
      {
        path: 'ordenes',
        title: 'FCC APP | Órdenes de Trabajo',
        loadComponent: () =>
          import('./features/ordenes/ordenes.component').then(
            (m) => m.OrdenesComponent
          )
      },
      {
        path: 'ordenes/nueva',
        title: 'FCC APP | Nueva Orden de Trabajo',
        loadComponent: () =>
          import('./features/ordenes/orden-form/orden-form.component').then(
            (m) => m.OrdenFormComponent
          )
      },
      {
        path: 'turnos',
        title: 'FCC APP | Agenda de Turnos',
        loadComponent: () =>
          import('./features/admin/turnos-agenda/turnos-agenda.component').then(
            (m) => m.TurnosAgendaComponent
          )
      },
      {
        path: 'facturacion',
        title: 'FCC APP | Facturación y Pagos',
        canActivate: [roleGuardFn],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./features/admin/facturacion-calendario/facturacion-calendario.component').then(
            (m) => m.FacturacionCalendarioComponent
          )
      },
      {
        path: 'configuracion',
        title: 'FCC APP | Configuración de Perfil',
        loadComponent: () =>
          import('./features/configuracion/configuracion-perfil-modal.component').then(
            (m) => m.ConfiguracionPerfilModalComponent
          )
      },
      {
        path: 'vehiculos/nuevo',
        title: 'FCC APP | Nuevo Vehículo',
        canActivate: [roleGuardFn],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./features/vehiculos/vehiculo-form/vehiculo-form.component').then(
            (m) => m.VehiculoFormComponent
          )
      },
      {
        path: 'vehiculos/editar/:id',
        title: 'FCC APP | Editar Vehículo',
        canActivate: [roleGuardFn],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./features/vehiculos/vehiculo-form/vehiculo-form.component').then(
            (m) => m.VehiculoFormComponent
          )
      },
      {
        path: 'vehiculos/:id/historial',
        title: 'FCC APP | Historial de Vehículo',
        loadComponent: () =>
          import('./features/vehiculos/vehiculo-historial/vehiculo-historial.component').then(
            (m) => m.VehiculoHistorialComponent
          )
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'ordenes/nueva',
    title: 'FCC APP | Nueva Orden de Trabajo',
    canActivate: [roleGuardFn],
    data: { roles: ['admin', 'tecnico'] },
    loadComponent: () =>
      import('./features/ordenes/orden-form/orden-form.component').then(
        (m) => m.OrdenFormComponent
      )
  },
  {
    path: 'ordenes',
    title: 'FCC APP | Órdenes de Trabajo',
    canActivate: [roleGuardFn],
    data: { roles: ['admin', 'tecnico'] },
    loadComponent: () =>
      import('./features/ordenes/ordenes.component').then(
        (m) => m.OrdenesComponent
      )
  },
  {
    path: 'clientes/editar/:id',
    title: 'FCC APP | Editar Cliente',
    canActivate: [roleGuardFn],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('./features/clientes/cliente-form/cliente-form.component').then(
        (m) => m.ClienteFormComponent
      )
  },
  {
    path: 'clientes/nuevo',
    title: 'FCC APP | Nuevo Cliente',
    canActivate: [roleGuardFn],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('./features/clientes/cliente-form/cliente-form.component').then(
        (m) => m.ClienteFormComponent
      )
  },
  {
    path: 'clientes',
    title: 'FCC APP | Gestión de Clientes',
    canActivate: [roleGuardFn],
    data: { roles: ['admin', 'tecnico'] },
    loadComponent: () =>
      import('./features/clientes/clientes.component').then(
        (m) => m.ClientesComponent
      )
  },
  {
    path: 'vehiculos/editar/:id',
    title: 'FCC APP | Editar Vehículo',
    canActivate: [roleGuardFn],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('./features/vehiculos/vehiculo-form/vehiculo-form.component').then(
        (m) => m.VehiculoFormComponent
      )
  },
  {
    path: 'vehiculos/:id/historial',
    title: 'FCC APP | Historial de Vehículo',
    canActivate: [roleGuardFn],
    data: { roles: ['admin', 'tecnico'] },
    loadComponent: () =>
      import('./features/vehiculos/vehiculo-historial/vehiculo-historial.component').then(
        (m) => m.VehiculoHistorialComponent
      )
  },
  {
    path: 'vehiculos/nuevo',
    title: 'FCC APP | Nuevo Vehículo',
    canActivate: [roleGuardFn],
    data: { roles: ['admin'] },
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

