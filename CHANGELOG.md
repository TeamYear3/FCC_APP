# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [1.0.0] - 2026-10-17 (Sprint 4 - Release Oficial v1.0.0)

### Agregado

- Componente de pie de página (`app-footer`) con visualización de la versión oficial del sistema (`v1.0.0`) e indicador de estado en el margen derecho, integrado en el panel administrativo y portal del cliente.
- Portal del Cliente: Módulo interactivo de revisión, aprobación y rechazo formal de presupuestos con desglose específico de costos de mano de obra e insumos/repuestos y captura del motivo de rechazo (TK204).
- Portal del Cliente: Galería técnica de visualización de fotos de diagnóstico y avance de reparaciones mecánicas en tiempo real con visor ampliado a pantalla completa (TK205).
- Portal del Cliente: Formulario dinámico de reserva online de nuevos turnos con selección de vehículo, validación de fechas futuras y consulta reactiva de citas agendadas (TK207).
- Métricas y Reportes: Dashboard analítico de rentabilidad financiera del taller con filtros interactivos de periodo (mes, trimestre, año) y ranking de servicios más demandados con porcentajes y montos acumulados (TK210).
- Gestión Vehicular: Módulo administrativo de asignación y seguimiento de planes de mantenimiento preventivo programados por kilometraje en legajo de vehículo (TK211).
- Turnos y Notificaciones: Despacho automático de notificaciones por correo electrónico con plantillas HTML personalizadas ante agendamiento o reprogramación de turnos (TK212).
- Turnos: Comando automatizado para envío de recordatorios de turnos agendados en segundo plano con marca temporal de trazabilidad (TK203).
- Persistencia NoSQL (MongoDB): Registro inmutable de telemetría y respuestas estructuradas de la API de ARCA para auditoría fiscal (TK191).
- Persistencia NoSQL (MongoDB): Registro histórico y persistencia de eventos transmitidos por WebSockets (TK192).
- Persistencia NoSQL (MongoDB): Módulo de diagnósticos técnicos avanzados con almacenamiento de códigos de error OBD-II (TK193).
- Pirámide de Automatización y Aseguramiento de Calidad (V&V Sprint 4):
  - Suite de integración backend en Django REST Framework con base de datos PostgreSQL dedicada de pruebas, estandarización bajo patrón AAA y resolución dinámica de endpoints con `reverse()`, alcanzando más del 85% de cobertura verificada con `coverage.py` (AUT-BE-01 a AUT-BE-06, TK213, TK218-TK222).
  - Colección formal de API de caja negra en Postman v2.1 parametrizada con variables dinámicas de entorno, aserciones HTTP y validación de esquemas JSON, automatizada mediante CLI Newman con exportación de reportes HTML (AUT-API-01 a AUT-API-05, TK214, TK223-TK226).
  - Framework de pruebas E2E con Playwright implementando patrón Page Object Model (POM), selectores semánticos basados en `data-testid`, y arnés forense de captura de fallo reproducible con capturas de pantalla, video y archivos trace.zip (AUT-E2E-01 a AUT-E2E-07, TK215, TK227-TK232).
  - Auditorías de accesibilidad web bajo estándar WCAG 2.2 Nivel AA: pruebas automatizadas con `@axe-core/playwright`, mediciones de Google Lighthouse con metas ≥90 en desktop/mobile, checklist manual de 8 puntos y validación asistida con lector de pantalla NVDA (ACC-01 a ACC-05, ACC-BUG-01 a ACC-BUG-03, TK216, TK233-TK239).

### Modificado

- Optimización masiva de consultas del ORM de Django erradicando el problema de consultas N+1 mediante `select_related` y `prefetch_related` en los endpoints de clientes, vehículos y expediente de órdenes de trabajo (TK168, TK181, TK182, TK183).
- Estandarización de contratos de respuesta y paginación uniforme basada en páginas y tamaños de página en los listados de la API REST (TK170).
- Migración reactiva a utilidad `httpResource` en servicios Angular (`TallerService`, `ClienteService`, `TurnoService`) reduciendo suscripciones manuales y mejorando la integración con Signals (TK178).
- Configuración centralizada de arquitectura de canales y caché en memoria utilizando Redis como Channel Layer para Django Channels en despliegues distribuidos (TK172).
- Evaluación sistemática y documentación de la línea base de rendimiento, Core Web Vitals y optimizaciones secundarias (TK167, TK173).

