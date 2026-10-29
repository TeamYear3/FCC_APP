# Informe de Auditoría y Certificación 100% PASS de Pruebas E2E (TK252)

**Ticket Asociado:** [TK252 (#432)](https://github.com/TeamYear3/FCC_APP/issues/432)  
**Responsable QA:** Laura Zárate (`@lauzarg`)  
**Fecha:** 29 de Octubre de 2026  
**Rama:** `fix/tk252-selectores-ordenes-flujo-taller`  
**Entorno de Pruebas:** Playwright (Chromium Headless) / Angular 20 Frontend / DRF  
**Resultado Global:** **44 / 44 PRUEBAS PASADAS (100% PASS) en 39.9s**  

---

## 1. Justificación y Diagnóstico del Fallo Inicial (FAIL ❌)

Durante la auditoría docente del Sprint 4 y la corrida integral de regresión sobre `develop` (`npm run test:e2e`), se constataron 4 fallos que impedían la certificación limpia del arnés:

| # | Archivo y Caso Afectado | Causa Técnica Raíz |
|---|---|---|
| 1 | `capture-screenshots.spec.ts:77` (`Capturar pantalla: Órdenes de Trabajo`) | `OrdenesPage.kanbanBoard` buscaba exclusivamente `[data-testid="ordenes-kanban"]`, selector no presente en la plantilla actual, provocando `Timeout 5000ms`. |
| 2 | `flujo-taller.spec.ts:163` (`TC-E2E-TALLER-01: Carga y cálculo de presupuesto`) | `seleccionarOrden(0)` hacía click sobre la fila `<tr>` de cabecera (`<thead>`) o modal preview, sin invocar `verOrden(orden)`, impidiendo que se active `modoDetalle` y renderice `#expediente-activo`. |
| 3 | `flujo-taller.spec.ts:188` (`TC-E2E-TALLER-02: Modal de aprobación de presupuesto`) | `tabPresupuesto` esperaba el texto *"carga de mano de obra y repuestos"*, mientras que la UI renderiza *"Carga de Repuestos y Mano de Obra"*, provocando `Timeout 10000ms`. |
| 4 | `flujo-taller.spec.ts:210` (`TC-E2E-TALLER-03: Trazabilidad en Portal del Cliente`) | Al navegar a `/portal-cliente`, el componente invocaba `/api/turnos/`. Al no estar mockeada, la API respondía 401 y el interceptor de autenticación (`auth.interceptor.ts`) vaciaba la sesión, redirigiendo al login con el mensaje *"Tu sesión ha expirado"*. |

### 📸 Evidencia Gráfica del Fallo Inicial:
![Evidencia Fallo Inicial E2E](https://github.com/TeamYear3/FCC_APP/releases/download/v1.0.0/evidencia_fallo_inicial_selectores_ordenes_tk252.png)

---

## 2. Solución Técnica Implementada

1. **`frontend/e2e/pages/ordenes.page.ts`:**
   - Incorporación de fallbacks semánticos a `table` y al título `Expediente Operativo de Taller` en `kanbanBoard`.
   - Implementación de auto-waiting dinámico en `seleccionarOrden` para esperar y clickear directamente el botón *"Ver Orden"* (`verOrdenBtn.waitFor({ state: 'visible' })`).
   - Flexibilización de la expresión regular de `tabPresupuesto` (`/repuestos y mano de obra|mano de obra y repuestos/i`).
2. **`frontend/e2e/pages/portal-cliente.page.ts`:**
   - Incorporación de selectores semánticos por `data-testid` en las pestañas (`portal-tab-ordenes` y `portal-tab-vehiculos`).
3. **`frontend/e2e/tests/flujo-taller.spec.ts`:**
   - Añadidos mocks deterministas para `**/api/turnos/**` y `**/api/usuarios/**`, estabilizando la navegación del cliente sin errores 401.

---

## 3. Certificación de Resolución (100% PASS ✅)

### 📸 Evidencia Gráfica de la Resolución:
![Evidencia Resolución Playwright 100% PASS](https://github.com/TeamYear3/FCC_APP/releases/download/v1.0.0/evidencia_resolucion_playwright_100_pass_tk252.png)

```text
Running 44 tests using 2 workers

  ok 1 [chromium] › smoke.spec.ts: 3 tests (4.0s)
  ok 2 [chromium] › auth.spec.ts: 10 tests (12.3s)
  ok 3 [chromium] › capture-screenshots.spec.ts: 4 tests (4.3s)
  ok 4 [chromium] › contrast-responsive.spec.ts: 5 tests (5.4s)
  ok 5 [chromium] › crud-clientes.spec.ts: 4 tests (7.7s)
  ok 6 [chromium] › flujo-taller.spec.ts: 3 tests (5.8s)
  ok 7 [chromium] › keyboard-navigation.spec.ts: 5 tests (6.8s)
  ok 8 [chromium] › regresion-evidencia.spec.ts: 2 tests (5.5s)
  ok 9 [chromium] › screen-reader-flow.spec.ts: 3 tests (2.7s)
  ok 10 [chromium] › accessibility.spec.ts: 5 tests (6.2s)

  44 passed (39.9s)
```
