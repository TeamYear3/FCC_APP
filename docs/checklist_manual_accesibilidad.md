# ⌨️ Verificación Manual de Accesibilidad (WCAG 2.2 AA)

**Código de Trazabilidad:** `ACC-03`  
**Ticket Kanban:** `TK234` (#295)  
**Historia de Usuario:** `US-03` / Evaluación de Accesibilidad  
**Estándar:** WCAG 2.2 Nivel AA  
**Fecha:** Octubre 2026  
**Responsable:** Cristian Vargas (QA Lead & Fullstack Developer)  

---

## 1. Resumen de la Auditoría Manual

Dado que las herramientas automáticas cubren un subconjunto de los criterios WCAG, se implementó y validó el **Checklist Manual de 8 Puntos** en el stack frontend real de Angular. Se comprobó la navegación integral mediante teclado (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Esc`), el indicador visual de foco y la accesibilidad de formularios y diálogos modales.

---

## 2. Checklist de Verificación de 8 Puntos

| # | Criterio de Accesibilidad | Criterio WCAG | Comportamiento Verificado | Estado |
|:---:|---|:---:|---|:---:|
| 1 | **Navegación 100% por Teclado** | 2.1.1 (A) | Toda la funcionalidad de la app es operable sin utilizar mouse o puntero. | **PASS** ✅ |
| 2 | **Sin Trampas de Foco** | 2.1.2 (A) | Al abrir un diálogo modal (ej. "Mi Perfil"), la tecla `Escape` cierra el diálogo y devuelve el foco. | **PASS** ✅ |
| 3 | **Orden Lógico de Tabulación** | 2.4.3 (A) | El recorrido con `Tab` sigue el flujo natural de lectura de los campos y controles. | **PASS** ✅ |
| 4 | **Foco Visible Inconfundible** | 2.4.7 (AA) | Se configuró la regla global `*:focus-visible` con contorno `#FFCC00` de 2px de alto contraste. | **PASS** ✅ |
| 5 | **Formularios Accesibles** | 1.3.1 (A) | Todos los controles `<input>` cuentan con etiquetas `<label>` vinculadas unívocamente (`for`/`id`). | **PASS** ✅ |
| 6 | **Contraste de Color Suficiente** | 1.4.3 (AA) | Ratios de contraste superiores a 4.5:1 en textos y 3:1 en elementos de interfaz sobre fondo oscuro. | **PASS** ✅ |
| 7 | **Compatibilidad con Screen Reader (NVDA)** | 4.1.2 (A) | Botones con nombres accesibles visibles y botones iconográficos con `aria-label` descriptivo. | **PASS** ✅ |
| 8 | **Títulos de Página Únicos y Descriptivos** | 2.4.2 (A) | Cada ruta Angular actualiza el título del documento (`<title>`) al navegar en la SPA. | **PASS** ✅ |

---

## 3. Suite Automatizada E2E de Soporte

La suite Playwright `frontend/e2e/tests/keyboard-navigation.spec.ts` verifica de manera continua y automatizada:
* Recorrido secuencial `Tab` / `Shift+Tab`.
* Activación con `Space` y `Enter`.
* Verificación de estilos calculados de `:focus-visible`.
* Salida de modales con `Escape`.
* Llenado completo de formularios vía teclado.

Comando:
```bash
npx playwright test e2e/tests/keyboard-navigation.spec.ts
```
**Resultado:** 5/5 pruebas aprobadas (100% PASS).
