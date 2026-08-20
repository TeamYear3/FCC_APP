import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrdenService, AdjuntoDiagnostico } from '../../../core/services/orden.service';

@Component({
  selector: 'app-diagnostico-fotos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './diagnostico-fotos.component.html',
  styleUrl: './diagnostico-fotos.component.css'
})
export class DiagnosticoFotosComponent implements OnInit {
  private readonly ordenService = inject(OrdenService);

  @Input({ required: true }) ordenId!: string;
  @Input() modoLectura: boolean = false;

  readonly listaAdjuntos = signal<AdjuntoDiagnostico[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly subiendo = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly dragOver = signal<boolean>(false);

  // Modal para ver foto a tamaño completo
  readonly fotoSeleccionada = signal<AdjuntoDiagnostico | null>(null);

  ngOnInit(): void {
    if (this.ordenId) {
      this.cargarAdjuntos();
    }
  }

  cargarAdjuntos(): void {
    this.cargando.set(true);
    this.errorMessage.set(null);
    this.ordenService.obtenerAdjuntosDiagnostico(this.ordenId).subscribe({
      next: (adjuntos) => {
        this.listaAdjuntos.set(adjuntos || []);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar fotos de diagnóstico:', err);
        this.errorMessage.set('No se pudieron obtener las fotos de diagnóstico.');
        this.cargando.set(false);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.procesarArchivos(Array.from(input.files));
      input.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.procesarArchivos(Array.from(event.dataTransfer.files));
    }
  }

  private procesarArchivos(archivos: File[]): void {
    const imagenes = archivos.filter(f => f.type.startsWith('image/'));
    if (imagenes.length === 0) {
      this.errorMessage.set('Por favor, selecciona archivos de imagen válidos (JPG, PNG, WEBP).');
      return;
    }

    this.subiendo.set(true);
    this.errorMessage.set(null);

    let subidasRestantes = imagenes.length;
    let hubosErrores = false;

    imagenes.forEach(archivo => {
      this.ordenService.subirAdjuntoDiagnostico(this.ordenId, archivo).subscribe({
        next: (nuevoAdjunto) => {
          this.listaAdjuntos.update(actuales => [nuevoAdjunto, ...actuales]);
          subidasRestantes--;
          if (subidasRestantes === 0) {
            this.subiendo.set(false);
          }
        },
        error: (err) => {
          console.error('Error al subir foto:', err);
          hubosErrores = true;
          subidasRestantes--;
          if (subidasRestantes === 0) {
            this.subiendo.set(false);
            if (hubosErrores) {
              this.errorMessage.set('Ocurrió un error al subir una o más imágenes.');
            }
          }
        }
      });
    });
  }

  eliminarAdjunto(adjunto: AdjuntoDiagnostico, event: Event): void {
    event.stopPropagation();
    if (!confirm(`¿Deseas eliminar la foto "${adjunto.nombre_archivo}"?`)) return;

    this.ordenService.eliminarAdjuntoDiagnostico(adjunto.id).subscribe({
      next: () => {
        this.listaAdjuntos.update(actuales => actuales.filter(a => a.id !== adjunto.id));
        if (this.fotoSeleccionada()?.id === adjunto.id) {
          this.fotoSeleccionada.set(null);
        }
      },
      error: (err) => {
        console.error('Error al eliminar foto:', err);
        this.errorMessage.set('No se pudo eliminar la imagen seleccionada.');
      }
    });
  }

  abrirFotoCompleta(adjunto: AdjuntoDiagnostico): void {
    this.fotoSeleccionada.set(adjunto);
  }

  cerrarModalFoto(): void {
    this.fotoSeleccionada.set(null);
  }
}
