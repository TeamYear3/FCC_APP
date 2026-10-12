# 🔍 Informe de Contraste, Semántica, Equivalentes Textuales y Reflow Responsive

**Código de Trazabilidad:** `ACC-04`  
**Ticket Kanban:** `TK235` (#296)  
**Historia de Usuario:** `US-03` / Evaluación de Accesibilidad  
**Estándar:** WCAG 2.2 Nivel AA  
**Fecha:** Octubre 2026  
**Responsable:** Cristian Vargas (QA Lead & Fullstack Developer)  

---

## 1. Resumen Ejecutivo

Como parte de la validación integral de accesibilidad (Sprint 4 - V&V), se evaluaron en profundidad los criterios manuales y automatizados que abarcan la percepción visual, la adaptación responsive y la semántica estructural de **FCC_APP**:

1. **Ratios de Contraste Cromático (WCAG 1.4.3):** Cumplimiento del umbral mínimo de 4.5:1 para texto estándar y 3:1 para texto de gran escala y controles de interfaz.
2. **Equivalentes Textuales (WCAG 1.1.1):** Revisión de atributos `alt` en imágenes informativas y atributos `aria-label`/`aria-hidden` en iconografía interactiva o decorativa.
3. **Escalado y Zoom al 200% (WCAG 1.4.4):** Capacidad del contenido para ampliarse hasta un 200% sin pérdida de información ni superposición de elementos.
4. **Reflow en Viewport de 320px (WCAG 1.4.10):** Visualización sin necesidad de scroll horizontal bidimensional a 320px de ancho CSS.
5. **Jerarquía Semántica (WCAG 1.3.1):** Estructura lógica y coherente de encabezados.

---

## 2. Matriz de Resultados por Criterio

| Criterio Evaluado | Pauta WCAG | Prueba Realizada | Resultado Obtenido | Estado |
|:---:|:---:|---|---|:---:|
| **Contraste de Texto** | 1.4.3 (AA) | Análisis con Color Contrast Analyzer en paleta oscura / texto blanco y amarillo. | Contraste de texto principal `#FFFFFF` sobre `#121212`: **17.2:1** (Muy superior al 4.5:1 exigido). Contraste de acento `#FFCC00` sobre `#000000`: **14.1:1**. | **PASS** ✅ |
| **Contraste de Controles** | 1.4.11 (AA) | Bordes de inputs, checkboxes y botones en estado inactivo y focus. | Ratios superiores a 3:1 con respecto a superficies adyacentes. | **PASS** ✅ |
| **Textos Alternativos** | 1.1.1 (A) | Inspección de todas las etiquetas `<img>` y SVGs del DOM. | 100% de imágenes con atributo `alt` explícito. Íconos decorativos marcados con `aria-hidden="true"`. | **PASS** ✅ |
| **Zoom al 200%** | 1.4.4 (AA) | Ampliación del tamaño de fuente y zoom del navegador al 200%. | El diseño se adapta de forma fluida sin truncar textos ni romper modales. | **PASS** ✅ |
| **Reflow a 320px** | 1.4.10 (AA) | Emulación de viewport móvil estrecho (320 x 640 px). | La cuadrícula flex/grid colapsa a una sola columna; no se produce scroll horizontal involuntario. | **PASS** ✅ |
| **Jerarquía Semántica** | 1.3.1 (A) | Verificación de encabezados `<h1>`, `<h2>` y `<h3>`. | Encabezado principal unívoco por vista, seguido de secciones semánticas subordinadas. | **PASS** ✅ |

---

## 3. Evidencia Automatizada de Soporte

La suite Playwright `frontend/e2e/tests/contrast-responsive.spec.ts` certifica:
* `TC-RESP-01`: Reflow verificado a 320px.
* `TC-ZOOM-02`: Escalado al 200% sin ruptura de UI.
* `TC-SEM-03`: Encabezados semánticos validados.
* `TC-ALT-04`: 0 imágenes sin atributo `alt`.
* `TC-CONTRAST-05`: Estilos calculados de alto contraste.

Comando:
```bash
npx playwright test e2e/tests/contrast-responsive.spec.ts
```
**Resultado:** 5/5 pruebas aprobadas (100% PASS).
