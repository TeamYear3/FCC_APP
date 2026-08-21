import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ConfiguracionPerfilModalComponent } from './configuracion-perfil-modal.component';
import { AuthService } from '../../core/auth/auth.service';
import { of, throwError } from 'rxjs';

describe('ConfiguracionPerfilModalComponent', () => {
  let component: ConfiguracionPerfilModalComponent;
  let fixture: ComponentFixture<ConfiguracionPerfilModalComponent>;
  let authServiceMock: any;

  beforeEach(async () => {
    authServiceMock = {
      obtenerPerfil: vi.fn().mockReturnValue(of({
        id: 'user-admin-1',
        email: 'admin@taller.com',
        nombre: 'Laura',
        apellido: 'Zárate',
        rol: 'admin',
        telefono: '351123456'
      })),
      actualizarPerfil: vi.fn().mockReturnValue(of({
        id: 'user-admin-1',
        email: 'admin@taller.com',
        nombre: 'Laura María',
        apellido: 'Zárate',
        rol: 'admin',
        telefono: '351123456'
      }))
    };

    await TestBed.configureTestingModule({
      imports: [ConfiguracionPerfilModalComponent, HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfiguracionPerfilModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente y cargar el perfil del administrador', () => {
    expect(component).toBeTruthy();
    expect(authServiceMock.obtenerPerfil).toHaveBeenCalled();
    expect(component.perfilForm.get('nombre')?.value).toBe('Laura');
    expect(component.perfilForm.get('email')?.value).toBe('admin@taller.com');
  });

  it('debe conmutar entre las pestañas personales y seguridad', () => {
    expect(component.tabActivo()).toBe('personales');

    component.cambiarTab('seguridad');
    expect(component.tabActivo()).toBe('seguridad');
  });

  it('debe requerir contraseña actual si se modifica el correo electrónico', () => {
    component.perfilForm.patchValue({ email: 'nuevo_admin@taller.com' });
    component.guardarCambios();

    expect(component.mensajeError()).toContain('Debes ingresar tu contraseña actual');
    expect(authServiceMock.actualizarPerfil).not.toHaveBeenCalled();
  });

  it('debe enviar la actualización de perfil cuando los datos son válidos', () => {
    component.perfilForm.patchValue({ nombre: 'Laura María' });
    component.guardarCambios();

    expect(authServiceMock.actualizarPerfil).toHaveBeenCalledWith({
      nombre: 'Laura María',
      apellido: 'Zárate',
      email: 'admin@taller.com',
      telefono: '351123456'
    });
    expect(component.mensajeExito()).toContain('¡Perfil actualizado con éxito!');
  });
});
