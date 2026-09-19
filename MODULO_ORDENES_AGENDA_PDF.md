# Módulo: Operatividad de Taller, Navegación de Órdenes, Agenda y Exportación PDF

## 🎯 Objetivo del Módulo

Centralizar y optimizar la gestión operativa de Órdenes de Trabajo en el taller mecánico, permitiendo al personal administrativo y técnico localizar rápidamente unidades activas mediante un buscador relacional multi-criterio, visualizar y planificar compromisos de entrega y turnos concurrentes sobre un calendario interactivo unificado, inspeccionar el expediente con una grilla master-detail reactiva y emitir comprobantes impresos oficiales en formato PDF con desglose de repuestos y mano de obra.

---

## 📚 Conceptos Clave para Estudiar

### Generación Dinámica de Documentos PDF con ReportLab y Streams en Memoria
- **Qué es:** ReportLab es una biblioteca para Python que permite construir documentos PDF programáticamente utilizando primitivas vectoriales o flujo de elementos maquetados (Platypus Flowables como tablas, párrafos y espaciadores).
- **Por qué se usa aquí:** Para exportar el comprobante legal de la Orden de Trabajo sin generar archivos temporales en el sistema de archivos del servidor. El PDF se ensambla directamente en un flujo binario en memoria (`io.BytesIO()`) y se transfiere al cliente web a través de un `HttpResponse(content_type='application/pdf')` con la cabecera `Content-Disposition`, maximizando el rendimiento y evitando consumo innecesario de almacenamiento en disco.
- **Documentación:** [ReportLab Reference Manual](https://docs.reportlab.com/)

### Calendario Reactivo e Integración Multi-Fuente con FullCalendar v6
- **Qué es:** FullCalendar es una suite modular de componentes para renderizar vistas de agenda (mensual, semanal, diaria) con soporte para interacción de arrastre, selección y manejo de eventos temporales.
- **Por qué se usa aquí:** Permite fusionar en una única cuadrícula temporal dos flujos de trabajo diferentes: los turnos de recepción pactados con clientes y las órdenes de trabajo activas en taller. Al hacer clic sobre cualquier bloque de orden, el sistema captura el identificador y transfiere el foco de navegación automáticamente al expediente de la orden correspondiente.
- **Documentación:** [FullCalendar Angular Documentation](https://fullcalendar.io/docs/angular)

### Consultas Relacionales Multi-Criterio con Django `Q` Objects
- **Qué es:** La clase `django.db.models.Q` encapsula sentencias condicionales SQL que pueden combinarse con operadores lógicos bit a bit (`|` para OR, `&` para AND, `~` para NOT).
- **Por qué se usa aquí:** Para permitir que un único campo de búsqueda rápida en el panel de administración filtre órdenes de trabajo evaluando simultáneamente si el término ingresado coincide con el número de orden, la patente del vehículo, el nombre del cliente o su documento de identidad, ejecutando una única consulta SQL optimizada con `select_related` sin generar problemas de N+1.
- **Documentación:** [Django Queries with Q Objects](https://docs.djangoproject.com/en/5.0/topics/db/queries/#complex-lookups-with-q-objects)

### Patrón Maestro-Detalle (Master-Detail) con Reactividad en Angular
- **Qué es:** Patrón de interfaz donde una grilla o listado principal (maestro) controla la selección activa y actualiza dinámicamente un panel de información detallada (detalle) sin recargar la página.
- **Por qué se usa aquí:** Permite al operario recorrer la lista de órdenes abiertas con soporte de paginación y ordenamiento, mientras que el doble clic o clic de fila actualiza el estado de la orden activa y posiciona el scroll de pantalla de forma reactiva y fluida sobre el expediente técnico.
- **Documentación:** [Angular Signals & Components Guide](https://angular.dev/guide/signals)

---

## 📋 Tickets del Módulo

| TK ID | Título | Estado Actual | Descripción Breve |
|-------|--------|---------------|-------------------|
| **TK093** | Ficha Técnica de Expediente y Datos Consolidados en Tab Detalle (#136) | In Review | Consolidación de datos del vehículo, cliente y orden en cabecera técnica. |
| **TK094** | Vista de Listado de Órdenes Abiertas y Navegación Master-Detail (#137) | In Review | Tabla responsive con selección por clic y soporte móvil. |
| **TK097** | Conectar vistas reales de Facturación y Calendario en Admin (#140) | In Review | Desacople de vistas mock y ruteo a subrutas operativas en `/admin/facturacion`. |
| **TK118** | Enrutar módulo de facturación al calendario administrativo ARCA (#165) | In Review | Enrutamiento desacoplado y semaforización de vencimientos tributarios. |
| **TK119** | Enriquecer serializer de OT y unificar filtros avanzados multi-criterio (#166) | In Review | Campos desnormalizados en serializer y búsqueda con objetos `Q`. |
| **TK120** | Grilla interactiva de OTs, orden activa dinámica y doble clic (#167) | In Review | Selección reactiva de orden activa con auto-scroll al expediente. |
| **TK121** | Endpoint y acción para imprimir y exportar Orden de Trabajo en PDF (#168) | In Review | Generación de comprobante en PDF con ReportLab descargable desde la cabecera. |
| **TK122** | Integrar Órdenes de Trabajo y actividades en Agenda FullCalendar (#169) | In Review | Visualización de OTs y turnos en agenda unificada con navegación al expediente. |

---

## 🔄 Plan de Entrega

1. **TK097 & TK118** → Se resuelven primero en el enrutamiento para asegurar que las vistas de facturación y calendario posean rutas limpias sin colisiones en el layout de administración.
2. **TK119** → Enriquecimiento del backend (`OrdenTrabajoSerializer` y vista con filtros `Q`) para alimentar de datos a la grilla y al calendario.
3. **TK094 & TK120** → Construcción de la grilla interactiva de órdenes con paginación, filtros semánticos y selección master-detail.
4. **TK093** → Consolidación de la ficha técnica y datos del expediente seleccionada.
5. **TK121** → Endpoint y servicio de exportación PDF mediante ReportLab integrado con el botón Imprimir de la cabecera.
6. **TK122** → Integración de las órdenes en la agenda FullCalendar con acceso directo al detalle.

---

## 📝 Mensaje de Pull Request (borrador)

```markdown
# Integración de Operatividad de Taller, Navegación de Órdenes, Agenda y Exportación PDF (TK093, TK094, TK097, TK118, TK119, TK120, TK121, TK122)

Implementé una solución integral para optimizar la gestión diaria del taller mecánico, abordando la necesidad de localizar órdenes de forma ágil, sincronizar los plazos de entrega con la agenda y proveer documentación formal para el cliente. Integré la grilla interactiva de órdenes de trabajo con soporte de paginación y navegación maestro-detalle, conecté la visualización unificada en el calendario administrativo y habilité la exportación documental de comprobantes de servicio.

En el backend enriquecí el serializador principal de órdenes de trabajo para incorporar información desnormalizada de titular y vehículo, optimicé la consulta mediante operadores lógicos relacionales en una única sentencia SQL e implementé el endpoint de generación de comprobantes en formato PDF utilizando ReportLab con ensamblado en memoria mediante flujos binarios. En el frontend desacoplé los componentes de calendario y facturación resolviendo la superposición de rutas en el panel de administración, estructuré la tabla responsiva con selección interactiva y vinculé la agenda FullCalendar para que los eventos de órdenes de trabajo permitan navegar directamente al expediente técnico correspondiente.

Verifiqué la implementación mediante la ejecución de la suite completa de pruebas unitarias en el backend con ciento setenta y seis casos en verde, incluyendo la validación del endpoint de descarga de PDF con cabeceras de contenido correctas. Realicé pruebas de navegación y rendimiento en el frontend validando la respuesta de la grilla ante búsquedas concurrentes y comprobando la alternancia entre la agenda y la vista de detalle sin pérdidas de estado.

Closes #136, Closes #137, Closes #140, Closes #165, Closes #166, Closes #167, Closes #168, Closes #169
```

---

## ⚠️ Datos Relevantes

- **Dependencias entre apps:** La app `ordenes` interactúa estrechamente con `vehiculos`, `clientes` y `turnos`.
- **Librerías externas incorporadas:** `reportlab` en el backend para la composición del PDF; `@fullcalendar/core`, `@fullcalendar/daygrid` e `@fullcalendar/interaction` en el frontend.
- **Migraciones de base de datos:** No requirió migraciones estructurales adicionales (los campos ya se encontraban soportados en el esquema de base de datos).
- **Riesgos y mitigaciones:** Se verificó que la importación de ReportLab sea opcional o tolerante a fallos en entornos de prueba aislados.
