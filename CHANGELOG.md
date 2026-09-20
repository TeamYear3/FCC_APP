# Changelog

Todos los cambios notables del proyecto FCC_APP se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto adhiere al [Versionado Semántico](https://semver.org/lang/es/).

---

## [0.3.0] - 2026-09-19 (Sprint 3)

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
- Campo `tipo_motor` (`nafta`, `diesel`, `hibrido`, `electrico`, `gnc`) en modelo `Vehiculo` con migración Django y selector en formulario de alta/edición (TK083, TK084).
- Clasificación de complejidad (`baja`, `media`, `alta`) y nuevo estado `EN_PAUSA` con registro de motivo en Órdenes de Trabajo (TK101).
- Conexión del Directorio de Clientes con API real y cálculo reactivo de métricas con Signals (TK085).
- Buscador dinámico en vivo multi-criterio y filtros por estado con plantilla de estado vacío `@empty` (TK086).
- Componente Modal / Drawer lateral de Expediente Clínico de Cliente con pestañas de titular, flota e historial de OTs (TK087).
- Infraestructura global de notificaciones toast flotantes con `ToastService` y `ToastComponent` (TK088).
- Alerta visual explícita mediante toast en `AuthInterceptor` ante expiración de sesión con código HTTP 401 (TK088).
- Toggle interactivo ver/ocultar contraseña e indicador de fortaleza de clave en Mi Perfil (TK089).
- Documentación técnica de persistencia híbrida NoSQL con MongoDB para auditoría, telemetría y eventos (TK107).
- Plan Maestro de Pruebas de Software bajo norma IEEE 829 con 25 casos de prueba oficiales y Plan de Gestión de la Configuración en `docs/`.
- Grilla interactiva de Órdenes de Trabajo con tabla responsive, paginación dinámica, badges semánticos y selección reactiva por clic y doble clic con foco en expediente (TK120).
- Endpoint formal `GET /api/ordenes/<pk>/pdf/` para exportación e impresión del comprobante oficial de Orden de Trabajo mediante ReportLab con desglose de repuestos y mano de obra (TK121).
- Integración de órdenes de trabajo activas y actividades diarias como eventos interactivos en la Agenda FullCalendar con navegación directa al expediente operativo (TK122).
- Vinculación de evidencias fotográficas (`AdjuntoDiagnostico`) a ítems específicos de presupuesto o nivel general con clave foránea `item_presupuesto` y migración de base de datos (TK123).
- Notificación en tiempo real vía WebSockets (`adjunto_actualizado`) para sincronización multidispositivo instantánea de fotos subidas y eliminadas entre teléfonos móviles y estaciones de escritorio (TK124).
- Captura de fotos en vivo directamente en el navegador con `navigator.mediaDevices.getUserMedia`, retícula de encuadre, vista previa y selector de vinculación a servicios (TK125).
- Modal visor de evidencias a pantalla completa con zoom interactivo al 175%, metadatos de autoría y fecha (TK125).
- Reestructuración definitiva del expediente técnico en 3 pestañas operativas: `Resumen`, `Carga de Mano de Obra y Repuestos` e `Imágenes` (TK126).
- Lista de servicios y repuestos reales sincronizados con base de datos en la pestaña Resumen con checkboxes de completado y barra de progreso porcentual (TK126).
- Botón operativo "Finalizar Orden y Pasar a Control" conectado con confirmación y transición formal de estado (TK127).
- Creación rápida e in situ de clientes y vehículos desde el formulario de órdenes de trabajo con modales integrados y auto-selección reactiva instantánea (TK096).
- Sugerencias predictivas y autocompletado inteligente de servicios y mano de obra con precarga de valores estándar y tiempos estimados (TK110).
- Restricción de permisos y modo Solo Lectura en la agenda de turnos para el rol de mecánicos/técnicos (TK102).
- Modal de registro de cobro y modalidad de pago (efectivo, transferencia, tarjeta) con actualización reactiva de badges de cobro en expediente (TK103).
- Autocompletado inteligente y cruzado de vehículo por cliente y de cliente por patente con debounce reactivo de 300ms en el formulario de OT (TK104).
- Flujo multicanal de confirmación y aprobación de presupuestos (WhatsApp, llamada, presencial) con conversión directa a estado EN PROCESO (TK091).
- Optimización Mobile-First y ergonomía táctil en taller: tarjetas condensadas en pantallas < 640px, targets táctiles mínimos de 44px y padding seguro para navegación móvil (TK105).
- Rediseño y expansión exhaustiva de la documentación `README.md` con arquitectura orientada a microservicios (diagrama Mermaid), guías de despliegue con y sin Docker, credenciales de prueba y catálogo integral de endpoints REST y WebSockets (TK080).

### Modificado

- Erradicación definitiva de pestañas y tareas mock desvinculadas del expediente técnico (eliminación de Amarok hardcodeada, pestañas aisladas de repuestos, pagos y notas) (TK126).
- Migración completa (100%) de plantillas y componentes Angular a la sintaxis moderna Control Flow de Angular 21 (`@if`, `@for`, `@switch`), erradicando directivas legadas `*ngIf` y `*ngFor` (TK117).
- Estandarización de iconografía vectorial SVG nativa con Google Material Symbols Outlined y eliminación de emojis genéricos en la interfaz (TK100).
- Desacople de vista estática de facturación en layout de administración para renderizar subrutas limpias de navegación.
- Configuración de `SECRET_KEY` mediante variables de entorno dinámicas en `settings/test.py` (TK106).
- Optimización de ancho de contenedores en todas las pantallas del sistema.
- Fallback a SQLite3 en configuración de desarrollo local.

### Corregido

- Configuración de `MEDIA_URL` y `MEDIA_ROOT` en Django y normalización de URLs relativas/absolutas en frontend para servir fotos de diagnóstico locales sin errores 404 (TK123).
- Mensajes de error legibles y descriptivos en el modal de actualización de estado ante rechazo de transiciones inválidas (HTTP 400) por precondiciones de la máquina de estados (TK127).
- Enrutamiento directo de subruta `/admin/facturacion` al componente de calendario tributario ARCA desacoplado (TK118).
- Búsqueda flexible multi-criterio `OR` en `ListarCrearOrdenTrabajoView` y enriquecimiento de `OrdenTrabajoSerializer` con datos desnormalizados de patente, titular y contacto (TK119).
- Imports opcionales de `daphne`, `channels` y `reportlab` para evitar errores en entornos sin esas dependencias.
- Dependencias de FullCalendar alineadas a v6 con tipos en tsconfig.
- Configuración de routing ASGI para WebSockets.
- Envío de correo sincrónico en tests para aislar SQLite.

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
