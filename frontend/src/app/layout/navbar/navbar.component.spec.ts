import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../core/auth/auth.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { BusquedaService } from '../../core/services/busqueda.service';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('NavbarComponent (TK142 - Sticky Header & Navegación)', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let mockAuthService: any;
  let mockSidebarService: any;
  let mockBusquedaService: any;
  let mockRouter: any;

  beforeEach(async () => {
    TestBed.resetTestingModule();

    mockAuthService = {
      userRoleSignal: signal('admin'),
      getUserFromToken: vi.fn().mockReturnValue({
        nombre: 'Admin',
        apellido: 'Test',
        email: 'admin@fcc-taller.com',
      }),
      getDecodedToken: vi.fn().mockReturnValue({
        nombre: 'Admin',
        apellido: 'Test',
        email: 'admin@fcc-taller.com',
      }),
      logout: vi.fn(),
    };

    mockSidebarService = {
      isSidebarOpen: signal(false),
      toggleSidebar: vi.fn(),
      closeSidebar: vi.fn(),
    };

    mockBusquedaService = {
      buscarUniversal: vi.fn().mockReturnValue(
        of({
          clientes: [],
          vehiculos: [],
          ordenes: [],
        })
      ),
    };

    mockRouter = {
      navigate: vi.fn(),
      navigateByUrl: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: SidebarService, useValue: mockSidebarService },
        { provide: BusquedaService, useValue: mockBusquedaService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe contener las clases de posicionamiento sticky y z-40 en el header (TK142)', () => {
    const headerEl: HTMLElement = fixture.debugElement.query(By.css('header')).nativeElement;
    expect(headerEl.classList.contains('sticky')).toBe(true);
    expect(headerEl.classList.contains('top-0')).toBe(true);
    expect(headerEl.classList.contains('z-40')).toBe(true);
  });

  it('debe invocar toggleSidebar al hacer clic en el boton hamburguesa movil', () => {
    const btnHamburguesa = fixture.debugElement.query(By.css('button[aria-label="Abrir navegación lateral"]'));
    expect(btnHamburguesa).toBeTruthy();
    btnHamburguesa.triggerEventHandler('click', new MouseEvent('click'));
    expect(mockSidebarService.toggleSidebar).toHaveBeenCalled();
  });

  it('debe cerrar sesion y redirigir a /autenticacion al llamar a logout()', () => {
    component.logout();
    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/autenticacion']);
  });
});
