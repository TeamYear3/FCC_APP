import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AutenticacionComponent } from './autenticacion.component';
import { AuthService } from '../../core/auth/auth.service';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

describe('AutenticacionComponent', () => {
  let component: AutenticacionComponent;
  let fixture: ComponentFixture<AutenticacionComponent>;
  let mockAuthService: {
    initializeGoogleAuth: unknown;
    loginWithGoogle: unknown;
    idToken$: unknown;
    authErrorSignal: unknown;
    login: ReturnType<typeof vi.fn>;
    registro: ReturnType<typeof vi.fn>;
    requestPasswordReset: ReturnType<typeof vi.fn>;
    confirmPasswordReset: ReturnType<typeof vi.fn>;
    getUserRole: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();

    mockAuthService = {
      initializeGoogleAuth: vi.fn().mockResolvedValue(undefined),
      loginWithGoogle: vi.fn(),
      idToken$: of('mock-id-token'),
      authErrorSignal: signal<string | null>(null),
      login: vi.fn(),
      registro: vi.fn(),
      requestPasswordReset: vi.fn(),
      confirmPasswordReset: vi.fn(),
      getUserRole: vi.fn().mockReturnValue('cliente'),
    };

    await TestBed.configureTestingModule({
      imports: [AutenticacionComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        provideRouter([]),
      ],
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

  describe('Field validation and error messages (TK140 & TK141)', () => {
    it('should display required validation error when email is touched and empty', () => {
      const emailCtrl = component.loginForm.get('email');
      emailCtrl?.markAsTouched();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Este campo es obligatorio.');
    });

    it('should display invalid email message when malformed email is entered', () => {
      const emailCtrl = component.loginForm.get('email');
      emailCtrl?.setValue('not-an-email');
      emailCtrl?.markAsTouched();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Ingresa un correo electrónico válido.');
    });

    it('should display minlength error when password is too short in register form', () => {
      component.changeMode('registro');
      fixture.detectChanges();

      const passCtrl = component.registroForm.get('password');
      passCtrl?.setValue('123');
      passCtrl?.markAsTouched();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Debe tener al menos 6 caracteres.');
    });

    it('should extract and display API error message when login fails', () => {
      mockAuthService.login.mockReturnValue(
        throwError(() => ({
          error: { detail: 'No active account found with the given credentials' },
        }))
      );

      component.loginForm.setValue({ email: 'test@example.com', password: 'wrongpassword' });
      component.onLoginSubmit();
      fixture.detectChanges();

      expect(component.errorMessage()).toBe('Correo electrónico o contraseña incorrectos.');
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Correo electrónico o contraseña incorrectos.');
    });

    it('should extract and display normalized API field errors when registro fails', () => {
      mockAuthService.registro.mockReturnValue(
        throwError(() => ({
          error: { email: ['Ya existe un usuario registrado con este correo electrónico.'] },
        }))
      );

      component.changeMode('registro');
      component.registroForm.setValue({
        nombre: 'Juan',
        apellido: 'Perez',
        email: 'existente@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });

      component.onRegistroSubmit();
      fixture.detectChanges();

      expect(component.errorMessage()).toBe(
        'Ya existe un usuario registrado con este correo electrónico.',
      );
    });
  });
});


