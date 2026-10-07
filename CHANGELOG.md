# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [0.3.1] - 2026-10-06 (Hotfix)

### Agregado
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
