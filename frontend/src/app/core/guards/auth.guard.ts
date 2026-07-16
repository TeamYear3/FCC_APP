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
 * AuthGuard verifica la existencia de una sesión activa (token JWT disponible en AuthService).
 * En caso de no existir sesión, redirige automáticamente al usuario a /autenticacion (o /login).
 * Coexiste y complementa la seguridad con RoleGuard en el módulo core/.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    if (this.authService.isAuthenticated()) {
      return true;
    }
    return this.router.createUrlTree(['/autenticacion']);
  }
}

export const authGuardFn: CanActivateFn = (route, state) => {
  return inject(AuthGuard).canActivate(route, state);
};
