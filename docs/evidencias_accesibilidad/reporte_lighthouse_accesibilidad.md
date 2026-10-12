# 📊 Informe de Auditoría de Accesibilidad con Google Lighthouse

**Código de Trazabilidad:** `ACC-02`  
**Ticket Kanban:** `TK233` (#294)  
**Historia de Usuario:** `US-03` / `HU-01` a `HU-11`  
**Herramienta:** Google Lighthouse (Chrome DevTools / Chromium 124)  
**Fecha:** Octubre 2026  
**Responsable:** Cristian Vargas (QA Lead & Fullstack Developer)  

---

## 1. Resumen Ejecutivo y Criterios de Aceptación

En el marco de las actividades de Calidad y V&V del Sprint 4, se ejecutó la auditoría formal de accesibilidad con Google Lighthouse sobre las pantallas principales de **FCC_APP** (*Full Check Car*).

**Meta de Calidad:** Alcanzar un puntaje igual o superior a **90 sobre 100** en la categoría de Accesibilidad en todas las vistas evaluadas, generando los reportes interactivos HTML y archivando las capturas visuales de evidencia.

---

## 2. Resultados Consolidados por Pantalla

| # | Pantalla / Módulo | Ruta Evaluada | Puntaje Lighthouse | Reporte HTML | Captura Visual | Estado |
|:---:|---|---|:---:|:---:|:---:|:---:|
| 1 | **Ingreso al Portal** | `/autenticacion` | **95 / 100** | [Ver Reporte](report_lighthouse_autenticacion.html) | [Ver Captura](captura_lighthouse_autenticacion.png) | **PASS** ✅ |
| 2 | **Portal del Cliente** | `/portal-cliente` | **94 / 100** | [Ver Reporte](report_lighthouse_portal_cliente.html) | [Ver Captura](captura_lighthouse_portal_cliente.png) | **PASS** ✅ |
| 3 | **Gestión de Clientes** | `/admin/clientes` | **92 / 100** | [Ver Reporte](report_lighthouse_clientes.html) | [Ver Captura](captura_lighthouse_clientes.png) | **PASS** ✅ |
| 4 | **Órdenes de Trabajo** | `/admin/ordenes` | **92 / 100** | [Ver Reporte](report_lighthouse_ordenes.html) | [Ver Captura](captura_lighthouse_ordenes.png) | **PASS** ✅ |

**Puntaje Promedio de la Aplicación:** **93.25 / 100** (Supera ampliamente el umbral exigido de ≥ 90).

---

## 3. Rubros Clave Auditados por Lighthouse

1. **Nombres y Etiquetas Accesibles:**
   - Formularios con `<label>` asociados unívocamente a cada control mediante atributos `for` e `id`.
   - Botones con texto accesible visible y botones iconográficos con `aria-label` descriptivo.
2. **Contraste de Color:**
   - Cumplimiento de la relación 4.5:1 en textos principales y 3:1 en componentes gráficos e interfaces de foco.
3. **Estructura y ARIA:**
   - Uso de elementos semánticos estándar (`<header>`, `<main>`, `<nav>`, `<h1>`-`<h3>`, `<table>`, `<th>`).
   - Atributos `aria-*` con roles permitidos y estados consistentes.
4. **Navegación:**
   - Títulos de ruta dinámicos actualizados en la SPA Angular (`<title>`).
   - Secuencia de foco lógica y perceptible.

---

## 4. Conclusión (DoD)

Se satisfacen todos los criterios de aceptación del ticket `TK233`:
- [x] Auditoría ejecutada en al menos 4 vistas clave.
- [x] Puntaje obtenido ≥ 90 en cada evaluación (95, 94, 92, 92).
- [x] Capturas de pantalla y reportes HTML archivados en `FCC_APP/docs/evidencias_accesibilidad/`.
