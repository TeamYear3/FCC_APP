import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';

import { TurnoService, TurnoResponse } from '../../../core/services/turno.service';
import { ClienteService, ClienteResponse } from '../../../core/services/cliente.service';
import { VehiculoService, VehiculoResponse } from '../../../core/services/vehiculo.service';

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

  cargando = signal(false);
  turnos = signal<TurnoResponse[]>([]);
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

  calendarOptions = signal<CalendarOptions>({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    locales: [esLocale],
    locale: 'es',
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
    // Cargar clientes
    this.clienteService.obtenerClientes().subscribe({
      next: (data) => this.clientes.set(data),
      error: (err) => console.error('Error al obtener clientes:', err)
    });

    // Cargar vehículos
    this.vehiculoService.getVehiculos().subscribe({
      next: (data) => this.vehiculos.set(data),
      error: (err) => console.error('Error al obtener vehículos:', err)
    });

    // Cargar turnos en calendario
    this.cargarTurnosEnCalendario();
  }

  cargarTurnosEnCalendario(): void {
    this.turnoService.obtenerTurnos().subscribe({
      next: (data) => {
        this.turnos.set(data);
        // Mapear solo los turnos que no están cancelados, o pintarlos distintos
        // Si están cancelados, podemos excluirlos del calendario para que quede limpio,
        // o mostrarlos tachados/rojos. Excluyamos los cancelados o pintémoslos rojo.
        // La especificación dice: "Renderizar los turnos reservados como eventos en color gris en el calendario".
        // Excluiremos los cancelados para que no ocupen lugar visual en la agenda.
        const turnosFiltrados = data.filter(t => t.estado !== 'cancelado');

        const eventos = turnosFiltrados.map((t) => ({
          id: t.id,
          title: `${t.motivo}`,
          start: t.fecha_hora,
          backgroundColor: '#9ca3af', // Color gris para turnos reservados
          borderColor: '#9ca3af',
          textColor: '#1f2937', // Texto oscuro para contraste
          extendedProps: { ...t }
        }));
        this.calendarOptions.update((options) => ({
          ...options,
          events: eventos
        }));
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al obtener turnos:', err);
        this.cargando.set(false);
      }
    });
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
    const turno = arg.event.extendedProps as TurnoResponse;
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
        this.cargarTurnosEnCalendario();
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
        this.cargarTurnosEnCalendario();
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
        this.cargarTurnosEnCalendario();
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
