import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiagnosticoFotosComponent } from './diagnostico-fotos.component';
import { OrdenService } from '../../../core/services/orden.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('DiagnosticoFotosComponent', () => {
  let component: DiagnosticoFotosComponent;
  let fixture: ComponentFixture<DiagnosticoFotosComponent>;
  let ordenServiceSpy: {
    obtenerAdjuntosDiagnostico: ReturnType<typeof vi.fn>;
    subirAdjuntoDiagnostico: ReturnType<typeof vi.fn>;
    eliminarAdjuntoDiagnostico: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    ordenServiceSpy = {
      obtenerAdjuntosDiagnostico: vi.fn().mockReturnValue(of([
        {
          id: 'adj-1',
          orden_trabajo: 'ot-123',
          url_secure: 'http://localhost:8000/media/diagnosticos/test1.jpg',
          public_id: 'diagnosticos/test1.jpg',
          nombre_archivo: 'fosa.jpg',
          tamanio: 2048,
          mime_type: 'image/jpeg',
          creado_en: '2026-08-14T12:00:00Z'
        }
      ])),
      subirAdjuntoDiagnostico: vi.fn().mockReturnValue(of({
        id: 'adj-2',
        orden_trabajo: 'ot-123',
        url_secure: 'http://localhost:8000/media/diagnosticos/test2.jpg',
        public_id: 'diagnosticos/test2.jpg',
        nombre_archivo: 'nueva.jpg',
        tamanio: 1024,
        mime_type: 'image/jpeg',
        creado_en: '2026-08-14T12:05:00Z'
      })),
      eliminarAdjuntoDiagnostico: vi.fn().mockReturnValue(of(void 0))
    };

    await TestBed.configureTestingModule({
      imports: [DiagnosticoFotosComponent],
      providers: [
        { provide: OrdenService, useValue: ordenServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DiagnosticoFotosComponent);
    component = fixture.componentInstance;
    component.ordenId = 'ot-123';
    fixture.detectChanges();
  });

  it('debe crear el componente y cargar la lista de fotos de diagnóstico', () => {
    expect(component).toBeTruthy();
    expect(ordenServiceSpy.obtenerAdjuntosDiagnostico).toHaveBeenCalledWith('ot-123');
    expect(component.listaAdjuntos().length).toBe(1);
    expect(component.listaAdjuntos()[0].nombre_archivo).toBe('fosa.jpg');
  });

  it('debe abrir y cerrar la vista previa de foto a tamaño completo', () => {
    const mockAdjunto = component.listaAdjuntos()[0];
    component.abrirFotoCompleta(mockAdjunto);
    expect(component.fotoSeleccionada()).toBe(mockAdjunto);

    component.cerrarModalFoto();
    expect(component.fotoSeleccionada()).toBeNull();
  });
});
