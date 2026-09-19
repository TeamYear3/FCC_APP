# Plan de Gestión de la Configuración — FCC_APP

**Proyecto:** FCC_APP — Sistema de Gestión Comercial y Operativa para Talleres Mecánicos  
**Repositorio:** [https://github.com/TeamYear3/FCC_APP](https://github.com/TeamYear3/FCC_APP)  
**Equipo:** Karina Quinteros, Cristian Vargas, Laura Zarate  
**Fecha:** Agosto 2026

---

## 1. Criterio de Versionado

El equipo adopta el estándar de **Versionado Semántico 2.0.0 (SemVer)** con la estructura `MAJOR.MINOR.PATCH` (por ejemplo, `v1.0.0`), adaptándose al ciclo de sprints del proyecto:

| Componente | Cuándo se incrementa | Ejemplo en el proyecto |
|---|---|---|
| **MAJOR** (`X.0.0`) | Cambios que rompen la compatibilidad hacia atrás. En el contexto académico, `v1.0.0` representará la entrega final del sistema completo. | `v1.0.0` — Defensa oral ante la cátedra |
| **MINOR** (`0.Y.0`) | Incorporación de nuevas funcionalidades completas y estables. Cada incremento corresponde a la finalización de un Sprint. | `v0.1.0` — Sprint 1, `v0.2.0` — Sprint 2 |
| **PATCH** (`0.0.Z`) | Corrección de errores menores, refactorizaciones de código o actualizaciones de documentación. | `v0.2.1` — Bugfix post-Sprint 2 |

---

## 2. Componentes del Producto (Elementos de Configuración)

Los artefactos que entran bajo control de la gestión de la configuración se organizan en el repositorio bajo la siguiente estructura:

| Componente | Ubicación | Descripción |
|---|---|---|
| **Código Backend** | `/backend` | API REST en Django + Django REST Framework, configuraciones del servidor, requerimientos segregados (`/backend/requirements/base.txt`, `development.txt`, `production.txt`). |
| **Código Frontend** | `/frontend` | Interfaz de usuario en Angular (módulos, componentes, servicios) con soporte de Tailwind CSS. |
| **Infraestructura** | `/docker-compose.yml`, `.env.example` | Orquestación de servicios (Django, Angular, PostgreSQL, MongoDB, Redis) y plantilla de variables de entorno. |
| **Documentación** | `/README.md`, `/CHANGELOG.md`, `/docs/` | Guía de inicio, registro de cambios y documentación técnica del proyecto. |
| **Automatización** | `/.agents` (fuera del repo) | Scripts y configuraciones del entorno de desarrollo (`kanban_helper.py` para sincronización con el tablero de GitHub y Google Sheets). |

---

## 3. Criterio de Línea Base (Baseline)

Una **Línea Base** representa un estado estable y formalmente revisado del software que sirve como punto de referencia para el desarrollo posterior. En este proyecto se establecen dos tipos:

### 3.1 Línea Base de Integración (Continua)

Se establece cada vez que una Pull Request de un desarrollador se aprueba y se fusiona en la rama `develop`. Para que esta línea base quede fijada:

- La suite completa de pruebas unitarias debe estar en verde.
- La funcionalidad debe cumplir con la Definition of Done (DoD) del equipo.

### 3.2 Línea Base de Release (Hito de Sprint)

Se establece formalmente al finalizar cada Sprint. Representa una versión completamente funcional, probada y validada del sistema. El momento de "congelación" ocurre cuando:

1. La rama `develop` se fusiona hacia `main` mediante un Pull Request de Release.
2. Se aplica una **etiqueta (tag)** en Git con el número de versión (por ejemplo, `v0.1.0-sprint1`).
3. Se registran los cambios en el archivo `CHANGELOG.md`.

---

## 4. Estrategia de Ramas (Git Flow Simplificado)

Para mantener un historial limpio y evitar conflictos complejos, el equipo utiliza una adaptación simplificada de **Git Flow**:

```
main ─────────────────────────────────────────── (producción, solo releases)
  │
  └── develop ────────────────────────────────── (integración del equipo)
        ├── cristian-vargas ──────────────────── (rama personal persistente)
        ├── karina-quinteros ─────────────────── (rama personal persistente)
        └── laura-zarate ─────────────────────── (rama personal persistente)
```

| Rama | Propósito | Protección |
|---|---|---|
| `main` | Código estable para releases oficiales de cada Sprint. | Protegida contra commits directos. Solo recibe merges desde `develop`. |
| `develop` | Consolidación de los desarrollos del equipo. Todas las ramas personales apuntan a `develop` al integrar cambios. | Recibe Pull Requests de las ramas individuales. |
| `cristian-vargas`, `karina-quinteros`, `laura-zarate` | Ramas personales persistentes donde cada integrante sube sus avances diarios. | Sin protección especial; cada desarrollador gestiona la suya. |

**Justificación:** Esta estructura es óptima para un equipo de 3 integrantes en un entorno académico, ya que reduce la sobrecarga de crear y borrar decenas de ramas de características (feature branches) y garantiza que el historial de Git refleje el trabajo progresivo y continuo de cada estudiante directamente en su rama asignada.

---

## 5. Convenciones del Equipo

### 5.1 Mensajes de Commit (Conventional Commits)

El formato obligatorio es:

```
<tipo>(<alcance>): <descripción breve>
```

**Tipos permitidos:**

| Tipo | Uso | Ejemplo |
|---|---|---|
| `feat` | Nueva funcionalidad | `feat(backend): desarrollar endpoint para creación de turnos` |
| `fix` | Corrección de errores | `fix(frontend): corregir validación en el formulario de login` |
| `chore` | Mantenimiento o configuración | `chore(infra): configurar docker-compose para PostgreSQL` |
| `docs` | Documentación | `docs: actualizar README con variables de entorno` |
| `refactor` | Cambios sin modificar comportamiento | `refactor(frontend): optimizar componentes de navegación` |
| `test` | Pruebas unitarias | `test(backend): agregar test para validación de patente única` |

### 5.2 Nomenclatura de Ramas

- **Ramas personales:** `nombre-apellido` (minúsculas, separadas por guión).
- **Ramas principales:** `main` y `develop`.

### 5.3 Proceso de Pull Request y Revisión de Código

1. **Pruebas locales:** El desarrollador ejecuta `python manage.py test` y verifica que no existan errores.
2. **Creación de la PR:** Se abre la PR detallando el ID de la tarea del Kanban (`Closes #ID`).
3. **Revisión por pares:** Al menos otro integrante debe revisar la PR. El autor no puede aprobar su propia PR.
4. **Sin aprobación prematura:** Si la PR contiene conflictos de merge o pruebas fallidas, se marca con "Request Changes" y el autor resuelve en su rama local.
5. **Definition of Done (DoD):** Para realizar el merge, se debe cumplir:
   - Código libre de advertencias y formateado adecuadamente.
   - Pruebas unitarias correspondientes creadas y aprobadas.
   - Criterios de aceptación de la historia de usuario validados.
   - Sin variables de entorno ni credenciales sensibles en el código.

---

## 6. Roles y Responsabilidades

| Integrante | Rol | Responsabilidades |
|---|---|---|
| **Karina Quinteros** | Líder de Configuración (DevOps) | Administrar el repositorio central, resolver conflictos complejos de integración en `develop` y `main`, gestionar variables de entorno comunes, crear etiquetas de release al cierre de cada Sprint y mantener la orquestación con Docker Compose. |
| **Laura Zarate** | Product Manager (PM) & Scrum Master | Administrar el Product Backlog, validar criterios de aceptación en las Pull Requests, verificar la trazabilidad de requisitos hacia historias de usuario y actualizar el estado de los ítems en el Kanban y Product Backlog. |
| **Cristian Vargas** | QA Lead / Fullstack Developer | Redactar y mantener el Plan de Pruebas, implementar pruebas unitarias y de integración en backend, certificar criterios de aceptación en Pull Requests y asegurar que la suite de tests pase al 100%. |
