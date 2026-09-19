import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FullCalendarModule } from '@fullcalendar/angular';
// @ts-ignore
import dayGridPlugin from '@fullcalendar/daygrid';
// @ts-ignore
import timeGridPlugin from '@fullcalendar/timegrid';
// @ts-ignore
import interactionPlugin from '@fullcalendar/interaction';
// @ts-ignore
import esLocale from '@fullcalendar/core/locales/es.js';
import { forkJoin } from 'rxjs';

import { TurnoService, TurnoResponse } from '../../../core/services/turno.service';
import { ClienteService, ClienteResponse } from '../../../core/services/cliente.service';
import { VehiculoService, VehiculoResponse } from '../../../core/services/vehiculo.service';
import { OrdenService, OrdenResponse } from '../../../core/services/orden.service';

@Component({
  selector: 'app-turnos-agenda',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, ReactiveFormsModule],
  templateUrl: './turnos-agenda.component.html',
  styleUrls: ['./turnos-agenda.component.css']
})
export class TurnosAgendaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly turnoService = inject(TurnoService);
  private readonly clienteService = inject(ClienteService);
  private readonly vehiculoService = inject(VehiculoService);
  private readonly ordenService = inject(OrdenService);
  private readonly router = inject(Router);

  cargando = signal(false);
  turnos = signal<TurnoResponse[]>([]);
  ordenes = signal<OrdenResponse[]>([]);
  clientes = signal<ClienteResponse[]>([]);
  vehiculos = signal<VehiculoResponse[]>([]);
  vehiculosFiltrados = signal<VehiculoResponse[]>([]);

  // Estados de Modales e Alertas
  mostrarModalCrear = signal(false);
  mostrarModalDetalle = signal(false);
  mostrarAlertaSobrecupo = signal(false);
  fechaSeleccionada = signal<string>('');
  mensajeError = signal<string>('');
  
  // Turno seleccionado para ver detalle
  turnoSeleccionado = signal<TurnoResponse | null>(null);

  // Datos temporales para la operación de forzado (bypass)
  datosPendientesCrear = signal<any>(null);

  // Formulario
  turnoForm!: FormGroup;

  calendarOptions = signal<any>({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    locales: [esLocale],
    locale: 'es',
    displayEventTime: false,
    events: [],
    dateClick: this.handleDateClick.bind(this),
    eventClick: this.handleEventClick.bind(this)
  });

  constructor() {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  inicializarFormulario(): void {
    this.turnoForm = this.fb.group({
      cliente: ['', Validators.required],
      vehiculo: ['', Validators.required],
      fecha_hora: ['', Validators.required],
      motivo: ['', [Validators.required, Validators.maxLength(255)]],
      estado: ['pendiente', Validators.required]
    });
  }

  cargarDatos(): void {
    this.cargando.set(true);

    // Cargar en paralelo turnos, vehículos, clientes y órdenes de trabajo (TK122)
    forkJoin({
      clientes: this.clienteService.obtenerClientes(),
      vehiculos: this.vehiculoService.getVehiculos(),
      turnos: this.turnoService.obtenerTurnos(),
      ordenesRes: this.ordenService.obtenerOrdenes({}, 1, 100)
    }).subscribe({
      next: (res) => {
        this.clientes.set(res.clientes);
        this.vehiculos.set(res.vehiculos);
        this.turnos.set(res.turnos);
        const listaOrdenes = res.ordenesRes?.results || [];
        this.ordenes.set(listaOrdenes);

        this.mapearYRenderizarEventos(res.turnos, listaOrdenes);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar datos de la agenda:', err);
        this.cargando.set(false);
      }
    });
  }

  cargarTurnosEnCalendario(): void {
    this.cargarDatos();
  }

  mapearYRenderizarEventos(turnos: TurnoResponse[], ordenes: OrdenResponse[] = []): void {
    // 1. Mapear turnos agendados
    const eventosTurnos = turnos.map((t) => {
      const nombreCliente = this.getNombreCliente(t.cliente);
      const datosVehiculo = this.getDatosVehiculo(t.vehiculo);
      
      const dateObj = new Date(t.fecha_hora);
      const hh = String(dateObj.getHours()).padStart(2, '0');
      const mm = String(dateObj.getMinutes()).padStart(2, '0');
      const horaStr = `${hh}:${mm} hs`;

      const eventTitle = `🗓 TURNO ${horaStr} | ${nombreCliente} - ${datosVehiculo} - M: ${t.motivo}`;

      let estadoClass = 'evento-turno-default';
      if (t.estado === 'pendiente') {
        estadoClass = 'evento-turno-pendiente';
      } else if (t.estado === 'completado') {
        estadoClass = 'evento-turno-completado';
      } else if (t.estado === 'cancelado') {
        estadoClass = 'evento-turno-cancelado';
      }

      return {
        id: `turno-${t.id}`,
        title: eventTitle,
        start: t.fecha_hora,
        className: estadoClass,
        extendedProps: { tipoItem: 'turno', turno: t }
      };
    });

    // 2. Mapear órdenes de trabajo activas y actividades del día (TK122)
    const eventosOrdenes = ordenes.map((o) => {
      const otNumero = o.numero_ot || o.id.slice(0, 8);
      const patente = o.vehiculo_patente || 'S/D';
      const cliente = o.cliente_nombre || 'Cliente General';
      const estado = o.estado.toUpperCase().replace('_', ' ');
      const eventTitle = `📋 OT #${otNumero} | ${patente} - ${estado} (${cliente})`;

      let estadoClass = 'evento-orden-default';
      if (o.estado === 'en_proceso') {
        estadoClass = 'evento-orden-proceso';
      } else if (o.estado === 'ingresado' || o.estado === 'en_presupuesto') {
        estadoClass = 'evento-orden-ingresado';
      } else if (o.estado === 'en_pausa') {
        estadoClass = 'evento-orden-pausa';
      } else if (o.estado === 'finalizado' || o.estado === 'entregado') {
        estadoClass = 'evento-orden-finalizado';
      }

      return {
        id: `orden-${o.id}`,
        title: eventTitle,
        start: o.fecha_ingreso,
        allDay: true,
        className: estadoClass,
        extendedProps: { tipoItem: 'orden', orden: o }
      };
    });

    const eventos = [...eventosTurnos, ...eventosOrdenes];

    this.calendarOptions.update((options) => ({
      ...options,
      events: eventos
    }));
  }

  onClienteChange(clienteId: string): void {
    // Filtrar vehículos que pertenecen al cliente seleccionado
    const vehs = this.vehiculos().filter(
      (v) => v.cliente_id === clienteId || (v as any).cliente === clienteId
    );
    this.vehiculosFiltrados.set(vehs);
    // Resetear el selector de vehículo
    this.turnoForm.get('vehiculo')?.setValue('');
  }

  handleDateClick(arg: any): void {
    const clickDate = new Date(arg.date);
    // Formatear la fecha para input datetime-local: YYYY-MM-DDTHH:MM
    const yyyy = clickDate.getFullYear();
    const mm = String(clickDate.getMonth() + 1).padStart(2, '0');
    const dd = String(clickDate.getDate()).padStart(2, '0');
    // Pre-cargar a las 09:00 hs como inicio laboral común
    const fechaHoraStr = `${yyyy}-${mm}-${dd}T09:00`;
    
    this.fechaSeleccionada.set(fechaHoraStr);
    this.turnoForm.reset({
      cliente: '',
      vehiculo: '',
      fecha_hora: fechaHoraStr,
      motivo: '',
      estado: 'pendiente'
    });
    this.vehiculosFiltrados.set([]);
    this.mensajeError.set('');
    this.mostrarModalCrear.set(true);
  }

  handleEventClick(arg: any): void {
    const tipoItem = arg.event.extendedProps?.tipoItem;

    // Si el usuario hace clic en una Orden de Trabajo, navegar al expediente (TK122)
    if (tipoItem === 'orden') {
      const orden = arg.event.extendedProps?.orden as OrdenResponse;
      const targetId = orden?.id || arg.event.id.replace('orden-', '');
      const ruta = this.router.url.startsWith('/admin') ? '/admin/ordenes' : '/ordenes';
      this.router.navigate([ruta], { queryParams: { ot: targetId } });
      return;
    }

    // Si es un Turno, abrir modal con el detalle correspondiente
    const turno = (arg.event.extendedProps?.turno || arg.event.extendedProps) as TurnoResponse;
    this.turnoSeleccionado.set(turno);
    this.mensajeError.set('');
    this.mostrarModalDetalle.set(true);
  }

  guardarTurno(): void {
    if (this.turnoForm.invalid) return;

    this.cargando.set(true);
    this.mensajeError.set('');
    const payload = this.turnoForm.value;

    this.turnoService.crearTurno(payload).subscribe({
      next: (res) => {
        this.cerrarModalCrear();
        this.cargarDatos(); // Recargar todo para refrescar eventos mapeados
      },
      error: (err) => {
        this.cargando.set(false);
        const errorData = err.error;
        
        // Si el backend advierte sobre-cupo diario (>2 turnos)
        if (errorData && errorData.warning_overbooking) {
          this.datosPendientesCrear.set(payload);
          this.mostrarAlertaSobrecupo.set(true);
        } else {
          // Errores de validación estándar (ej. vehículo inválido, etc.)
          const msg = errorData?.detail || errorData?.vehiculo || 'Ocurrió un error al agendar el turno.';
          this.mensajeError.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
      }
    });
  }

  guardarTurnoForzado(): void {
    const payload = this.datosPendientesCrear();
    if (!payload) return;

    this.cargando.set(true);
    this.mostrarAlertaSobrecupo.set(false);
    this.mensajeError.set('');

    // Inyectamos la bandera de bypass force_booking
    const payloadForzado = { ...payload, force_booking: true };

    this.turnoService.crearTurno(payloadForzado).subscribe({
      next: (res) => {
        this.datosPendientesCrear.set(null);
        this.cerrarModalCrear();
        this.cargarDatos(); // Recargar todo
      },
      error: (err) => {
        this.cargando.set(false);
        const errorData = err.error;
        const msg = errorData?.detail || 'Ocurrió un error al forzar la reserva del turno.';
        this.mensajeError.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    });
  }

  cancelarTurno(): void {
    const turno = this.turnoSeleccionado();
    if (!turno) return;

    this.cargando.set(true);
    this.mensajeError.set('');

    // Cambiar estado a 'cancelado' para liberar el cupo diario
    this.turnoService.actualizarTurno(turno.id, { estado: 'cancelado' }).subscribe({
      next: () => {
        this.cerrarModalDetalle();
        this.cargarDatos(); // Recargar todo
      },
      error: (err) => {
        this.cargando.set(false);
        const errorData = err.error;
        const msg = errorData?.detail || 'Ocurrió un error al cancelar el turno.';
        this.mensajeError.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    });
  }

  // Resolvedores dinámicos legibles para la UI
  getNombreCliente(clienteId: string): string {
    const cliente = this.clientes().find(c => c.id === clienteId);
    return cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cargando cliente...';
  }

  getDatosVehiculo(vehiculoId: string): string {
    const vehiculo = this.vehiculos().find(v => v.id === vehiculoId);
    return vehiculo ? `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.patente})` : 'Cargando vehículo...';
  }

  cerrarAlertaSobrecupo(): void {
    this.mostrarAlertaSobrecupo.set(false);
    this.datosPendientesCrear.set(null);
  }

  cerrarModalCrear(): void {
    this.mostrarModalCrear.set(false);
    this.turnoForm.reset();
    this.mensajeError.set('');
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle.set(false);
    this.turnoSeleccionado.set(null);
    this.mensajeError.set('');
  }
}
