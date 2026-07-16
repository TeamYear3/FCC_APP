import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService, GoogleCredentialResponse } from './auth.service';

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

    const req = httpTestingController.expectOne('http://localhost:8000/api/auth/google/');
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
});
