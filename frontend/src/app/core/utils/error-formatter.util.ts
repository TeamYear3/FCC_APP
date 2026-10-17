/**
 * Utilidad para normalizar y extraer mensajes de error legibles en español
 * desde respuestas HTTP devueltas por Django REST Framework (DRF).
 * Evita renderizar JSON crudo, arrays o estructuras anidadas al usuario final.
 */

export function extractApiErrorMessage(
  error: unknown,
  fallbackMessage: string = 'Ha ocurrido un error al procesar la solicitud.'
): string {
  if (!error) {
    return fallbackMessage;
  }

  // Si es un string directo
  if (typeof error === 'string') {
    return cleanErrorString(error, fallbackMessage);
  }

  // Si es un objeto de error (ej: HttpErrorResponse o payload parsed)
  if (typeof error === 'object') {
    const errObj = error as Record<string, any>;

    // 1. Extraer payload interno si viene encapsulado en error.error
    const payload = errObj['error'] !== undefined ? errObj['error'] : errObj;

    if (typeof payload === 'string') {
      return cleanErrorString(payload, fallbackMessage);
    }

    if (Array.isArray(payload)) {
      const messages = payload
        .map((item) => extractApiErrorMessage(item, '').replace(/\.+$/, ''))
        .filter(Boolean);
      return messages.length > 0 ? messages.join('. ') + '.' : fallbackMessage;
    }

    if (payload && typeof payload === 'object') {
      // 2. Revisar propiedades comunes de DRF / SimpleJWT
      if (payload['detail'] && typeof payload['detail'] === 'string') {
        return cleanErrorString(payload['detail'], fallbackMessage);
      }

      if (payload['error'] && typeof payload['error'] === 'string') {
        return cleanErrorString(payload['error'], fallbackMessage);
      }

      if (payload['message'] && typeof payload['message'] === 'string') {
        return cleanErrorString(payload['message'], fallbackMessage);
      }

      // 3. Revisar si es un diccionario de errores por campo de DRF: { campo: ["mensaje1", "mensaje2"] }
      const collectedMessages: string[] = [];

      for (const [key, val] of Object.entries(payload)) {
        if (key === 'code' || key === 'status_code') continue;

        if (Array.isArray(val)) {
          for (const subVal of val) {
            if (typeof subVal === 'string') {
              collectedMessages.push(cleanErrorString(subVal, '').replace(/\.+$/, ''));
            } else if (typeof subVal === 'object') {
              collectedMessages.push(extractApiErrorMessage(subVal, '').replace(/\.+$/, ''));
            }
          }
        } else if (typeof val === 'string') {
          collectedMessages.push(cleanErrorString(val, '').replace(/\.+$/, ''));
        } else if (typeof val === 'object' && val !== null) {
          collectedMessages.push(extractApiErrorMessage(val, '').replace(/\.+$/, ''));
        }
      }

      const validMessages = collectedMessages.filter((m) => m && m.trim().length > 0);
      if (validMessages.length > 0) {
        return validMessages.join('. ') + '.';
      }
    }
  }

  return fallbackMessage;
}

/**
 * Limpia y normaliza cadenas de error individuales eliminando caracteres
 * de serialización JSON o traduciendo mensajes estándar de SimpleJWT.
 */
function cleanErrorString(msg: string, fallback: string): string {
  if (!msg || typeof msg !== 'string') return fallback;

  let cleaned = msg.trim();

  // Eliminar corchetes o comillas exteriores accidentales
  cleaned = cleaned.replace(/^\[['"]|['"]\]$/g, '').trim();

  // Traducción defensiva de SimpleJWT
  if (
    cleaned.toLowerCase().includes('no active account') ||
    cleaned.toLowerCase().includes('given credentials') ||
    cleaned.toLowerCase().includes('invalid credentials')
  ) {
    return 'Correo electrónico o contraseña incorrectos.';
  }

  if (cleaned.toLowerCase().includes('token is blacklisted') || cleaned.toLowerCase().includes('token is invalid or expired')) {
    return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
  }

  // Asegurar puntuación final limpia
  if (cleaned.length > 0 && !cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
    cleaned += '.';
  }

  return cleaned || fallback;
}
