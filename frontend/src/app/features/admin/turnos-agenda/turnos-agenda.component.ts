import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { forkJoin } from 'rxjs';

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
  vehiculosFiltrados = signal<VehiculoResponse[]>([]);

  // Estados de Modales e Alertas
  mostrarModalCrear = signal(false);
  mostrarModalDetalle = signal(false);
  mostrarAlertaSobrecupo = signal(false);
  fechaSeleccionada = signal<string>('');
  fechaMinima = signal<string>('');
  mensajeError = signal<string>('');
  
  // Turno seleccionado para ver detalle
  turnoSeleccionado = signal<TurnoResponse | null>(null);

  // Datos temporales para la operación de forzado (bypass)
  datosPendientesCrear = signal<any>(null);
  modoEdicion = signal<boolean>(false);
  mostrarModalConfirmarEliminar = signal<boolean>(false);

  // Formularios
  turnoForm!: FormGroup;
  detalleForm!: FormGroup;

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
    editable: true,
    displayEventTime: false,
    events: [],
    dateClick: this.handleDateClick.bind(this),
    eventClick: this.handleEventClick.bind(this),
    eventDrop: this.handleEventDrop.bind(this)
  });

  constructor() {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  inicializarFormulario(): void {
    const ahora = new Date();
    const yyyy = ahora.getFullYear();
    const mm = String(ahora.getMonth() + 1).padStart(2, '0');
    const dd = String(ahora.getDate()).padStart(2, '0');
    const hh = String(ahora.getHours()).padStart(2, '0');
    const min = String(ahora.getMinutes()).padStart(2, '0');
    this.fechaMinima.set(`${yyyy}-${mm}-${dd}T${hh}:${min}`);

    this.turnoForm = this.fb.group({
      cliente: ['', Validators.required],
      vehiculo: ['', Validators.required],
      fecha_hora: ['', Validators.required],
      motivo: ['', [Validators.required, Validators.maxLength(255)]],
      estado: ['pendiente', Validators.required]
    });

    this.detalleForm = this.fb.group({
      fecha_hora: ['', Validators.required],
      motivo: ['', [Validators.required, Validators.maxLength(255)]],
      estado: ['pendiente', Validators.required]
    });
  }

  cargarDatos(): void {
    this.cargando.set(true);

    // Cargar en paralelo solo clientes y turnos (los vehículos se piden bajo demanda al elegir cliente)
    forkJoin({
      clientes: this.clienteService.obtenerClientes(),
      turnos: this.turnoService.obtenerTurnos()
    }).subscribe({
      next: (res) => {
        this.clientes.set(res.clientes);
        this.turnos.set(res.turnos);

        this.mapearYRenderizarEventos(res.turnos);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar datos de la agenda:', err);
        this.cargando.set(false);
      }
    });
  }

  cargarTurnosEnCalendario(): void {
    this.turnoService.obtenerTurnos().subscribe({
      next: (data) => {
        this.turnos.set(data);
        this.mapearYRenderizarEventos(data);
      },
      error: (err) => {
        console.error('Error al obtener turnos:', err);
      }
    });
  }

  mapearYRenderizarEventos(data: TurnoResponse[]): void {
    const eventos = data.map((t) => {
      // Obtener datos legibles desde la respuesta enriquecida o helpers
      const nombreCliente = t.cliente_nombre || this.getNombreCliente(t.cliente);
      const datosVehiculo = t.vehiculo_info || this.getDatosVehiculo(t.vehiculo);
      
      // Formatear hora de inicio a partir de fecha_hora
      const dateObj = new Date(t.fecha_hora);
      const hh = String(dateObj.getHours()).padStart(2, '0');
      const mm = String(dateObj.getMinutes()).padStart(2, '0');
      const horaStr = `${hh}:${mm} hs`;

      // Formatear título descriptivo premium
      const eventTitle = `${horaStr} | ${nombreCliente} - ${datosVehiculo} - M: ${t.motivo}`;

      // Configurar clase de estilos CSS según estado del turno
      let estadoClass = 'evento-turno-default';

      if (t.estado === 'pendiente') {
        estadoClass = 'evento-turno-pendiente';
      } else if (t.estado === 'completado') {
        estadoClass = 'evento-turno-completado';
      } else if (t.estado === 'cancelado') {
        estadoClass = 'evento-turno-cancelado';
      }

      return {
        id: t.id,
        title: eventTitle,
        start: t.fecha_hora,
        className: estadoClass,
        extendedProps: { ...t }
      };
    });

    this.calendarOptions.update((options) => ({
      ...options,
      events: eventos
    }));
  }

  onClienteChange(clienteId: string): void {
    this.turnoForm.get('vehiculo')?.setValue('');
    if (!clienteId) {
      this.vehiculosFiltrados.set([]);
      return;
    }

    // Consulta bajo demanda (on-demand) de los vehículos de este cliente
    this.vehiculoService.getVehiculos(clienteId).subscribe({
      next: (vehs) => {
        this.vehiculosFiltrados.set(vehs);
      },
      error: (err) => {
        console.error('Error al cargar vehículos bajo demanda:', err);
        this.vehiculosFiltrados.set([]);
      }
    });
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
    this.modoEdicion.set(false);
    this.mensajeError.set('');
    this.mostrarModalDetalle.set(true);
  }

  handleEventDrop(info: any): void {
    const turnoId = info.event.id;
    const nuevoStart = info.event.start;
    if (!nuevoStart) return;

    const fechaObj = new Date(nuevoStart);
    const ahora = new Date();

    // Validar si es domingo (0 = Domingo en JavaScript)
    if (fechaObj.getDay() === 0) {
      info.revert();
      this.mensajeError.set('El taller no atiende los domingos. No se puede reprogramar a este día.');
      return;
    }

    // Validar si es fecha pasada
    if (fechaObj < ahora) {
      info.revert();
      this.mensajeError.set('No se puede reprogramar un turno a una fecha u hora pasada.');
      return;
    }

    const yyyy = fechaObj.getFullYear();
    const mm = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const dd = String(fechaObj.getDate()).padStart(2, '0');
    const hh = String(fechaObj.getHours()).padStart(2, '0');
    const min = String(fechaObj.getMinutes()).padStart(2, '0');
    const fechaIso = `${yyyy}-${mm}-${dd}T${hh}:${min}:00`;

    this.cargando.set(true);
    this.mensajeError.set('');

    this.turnoService.actualizarTurno(turnoId, { fecha_hora: fechaIso }).subscribe({
      next: () => {
        this.cargando.set(false);
        this.cargarDatos();
      },
      error: (err) => {
        this.cargando.set(false);
        const errorData = err.error;
        if (errorData && errorData.warning_overbooking) {
          this.datosPendientesCrear.set({
            fecha_hora: fechaIso,
            esEdicion: true,
            turnoId: turnoId,
            revertFunc: () => info.revert()
          });
          this.mostrarAlertaSobrecupo.set(true);
        } else {
          info.revert();
          const msg = errorData?.detail || errorData?.fecha_hora || 'Error al reprogramar el turno arrastrado.';
          this.mensajeError.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
      }
    });
  }

  habilitarEdicion(): void {
    const turno = this.turnoSeleccionado();
    if (!turno) return;

    const d = new Date(turno.fecha_hora);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const fechaIso = `${yyyy}-${mm}-${dd}T${hh}:${min}`;

    this.detalleForm.patchValue({
      fecha_hora: fechaIso,
      motivo: turno.motivo,
      estado: turno.estado
    });
    this.modoEdicion.set(true);
    this.mensajeError.set('');
  }

  cancelarEdicion(): void {
    this.modoEdicion.set(false);
    this.mensajeError.set('');
  }

  guardarTurno(): void {
    if (this.turnoForm.invalid) return;

    const payload = this.turnoForm.value;
    const fechaSeleccionadaObj = new Date(payload.fecha_hora);
    
    // Validar domingo en frontend (0 = Domingo)
    if (fechaSeleccionadaObj.getDay() === 0) {
      this.mensajeError.set('El taller no atiende los días domingos. Por favor seleccione una fecha de lunes a sábado.');
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set('');

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
          // Errores de validación estándar (ej. vehículo inválido, fecha pasada, etc.)
          const msg = errorData?.detail || errorData?.fecha_hora || errorData?.vehiculo || 'Ocurrió un error al agendar el turno.';
          this.mensajeError.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
      }
    });
  }

  guardarEdicion(): void {
    if (this.detalleForm.invalid) return;
    const turno = this.turnoSeleccionado();
    if (!turno) return;

    const payload = this.detalleForm.value;
    const fechaObj = new Date(payload.fecha_hora);
    if (fechaObj.getDay() === 0) {
      this.mensajeError.set('El taller no atiende los días domingos. Por favor seleccione una fecha de lunes a sábado.');
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set('');

    this.turnoService.actualizarTurno(turno.id, payload).subscribe({
      next: (res) => {
        this.cerrarModalDetalle();
        this.cargarDatos();
      },
      error: (err) => {
        this.cargando.set(false);
        const errorData = err.error;
        if (errorData && errorData.warning_overbooking) {
          // Guardamos datos para forzar edición
          this.datosPendientesCrear.set({ ...payload, esEdicion: true, turnoId: turno.id });
          this.mostrarAlertaSobrecupo.set(true);
        } else {
          const msg = errorData?.detail || errorData?.fecha_hora || 'Ocurrió un error al actualizar el turno.';
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

    const payloadForzado = { ...payload, force_booking: true };
    const esEdicion = payload.esEdicion;
    const turnoId = payload.turnoId;
    delete payloadForzado.esEdicion;
    delete payloadForzado.turnoId;
    delete payloadForzado.revertFunc;

    if (esEdicion && turnoId) {
      this.turnoService.actualizarTurno(turnoId, payloadForzado).subscribe({
        next: () => {
          this.datosPendientesCrear.set(null);
          this.cerrarModalDetalle();
          this.cargarDatos();
        },
        error: (err) => {
          this.cargando.set(false);
          const errorData = err.error;
          const msg = errorData?.detail || 'Ocurrió un error al forzar la reprogramación del turno.';
          this.mensajeError.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
      });
    } else {
      this.turnoService.crearTurno(payloadForzado).subscribe({
        next: () => {
          this.datosPendientesCrear.set(null);
          this.cerrarModalCrear();
          this.cargarDatos();
        },
        error: (err) => {
          this.cargando.set(false);
          const errorData = err.error;
          const msg = errorData?.detail || 'Ocurrió un error al forzar la reserva del turno.';
          this.mensajeError.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
      });
    }
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
    const vehiculo = this.vehiculosFiltrados().find(v => v.id === vehiculoId);
    return vehiculo ? `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.patente})` : 'Vehículo asignado';
  }

  solicitarEliminarTurno(): void {
    this.mostrarModalConfirmarEliminar.set(true);
  }

  cerrarModalEliminar(): void {
    this.mostrarModalConfirmarEliminar.set(false);
  }

  ejecutarEliminarTurno(): void {
    const turno = this.turnoSeleccionado();
    if (!turno) return;

    this.cargando.set(true);
    this.mensajeError.set('');

    this.turnoService.eliminarTurno(turno.id).subscribe({
      next: () => {
        this.cerrarModalEliminar();
        this.cerrarModalDetalle();
        this.cargarDatos();
      },
      error: (err) => {
        this.cargando.set(false);
        const errorData = err.error;
        const msg = errorData?.detail || 'Ocurrió un error al eliminar el turno.';
        this.mensajeError.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
        this.cerrarModalEliminar();
      }
    });
  }

  cerrarAlertaSobrecupo(): void {
    const payload = this.datosPendientesCrear();
    if (payload && typeof payload.revertFunc === 'function') {
      payload.revertFunc();
    }
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
    this.modoEdicion.set(false);
    this.mensajeError.set('');
  }
}
