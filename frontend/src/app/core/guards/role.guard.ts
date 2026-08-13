import { Injectable, inject } from '@angular/core';
import {
  CanActivate,
  CanActivateFn,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { AuthService } from '../auth/auth.service';

/**
 * RoleGuard restringe el acceso a las vistas en función del rol del usuario autenticado
 * ('admin', 'tecnico', 'cliente') decodificado desde el JWT token en AuthService.
 * Es la contraparte en el Frontend del control de permisos del Backend (TK010).
 */
@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    // 1. Verificar sesión activa, si no está autenticado redirigir a login
    if (!this.authService.isAuthenticated()) {
      return this.router.createUrlTree(['/autenticacion']);
    }

    // 2. Leer el rol del usuario autenticado desde el JWT decodificado
    const userRole = this.authService.getUserRole();
    if (!userRole) {
      console.warn('RoleGuard: No se encontró un rol válido (admin, tecnico, cliente) en el JWT.');
      return this.router.createUrlTree(['/acceso-denegado']);
    }

    // 3. Obtener roles permitidos en la configuración de la ruta data: { roles: [...] }
    const expectedRoles = (route.data?.['roles'] as Array<'admin' | 'tecnico' | 'cliente'>) || [];

    // 4. Criterio estricto: El rol "Cliente" solo puede navegar hacia el Portal del Cliente, nunca hacia vistas administrativas
    if (userRole === 'cliente') {
      const pathSegments = route.url ? route.url.map(s => s.path.toLowerCase()) : [];
      const isAdministrative = pathSegments.some(path =>
        ['admin', 'ordenes', 'clientes', 'gestion', 'configuracion'].includes(path)
      );

      if (isAdministrative || (expectedRoles.length > 0 && !expectedRoles.includes('cliente'))) {
        console.warn('RoleGuard: Bloqueo de seguridad. El rol Cliente no puede acceder a vistas administrativas.');
        return this.router.createUrlTree(['/acceso-denegado']);
      }
    }

    // 5. Verificación general de coincidencia del rol actual con los permitidos
    if (expectedRoles.length > 0 && !expectedRoles.includes(userRole)) {
      console.warn(`RoleGuard: Acceso denegado. Rol "${userRole}" no autorizado en esta ruta. Permitidos:`, expectedRoles);
      return this.router.createUrlTree(['/acceso-denegado']);
    }

    return true;
  }
}

export const roleGuardFn: CanActivateFn = (route, state) => {
  return inject(RoleGuard).canActivate(route, state);
};