### Corregido

- Guarda de idempotencia fiscal y bloqueo transaccional concurrente con `select_for_update` en la emisión de facturas para evitar comprobantes duplicados ante reintentos de red (TK200).
- Filtrado estricto de seguridad en el listado de turnos y adjuntos garantizando que los usuarios con rol de cliente solo puedan acceder a los registros asociados a su propio legajo (TK202, TK205).
- Forzado de estado inicial pendiente e invalidación de sobrecupo forzado para solicitudes emitidas desde el portal de autogestión de clientes (TK207).
- Corrección de tipado en interfaces de respuesta de mantenimientos programados (`porcentaje_desgaste`) y declaración de `lookup_url_kwarg` en vistas de detalle de vehículos (TK211).
- Ajuste de contraste de color en badges de estado y componentes del taller para garantizar conformidad con criterios de éxito WCAG (TK237).

---

## [0.3.1] - 2026-10-06 (Hotfix / Despliegue en Producción)

### Agregado
- Soporte para carga dinámica de variables de entorno mediante `python-dotenv` en `settings/base.py` buscando `.env` en la raíz del proyecto o en `backend/`.
- Configuración de `STATIC_ROOT` en Django para la recolección de archivos estáticos (`collectstatic`) en entornos de despliegue y producción.
- **CI/CD Automatizado para Windows Server:** Workflow de GitHub Actions (`.github/workflows/deploy.yml`) ejecutado mediante *self-hosted runner* en el VPS Windows Server. Automatiza la descarga de cambios desde `main`, instalación de dependencias, ejecución de migraciones en PostgreSQL, recolección de estáticos y reinicio del proceso en PM2.
- **Soporte de Archivos Estáticos con WhiteNoise:** Dependencia `whitenoise>=6.6.0` en `requirements/base.txt` y middleware `WhiteNoiseMiddleware` en `config/settings/base.py` con almacenamiento comprimido `CompressedManifestStaticFilesStorage`.

### Corregido
- **Presentación de Django Admin en Producción:** Resuelto el fallo de carga de estilos CSS, fuentes e iconos en el panel de administración (`404 Not Found` en `/static/admin/`) al habilitar el servicio de activos estáticos en Daphne ASGI.
- **Aislamiento de Almacenamiento en Pruebas:** Configurado `StaticFilesStorage` estándar en `config/settings/test.py` para prevenir advertencias de directorios faltantes durante la ejecución de la suite de pruebas unitarias.

---

## [0.3.0] - 2026-09-11 (Sprint 3 — Estabilización)

### Agregado
- **Módulo de Gestión Operativa de Taller:** Máquina de estados para órdenes de trabajo (OTs), flujo de presupuestación con ítems de mano de obra y repuestos, y control de checklist.
- **Agenda de Turnos:** Visualización e integración de calendario reactivo con FullCalendar y modal interactivo de gestión.
- **Generación de Comprobantes PDF:** Exportación formal de órdenes de trabajo en formato PDF con ReportLab.
- **Integración de Facturación Fiscal (ARCA):** Modelo `Factura` y arquitectura desacoplada para emisión electrónica.
- **Suite Integral de Pruebas Unitarias:** 190+ pruebas automatizadas en Django REST Framework sobre módulos de usuarios, clientes, vehículos, órdenes y facturación.

### Corregido
- **Concurrencia en Signals de Correo:** Mitigado bloqueo en signals de órdenes mediante ejecución asíncrona segura.

---

## [0.2.0] - 2026-08-28 (Sprint 2 — Órdenes y Taller)

### Agregado
- Modelado de órdenes de trabajo, vehículos y diagnóstico inicial con almacenamiento de adjuntos fotográficos.
- Notificaciones en tiempo real mediante Django Channels y WebSockets.

---

## [0.1.0] - 2026-06-19 (Sprint 1 — Arquitectura Base)

### Agregado
- Autenticación con JWT (`SimpleJWT`) y Google OAuth2 federado.
- Control de acceso basado en roles (RBAC: Administrador, Técnico, Cliente).
- Endpoints REST fundamentales para clientes y vehículos.
