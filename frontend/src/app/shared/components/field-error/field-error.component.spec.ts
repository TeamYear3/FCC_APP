import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { FieldErrorComponent } from './field-error.component';

describe('FieldErrorComponent', () => {
  let component: FieldErrorComponent;
  let fixture: ComponentFixture<FieldErrorComponent>;

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [FieldErrorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FieldErrorComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should not display anything when control is null or valid', () => {
    component.control = null;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('');

    const control = new FormControl('test@correo.com', [Validators.required]);
    component.control = control;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('should not display error if control has errors but is pristine and untouched', () => {
    const control = new FormControl('', [Validators.required]);
    component.control = control;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('should display required error when touched and invalid', () => {
    const control = new FormControl('', [Validators.required]);
    control.markAsTouched();
    component.control = control;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('Este campo es obligatorio.');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
  });

  it('should display required error with custom fieldLabel', () => {
    const control = new FormControl('', [Validators.required]);
    control.markAsTouched();
    component.control = control;
    component.fieldLabel = 'Correo';
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('El campo Correo es obligatorio.');
  });

  it('should display email error', () => {
    const control = new FormControl('invalido', [Validators.email]);
    control.markAsTouched();
    component.control = control;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('Ingresa un correo electrónico válido.');
  });

  it('should display minlength error with requiredLength', () => {
    const control = new FormControl('ab', [Validators.minLength(6)]);
    control.markAsTouched();
    component.control = control;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('Debe tener al menos 6 caracteres.');
  });

  it('should display maxlength error with requiredLength', () => {
    const control = new FormControl('12345678901', [Validators.maxLength(10)]);
    control.markAsTouched();
    component.control = control;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('No puede superar los 10 caracteres.');
  });

  it('should display pattern error', () => {
    const control = new FormControl('123', [Validators.pattern(/^[a-zA-Z]+$/)]);
    control.markAsTouched();
    component.control = control;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('El formato ingresado no es válido.');
  });

  it('should display mismatch error', () => {
    const control = new FormControl('');
    control.setErrors({ mismatch: true });
    control.markAsTouched();
    component.control = control;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('Las contraseñas no coinciden.');
  });

  it('should prioritize customMessages when provided', () => {
    const control = new FormControl('', [Validators.required]);
    control.markAsTouched();
    component.control = control;
    component.customMessages = {
      required: 'Por favor especifica tu número de documento.'
    };
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('Por favor especifica tu número de documento.');
  });

  it('should display direct string error if present in control errors', () => {
    const control = new FormControl('');
    control.setErrors({ backendError: 'La patente ya se encuentra registrada en el sistema.' });
    control.markAsDirty();
    component.control = control;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('La patente ya se encuentra registrada en el sistema.');
  });

  it('should render id attribute and aria-live="polite" when errorId input is provided (TK238)', () => {
    const control = new FormControl('', [Validators.required]);
    control.markAsTouched();
    component.control = control;
    component.errorId = 'error-nombre-cliente';
    fixture.detectChanges();

    const spanElement = fixture.nativeElement.querySelector('span');
    expect(spanElement).toBeTruthy();
    expect(spanElement.getAttribute('id')).toBe('error-nombre-cliente');
    expect(spanElement.getAttribute('role')).toBe('alert');
    expect(spanElement.getAttribute('aria-live')).toBe('polite');
  });
});
