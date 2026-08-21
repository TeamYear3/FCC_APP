import { Injectable, signal } from '@angular/core';

export type RolVistaPrevia = 'admin' | 'tecnico' | 'cliente' | null;

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  readonly isSidebarOpen = signal<boolean>(false);
  readonly vistaPreviaRolSignal = signal<RolVistaPrevia>(null);

  toggleSidebar(): void {
    this.isSidebarOpen.update(v => !v);
  }

  closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  setVistaPreviaRol(rol: RolVistaPrevia): void {
    if (rol === 'admin') {
      this.vistaPreviaRolSignal.set(null);
    } else {
      this.vistaPreviaRolSignal.set(rol);
    }
  }

  salirVistaPrevia(): void {
    this.vistaPreviaRolSignal.set(null);
  }
}
