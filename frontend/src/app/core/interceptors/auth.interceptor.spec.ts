import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { authInterceptorFn, resetAuthInterceptorFnState } from './auth.interceptor';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../services/toast.service';

describe('AuthInterceptor (Functional)', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let authServiceSpy: { getToken: ReturnType<typeof vi.fn>; refreshToken: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };
  let toastServiceSpy: { mostrarError: ReturnType<typeof vi.fn> };
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    resetAuthInterceptorFnState();
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

    TestBed.resetTestingModule();
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

  it('debe ejecutar una única llamada a refreshToken() ante múltiples peticiones concurrentes con 401 y reintentarlas con el nuevo token', () => {
    authServiceSpy.getToken.mockReturnValue('token-viejo-expirado');
    const refreshSubject = new Subject<string | null>();
    authServiceSpy.refreshToken.mockReturnValue(refreshSubject.asObservable());

    const results: string[] = [];

    httpClient.get<{ name: string }>('/api/v1/clientes/').subscribe(res => results.push(res.name));
    httpClient.get<{ name: string }>('/api/v1/vehiculos/').subscribe(res => results.push(res.name));
    httpClient.get<{ name: string }>('/api/v1/ordenes/').subscribe(res => results.push(res.name));
    httpClient.get<{ name: string }>('/api/v1/turnos/').subscribe(res => results.push(res.name));

    // 4 peticiones iniciales
    const req1 = httpTestingController.expectOne('/api/v1/clientes/');
    const req2 = httpTestingController.expectOne('/api/v1/vehiculos/');
    const req3 = httpTestingController.expectOne('/api/v1/ordenes/');
    const req4 = httpTestingController.expectOne('/api/v1/turnos/');

    // Las 4 responden 401 simultáneamente
    req1.flush({ detail: 'Token expirado' }, { status: 401, statusText: 'Unauthorized' });
    req2.flush({ detail: 'Token expirado' }, { status: 401, statusText: 'Unauthorized' });
    req3.flush({ detail: 'Token expirado' }, { status: 401, statusText: 'Unauthorized' });
    req4.flush({ detail: 'Token expirado' }, { status: 401, statusText: 'Unauthorized' });

    // Verificamos que SOLO se llamó a refreshToken una única vez
    expect(authServiceSpy.refreshToken).toHaveBeenCalledTimes(1);

    // Emitimos el nuevo token desde el refresh
    refreshSubject.next('nuevo-access-token-999');
    refreshSubject.complete();

    // Las 4 peticiones se reintentan con el nuevo token
    const retry1 = httpTestingController.expectOne('/api/v1/clientes/');
    const retry2 = httpTestingController.expectOne('/api/v1/vehiculos/');
    const retry3 = httpTestingController.expectOne('/api/v1/ordenes/');
    const retry4 = httpTestingController.expectOne('/api/v1/turnos/');

    expect(retry1.request.headers.get('Authorization')).toBe('Bearer nuevo-access-token-999');
    expect(retry2.request.headers.get('Authorization')).toBe('Bearer nuevo-access-token-999');
    expect(retry3.request.headers.get('Authorization')).toBe('Bearer nuevo-access-token-999');
    expect(retry4.request.headers.get('Authorization')).toBe('Bearer nuevo-access-token-999');

    retry1.flush({ name: 'Clientes OK' });
    retry2.flush({ name: 'Vehiculos OK' });
    retry3.flush({ name: 'Ordenes OK' });
    retry4.flush({ name: 'Turnos OK' });

    expect(results).toEqual(['Clientes OK', 'Vehiculos OK', 'Ordenes OK', 'Turnos OK']);
    expect(authServiceSpy.logout).not.toHaveBeenCalled();
  });
});


