# Reporte de Línea Base de Rendimiento Backend: Consultas SQL y Tiempos de Respuesta

> Medición automatizada generada mediante el comando `python manage.py audit_performance`.

| Endpoint | Método | Estado HTTP | Total Queries SQL | Consultas Repetidas | Tiempo Respuesta (ms) | Diagnóstico N+1 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `/api/clientes/` (Listado de Clientes) | `GET` | `200` | **1** | 0 | 6.01 ms | [OPTIMO] |
| `/api/vehiculos/` (Listado de Vehículos) | `GET` | `200` | **6** | 4 | 5.51 ms | [ALERTA N+1] |
| `/api/ordenes/` (Listado de Órdenes) | `GET` | `200` | **2** | 0 | 5.4 ms | [OPTIMO] |
| `/api/facturas/` (Listado de Facturas) | `GET` | `200` | **1** | 0 | 2.48 ms | [OPTIMO] |
| `/api/turnos/` (Listado de Turnos) | `GET` | `200` | **2** | 0 | 4.34 ms | [OPTIMO] |
| `/api/ordenes/a460996d-93b6-4988-ad6b-e504d8761674/` (Detalle de Orden de Trabajo) | `GET` | `200` | **4** | 0 | 7.2 ms | [OPTIMO] |
| `/api/ordenes/a460996d-93b6-4988-ad6b-e504d8761674/items/` (Items Presupuesto de Orden) | `GET` | `200` | **6** | 3 | 6.22 ms | [ALERTA N+1] |
| `/api/clientes/0e8b24aa-4765-4818-9276-e4ae1addd476/` (Detalle de Cliente) | `GET` | `200` | **1** | 0 | 1.83 ms | [OPTIMO] |
| `/api/vehiculos/a9a4430b-79b7-46e3-960a-fed308be788a/historial/` (Detalle de Vehículo e Historial) | `GET` | `200` | **5** | 0 | 5.27 ms | [OPTIMO] |

## Detalle de Cuellos de Botella y Patrones SQL Duplicados

### Listado de Vehículos (`/api/vehiculos/`)
- **Queries totales:** 6
- **Consultas repetidas:** 4
- **Patrones detectados:**
  * `5x`: `SELECT "vehiculos_mantenimientoprogramado"."id", "vehiculos_mantenimientoprogramado"."vehiculo_id", "vehiculos_mantenimientoprogramado"."tipo_servicio", "vehicu...`

### Items Presupuesto de Orden (`/api/ordenes/a460996d-93b6-4988-ad6b-e504d8761674/items/`)
- **Queries totales:** 6
- **Consultas repetidas:** 3
- **Patrones detectados:**
  * `4x`: `SELECT "ordenes_adjuntodiagnostico"."id", "ordenes_adjuntodiagnostico"."orden_trabajo_id", "ordenes_adjuntodiagnostico"."item_presupuesto_id", "ordenes_adjuntod...`
