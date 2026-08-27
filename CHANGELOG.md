# Changelog

Todos los cambios notables del proyecto FCC_APP se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto adhiere al [Versionado Semántico](https://semver.org/lang/es/).

---

## [Sin release] - 2026-08-14 ~ 2026-08-26 (Sprint 3 - En progreso)

### Agregado

- Módulo de facturación electrónica con cliente ARCA para autorización de comprobantes y emisión de CAE (backend).
- Componente de emisión y gestión de facturas para el administrador (frontend).
- Calendario financiero con semaforización tributaria (frontend).
- Email de bienvenida con plantilla HTML y señal asíncrona para nuevos usuarios.
- Recuperación de contraseña con modelo PasswordResetToken, endpoints de solicitud/confirmación y plantilla de email.
- Servicio WebSocket con suscripción reactiva en vivo para notificaciones de estado de órdenes.
- Subida y almacenamiento de fotos de diagnóstico con Cloudinary.
- Formulario dinámico de presupuesto y checklist de seguimiento de progreso.
- Búsqueda universal multi-entidad con autocomplete integrado en el Navbar.
- Dashboard operativo del taller con endpoints de monitoreo y búsqueda de clientes.
- Módulo de configuración de perfil del administrador con formulario reactivo y validación de password.
- CRUD completo de turnos con validación de sobre-cupo, forzado, y agenda con FullCalendar.
- Mantenimientos programados de vehículos con alertas en el portal del cliente.
- Máquina de estados para órdenes de trabajo con precondiciones de transición y notificación WebSocket.
- Modificación y actualización de legajo de clientes registrados.

### Corregido

- Imports opcionales de `daphne`, `channels` y `reportlab` para evitar errores en entornos sin esas dependencias.
- Dependencias de FullCalendar alineadas a v6 con tipos en tsconfig.
- Configuración de routing ASGI para WebSockets.
- Envío de correo sincrónico en tests para aislar SQLite.

### Modificado

- Optimización de ancho de contenedores en todas las pantallas del sistema.
- Fallback a SQLite3 en configuración de desarrollo local.

---

## [0.2.0] - 2026-07-23 (Sprint 2)

### Agregado

- Endpoint `PUT/PATCH` para actualización de clientes con validación de DNI/CUIT inmutable.
- CRUD completo de vehículos con validación regex de patente y campo `nro_chasis` opcional.
- Endpoints de creación de órdenes de trabajo con `OrdenTrabajoSerializer` y envío de email en segundo plano.
- Ítems de presupuesto: serializers y endpoints para mano de obra (estándar y por hora) y repuestos.
- Cálculo automático de `monto_total` en órdenes mediante señales `post_save`/`post_delete`.
- Transición automática de estado a "En Presupuesto" al guardar el primer ítem.
- Notificación WebSocket de presupuesto integrada con señal `post_save`.
- Servicios de API en frontend para vehículos, órdenes y clientes con métodos de consulta.
- Formularios de alta de clientes, vehículos y órdenes de trabajo en el frontend.
- Componente selector de vehículo reutilizable.
- Navegación fluida entre módulos en el panel de administración.
- Mapeo dinámico de errores por campo en formularios.
- Edición de vehículo con patente bloqueada y modal de advertencia 409 Conflict.

### Corregido

- Habilitación de CORS y emisión de tokens JWT reales en desarrollo.

---

## [0.1.0] - 2026-07-16 (Sprint 1)

### Agregado

- Inicialización del proyecto con Docker Compose (Django, Angular, PostgreSQL, MongoDB, Redis).
- Backend Django con settings modulares (`base.py`, `development.py`, `production.py`) y dependencias segregadas.
- Frontend Angular con soporte integrado de Tailwind CSS.
- Plantilla de variables de entorno (`.env.example`) y `README.md` con guía de inicio.
- Modelo `Usuario` con roles (`admin`, `tecnico`, `cliente`) y hash Argon2.
- Autenticación Google OAuth con `djangorestframework-simplejwt` y endpoints de login, registro y refresh.
- Logout con blacklist de tokens JWT y pruebas unitarias.
- Permisos por rol en endpoints (`IsAdmin`, `IsTecnico`, `IsCliente`).
- Modelo `Cliente` con unicidad de CUIT/DNI y serializer con validación regex.
- Modelo `Vehiculo` con campos del DER, FK obligatoria a Cliente y migración.
- Modelo `OrdenTrabajo` con auto-generación de número.
- Guards de navegación (`RoleGuard`) y sistema de diseño MD3 en el frontend.
- Integración de Google OAuth en frontend con `AuthService` e interceptor 401 para refresco automático.
- Configuración de salida SMTP y servicio utilitario de email reutilizable.
- Claims de rol y email en el payload del JWT.

---

## [0.0.0] - 2026-06-08

### Agregado

- Commit inicial del repositorio.
