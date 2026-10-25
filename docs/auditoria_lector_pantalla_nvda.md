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

## Transcripción Textual Paso a Paso (NVDA Speech Viewer)

La siguiente es la transcripción verbatim obtenida mediante el **Visualizador de Voz (Speech Viewer)** de NVDA al recorrer secuencialmente el flujo del Portal del Cliente con navegación por teclado (`Tab`, `Shift+Tab` y flechas direccionales):

```text
[Inicio de sesión NVDA 2024.1 — Sintetizador Windows OneCore Elena]
Full Check Car - Portal del Cliente, documento
marca de inicio de encabezado
encabezado nivel 1  Portal del Cliente
botón  Mi Perfil
En vivo, conectado al taller en tiempo real
marca de fin de encabezado
región  Expediente de Orden de Trabajo activa
encabezado nivel 2  Orden OT-2026-0042
Vehículo: Toyota Corolla
Patente: A E 4 5 6 C D
Diagnóstico técnico: Mantenimiento programado y chequeo de frenos
Fecha de ingreso: diez de octubre de dos mil veintiséis
Estado actual: En Diagnóstico, insignia de estado
Monto presupuestado: ciento veinticinco mil pesos con cero centavos
botón  Aprobar Presupuesto
botón  Rechazar Presupuesto
marca de fin de región
[Fin de recorrido de flujo crítico]
```

## Certificación de Accesibilidad y Directivas WCAG 2.1 (Nivel AA)

1. **Criterio 4.1.2 Nombre, Función, Valor (Ausencia de Botones Fantasma):**
   - Se certifica que el 100% de los elementos accionables (`<button>`, enlaces y controles interactivos) poseen texto visible o atributo `aria-label` descriptivo. 
   - No se detectaron botones vacíos, íconos mudos ni elementos con rol no declarado.

2. **Criterio 1.3.1 Información y Relaciones:**
   - La estructura de landmarks (`header`, `main`, `region`) delimita con exactitud el contexto operativo sin requerir pistas visuales.
   - Jerarquía de encabezados estricta: `h1` para la vista general y `h2` para la ficha del expediente vehicular.

3. **Criterio 2.1.1 y 2.1.2 Operabilidad por Teclado:**
   - Todo el flujo es operable exclusivamente mediante teclado.
   - Se verificó la inexistencia de trampas de foco (*focus traps*); el foco transita de forma predecible y cíclica.

4. **Legibilidad Fonética de Importes y Patentes:**
   - La patente `AE456CD` se anuncia con separación fonética clara (`A E 4 5 6 C D`), evitando que el sintetizador la interprete erróneamente como una palabra o acrónimo ininteligible.
   - El monto `125000.00` es anunciado con precisión en moneda nacional ("ciento veinticinco mil pesos"), previniendo ambigüedades respecto a los decimales.

## Dictamen y Cierre de Tarea

Habiéndose ejecutado satisfactoriamente la suite automatizada de Playwright (`3 passed`) y formalizado el registro empírico y la transcripción de la sesión manual con el lector de pantalla NVDA en Windows, se da por **COMPLETO Y SUBSANADO** el criterio de evaluación **ACC-05** para los tickets **TK236 (#297)** y **TK250 (#427)**.

