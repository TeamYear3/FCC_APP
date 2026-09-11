# Plan de Pruebas de Software — FCC_APP

**Proyecto:** FCC_APP — Sistema de Gestión Comercial y Operativa para Talleres Mecánicos  
**Organización:** TeamYear3 / Instituto Superior Politécnico Córdoba (ISPC)  
**Cátedra:** Práctica Profesionalizante / Proyecto Integrador  
**Estándar de Referencia:** IEEE 829 / ISO/IEC/IEEE 29119  
**Fecha:** Septiembre 2026  
**Versión del Documento:** 1.0.0 (Línea Base Formal de Calidad para Cátedra)  
**Versión del Software Asociada:** 0.3.0 (Cierre de Sprint 3 — Estabilización)  

> [!NOTE]
> **Aclaración sobre Versionado:** En este proyecto conviven dos numeraciones complementarias:
> - **Versión del Plan de Pruebas (`v1.0.0`):** Versión mayor formal del documento que representa la línea base aprobada por el equipo para la entrega académica.
> - **Versión de Release del Software (`v0.3.0`):** Versión del código fuente al cierre del Sprint 3 bajo SemVer 2.0.0 (incremento de estabilización previo a la release final `v1.0.0` para defensa oral).

---

## Tabla de Contenido

1. [Historial de Versiones](#1-historial-de-versiones)
2. [Información del Proyecto](#2-información-del-proyecto)
3. [Aprobaciones](#3-aprobaciones)
4. [Resumen Ejecutivo](#4-resumen-ejecutivo)
5. [Alcance de las Pruebas](#5-alcance-de-las-pruebas)
   - 5.1 [Elementos de Pruebas](#51-elementos-de-pruebas)
   - 5.2 [Nuevas Funcionalidades a Probar](#52-nuevas-funcionalidades-a-probar)
   - 5.3 [Pruebas de Regresión](#53-pruebas-de-regresión)
   - 5.4 [Funcionalidades a No Probar (Fuera del Alcance)](#54-funcionalidades-a-no-probar-fuera-del-alcance)
6. [Enfoque de Pruebas (Estrategia)](#6-enfoque-de-pruebas-estrategia)
7. [Criterios de Aceptación o Rechazo](#7-criterios-de-aceptación-o-rechazo)
   - 7.1 [Criterios de Aceptación](#71-criterios-de-aceptación)
   - 7.2 [Criterios de Suspensión](#72-criterios-de-suspensión)
   - 7.3 [Criterios de Reanudación](#73-criterios-de-reanudación)
8. [Entregables](#8-entregables)
9. [Recursos](#9-recursos)
   - 9.1 [Requerimientos de Entornos – Hardware](#91-requerimientos-de-entornos--hardware)
   - 9.2 [Requerimientos de Entornos – Software](#92-requerimientos-de-entornos--software)
   - 9.3 [Herramientas de Pruebas Requeridas](#93-herramientas-de-pruebas-requeridas)
   - 9.4 [Personal y Roles de Prueba](#94-personal-y-roles-de-prueba)
   - 9.5 [Entrenamiento](#95-entrenamiento)
10. [Planificación y Organización](#10-planificación-y-organización)
    - 10.1 [Procedimientos para las Pruebas](#101-procedimientos-para-las-pruebas)
    - 10.2 [Gestión de Defectos](#102-gestión-de-defectos)
    - 10.3 [Matriz de Responsabilidades (RACI)](#103-matriz-de-responsabilidades-raci)
    - 10.4 [Cronograma de Pruebas](#104-cronograma-de-pruebas)
    - 10.5 [Premisas](#105-premisas)
    - 10.6 [Dependencias y Riesgos](#106-dependencias-y-riesgos)
11. [Referencias](#11-referencias)
12. [Glosario](#12-glosario)

---

## 1. Historial de Versiones

| Fecha | Versión Doc. | Versión App | Autor(es) | Organización | Descripción del Cambio |
|---|---|---|---|---|---|
| 19/06/2026 | `v0.1.0` | `v0.1.0` | Laura Zarate, Cristian Vargas, Karina Quinteros | TeamYear3 / ISPC | Pruebas iniciales de arquitectura base: autenticación JWT, Google OAuth2, modelos y endpoints de Clientes y Vehículos (Sprint 1). |
| 28/08/2026 | `v0.2.0` | `v0.2.0` | Cristian Vargas, Laura Zarate, Karina Quinteros | TeamYear3 / ISPC | Cobertura de pruebas de Órdenes de Trabajo (OTs), presupuestos dinámicos, facturación electrónica ARCA (mock), agenda de turnos, diagnóstico por imágenes y notificaciones (Sprint 2). |
| 11/09/2026 | `v1.0.0` | `v0.3.0` | Cristian Vargas (QA Lead) | TeamYear3 / ISPC | Formalización y consolidación del Plan Detallado de Pruebas de Software bajo estándar IEEE 829. Pruebas de regresión total, criterios de estabilización, gestión de riesgos de concurrencia en signals y suite integral para Sprint 3. |

---

## 2. Información del Proyecto

| Parámetro | Detalle |
|---|---|
| **Empresa / Organización** | TeamYear3 — Instituto Superior Politécnico Córdoba (ISPC) |
| **Proyecto** | FCC_APP — Sistema de Gestión Comercial y Operativa para Talleres Mecánicos |
| **Fecha de preparación** | Septiembre 2026 |
| **Cliente / Beneficiario** | Full Check Car (Taller Mecánico Automotriz independiente) |
| **Patrocinador principal** | Cátedra de Práctica Profesionalizante / Ingeniería de Software — ISPC |
| **Líder de Proyecto (PM) / Scrum Master** | **Laura Zarate** |
| **Líder de Pruebas de Software (QA Lead)** | **Cristian Vargas** |
| **Líder de DevOps e Infraestructura** | **Karina Quinteros** |

---

## 3. Aprobaciones

Las firmas a continuación certifican la revisión y aprobación formal del presente Plan de Pruebas de Software. El cumplimiento de los criterios aquí expuestos constituye condición obligatoria para la aceptación y liberación del producto en cada línea base.

| Nombre y Apellido | Cargo / Rol | Organización | Fecha | Estado / Firma |
|---|---|---|---|---|
| **Laura Zarate** | Product Manager & Scrum Master | TeamYear3 / ISPC | 11/09/2026 | Aprobado |
| **Cristian Vargas** | QA Lead & Fullstack Developer | TeamYear3 / ISPC | 11/09/2026 | Aprobado |
| **Karina Quinteros** | DevOps Lead | TeamYear3 / ISPC | 11/09/2026 | Aprobado |
| **Cátedra Evaluadora** | Docente Titular / Revisor Técnico | ISPC | Pendiente | Pendiente de Revisión Final |

---

## 4. Resumen Ejecutivo

El presente documento constituye el **Plan de Pruebas de Software** para la plataforma **FCC_APP**, un sistema integral de gestión operativa, comercial y técnica desarrollado para el taller mecánico automotriz *Full Check Car*.

### 4.1 Propósito
Establecer el marco metodológico, los criterios técnicos, la asignación de recursos, el cronograma y la batería de pruebas necesarias para certificar que el software cumple de manera rigurosa con los Requerimientos Funcionales (RF), Requerimientos No Funcionales (RNF), las Historias de Usuario (HU) y los estándares de seguridad definidos en los acuerdos de la **Definition of Done (DoD)** de los Sprints 2 y 3.

### 4.2 Clasificación del Plan y Relación con el Ciclo Scrum

**Clasificación Formal:** En cumplimiento explícito con las directrices de la plantilla oficial de la cátedra, se establece formalmente que el presente documento constituye un **Plan Detallado de Pruebas** (*Detailed Test Plan*) centrado en la estabilización, regresión y validación de aceptación del **Sprint 3 (Software `v0.3.0` / Documento `v1.0.0`)**, consolidando e integrando a su vez el marco estratégico y los criterios acumulativos de los Sprints 1 y 2 para todo el ciclo de vida del producto:
- **Sprint 1 (Software `v0.1.0`):** Pruebas de infraestructura Docker, seguridad perimetral (JWT/OAuth2) y consistencia de datos fundacionales (Clientes y Vehículos).
- **Sprint 2 (Software `v0.2.0`):** Pruebas funcionales de los flujos neurálgicos del negocio: Órdenes de Trabajo con máquina de estados, presupuestación con cálculo reactivo de subtotales/IVA, facturación fiscal ARCA con generación de CAE, agenda interactiva con FullCalendar y mensajería en tiempo real por WebSockets.
- **Sprint 3 (Software `v0.3.0` / Documento `v1.0.0`):** Fase de **estabilización, regresión total, resolución de deuda técnica y certificación de calidad** previa a la entrega final. En esta fase no se incorporan requerimientos funcionales nuevos, concentrando el 100% del esfuerzo en la solidez de la suite de pruebas automatizadas y la mitigación de defectos de concurrencia.

### 4.3 Restricciones Principales
- **Entorno de ejecución:** Proyecto académico con infraestructura local orquestada mediante Docker y bases de datos relacionales PostgreSQL en entornos integrados, empleando motores SQLite optimizados para la ejecución veloz de la suite de pruebas unitarias.
- **Dependencias de terceros:** Los servicios de entidades externas críticas (Servicio Web de Facturación Electrónica de ARCA, autenticación Google OAuth2 y envío de correos SMTP) se validan en las pruebas automatizadas mediante dobles de prueba (*Mocks* y *Fakes*) para garantizar idempotencia, aislamiento y ejecución sin costo ni dependencia de red externa.

---

## 5. Alcance de las Pruebas

### 5.1 Elementos de Pruebas

Los elementos bajo prueba comprenden la totalidad de la solución fullstack distribuida en el repositorio `FCC_APP`:

#### A. Backend API REST (Django 5.0.6 + Django REST Framework 3.15.2)
Compuesto por 8 aplicaciones Django modulares más subsistemas de infraestructura y soporte:

| Módulo / App | Archivos de Prueba | Cobertura Funcional y Técnica |
|---|---|---|
| `usuarios` | `tests.py`<br>`tests_busqueda.py` | Autenticación local, token JWT (emisión, refresco, revocación en blacklist), integración con Google OAuth2, recuperación de contraseñas, roles de usuario (`ADMIN`, `TECNICO`, `CLIENTE`) y buscador transversal del sistema. |
| `clientes` | `tests.py` | ABM de clientes, validación de formato y unicidad estricta de CUIT/DNI, filtros de búsqueda, integridad referencial y validadores en serializers. |
| `vehiculos` | `tests.py` | ABM de vehículos, validación de patente (formato clásico `AAA123` y Mercosur `AA123AA`), número de chasis (VIN de 17 caracteres), kilometraje no decreciente, reasignación de propietario, historial de mantenimientos y borrado lógico (*soft-delete*). |
| `ordenes` | `tests.py` | Ciclo de vida completo de la Orden de Trabajo (OT) mediante máquina de estados (`RECIBIDO`, `EN_DIAGNOSTICO`, `PRESUPUESTADO`, `APROBADO`, `EN_REPARACION`, `FINALIZADO`, `ENTREGADO`, `CANCELADO`), signals de actualización, cálculo automático de items, repuestos, mano de obra y subtotales. |
| `facturacion` | `tests.py` | Generación de facturas (A, B, C), liquidación impositiva (IVA 21%, 10.5%), integración mock con Web Service de ARCA para obtención de CAE, vencimiento de CAE y comprobantes en PDF. |
| `turnos` | `tests.py` | Creación y administración de turnos, validación de conflictos horarios, cupos máximos simultáneos y asignación de mecánicos. |
| `taller` | `tests.py` | Consolidación de métricas de productividad, estado de boxes, KPIs de facturación mensual y dashboard del taller. |
| `core` | `tests.py` | Clases base, paginadores universales, manejador centralizado de excepciones y utilidades compartidas. |
| `diagnosticos` | `tests.py` (integrado) | Carga y asociación de fotografías del estado del vehículo vinculadas a Cloudinary con URLs seguras. |
| `infrastructure/email` | `tests.py` (integrado) | Renderizado y despacho de plantillas HTML para correos transaccionales (bienvenida, presupuesto, cambio de estado de OT). |

#### B. Frontend SPA (Angular 19/20 + Tailwind CSS)
Estructura modular orientada a componentes, servicios reactivos e interceptores HTTP, cubiertos por 26 archivos de especificación (`*.spec.ts`):
- `admin`: Panel directivo, dashboard de métricas del taller, calendario de turnos y liquidaciones.
- `autenticacion`: Formularios de login con feedback visual, flujo Google Sign-In y guardias de ruta (`auth.guard`, `role.guard`).
- `clientes`: Listados reactivos con ordenamiento y formularios reactivos con validaciones asíncronas.
- `vehiculos`: Fichas técnicas, alertas de kilometraje y formularios de alta/edición.
- `ordenes`: Kanban/listado de OTs, modal interactivo de diagnóstico, cotizador dinámico de items y vista de estados.
- `portal-cliente`: Vista simplificada para clientes con consulta de estado en tiempo real y aprobación digital de presupuestos.
- `configuracion`: Modal de perfil de usuario y preferencias.
- `acceso-denegado`: Interfaz de captura de errores HTTP 403 con redireccionamiento guiado.
- `facturacion`: Visualizador y generador de comprobantes fiscales.

#### C. Planilla de Casos de Prueba del Sistema (Estructura Oficial de Cátedra)

Conforme a los lineamientos y estructura requeridos por la cátedra para la especificación de pruebas manuales y funcionales, se presenta la planilla de casos organizada en **4 módulos clave del sistema** con **5 casos de prueba exhaustivos por módulo** (20 casos de prueba en total). Cada caso define sus 10 atributos reglamentarios:

> [!NOTE]
> **Estado de la Planilla en el Plan de Pruebas:**
> En estricta conformidad con las buenas prácticas de ingeniería de software bajo estándar IEEE 829, este documento constituye la **especificación formal y diseño previo de los casos de prueba**. Por consiguiente, las columnas *Resultado Real* y *Estado (Pass/Fail)* se encuentran catalogadas en estado **`Pendiente`**, listas para ser completadas con sus respectivas evidencias durante la ejecución formal del ciclo de pruebas de aceptación y entrega.

##### Módulo 1: Ingreso sin Registro (Flujo de Invitado y Seguridad Perimetral)

| ID Caso | Módulo | Descripción del Caso | Precondiciones | Pasos de Ejecución | Resultado Esperado | Prioridad | Resultado Real | Estado (Pass/Fail) | Evidencia / Notas |
|---|---|---|---|---|---|:---:|---|:---:|---|
| **TEST-G-001** | Ingreso/Invitado | Acceso a la página principal del taller (Landing Page) | Ninguna (usuario anónimo sin sesión activa). | 1. Abrir navegador en la URL raíz (`/`).<br>2. Comprobar la carga de la interfaz. | La interfaz de usuario (Angular SPA) carga completamente, renderiza el banner corporativo, información pública del taller, servicios mecánicos y botón "Iniciar Sesión". | **Alta** | *Pendiente* | **Pendiente** | Adjuntar captura de pantalla de la Landing y verificar consola de red. |
| **TEST-G-002** | Ingreso/Invitado | Intento de acceso directo por URL a ruta administrativa protegida | Usuario anónimo (no autenticado). | 1. Ingresar manualmente en la barra de direcciones `/admin`, `/ordenes` o `/dashboard`.<br>2. Presionar Enter. | El guardia de rutas (`auth.guard`) intercepta la petición, deniega el renderizado del componente protegido y redirige automáticamente al formulario `/login` o `/acceso-denegado`. | **Alta** | *Pendiente* | **Pendiente** | Registrar URL de redirección final y código HTTP de red. |
| **TEST-G-003** | Ingreso/Invitado | Consulta pública de estado de vehículo en Portal Cliente | Existe en base de datos una Orden de Trabajo activa para un vehículo. | 1. Navegar a `/portal-cliente/consulta`.<br>2. Ingresar patente (`AA123AA`) o token de consulta.<br>3. Clic en "Consultar Estado". | La interfaz muestra de forma segura la línea de tiempo del progreso del vehículo (en diagnóstico, en reparación, listo) sin divulgar datos personales de otros clientes. | **Media** | *Pendiente* | **Pendiente** | Verificar que la respuesta JSON no exponga datos de contacto ni fiscales. |
| **TEST-G-004** | Ingreso/Invitado | Rechazo de peticiones anónimas a la API REST de backend | Cliente HTTP (Postman / cURL) sin encabezado `Authorization`. | 1. Enviar solicitud `GET` al endpoint protegido `/api/v1/clientes/` o `/api/v1/ordenes/`. | La API REST de Django rechaza la solicitud devolviendo código de estado `HTTP 401 Unauthorized` con payload JSON descriptivo. | **Crítica** | *Pendiente* | **Pendiente** | Adjuntar captura de respuesta Postman con headers y código 401. |
| **TEST-G-005** | Ingreso/Invitado | Consulta de disponibilidad de turnos en calendario público | Servidor en ejecución con turnos asignados y cupos disponibles en BD. | 1. Navegar a `/turnos/disponibilidad`.<br>2. Seleccionar fecha en el calendario interactivo. | La interfaz visualiza únicamente los horarios y boxes libres del taller, ocultando identidades y datos de vehículos de los turnos ya tomados. | **Media** | *Pendiente* | **Pendiente** | Comprobar que los turnos ocupados no revelen datos de los clientes. |

##### Módulo 2: Usuarios Registrados (Login, Sesión y Control de Acceso RBAC)

| ID Caso | Módulo | Descripción del Caso | Precondiciones | Pasos de Ejecución | Resultado Esperado | Prioridad | Resultado Real | Estado (Pass/Fail) | Evidencia / Notas |
|---|---|---|---|---|---|:---:|---|:---:|---|
| **TEST-L-001** | Login/Sesión | Inicio de sesión exitoso con credenciales locales (Administrador) | Existe usuario con rol `ADMIN` registrado y activo en PostgreSQL. | 1. Navegar a `/login`.<br>2. Ingresar usuario/email y contraseña válida.<br>3. Clic en "Ingresar". | El backend emite tokens JWT (`access` y `refresh`), el frontend almacena los tokens en memoria/storage seguro y redirige al Dashboard con bienvenida y rol visible. | **Crítica** | *Pendiente* | **Pendiente** | Inspeccionar decodificación de payload JWT en DevTools (`role: ADMIN`). |
| **TEST-L-002** | Login/Sesión | Inicio de sesión mediante cuenta de Google (OAuth2) | Cuenta de Google activa; Client ID de OAuth2 configurado en backend y frontend. | 1. Navegar a `/login`.<br>2. Clic en "Continuar con Google".<br>3. Autorizar consentimiento en el popup de Google. | Google devuelve el `id_token`, el backend valida su firma con los servidores de Google, genera el par de tokens JWT de FCC_APP e inicia sesión. | **Alta** | *Pendiente* | **Pendiente** | Registrar intercambio de tokens con endpoint de autenticación social. |
| **TEST-L-003** | Login/Sesión | Intento de inicio de sesión con contraseña incorrecta | Usuario registrado previamente en la plataforma. | 1. Navegar a `/login`.<br>2. Ingresar email registrado.<br>3. Ingresar contraseña incorrecta.<br>4. Clic en "Ingresar". | La API rechaza la solicitud con `HTTP 401 Unauthorized`; la interfaz muestra mensaje de alerta: "Credenciales inválidas" sin indicar si falló el usuario o la contraseña. | **Alta** | *Pendiente* | **Pendiente** | Validar que el mensaje genérico no facilite enumeración de usuarios. |
| **TEST-L-004** | Login/Sesión | Control de acceso basado en roles (RBAC) — Restricción a vista Admin | Usuario autenticado con rol `CLIENTE`. | 1. Iniciar sesión como Cliente.<br>2. Forzar navegación manual a `/admin/configuracion` o enviar `POST` a `/api/v1/facturacion/`. | El frontend intercepta mediante `RoleGuard` y redirige a `/acceso-denegado`; la API de DRF responde `HTTP 403 Forbidden` bloqueando la operación. | **Crítica** | *Pendiente* | **Pendiente** | Adjuntar captura de pantalla de `/acceso-denegado` y respuesta 403. |
| **TEST-L-005** | Login/Sesión | Cierre de sesión (Logout) con invalidación de token en Blacklist | Usuario con sesión activa y token JWT de refresco válido. | 1. Clic en el menú de usuario en la barra superior.<br>2. Seleccionar "Cerrar Sesión".<br>3. Intentar renovar sesión con el token anterior. | El refresh token es enviado al endpoint de blacklist del backend, se destruyen las credenciales locales y cualquier intento de renovación posterior es rechazado. | **Crítica** | *Pendiente* | **Pendiente** | Verificar inclusión del token en tabla `token_blacklist_blacklistedtoken`. |

##### Módulo 3: Gestión de Datos una vez Logueado (CRUD Operativo del Taller)

| ID Caso | Módulo | Descripción del Caso | Precondiciones | Pasos de Ejecución | Resultado Esperado | Prioridad | Resultado Real | Estado (Pass/Fail) | Evidencia / Notas |
|---|---|---|---|---|---|:---:|---|:---:|---|
| **TEST-D-001** | Gestión/CRUD | Alta exitosa de un nuevo Cliente con validación fiscal | Usuario Administrador logueado con permisos de escritura. | 1. Navegar a `/clientes/nuevo`.<br>2. Completar nombre, apellido, CUIT/DNI válido, teléfono y email.<br>3. Clic en "Guardar Cliente". | El sistema valida el formato de CUIT/DNI, crea el registro en PostgreSQL, muestra alerta de confirmación y el cliente aparece de inmediato en la tabla principal. | **Crítica** | *Pendiente* | **Pendiente** | Adjuntar log de creación en base de datos y respuesta `HTTP 201`. |
| **TEST-D-002** | Gestión/CRUD | Registro de nuevo Vehículo vinculado a Cliente existente | Existe al menos un cliente dado de alta en el sistema. | 1. Navegar a `/vehiculos/nuevo`.<br>2. Seleccionar cliente propietario.<br>3. Ingresar patente Mercosur (`AA123AA`), marca, modelo y kilometraje.<br>4. Clic en "Guardar". | Se valida que la patente cumpla el formato legal y no esté duplicada. El vehículo queda vinculado al cliente con historial inicializado en 0 intervenciones. | **Crítica** | *Pendiente* | **Pendiente** | Verificar formato en mayúsculas y relación foránea con el cliente. |
| **TEST-D-003** | Gestión/CRUD | Creación de Orden de Trabajo (OT) y transición de estados | Vehículo y cliente existentes; taller con box disponible. | 1. Abrir OT para el vehículo en estado `RECIBIDO`.<br>2. Cargar diagnóstico preliminar y avanzar a `EN_DIAGNOSTICO`.<br>3. Cargar items de repuestos y mano de obra para pasar a `PRESUPUESTADO`. | La máquina de estados valida la transición secuencial, recalcula automáticamente subtotales e IVA y despacha señal de notificación al cliente. | **Crítica** | *Pendiente* | **Pendiente** | Registrar cálculo exacto de subtotales y cambio de estado en Kanban. |
| **TEST-D-004** | Gestión/CRUD | Edición de datos de contacto de Cliente y verificación reactiva | Cliente existente registrado previamente. | 1. Ubicar al cliente en el listado reactivo.<br>2. Clic en "Editar".<br>3. Modificar teléfono y dirección comercial.<br>4. Clic en "Actualizar". | La base de datos actualiza el registro (`HTTP 200 OK`) y la tabla de Angular se actualiza de inmediato mediante reactividad (Signals/RxJS) sin parpadeo ni recarga. | **Alta** | *Pendiente* | **Pendiente** | Comprobar actualización instantánea de la vista sin recargar la página. |
| **TEST-D-005** | Gestión/CRUD | Borrado lógico (*soft-delete*) de Vehículo con confirmación | Vehículo registrado con historial de reparaciones previas. | 1. Clic en el botón "Eliminar Vehículo" en la fila correspondiente.<br>2. Confirmar la advertencia en el modal emergente. | El vehículo se desactiva del catálogo activo (`activo=False`), desaparece de la vista operativa, pero su historial de OTs pasadas permanece inalterado en BD. | **Crítica** | *Pendiente* | **Pendiente** | Verificar con query SQL que el registro conserve `activo=False`. |

##### Módulo 4: Funcionalidad con Base de Datos e Integridad Backend

| ID Caso | Módulo | Descripción del Caso | Precondiciones | Pasos de Ejecución | Resultado Esperado | Prioridad | Resultado Real | Estado (Pass/Fail) | Evidencia / Notas |
|---|---|---|---|---|---|:---:|---|:---:|---|
| **TEST-DB-001** | Base de Datos | Validación de tipos de datos y rechazo de cargas malformadas | Usuario logueado con token JWT válido. | 1. Enviar mediante Postman/APIClient un `POST` a `/api/v1/vehiculos/` enviando en `kilometraje` una cadena alfanumérica (`"invalido"`). | El serializador de DRF intercepta el error de tipo antes de invocar al ORM y devuelve `HTTP 400 Bad Request` indicando que se requiere un entero válido. | **Alta** | *Pendiente* | **Pendiente** | Captura del payload de error con validación de campo devuelta por DRF. |
| **TEST-DB-002** | Base de Datos | Verificación de persistencia de datos (Read after Write) | Conexión activa a motor de base de datos relacional. | 1. Crear una OT con presupuesto e items asociados.<br>2. Cerrar la sesión de usuario.<br>3. Iniciar una nueva sesión y consultar la OT creada. | La totalidad de los datos (items, descripciones, cantidades, precios unitarios e IVA) se recuperan íntegros y exactamente como fueron grabados en la BD. | **Crítica** | *Pendiente* | **Pendiente** | Comparar valores grabados en base de datos contra los mostrados en UI. |
| **TEST-DB-003** | Base de Datos | Integridad referencial (Foreign Key Check) ante eliminaciones | Existe un Cliente con Vehículos y Órdenes de Trabajo vinculadas. | 1. Intentar enviar una solicitud `DELETE` directa sobre el ID del Cliente en la base de datos o API. | La base de datos y el ORM de Django impiden la eliminación física debido a la restricción `on_delete=models.PROTECT`, devolviendo error de integridad. | **Media** | *Pendiente* | **Pendiente** | Capturar excepción `ProtectedError` y verificar respuesta 400. |
| **TEST-DB-004** | Base de Datos | Unicidad estricta de claves naturales de negocio | Existe en el sistema un Cliente con DNI `35.123.456` y un Vehículo con Patente `AA123AA`. | 1. Intentar registrar un nuevo Cliente con el mismo DNI.<br>2. Intentar registrar un segundo Vehículo con la misma Patente. | La base de datos y los validadores de unicidad rechazan ambas operaciones emitiendo error de clave duplicada (`unique=True`). | **Crítica** | *Pendiente* | **Pendiente** | Confirmar denegación de duplicados y mensaje descriptivo de error. |
| **TEST-DB-005** | Base de Datos | Consistencia transaccional y prevención de bloqueos concurrentes en SQLite | Suite de pruebas unitarias ejecutando múltiples señales asíncronas. | 1. Ejecutar caso de prueba que actualice estado de OT disparando signals en segundo plano.<br>2. Verificar ausencia de cerrojos de tabla. | La implementación de `transaction.on_commit()` difiere la ejecución de señales hasta que la transacción de prueba confirma, evitando el error `OperationalError: database table is locked`. | **Crítica** | *Pendiente* | **Pendiente** | Registrar salida de consola de `python manage.py test ordenes`. |

---

#### D. Catálogo Complementario de Pruebas Unitarias Automatizadas Backend (Django TestCase)

A continuación se documenta el catálogo de pruebas automatizadas que conforman la base de la pirámide de testing implementadas en el código fuente de Django:

| Identificador | Módulo | Clase de Prueba | Caso de Prueba (`def test_*`) | Descripción y Resultado Esperado |
|---|---|---|---|---|
| `TC-AUTH-01` | `usuarios` | `UsuariosTests` | `test_registro_usuario_exitoso` | Verifica creación de usuario con credenciales válidas y rol asignado. HTTP 201 Created. |
| `TC-AUTH-02` | `usuarios` | `UsuariosTests` | `test_login_jwt_correcto` | Valida entrega de tokens `access` y `refresh` ante credenciales válidas. HTTP 200 OK. |
| `TC-AUTH-03` | `usuarios` | `UsuariosTests` | `test_login_password_invalida` | Comprueba rechazo de autenticación con contraseña incorrecta. HTTP 401 Unauthorized. |
| `TC-AUTH-04` | `usuarios` | `UsuariosTests` | `test_logout_blacklist_token` | Confirma que el token refresh revocado queda en blacklist y no permite renovar sesión. HTTP 200 OK. |
| `TC-AUTH-05` | `usuarios` | `UsuariosTests` | `test_acceso_endpoint_sin_token` | Rechazo de solicitudes anónimas a endpoints protegidos. HTTP 401 Unauthorized. |
| `TC-AUTH-06` | `usuarios` | `UsuariosTests` | `test_permisos_rol_cliente_en_admin` | Intento de usuario rol `CLIENTE` accediendo a endpoints de administración. HTTP 403 Forbidden. |
| `TC-BUSQ-01` | `usuarios` | `BusquedaTransversalTests` | `test_busqueda_global_por_dni` | Búsqueda transversal por DNI de cliente que retorna cliente, vehículos asociados y OTs. |
| `TC-BUSQ-02` | `usuarios` | `BusquedaTransversalTests` | `test_busqueda_global_por_patente` | Búsqueda transversal por patente vehicular que devuelve ficha del auto y su historial. |
| `TC-CLI-01` | `clientes` | `ClientesTests` | `test_crear_cliente_valido` | Registro exitoso de cliente con datos completos y formato legal de CUIT/DNI. HTTP 201. |
| `TC-CLI-02` | `clientes` | `ClientesTests` | `test_rechazo_dni_duplicado` | Validación de regla de negocio: no se permiten dos clientes con el mismo DNI/CUIT. HTTP 400 Bad Request. |
| `TC-CLI-03` | `clientes` | `ClientesTests` | `test_filtrar_clientes_por_apellido` | Comprobación de filtros de búsqueda parcial por apellido. HTTP 200. |
| `TC-VEH-01` | `vehiculos` | `VehiculosTests` | `test_alta_vehiculo_patente_mercosur` | Registro de vehículo con patente formato Mercosur (`AA123AA`). HTTP 201. |
| `TC-VEH-02` | `vehiculos` | `VehiculosTests` | `test_alta_vehiculo_patente_clasica` | Registro de vehículo con patente formato tradicional (`AAA123`). HTTP 201. |
| `TC-VEH-03` | `vehiculos` | `VehiculosTests` | `test_rechazo_patente_formato_invalido` | Denegación de alta ante patentes fuera de norma. HTTP 400 Bad Request. |
| `TC-VEH-04` | `vehiculos` | `VehiculosTests` | `test_unicidad_patente_y_chasis` | Falla de inserción al intentar duplicar patente o chasis (VIN). HTTP 400. |
| `TC-VEH-05` | `vehiculos` | `VehiculosTests` | `test_actualizar_kilometraje_menor_rechazado` | Regla de integridad: el nuevo kilometraje no puede ser inferior al registrado previamente. |
| `TC-VEH-06` | `vehiculos` | `VehiculosTests` | `test_soft_delete_vehiculo` | El borrado de un vehículo desactiva la entidad sin destruir el historial en base de datos. |
| `TC-ORD-01` | `ordenes` | `OrdenesTests` | `test_crear_orden_trabajo_inicial` | Creación de OT vinculada a vehículo y cliente, naciendo en estado `RECIBIDO`. HTTP 201. |
| `TC-ORD-02` | `ordenes` | `OrdenesTests` | `test_transicion_estados_valida` | Avance ordenado: `RECIBIDO` → `EN_DIAGNOSTICO` → `PRESUPUESTADO`. |
| `TC-ORD-03` | `ordenes` | `OrdenesTests` | `test_transicion_estado_invalida_rechazada` | Intento de salto de estado ilegal (p. ej., de `RECIBIDO` directamente a `ENTREGADO`). HTTP 400. |
| `TC-ORD-04` | `ordenes` | `OrdenesTests` | `test_calculo_presupuesto_con_items` | Incorporación de mano de obra y repuestos; verificación del cálculo exacto del total. |
| `TC-ORD-05` | `ordenes` | `OrdenesTests` | `test_aprobacion_presupuesto_por_cliente` | El cliente autenticado aprueba su presupuesto pasando la OT a `APROBADO`. |
| `TC-FAC-01` | `facturacion` | `FacturacionTests` | `test_emitir_factura_con_cae_mock` | Emisión fiscal de factura solicitando CAE al mock de ARCA; verificación de CAE y fecha vencimiento. |
| `TC-FAC-02` | `facturacion` | `FacturacionTests` | `test_no_facturar_ot_no_finalizada` | Impedimento de emitir factura sobre órdenes que aún no alcanzaron el estado `FINALIZADO`. HTTP 400. |
| `TC-TUR-01` | `turnos` | `TurnosTests` | `test_agendar_turno_disponible` | Reserva exitosa de turno en fecha/hora sin colisión. HTTP 201. |
| `TC-TUR-02` | `turnos` | `TurnosTests` | `test_rechazo_turno_sobrecupo` | Intento de reserva en horario saturado superando la capacidad de boxes del taller. HTTP 400. |
| `TC-TAL-01` | `taller` | `TallerTests` | `test_metricas_dashboard_acumulado` | Comprobación de agregaciones matemáticas: conteo de OTs activas, vehículos en reparación y facturación total. |

---

### 5.2 Nuevas Funcionalidades a Probar

Conforme a la planificación oficial del Sprint 2 y el hito de consolidación del Sprint 3, las siguientes funcionalidades se prueban integralmente desde la **perspectiva del usuario final**:

1. **Dashboard Operativo y Financiero del Taller (Vista Administrador):**
   - Visualización de tarjetas de KPIs: órdenes activas, vehículos en taller, monto acumulado facturado y turnos del día.
   - Gráficos de productividad de mecánicos y distribución de estados de reparación.
2. **Facturación Fiscal Electrónica ARCA (Vista Administrador):**
   - Solicitud de autorización de comprobantes y recepción inmediata de número de CAE.
   - Generación, previsualización e impresión del comprobante de factura con desglose impositivo reglamentario.
3. **Agenda Inteligente de Turnos (Vista Administrador y Técnico):**
   - Calendario interactivo semanal/mensual con código de colores según tipo de servicio.
   - Bloqueo proactivo de sobre-cupo cuando los boxes se encuentran al 100% de ocupación.
4. **Inspección Digital y Diagnóstico por Imágenes (Vista Técnico):**
   - Carga interactiva de fotografías del estado estético del vehículo al ingresar al taller.
   - Checklist digital de daños preexistentes y registro de observaciones técnicas.
5. **Notificaciones Automáticas por Correo Electrónico (Vista Cliente):**
   - Recepción automática de correo de confirmación al recibir el vehículo en el taller.
   - Recepción de aviso con enlace directo cuando el presupuesto técnico está listo para su aprobación.
   - Notificación de "Vehículo Listo para Retiro" cuando la OT alcanza el estado `FINALIZADO`.
6. **Actualizaciones en Tiempo Real vía WebSockets (Vista Técnico y Cliente):**
   - Refresco instantáneo de las tarjetas del tablero Kanban al cambiar el estado de una OT sin recargar la página.
7. **Portal de Transparencia para el Cliente (Vista Cliente):**
   - Acceso seguro mediante credenciales propias o enlace seguro.
   - Línea de tiempo visual del progreso de la reparación del vehículo.
   - Botones de acción directa: "Aprobar Presupuesto" o "Rechazar Presupuesto" con registro de firma/auditoría.
8. **Buscador Transversal Unificado:**
   - Barra de búsqueda superior accesible para Administrador y Técnico que localiza de forma inmediata clientes por DNI/Apellido, vehículos por patente y órdenes por número de expediente.

---

### 5.3 Pruebas de Regresión

Las pruebas de regresión aseguran que las funcionalidades consolidadas en el Sprint 1 permanezcan operativas e inalteradas tras las incorporaciones de los Sprints 2 y 3:

- **Autenticación e Identidad:**
  - Emisión de JWT con tiempo de expiración estándar (60 minutos de acceso, 7 días de refresco).
  - Flujo de revocación de tokens en cierre de sesión (`blacklist`).
  - Inicio de sesión mediante cuenta de Google (OAuth2 social login).
- **Integridad de Clientes y Vehículos:**
  - Persistencia de unicidad para claves naturales (CUIT/DNI, Patente y Chasis).
  - Comprobación de que la edición de un cliente no desvincule ni corrompa sus vehículos asociados.
  - Comprobación de que la desactivación lógica (*soft-delete*) de un vehículo conserve intacto su historial de órdenes pasadas.
- **Control de Acceso Basado en Roles (RBAC):**
  - Validación sistemática de que ninguna ruta administrativa de backend devuelva datos a usuarios con credenciales de rol `CLIENTE` o `TECNICO` no autorizado (códigos de respuesta obligatorios HTTP 401 y HTTP 403).

---

### 5.4 Funcionalidades a No Probar (Fuera del Alcance)

En total consonancia con el documento oficial de alcance del proyecto (`Alcance.md`), las siguientes características **no forman parte del alcance de las pruebas** del MVP:

| Característica Excluida | Justificación Técnica / Operativa | Riesgo Asumido |
|---|---|---|
| **Aplicaciones Móviles Nativas (iOS / Android)** | El MVP se diseñó bajo arquitectura Web SPA Responsive; no existen ejecutables nativos compilados para tiendas móviles. | La experiencia en pantallas móviles se valida exclusivamente vía emulación responsive de navegador web. |
| **Pasarelas de Pago Bancarias Reales (Stripe / Mercado Pago)** | El taller registra transacciones de cobro internas (efectivo, transferencia, tarjeta en terminal física POS), sin integración de cobro online en el MVP. | No se prueba comunicación directa con redes interbancarias ni conciliación de acreditaciones online. |
| **Gestión de Stock e Inventario Multi-Sucursal** | El alcance contractual contempla únicamente una sede operativa (*Full Check Car* Casa Central). | No se prueban transferencias inter-depósitos ni sincronización entre sedes remotas. |
| **API Oficial de WhatsApp Business** | Excluida del alcance del MVP por costos de infraestructura y verificación empresarial de Meta; la mensajería transaccional se gestiona por correo SMTP. | No se ensayan envíos de mensajes directos por mensajería instantánea. |
| **Módulos Avanzados de Business Intelligence / ML** | Las analíticas del taller son agregaciones directas de bases de datos relacionales (KPIs operacionales); no se contempla minería de datos ni analítica predictiva. | No se aplican pruebas de modelos estadísticos ni algoritmos de aprendizaje automático. |
| **Servidor SMTP en Entorno de Pruebas Unitarias** | La suite automatizada de pruebas utiliza el backend de correo en memoria (`django.core.mail.backends.locmem.EmailBackend`), evitando el envío de correos reales en cada corrida. | El protocolo SMTP real solo se ensaya en pruebas de integración controladas en staging. |
| **Pruebas de Estrés Masivo (>10.000 concurrentes)** | El sistema está dimensionado para la escala real del taller mecánico (concurrencia estimada: 10 a 50 usuarios simultáneos). | No se certifica el comportamiento ante ataques distribuidos de denegación de servicio o saturación extrema. |

---

## 6. Enfoque de Pruebas (Estrategia)

### 6.1 Pirámide de Testing
El equipo adopta el modelo de pirámide de automatización de pruebas, maximizando la cobertura en la base (pruebas unitarias veloces e independientes) y reduciendo la proporción de pruebas manuales de extremo a extremo:

```
                  ┌────────────────────────┐
                  │       E2E Manual       │  ← Navegación visual y validación UX
                  │     (5% Esfuerzo)      │
                  ├────────────────────────┤
                  │   Integración de API   │  ← DRF APITestCase, contratos JSON,
                  │     (25% Esfuerzo)     │    códigos HTTP, flujos de base de datos
                  ├────────────────────────┤
                  │   Pruebas Unitarias    │  ← Django TestCase (Modelos, Serializers,
                  │     (70% Esfuerzo)     │    Validadores) + Angular Spec (Services)
                  └────────────────────────┘
```

### 6.2 Niveles y Tipos de Pruebas

1. **Pruebas Unitarias (Backend & Frontend):**
   - *Backend:* Ejecutadas mediante el runner nativo de Django (`python manage.py test`). Validan el aislamiento de métodos de negocio, reglas de cálculo, transformaciones en serializers y restricciones de modelo.
   - *Frontend:* Ejecutadas mediante Jasmine / Angular CLI (`ng test`). Validan el ciclo de vida de componentes, inyección de dependencias de servicios y formateadores de pipes.
2. **Pruebas de Integración (API REST):**
   - Empleo de `rest_framework.test.APITestCase` y `APIClient` para simular peticiones HTTP reales (GET, POST, PUT, PATCH, DELETE).
   - Verificación de contratos JSON: estructura de respuesta, tipos de datos, códigos de estado HTTP y mensajes de validación ante payloads defectuosos.
3. **Pruebas de Seguridad y Control de Acceso (RBAC):**
   - Validación sistemática de la matriz de permisos por rol.
   - Comprobación de que la inyección de encabezados `Authorization: Bearer <token>` reconozca adecuadamente los privilegios del usuario.
   - Verificación de respuestas `HTTP 401 Unauthorized` para tokens ausentes/expirados y `HTTP 403 Forbidden` para accesos no autorizados por rol.
4. **Pruebas de Regresión Continua:**
   - Todo nuevo commit o Pull Request ejecuta la suite completa de pruebas antes de autorizarse la fusión a las ramas `develop` o `main`.
5. **Pruebas de Interfaz y Usabilidad (Manual Exploratorio):**
   - Validación funcional en navegador web cotejando contra el prototipo interactivo de Figma: paleta cromática, espaciados, tipografías y responsividad en resoluciones Desktop (1920x1080, 1366x768) y Mobile (375x812).

### 6.3 Manejo de Datos de Prueba (Test Data Management)
- **Aislamiento por transacción:** Cada caso de prueba en Django corre dentro de una transacción de base de datos atómica que realiza un rollback automático al finalizar (`TestCase`), impidiendo contaminación entre ejecuciones.
- **Factorías de objetos en memoria:** Utilización de métodos utilitarios `setUpTestData` o helpers internos para instanciar clientes, vehículos y órdenes válidas con identificadores controlados.
- **Dobles de prueba (*Mocks*):** Los servicios que interactúan con APIs externas se interceptan mediante `unittest.mock.patch`:
  - `AFIP_WSAA` / `AFIP_WSFE`: Devuelve respuestas prefabricadas con CAE numérico (`74321890123456`) y estado de aprobación.
  - `CloudinaryUploader`: Retorna URLs HTTPS seguras simuladas sin subir binarios a los servidores de Cloudinary.
  - `django.core.mail`: Interceptado en el `mail.outbox` en memoria para verificar cantidad de correos enviados, destinatarios y contenido de plantillas.

---

## 7. Criterios de Aceptación o Rechazo

### 7.1 Criterios de Aceptación
Para considerar formalmente aprobado el ciclo de pruebas y autorizar una liberación (*Release*) a producción:
1. **100% de Pruebas Automatizadas Exitosas:** Ni una sola falla (`FAILURE` o `ERROR`) permitida en la suite de backend (`python manage.py test`) ni en la suite de frontend (`ng test`).
2. **Compilación Limpia de Producción:** El comando `ng build --configuration production` debe finalizar con código de salida 0, sin errores tipográficos de TypeScript ni advertencias de importación circular.
3. **Cumplimiento de la Definition of Done (DoD):**
   - Criterios de aceptación de cada Historia de Usuario verificados al 100%.
   - Revisión de código (*Code Review*) aprobada por al menos un revisor par en GitHub.
   - Documentación actualizada en el repositorio y en la wiki del proyecto.
   - Ausencia total de credenciales, secretos, API keys o tokens expuestos en el código fuente.

### 7.2 Criterios de Suspensión
La ejecución de las pruebas se detendrá de inmediato ante cualquiera de las siguientes contingencias:
1. **Fallas en Cascada:** Cuando más del 20% de los casos de prueba de un módulo fallen consecutivamente debido a una modificación estructural previa.
2. **Bloqueo en Migraciones de Base de Datos:** Imposibilidad de construir el esquema de base de datos (`python manage.py migrate --check` o errores de dependencias de migración).
3. **Quiebre del Módulo de Autenticación:** Errores en la emisión o decodificación de JWT que impidan a los testers y a la suite automatizada autenticar llamadas a la API.
4. **Bloqueo de Concurrencia en SQLite (*Database Table is Locked*):** Detección del error crítico `django.db.utils.OperationalError: database table is locked: ordenes_ordentrabajo` causado por la ejecución de hilos asíncronos o signals no coordinados durante la transacción de prueba.

### 7.3 Criterios de Reanudación
Las actividades de prueba se retomarán únicamente cuando:
1. El desarrollador responsable aplique un commit de reversión (*revert*) o un hotfix directo en su rama personal.
2. Para el bloqueo de SQLite: implementación de `transaction.on_commit()` en las señales de `ordenes/signals.py`, garantizando que las tareas en segundo plano esperen el cierre de la transacción de prueba antes de intentar escrituras.
3. Validación en el entorno local del tester de que el caso testigo causante de la suspensión ahora ejecuta en verde de manera repetible.

---

## 8. Entregables

Al culminar las actividades de testing, el equipo generará y pondrá a disposición los siguientes artefactos:

| Entregable | Formato / Ubicación | Descripción | Responsable |
|---|---|---|---|
| **Plan de Pruebas de Software** | Markdown (`FCC_APP/docs/PLAN_DE_PRUEBAS_DE_SOFTWARE.md`) y exportación a PDF | Este documento con la planificación, estrategia, alcance y criterios del testing. | Cristian Vargas (QA Lead) |
| **Suites de Pruebas Automatizadas Backend** | Código fuente Python (`backend/**/tests*.py`) | 9 archivos con más de 50 casos de prueba automatizados en Django. | Cristian Vargas |
| **Suites de Pruebas Automatizadas Frontend** | Código fuente TypeScript (`frontend/**/*.spec.ts`) | 26 archivos de especificación para componentes y servicios Angular. | Laura Zarate |
| **Matriz de Trazabilidad Actualizada** | Markdown (`wiki/Matriz-de-Trazabilidad.md`) y Google Docs | Mapeo bidireccional entre Requerimientos (RF), Casos de Uso (CU) y Casos de Prueba (TC). | Cristian Vargas / Laura Zarate |
| **Registro de Defectos e Incidencias (Bug Tracker)** | GitHub Issues & Tablero Kanban | Registro de anomalías detectadas con pasos para reproducir, severidad y estado. | Laura Zarate (PM) |
| **Reportes de Cobertura y Logs de Terminal** | Archivos de texto y capturas de consola | Salidas de ejecución de `python manage.py test` y `ng test --watch=false`. | Karina Quinteros (DevOps) |

---

## 9. Recursos

### 9.1 Requerimientos de Entornos – Hardware

Las pruebas se ejecutan en las estaciones de trabajo del equipo de desarrollo y en contenedores Docker:

| Recurso | Requisito Mínimo | Requisito Recomendado |
|---|---|---|
| **Procesador (CPU)** | Arquitectura x86_64, 4 núcleos físicos | 8 núcleos (Intel Core i5/i7 o AMD Ryzen 5/7) |
| **Memoria RAM** | 8 GB | 16 GB DDR4 (indispensable para orquestar contenedores Docker) |
| **Almacenamiento** | 20 GB de espacio libre (SSD) | 50 GB de espacio libre en SSD NVMe |
| **Conectividad** | Conexión de banda ancha estable | Acceso sin restricciones de proxy a GitHub y npm |

### 9.2 Requerimientos de Entornos – Software

El entorno de pruebas replica fielmente las versiones de las tecnologías del stack oficial:

| Componente de Software | Versión Oficial | Propósito en el Entorno de Pruebas |
|---|---|---|
| **Sistema Operativo** | Windows 11 / Linux Ubuntu 22.04 LTS | Plataforma anfitriona de desarrollo y pruebas. |
| **Python** | 3.12.x | Intérprete base del backend. |
| **Django** | 5.0.6 | Framework web de backend y test runner integrado. |
| **Django REST Framework** | 3.15.2 | Framework de API REST y suite de clientes de prueba (`APIClient`). |
| **djangorestframework-simplejwt** | 5.3.1 | Módulo de seguridad y tokens JWT. |
| **Node.js** | 20.x LTS | Entorno de ejecución JavaScript para tooling del frontend. |
| **Angular CLI** | 19.x / 20.x | Herramienta de compilación y orquestación de pruebas en frontend. |
| **PostgreSQL** | 15.x | Motor relacional para pruebas de integración completas en Docker. |
| **SQLite** | 3.x | Motor embebido ligero para ejecución veloz de pruebas unitarias. |
| **MongoDB** | 7.x | Base de datos NoSQL para auditoría y logs de diagnóstico. |
| **Redis** | 7.x | Broker en memoria para canales de WebSockets (Django Channels). |
| **Docker & Docker Compose** | 24.x+ | Orquestación aislada de servicios e infraestructura. |

### 9.3 Herramientas de Pruebas Requeridas

| Herramienta | Tipo | Uso Específico en FCC_APP |
|---|---|---|
| **Django Test Framework** | Automatización Backend | Ejecución de suites unitarias y transaccionales con rollback automático. |
| **DRF APIClient** | Simulación de Clientes REST | Envío de solicitudes HTTP con payloads JSON y autenticación por tokens. |
| **Jasmine & Karma / Vitest** | Automatización Frontend | Pruebas de componentes, mocks de servicios HTTP y testing de plantillas Angular. |
| **Postman / Insomnia** | Pruebas Manuales de API | Ensayos exploratorios de endpoints, validación de headers y escenarios anómalos. |
| **Coverage.py** | Análisis de Cobertura | Inspección del porcentaje de líneas de código cubiertas en backend. |
| **Git & GitHub** | Control de Versiones | Trazabilidad de correcciones, gestión de PRs y auditoría de cambios. |
| **Kanban Helper CLI** | Automatización de Gestión | Script unificado (`kanban_helper.py`) para sincronizar estados en GitHub Kanban y Google Sheets. |

### 9.4 Personal y Roles de Prueba

| Integrante | Rol en el Proyecto | Responsabilidades Principales en Pruebas |
|---|---|---|
| **Cristian Vargas** | **QA Lead / Líder de Pruebas** & Fullstack Developer | - Diseño, redacción y mantenimiento del Plan de Pruebas.<br>- Implementación de casos de prueba automatizados en Backend.<br>- Auditoría técnica de calidad y certificación de criterios de aceptación.<br>- Detección y seguimiento de defectos de concurrencia y base de datos. |
| **Laura Zarate** | **Product Manager (PM)** & Scrum Master | - Validación de criterios de aceptación funcionales desde la visión del cliente.<br>- Pruebas exploratorias de interfaz de usuario y usabilidad de la SPA.<br>- Implementación y verificación de pruebas unitarias en Frontend (Angular).<br>- Gestión de prioridades de defectos en el backlog del Kanban. |
| **Karina Quinteros** | **DevOps Lead** & Tester de Infraestructura | - Mantenimiento de entornos de prueba homogéneos con Docker Compose.<br>- Validación de migraciones de base de datos e integridad relacional.<br>- Automatización de scripts de verificación pre-commit y pre-merge.<br>- Aseguramiento del aprovisionamiento de dependencias y variables de entorno. |

### 9.5 Entrenamiento

Para asegurar la ejecución óptima del plan, el equipo consolidó las siguientes capacidades técnicas:
- Técnicas avanzadas de *Mocking* en Django mediante `unittest.mock.patch` y la utilidad `@override_settings`.
- Gestión de transacciones concurrentes en Django y resolución de problemas de cerrojos de tabla en SQLite (`transaction.on_commit()`).
- Configuración de pruebas reactivas en Angular utilizando `TestBed`, `HttpTestingController` y espías de Jasmine (`spyOn`).
- Uso unificado del script `kanban_helper.py` para la actualización del estado de tickets de prueba en tiempo real.

---

## 10. Planificación y Organización

### 10.1 Procedimientos para las Pruebas

El equipo aplica una disciplina rigurosa de desarrollo y pruebas articulada en los siguientes pasos:

1. **Definición Previa:** Antes de codificar una tarea o corrección, se identifican los criterios de aceptación y los casos de prueba requeridos.
2. **Implementación de Pruebas Automatizadas:** Se escriben o actualizan las pruebas unitarias y de integración que cubren la funcionalidad.
3. **Ejecución Local de la Suite Completa:**
   ```bash
   # En el backend (usando el entorno virtual del proyecto)
   cd FCC_APP/backend
   python manage.py test --verbosity=2

   # En el frontend
   cd FCC_APP/frontend
   ng test --watch=false
   ```
4. **Commits Progresivos y Atómicos:** Siguiendo las reglas de trabajo del repositorio, los cambios se confirman commit a commit de manera secuencial y progresiva, verificando que la suite continúe en verde tras cada confirmación.
5. **Pull Request y Code Review:** Se emite una PR desde la rama personal hacia `develop`. Un integrante par revisa el código y las pruebas.
6. **Integración:** Solo tras la aprobación formal del PR y la confirmación de tests limpios, se procede al merge.

### 10.2 Gestión de Defectos

Cuando una prueba manual o automatizada detecta una discrepancia respecto al comportamiento esperado:

```
  [Defecto Detectado] 
         │
         ▼
  [Creación de Ticket Bug en Kanban] 
         │
         ▼
  [Asignación a Desarrollador en su Rama Personal] 
         │
         ▼
  [Escritura de Caso de Prueba que Falla (Reproducción)] 
         │
         ▼
  [Corrección del Código Fuente] 
         │
         ▼
  [Verificación de Suite Completa en Verde] 
         │
         ▼
  [Pull Request de Corrección con Referencia al Ticket]
```

### 10.3 Matriz de Responsabilidades (RACI)

La matriz RACI delimita el nivel de intervención de cada miembro del equipo frente a las actividades de calidad:
- **R (Responsible):** Quien realiza la actividad.
- **A (Accountable):** Quien aprueba y rinde cuentas por el resultado final.
- **C (Consulted):** Quien aporta información técnica o funcional.
- **I (Informed):** Quien es notificado del avance y los resultados.

| Actividad de Pruebas | Cristian Vargas (QA Lead) | Laura Zarate (PM / SM) | Karina Quinteros (DevOps) |
|---|:---:|:---:|:---:|
| Redacción y actualización del Plan de Pruebas | **A / R** | **C** | **I** |
| Definición de criterios de aceptación de historias | **C** | **A / R** | **I** |
| Diseño de casos de prueba de Backend | **A / R** | **I** | **C** |
| Diseño de casos de prueba de Frontend | **C** | **A / R** | **I** |
| Ejecución de suites automatizadas de Backend | **A / R** | **I** | **C** |
| Ejecución de suites automatizadas de Frontend | **C** | **A / R** | **I** |
| Configuración de entornos de prueba en Docker | **C** | **I** | **A / R** |
| Pruebas de integración de base de datos y migraciones | **R** | **I** | **A / R** |
| Pruebas manuales exploratorias y de usabilidad | **R** | **A / R** | **I** |
| Auditoría de Pull Requests (Revisión de Calidad) | **A / R** | **R** | **C** |
| Emisión del reporte final de resultados | **A / R** | **C** | **I** |

---

### 10.4 Cronograma de Pruebas

| Hito / Fase | Versión Software | Versión Documento | Fechas | Objetivos de Prueba y Entregables | Estado |
|---|---|---|---|---|---|
| **Sprint 1** | `v0.1.0` | `v0.1.0` | 01/06/2026 – 19/06/2026 | Pruebas iniciales de arquitectura, autenticación JWT, login con Google y ABM de Clientes y Vehículos. | **Completado (100%)** |
| **Sprint 2** | `v0.2.0` | `v0.2.0` | 20/06/2026 – 28/08/2026 | Pruebas de Órdenes de Trabajo, Presupuestos, Facturación ARCA (mock), Turnos, Diagnóstico por fotos y WebSockets. | **Completado (100%)** |
| **Sprint 3** | `v0.3.0` | `v1.0.0` | 01/09/2026 – 25/09/2026 | **Fase de Calidad:** Redacción formal del Plan Detallado de Pruebas IEEE 829, ejecución de regresión total, resolución del bloqueo SQLite en signals y estabilización final para entrega de cátedra. | **En Curso** |

---

### 10.5 Premisas

1. **Aislamiento de la Base de Datos de Pruebas:** El test runner de Django crea una base de datos temporal e independiente que se destruye al finalizar la ejecución, evitando cualquier impacto sobre los datos de desarrollo o producción.
2. **Acceso Total al Repositorio:** Todos los integrantes del equipo disponen de clones locales sincronizados y acceso con privilegios de escritura en sus respectivas ramas personales de desarrollo.
3. **Disponibilidad de Entornos Virtuales Segregados:** Cada miembro ejecuta el backend sobre un entorno virtual Python dedicado (`.venv`), asegurando uniformidad exacta con las versiones de paquetes declaradas en `requirements/base.txt`.
4. **Comportamiento Determinista de Terceros:** Las pruebas no dependen de la disponibilidad de la red de ARCA/AFIP ni de Google; todos los intercambios externos se resuelven de forma predecible y reproducible en memoria.

---

### 10.6 Dependencias y Riesgos

| Riesgo Identificado | Probabilidad | Impacto | Estrategia de Mitigación / Contingencia |
|---|:---:|:---:|---|
| **Inestabilidad o indisponibilidad del servicio ARCA/AFIP** | Media | Alto | **Mitigación:** Aislamiento total en la suite de pruebas mediante un cliente mock que emite CAEs de prueba válidos. La prueba real contra servidores de homologación se realiza de forma puntual en staging. |
| **Bloqueo concurrente de tablas en SQLite (`database table is locked`)** | Alta *(Detectado)* | Medio | **Mitigación:** Aplicar `transaction.on_commit()` en las señales de Django (`ordenes/signals.py`) para evitar que hilos secundarios compitan por el cerrojo de la base de datos mientras dura la transacción del test. |
| **Conflictos de esquema por migraciones divergentes entre ramas** | Baja | Alto | **Mitigación:** Obligatoriedad de sincronizar la rama personal con `develop` antes de abrir cualquier PR y ejecución preventiva de `python manage.py makemigrations --check`. |
| **Discrepancias visuales entre Angular y el diseño de Figma** | Media | Bajo | **Mitigación:** Pruebas visuales manuales cruzadas por la Product Manager (Laura Zarate) previas a la aprobación de cada módulo de frontend. |
| **Fallas en la entrega de correos transaccionales** | Baja | Medio | **Mitigación:** Uso del backend en memoria `locmem` en pruebas automáticas; validación de renderizado de plantillas HTML y presencia de variables requeridas. |

---

## 11. Referencias

### 11.1 Referencias Normativas y Estándares Internacionales
- **IEEE Std 829-2008:** *IEEE Standard for Software and System Test Documentation*.
- **ISO/IEC/IEEE 29119:** *Software Testing Standards* (Conceptos, procesos y documentación de pruebas).
- **ISTQB:** *International Software Testing Qualifications Board — Certified Tester Foundation Level Syllabus*.
- **SemVer 2.0.0:** *Semantic Versioning Specification* ([semver.org](https://semver.org/)).

### 11.2 Documentación Interna del Proyecto y Wiki
- [Plan de Gestión de la Configuración](https://github.com/TeamYear3/FCC_APP/blob/develop/docs/PLAN_GESTION_CONFIGURACION.md) *(Ruta en repositorio: `docs/PLAN_GESTION_CONFIGURACION.md`)*
- [Historial de Cambios del Proyecto (CHANGELOG)](https://github.com/TeamYear3/FCC_APP/blob/develop/CHANGELOG.md) *(Ruta en repositorio: `CHANGELOG.md`)*
- [Definition of Done (DoD) Sprint 2 y Sprint 3](https://github.com/TeamYear3/FCC_APP/wiki/Definition-of-Done)
- [Especificación de Requerimientos del Sistema](https://github.com/TeamYear3/FCC_APP/wiki/Requerimientos)
- [Alcance del MVP y Exclusiones](https://github.com/TeamYear3/FCC_APP/wiki/Alcance)
- [Especificación de Casos de Uso del Taller](https://github.com/TeamYear3/FCC_APP/wiki/Casos-de-Uso)
- [Modelo de Datos Entidad-Relación](https://github.com/TeamYear3/FCC_APP/wiki/Modelo-de-Datos)
- [Matriz de Trazabilidad](https://github.com/TeamYear3/FCC_APP/wiki/Matriz-de-Trazabilidad)
- [Stack Tecnológico Oficial](https://github.com/TeamYear3/FCC_APP/wiki/Stack-Tecnol%C3%B3gico)
- [Equipo de Desarrollo y Roles](https://github.com/TeamYear3/FCC_APP/wiki/Equipo-de-Desarrollo)

---

## 12. Glosario

| Término | Definición Técnica y Contextual en FCC_APP |
|---|---|
| **API REST** | Interfaz de Programación de Aplicaciones basada en el protocolo HTTP y transferencias de representación en formato JSON. |
| **ARCA** | Agencia de Recaudación y Control Aduanero (ex-AFIP, entidad fiscal de la República Argentina encargada de la validación de comprobantes y emisión de CAE). |
| **Baseline (Línea Base)** | Estado estable y formalmente congelado del código fuente y documentación que sirve como punto de partida para etapas subsiguientes. |
| **CAE** | Código de Autorización Electrónico otorgado por ARCA que valida legalmente una factura electrónica. |
| **DoD (Definition of Done)** | Conjunto de criterios de calidad, testing, documentación y revisión indispensables para declarar una tarea como finalizada. |
| **DRF (Django REST Framework)** | Toolkit flexible para construir APIs Web robustas sobre el framework Django en Python. |
| **Fixture** | Conjunto predefinido de datos de prueba utilizado para inicializar la base de datos en un estado conocido previo a la ejecución de un test. |
| **JWT (JSON Web Token)** | Estándar abierto (RFC 7519) para la transmisión segura de información de identidad autenticada de manera compacta y autónoma. |
| **Mock** | Objeto simulado que imita el comportamiento de un componente real o servicio externo con respuestas programadas para aislar la prueba. |
| **OT (Orden de Trabajo)** | Entidad neurálgica del sistema que registra el servicio mecánico prestado a un vehículo desde su ingreso hasta la entrega final. |
| **Prueba de Regresión** | Verificación orientada a confirmar que las modificaciones recientes de código no hayan introducido nuevos errores en funcionalidades existentes. |
| **RBAC (Role-Based Access Control)** | Mecanismo de seguridad que restringe el acceso a operaciones y vistas en función de los roles asignados al usuario (`ADMIN`, `TECNICO`, `CLIENTE`). |
| **Signal (Señal)** | Mecanismo desacoplado de Django que permite a remitentes notificar a un conjunto de receptores cuando ocurre una acción en un modelo. |
| **Soft-Delete (Borrado Lógico)** | Técnica de persistencia donde un registro no es eliminado físicamente de la base de datos, sino marcado como inactivo mediante un campo booleano (`activo=False`). |
| **WebSockets** | Protocolo de comunicación bidireccional sobre una única conexión TCP utilizado para actualizar en tiempo real el estado de las órdenes en la SPA. |
