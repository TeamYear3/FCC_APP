import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          [ngClass]="getToastClasses(toast.tipo)"
          class="pointer-events-auto p-4 rounded-card border shadow-2xl backdrop-blur-md flex items-start justify-between gap-3 transition-all duration-300 animate-slide-in"
        >
          <div class="flex items-start gap-3">
            @switch (toast.tipo) {
              @case ('exito') {
                <svg class="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              }
              @case ('error') {
                <svg class="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              }
              @case ('advertencia') {
                <svg class="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              }
              @default {
                <svg class="w-5 h-5 text-sky-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              }
            }

            <p class="text-xs font-semibold text-white leading-relaxed">{{ toast.mensaje }}</p>
          </div>

          <button 
            type="button" 
            (click)="toastService.remover(toast.id)"
            class="text-zinc-400 hover:text-white transition-colors p-1 -mr-1 rounded-md focus:outline-none cursor-pointer"
            title="Cerrar notificación"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `
})
export class ToastComponent {
  readonly toastService = inject(ToastService);

  getToastClasses(tipo: ToastMessage['tipo']): string {
    switch (tipo) {
      case 'exito':
        return 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200';
      case 'error':
        return 'bg-rose-950/90 border-rose-500/40 text-rose-200';
      case 'advertencia':
        return 'bg-amber-950/90 border-amber-500/40 text-amber-200';
      case 'info':
      default:
        return 'bg-zinc-900/90 border-zinc-700/60 text-zinc-200';
    }
  }
}
