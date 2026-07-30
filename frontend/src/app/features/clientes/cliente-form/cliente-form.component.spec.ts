import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClienteFormComponent } from './cliente-form.component';
import { ClienteService } from '../../../core/services/cliente.service';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

describe('ClienteFormComponent', () => {
  let component: ClienteFormComponent;
  let fixture: ComponentFixture<ClienteFormComponent>;
  let clienteServiceSpy: { crearCliente: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    clienteServiceSpy = { crearCliente: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ClienteFormComponent],
      providers: [
        provideRouter([{ path: 'clientes', redirectTo: '' }]),
        { provide: ClienteService, useValue: clienteServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente y el formulario inicialmente inválido', () => {
    expect(component).toBeTruthy();
    expect(component.clienteForm.valid).toBe(false);
  });

  it('debe validar que el formato de DNI requiera de 7 a 8 dígitos numéricos exactos', () => {
    const dniControl = component.clienteForm.get('dni_cuit');
    
    // DNI inválido por longitud
    dniControl?.setValue('123456');
    expect(dniControl?.valid).toBe(false);
    expect(dniControl?.errors?.['pattern']).toBeTruthy();

    // DNI inválido por letras
    dniControl?.setValue('1234567A');
    expect(dniControl?.valid).toBe(false);

    // DNI válido
    dniControl?.setValue('30123456');
    expect(dniControl?.valid).toBe(true);
  });

  it('debe alternar la validación y exigir el formato XX-XXXXXXXX-X cuando se selecciona CUIT', () => {
    const tipoControl = component.clienteForm.get('tipo_documento');
    const dniCuitControl = component.clienteForm.get('dni_cuit');

    tipoControl?.setValue('CUIT');
    
    // CUIT sin guiones debe ser inválido
    dniCuitControl?.setValue('20301234569');
    expect(dniCuitControl?.valid).toBe(false);
    expect(dniCuitControl?.errors?.['pattern']).toBeTruthy();

    // CUIT con guiones oficial debe ser válido
    dniCuitControl?.setValue('20-30123456-9');
    expect(dniCuitControl?.valid).toBe(true);
  });

  it('debe llamar a ClienteService.crearCliente al enviar un formulario válido', () => {
    component.clienteForm.setValue({
      tipo_documento: 'DNI',
      dni_cuit: '30111222',
      nombre: 'Carlos',
      apellido: 'Rodríguez',
      condicion_iva: 'CF',
      telefono: '11223344',
      domicilio: 'Av. Mitre 500'
    });

    clienteServiceSpy.crearCliente.mockReturnValue(of({
      id: 'uuid-123',
      ...component.clienteForm.value,
      creado_en: '2026-07-21T12:00:00Z',
      actualizado_en: '2026-07-21T12:00:00Z'
    }));

    component.onSubmit();

    expect(clienteServiceSpy.crearCliente).toHaveBeenCalledWith(component.clienteForm.value);
    expect(component.isSubmitting()).toBe(false);
  });

  it('debe capturar error del servicio y mostrar mensaje descriptivo en errorMessage', () => {
    component.clienteForm.setValue({
      tipo_documento: 'DNI',
      dni_cuit: '87654321',
      nombre: 'Duplicado',
      apellido: 'Test',
      condicion_iva: 'CF',
      telefono: '',
      domicilio: ''
    });

    clienteServiceSpy.crearCliente.mockReturnValue(throwError(() => ({
      error: { dni_cuit: ['Ya existe un cliente con este número de documento.'] }
    })));

    component.onSubmit();

    expect(component.clienteForm.get('dni_cuit')?.errors?.['serverError']).toBe('Ya existe un cliente con este número de documento.');
    expect(component.errorMessage()).toBeNull();
    expect(component.isSubmitting()).toBe(false);
  });
});
