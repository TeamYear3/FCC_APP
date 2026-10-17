import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotFoundComponent } from './not-found.component';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('NotFoundComponent', () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;
  let routerSpy: { navigate: any };
  let authServiceSpy: { userRoleSignal: any; logout: any };

  beforeEach(async () => {
    routerSpy = { navigate: vi.fn() };
    authServiceSpy = {
      userRoleSignal: signal<string | null>('admin'),
      logout: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe navegar al dashboard administrativo si el usuario es admin', () => {
    component.goHome();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  it('debe navegar al portal cliente si el usuario es cliente', () => {
    authServiceSpy.userRoleSignal.set('cliente');
    component.goHome();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/portal-cliente']);
  });

  it('debe cerrar sesion y redirigir a autenticacion en logout()', () => {
    component.logout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/autenticacion']);
  });
});
