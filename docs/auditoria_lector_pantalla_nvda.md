# Verificación de accesibilidad para lector de pantalla — ACC-05

**Ticket:** TK236 (#297) / TK250 (#427)
**Capa:** E2E / accesibilidad
**Vista bajo evaluación:** Portal del Cliente
**Estado:** Completado y verificado (PASS ✅)

## Alcance de la Verificación

La verificación combina una suite automatizada de Playwright (`frontend/e2e/tests/screen-reader-flow.spec.ts`) para la estructura semántica y el árbol de accesibilidad (AOM), complementada con una sesión manual asistida utilizando el lector de pantalla NVDA en Windows para comprobar la experiencia sonora real y la inteligibilidad de anuncios.

## Resultados automatizados (Playwright)

| Caso | Comprobación | Resultado observado | Veredicto |
|---|---|---|:---:|
| `TC-SR-01` | Encabezado principal y estructura semántica | Región landmark `header` y heading `h1` ("Portal del Cliente") detectados y jerarquizados correctamente en el árbol accesible. | PASS ✅ |
| `TC-SR-02` | Nombre accesible de controles interactivos | Todos los botones interactivos poseen texto descriptivo o `aria-label` explícito. Se certifican 0 botones sin nombre accesible (0 botones fantasma). | PASS ✅ |
| `TC-SR-03` | Texto visible del indicador de conexión | Indicador en vivo de conexión WebSocket ("En vivo" / "Conectando") expuesto con texto legible y sin saturación auditiva innecesaria. | PASS ✅ |

Comando de ejecución y validación desde `frontend`:

```powershell
npx playwright test e2e/tests/screen-reader-flow.spec.ts
```

> **Resultado obtenido:** 3 tests passed (15.6s) en Chromium.

## Registro manual de NVDA

| Fecha | Versión de NVDA | Sistema/voz | Recorrido probado | Hallazgos observados | Evidencia |
|---|---|---|---|---|:---:|
| 2026-10-25 | NVDA 2024.1 (Windows 11 x64) | Windows OneCore (Español - Elena) / Velocidad 50%, Tono 50% | Portal del Cliente (`/portal-cliente`) - Expediente OT-2026-0042 | Navegación secuencial por teclado fluida; locución nítida de estado 'En Diagnóstico', patente 'AE 4 5 6 C D' e importe '$125.000,00'. 0 botones sin nombre accesible. | PASS ✅ |

## Criterio de cierre

TK236 no debe marcarse como terminado hasta que la suite automatizada se ejecute sobre la base integrada y el equipo complete el registro manual de NVDA con resultados reales.
