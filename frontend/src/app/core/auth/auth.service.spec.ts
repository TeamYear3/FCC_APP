import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService, GoogleCredentialResponse } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpTestingController: HttpTestingController;
  let routerSpy: { navigate: ReturnType<typeof vi.fn>; createUrlTree: ReturnType<typeof vi.fn> };

  // Helper para generar un JWT falso con un payload dado
  function generateMockJwt(payload: Record<string, any>): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    const signature = 'mock-signature';
    return `${header}.${body}.${signature}`;
  }

  beforeEach(() => {
    localStorage.clear();
    routerSpy = { navigate: vi.fn(), createUrlTree: vi.fn() };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy }
      ]
    });
    service = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should capture ID Token successfully when handleCredentialResponse is called', () => {
    const mockResponse: GoogleCredentialResponse = {
      credential: 'mock-jwt-id-token-xyz123'
    };

    service.handleCredentialResponse(mockResponse);

    const req = httpTestingController.expectOne(`${environment.apiUrl}/auth/google/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ id_token: 'mock-jwt-id-token-xyz123' });
    req.flush({ access: 'mock-jwt-id-token-xyz123', refresh: 'mock-refresh' });

    expect(service.idTokenSignal()).toBe('mock-jwt-id-token-xyz123');
    let capturedToken: string | null = null;
    service.idToken$.subscribe(token => capturedToken = token);
    expect(capturedToken).toBe('mock-jwt-id-token-xyz123');
  });

  it('should decode JWT token and extract role accurately (admin, tecnico, cliente)', () => {
    const adminToken = generateMockJwt({ sub: '123', email: 'admin@fcc.com', rol: 'admin' });
    service.setToken(adminToken);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.getUserRole()).toBe('admin');
    expect(service.getDecodedToken()?.['email']).toBe('admin@fcc.com');

    const tecnicoToken = generateMockJwt({ sub: '456', email: 'tecnico@fcc.com', role: 'tecnico' });
    service.setToken(tecnicoToken);
    expect(service.getUserRole()).toBe('tecnico');

    const clienteToken = generateMockJwt({ sub: '789', email: 'cliente@fcc.com', user_role: 'cliente' });
    service.setToken(clienteToken);
    expect(service.getUserRole()).toBe('cliente');
  });

  it('should clear token and state on logout', () => {
    const token = generateMockJwt({ sub: '1', rol: 'cliente' });
    service.setToken(token);
    expect(service.isAuthenticated()).toBe(true);

    service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.getToken()).toBeNull();
    expect(service.getUserRole()).toBeNull();
  });

  it('should return null in refreshToken() if no refresh token is stored in localStorage', () => {
    let resultToken: string | null = 'not-null';
    service.refreshToken().subscribe(token => {
      resultToken = token;
    });

    expect(resultToken).toBeNull();
    httpTestingController.expectNone(`${environment.apiUrl}/auth/token/refresh/`);
  });

  it('should refresh tokens and persist both access and rotated refresh token in localStorage', () => {
    localStorage.setItem('fcc_refresh_token', 'initial-refresh-token-123');
    const newAccessToken = generateMockJwt({ sub: '100', email: 'kary@fcc.com', rol: 'admin' });
    const rotatedRefreshToken = 'rotated-refresh-token-456';

    let emittedToken: string | null = null;
    service.refreshToken().subscribe(token => {
      emittedToken = token;
    });

    const req = httpTestingController.expectOne(`${environment.apiUrl}/auth/token/refresh/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refresh: 'initial-refresh-token-123' });

    req.flush({ access: newAccessToken, refresh: rotatedRefreshToken });

    expect(emittedToken).toBe(newAccessToken);
    expect(service.getToken()).toBe(newAccessToken);
    expect(localStorage.getItem('fcc_auth_token')).toBe(newAccessToken);
    expect(localStorage.getItem('fcc_refresh_token')).toBe(rotatedRefreshToken);
  });

  it('should not send HTTP request to backend when logout(false) is called', () => {
    localStorage.setItem('fcc_auth_token', 'mock-token');
    localStorage.setItem('fcc_refresh_token', 'mock-refresh');

    service.logout(false);

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('fcc_refresh_token')).toBeNull();
    expect(localStorage.getItem('fcc_auth_token')).toBeNull();
    httpTestingController.expectNone(`${environment.apiUrl}/auth/logout/`);
  });

  it('should logout silently without calling backend when refresh fails with 401', () => {
    localStorage.setItem('fcc_refresh_token', 'invalid-or-blacklisted-token');

    let emittedToken: string | null = 'waiting';
    service.refreshToken().subscribe(token => {
      emittedToken = token;
    });

    const req = httpTestingController.expectOne(`${environment.apiUrl}/auth/token/refresh/`);
    req.flush({ detail: 'Token is blacklisted' }, { status: 401, statusText: 'Unauthorized' });

    // Verificar que NO se disparó ninguna petición a /auth/logout/
    httpTestingController.expectNone(`${environment.apiUrl}/auth/logout/`);

    expect(emittedToken).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/autenticacion']);
  });

  describe('Google Auth SDK Initialization (TK135)', () => {
    it('should initialize Google GIS client with client_id when window.google is present', async () => {
      const initializeSpy = vi.fn();
      (window as any).google = {
        accounts: {
          id: {
            initialize: initializeSpy,
            prompt: vi.fn(),
            renderButton: vi.fn(),
            disableAutoSelect: vi.fn(),
            revoke: vi.fn()
          }
        }
      };

      await service.initializeGoogleAuth();

      expect(initializeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: expect.any(String),
          auto_select: false,
          cancel_on_tap_outside: true
        })
      );
      expect(service.isSdkInitialized()).toBe(true);

      delete (window as any).google;
    });

    it('should handle missing client_id gracefully without throwing unhandled exceptions', async () => {
      const originalClientId = environment.googleClientId;
      (environment as any).googleClientId = '';
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      (window as any).google = {
        accounts: {
          id: {
            initialize: vi.fn(),
            prompt: vi.fn()
          }
        }
      };

      await service.initializeGoogleAuth();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Google Client ID no configurado'));
      expect(service.isSdkInitialized()).toBe(false);

      warnSpy.mockRestore();
      (environment as any).googleClientId = originalClientId;
      delete (window as any).google;
    });

    it('should not re-initialize Google GIS SDK when initializeGoogleAuth is called multiple times (TK136)', async () => {
      const initializeSpy = vi.fn();
      (window as any).google = {
        accounts: {
          id: {
            initialize: initializeSpy,
            prompt: vi.fn(),
            renderButton: vi.fn(),
            disableAutoSelect: vi.fn(),
            revoke: vi.fn()
          }
        }
      };

      await service.initializeGoogleAuth();
      expect(initializeSpy).toHaveBeenCalledTimes(1);

      // Segunda llamada
      await service.initializeGoogleAuth();
      expect(initializeSpy).toHaveBeenCalledTimes(1);

      delete (window as any).google;
    });

    it('should call renderButton on Google SDK with element and options (TK136)', () => {
      const renderButtonSpy = vi.fn();
      (window as any).google = {
        accounts: {
          id: {
            initialize: vi.fn(),
            prompt: vi.fn(),
            renderButton: renderButtonSpy,
            disableAutoSelect: vi.fn(),
            revoke: vi.fn()
          }
        }
      };

      service.isSdkInitialized.set(true);
      const dummyDiv = document.createElement('div');
      service.renderButton(dummyDiv, { theme: 'outline', size: 'large' });

      expect(renderButtonSpy).toHaveBeenCalledWith(dummyDiv, { theme: 'outline', size: 'large' });

      delete (window as any).google;
    });
  });
});


