# 🎬 Informe de Evidencias E2E y Registro Forense de Regresiones

**Código de Trazabilidad:** `AUT-E2E-07`  
**Ticket Kanban:** `TK232` (#293)  
**Historia de Usuario:** `US-13` / Gestión Ágil de Calidad (V&V)  
**Framework:** Playwright Test v1.64 + Chromium Headless  
**Fecha:** Octubre 2026  
**Responsable:** Cristian Vargas (QA Lead & Fullstack Developer)  

---

## 1. Objetivo y Criterio de Aceptación

Para dar cumplimiento formal al requerimiento de la cátedra de *Verificación y Validación de Programas* (ISPC), el arnés de pruebas E2E debe demostrar su capacidad de alertar tempranamente sobre regresiones mediante evidencias completas y reproducibles:
1. **Reporte HTML interactivo:** Reporte navegable generado en `frontend/playwright-report/index.html`.
2. **Evidencias Forenses Archivadas:** Registro de captura de pantalla (`.png`), video de ejecución (`.webm`) y archivo de traza profunda (`trace.zip`) ante la detección de un fallo/regresión.
3. **Reproducibilidad:** Capacidad de inspeccionar la línea de tiempo, llamadas de red, estado del DOM y consola mediante el visor de trazas de Playwright (`playwright show-trace`).

---

## 2. Archivos de Evidencia Archivados

Todos los artefactos generados se encuentran preservados en este directorio:

| Tipo de Evidencia | Archivo | Descripción | Tamaño |
|---|---|---|:---:|
| **Traza de Ejecución** | [`trace_regresion_fallo.zip`](trace_regresion_fallo.zip) | Traza completa paso a paso con snapshots del DOM, acciones de ratón, llamadas de red y consola. | ~1.8 MB |
| **Captura de Pantalla** | [`captura_fallo_regresion.png`](captura_fallo_regresion.png) | Screenshot exacto del estado visual de la página al momento de la aserción no satisfecha. | ~295 KB |
| **Grabación de Video** | [`video_fallo_regresion.webm`](video_fallo_regresion.webm) | Video de alta fidelidad que registra la secuencia continua de renderizado y prueba. | ~372 KB |

---

## 3. Instrucciones de Inspección Forense

Para abrir y examinar interactivamente la traza archivada:

```bash
# Desde la carpeta frontend:
npx playwright show-trace ../docs/evidencias_e2e/trace_regresion_fallo.zip
```

El visor de Playwright permite:
* Explorar la línea de tiempo milisegundo a milisegundo antes y después de la aserción.
* Inspeccionar los elementos del DOM y estilos calculados en cada paso.
* Analizar las peticiones de red (requests/responses) interceptadas.
* Revisar los logs de la consola del navegador y errores capturados.

---

## 4. Resultados de Ejecución de la Suite

Comando ejecutado:
```bash
npm --prefix frontend run test:e2e
```

| Caso de Prueba | Descripción | Resultado |
|:---:|---|:---:|
| `TC-E2E-07-PASS` | Carga inicial, renderizado y verificación de controles en LoginPage | **PASS** ✅ |
| `TC-E2E-07-FAIL` | Detección controlada de regresión y generación de evidencias forenses | **EXPECTED FAIL (RECORDED)** ✅ |

---

## 5. Conclusión (DoD)

Se satisface al 100% el Criterio de Terminado de la tarea `TK232`: el entorno E2E garantiza la trazabilidad total de defectos en la capa visual de FCC App.
