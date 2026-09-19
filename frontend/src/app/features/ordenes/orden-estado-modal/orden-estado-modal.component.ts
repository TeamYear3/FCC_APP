import { Component, EventEmitter, Input, Output, inject, signal, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';
import {
  OrdenService,
  OrdenResponse,
  OrdenHistorialResponse,
} from '../../../core/services/orden.service';

@Component({
  selector: 'app-orden-estado-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (mostrar) {
      <div
        class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      >
        <div
          class="bg-[#1E1E1E] border border-[#FFCC00]/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5"
        >
          <!-- Header del Modal -->
          <div class="flex items-center justify-between border-b border-[#2A2A2A] pb-4">
            <div class="flex items-center gap-3">
              <div
                class="p-2.5 bg-[#FFCC00]/10 border border-[#FFCC00]/20 rounded-xl text-[#FFCC00]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-white leading-snug">
                  Gestión Operativa de la Orden
                </h3>
                <p class="text-xs text-gray-400">
                  OT: <span class="text-[#FFCC00] font-mono font-bold">{{ orden?.numero_ot || orden?.id?.slice(0, 8) }}</span>
                </p>
              </div>
            </div>
            <button
              (click)="cerrarModal()"
              class="text-gray-400 hover:text-white transition-colors p-1 bg-transparent border-0 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Selector de Pestaña Interna (Estado vs Cobro) -->
          <div class="flex border-b border-[#2A2A2A] gap-2">
            <button
              type="button"
              (click)="seccionActiva.set('estado')"
              class="pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-colors border-0 bg-transparent cursor-pointer"
              [ngClass]="{
                'text-[#FFCC00] border-b-2 border-[#FFCC00]': seccionActiva() === 'estado',
                'text-gray-400 hover:text-white': seccionActiva() !== 'estado'
              }"
            >
              🔄 Actualizar Estado
            </button>
            <button
              type="button"
              (click)="seccionActiva.set('cobro')"
              class="pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-colors border-0 bg-transparent cursor-pointer flex items-center gap-1.5"
              [ngClass]="{
                'text-[#FFCC00] border-b-2 border-[#FFCC00]': seccionActiva() === 'cobro',
                'text-gray-400 hover:text-white': seccionActiva() !== 'cobro'
              }"
            >
              💳 Registrar Cobro (TK103)
              @if (orden?.estado_cobro === 'cobrado') {
                <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Cobrado</span>
              }
            </button>
          </div>

          <!-- SECCION 1: CAMBIO DE ESTADO OPERATIVO -->
          @if (seccionActiva() === 'estado') {
            <div class="space-y-4 animate-fadeIn">
              <!-- Selector de Nuevo Estado -->
              <div class="space-y-2">
                <label class="text-xs font-semibold text-gray-300 block">Nuevo Estado Proyectado</label>
                <select
                  [ngModel]="nuevoEstado()"
                  (ngModelChange)="onEstadoChange($event)"
                  class="w-full bg-[#121212] border border-[#2A2A2A] rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-[#FFCC00] text-sm font-medium cursor-pointer"
                >
                  <option value="ingresado">Ingresado</option>
                  <option value="en_presupuesto">En Presupuesto</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="en_proceso">En Proceso</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="entregado">Entregado</option>
                  <option value="rechazado">Rechazado</option>
                </select>
              </div>

              <!-- Advertencia Interactiva si intenta pasar a 'En Proceso' sin turno o aprobación (TK036) -->
              @if (mostrarAdvertenciaRequisitos()) {
                <div
                  class="bg-amber-900/30 border border-amber-500/50 rounded-xl p-4 space-y-3 animate-fadeIn"
                >
                  <div class="flex items-start gap-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-6 h-6 text-amber-400 shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div class="text-xs text-amber-200 space-y-1">
                      <span class="font-bold block text-sm"
                        >Requisitos Pendientes para "En Proceso"</span
                      >
                      <p>
                        Esta Orden aún requiere agendar turno en el taller y contar con la aprobación
                        del cliente antes de iniciar los trabajos físicos.
                      </p>
                    </div>
                  </div>

                  <!-- Accesos Rápidos requeridos por TK036 -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      (click)="agendarTurno()"
                      class="w-full bg-[#121212] hover:bg-[#2A2A2A] border border-[#FFCC00]/40 text-[#FFCC00] font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>Agendar Turno</span>
                    </button>
                    <button
                      type="button"
                      (click)="solicitarAprobacion()"
                      class="w-full bg-[#121212] hover:bg-[#2A2A2A] border border-[#FFCC00]/40 text-[#FFCC00] font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <span>Solicitar Aprobación</span>
                    </button>
                  </div>
                </div>
              }

              <!-- Campo Comentario Opcional -->
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-gray-300 block"
                  >Comentario / Motivo de Transición (opcional)</label
                >
                <textarea
                  [ngModel]="comentario()"
                  (ngModelChange)="comentario.set($event)"
                  rows="2"
                  placeholder="Ingrese observaciones o detalles sobre el cambio de estado..."
                  class="w-full bg-[#121212] border border-[#2A2A2A] rounded-xl p-3 text-white text-xs focus:outline-none focus:border-[#FFCC00] resize-none"
                ></textarea>
              </div>

              <!-- Botones de Acción de Cambio de Estado -->
              <div class="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  (click)="cerrarModal()"
                  class="bg-[#2A2A2A] hover:bg-[#333333] text-gray-300 font-medium py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer border-0"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  (click)="confirmarCambioEstado()"
                  [disabled]="
                    isSubmitting() || (nuevoEstado() === 'en_proceso' && orden?.estado === 'ingresado')
                  "
                  class="bg-[#FFCC00] hover:bg-[#e6b800] text-[#121212] font-bold py-2.5 px-5 rounded-xl text-xs shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0"
                >
                  {{ isSubmitting() ? 'Guardando...' : 'Confirmar Estado' }}
                </button>
              </div>
            </div>
          }

          <!-- SECCION 2: REGISTRO DE COBRO DESACOPLADO (TK103) -->
          @if (seccionActiva() === 'cobro') {
            <div class="space-y-4 animate-fadeIn">
              <!-- Resumen de Monto a Cobrar -->
              <div class="bg-[#121212] border border-[#2A2A2A] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span class="text-xs text-gray-400 block font-medium">Total de la Orden de Trabajo</span>
                  <p class="text-xl font-bold font-mono text-[#FFCC00] mt-0.5">
                    $ {{ (orden?.monto_total || 0) | number:'1.2-2' }}
                  </p>
                </div>
                <div class="text-right">
                  <span class="text-[11px] text-gray-400 block">Estado Actual</span>
                  <span
                    class="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
                    [ngClass]="{
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30': orden?.estado_cobro === 'cobrado',
                      'bg-amber-500/20 text-amber-300 border border-amber-500/30': orden?.estado_cobro !== 'cobrado'
                    }"
                  >
                    {{ orden?.estado_cobro === 'cobrado' ? 'Ya Cobrado' : 'Cobro Pendiente' }}
                  </span>
                </div>
              </div>

              <!-- Medio de Pago -->
              <div class="space-y-2">
                <label class="text-xs font-semibold text-gray-300 block">Medio de Pago</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    (click)="metodoPago.set('efectivo')"
                    class="p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 cursor-pointer"
                    [ngClass]="{
                      'bg-[#FFCC00]/15 border-[#FFCC00] text-[#FFCC00]': metodoPago() === 'efectivo',
                      'bg-[#121212] border-[#2A2A2A] text-gray-300 hover:border-gray-500': metodoPago() !== 'efectivo'
                    }"
                  >
                    <span>💵</span>
                    <span>Efectivo</span>
                  </button>
                  <button
                    type="button"
                    (click)="metodoPago.set('transferencia')"
                    class="p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 cursor-pointer"
                    [ngClass]="{
                      'bg-[#FFCC00]/15 border-[#FFCC00] text-[#FFCC00]': metodoPago() === 'transferencia',
                      'bg-[#121212] border-[#2A2A2A] text-gray-300 hover:border-gray-500': metodoPago() !== 'transferencia'
                    }"
                  >
                    <span>🏦</span>
                    <span>Transferencia</span>
                  </button>
                  <button
                    type="button"
                    (click)="metodoPago.set('debito')"
                    class="p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 cursor-pointer"
                    [ngClass]="{
                      'bg-[#FFCC00]/15 border-[#FFCC00] text-[#FFCC00]': metodoPago() === 'debito',
                      'bg-[#121212] border-[#2A2A2A] text-gray-300 hover:border-gray-500': metodoPago() !== 'debito'
                    }"
                  >
                    <span>💳</span>
                    <span>Tarjeta Débito</span>
                  </button>
                  <button
                    type="button"
                    (click)="metodoPago.set('credito')"
                    class="p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 cursor-pointer"
                    [ngClass]="{
                      'bg-[#FFCC00]/15 border-[#FFCC00] text-[#FFCC00]': metodoPago() === 'credito',
                      'bg-[#121212] border-[#2A2A2A] text-gray-300 hover:border-gray-500': metodoPago() !== 'credito'
                    }"
                  >
                    <span>💳</span>
                    <span>Tarjeta Crédito</span>
                  </button>
                </div>
              </div>

              <!-- Checkbox Entregar Orden -->
              <label class="flex items-center gap-2.5 p-3 rounded-xl bg-[#121212] border border-[#2A2A2A] cursor-pointer text-xs text-gray-300 select-none hover:border-gray-600 transition-colors">
                <input
                  type="checkbox"
                  [ngModel]="entregarOrden()"
                  (ngModelChange)="entregarOrden.set($event)"
                  class="w-4 h-4 rounded text-[#FFCC00] focus:ring-0 focus:outline-none accent-[#FFCC00] cursor-pointer"
                />
                <div>
                  <span class="font-bold text-white block">Marcar orden como "Entregada"</span>
                  <span class="text-[11px] text-gray-400">Finaliza el ciclo técnico y registra la entrega al cliente</span>
                </div>
              </label>

              <!-- Comprobante / Observaciones de Cobro -->
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-gray-300 block">Comprobante o Detalle del Pago (opcional)</label>
                <textarea
                  [ngModel]="comentarioCobro()"
                  (ngModelChange)="comentarioCobro.set($event)"
                  rows="2"
                  placeholder="N° de transferencia bancaria, recibo interno o notas de caja..."
                  class="w-full bg-[#121212] border border-[#2A2A2A] rounded-xl p-3 text-white text-xs focus:outline-none focus:border-[#FFCC00] resize-none"
                ></textarea>
              </div>

              <!-- Nota explicativa desacople fiscal -->
              <div class="text-[11px] text-zinc-400 bg-black/40 border border-white/5 rounded-xl p-2.5 flex items-center gap-2">
                <span class="text-[#FFCC00] text-sm">ℹ️</span>
                <span>Registro operativo de cobro del taller sin dependencia directa de comprobante electrónico ARCA.</span>
              </div>

              <!-- Botones de Acción de Cobro -->
              <div class="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  (click)="cerrarModal()"
                  class="bg-[#2A2A2A] hover:bg-[#333333] text-gray-300 font-medium py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer border-0"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  (click)="confirmarCobro()"
                  [disabled]="isSubmitting()"
                  class="bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 px-5 rounded-xl text-xs shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0 flex items-center gap-1.5"
                >
                  <span>{{ isSubmitting() ? 'Registrando...' : 'Confirmar Cobro' }}</span>
                </button>
              </div>
            </div>
          }

          <!-- Mensajes de Estado Globales -->
          @if (mensajeExito()) {
            <div
              class="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-xl animate-fadeIn"
            >
              {{ mensajeExito() }}
            </div>
          }
          @if (mensajeError()) {
            <div
              class="text-xs font-bold text-red-400 bg-red-950/40 border border-red-500/40 p-3 rounded-xl animate-fadeIn"
            >
              {{ mensajeError() }}
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class OrdenEstadoModalComponent implements OnChanges {
  private readonly ordenService = inject(OrdenService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  @Input() mostrar = false;
  @Input() orden: OrdenResponse | null = null;
  @Input() modoInicial: 'estado' | 'cobro' = 'estado';
  @Output() cerrado = new EventEmitter<boolean>();
  @Output() estadoActualizado = new EventEmitter<OrdenHistorialResponse | OrdenResponse>();

  readonly seccionActiva = signal<'estado' | 'cobro'>('estado');
  readonly nuevoEstado = signal<string>('ingresado');
  readonly comentario = signal<string>('');
  
  // Campos de cobro (TK103)
  readonly metodoPago = signal<string>('efectivo');
  readonly entregarOrden = signal<boolean>(false);
  readonly comentarioCobro = signal<string>('');

  readonly isSubmitting = signal<boolean>(false);
  readonly mensajeExito = signal<string | null>(null);
  readonly mensajeError = signal<string | null>(null);
  readonly mostrarAdvertenciaRequisitos = signal<boolean>(false);

  ngOnChanges(): void {
    if (this.orden) {
      this.seccionActiva.set(this.modoInicial || 'estado');
      this.nuevoEstado.set(this.orden.estado || 'ingresado');
      this.comentario.set('');
      this.metodoPago.set(this.orden.metodo_pago || 'efectivo');
      this.entregarOrden.set(this.orden.estado === 'finalizado');
      this.comentarioCobro.set('');
      this.mensajeExito.set(null);
      this.mensajeError.set(null);
      this.evaluarAdvertencia(this.orden.estado);
    }
  }

  onEstadoChange(estado: string): void {
    this.nuevoEstado.set(estado);
    this.evaluarAdvertencia(estado);
  }

  evaluarAdvertencia(estado: string): void {
    if (
      estado === 'en_proceso' &&
      (this.orden?.estado === 'ingresado' || this.orden?.estado === 'en_presupuesto')
    ) {
      this.mostrarAdvertenciaRequisitos.set(true);
    } else {
      this.mostrarAdvertenciaRequisitos.set(false);
    }
  }

  agendarTurno(): void {
    this.cerrarModal();
    const ruta = this.router.url.startsWith('/admin') ? '/admin/turnos' : '/turnos';
    this.router.navigate([ruta], {
      queryParams: {
        ot: this.orden?.numero_ot || this.orden?.id,
        vehiculo_id: this.orden?.vehiculo_id
      }
    });
  }

  solicitarAprobacion(): void {
    this.toastService.info(
      `Solicitud de aprobación enviada al cliente para la OT ${this.orden?.numero_ot || ''}.`
    );
  }

  confirmarCambioEstado(): void {
    if (!this.orden?.id) return;

    this.isSubmitting.set(true);
    this.mensajeExito.set(null);
    this.mensajeError.set(null);

    this.ordenService
      .actualizarEstado(this.orden.id, this.nuevoEstado(), this.comentario())
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.mensajeExito.set(
            `¡Estado actualizado exitosamente a '${res.estado_actual_display}'!`,
          );
          setTimeout(() => {
            this.estadoActualizado.emit(res);
            this.cerrarModal();
          }, 1200);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.mensajeError.set(
            err.error?.error || err.error?.detail || 'No se pudo actualizar el estado de la Orden.',
          );
        },
      });
  }

  confirmarCobro(): void {
    if (!this.orden?.id) return;

    this.isSubmitting.set(true);
    this.mensajeExito.set(null);
    this.mensajeError.set(null);

    this.ordenService
      .registrarPago(this.orden.id, {
        metodo_pago: this.metodoPago(),
        comentario: this.comentarioCobro(),
        entregar_orden: this.entregarOrden(),
      })
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.mensajeExito.set('¡Cobro registrado con éxito en el sistema!');
          this.toastService.exito('Cobro de la Orden registrado correctamente.');
          setTimeout(() => {
            this.estadoActualizado.emit(res.orden);
            this.cerrarModal();
          }, 1200);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.mensajeError.set(
            err.error?.error || err.error?.detail || 'No se pudo registrar el cobro de la orden.',
          );
        },
      });
  }

  cerrarModal(): void {
    this.cerrado.emit(true);
  }
}
