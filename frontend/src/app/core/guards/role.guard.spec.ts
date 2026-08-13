import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlSegment } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { RoleGuard } from './role.guard';
import { AuthService } from '../auth/auth.service';

describe('RoleGuard', () => {
  let guard: RoleGuard;
  let authService: { isAuthenticated: ReturnType<typeof vi.fn>; getUserRole: ReturnType<typeof vi.fn> };
  let router: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const authSpy = { isAuthenticated: vi.fn(), getUserRole: vi.fn() };
    const routerSpy = { createUrlTree: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RoleGuard,
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(RoleGuard);
    authService = TestBed.inject(AuthService) as any;
    router = TestBed.inject(Router) as any;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should redirect to /autenticacion if user is not authenticated', () => {
    authService.isAuthenticated.mockReturnValue(false);
    const mockUrlTree = {} as any;
    router.createUrlTree.mockReturnValue(mockUrlTree);

    const route = { data: { roles: ['admin'] }, url: [] } as unknown as ActivatedRouteSnapshot;
    const result = guard.canActivate(route, {} as RouterStateSnapshot);

    expect(router.createUrlTree).toHaveBeenCalledWith(['/autenticacion']);
    expect(result).toBe(mockUrlTree);
  });

  it('should allow access if user has one of the required roles (admin accessing admin view)', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.getUserRole.mockReturnValue('admin');

    const route = {
      data: { roles: ['admin', 'tecnico'] },
      url: [new UrlSegment('admin', {})]
    } as unknown as ActivatedRouteSnapshot;

    const result = guard.canActivate(route, {} as RouterStateSnapshot);
    expect(result).toBe(true);
  });

  it('should redirect to /no-autorizado if user role does not match expected roles', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.getUserRole.mockReturnValue('tecnico');
    const mockUrlTree = {} as any;
    router.createUrlTree.mockReturnValue(mockUrlTree);

    const route = {
      data: { roles: ['admin'] },
      url: [new UrlSegment('admin', {})]
    } as unknown as ActivatedRouteSnapshot;

    const result = guard.canActivate(route, {} as RouterStateSnapshot);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/acceso-denegado']);
    expect(result).toBe(mockUrlTree);
  });

  it('should prevent "cliente" role from navigating to administrative views strictly and redirect to /no-autorizado', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.getUserRole.mockReturnValue('cliente');
    const mockUrlTree = {} as any;
    router.createUrlTree.mockReturnValue(mockUrlTree);

    const route = {
      data: { roles: ['admin', 'tecnico'] },
      url: [new UrlSegment('ordenes', {})]
    } as unknown as ActivatedRouteSnapshot;

    const result = guard.canActivate(route, {} as RouterStateSnapshot);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/acceso-denegado']);
    expect(result).toBe(mockUrlTree);
  });

  it('should allow "cliente" role to access portal-cliente when roles permit', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.getUserRole.mockReturnValue('cliente');

    const route = {
      data: { roles: ['cliente', 'tecnico', 'admin'] },
      url: [new UrlSegment('portal-cliente', {})]
    } as unknown as ActivatedRouteSnapshot;

    const result = guard.canActivate(route, {} as RouterStateSnapshot);
    expect(result).toBe(true);
  });
});
