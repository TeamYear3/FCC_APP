# Evidencia de accesibilidad Lighthouse — ACC-02

**Ticket:** TK233 (#294)
**Alcance:** capturar cuatro vistas de la aplicación y conservar los resultados reales de Lighthouse.
**Actualizado:** 13/10/2026
**Estado:** capturas de pantalla generadas; mediciones de Lighthouse pendientes.

## Estado por vista

| Vista | Ruta | Captura | Informe Lighthouse | Puntaje | Estado |
|---|---|---|---|---:|---|
| Ingreso | `/autenticacion` | `captura_lighthouse_autenticacion.png` | Pendiente | Pendiente | Capturada |
| Portal del cliente | `/portal-cliente` | `captura_lighthouse_portal_cliente.png` | Pendiente | Pendiente | Capturada |
| Gestión de clientes | `/admin/clientes` | `captura_lighthouse_clientes.png` | Pendiente | Pendiente | Capturada |
| Órdenes de trabajo | `/admin/ordenes` | `captura_lighthouse_ordenes.png` | Pendiente | Pendiente | Capturada |

Las cuatro capturas se generaron desde el build de esta rama el 13/10/2026. La suite comprobó la visibilidad de la vista antes de tomar cada imagen; la prueba individual de ingreso terminó con resultado correcto. La corrida de la suite completa no devolvió su resumen final porque quedó un servidor de pruebas ocupando el puerto 4300. La captura no mide el puntaje de Lighthouse.

No hay resultados medidos adjuntos en esta rama. Ejecutar Lighthouse por separado sobre cada ruta, guardar los reportes HTML originales y registrar la versión, el puntaje y los hallazgos. No marcar las vistas como aprobadas en Lighthouse hasta contar con esos resultados.

## Ejecución

Desde `frontend`, ejecutar el build y las capturas:

```powershell
npm run test:e2e -- e2e/tests/capture-screenshots.spec.ts
```

Después, ejecutar Lighthouse para cada vista sobre la aplicación levantada y archivar los reportes originales en este directorio.
