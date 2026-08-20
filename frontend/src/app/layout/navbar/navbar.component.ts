import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { BusquedaService, BusquedaResultadoResponse } from '../../core/services/busqueda.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly sidebarService = inject(SidebarService);
  private readonly busquedaService = inject(BusquedaService);

  readonly userRole = this.authService.userRoleSignal;
  readonly query = signal<string>('');
  readonly resultados = signal<BusquedaResultadoResponse>({ clientes: [], vehiculos: [], ordenes: [] });
  readonly cargando = signal<boolean>(false);
  readonly desplegableAbierto = signal<boolean>(false);

  private readonly searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term) => {
        if (!term || term.trim().length < 2) {
          this.cargando.set(false);
          return of({ clientes: [], vehiculos: [], ordenes: [] });
        }
        this.cargando.set(true);
        return this.busquedaService.buscarUniversal(term);
      })
    ).subscribe((res) => {
      this.resultados.set(res);
      this.cargando.set(false);
      this.desplegableAbierto.set(true);
    });
  }

  onSearchInput(value: string): void {
    this.query.set(value);
    if (!value || value.trim().length < 2) {
      this.desplegableAbierto.set(false);
      return;
    }
    this.searchSubject.next(value);
  }

  seleccionarItem(url: string): void {
    this.desplegableAbierto.set(false);
    this.query.set('');
    this.router.navigateByUrl(url);
  }

  cerrarDesplegable(): void {
    setTimeout(() => this.desplegableAbierto.set(false), 250);
  }

  tieneResultados(): boolean {
    const res = this.resultados();
    return res.clientes.length > 0 || res.vehiculos.length > 0 || res.ordenes.length > 0;
  }

  getEmail(): string {
    const decoded = this.authService.getDecodedToken();
    return decoded ? decoded['email'] || 'admin@fcc-taller.com' : 'admin@fcc-taller.com';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/autenticacion']);
  }
}
