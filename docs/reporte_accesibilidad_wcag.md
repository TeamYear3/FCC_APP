# Informe de auditoría automatizada de accesibilidad (ACC-01)

**Ticket:** TK216 · #277
**Alcance:** pruebas automatizadas con axe-core sobre las vistas de autenticación, portal del cliente, clientes y órdenes.
**Fecha de ejecución:** 13 de octubre de 2026
**Navegador:** Chromium · Playwright 1.64.0 · `@axe-core/playwright` 4.13.0

## Ejecución reproducible

Se compiló el código de esta rama con `npm run build`. La compilación terminó correctamente; Angular informó que el CSS de `presupuesto-form` supera el presupuesto configurado en 397 bytes (4.40 kB frente al máximo de 4.00 kB).

La suite se ejecutó con `CI=1 npm run test:a11y -- --workers=1 --reporter=line`. Resultado: **5 pruebas aprobadas en 29.4 s**. En esta ejecución, los cinco tests terminaron con cero violaciones `critical` y `serious` según sus aserciones. Los tests de axe aplicaron las etiquetas WCAG 2.0, 2.1 y 2.2 A/AA.

La instalación limpia con `npm ci` no finalizó en este entorno. Para compilar y ejecutar, se usó el árbol de dependencias ya instalado en el checkout del proyecto, con Angular CLI 21.2.19, Angular Common 21.2.18, Playwright 1.64.0 y axe-core Playwright 4.13.0. El código fuente probado sí corresponde a esta rama.

## Resultados automatizados

| Caso | Vista | Ruta | Resultado observado |
|---|---|---|---|
| `TC-ACC-01` | Ingreso y autenticación | `/autenticacion` | PASS; cero violaciones `critical`/`serious` |
| `TC-ACC-02` | Portal del cliente | `/portal-cliente` | PASS; cero violaciones `critical`/`serious` |
| `TC-ACC-03` | Gestión de clientes | `/admin/clientes` | PASS; cero violaciones `critical`/`serious` |
| `TC-ACC-04` | Órdenes de trabajo | `/admin/ordenes` | PASS; cero violaciones `critical`/`serious` |
| `TC-ACC-05` | Nombres accesibles en controles de autenticación | `/autenticacion` | PASS; los controles consultados fueron visibles por rol y nombre accesible |

## Validaciones pendientes

Esta suite no ejecuta Google Lighthouse ni reemplaza una revisión manual. No se registran puntajes de Lighthouse ni resultados de teclado, contraste, ampliación, reflow o lector de pantalla en este informe. Esas verificaciones requieren sus propios procedimientos y evidencias; el recorrido de voz con NVDA debe registrarse tras una sesión manual.

El resultado de axe es una comprobación automatizada acotada a estas vistas y reglas. No demuestra por sí solo el cumplimiento integral de WCAG 2.2 AA.
