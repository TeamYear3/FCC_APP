import { Component, Input, OnInit, OnDestroy, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { OrdenService, AdjuntoDiagnostico, ItemPresupuesto } from '../../../core/services/orden.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-diagnostico-fotos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './diagnostico-fotos.component.html',
  styleUrl: './diagnostico-fotos.component.css'
})
export class DiagnosticoFotosComponent implements OnInit, OnDestroy, OnChanges {
  private readonly ordenService = inject(OrdenService);
  private readonly wsService = inject(WebSocketService);
  private wsSubscription?: Subscription;

  @Input({ required: true }) ordenId!: string;
  @Input() modoLectura: boolean = false;
  @Input() itemsPresupuesto: ItemPresupuesto[] = [];

  readonly listaAdjuntos = signal<AdjuntoDiagnostico[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly subiendo = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly dragOver = signal<boolean>(false);

  // Servicios/Repuestos disponibles para vincular la foto
  readonly serviciosDisponibles = signal<ItemPresupuesto[]>([]);
  readonly itemSeleccionadoId = signal<string>('');

  // Modal para ver foto a tamaño completo con zoom
  readonly fotoSeleccionada = signal<AdjuntoDiagnostico | null>(null);
  readonly zoomNivel = signal<number>(1);

  // Control de Cámara en Vivo con MediaDevices (Navegador PC y Móvil)
  readonly camaraAbierta = signal<boolean>(false);
  readonly errorCamara = signal<string | null>(null);
  readonly capturaPreview = signal<string | null>(null);
  private streamCamara: MediaStream | null = null;
  private blobCapturado: Blob | null = null;

  ngOnInit(): void {
    if (this.ordenId) {
      this.cargarAdjuntos();
      this.cargarServicios();
    }
    this.iniciarEscuchaWebSocket();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ordenId'] && !changes['ordenId'].firstChange) {
      this.cargarAdjuntos();
      this.cargarServicios();
    }
    if (changes['itemsPresupuesto']) {
      this.serviciosDisponibles.set(this.itemsPresupuesto || []);
    }
  }

  ngOnDestroy(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
    this.detenerCamara();
  }

  iniciarEscuchaWebSocket(): void {
    this.wsService.conectar();
    this.wsSubscription = this.wsService.escucharEvento<any>('adjunto_actualizado').subscribe({
      next: (payload) => {
        if (!payload || payload.orden_id !== this.ordenId) return;

        if (payload.accion === 'creado' && payload.adjunto) {
          const nuevo = payload.adjunto as AdjuntoDiagnostico;
          this.listaAdjuntos.update(actuales => {
            if (actuales.some(a => a.id === nuevo.id)) return actuales;
            return [nuevo, ...actuales];
          });
        } else if (payload.accion === 'eliminado' && payload.adjunto_id) {
          this.listaAdjuntos.update(actuales => actuales.filter(a => a.id !== payload.adjunto_id));
          if (this.fotoSeleccionada()?.id === payload.adjunto_id) {
            this.cerrarModalFoto();
          }
        }
      },
      error: (err) => console.warn('Error en suscripción WebSocket adjuntos:', err)
    });
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

  cargarServicios(): void {
    if (this.itemsPresupuesto && this.itemsPresupuesto.length > 0) {
      this.serviciosDisponibles.set(this.itemsPresupuesto);
      return;
    }
    this.ordenService.obtenerItemsPresupuesto(this.ordenId).subscribe({
      next: (items) => this.serviciosDisponibles.set(items || []),
      error: () => {}
    });
  }

  normalizarUrl(url?: string | null): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
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
    const itemId = this.itemSeleccionadoId() || null;

    imagenes.forEach(archivo => {
      this.ordenService.subirAdjuntoDiagnostico(this.ordenId, archivo, itemId).subscribe({
        next: (nuevoAdjunto) => {
          this.listaAdjuntos.update(actuales => {
            if (actuales.some(a => a.id === nuevoAdjunto.id)) return actuales;
            return [nuevoAdjunto, ...actuales];
          });
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
          this.cerrarModalFoto();
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
    this.zoomNivel.set(1);
  }

  cerrarModalFoto(): void {
    this.fotoSeleccionada.set(null);
    this.zoomNivel.set(1);
  }

  toggleZoom(): void {
    this.zoomNivel.update(z => (z === 1 ? 1.75 : 1));
  }

  async abrirCamara(): Promise<void> {
    this.errorCamara.set(null);
    this.capturaPreview.set(null);
    this.blobCapturado = null;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.errorMessage.set('Tu navegador no soporta acceso directo a la cámara. Usa la opción de subir archivo.');
      return;
    }

    this.camaraAbierta.set(true);

    setTimeout(async () => {
      try {
        try {
          this.streamCamara = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          });
        } catch {
          this.streamCamara = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        const video = document.getElementById('videoCamara') as HTMLVideoElement;
        if (video && this.streamCamara) {
          video.srcObject = this.streamCamara;
          await video.play();
        }
      } catch (err: any) {
        console.error('Error al acceder a la cámara:', err);
        this.errorCamara.set('No se pudo acceder a la cámara. Asegúrate de otorgar permisos al navegador o sube el archivo de imagen directamente.');
      }
    }, 150);
  }

  capturarFotoCamara(): void {
    const video = document.getElementById('videoCamara') as HTMLVideoElement;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    this.capturaPreview.set(dataUrl);

    canvas.toBlob((blob) => {
      this.blobCapturado = blob;
    }, 'image/jpeg', 0.92);
  }

  reintentarCaptura(): void {
    this.capturaPreview.set(null);
    this.blobCapturado = null;
    const video = document.getElementById('videoCamara') as HTMLVideoElement;
    if (video && this.streamCamara) {
      video.play();
    }
  }

  confirmarSubidaCamara(): void {
    if (!this.blobCapturado) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nombre = `captura_camara_${timestamp}.jpg`;
    const archivo = new File([this.blobCapturado], nombre, { type: 'image/jpeg' });
    this.cerrarCamara();
    this.procesarArchivos([archivo]);
  }

  cerrarCamara(): void {
    this.detenerCamara();
    this.camaraAbierta.set(false);
    this.capturaPreview.set(null);
    this.blobCapturado = null;
    this.errorCamara.set(null);
  }

  private detenerCamara(): void {
    if (this.streamCamara) {
      this.streamCamara.getTracks().forEach(track => track.stop());
      this.streamCamara = null;
    }
  }
}
