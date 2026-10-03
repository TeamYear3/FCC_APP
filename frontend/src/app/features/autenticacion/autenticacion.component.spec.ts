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
    TestBed.resetTestingModule();

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

  it('should display error message when errorMessage signal is set', () => {
    component.errorMessage.set('Correo electrónico o contraseña incorrectos.');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Correo electrónico o contraseña incorrectos.');
  });

  describe('Password visibility toggles (TK139)', () => {
    it('should toggle login password visibility', () => {
      expect(component.showLoginPassword()).toBe(false);
      component.toggleLoginPassword();
      expect(component.showLoginPassword()).toBe(true);
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector('input[formControlName="password"]') as HTMLInputElement;
      expect(input.type).toBe('text');

      component.toggleLoginPassword();
      expect(component.showLoginPassword()).toBe(false);
      fixture.detectChanges();
      expect(input.type).toBe('password');
    });

    it('should toggle register password and confirmPassword visibility', () => {
      component.changeMode('registro');
      fixture.detectChanges();

      expect(component.showRegisterPassword()).toBe(false);
      expect(component.showRegisterConfirmPassword()).toBe(false);

      component.toggleRegisterPassword();
      component.toggleRegisterConfirmPassword();
      expect(component.showRegisterPassword()).toBe(true);
      expect(component.showRegisterConfirmPassword()).toBe(true);
      fixture.detectChanges();

      const passInput = fixture.nativeElement.querySelector('input[formControlName="password"]') as HTMLInputElement;
      const confirmInput = fixture.nativeElement.querySelector('input[formControlName="confirmPassword"]') as HTMLInputElement;
      expect(passInput.type).toBe('text');
      expect(confirmInput.type).toBe('text');
    });

    it('should toggle reset-confirm password visibility and reset state on mode change', () => {
      component.changeMode('reset-confirm');
      fixture.detectChanges();

      component.toggleResetPassword();
      component.toggleResetConfirmPassword();
      expect(component.showResetPassword()).toBe(true);
      expect(component.showResetConfirmPassword()).toBe(true);

      // Cambiar de modo debe reiniciar visibilidades a false
      component.changeMode('login');
      expect(component.showResetPassword()).toBe(false);
      expect(component.showResetConfirmPassword()).toBe(false);
      expect(component.showLoginPassword()).toBe(false);
    });
  });
});

