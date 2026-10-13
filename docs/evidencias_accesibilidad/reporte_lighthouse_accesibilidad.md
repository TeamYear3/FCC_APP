# Evidencia de accesibilidad Lighthouse — ACC-02

**Ticket:** TK233 (#294)
**Alcance:** capturar cuatro vistas de la aplicación y conservar los resultados reales de Lighthouse.
**Estado:** pendiente de ejecución e integración de los Page Objects de TK216 (#277).

## Estado por vista

| Vista | Ruta | Captura | Informe Lighthouse | Puntaje | Estado |
|---|---|---|---|---:|---|
| Ingreso | `/autenticacion` | Pendiente | Pendiente | Pendiente | Pendiente |
| Portal del cliente | `/portal-cliente` | Pendiente | Pendiente | Pendiente | Pendiente |
| Gestión de clientes | `/admin/clientes` | Pendiente | Pendiente | Pendiente | Pendiente |
| Órdenes de trabajo | `/admin/ordenes` | Pendiente | Pendiente | Pendiente | Pendiente |

La prueba de Playwright de esta PR toma capturas cuando cada vista está visible. La captura no mide el puntaje de Lighthouse. Debe ejecutarse Lighthouse por separado sobre cada ruta y guardar los reportes HTML originales antes de completar esta tabla.

No hay resultados medidos adjuntos en esta rama. Registrar aquí la fecha, la versión de Lighthouse, el puntaje y los hallazgos después de ejecutar la auditoría. No marcar los casos como aprobados hasta contar con esos archivos y una ejecución reproducible.

## Ejecución

Esta prueba depende de `LoginPage`, `PortalClientePage`, `ClientesPage` y `OrdenesPage`, añadidos por TK216 (#277). Integrar la prueba con esa base y ejecutar desde `frontend`:

```powershell
npm run test:e2e -- e2e/tests/capture-screenshots.spec.ts
```

Después, ejecutar Lighthouse para cada vista sobre la aplicación levantada y archivar las capturas y reportes reales en este directorio.
