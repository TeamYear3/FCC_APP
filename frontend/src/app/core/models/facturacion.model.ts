export type TipoComprobante = 'A' | 'B' | 'C';
export type EstadoFactura = 'emitida' | 'anulada';
export type EstadoPago = 'sin_interaccion' | 'pagada' | 'a_vencer' | 'vencida';
export type SemaforoColor = 'sin_interaccion' | 'pagada' | 'a_vencer' | 'vencida';

export interface ItemFactura {
  id: string;
  tipo: 'mano_de_obra' | 'repuesto';
  descripcion: string;
  cantidad: number | string;
  precio_unitario: number | string;
  subtotal: number | string;
}

export interface Factura {
  id: string;
  orden_trabajo: string;
  numero_ot: string;
  cliente_nombre: string;
  vehiculo_patente: string;
  tipo_comprobante: TipoComprobante;
  punto_venta: number;
  numero_factura: number;
  numero_comprobante: string;
  cae: string;
  fecha_vencimiento_cae: string;
  total: number | string;
  estado: EstadoFactura;
  estado_pago: EstadoPago;
  semaforo: SemaforoColor;
  fecha_vencimiento_pago: string | null;
  fecha_emision: string;
  cuit_emisor: string;
  observaciones: string;
  items?: ItemFactura[];
}

export interface EmitirFacturaPayload {
  orden_trabajo_id: string;
  tipo_comprobante?: TipoComprobante;
  punto_venta?: number;
  dias_vencimiento_pago?: number;
  observaciones?: string;
}

export interface FacturaCalendarioItem {
  id: string;
  numero_comprobante: string;
  tipo_comprobante: TipoComprobante;
  total: number | string;
  cliente: string;
  patente: string;
  fecha_emision: string;
  fecha_vencimiento_pago: string | null;
  estado_pago: EstadoPago;
  semaforo: SemaforoColor;
  cae: string;
}

export interface ResumenFinanciero {
  total_facturado: number;
  total_pagado: number;
  total_vencido: number;
  total_a_vencer: number;
  cantidad_comprobantes: number;
}

export interface FacturasCalendarioResponse {
  facturas: FacturaCalendarioItem[];
  resumen: ResumenFinanciero;
}
