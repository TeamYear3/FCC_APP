# Evaluación Sistemática de Optimizaciones Secundarias de Rendimiento

> **Ticket:** [TK173 (#256) - bug(frontend): Falta de evaluación sistemática de optimizaciones secundarias](https://github.com/TeamYear3/FCC_APP/issues/256)  
> **Historia de Usuario Padre:** [US-14: Reportes y Rentabilidad (#19)](https://github.com/TeamYear3/FCC_APP/issues/19)  
> **Documento de Referencia:** [docs/LINEA_BASE_RENDIMIENTO.md](LINEA_BASE_RENDIMIENTO.md) (TK167 / #252)  
> **Fecha de Evaluación:** 14 de Octubre de 2026  
> **Autor / Auditor:** Laura Zárate (`lauzarg`)  
> **Proyecto:** FCC_APP (Full Check Car)

---

## 1. Contexto y Objetivos

Habiéndose establecido la Línea Base Inicial de Rendimiento (*Baseline*) en el ticket **TK167 (#252)** y tras la ejecución de las intervenciones arquitectónicas y optimizaciones del Sprint 4:
* **TK168 (#253) / TK183 (#227):** Eliminación de bucles de consulta N+1 mediante precarga relacional ORM (`select_related` y `prefetch_related`).
* **TK170 (#248):** Estandarización de contratos de API REST y paginación uniforme con metadatos normalizados.
* **TK172 (#249):** Arquitectura centralizada de canales y caché en memoria con Redis (`channels_redis`, `django-redis`).
* **TK191 (#245) / TK192 (#250) / TK193 (#230):** Desacoplamiento de eventos efímeros, telemetría fiscal ARCA, diagnósticos OBD-II e historial NoSQL en MongoDB con fallback resiliente.
* **Optimizaciones Frontend (Angular 21):** Adopción de bloques diferidos `@defer (on viewport)`, reducción de Layout Shifts (CLS) y reactividad nativa mediante Signals.

El objetivo del presente documento es auditar, comparar y consolidar empíricamente las mejoras de rendimiento logradas, certificando el cumplimiento pleno de la **User Story US-14** (*Control de calidad y rendimiento*).

---

## 2. Entorno y Metodología de Verificación

* **Backend:** Django 5.0.6, Django REST Framework 3.15.2, Python 3.13, Redis 7, MongoDB 7.
* **Frontend:** Angular 21.2.0, Vite, TailwindCSS, Google Lighthouse 12+.
* **Metodología Backend:** Comando reproducible `python manage.py audit_performance --format=table` evaluando la cantidad total de consultas SQL, duplicidad de queries y latencia promedio con DRF `APIClient`.
* **Metodología Frontend:** Auditorías de Core Web Vitals en perfiles Desktop y Mobile simulado (Fast 4G, CPU Throttling 4x).

---

## 3. Comparativa Cuantitativa Backend: Baseline (TK167) vs. Post-Optimización (TK173)

A continuación se detalla la comparativa directa entre la línea base inicial y el estado actual optimizado:

| Endpoint Auditado | Método | Queries Iniciales (TK167) | Duplicadas Iniciales | Queries Actuales (TK173) | Duplicadas Actuales | Reducción Queries | Estado N+1 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`/api/clientes/`** (Listado) | `GET` | 1 | 0 | **2** | **0** | Normalizado (Paginación) | **Óptimo** |
| **`/api/vehiculos/`** (Listado) | `GET` | 6 | **4** | **3** | **0** | **-50.0%** | **ERRADICADO (Óptimo)** |
| **`/api/ordenes/`** (Listado) | `GET` | 2 | 0 | **2** | **0** | 0.0% | **Óptimo** |
| **`/api/facturas/`** (Listado) | `GET` | 1 | 0 | **1** | **0** | 0.0% | **Óptimo** |
| **`/api/turnos/`** (Listado) | `GET` | 2 | 0 | **3** | **0** | Normalizado (Paginación) | **Óptimo** |
| **`/api/ordenes/{id}/`** (Detalle OT) | `GET` | 4 | 0 | **5** | **0** | Telemetría integrada | **Óptimo** |
| **`/api/ordenes/{id}/items/`** | `GET` | 6 | **3** | **3** | **0** | **-50.0%** | **ERRADICADO (Óptimo)** |
| **`/api/clientes/{id}/`** | `GET` | 1 | 0 | **1** | **0** | 0.0% | **Óptimo** |
| **`/api/vehiculos/{id}/historial/`** | `GET` | 5 | 0 | **5** | **0** | 0.0% | **Óptimo** |

### Resumen de Ganancias en Base de Datos:
1. **Erradicación Total de Consultas Duplicadas N+1:** Las alertas críticas detectadas en el baseline en `/api/vehiculos/` (4 consultas duplicadas) y `/api/ordenes/{id}/items/` (3 consultas duplicadas) se redujeron a **0 consultas duplicadas** en todo el sistema.
2. **Consultas Estables e Invariantes:** El número de queries para el listado de vehículos e ítems es ahora `O(1)` respecto al número de registros gracias al uso sistemático de `select_related('cliente')` y `prefetch_related('mantenimientos_programados')`.

---

## 4. Comparativa Cuantitativa Frontend: Core Web Vitals (Lighthouse)

Medición de Core Web Vitals comparando la línea base previa contra las vistas optimizadas con `@defer`, `signals` y renderizado selectivo:

| Vista Auditada | Ruta Angular | Rendimiento Baseline | Rendimiento Final | FCP Inicial ➔ Final | LCP Inicial ➔ Final | TBT Inicial ➔ Final | CLS Inicial ➔ Final | Diagnóstico |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Login / Autenticación** | `/login` | 94 / 100 | **97 / 100** | 0.8 s ➔ **0.6 s** | 1.2 s ➔ **0.9 s** | 40 ms ➔ **10 ms** | 0.002 ➔ **0.000** | Excelente |
| **Dashboard Administrativo** | `/admin/dashboard` | 86 / 100 | **93 / 100** | 1.1 s ➔ **0.8 s** | 1.9 s ➔ **1.3 s** | 130 ms ➔ **45 ms** | 0.015 ➔ **0.002** | Óptimo |
| **Directorio de Clientes** | `/clientes` | 88 / 100 | **95 / 100** | 1.0 s ➔ **0.7 s** | 1.7 s ➔ **1.1 s** | 90 ms ➔ **30 ms** | 0.008 ➔ **0.001** | Óptimo |
| **Expediente de Órdenes** | `/ordenes` | 82 / 100 | **92 / 100** | 1.3 s ➔ **0.9 s** | 2.3 s ➔ **1.4 s** | 190 ms ➔ **55 ms** | 0.038 ➔ **0.005** | +12% Mejora |

### Ganancias Específicas en Experiencia de Usuario:
* **Largest Contentful Paint (LCP):** Se redujo un **39.1%** en la vista de órdenes (de 2.3 s a 1.4 s), eliminando la percepción de demora al abrir el expediente.
* **Total Blocking Time (TBT):** Disminuyó un **71.0%** en el expediente técnico gracias a la postergación de la carga de modales secundarios mediante `@defer (on viewport)`.
* **Cumulative Layout Shift (CLS):** Estabilidad visual perfecta (< 0.005) mediante reserva estricta de contenedores y dimensiones en las tarjetas de estado y badges dinámicos.

---

## 5. Optimizaciones de Arquitectura Distribuida (Redis y MongoDB)

1. **Caché Distribuida con Redis (`django-redis`):**
   - Reducción drástica del estrés sobre PostgreSQL para sesiones concurrentes y consultas de configuración estáticas.
   - Channel layer escalable multiproceso para WebSockets (`channels_redis`) reemplazando la memoria volátil de proceso único.
2. **Capa NoSQL en MongoDB (`diagnosticos_obd2`, `eventos_websocket`, `telemetria_arca`):**
   - Almacenamiento desacoplado de telemetría de alto volumen sin impactar las tablas transaccionales relacionales.
   - Manejo de *Graceful Fallback* con timeout de 1500 ms, garantizando que una indisponibilidad momentánea de MongoDB jamás bloquee las operaciones críticas de facturación ni la gestión de órdenes de trabajo.

---

## 6. Procedimiento de Reproducción

Para ejecutar de manera reproducible esta auditoría en cualquier entorno:

```bash
# 1. Auditoría de consultas SQL en Backend:
python manage.py audit_performance --format=table

# 2. Ejecutar la suite de pruebas del comando de rendimiento:
python manage.py test core.tests.AuditPerformanceCommandTests

# 3. Auditoría Frontend:
# Iniciar servidor local y ejecutar Lighthouse CLI o Chrome DevTools:
npm run start
npx lighthouse-ci collect --url=http://localhost:4200/ordenes
```

---

## 7. Conclusiones y Criterio de Aceptación Cumplido

El proceso sistemático de optimización ha demostrado ganancias empíricas concluyentes:
- **0 consultas SQL duplicadas** en todos los endpoints REST auditados.
- **-50% de consultas** en listados relacionales complejos.
- **-39% de tiempo de carga LCP** y **-71% de tiempo de bloqueo TBT** en el frontend.
- Documentación técnica final consolidada y trazable contra la línea base de **TK167**.

Con este reporte queda formalmente cumplido al 100% el Criterio de Aceptación de la tarjeta **TK173 (#256)** y la Historia de Usuario **US-14**.
