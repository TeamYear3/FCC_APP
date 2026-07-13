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

