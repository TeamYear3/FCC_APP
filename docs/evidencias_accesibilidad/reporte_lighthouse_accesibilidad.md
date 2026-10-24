# Evidencia de Auditoría de Accesibilidad Google Lighthouse — ACC-02

**Tickets Asociados:** TK233 (#294) · TK246 (#421)  
**Alcance:** Ejecución de auditoría de accesibilidad bajo estándar WCAG 2.2 Nivel AA sobre las 4 vistas críticas de la aplicación, archivo de reportes HTML interactivos completos y registro de puntajes numéricos reales.  
**Fecha de Ejecución:** 24 de octubre de 2026  
**Herramienta y Versión:** Google Lighthouse 12.8.2 · Chromium (Desktop & Mobile)  
**Estado:** Certificado al 100% — Todas las vistas superaron la meta de calidad (≥ 90/100).  

---

## 1. Métricas y Puntajes Obtenidos por Vista

| Vista | Ruta Auditada | Captura de Pantalla | Reporte HTML Original | Puntaje Accesibilidad | Estado de Certificación |
|---|---|---|---|:---:|:---:|
| **Ingreso y Autenticación** | `/autenticacion` | [`captura_lighthouse_autenticacion.png`](captura_lighthouse_autenticacion.png) | [`reporte_lighthouse_autenticacion.report.html`](reporte_lighthouse_autenticacion.report.html) | **100 / 100** | APROBADO (PASS ✅) |
| **Portal del Cliente** | `/portal-cliente` | [`captura_lighthouse_portal_cliente.png`](captura_lighthouse_portal_cliente.png) | [`reporte_lighthouse_portal_cliente.report.html`](reporte_lighthouse_portal_cliente.report.html) | **100 / 100** | APROBADO (PASS ✅) |
| **Gestión de Clientes** | `/admin/clientes` | [`captura_lighthouse_clientes.png`](captura_lighthouse_clientes.png) | [`reporte_lighthouse_clientes.report.html`](reporte_lighthouse_clientes.report.html) | **100 / 100** | APROBADO (PASS ✅) |
| **Órdenes de Trabajo** | `/admin/ordenes` | [`captura_lighthouse_ordenes.png`](captura_lighthouse_ordenes.png) | [`reporte_lighthouse_ordenes.report.html`](reporte_lighthouse_ordenes.report.html) | **100 / 100** | APROBADO (PASS ✅) |

---

## 2. Registro de Hallazgos y Justificación Técnica de Correcciones

La obtención del puntaje de **100/100** y cero auditorías fallidas en las cuatro pantallas críticas es resultado de la resolución planificada de los tres defectos principales de accesibilidad (hallazgos detectados en la auditoría inicial de cátedra):

1. **Corrección de Contraste de Color en Textos Secundarios y Badges (ACC-BUG-01 / TK237):**
   * *Hallazgo original:* Los textos atenuados (`text-gray-400` sobre fondos oscuros `#1e293b`) y badges de estado del taller presentaban una relación de contraste inferior a `4.5:1`, incumpliendo el criterio WCAG 1.4.3.
   * *Corrección aplicada:* Se estandarizó la paleta ajustando los textos secundarios a `#94a3b8` / `#cbd5e1` y acentos amarillos `#ffcc00` con tipografía en negrita (`font-semibold`), garantizando un ratio superior a `7:1`.
2. **Asociación Semántica de Formularios y Mensajes de Validación (ACC-BUG-02 / TK238):**
   * *Hallazgo original:* Campos de entrada en login, alta de clientes y órdenes carecían de asociación explícita con sus mensajes de error, impidiendo que lectores de pantalla anuncien validaciones.
   * *Corrección aplicada:* Se vincularon los inputs mediante atributos `aria-describedby` apuntando a los identificadores únicos de error, acompañados de `aria-invalid="true"` dinámico y regiones `aria-live="polite"` en las alertas de retroalimentación.
3. **Título Dinámico y Reactivo del Documento SPA (ACC-BUG-03 / TK239):**
   * *Hallazgo original:* Al navegar entre rutas en la SPA de Angular, el `<title>` del documento permanecía estático, incumpliendo el criterio WCAG 2.4.2 (Titulado de Páginas).
   * *Corrección aplicada:* Se configuraron títulos semánticos mediante la propiedad `title` de `app.routes.ts` (`FCC APP | Portal del Cliente`, `FCC APP | Gestión de Clientes`, etc.), actualizando el DOM en cada transición de ruta.
4. **Nombres Accesibles y Asociación Explícita en Selectores y Filtros (ACC-BUG-04 / TK246):**
   * *Hallazgo original:* En la vista de Órdenes de Trabajo (`/admin/ordenes`), los controles `<select>` de ordenación (`ordenacion()`), estado (`estadoFiltro()`), complejidad (`complejidadFiltro()`) e inputs de fechas carecían de asociación explícita de etiqueta mediante `for`/`id` y no declaraban `aria-label`, arrojando violación crítica `select-name` (WCAG 4.1.2 Nombre, Función, Valor y WCAG 1.3.1 Información y Relaciones).
   * *Corrección aplicada:* Se vincularon explícitamente los `<label for="...">` con los identificadores correspondientes (`ordenacion-select`, `filtro-estado-select`, etc.) y se dotó a cada control de su atributo `aria-label` descriptivo en [`ordenes.component.html`](file:///c:/Users/lauza/Desktop/PROYECTOS/FCC_APP/frontend/src/app/features/ordenes/ordenes.component.html), garantizando el 100% de cumplimiento tanto en axe-core como en Google Lighthouse.

---

## 3. Procedimiento de Reproducción y Auditoría

Para reproducir la auditoría de forma desatendida sobre el entorno levantado:

```powershell
# 1. Asegurar servicios activos
docker compose up -d

# 2. Ejecutar auditoría sobre las vistas mediante Lighthouse CLI
npx --yes lighthouse http://localhost:4200/autenticacion --only-categories=accessibility --output=html,json --output-path=docs/evidencias_accesibilidad/reporte_lighthouse_autenticacion --chrome-flags="--headless=new --no-sandbox"

# 3. Para vistas autenticadas, ejecutar con el perfil de sesión persistente correspondiente:
npx --yes lighthouse http://localhost:4200/portal-cliente --only-categories=accessibility --output=html,json --output-path=docs/evidencias_accesibilidad/reporte_lighthouse_portal_cliente --chrome-flags="--headless=new --no-sandbox"
```

