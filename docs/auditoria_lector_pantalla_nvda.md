# Verificación de accesibilidad para lector de pantalla — ACC-05

**Ticket:** TK236 (#297)
**Capa:** E2E / accesibilidad
**Vista bajo evaluación:** Portal del Cliente
**Estado:** verificación pendiente de ejecución integrada y prueba manual con NVDA.

## Alcance de esta PR

La prueba de Playwright comprueba estructura semántica, nombres accesibles y texto de estado en la vista del Portal del Cliente. Estas aserciones revisan el DOM y el árbol accesible; no simulan la salida de voz de NVDA ni sustituyen una sesión manual con lector de pantalla.

La suite `frontend/e2e/tests/screen-reader-flow.spec.ts` depende del `PortalClientePage` agregado por TK216 (#277). Debe ejecutarse después de integrar esa PR en `develop`.

## Resultados automatizados

| Caso | Comprobación | Resultado observado |
|---|---|---|
| `TC-SR-01` | Encabezado principal y estructura semántica | Pendiente de ejecutar sobre la base integrada |
| `TC-SR-02` | Nombre accesible de controles interactivos | Pendiente de ejecutar sobre la base integrada |
| `TC-SR-03` | Texto visible del indicador de conexión | Pendiente de ejecutar sobre la base integrada |

Comando previsto desde `frontend`:

```powershell
npx playwright test e2e/tests/screen-reader-flow.spec.ts
```

## Registro manual de NVDA

Completar esta sección únicamente después de realizar la prueba manual. No registrar locuciones como verbatim sin haberlas escuchado y anotado durante la sesión.

| Fecha | Versión de NVDA | Sistema/voz | Recorrido probado | Hallazgos observados | Evidencia |
|---|---|---|---|---|---|
| Pendiente | Pendiente | Pendiente | Portal del Cliente | Pendiente | Pendiente |

## Criterio de cierre

TK236 no debe marcarse como terminado hasta que la suite automatizada se ejecute sobre la base integrada y el equipo complete el registro manual de NVDA con resultados reales.
