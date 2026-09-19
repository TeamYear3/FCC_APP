# FCC_APP - Sistema de Gestión Comercial y Operativa para Talleres Mecánicos

Plataforma web integral diseñada específicamente para optimizar y digitalizar de punta a punta la administración operativa y la gestión comercial de talleres mecánicos independientes. Desarrollado por estudiantes de la TSDS del ISPC, 2026.

---

## 🛠️ Prerrequisitos

Para levantar y desarrollar en este proyecto, asegúrate de contar con los siguientes elementos instalados localmente:

- **Docker Engine**: Versión `20.10.x` o superior.
- **Docker Compose**: Versión `2.x.x` o superior.
- **Node.js**: Versión `22.x.x` (LTS recomendada).
- **Python**: Versión `3.12` o `3.13`.
- **Angular CLI**: Versión `21.x` o `22.x` (para desarrollo local sin Docker).

---

## 🚀 Guía de Inicialización Rápida

Sigue estos sencillos pasos para iniciar todo el ecosistema de microservicios:

### 1. Clonar el repositorio y acceder
```bash
git clone https://github.com/TeamYear3/FCC_APP.git
cd FCC_APP
```

### 2. Configurar las Variables de Entorno
Duplica la plantilla de variables de entorno y renómbrala a `.env`:
```bash
cp .env.example .env
```
*(En Windows PowerShell: `Copy-Item .env.example .env`)*

Abre el archivo `.env` resultante en tu editor y define o ajusta las credenciales locales de las bases de datos y los servicios.

### 3. Levantar el Entorno con Docker Compose
Para compilar y levantar de forma automatizada todos los servicios (Django, Angular, PostgreSQL, MongoDB y Redis):
```bash
docker compose up --build
```

Este comando descargará las imágenes necesarias, compilará los contenedores para el Frontend y el Backend, y expondrá las aplicaciones en tu máquina local.

Para apagar el entorno liberando los recursos:
```bash
docker compose down
```

---

## 🗺️ Mapeo de Puertos y Servicios Locales

Una vez levantada la orquestación con Docker Compose, podrás interactuar con los diferentes servicios en las siguientes direcciones de red:

| Servicio | Puerto Local | URL de Acceso | Descripción |
| :--- | :---: | :--- | :--- |
| **Frontend (Angular)** | `4200` | [http://localhost:4200](http://localhost:4200) | Interfaz gráfica de la aplicación |
| **Backend API (Django)** | `8000` | [http://localhost:8000](http://localhost:8000) | Endpoints REST de la API |
| **Admin de Django** | `8000` | [http://localhost:8000/admin](http://localhost:8000/admin) | Consola de administración interna |
| **PostgreSQL** | `5432` | `localhost:5432` | Base de datos relacional del sistema |
| **MongoDB** | `27017` | `localhost:27017` | Almacenamiento no relacional / logs |
| **Redis** | `6379` | `localhost:6379` | Caché en memoria para optimización |

---

## 📁 Estructura del Repositorio

- `/backend`: Servidor Backend (Django).
  - `/backend/config/`: Archivos de configuración de Django, incluyendo `settings/` modular.
  - `/backend/requirements/`: Dependencias de Python segregadas (`base.txt`, `development.txt`, `production.txt`).
- `/frontend`: Código fuente de la interfaz de usuario en Angular con soporte integrado de Tailwind CSS.
- `docker-compose.yml`: Definición de la orquestación de la infraestructura.
- `.env.example`: Plantilla base de configuración de variables de entorno.

---

## 🍃 Justificación Técnica de Persistencia NoSQL (MongoDB) - TK107

Dentro de la arquitectura de **FCC_APP**, el modelo de datos utiliza un enfoque híbrido de persistencia (**Polyglot Persistence**) para garantizar la máxima performance, escalabilidad y separación de responsabilidades:

1. **PostgreSQL (Base Relacional Principal):** Administra las entidades transaccionales ACID principales (`Usuarios`, `Clientes`, `Vehiculos`, `OrdenesDeTrabajo`, `Presupuestos`, `Facturas`).
2. **MongoDB (Base NoSQL de Documentos):** Se encarga del almacenamiento de datos no estructurados, eventos de alto volumen y registros de trazabilidad cronológica sin penalizar el rendimiento de la base relacional:
   - **`audit_logs` (Historial de Trazabilidad de OTs):** Registro inmutable tipo *append-only* de cada cambio de estado, diagnóstico técnico y movimiento de repuestos en los expedientes de taller.
   - **`arca_error_logs` (Telemetría tributaria de ARCA):** Payload JSON estructurado con las respuestas, excepciones y tokens de autenticación devueltos por la API de ARCA (ex AFIP) para auditar rechazos o inconsistencias de facturación fiscal.
   - **`websocket_events` (Historial de Eventos en Tiempo Real):** Registro de mensajería y notificaciones push transmitidas mediante Django Channels / Daphne (WebSockets) entre Administradores y Técnicos en taller.

---

## 🔑 Usuarios de Prueba Preconfigurados

Para facilitar la evaluación técnica y funcional del sistema, se encuentran disponibles las siguientes credenciales preconfiguradas según el rol del usuario:

| Rol | Correo Electrónico | Contraseña | Alcance y Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@fcc.com` | `admin123` | Control total del sistema, ABM Clientes/Vehículos, Facturación ARCA y Gestión de Turnos. |
| **Técnico** | `tecnico@fcc.com` | `tecnico123` | Operativa de taller, confección de presupuestos, checklist de OT y cierre de servicio. |
| **Cliente** | `cliente@fcc.com` | `cliente123` | Portal de autogestión, consulta de estado de vehículo y aprobación de presupuestos. |

---

## 🧪 Ejecución de Pruebas y Compilación

### Backend (Django REST)
Para ejecutar la suite completa de pruebas unitarias de backend utilizando el entorno de configuraciones dinámicas desde variables de entorno (`TK106`):

```bash
# Opción 1: En entorno virtual local (desde la carpeta backend/)
python manage.py test --settings=config.settings.test

# Opción 2: Dentro del contenedor Docker activo (desde la raíz)
docker compose exec backend python manage.py test --settings=config.settings.test
```

### Frontend (Angular 21)
Para validar la suite de pruebas unitarias y la compilación de producción del cliente web:

```bash
# Ejecución de pruebas unitarias con Karma / Jasmine (desde la carpeta frontend/)
npm test

# Compilación de producción (TypeScript + Angular Compiler)
npm run build
```

---

## 🐳 Comandos Útiles de Administración con Docker

```bash
# Aplicar migraciones en PostgreSQL
docker compose exec backend python manage.py migrate

# Crear un nuevo superusuario interactivo
docker compose exec backend python manage.py createsuperuser

# Acceder a la consola interactiva de Django
docker compose exec backend python manage.py shell

# Ver logs en tiempo real de los servicios
docker compose logs -f backend frontend
```


