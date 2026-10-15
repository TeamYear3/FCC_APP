# Línea Base de Rendimiento: Frontend (Web Vitals) y Backend (Queries SQL)

> **Ticket:** [TK167 (#252) - bug(backend/frontend): Ausencia de una línea base de rendimiento reproducible](https://github.com/TeamYear3/FCC_APP/issues/252)  
> **Historia de Usuario Padre:** [US-14: Reportes y Rentabilidad (#19)](https://github.com/TeamYear3/FCC_APP/issues/19)  
> **Fecha de Medición:** 13 de Octubre de 2026  
> **Autor / Auditor:** Laura Zárate (`lauzarg`)  
> **Proyecto:** FCC_APP (Full Check Car)

---

## 1. Contexto y Objetivos

El presente documento consolida la **Línea Base Inicial de Rendimiento (*Baseline*)** del sistema *Full Check Car*. Establece el punto de partida técnico y cuantitativo previo a la aplicación de optimizaciones de bases de datos, consultas ORM y arquitectura frontend.

### Objetivos Específicos:
1. **Auditoría Frontend:** Registrar las métricas de carga y experiencia de usuario basadas en los estándares **Google Core Web Vitals** (LCP, CLS, TBT, FCP) sobre las vistas críticas de la aplicación SPA en Angular.
2. **Auditoría Backend:** Medir y documentar de manera reproducible la cantidad exacta de consultas SQL, la latencia acumulada en base de datos y la detección de bucles de consulta **N+1** en los endpoints REST de Django.
3. **Trazabilidad y Comparación:** Proveer la evidencia técnica para cuantificar la efectividad de las soluciones a implementar en los tickets subsiguientes:
   * **TK168 (#253):** Eliminación de consultas repetitivas N+1 con `select_related` y `prefetch_related`.
   * **TK183 (#227):** Consolidación de precarga ORM en el expediente de órdenes de trabajo.
   * **TK170 (#248):** Estandarización de contratos de paginación uniforme en la API.

---

## 2. Entorno y Metodología de Medición

### 2.1. Ficha Técnica del Entorno
* **Backend:** Django 5.0.6, Django REST Framework 3.15.2, Python 3.13.
* **Frontend:** Angular 21.2.0, TailwindCSS, Vitest, Playwright.
* **Base de Datos:** PostgreSQL / SQLite con índices de integridad y claves foráneas activas.
* **Entorno de Ejecución:** Servidor local de desarrollo bajo hardware estándar de laboratorio (CPU x86_64, 16 GB RAM).

### 2.2. Herramientas Utilizadas
* **Backend:** Comando de gestión reproducible `python manage.py audit_performance`, basado en `django.test.utils.CaptureQueriesContext`, normalización sintáctica de consultas mediante expresiones regulares y DRF `APIClient` con autenticación por rol administrativo.
* **Frontend:** Google Lighthouse 12+ / Chrome DevTools Performance bajo perfil de emulación Desktop y Mobile estándar (Fast 4G, CPU Throttling 4x).

---

## 3. Línea Base Frontend: Core Web Vitals (Lighthouse)

A continuación se registran las métricas iniciales de rendimiento de carga en las 4 vistas principales de la aplicación:

| Vista Auditada | Ruta Angular | Rendimiento (0-100) | FCP (First Contentful Paint) | LCP (Largest Contentful Paint) | TBT (Total Blocking Time) | CLS (Cumulative Layout Shift) | Diagnóstico Inicial |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Login / Autenticación** | `/login` | **94 / 100** | 0.8 s | 1.2 s | 40 ms | 0.002 | Óptimo. Carga ligera y sin scripts bloqueantes. |
| **Dashboard Administrativo** | `/admin/dashboard` | **86 / 100** | 1.1 s | 1.9 s | 130 ms | 0.015 | Aceptable. Ligero bloqueo por procesamiento de métricas iniciales. |
| **Directorio de Clientes** | `/clientes` | **88 / 100** | 1.0 s | 1.7 s | 90 ms | 0.008 | Bueno. Tabla reactiva con renderizado dinámico. |
| **Expediente de Órdenes** | `/ordenes` | **82 / 100** | 1.3 s | 2.3 s | 190 ms | 0.038 | Oportunidad de mejora. Múltiples tarjetas de estado y cálculo de avance en memoria. |

### Hallazgos y Oportunidades Frontend:
1. **Diferimiento de Componentes:** Las vistas pesadas como el expediente de órdenes y la agenda de turnos se benefician de la adopción sistemática de bloques `@defer (on viewport)` para modales y componentes secundarios de alto costo.
2. **Estabilidad Visual (CLS):** Los indicadores de estado y badges en las tarjetas de órdenes deben reservar dimensiones mínimas (`min-height`) para evitar saltos de layout durante la respuesta de la API.

---

## 4. Línea Base Backend: Consultas SQL y Tiempos de Respuesta

Medición automatizada ejecutada con el comando `audit_performance`:

| Endpoint REST | Método | HTTP Status | Queries SQL Totales | Consultas Duplicadas | Tiempo Respuesta (Promedio) | Tiempo SQL Acumulado | Diagnóstico N+1 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `/api/clientes/` | `GET` | `200` | **1** | 0 | 6.01 ms | 0.98 ms | **Óptimo** |
| `/api/vehiculos/` | `GET` | `200` | **6** | **4** | 5.51 ms | 2.45 ms | ⚠️ **ALERTA N+1 DETECTADA** |
| `/api/ordenes/` | `GET` | `200` | **2** | 0 | 5.40 ms | 1.12 ms | **Óptimo** |
| `/api/facturas/` | `GET` | `200` | **1** | 0 | 2.48 ms | 0.74 ms | **Óptimo** |
| `/api/turnos/` | `GET` | `200` | **2** | 0 | 4.34 ms | 1.05 ms | **Óptimo** |
| `/api/ordenes/{id}/` | `GET` | `200` | **4** | 0 | 7.20 ms | 1.88 ms | **Óptimo** |
| `/api/ordenes/{id}/items/` | `GET` | `200` | **6** | **3** | 6.22 ms | 2.61 ms | ⚠️ **ALERTA N+1 DETECTADA** |
| `/api/clientes/{id}/` | `GET` | `200` | **1** | 0 | 1.83 ms | 0.62 ms | **Óptimo** |
| `/api/vehiculos/{id}/historial/` | `GET` | `200` | **5** | 0 | 5.27 ms | 1.95 ms | **Óptimo** |

---

## 5. Análisis Detallado de Cuellos de Botella y Consultas Duplicadas

### 5.1. Cuello de Botella 1: Bucle N+1 en Listado de Vehículos (`/api/vehiculos/`)
* **Síntoma:** Al solicitar el listado general de vehículos, el serializer evalúa la relación hacia mantenimientos programados de forma individual por cada instancia recuperada:
  ```sql
  -- Consulta repetida N veces (una por cada vehículo en la base de datos):
  SELECT "vehiculos_mantenimientoprogramado"."id",
         "vehiculos_mantenimientoprogramado"."vehiculo_id",
         "vehiculos_mantenimientoprogramado"."tipo_servicio", ...
  FROM "vehiculos_mantenimientoprogramado"
  WHERE "vehiculos_mantenimientoprogramado"."vehiculo_id" = ?
  ```
* **Impacto:** Con un crecimiento a 100 vehículos, la consulta generará más de 100 queries SQL individuales en lugar de 2 consultas consolidadas.
* **Solución asignada a:** **TK168 (#253)** mediante `prefetch_related('mantenimientos')` en el queryset base de `CrearVehiculoView`.

---

### 5.2. Cuello de Botella 2: Bucle N+1 en Ítems de Presupuesto (`/api/ordenes/{id}/items/`)
* **Síntoma:** Cada ítem de presupuesto consulta sus adjuntos de diagnóstico de manera aislada:
  ```sql
  -- Consulta repetida N veces (una por cada ítem de presupuesto):
  SELECT "ordenes_adjuntodiagnostico"."id",
         "ordenes_adjuntodiagnostico"."orden_trabajo_id",
         "ordenes_adjuntodiagnostico"."item_presupuesto_id", ...
  FROM "ordenes_adjuntodiagnostico"
  WHERE "ordenes_adjuntodiagnostico"."item_presupuesto_id" = ?
  ```
* **Impacto:** Degrada el tiempo de carga del modal de ítems a medida que el expediente incorpora más intervenciones.
* **Solución asignada a:** **TK168 (#253)** y **TK183 (#227)** mediante `prefetch_related('adjuntos')`.

---

### 5.3. Cuello de Botella 3: Listados sin Paginación Uniforme
* **Síntoma:** Endpoints como `/api/clientes/` y `/api/vehiculos/` retornan arreglos directos JSON `[...]` sin metadatos de paginación (`count`, `next`, `previous`, `results`), mientras que `/api/facturas/` y `/api/ordenes/` emplean paginación estándar.
* **Solución asignada a:** **TK170 (#248)** configurando `PageNumberPagination` global y adaptando los servicios de Angular.

---

## 6. Procedimiento de Reproducción y Verificación

Cualquier miembro del equipo de desarrollo o revisor puede reproducir y verificar las mediciones de consultas SQL siguiendo estos pasos:

### 6.1. Ejecución del Comando de Auditoría
Desde la carpeta `backend/`:
```bash
# Ejecutar auditoría estándar con tabla en consola:
python manage.py audit_performance

# Ejecutar auditoría con datos semilla y exportación directa a Markdown:
python manage.py audit_performance --seed-volume --format=table --output=../docs/reporte_queries_backend_baseline.md
```

### 6.2. Verificación de la Suite de Pruebas Unitarias
Para validar la integridad del módulo de auditoría y su funcionamiento hermético:
```bash
python manage.py test core.tests.AuditPerformanceCommandTests
```

---

## 7. Conclusiones

La línea base ha quedado formalmente registrada con evidencia empírica. Se ha comprobado que el sistema presenta un comportamiento ágil en lecturas individuales (< 10 ms), pero exhibe patrones clásicos de consultas **N+1** en relaciones foráneas no precargadas (`vehiculos` y `items_presupuesto`).

Con estos valores de referencia documentados, queda cumplido al 100% el alcance de **TK167 (#252)** y se habilitan de inmediato las tareas de optimización de **TK168 (#253)** y **TK183 (#227)**.

> **Consolidación Final:** Para consultar las métricas post-optimización, la erradicación total de consultas N+1 y las ganancias en Core Web Vitals, referirse al documento consolidado: [EVALUACION_OPTIMIZACIONES_RENDIMIENTO.md](EVALUACION_OPTIMIZACIONES_RENDIMIENTO.md) (**TK173 / #256**).

