import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-turnos-agenda',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-color-surface-container rounded-card border border-white/5 shadow">
      <h2 class="text-xl font-bold mb-4 text-color-primary-accent uppercase">Agenda / Turnos</h2>
      <p class="text-color-text-secondary mb-4">Módulo de Turnos y Agenda con FullCalendar (Próximamente en TK061).</p>
      <div class="h-64 rounded bg-black/40 border border-white/5 flex items-center justify-center">
        <span class="text-color-text-secondary italic">Calendario de turnos operativo placeholder</span>
      </div>
    </div>
  `
})
export class TurnosAgendaComponent {}
