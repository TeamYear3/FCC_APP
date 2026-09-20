import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SidebarService } from '../../core/services/sidebar.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  readonly sidebarService = inject(SidebarService);
  private readonly authService = inject(AuthService);

  readonly vistaPreviaRol = this.sidebarService.vistaPreviaRolSignal;

  readonly rolEfectivo = computed(() => {
    return this.vistaPreviaRol() || this.authService.getUserRole() || 'admin';
  });
}
