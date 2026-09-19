# Módulo: Expediente Clínico de OT, Diagnóstico Multimedia en Tiempo Real y Checklist Dinámico

## 🎯 Objetivo del Módulo

Proveer una interfaz de diagnóstico y ejecución técnica completa y profesional para el mecánico en fosa y el recepcionista de taller, estructurando el expediente en tres pestañas limpias (`Resumen`, `Carga de Mano de Obra y Repuestos`, `Imágenes`), reemplazando listas estáticas con checklist operativo dinámico contra la base de datos real con cálculo de avance porcentual, facilitando la toma directa de fotografías con la cámara del dispositivo móvil o PC con vinculación selectiva a servicios o general, transmitiendo eventos en tiempo real mediante WebSockets multidispositivo y gobernando la transición final de orden mediante precondiciones robustas y mensajes descriptivos ante excepciones.

---

## 📚 Conceptos Clave para Estudiar

### MediaStream API y Captura de Hardware en Vivo (`navigator.mediaDevices.getUserMedia`)
- **Qué es:** API estándar de los navegadores web modernos que permite solicitar acceso a dispositivos de entrada multimedia como cámaras web y micrófonos, capturando flujos de video continuos en elementos `<video>`.
- **Por qué se usa aquí:** Permite que el mecánico tome fotografías de las fallas del vehículo o de los repuestos reemplazados directamente desde su teléfono celular o portátil sin tener que salir de la aplicación ni pasar por aplicaciones externas de galería. La captura se dibuja instantáneamente en un elemento `<canvas>` HTML5 offscreen para comprimirse en formato JPEG/WebP y adjuntarse al formulario.
- **Documentación:** [MDN Web Docs - MediaDevices.getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

### Notificaciones Push Bidireccionales con Django Channels & WebSockets
- **Qué es:** Django Channels extiende las capacidades síncronas de Django para admitir protocolos bidireccionales y basados en eventos como WebSockets sobre una arquitectura ASGI.
- **Por qué se usa aquí:** Permite que cuando un mecánico sube o elimina una fotografía desde su teléfono en el taller, el servidor emita inmediatamente el evento `adjunto_actualizado` a todos los clientes suscritos al canal de la orden. La computadora de administración de recepción actualiza la galería en pantalla en tiempo real sin requerir recargar la página ni ejecutar polling constante al servidor.
- **Documentación:** [Django Channels Official Documentation](https://channels.readthedocs.io/)

### Relaciones Opcionales Polimórficas con Claves Foráneas Nulables (`models.SET_NULL`)
- **Qué es:** En el ORM de Django, un campo `models.ForeignKey(..., null=True, blank=True, on_delete=models.SET_NULL)` permite que una entidad hija exista vinculada a un padre específico o permanezca huérfana de esa relación manteniendo su integridad en caso de eliminación del padre.
- **Por qué se usa aquí:** En el modelo `AdjuntoDiagnostico`, la clave foránea `item_presupuesto` permite asociar una fotografía a un servicio puntual (ej. bomba de nafta o cambio de pastillas) o bien dejarla a nivel general de la orden si refleja el estado inicial de la carrocería o el odómetro del vehículo. Si un ítem de presupuesto se da de baja, la fotografía no se destruye, sino que pasa automáticamente a la galería general de la orden.
- **Documentación:** [Django Models ForeignKey Reference](https://docs.djangoproject.com/en/5.0/ref/models/fields/#foreignkey)

### Máquinas de Estados Finitos y Manejo Descriptivo de Errores de Precondición (HTTP 400)
- **Qué es:** Una máquina de estados restringe las transiciones válidas de un recurso según reglas de negocio predefinidas (ej. una orden no puede pasar a "Listo para Entrega" si no tiene mano de obra aprobada o tareas completadas).
- **Por qué se usa aquí:** Para evitar estados inconsistentes en la base de datos. Cuando el backend rechaza una transición inválida con `HTTP 400 Bad Request` y un detalle JSON estructurado (`{"detail": "..."}`), el frontend captura el payload exacto del error y lo presenta al usuario en un banner semántico de advertencia en lugar de un genérico "Error de servidor", guiando al operario sobre qué precondición falta cumplir.
- **Documentación:** [Django REST Framework Exceptions](https://www.django-rest-framework.org/api-guide/exceptions/)

---

## 📋 Tickets del Módulo

| TK ID | Título | Estado Actual | Descripción Breve |
|-------|--------|---------------|-------------------|
| **TK090** | Contador Dinámico y Persistencia en Control de Tareas (#133) | In Review | Checkboxes dinámicos contra `ItemPresupuesto` con avance porcentual. |
| **TK092** | Vista y Filtrado Dinámico de Repuestos en Tab Repuestos (#135) | In Review | Tabla reactiva de repuestos en Resumen y formulario de insumos. |
| **TK112** | Carga y Confección de Presupuestos Técnicos (#156) | In Review | Formulario de presupuesto técnico con selección de repuestos y mano de obra. |
| **TK113** | Ejecución de Órdenes con Checklist y Cierre de Servicio (#157) | In Review | Checklist operativo de ejecución técnica y botón de transición formal. |
| **TK123** | Storage Multimedia Local y FK `item_presupuesto` (#170) | In Review | Configuración de serving de archivos y migración de base de datos. |
| **TK124** | WebSockets para Adjuntos de Diagnóstico en Tiempo Real (#171) | In Review | Sincronización instantánea de fotos subidas y eliminadas entre móvil y PC. |
| **TK125** | Captura de Fotos con Cámara en Vivo y Visor Modal (#172) | In Review | Integración de getUserMedia, encuadre y zoom modal al 175%. |
| **TK126** | Reestructuración de 3 Pestañas y Erradicación de Mocks (#173) | In Review | Pestañas Resumen, Carga e Imágenes sin datos mock ni pestañas aisladas. |
| **TK127** | Conexión de Botón Finalizar Orden y Manejo de Errores 400 (#174) | In Review | Flujo de cierre operativo y captura de precondiciones de transición. |

---

## 🔄 Plan de Entrega

1. **TK123** → Configuración de serving de archivos estáticos/media en Django y creación de la migración `0005_adjuntodiagnostico_item_presupuesto.py`.
2. **TK124** → Implementación de canales WebSockets y broadcast del evento `adjunto_actualizado` en subida y eliminación de fotos.
3. **TK125** → Construcción del componente de captura con cámara web nativa, selector de vinculación a servicio y visor a pantalla completa con zoom.
4. **TK112, TK090, TK092 & TK126** → Reestructuración del expediente en 3 pestañas limpias, integración de `PresupuestoFormComponent` e implementación del checklist dinámico con cálculo de avance porcentual.
5. **TK113 & TK127** → Conexión del botón "Finalizar Orden y Pasar a Control" y captura de errores descriptivos en transiciones inválidas de estado.

---

## 📝 Mensaje de Pull Request (borrador)

```markdown
# Integración de Expediente Clínico de OT, Diagnóstico Multimedia en Tiempo Real y Checklist Dinámico (TK090, TK092, TK112, TK113, TK123, TK124, TK125, TK126, TK127)

Implementé una profunda reestructuración y modernización del expediente técnico de órdenes de trabajo, solucionando las limitaciones operativas del mecánico en taller y eliminando los componentes aislados y datos mock. Diseñé un entorno unificado de tres pestañas operativas centrado en la inspección de la unidad, la carga y cálculo automático de presupuestos técnicos con repuestos y mano de obra, y la captura multimedia multidispositivo sincronizada al instante.

En el backend extendí el modelo de adjuntos de diagnóstico incorporando la clave foránea optativa hacia el ítem de presupuesto específico con migración de base de datos, configuré el despacho de archivos multimedia locales para el entorno de desarrollo y habilité la transmisión en tiempo real de eventos WebSocket ante la subida y eliminación de fotografías. En el frontend integré el acceso nativo a la cámara mediante la API de medios del navegador con retícula de encuadre y selector de vinculación de servicios, construí el visor modal a pantalla completa con zoom interactivo, parametricé el listado de tareas del checklist directamente contra los ítems de presupuesto persistidos con cálculo porcentual de avance y conecté el flujo de cierre operativo capturando los errores descriptivos de precondiciones de estado.

Verifiqué la implementación mediante la ejecución de la suite completa de pruebas unitarias en el backend alcanzando el cien por ciento de casos aprobados, comprobé la correcta aplicación y reversibilidad de las migraciones de base de datos y validé en el frontend la sincronización concurrente en tiempo real entre sesiones de teléfono móvil y escritorio, así como la respuesta adecuada ante rechazos de validación por transiciones de estado restringidas.

Closes #133, Closes #135, Closes #156, Closes #157, Closes #170, Closes #171, Closes #172, Closes #173, Closes #174
```

---

## ⚠️ Datos Relevantes

- **Dependencias entre apps:** `ordenes` y `presupuestos`.
- **Migraciones de base de datos:** Migración `ordenes/0005_adjuntodiagnostico_item_presupuesto.py` aplicada con éxito.
- **Riesgos y mitigaciones:** Se verificó la disponibilidad de permisos de cámara en navegadores bajo HTTPS o localhost y fallback a selector de archivos tradicional cuando el hardware no se encuentra disponible.
