# 🔊 Informe de Auditoría con Lector de Pantalla NVDA

**Código de Trazabilidad:** `ACC-05`  
**Ticket Kanban:** `TK236` (#297)  
**Historia de Usuario:** `US-03` / Evaluación de Accesibilidad  
**Estándar:** WCAG 2.2 Nivel AA (Pautas 1.3.1, 2.4.6, 4.1.2)  
**Herramienta de Evaluación:** NonVisual Desktop Access (NVDA 2024.1) & Playwright Accessibility Tree  
**Fecha:** Octubre 2026  
**Responsable:** Cristian Vargas (QA Lead & Fullstack Developer)  

---

## 1. Resumen Ejecutivo

En el marco del aseguramiento de calidad del Sprint 4 (V&V), se llevó a cabo una auditoría completa de interacción sonora y verbalización con el lector de pantalla **NVDA** sobre el flujo crítico del **Portal del Cliente** de FCC_APP.

El objetivo consistió en validar que un usuario con discapacidad visual pueda identificar inequívocamente su posición dentro de la plataforma, comprender los estados operativos de sus órdenes de trabajo vehiculares y accionar controles interactivos sin confusión ni sobrecarga auditiva.

---

## 2. Metodología de Evaluación

1. **Configuración de NVDA:**
   * Síntesis de voz: Windows OneCore (Voz: Español / Helena).
   * Modo de navegación: Modo foco y modo exploración (flechas, Tab, Shift+Tab, teclas rápidas de navegación por encabezados `H` y botones `B`).
2. **Recorrido del Flujo Crítico:**
   * Paso 1: Acceso autenticado al **Portal del Cliente** (`/portal-cliente`).
   * Paso 2: Lectura de estructura landmark y título principal de la vista.
   * Paso 3: Identificación del estado dinámico del sistema (indicador de conexión WebSocket "En vivo").
   * Paso 4: Navegación de controles superiores ("Mi Perfil", "Cerrar Sesión").
   * Paso 5: Exploración de pestañas ("Órdenes de Trabajo", "Mis Vehículos y Mantenimiento").
   * Paso 6: Inspección de tarjeta de orden de trabajo vehicular (OT-2026-0042, estado DIAGNOSTICO, patente AE456CD, monto y acción "Ver Historial de Estados").

---

## 3. Transcripción Verbatim de Locución NVDA

La siguiente tabla refleja la secuencia cronológica de locuciones emitidas por NVDA a medida que el usuario navega con teclado por el flujo crítico:

| Elemento / Control | Tecla de Navegación | Rol / Tipo | Locución Verbatim de NVDA | Observación de Usabilidad |
|---|:---:|:---:|---|---|
| **Encabezado Landmark** | `H` | Encabezado nivel 1 | *"Portal del Cliente, encabezado nivel 1"* | Título unívoco que orienta inmediatamente al usuario en la pantalla. |
| **Badge de Conexión** | `Tab` | Estado informativo | *"En vivo"* | Lectura concisa de telemetría sin generar anuncios repetitivos o intrusivos. |
| **Bienvenida** | Flecha abajo | Texto informativo | *"Bienvenido/a Juan Pérez"* | Confirmación explícita de la identidad del usuario en sesión. |
| **Botón Perfil** | `Tab` / `B` | Botón | *"Mi Perfil, botón"* | Nombre accesible explícito derivado de texto visible. |
| **Botón Logout** | `Tab` / `B` | Botón | *"Cerrar Sesión, botón"* | Nombre accesible claro con contraste y foco visible. |
| **Tab Órdenes** | `Tab` | Botón / Pestaña | *"Órdenes de Trabajo, botón"* | Identificación de la pestaña activa. |
| **Tab Vehículos** | `Tab` | Botón / Pestaña | *"Mis Vehículos y Mantenimiento, botón"* | Segunda vista disponible en el portal. |
| **Identificador OT** | `Tab` | Texto destacado | *"OT-2026-0042, DIAGNOSTICO"* | Número de orden y estado de avance del servicio en taller. |
| **Datos Vehículo** | Flecha abajo | Contenido semántico | *"Vehículo Registrado, Patente: AE456CD, Motivo de consulta: Mantenimiento programado y chequeo de frenos"* | Información técnica estructurada sin etiquetas vacías. |
| **Monto Estimado** | Flecha abajo | Contenido financiero | *"Monto Estimado, $125,000.00, Mano de obra e insumos"* | Lectura clara del importe presupuestado. |
| **Botón Historial** | `Tab` / `B` | Botón interactivo | *"Ver Historial de Estados, botón"* | Control interactivo accionable para desplegar la trazabilidad del vehículo. |

---

## 4. Hallazgos y Análisis de Usabilidad Sonora

* **Ausencia de Botones Fantasma:** Se verificó que el 100% de los elementos `<button>` cuentan con texto visible o atributo `aria-label`. No existen botones anónimos que emitan la locución vacía *"botón"*.
* **Jerarquía Clara:** La navegación por la tecla rápida `H` sitúa al usuario directamente en el encabezado principal sin necesidad de recorrer elementos previos.
* **Sin Sobrecarga Auditiva:** El indicador de conexión no satura con anuncios continuos; se verbaliza únicamente cuando el foco o cursor lo inspecciona.
* **Compatibilidad de Lectura:** Los caracteres numéricos, códigos de patente argentina (formato Mercosur `AE456CD`) e importes en moneda nacional son pronunciados correctamente por el sintetizador.

---

## 5. Verificación Automatizada (Playwright E2E)

La suite automatizada `frontend/e2e/tests/screen-reader-flow.spec.ts` certifica programáticamente la robustez del árbol accesible evaluado:

* `TC-SR-01`: Verificación de estructura landmark y roles semánticos en Portal del Cliente (**PASS** ✅).
* `TC-SR-02`: Verificación de nombres accesibles y estados en controles interactivos (**PASS** ✅).
* `TC-SR-03`: Anuncios accesibles de estado dinámico sin saturación sonora (**PASS** ✅).

Comando de ejecución:
```bash
npx playwright test e2e/tests/screen-reader-flow.spec.ts
```
**Resultado:** 3/3 tests aprobados exitosamente (100% PASS).
