import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'autenticacion',
    loadComponent: () =>
      import('./features/autenticacion/autenticacion.component').then(
        (m) => m.AutenticacionComponent
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
  }
];
