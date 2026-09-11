# Plan de Pruebas de Software — FCC_APP

**Proyecto:** FCC_APP — Sistema de Gestión Comercial y Operativa para Talleres Mecánicos  
**Organización:** TeamYear3 / Instituto Superior Politécnico Córdoba (ISPC)  
**Cátedra:** Práctica Profesionalizante / Proyecto Integrador  
**Estándar de Referencia:** IEEE 829 / ISO/IEC/IEEE 29119  
**Fecha:** Septiembre 2026  
**Versión del Documento:** 1.0.0 (Línea base formal)  
**Versión del Software:** 0.3.0 (Sprint 3 — Estabilización)  

> [!NOTE]
> **Versionado:**
> - **Plan de Pruebas (`v1.0.0`):** Versión documental formal aprobada por el equipo para la entrega académica.
> - **Software (`v0.3.0`):** Release de cierre de Sprint 3 (estabilización) bajo SemVer 2.0.0, previa a la versión final `v1.0.0`.

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
   - 5.4 [Funcionalidades Fuera del Alcance](#54-funcionalidades-fuera-del-alcance)
6. [Enfoque de Pruebas (Estrategia)](#6-enfoque-de-pruebas-estrategia)
7. [Criterios de Aceptación o Rechazo](#7-criterios-de-aceptación-o-rechazo)
   - 7.1 [Criterios de Aceptación](#71-criterios-de-aceptación)
   - 7.2 [Criterios de Suspensión](#72-criterios-de-suspensión)
   - 7.3 [Criterios de Reanudación](#73-criterios-de-reanudación)
8. [Entregables](#8-entregables)
9. [Recursos](#9-recursos)
   - 9.1 [Requerimientos de Entornos – Hardware](#91-requerimientos-de-entornos--hardware)
   - 9.2 [Requerimientos de Entornos – Software](#92-requerimientos-de-entornos--software)
   - 9.3 [Herramientas de Pruebas](#93-herramientas-de-pruebas)
   - 9.4 [Personal y Roles de Prueba](#94-personal-y-roles-de-prueba)
   - 9.5 [Entrenamiento Requerido](#95-entrenamiento-requerido)
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
| 19/06/2026 | `v0.1.0` | `v0.1.0` | Laura Zarate, Cristian Vargas, Karina Quinteros | TeamYear3 / ISPC | Pruebas iniciales de arquitectura base: JWT, Google OAuth2, modelos y endpoints de Clientes y Vehículos (Sprint 1). |
| 28/08/2026 | `v0.2.0` | `v0.2.0` | Cristian Vargas, Laura Zarate, Karina Quinteros | TeamYear3 / ISPC | Pruebas de Órdenes de Trabajo (OTs), presupuestos, facturación ARCA (mock), turnos, fotos de diagnóstico y WebSockets (Sprint 2). |
| 11/09/2026 | `v1.0.0` | `v0.3.0` | Cristian Vargas (QA Lead) | TeamYear3 / ISPC | Plan Detallado de Pruebas bajo IEEE 829. Regresión total, criterios de estabilización, mitigación de bloqueos de concurrencia en signals y suite de Sprint 3. |

---

## 2. Información del Proyecto

| Parámetro | Detalle |
|---|---|
| **Organización** | TeamYear3 — Instituto Superior Politécnico Córdoba (ISPC) |
| **Proyecto** | FCC_APP — Sistema de Gestión Comercial y Operativa para Talleres Mecánicos |
| **Fecha de preparación** | Septiembre 2026 |
| **Cliente** | Full Check Car (Taller Mecánico Automotriz independiente) |
| **Patrocinador** | Cátedra de Práctica Profesionalizante / Ingeniería de Software — ISPC |
| **Líder de Proyecto (PM) / Scrum Master** | **Laura Zarate** |
| **Líder de Pruebas (QA Lead)** | **Cristian Vargas** |
| **Líder de DevOps e Infraestructura** | **Karina Quinteros** |

---

## 3. Aprobaciones

Firmas de revisión y aprobación técnica del plan:

| Nombre y Apellido | Cargo / Rol | Organización | Fecha | Estado / Firma |
|---|---|---|---|---|
| **Laura Zarate** | Product Manager & Scrum Master | TeamYear3 / ISPC | 11/09/2026 | Aprobado |
| **Cristian Vargas** | QA Lead & Fullstack Developer | TeamYear3 / ISPC | 11/09/2026 | Aprobado |
| **Karina Quinteros** | DevOps Lead | TeamYear3 / ISPC | 11/09/2026 | Aprobado |
| **Cátedra Evaluadora** | Docente Titular / Revisor Técnico | ISPC | Pendiente | Pendiente de Revisión Final |

---

## 4. Resumen Ejecutivo

Este documento define la estrategia, alcance, recursos y casos de prueba para el sistema **FCC_APP** (*Full Check Car*).

### 4.1 Propósito
Definir los criterios técnicos, recursos, cronograma y casos de prueba necesarios para verificar los requerimientos funcionales, no funcionales y la Definition of Done (DoD) de los Sprints 2 y 3.

### 4.2 Clasificación del Plan y Relación con el Ciclo Scrum
Corresponde a un **Plan Detallado de Pruebas** enfocado en la estabilización y regresión del **Sprint 3 (Software `v0.3.0` / Documento `v1.0.0`)**, integrando los resultados de los sprints previos:
- **Sprint 1 (`v0.1.0`):** Autenticación (JWT/OAuth2), clientes y vehículos.
- **Sprint 2 (`v0.2.0`):** Órdenes de trabajo con máquina de estados, presupuestos con cálculo reactivo de ítems/IVA, facturación ARCA (mock), turnos y WebSockets.
- **Sprint 3 (`v0.3.0` / Documento `v1.0.0`):** Estabilización, regresión total, resolución de concurrencia en signals y validación final antes de la release. En este sprint no se agregan features nuevos; el foco está en la confiabilidad de la suite automatizada.

### 4.3 Restricciones Principales
- **Entorno:** Ejecución local con Docker y PostgreSQL para pruebas de integración; SQLite para la suite unitaria rápida.
- **Servicios externos:** Facturación ARCA, Google OAuth2 y SMTP se simulan mediante mocks y fakes para garantizar pruebas deterministas, aisladas y sin costos de red.

---

## 5. Alcance de las Pruebas

### 5.1 Elementos de Pruebas

Componentes del repositorio bajo prueba:

#### A. Backend (Django 5.0.6 + DRF 3.15.2)

| Módulo / App | Archivos de Prueba | Cobertura Funcional y Técnica |
|---|---|---|
| `usuarios` | `tests.py`<br>`tests_busqueda.py` | Autenticación local, JWT (emisión, refresh y blacklist), Google OAuth2, recuperación de contraseña, roles (`ADMIN`, `TECNICO`, `CLIENTE`) y búsqueda transversal. |
| `clientes` | `tests.py` | CRUD de clientes, validación de CUIT/DNI, filtros de búsqueda y validadores en serializers. |
| `vehiculos` | `tests.py` | CRUD de vehículos, patentes (clásica y Mercosur), VIN de 17 caracteres, kilometraje no decreciente, reasignación de propietario y borrado lógico (*soft-delete*). |
| `ordenes` | `tests.py` | Ciclo de vida de OT (`RECIBIDO`, `EN_DIAGNOSTICO`, `PRESUPUESTADO`, `APROBADO`, `EN_REPARACION`, `FINALIZADO`, `ENTREGADO`, `CANCELADO`), signals de actualización, cálculo de ítems, repuestos y mano de obra. |
| `facturacion` | `tests.py` | Facturas A, B y C, cálculo de IVA (21%, 10.5%), mock de ARCA para CAE, vencimientos y generación de PDF. |
| `turnos` | `tests.py` | Creación y administración de turnos, control de superposición horaria, cupos por box y asignación de mecánicos. |
| `taller` | `tests.py` | Métricas de productividad, estado de boxes y KPIs de facturación. |
| `core` | `tests.py` | Paginadores universales, manejador de excepciones y utilidades comunes. |
| `diagnosticos` | `tests.py` (integrado) | Subida y asociación de fotos del vehículo vinculadas a Cloudinary. |
| `infrastructure/email` | `tests.py` (integrado) | Renderizado y envío de plantillas HTML transaccionales (bienvenida, presupuesto, estado de OT). |

#### B. Frontend (Angular 19/20 + Tailwind CSS)

Componentes, servicios e interceptores cubiertos por 26 archivos de prueba (`*.spec.ts`):
- `admin`: Panel directivo, métricas del taller, calendario de turnos y liquidaciones.
- `autenticacion`: Login, Google Sign-In y guardias de ruta (`auth.guard`, `role.guard`).
- `clientes`: Listados reactivos con ordenamiento y formularios con validación.
- `vehiculos`: Fichas técnicas, alertas de kilometraje y formularios de alta/edición.
- `ordenes`: Tablero/listado de OTs, modal de diagnóstico, cotizador de ítems y flujo de estados.
- `portal-cliente`: Consulta pública de estado y aprobación digital de presupuestos.
- `configuracion`: Perfil de usuario y preferencias.
- `acceso-denegado`: Manejo de errores HTTP 403 con redirección guiada.
- `facturacion`: Visualizador y emisión de comprobantes fiscales.

---

#### C. Planilla de Casos de Prueba Funcionales

20 casos de prueba funcionales organizados en 4 módulos (5 casos por módulo) con la estructura reglamentaria de 10 atributos:

> [!NOTE]
> **Estado de los casos:** Este documento corresponde al diseño y especificación previa de las pruebas. Las columnas *Resultado Real* y *Estado* figuran como **`Pendiente`**, a completarse durante la ejecución formal con sus respectivas evidencias.

##### Módulo 1: Ingreso sin Registro (Flujo de Invitado y Seguridad Perimetral)

| ID Caso | Módulo | Descripción del Caso | Precondiciones | Pasos de Ejecución | Resultado Esperado | Prioridad | Resultado Real | Estado (Pass/Fail) | Evidencia / Notas |
|---|---|---|---|---|---|:---:|---|:---:|---|
| **TEST-G-001** | Ingreso/Invitado | Carga de Landing Page pública | Usuario anónimo sin sesión. | 1. Abrir navegador en `/`.<br>2. Comprobar renderizado de la página. | La interfaz carga correctamente el banner, información pública del taller, servicios disponibles y botón "Iniciar Sesión". | **Alta** | *Pendiente* | **Pendiente** | Captura de pantalla de la Landing y verificación de consola de red sin errores. |
| **TEST-G-002** | Ingreso/Invitado | Intento de acceso directo por URL a ruta protegida | Usuario anónimo sin autenticar. | 1. Ingresar en la barra de direcciones `/admin`, `/ordenes` o `/dashboard`.<br>2. Presionar Enter. | El guardia de rutas (`auth.guard`) intercepta la navegación y redirige al usuario a `/login` o `/acceso-denegado`. | **Alta** | *Pendiente* | **Pendiente** | Verificar URL de redirección y ausencia de datos protegidos en DOM. |
| **TEST-G-003** | Ingreso/Invitado | Consulta pública de estado en Portal Cliente | OT activa registrada para un vehículo. | 1. Navegar a `/portal-cliente/consulta`.<br>2. Ingresar patente (`AA123AA`) o token.<br>3. Clic en "Consultar Estado". | La pantalla muestra la línea de tiempo del progreso del vehículo sin exponer datos personales ni fiscales de otros clientes. | **Media** | *Pendiente* | **Pendiente** | Comprobar que el payload JSON omita teléfonos, direcciones y CUIT. |
| **TEST-G-004** | Ingreso/Invitado | Rechazo de peticiones anónimas a la API | Cliente HTTP sin cabecera `Authorization`. | 1. Enviar solicitud `GET` a `/api/v1/clientes/` o `/api/v1/ordenes/`. | La API devuelve código `HTTP 401 Unauthorized` con payload descriptivo del error. | **Crítica** | *Pendiente* | **Pendiente** | Captura de respuesta Postman con headers y código 401. |
| **TEST-G-005** | Ingreso/Invitado | Consulta de turnos en calendario público | Turnos asignados y boxes configurados en el sistema. | 1. Navegar a `/turnos/disponibilidad`.<br>2. Seleccionar fecha en el calendario. | Muestra únicamente los horarios y boxes disponibles, sin revelar datos de turnos ya reservados. | **Media** | *Pendiente* | **Pendiente** | Validar que no se transmitan nombres de clientes ni patentes en slots ocupados. |

##### Módulo 2: Usuarios Registrados (Login, Sesión y Control de Acceso RBAC)

| ID Caso | Módulo | Descripción del Caso | Precondiciones | Pasos de Ejecución | Resultado Esperado | Prioridad | Resultado Real | Estado (Pass/Fail) | Evidencia / Notas |
|---|---|---|---|---|---|:---:|---|:---:|---|
| **TEST-L-001** | Login/Sesión | Login local con rol Administrador | Usuario con rol `ADMIN` activo en base de datos. | 1. Navegar a `/login`.<br>2. Ingresar email y password válidos.<br>3. Clic en "Ingresar". | La API devuelve tokens JWT (`access` y `refresh`), el frontend los persiste en almacenamiento seguro y redirige al Dashboard. | **Crítica** | *Pendiente* | **Pendiente** | Inspeccionar payload JWT en DevTools (`role: ADMIN`). |
| **TEST-L-002** | Login/Sesión | Inicio de sesión con Google OAuth2 | Cuenta de Google activa; Client ID configurado. | 1. Navegar a `/login`.<br>2. Clic en "Continuar con Google".<br>3. Aceptar consentimiento en popup. | Backend valida la firma del `id_token` con Google, genera el par JWT de la aplicación e inicia sesión en la SPA. | **Alta** | *Pendiente* | **Pendiente** | Registrar llamada al endpoint de autenticación social en consola de red. |
| **TEST-L-003** | Login/Sesión | Login fallido por contraseña incorrecta | Usuario registrado en el sistema. | 1. Navegar a `/login`.<br>2. Ingresar email existente y password erróneo.<br>3. Clic en "Ingresar". | La API responde `HTTP 401 Unauthorized`; la UI muestra alerta genérica "Credenciales inválidas" sin revelar si el error fue el usuario o el password. | **Alta** | *Pendiente* | **Pendiente** | Confirmar que el mensaje previene la enumeración de cuentas. |
| **TEST-L-004** | Login/Sesión | Control de acceso por rol (RBAC) a vista Admin | Usuario autenticado con rol `CLIENTE`. | 1. Iniciar sesión como Cliente.<br>2. Navegar a `/admin/configuracion` o enviar `POST` a `/api/v1/facturacion/`. | `RoleGuard` redirige a `/acceso-denegado`; la API rechaza peticiones con `HTTP 403 Forbidden`. | **Crítica** | *Pendiente* | **Pendiente** | Captura de pantalla de vista 403 y respuesta HTTP de backend. |
| **TEST-L-005** | Login/Sesión | Logout y revocación de token en Blacklist | Sesión activa con refresh token válido. | 1. Abrir menú de usuario.<br>2. Seleccionar "Cerrar Sesión".<br>3. Intentar refrescar sesión con el token previo. | El backend añade el refresh token a la tabla de blacklist; peticiones posteriores con ese token son rechazadas con error 401. | **Crítica** | *Pendiente* | **Pendiente** | Verificar inserción del token en `token_blacklist_blacklistedtoken`. |

##### Módulo 3: Gestión de Datos una vez Logueado (CRUD Operativo)

| ID Caso | Módulo | Descripción del Caso | Precondiciones | Pasos de Ejecución | Resultado Esperado | Prioridad | Resultado Real | Estado (Pass/Fail) | Evidencia / Notas |
|---|---|---|---|---|---|:---:|---|:---:|---|
| **TEST-D-001** | Gestión/CRUD | Alta de nuevo Cliente con validación fiscal | Usuario con rol de edición autenticado. | 1. Navegar a `/clientes/nuevo`.<br>2. Cargar datos con CUIT/DNI válido.<br>3. Guardar. | Se valida formato y unicidad de CUIT/DNI; se crea el registro en base de datos (`HTTP 201 Created`) y se refleja en el listado. | **Crítica** | *Pendiente* | **Pendiente** | Registro de creación y respuesta de red `HTTP 201`. |
| **TEST-D-002** | Gestión/CRUD | Alta de Vehículo vinculado a Cliente | Al menos un cliente registrado. | 1. Navegar a `/vehiculos/nuevo`.<br>2. Seleccionar cliente.<br>3. Cargar patente Mercosur (`AA123AA`), marca, modelo y kilometraje.<br>4. Guardar. | Se valida formato de patente y ausencia de duplicados; el vehículo queda asociado al cliente con historial inicializado en 0. | **Crítica** | *Pendiente* | **Pendiente** | Verificar formato en mayúsculas y clave foránea en base de datos. |
| **TEST-D-003** | Gestión/CRUD | Creación de OT y transición de estados | Cliente y vehículo existentes. | 1. Abrir OT en estado `RECIBIDO`.<br>2. Registrar diagnóstico y avanzar a `EN_DIAGNOSTICO`.<br>3. Cargar ítems de mano de obra/repuestos para pasar a `PRESUPUESTADO`. | La máquina de estados valida cada paso, calcula subtotales e IVA y emite la señal de notificación correspondiente. | **Crítica** | *Pendiente* | **Pendiente** | Verificar totales calculados y estado actualizado en tablero Kanban. |
| **TEST-D-004** | Gestión/CRUD | Edición reactiva de datos de contacto de Cliente | Cliente previamente registrado. | 1. Abrir ficha del cliente en edición.<br>2. Modificar teléfono y email.<br>3. Guardar cambios. | El endpoint actualiza el registro (`HTTP 200 OK`) y la tabla del frontend se refresca automáticamente sin recargar la página. | **Alta** | *Pendiente* | **Pendiente** | Verificar persistencia en base de datos y actualización inmediata de UI. |
| **TEST-D-005** | Gestión/CRUD | Borrado lógico (*soft-delete*) de Vehículo | Vehículo registrado con historial de reparaciones. | 1. Clic en "Eliminar" en el vehículo.<br>2. Confirmar diálogo modal. | El campo `activo` pasa a `False`; el vehículo se oculta de listados operativos pero sus OTs históricas se conservan intactas. | **Crítica** | *Pendiente* | **Pendiente** | Consulta SQL verificando `activo=False` y persistencia de OTs vinculadas. |

##### Módulo 4: Funcionalidad con Base de Datos e Integridad Backend

| ID Caso | Módulo | Descripción del Caso | Precondiciones | Pasos de Ejecución | Resultado Esperado | Prioridad | Resultado Real | Estado (Pass/Fail) | Evidencia / Notas |
|---|---|---|---|---|---|:---:|---|:---:|---|
| **TEST-DB-001** | Base de Datos | Validación de tipos de datos en endpoints | Token JWT válido con permisos de escritura. | 1. Enviar `POST` a `/api/v1/vehiculos/` con cadena alfanumérica en el campo `kilometraje`. | El serializer intercepta el error antes de consultar la base y responde `HTTP 400 Bad Request` indicando tipo inválido. | **Alta** | *Pendiente* | **Pendiente** | Captura del payload de error con validación de campo devuelto por DRF. |
| **TEST-DB-002** | Base de Datos | Persistencia de datos en órdenes y presupuestos | Conexión activa a base de datos. | 1. Crear OT con ítems y presupuesto.<br>2. Cerrar sesión.<br>3. Iniciar sesión nueva y consultar la OT. | Los ítems, descripciones, cantidades, precios e IVA se recuperan exactamente como fueron guardados. | **Crítica** | *Pendiente* | **Pendiente** | Comparar valores en base de datos contra los mostrados en UI. |
| **TEST-DB-003** | Base de Datos | Integridad referencial ante eliminación de Cliente | Cliente con vehículos y OTs asociadas. | 1. Intentar eliminar el cliente mediante petición `DELETE` a la API. | La restricción `on_delete=models.PROTECT` en el ORM bloquea la eliminación física y devuelve error de integridad. | **Media** | *Pendiente* | **Pendiente** | Capturar excepción `ProtectedError` y verificar respuesta 400. |
| **TEST-DB-004** | Base de Datos | Unicidad de claves naturales de negocio | Cliente existente con DNI `35.123.456` y auto con patente `AA123AA`. | 1. Intentar registrar nuevo cliente con el mismo DNI.<br>2. Intentar registrar segundo auto con la misma patente. | Los validadores y la restricción `unique=True` rechazan ambas operaciones emitiendo error de valor duplicado. | **Crítica** | *Pendiente* | **Pendiente** | Comprobar mensaje descriptivo de campo duplicado en payload JSON. |
| **TEST-DB-005** | Base de Datos | Concurrencia transaccional en signals durante tests | Suite de pruebas ejecutando signals asíncronos. | 1. Ejecutar test que cambie estado de OT disparando signals.<br>2. Verificar ausencia de cerrojos de tabla. | El uso de `transaction.on_commit()` pospone las señales hasta confirmar la transacción del test, evitando el bloqueo de tabla en SQLite. | **Crítica** | *Pendiente* | **Pendiente** | Salida limpia en terminal de `python manage.py test ordenes`. |

---

#### D. Catálogo de Pruebas Unitarias Automatizadas (Backend)

Pruebas implementadas en la suite de backend (`Django TestCase`):

| ID | Módulo | Clase | Método de Prueba | Descripción |
|---|---|---|---|---|
| `TC-AUTH-01` | `usuarios` | `UsuariosTests` | `test_registro_usuario_exitoso` | Creación de usuario con credenciales válidas y rol asignado. HTTP 201. |
| `TC-AUTH-02` | `usuarios` | `UsuariosTests` | `test_login_jwt_correcto` | Emisión de tokens `access` y `refresh` con credenciales válidas. HTTP 200. |
| `TC-AUTH-03` | `usuarios` | `UsuariosTests` | `test_login_password_invalida` | Rechazo de autenticación con contraseña incorrecta. HTTP 401. |
| `TC-AUTH-04` | `usuarios` | `UsuariosTests` | `test_logout_blacklist_token` | Revocación de refresh token en blacklist tras logout. HTTP 200. |
| `TC-AUTH-05` | `usuarios` | `UsuariosTests` | `test_acceso_endpoint_sin_token` | Rechazo de peticiones anónimas a endpoints protegidos. HTTP 401. |
| `TC-AUTH-06` | `usuarios` | `UsuariosTests` | `test_permisos_rol_cliente_en_admin` | Bloqueo de acceso de rol `CLIENTE` a rutas de administración. HTTP 403. |
| `TC-BUSQ-01` | `usuarios` | `BusquedaTransversalTests` | `test_busqueda_global_por_dni` | Búsqueda por DNI que retorna cliente, vehículos y OTs asociadas. |
| `TC-BUSQ-02` | `usuarios` | `BusquedaTransversalTests` | `test_busqueda_global_por_patente` | Búsqueda por patente vehicular con retorno de ficha e historial. |
| `TC-CLI-01` | `clientes` | `ClientesTests` | `test_crear_cliente_valido` | Alta de cliente con datos completos y formato legal de CUIT/DNI. HTTP 201. |
| `TC-CLI-02` | `clientes` | `ClientesTests` | `test_rechazo_dni_duplicado` | Rechazo ante intento de duplicar CUIT/DNI existente. HTTP 400. |
| `TC-CLI-03` | `clientes` | `ClientesTests` | `test_filtrar_clientes_por_apellido` | Búsqueda filtrada por coincidencia parcial de apellido. HTTP 200. |
| `TC-VEH-01` | `vehiculos` | `VehiculosTests` | `test_alta_vehiculo_patente_mercosur` | Alta de vehículo con formato Mercosur (`AA123AA`). HTTP 201. |
| `TC-VEH-02` | `vehiculos` | `VehiculosTests` | `test_alta_vehiculo_patente_clasica` | Alta de vehículo con formato tradicional (`AAA123`). HTTP 201. |
| `TC-VEH-03` | `vehiculos` | `VehiculosTests` | `test_rechazo_patente_formato_invalido` | Rechazo de patente que no coincide con los formatos reglamentarios. HTTP 400. |
| `TC-VEH-04` | `vehiculos` | `VehiculosTests` | `test_unicidad_patente_y_chasis` | Falla al intentar duplicar patente o número de chasis (VIN). HTTP 400. |
| `TC-VEH-05` | `vehiculos` | `VehiculosTests` | `test_actualizar_kilometraje_menor_rechazado` | Rechazo de actualización si el nuevo kilometraje es menor al actual. |
| `TC-VEH-06` | `vehiculos` | `VehiculosTests` | `test_soft_delete_vehiculo` | Desactivación del vehículo conservando historial en base de datos. |
| `TC-ORD-01` | `ordenes` | `OrdenesTests` | `test_crear_orden_trabajo_inicial` | Creación de OT vinculada a vehículo y cliente, naciendo en `RECIBIDO`. HTTP 201. |
| `TC-ORD-02` | `ordenes` | `OrdenesTests` | `test_transicion_estados_valida` | Avance de estado permitido: `RECIBIDO` → `EN_DIAGNOSTICO` → `PRESUPUESTADO`. |
| `TC-ORD-03` | `ordenes` | `OrdenesTests` | `test_transicion_estado_invalida_rechazada` | Rechazo de saltos ilegales en la máquina de estados. HTTP 400. |
| `TC-ORD-04` | `ordenes` | `OrdenesTests` | `test_calculo_presupuesto_con_items` | Incorporación de repuestos y mano de obra con cálculo exacto del total e IVA. |
| `TC-ORD-05` | `ordenes` | `OrdenesTests` | `test_aprobacion_presupuesto_por_cliente` | Aprobación digital del presupuesto pasando la OT a `APROBADO`. |
| `TC-FAC-01` | `facturacion` | `FacturacionTests` | `test_emitir_factura_con_cae_mock` | Facturación solicitando CAE al mock de ARCA; validación de CAE y vencimiento. |
| `TC-FAC-02` | `facturacion` | `FacturacionTests` | `test_no_facturar_ot_no_finalizada` | Impedimento de emitir factura si la orden no está en estado `FINALIZADO`. HTTP 400. |
| `TC-TUR-01` | `turnos` | `TurnosTests` | `test_agendar_turno_disponible` | Reserva de turno en horario disponible. HTTP 201. |
| `TC-TUR-02` | `turnos` | `TurnosTests` | `test_rechazo_turno_sobrecupo` | Rechazo de reserva cuando los boxes del taller están ocupados al 100%. HTTP 400. |
| `TC-TAL-01` | `taller` | `TallerTests` | `test_metricas_dashboard_acumulado` | Cálculo de métricas: órdenes activas, vehículos en taller y total facturado. |

---

### 5.2 Nuevas Funcionalidades a Probar

Funcionalidades validadas desde la perspectiva del usuario:

1. **Dashboard del taller (Admin):** Tarjetas de KPIs con órdenes activas, vehículos en taller, facturación mensual acumulada y turnos del día.
2. **Facturación electrónica ARCA (Admin):** Solicitud de comprobante, asignación de CAE y generación de factura PDF con discriminación de IVA.
3. **Agenda de turnos (Admin / Técnico):** Calendario con visualización de disponibilidad horaria y bloqueo preventivo de sobrecupo.
4. **Inspección visual y diagnóstico (Técnico):** Carga de fotos del estado del vehículo, checklist de daños previos y observaciones técnicas.
5. **Notificaciones por email (Cliente):** Envío automático de correos en recepción de vehículo, presupuesto disponible y vehículo listo para retiro.
6. **Actualización en tiempo real (Técnico / Cliente):** Refresco inmediato del tablero Kanban al cambiar el estado de una OT mediante WebSockets.
7. **Portal de cliente (Cliente):** Consulta de avance de reparación y botones para aprobar o rechazar presupuestos.
8. **Buscador global:** Búsqueda rápida por DNI/apellido de cliente, patente vehicular y número de orden.

---

### 5.3 Pruebas de Regresión

Verificaciones para garantizar que los cambios de Sprint 2 y Sprint 3 no afecten funcionalidades base de Sprint 1:

- **Autenticación:** Expiración de JWT (60 min de acceso, 7 días de refresh), revocación en blacklist en logout y login social con Google OAuth2.
- **Clientes y Vehículos:** Validación de unicidad para DNI/CUIT, patente y VIN; integridad de datos al editar clientes; persistencia de órdenes pasadas tras el borrado lógico de vehículos.
- **Control de acceso (RBAC):** Restricción de acceso a rutas administrativas para usuarios con rol `CLIENTE` o `TECNICO` (respuestas 401 y 403).

---

### 5.4 Funcionalidades Fuera del Alcance

En línea con el documento de alcance del proyecto (`Alcance.md`), quedan excluidas:

| Característica Excluida | Justificación Técnica | Tratamiento en Pruebas |
|---|---|---|
| **Aplicaciones móviles nativas (iOS / Android)** | La interfaz es una Web SPA Responsive; no existen ejecutables nativos para tiendas móviles. | Se valida la vista responsive en navegadores web. |
| **Pasarelas de pago online (Stripe / Mercado Pago)** | El taller gestiona cobros presenciales (efectivo, transferencia, terminal POS física). | Se prueban los registros contables internos, sin comunicación con redes interbancarias. |
| **Gestión multi-sucursal** | El alcance comprende únicamente la sede central de *Full Check Car*. | No se ensayan transferencias ni sincronización entre sedes remotas. |
| **API de WhatsApp Business** | Excluida por costos de verificación y licencias de Meta; las alertas se envían vía SMTP. | No se prueban integraciones de mensajería instantánea. |
| **Machine Learning y Analítica Predictiva** | Las métricas del taller se obtienen mediante agregaciones SQL estándar. | No se prueban modelos estadísticos ni algoritmos predictivos. |
| **Servidor SMTP real en pruebas unitarias** | Se utiliza el backend en memoria de Django (`locmem`) para mantener las pruebas rápidas y aisladas. | El envío SMTP real se valida de forma puntual en entorno de staging. |
| **Pruebas de estrés masivo (>10.000 usuarios)** | El sistema está dimensionado para la escala operativa real del taller (10 a 50 usuarios simultáneos). | No se aplican pruebas de saturación extrema ni ataques distribuidos. |

---

## 6. Enfoque de Pruebas (Estrategia)

### 6.1 Pirámide de Testing

Se priorizan pruebas unitarias rápidas e independientes en la base, complementadas con pruebas de integración de API y validaciones manuales en la cima:

```
                  ┌────────────────────────┐
                  │       E2E Manual       │  ← Validación visual y UX
                  │     (5% Esfuerzo)      │
                  ├────────────────────────┤
                  │   Integración de API   │  ← DRF APITestCase, contratos JSON,
                  │     (25% Esfuerzo)     │    códigos HTTP, persistencia en BD
                  ├────────────────────────┤
                  │   Pruebas Unitarias    │  ← Django TestCase (Modelos, Serializers,
                  │     (70% Esfuerzo)     │    Validadores) + Angular Spec (Services)
                  └────────────────────────┘
```

### 6.2 Niveles y Tipos de Pruebas

1. **Pruebas Unitarias:**
   - *Backend:* Ejecutadas con `python manage.py test`. Validan métodos de modelo, reglas de cálculo, transformaciones en serializers y restricciones de integridad.
   - *Frontend:* Ejecutadas con `ng test`. Validan el ciclo de vida de componentes, servicios e interceptores.
2. **Pruebas de Integración (API REST):**
   - Implementadas con `APITestCase` y `APIClient`.
   - Validan contratos JSON, códigos de estado (200, 201, 400, 401, 403, 404) y persistencia en base de datos.
3. **Pruebas de Seguridad y RBAC:**
   - Validación de permisos por rol (`ADMIN`, `TECNICO`, `CLIENTE`).
   - Verificación de cabeceras `Authorization: Bearer <token>` y códigos de error (401 por token inválido/ausente, 403 por falta de privilegios).
4. **Pruebas de Regresión Continua:**
   - Ejecución obligatoria de la suite completa antes de mergear cualquier Pull Request a `develop` o `main`.
5. **Pruebas de Interfaz (Manual Exploratorio):**
   - Comparación visual contra el diseño de Figma en resoluciones Desktop (1920x1080, 1366x768) y Mobile (375x812).

### 6.3 Manejo de Datos de Prueba

- **Aislamiento transaccional:** Cada prueba de Django corre dentro de una transacción atómica que hace rollback al finalizar (`TestCase`), evitando efectos colaterales entre ejecuciones.
- **Instanciación en memoria:** Métodos `setUpTestData` para crear entidades base (usuarios, clientes, vehículos) de forma controlada.
- **Dobles de prueba (*Mocks*):** Uso de `unittest.mock.patch` para dependencias externas:
  - *ARCA / AFIP:* Respuestas simuladas con número de CAE (`74321890123456`) y estado de aprobación.
  - *Cloudinary:* URLs simuladas sin transferencia de archivos binarios reales.
  - *Email:* Captura de envíos en `mail.outbox` en memoria para validar destinatario, asunto y contenido.

---

## 7. Criterios de Aceptación o Rechazo

### 7.1 Criterios de Aceptación
Para aprobar formalmente el ciclo de pruebas y habilitar la release:
1. **100% de pruebas en verde:** Cero fallas en la suite de backend (`python manage.py test`) y de frontend (`ng test`).
2. **Build de producción exitoso:** `ng build --configuration production` con código de salida 0, sin errores de TypeScript ni advertencias de dependencias circulares.
3. **Cumplimiento de la DoD:**
   - Criterios de aceptación de cada Historia de Usuario cubiertos.
   - Revisión de código (Code Review) aprobada en GitHub por al menos un par.
   - Documentación actualizada en repositorio y wiki.
   - Cero secretos o credenciales en el código fuente.

### 7.2 Criterios de Suspensión
Se detiene la ejecución de pruebas ante:
1. **Fallas en cascada:** Más del 20% de tests fallando consecutivamente tras una modificación estructural.
2. **Errores en migraciones:** Fallas al aplicar el esquema de base de datos (`python manage.py migrate --check` o dependencias rotas).
3. **Quiebre de autenticación:** Errores en la emisión o verificación de JWT que impidan autenticar llamadas a la API.
4. **Bloqueo concurrente en SQLite (*Database Table is Locked*):** Aparición del error `django.db.utils.OperationalError: database table is locked` provocado por signals o hilos asíncronos durante la ejecución de tests.

### 7.3 Criterios de Reanudación
Las pruebas se reanudan cuando:
1. El desarrollador aplique un commit de reversión o corrección en su rama de trabajo.
2. Para el bloqueo de SQLite: uso de `transaction.on_commit()` en `ordenes/signals.py` para asegurar que las tareas asíncronas esperen el cierre de la transacción de prueba.
3. Se valide localmente que la suite completa ejecuta en verde.

---

## 8. Entregables

Artefactos generados durante el ciclo de pruebas:

| Entregable | Ubicación / Formato | Contenido | Responsable |
|---|---|---|---|
| **Plan de Pruebas de Software** | `FCC_APP/docs/PLAN_DE_PRUEBAS_DE_SOFTWARE.md` y exportación a PDF | Estrategia, alcance, recursos, casos de prueba y criterios de calidad. | Cristian Vargas (QA Lead) |
| **Suite Automatizada Backend** | `backend/**/tests*.py` | Pruebas unitarias y de integración en Django/DRF. | Cristian Vargas |
| **Suite Automatizada Frontend** | `frontend/**/*.spec.ts` | Pruebas de componentes, servicios e interceptores en Angular. | Laura Zarate |
| **Matriz de Trazabilidad** | `wiki/Matriz-de-Trazabilidad.md` | Mapeo entre Requerimientos (RF), Casos de Uso (CU) y Casos de Prueba (TC). | Cristian Vargas / Laura Zarate |
| **Registro de Defectos** | GitHub Issues & Tablero Kanban | Registro de incidencias con severidad, pasos de reproducción y estado. | Laura Zarate (PM) |
| **Reportes de Cobertura y Logs** | Salidas de consola de terminal | Resultados de `manage.py test` y `ng test --watch=false`. | Karina Quinteros (DevOps) |

---

## 9. Recursos

### 9.1 Requerimientos de Entornos – Hardware

| Recurso | Requisito Mínimo | Requisito Recomendado |
|---|---|---|
| **Procesador (CPU)** | x86_64, 4 núcleos | 8 núcleos (Intel Core i5/i7 o AMD Ryzen 5/7) |
| **Memoria RAM** | 8 GB | 16 GB DDR4 (para contenedores Docker) |
| **Almacenamiento** | 20 GB libres (SSD) | 50 GB libres en SSD NVMe |
| **Conectividad** | Conexión de banda ancha estable | Acceso sin restricciones de proxy a GitHub y npm |

### 9.2 Requerimientos de Entornos – Software

| Componente | Versión | Propósito en Pruebas |
|---|---|---|
| **Sistema Operativo** | Windows 11 / Linux Ubuntu 22.04 LTS | Entorno anfitrión de desarrollo y pruebas. |
| **Python** | 3.12.x | Intérprete base del backend. |
| **Django** | 5.0.6 | Framework web y test runner. |
| **Django REST Framework** | 3.15.2 | API REST y utilidades de prueba (`APIClient`). |
| **djangorestframework-simplejwt** | 5.3.1 | Gestión de autenticación por tokens JWT. |
| **Node.js** | 20.x LTS | Runtime JavaScript para tooling del frontend. |
| **Angular CLI** | 19.x / 20.x | Compilación y ejecución de pruebas en frontend. |
| **PostgreSQL** | 15.x | Base de datos relacional para integración en Docker. |
| **SQLite** | 3.x | Base en memoria/local para ejecución rápida de tests unitarios. |
| **MongoDB** | 7.x | Base NoSQL para auditoría y logs de diagnóstico. |
| **Redis** | 7.x | Broker para WebSockets (Django Channels). |
| **Docker & Docker Compose** | 24.x+ | Orquestación aislada de servicios e infraestructura. |

### 9.3 Herramientas de Pruebas

| Herramienta | Tipo | Uso en el Proyecto |
|---|---|---|
| **Django Test Framework** | Automatización Backend | Pruebas unitarias y de integración con rollback atómico. |
| **DRF APIClient** | Cliente HTTP de Pruebas | Peticiones a endpoints con payloads JSON y cabeceras JWT. |
| **Jasmine & Karma / Vitest** | Automatización Frontend | Pruebas de componentes y servicios en Angular. |
| **Postman / Insomnia** | Pruebas Manuales de API | Validación exploratoria de endpoints y respuestas HTTP. |
| **Coverage.py** | Análisis de Cobertura | Medición de cobertura de código en backend. |
| **Git & GitHub** | Control de Versiones | Seguimiento de commits, PRs y revisiones de código. |
| **Kanban Helper CLI** | Automatización de Tareas | Sincronización de estados entre GitHub Kanban y Google Sheets. |

### 9.4 Personal y Roles de Prueba

| Integrante | Rol en el Proyecto | Responsabilidades en Pruebas |
|---|---|---|
| **Cristian Vargas** | **QA Lead** & Fullstack Developer | - Redacción y mantenimiento del Plan de Pruebas.<br>- Pruebas automatizadas de backend.<br>- Control de calidad y verificación de criterios de aceptación.<br>- Diagnóstico y resolución de bloqueos en base de datos y signals. |
| **Laura Zarate** | **Product Manager (PM)** & Scrum Master | - Validación de criterios de aceptación funcionales.<br>- Pruebas exploratorias de interfaz de usuario.<br>- Pruebas unitarias en frontend (Angular).<br>- Priorización de bugs en el backlog de Kanban. |
| **Karina Quinteros** | **DevOps Lead** & Tester de Infraestructura | - Mantenimiento de entornos Docker Compose.<br>- Validación de migraciones de base de datos.<br>- Automatización de verificaciones pre-commit y pre-merge.<br>- Control de variables de entorno y dependencias. |

### 9.5 Entrenamiento Requerido

Capacidades técnicas del equipo para la ejecución del plan:
- Mocking en Django con `unittest.mock.patch` y `@override_settings`.
- Manejo de transacciones en Django y resolución de bloqueos en SQLite con `transaction.on_commit()`.
- Pruebas reactivas en Angular con `TestBed`, `HttpTestingController` y espías de Jasmine.
- Uso del CLI `kanban_helper.py` para la actualización de estados de tareas.

---

## 10. Planificación y Organización

### 10.1 Procedimientos para las Pruebas

Flujo de trabajo para pruebas:

1. **Definición previa:** Identificar criterios de aceptación y casos de prueba antes de programar la funcionalidad o corrección.
2. **Implementación de pruebas:** Crear o actualizar las pruebas unitarias y de integración correspondientes.
3. **Ejecución local:**
   ```bash
   # Backend (con el entorno virtual activo)
   cd FCC_APP/backend
   python manage.py test --verbosity=2

   # Frontend
   cd FCC_APP/frontend
   ng test --watch=false
   ```
4. **Commits progresivos:** Realizar commits atómicos y secuenciales, verificando que los tests continúen pasando tras cada cambio.
5. **Pull Request y revisión:** Abrir PR desde la rama personal hacia `develop` para revisión de código por un par.
6. **Merge:** Integrar a `develop` solo tras aprobación de la PR y verificación de tests limpios.

### 10.2 Gestión de Defectos

Flujo ante detección de anomalías:

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
  [Escritura de Caso de Prueba de Reproducción (Falla)] 
         │
         ▼
  [Corrección del Código Fuente] 
         │
         ▼
  [Verificación de Suite Completa en Verde] 
         │
         ▼
  [Pull Request con Referencia al Ticket]
```

### 10.3 Matriz de Responsabilidades (RACI)

- **R (Responsible):** Quien ejecuta la actividad.
- **A (Accountable):** Quien aprueba y responde por el resultado.
- **C (Consulted):** Quien aporta información técnica o de negocio.
- **I (Informed):** Quien es notificado del resultado.

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
| **Sprint 1** | `v0.1.0` | `v0.1.0` | 01/06/2026 – 19/06/2026 | Arquitectura base, autenticación JWT, Google OAuth2 y CRUD de Clientes y Vehículos. | **Completado (100%)** |
| **Sprint 2** | `v0.2.0` | `v0.2.0` | 20/06/2026 – 28/08/2026 | Órdenes de Trabajo, Presupuestos, Facturación ARCA (mock), Turnos, Diagnóstico fotográfico y WebSockets. | **Completado (100%)** |
| **Sprint 3** | `v0.3.0` | `v1.0.0` | 01/09/2026 – 25/09/2026 | **Fase de Calidad:** Plan Detallado de Pruebas bajo IEEE 829, regresión total, corrección de concurrencia en signals y estabilización para entrega de cátedra. | **En Curso** |

---

### 10.5 Premisas

1. **Aislamiento en pruebas:** El test runner de Django genera y destruye una base de datos temporal, sin intervenir datos de desarrollo o producción.
2. **Acceso al repositorio:** Todos los desarrolladores disponen de copias locales sincronizadas y permisos sobre sus ramas de trabajo.
3. **Entornos virtuales dedicados:** Cada desarrollador utiliza un entorno virtual Python (`.venv`) con las versiones fijadas en `requirements/base.txt`.
4. **Determinismo de dependencias externas:** Servicios como ARCA y Google se desacoplan mediante mocks en memoria para evitar fallas atribuibles a la red.

---

### 10.6 Dependencias y Riesgos

| Riesgo Identificado | Probabilidad | Impacto | Estrategia de Mitigación |
|---|:---:|:---:|---|
| **Indisponibilidad del servicio de facturación ARCA** | Media | Alto | **Mitigación:** Aislamiento con cliente mock en la suite de pruebas; validación con servidores de homologación únicamente en staging. |
| **Bloqueo concurrente de tablas en SQLite (`database table is locked`)** | Alta *(Detectado)* | Medio | **Mitigación:** Uso de `transaction.on_commit()` en `ordenes/signals.py` para evitar que tareas asíncronas compitan por el cerrojo durante la transacción de prueba. |
| **Conflictos en migraciones de base de datos** | Baja | Alto | **Mitigación:** Sincronizar ramas con `develop` antes de abrir PRs y verificar migraciones con `python manage.py makemigrations --check`. |
| **Diferencias visuales respecto al diseño de Figma** | Media | Bajo | **Mitigación:** Revisiones visuales manuales por la Product Manager (Laura Zarate) previas a la aprobación de módulos en frontend. |
| **Fallas en el envío de correos transaccionales** | Baja | Medio | **Mitigación:** Uso del backend `locmem` en pruebas automáticas; validación de renderizado de plantillas HTML y variables obligatorias. |

---

## 11. Referencias

### 11.1 Referencias Normativas
- **IEEE Std 829-2008:** *IEEE Standard for Software and System Test Documentation*.
- **ISO/IEC/IEEE 29119:** *Software Testing Standards*.
- **ISTQB:** *Certified Tester Foundation Level Syllabus*.
- **SemVer 2.0.0:** *Semantic Versioning Specification* ([semver.org](https://semver.org/)).

### 11.2 Documentación del Proyecto y Wiki
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

| Término | Definición Técnica |
|---|---|
| **API REST** | Interfaz de comunicación cliente-servidor basada en HTTP y transferencias en formato JSON. |
| **ARCA** | Agencia de Recaudación y Control Aduanero (organismo fiscal emisor del CAE en Argentina). |
| **Baseline (Línea Base)** | Versión estable y congelada del código y documentación utilizada como punto de referencia. |
| **CAE** | Código de Autorización Electrónico otorgado por ARCA que valida una factura. |
| **DoD (Definition of Done)** | Criterios acordados de código, pruebas y documentación necesarios para dar por finalizada una tarea. |
| **DRF (Django REST Framework)** | Biblioteca para construir APIs REST en Django. |
| **Fixture** | Conjunto predeterminado de datos para inicializar pruebas en un estado conocido. |
| **JWT (JSON Web Token)** | Estándar (RFC 7519) para transmisión segura de credenciales de autenticación. |
| **Mock** | Objeto simulado que emula el comportamiento de un servicio real para aislar pruebas. |
| **OT (Orden de Trabajo)** | Entidad que gestiona la reparación de un vehículo desde el ingreso hasta la entrega. |
| **Prueba de Regresión** | Verificación de que los cambios recientes no rompen funcionalidades existentes. |
| **RBAC (Role-Based Access Control)** | Control de acceso según roles de usuario (`ADMIN`, `TECNICO`, `CLIENTE`). |
| **Signal** | Mecanismo desacoplado en Django para ejecutar acciones tras eventos de modelo. |
| **Soft-Delete (Borrado Lógico)** | Marcado de registros como inactivos (`activo=False`) sin eliminarlos físicamente de la base. |
| **WebSockets** | Protocolo de comunicación bidireccional en tiempo real sobre una única conexión TCP. |
