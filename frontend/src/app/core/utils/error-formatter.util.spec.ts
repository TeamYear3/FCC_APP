import { extractApiErrorMessage } from './error-formatter.util';

describe('extractApiErrorMessage', () => {
  it('should return fallback message when error is null or undefined', () => {
    expect(extractApiErrorMessage(null)).toBe('Ha ocurrido un error al procesar la solicitud.');
    expect(extractApiErrorMessage(undefined, 'Fallback custom.')).toBe('Fallback custom.');
  });

  it('should return plain string error with trailing period', () => {
    expect(extractApiErrorMessage('Error de conexión')).toBe('Error de conexión.');
    expect(extractApiErrorMessage('Error ya puntuado.')).toBe('Error ya puntuado.');
  });

  it('should extract detail string from DRF error object', () => {
    const error = {
      error: {
        detail: 'No tienes permisos para realizar esta acción'
      }
    };
    expect(extractApiErrorMessage(error)).toBe('No tienes permisos para realizar esta acción.');
  });

  it('should translate SimpleJWT invalid credentials in detail', () => {
    const error = {
      error: {
        detail: 'No active account found with the given credentials'
      }
    };
    expect(extractApiErrorMessage(error)).toBe('Correo electrónico o contraseña incorrectos.');
  });

  it('should normalize DRF field error dictionary with arrays', () => {
    const error = {
      error: {
        dni_cuit: ['Ya existe un cliente con este número de documento.'],
        email: ['Ingresa un correo electrónico válido.']
      }
    };
    const result = extractApiErrorMessage(error);
    expect(result).toContain('Ya existe un cliente con este número de documento.');
    expect(result).toContain('Ingresa un correo electrónico válido.');
    expect(result).not.toContain('[');
    expect(result).not.toContain(']');
  });

  it('should handle non_field_errors array', () => {
    const error = {
      error: {
        non_field_errors: ['El taller no atiende domingos.']
      }
    };
    expect(extractApiErrorMessage(error)).toBe('El taller no atiende domingos.');
  });

  it('should handle direct array of string errors', () => {
    const error = ['Error A', 'Error B'];
    expect(extractApiErrorMessage(error)).toBe('Error A. Error B.');
  });
});
