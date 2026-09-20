import { Injectable, signal } from '@angular/core';

export type ToastType = 'exito' | 'error' | 'advertencia' | 'info';

export interface ToastMessage {
  id: string;
  mensaje: string;
  tipo: ToastType;
  duracionMs?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);

  mostrar(mensaje: string, tipo: ToastType = 'info', duracionMs: number = 4000): void {
    const id = Math.random().toString(36).substring(2, 9);
    const nuevoToast: ToastMessage = { id, mensaje, tipo, duracionMs };

    this.toasts.update((actuales) => [...actuales, nuevoToast]);

    if (duracionMs > 0) {
      setTimeout(() => {
        this.remover(id);
      }, duracionMs);
    }
  }

  mostrarExito(mensaje: string, duracionMs: number = 4000): void {
    this.mostrar(mensaje, 'exito', duracionMs);
  }

  mostrarError(mensaje: string, duracionMs: number = 5000): void {
    this.mostrar(mensaje, 'error', duracionMs);
  }

  mostrarAdvertencia(mensaje: string, duracionMs: number = 4000): void {
    this.mostrar(mensaje, 'advertencia', duracionMs);
  }

  mostrarInfo(mensaje: string, duracionMs: number = 4000): void {
    this.mostrar(mensaje, 'info', duracionMs);
  }

  info(mensaje: string, duracionMs: number = 4000): void {
    this.mostrar(mensaje, 'info', duracionMs);
  }

  exito(mensaje: string, duracionMs: number = 4000): void {
    this.mostrar(mensaje, 'exito', duracionMs);
  }

  error(mensaje: string, duracionMs: number = 5000): void {
    this.mostrar(mensaje, 'error', duracionMs);
  }

  remover(id: string): void {
    this.toasts.update((actuales) => actuales.filter((t) => t.id !== id));
  }
}
