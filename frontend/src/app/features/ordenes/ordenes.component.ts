import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

export interface ServiceTask {
  id: number;
  titulo: string;
  descripcion: string;
  completada: boolean;
  tiempoEstimado: string;
}

export type OrderTab = 'Detalle' | 'Servicios' | 'Repuestos' | 'Pagos' | 'Notas';

@Component({
  selector: 'app-ordenes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ordenes.component.html',
  styleUrl: './ordenes.component.css'
})
export class OrdenesComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly userRole = this.authService.userRoleSignal;

  readonly activeTab = signal<OrderTab>('Servicios');
  readonly tabs: OrderTab[] = ['Detalle', 'Servicios', 'Repuestos', 'Pagos', 'Notas'];

  readonly tareasServicio = signal<ServiceTask[]>([
    {
      id: 1,
      titulo: 'Inspección de niveles de fluidos y escaneo ECU',
      descripcion: 'Verificar presión de aceite, líquido refrigerante y códigos de falla OBD2.',
      completada: true,
      tiempoEstimado: '30 min'
    },
    {
      id: 2,
      titulo: 'Reemplazo de pastillas de freno delanteras y rectificado',
      descripcion: 'Desmontaje de mordazas, sustitución por juego original y purga de líquido de frenos.',
      completada: true,
      tiempoEstimado: '1 h 15 min'
    },
    {
      id: 3,
      titulo: 'Alineación computarizada 3D y balanceo dinámico de 4 ruedas',
      descripcion: 'Ajuste de ángulos de avance, comba y convergencia según especificación de fábrica.',
      completada: false,
      tiempoEstimado: '45 min'
    },
    {
      id: 4,
      titulo: 'Control final de calidad y prueba de rodaje en pista',
      descripcion: 'Verificación de ruidos, respuesta en frenada y sellado general del vehículo.',
      completada: false,
      tiempoEstimado: '20 min'
    }
  ]);

  setTab(tab: OrderTab): void {
    this.activeTab.set(tab);
  }

  toggleTask(id: number): void {
    this.tareasServicio.update(tasks =>
      tasks.map(t => t.id === id ? { ...t, completada: !t.completada } : t)
    );
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/autenticacion']);
  }
}
