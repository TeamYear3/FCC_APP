import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AutenticacionComponent } from './autenticacion.component';
import { AuthService } from '../../core/auth/auth.service';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('AutenticacionComponent', () => {
  let component: AutenticacionComponent;
  let fixture: ComponentFixture<AutenticacionComponent>;
  let mockAuthService: {
    initializeGoogleAuth: unknown;
    loginWithGoogle: unknown;
    idToken$: unknown;
    authErrorSignal: unknown;
  };

  beforeEach(async () => {
    mockAuthService = {
      initializeGoogleAuth: vi.fn().mockResolvedValue(undefined),
      loginWithGoogle: vi.fn(),
      idToken$: of('mock-id-token'),
      authErrorSignal: signal<string | null>(null)
    };

    await TestBed.configureTestingModule({
      imports: [AutenticacionComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AutenticacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call loginWithGoogle on service when onGoogleLogin is triggered', () => {
    component.onGoogleLogin();
    expect(mockAuthService.loginWithGoogle).toHaveBeenCalled();
  });
});
