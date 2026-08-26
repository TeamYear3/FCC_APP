import { Component, EventEmitter, Input, Output, inject, signal, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdenService, OrdenResponse, OrdenHistorialResponse } from '../../../core/services/orden.service';

@Component({
  selector: 'app-orden-estado-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="mostrar" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div class="bg-[#1E1E1E] border border-[#FFCC00]/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5">
        
        <!-- Header del Modal -->
        <div class="flex items-center justify-between border-b border-[#2A2A2A] pb-4">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-[#FFCC00]/10 border border-[#FFCC00]/20 rounded-xl text-[#FFCC00]">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white leading-snug">Actualizar Estado de la Orden</h3>
              <p class="text-xs text-gray-400">OT: <span class="text-[#FFCC00] font-mono font-bold">{{ orden?.numero_ot }}</span></p>
            </div>
          </div>
          <button (click)="cerrarModal()" class="text-gray-400 hover:text-white transition-colors p-1 bg-transparent border-0 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

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
            <option value="rechazado">Rechazado</option>
          </select>
        </div>

        <!-- Advertencia Interactiva si intenta pasar a 'En Proceso' sin turno o aprobación (TK036) -->
        <div *ngIf="mostrarAdvertenciaRequisitos()" class="bg-amber-900/30 border border-amber-500/50 rounded-xl p-4 space-y-3 animate-fadeIn">
          <div class="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div class="text-xs text-amber-200 space-y-1">
              <span class="font-bold block text-sm">Requisitos Pendientes para "En Proceso"</span>
              <p>Esta Orden aún requiere agendar turno en el taller y contar con la aprobación del cliente antes de iniciar los trabajos físicos.</p>
            </div>
          </div>

          <!-- Accesos Rápidos requeridos por TK036 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button 
              type="button" 
              (click)="agendarTurno()"
              class="w-full bg-[#121212] hover:bg-[#2A2A2A] border border-[#FFCC00]/40 text-[#FFCC00] font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>📅 Agendar Turno</span>
            </button>
            <button 
              type="button" 
              (click)="solicitarAprobacion()"
              class="w-full bg-[#121212] hover:bg-[#2A2A2A] border border-[#FFCC00]/40 text-[#FFCC00] font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>📩 Solicitar Aprobación</span>
            </button>
          </div>
        </div>

        <!-- Campo Comentario Opcional -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-gray-300 block">Comentario / Motivo de Transición (opcional)</label>
          <textarea 
            [ngModel]="comentario()"
            (ngModelChange)="comentario.set($event)"
            rows="2"
            placeholder="Ingrese observaciones o detalles sobre el cambio de estado..."
            class="w-full bg-[#121212] border border-[#2A2A2A] rounded-xl p-3 text-white text-xs focus:outline-none focus:border-[#FFCC00] resize-none"
          ></textarea>
        </div>

        <!-- Mensaje de Éxito / Error -->
        <div *ngIf="mensajeExito()" class="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-xl">
          {{ mensajeExito() }}
        </div>
        <div *ngIf="mensajeError()" class="text-xs font-bold text-red-400 bg-red-950/40 border border-red-500/40 p-3 rounded-xl">
          {{ mensajeError() }}
        </div>

        <!-- Acciones del Modal -->
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
            [disabled]="isSubmitting() || (nuevoEstado() === 'en_proceso' && orden?.estado === 'ingresado')"
            class="bg-[#FFCC00] hover:bg-[#e6b800] text-[#121212] font-bold py-2.5 px-5 rounded-xl text-xs shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0"
          >
            {{ isSubmitting() ? 'Guardando...' : 'Confirmar Estado' }}
          </button>
        </div>

      </div>
    </div>
  `
})
export class OrdenEstadoModalComponent implements OnChanges {
  private readonly ordenService = inject(OrdenService);

  @Input() mostrar = false;
  @Input() orden: OrdenResponse | null = null;
  @Output() cerrado = new EventEmitter<boolean>();
  @Output() estadoActualizado = new EventEmitter<OrdenHistorialResponse>();

  readonly nuevoEstado = signal<string>('ingresado');
  readonly comentario = signal<string>('');
  readonly isSubmitting = signal<boolean>(false);
  readonly mensajeExito = signal<string | null>(null);
  readonly mensajeError = signal<string | null>(null);
  readonly mostrarAdvertenciaRequisitos = signal<boolean>(false);

  ngOnChanges(): void {
    if (this.orden) {
      this.nuevoEstado.set(this.orden.estado || 'ingresado');
      this.comentario.set('');
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
    if (estado === 'en_proceso' && (this.orden?.estado === 'ingresado' || this.orden?.estado === 'en_presupuesto')) {
      this.mostrarAdvertenciaRequisitos.set(true);
    } else {
      this.mostrarAdvertenciaRequisitos.set(false);
    }
  }

  agendarTurno(): void {
    alert(`Redirigiendo a la agenda de turnos para la OT ${this.orden?.numero_ot}...`);
  }

  solicitarAprobacion(): void {
    alert(`Solicitud de aprobación enviada al cliente de la OT ${this.orden?.numero_ot}.`);
  }

  confirmarCambioEstado(): void {
    if (!this.orden?.id) return;

    this.isSubmitting.set(true);
    this.mensajeExito.set(null);
    this.mensajeError.set(null);

    this.ordenService.actualizarEstado(this.orden.id, this.nuevoEstado(), this.comentario()).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.mensajeExito.set(`¡Estado actualizado exitosamente a '${res.estado_actual_display}'!`);
        setTimeout(() => {
          this.estadoActualizado.emit(res);
          this.cerrarModal();
        }, 1200);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.mensajeError.set(err.error?.detail || 'No se pudo actualizar el estado de la Orden.');
      }
    });
  }

  cerrarModal(): void {
    this.cerrado.emit(true);
  }
}
