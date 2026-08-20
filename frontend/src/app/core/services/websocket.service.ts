import { Injectable, OnDestroy, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface WebSocketEventPayload<T = any> {
  type: string;
  payload: T;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private socket: WebSocket | null = null;
  private readonly messages$ = new Subject<WebSocketEventPayload>();
  
  readonly estadoConexion = signal<'conectado' | 'desconectado' | 'conectando'>('desconectado');

  private intentReconexion = 0;
  private maxIntentosReconexion = 5;
  private timerReconexion: any = null;
  private debeReconectar = true;
  private urlActual = '';

  constructor() {
    this.urlActual = environment.wsUrl || 'ws://localhost:8000/ws/ordenes/';
  }

  conectar(customUrl?: string): void {
    if (customUrl) {
      this.urlActual = customUrl;
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.debeReconectar = true;
    this.estadoConexion.set('conectando');

    try {
      this.socket = new WebSocket(this.urlActual);

      this.socket.onopen = () => {
        console.log('🔗 WebSocket conectado exitosamente:', this.urlActual);
        this.estadoConexion.set('conectado');
        this.intentReconexion = 0;
      };

      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const parsedData = JSON.parse(event.data) as WebSocketEventPayload;
          this.messages$.next(parsedData);
        } catch (err) {
          console.error('Error al procesar payload WebSocket:', err, event.data);
        }
      };

      this.socket.onerror = (error) => {
        console.warn('Error en la conexión WebSocket:', error);
      };

      this.socket.onclose = () => {
        this.estadoConexion.set('desconectado');
        this.socket = null;
        if (this.debeReconectar) {
          this.programarReconexion();
        }
      };

    } catch (error) {
      console.error('Error al inicializar WebSocket:', error);
      this.estadoConexion.set('desconectado');
      if (this.debeReconectar) {
        this.programarReconexion();
      }
    }
  }

  private programarReconexion(): void {
    if (this.intentReconexion >= this.maxIntentosReconexion) {
      console.warn('Límite de reintentos WebSocket alcanzado. Se reintentará al refrescar.');
      return;
    }

    this.intentReconexion++;
    const delay = Math.min(1000 * Math.pow(2, this.intentReconexion), 15000);
    console.log(`Reintentando conexión WebSocket (${this.intentReconexion}/${this.maxIntentosReconexion}) en ${delay / 1000}s...`);

    if (this.timerReconexion) {
      clearTimeout(this.timerReconexion);
    }

    this.timerReconexion = setTimeout(() => {
      this.conectar();
    }, delay);
  }

  escucharEvento<T = any>(nombreEvento: string): Observable<T> {
    return this.messages$.pipe(
      filter(msg => msg && msg.type === nombreEvento),
      map(msg => msg.payload as T)
    );
  }

  escucharTodosLosEventos(): Observable<WebSocketEventPayload> {
    return this.messages$.asObservable();
  }

  enviarMensaje(payload: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    } else {
      console.warn('No se pudo enviar mensaje WebSocket: socket no está abierto.');
    }
  }

  simularMensaje(evento: WebSocketEventPayload): void {
    this.messages$.next(evento);
  }

  desconectar(): void {
    this.debeReconectar = false;
    if (this.timerReconexion) {
      clearTimeout(this.timerReconexion);
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.estadoConexion.set('desconectado');
  }

  ngOnDestroy(): void {
    this.desconectar();
  }
}
