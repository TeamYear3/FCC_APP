# ♿ Informe de Auditoría de Accesibilidad Web (WCAG 2.2 AA)

**Código de Trazabilidad:** `ACC-01`  
**Ticket Kanban:** `TK216` (#277)  
**Historia de Usuario:** `US-03` / `HU-01` a `HU-11`  
**Herramientas:** Playwright v1.64 + `@axe-core/playwright` v4.13, Google Lighthouse, NVDA Screen Reader  
**Fecha:** Octubre 2026  
**Responsable:** Cristian Vargas (QA Lead & Fullstack Developer)  

---

## 1. Resumen Ejecutivo

Se ejecutó la auditoría integral de accesibilidad digital sobre la Single Page Application (SPA) Angular de **FCC_APP** (*Full Check Car*), validando el cumplimiento estricto del estándar internacional **WCAG 2.2 Nivel AA** (Web Content Accessibility Guidelines).

La evaluación combinó:
1. **Auditoría Automatizada con axe-core y Playwright:** Análisis estático y dinámico del DOM en las pantallas críticas del sistema bajo tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `wcag22aa`.
2. **Evaluación de Rendimiento de Accesibilidad con Google Lighthouse:** Verificación de puntaje ≥ 90/100 en accesibilidad.
3. **Checklist Manual de 8 Puntos:** Navegación por teclado (tabindex), foco visible, etiquetas `<label for="...">`, contraste de color (mínimo 4.5:1 texto normal, 3:1 componentes de UI), y compatibilidad con lector de pantalla (NVDA).

---

## 2. Resultados de la Suite Automatizada (Playwright + axe-core)

Comando de ejecución: `npm run test:a11y`

| ID Caso de Prueba | Vista Auditada | Ruta Angular | Violaciones Críticas | Violaciones Graves | Estado |
|:---:|---|---|:---:|:---:|:---:|
| `TC-ACC-01` | Ingreso y Autenticación | `/autenticacion` | **0** | **0** | **PASS** ✅ |
| `TC-ACC-02` | Portal del Cliente | `/portal-cliente` | **0** | **0** | **PASS** ✅ |
| `TC-ACC-03` | Gestión de Clientes | `/admin/clientes` | **0** | **0** | **PASS** ✅ |
| `TC-ACC-04` | Órdenes de Trabajo | `/admin/ordenes` | **0** | **0** | **PASS** ✅ |
| `TC-ACC-05` | Controles Interactivos | `/autenticacion` | **0** | **0** | **PASS** ✅ |

**Resultado Global:** **0 violaciones de impacto `critical`** y **0 violaciones de impacto `serious`**, superando con éxito el Criterio de Aceptación 1 del ticket.

---

## 3. Matriz de Cumplimiento de Criterios WCAG 2.2 Nivel AA

| Criterio WCAG | Descripción | Técnica Implementada | Estado |
|:---:|---|---|:---:|
| **1.1.1 Contenido no textual** | Todo elemento visual posee alternativa textual equivalente. | Atributos `alt` obligatorios en logos e iconos informativos; `aria-hidden="true"` en iconos decorativos SVG. | **Cumple** |
| **1.3.1 Información y relaciones** | Estructura semántica comprensible programáticamente. | Asociación explícita `label[for]` con `input[id]`, jerarquía de encabezados `h1`-`h3` y roles semánticos. | **Cumple** |
| **1.4.3 Contraste mínimo** | Relación de contraste de al menos 4.5:1 para texto normal y 3:1 para texto grande. | Paleta de colores optimizada: texto blanco `#FFFFFF` y acento amarillo `#FFCC00` sobre fondos oscuros `#121212`/`#000000`. | **Cumple** |
| **2.1.1 Teclado** | Toda la funcionalidad es operable mediante teclado. | Navegación secuencial con `Tab`, activación con `Enter`/`Space` y escape de modales con `Esc`. | **Cumple** |
| **2.4.3 Orden del foco** | La navegación por tabulación sigue un orden lógico e intuitivo. | Estructura natural del árbol DOM sin interferencias de `tabindex` positivos arbitrarios. | **Cumple** |
| **2.4.7 Foco visible** | El indicador del foco del teclado es claramente perceptible. | Anillos de foco `focus:ring-2 focus:ring-color-primary-accent` en inputs y botones. | **Cumple** |
| **3.2.1 Al recibir el foco** | Ningún componente inicia un cambio de contexto solo por recibir el foco. | Manejadores de eventos controlados sin envíos accidentales en blur o focus. | **Cumple** |
| **4.1.2 Nombre, función, valor** | Los componentes de interfaz exponen su rol y estado a las tecnologías de asistencia. | Botones de alternancia con `aria-label` dinámico ("Mostrar contraseña" / "Ocultar contraseña"). | **Cumple** |

---

## 4. Auditoría Google Lighthouse

* **Pantalla de Autenticación:** 95 / 100
* **Portal del Cliente:** 94 / 100
* **Gestión de Clientes:** 92 / 100
* **Órdenes de Trabajo:** 92 / 100

**Umbral requerido:** ≥ 90 / 100 (Cumplido al 100%).

---

## 5. Conclusión y Criterio de Terminado (DoD)

La implementación de la suite en `@axe-core/playwright` garantiza la integración continua de pruebas de accesibilidad, previniendo regresiones de usabilidad e inclusión en los flujos principales de la aplicación.
