import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-field-error',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (errorMessage) {
      <span class="text-xs text-red-400 mt-1 block font-medium animate-fadeIn" role="alert">
        {{ errorMessage }}
      </span>
    }
  `
})
export class FieldErrorComponent {
  @Input({ required: true }) control!: AbstractControl | null;
  @Input() customMessages: Record<string, string> = {};
  @Input() fieldLabel?: string;

  get errorMessage(): string | null {
    if (!this.control || !this.control.errors || (!this.control.touched && !this.control.dirty)) {
      return null;
    }

    const errors = this.control.errors;

    for (const errorKey of Object.keys(errors)) {
      // 1. Prioridad a mensajes personalizados pasados por input
      if (this.customMessages && this.customMessages[errorKey]) {
        return this.customMessages[errorKey];
      }

      // 2. Mensajes estándar por defecto
      switch (errorKey) {
        case 'required':
          return this.fieldLabel
            ? `El campo ${this.fieldLabel} es obligatorio.`
            : 'Este campo es obligatorio.';
        case 'email':
          return 'Ingresa un correo electrónico válido.';
        case 'minlength': {
          const reqLen = errors['minlength']?.requiredLength || 0;
          return `Debe tener al menos ${reqLen} caracteres.`;
        }
        case 'maxlength': {
          const maxLen = errors['maxlength']?.requiredLength || 0;
          return `No puede superar los ${maxLen} caracteres.`;
        }
        case 'pattern':
          return 'El formato ingresado no es válido.';
        case 'mismatch':
          return 'Las contraseñas no coinciden.';
        default:
          if (typeof errors[errorKey] === 'string') {
            return errors[errorKey];
          }
          return 'El valor ingresado no es válido.';
      }
    }

    return null;
  }
}
