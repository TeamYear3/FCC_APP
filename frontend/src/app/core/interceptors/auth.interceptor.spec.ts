import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { authInterceptorFn } from './auth.interceptor';
import { AuthService } from '../auth/auth.service';

describe('AuthInterceptor (Functional)', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let authService: { getToken: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const authSpy = { getToken: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptorFn])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authSpy }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as any;
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should attach Authorization Bearer token header when token is available', () => {
    authService.getToken.mockReturnValue('mock-jwt-token-abc');

    httpClient.get('/api/v1/usuarios/perfil/').subscribe();

    const req = httpTestingController.expectOne('/api/v1/usuarios/perfil/');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token-abc');
    req.flush({});
  });

  it('should not attach Authorization header when token is null', () => {
    authService.getToken.mockReturnValue(null);

    httpClient.get('/api/v1/usuarios/perfil/').subscribe();

    const req = httpTestingController.expectOne('/api/v1/usuarios/perfil/');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
