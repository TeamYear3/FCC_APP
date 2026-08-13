import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-facturacion-calendario',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-color-surface-container rounded-card border border-white/5 shadow">
      <h2 class="text-xl font-bold mb-4 text-color-primary-accent uppercase">Facturación / Comprobantes</h2>
      <p class="text-color-text-secondary mb-4">Módulo de Facturación ARCA con semaforización (Próximamente en TK063).</p>
      <div class="h-64 rounded bg-black/40 border border-white/5 flex items-center justify-center">
        <span class="text-color-text-secondary italic">Calendario de facturación placeholder</span>
      </div>
    </div>
  `
})
export class FacturacionCalendarioComponent {}
