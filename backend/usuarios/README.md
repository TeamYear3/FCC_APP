# Módulo de Usuarios y Gestión de Roles

Este módulo implementa el modelo personalizado de usuario y control de accesos por roles siguiendo la arquitectura por aplicaciones tradicional de Django con Django REST Framework.

## Modelo de Datos `Usuario`

El modelo `Usuario` extiende `AbstractBaseUser` y `PermissionsMixin` para modelar de forma precisa los campos del DER:

*   `id`: Identificador único UUID (`UUIDField`, llave primaria, autogenerado).
*   `email`: Dirección de correo electrónico del usuario (`EmailField`, llave única, campo utilizado para login).
*   `nombre`: Nombre de pila del usuario (`CharField`, obligatorio).
*   `apellido`: Apellido del usuario (`CharField`, obligatorio).
*   `password`: Hash irreversible de la contraseña (mapeado a la columna `password_hash` en la base de datos). Es nullable para soportar autenticación 100% Google OAuth.
*   `rol`: Rol asignado al usuario (`CharField` con choices: `admin`, `tecnico`, `cliente`).
*   `active`: Estado de la cuenta (`BooleanField`, por defecto `True`).
*   `is_staff`: Permiso de acceso a la interfaz de administración de Django (`BooleanField`).
*   `creado_en` / `actualizado_en`: Campos de auditoría cronológica.

## Roles del Sistema

El sistema maneja tres roles diferenciados cuyos valores persistidos en la base de datos se escriben en minúsculas:

1.  `admin`: **Administrador**. Posee acceso total al panel de control, configuración, reportería, facturación y gestión operativa.
2.  `tecnico`: **Técnico**. Puede gestionar y actualizar órdenes de trabajo activas, pero no tiene acceso a módulos administrativos, facturación ni reportes.
3.  `cliente`: **Cliente** (Rol predeterminado). Únicamente posee acceso de lectura sobre su propia información, vehículos y estados de órdenes de trabajo asociadas.

## Seguridad

Las contraseñas de los usuarios locales se encriptan utilizando el algoritmo **Argon2** (vía la configuración del backend configurada en `base.py`), cumpliendo con la RNF-02 para un almacenamiento irreversible.
