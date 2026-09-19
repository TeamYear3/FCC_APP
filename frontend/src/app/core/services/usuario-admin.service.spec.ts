import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UsuarioAdminService, UsuariosAdminResponse } from './usuario-admin.service';
import { environment } from '../../../environments/environment';

describe('UsuarioAdminService', () => {
  let service: UsuarioAdminService;
  let httpMock: HttpTestingController;

  const mockResponse: UsuariosAdminResponse = {
    metricas: {
      total_usuarios: 2,
      administradores_count: 1,
      tecnicos_count: 1,
      clientes_count: 0,
      activos_count: 2
    },
    usuarios: [
      {
        id: '1',
        email: 'admin@taller.com',
        nombre: 'Admin',
        apellido: 'Taller',
        nombre_completo: 'Admin Taller',
        rol: 'admin',
        is_active: true,
        last_login: null,
        creado_en: '2026-01-01T00:00:00Z'
      },
      {
        id: '2',
        email: 'tecnico@taller.com',
        nombre: 'Mecanico',
        apellido: 'Jefe',
        nombre_completo: 'Mecanico Jefe',
        rol: 'tecnico',
        is_active: true,
        last_login: null,
        creado_en: '2026-01-02T00:00:00Z'
      }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UsuarioAdminService]
    });
    service = TestBed.inject(UsuarioAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente el servicio', () => {
    expect(service).toBeTruthy();
  });

  it('debe consultar la lista de usuarios y métricas vía GET', () => {
    service.obtenerUsuariosAdmin().subscribe((res) => {
      expect(res.metricas.total_usuarios).toBe(2);
      expect(res.usuarios.length).toBe(2);
      expect(res.usuarios[0].email).toBe('admin@taller.com');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/usuarios/`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});
