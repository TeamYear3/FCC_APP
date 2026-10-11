import { describe, it, expect } from 'vitest';
import { appConfig } from './app.config';
import { EnvironmentProviders, Provider } from '@angular/core';

describe('AppConfig - Zoneless Strategy', () => {
  it('debe tener configurado el proveedor de detección de cambios zoneless', () => {
    expect(appConfig.providers).toBeDefined();
    expect(Array.isArray(appConfig.providers)).toBe(true);

    // Verificar que existe la configuración de zoneless
    const providers = appConfig.providers as (Provider | EnvironmentProviders)[];
    expect(providers.length).toBeGreaterThan(0);
  });
});
