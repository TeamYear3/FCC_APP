import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { authInterceptorFn } from './auth.interceptor';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../services/toast.service';

describe('AuthInterceptor (Functional)', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let authServiceSpy: { getToken: ReturnType<typeof vi.fn>; refreshToken: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };
  let toastServiceSpy: { mostrarError: ReturnType<typeof vi.fn> };
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceSpy = {
      getToken: vi.fn(),
      refreshToken: vi.fn().mockReturnValue(of(null)),
      logout: vi.fn()
    };
    toastServiceSpy = {
      mostrarError: vi.fn()
    };
    routerSpy = {
      navigate: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptorFn])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should attach Authorization Bearer token header when token is available', () => {
    authServiceSpy.getToken.mockReturnValue('mock-jwt-token-abc');

    httpClient.get('/api/v1/usuarios/perfil/').subscribe();

    const req = httpTestingController.expectOne('/api/v1/usuarios/perfil/');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token-abc');
    req.flush({});
  });

  it('should not attach Authorization header when token is null', () => {
    authServiceSpy.getToken.mockReturnValue(null);

    httpClient.get('/api/v1/usuarios/perfil/').subscribe();

    const req = httpTestingController.expectOne('/api/v1/usuarios/perfil/');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('debe mostrar notificación Toast de error y redirigir a /autenticacion ante un error 401 no recuperable', () => {
    authServiceSpy.getToken.mockReturnValue('token-expirado');
    authServiceSpy.refreshToken.mockReturnValue(of(null));

    httpClient.get('/api/v1/ordenes/').subscribe({
      error: (err) => {
        expect(err.status).toBe(401);
      }
    });

    const req = httpTestingController.expectOne('/api/v1/ordenes/');
    req.flush({ detail: 'Token inválido' }, { status: 401, statusText: 'Unauthorized' });

    expect(toastServiceSpy.mostrarError).toHaveBeenCalledWith(
      'Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.'
    );
    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/autenticacion']);
  });
});

