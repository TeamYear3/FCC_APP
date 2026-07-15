import { TestBed } from '@angular/core/testing';
import { AuthService, GoogleCredentialResponse } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should capture ID Token successfully when handleCredentialResponse is called', () => {
    const mockResponse: GoogleCredentialResponse = {
      credential: 'mock-jwt-id-token-xyz123'
    };

    service.handleCredentialResponse(mockResponse);

    expect(service.idTokenSignal()).toBe('mock-jwt-id-token-xyz123');
    let capturedToken: string | null = null;
    service.idToken$.subscribe(token => capturedToken = token);
    expect(capturedToken).toBe('mock-jwt-id-token-xyz123');
  });
});
