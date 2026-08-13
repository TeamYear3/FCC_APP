import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-configuracion-perfil-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-color-surface-container rounded-card border border-white/5 shadow">
      <h2 class="text-xl font-bold mb-4 text-color-primary-accent uppercase">Configuración de Perfil</h2>
      <p class="text-color-text-secondary mb-4">Administración del Perfil del Administrador (Próximamente en TK064).</p>
      <div class="h-64 rounded bg-black/40 border border-white/5 flex items-center justify-center">
        <span class="text-color-text-secondary italic">Ajustes de perfil y cuenta placeholder</span>
      </div>
    </div>
  `
})
export class ConfiguracionPerfilModalComponent {}
