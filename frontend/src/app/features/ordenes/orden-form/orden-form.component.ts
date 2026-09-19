import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OrdenService, OrdenPayload } from '../../../core/services/orden.service';
import { VehiculoService, VehiculoResponse, VehiculoCreatePayload } from '../../../core/services/vehiculo.service';
import { ClienteService, ClienteResponse, ClientePayload } from '../../../core/services/cliente.service';
import { TurnoService, TurnoResponse } from '../../../core/services/turno.service';
import { ToastService } from '../../../core/services/toast.service';
import { VehiculoSelectorComponent } from '../../../shared/components/vehiculo-selector/vehiculo-selector.component';

@Component({
  selector: 'app-orden-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, VehiculoSelectorComponent],
  templateUrl: './orden-form.component.html',
  styleUrls: ['./orden-form.component.css']
})
export class OrdenFormComponent implements OnInit {
  @ViewChild(VehiculoSelectorComponent) vehiculoSelector?: VehiculoSelectorComponent;

  private readonly fb = inject(FormBuilder);
  private readonly ordenService = inject(OrdenService);
  private readonly vehiculoService = inject(VehiculoService);
  private readonly clienteService = inject(ClienteService);
  private readonly turnoService = inject(TurnoService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Señales para almacenar los detalles cargados en tiempo real
  readonly selectedVehiculoDetails = signal<VehiculoResponse | null>(null);
  readonly selectedClienteDetails = signal<ClienteResponse | null>(null);
  readonly returnUrl = signal<string>('/ordenes');

  // Turnos reales obtenidos desde el backend
  readonly turnos = signal<TurnoResponse[]>([]);
  readonly cargandoTurnos = signal<boolean>(false);

  // Estados de modales In-Situ (TK102)
  readonly mostrarModalCliente = signal<boolean>(false);
  readonly mostrarModalVehiculo = signal<boolean>(false);
  readonly guardandoClienteInSitu = signal<boolean>(false);
  readonly guardandoVehiculoInSitu = signal<boolean>(false);
  readonly errorModalCliente = signal<string | null>(null);
  readonly errorModalVehiculo = signal<string | null>(null);
  readonly listaClientes = signal<ClienteResponse[]>([]);

  ordenForm!: FormGroup;
  clienteFormInSitu!: FormGroup;
  vehiculoFormInSitu!: FormGroup;

  ngOnInit(): void {
    this.returnUrl.set(this.router.url.startsWith('/admin') ? '/admin/ordenes' : '/ordenes');
    this.cargarTurnos();
    this.cargarListaClientes();
    this.inicializarFormulariosInSitu();
    const hoy = new Date();
    const hoyString = hoy.getFullYear() + '-' + 
                      String(hoy.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(hoy.getDate()).padStart(2, '0');

    this.ordenForm = this.fb.group({
      modo: ['PRESUPUESTO', [Validators.required]],
      vehiculo_id: [null, [Validators.required]],
      complejidad: ['media', [Validators.required]],
      descripcion_problema: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(2000)]],
      fecha_ingreso: [hoyString, [Validators.required]],
      turno_id: [null],
      cliente_acepto: [false]
    });

    // Suscripción al modo de ingreso para ajustar validaciones reactivas
    this.ordenForm.get('modo')?.valueChanges.subscribe((modo: 'PRESUPUESTO' | 'ORDEN_TRABAJO') => {
      const turnoCtrl = this.ordenForm.get('turno_id');
      const aceptoCtrl = this.ordenForm.get('cliente_acepto');

      if (modo === 'ORDEN_TRABAJO') {
        turnoCtrl?.setValidators([Validators.required]);
        aceptoCtrl?.setValidators([Validators.requiredTrue]);
      } else {
        turnoCtrl?.clearValidators();
        aceptoCtrl?.clearValidators();
      }

      turnoCtrl?.updateValueAndValidity();
      aceptoCtrl?.updateValueAndValidity();
    });

    // Suscripción al cambio de vehículo para cargar información detallada en tiempo real
    this.ordenForm.get('vehiculo_id')?.valueChanges.subscribe((vehiculoId: string | null) => {
      if (!vehiculoId) {
        this.selectedVehiculoDetails.set(null);
        this.selectedClienteDetails.set(null);
        return;
      }

      this.vehiculoService.getVehiculoById(vehiculoId).subscribe({
        next: (vehiculo) => {
          this.selectedVehiculoDetails.set(vehiculo);
          // Cargar datos del propietario asociado
          if (vehiculo.cliente_id) {
            this.clienteService.getClienteById(vehiculo.cliente_id).subscribe({
              next: (cliente) => this.selectedClienteDetails.set(cliente),
              error: () => this.selectedClienteDetails.set(null)
            });
          } else {
            this.selectedClienteDetails.set(null);
          }
        },
        error: (err) => {
          console.error('Error al obtener detalles del vehículo:', err);
          this.selectedVehiculoDetails.set(null);
          this.selectedClienteDetails.set(null);
        }
      });
    });
  }

  cargarTurnos(): void {
    this.cargandoTurnos.set(true);
    this.turnoService.obtenerTurnos().subscribe({
      next: (lista) => {
        // Filtrar turnos activos o pendientes
        const activos = lista.filter(t => t.estado !== 'cancelado');
        this.turnos.set(activos.length > 0 ? activos : lista);
        this.cargandoTurnos.set(false);
      },
      error: (err) => {
        console.error('Error al cargar turnos disponibles:', err);
        this.turnos.set([]);
        this.cargandoTurnos.set(false);
      }
    });
  }

  formatearTurno(t: TurnoResponse): string {
    try {
      const fecha = new Date(t.fecha_hora);
      const dia = String(fecha.getDate()).padStart(2, '0');
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const horas = String(fecha.getHours()).padStart(2, '0');
      const min = String(fecha.getMinutes()).padStart(2, '0');
      const fechaFormateada = `${dia}/${mes} ${horas}:${min} hs`;
      const infoTitular = t.cliente_nombre ? ` (${t.cliente_nombre})` : '';
      return `${fechaFormateada} - ${t.motivo}${infoTitular}`;
    } catch {
      return `${t.fecha_hora} - ${t.motivo}`;
    }
  }

  get modoSeleccionado(): 'PRESUPUESTO' | 'ORDEN_TRABAJO' {
    return this.ordenForm?.get('modo')?.value || 'PRESUPUESTO';
  }

  inicializarFormulariosInSitu(): void {
    this.clienteFormInSitu = this.fb.group({
      tipo_documento: ['DNI', [Validators.required]],
      dni_cuit: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      condicion_iva: ['CF', [Validators.required]],
      telefono: ['', [Validators.maxLength(30)]],
      domicilio: ['', [Validators.maxLength(255)]]
    });

    this.clienteFormInSitu.get('tipo_documento')?.valueChanges.subscribe((tipo: 'DNI' | 'CUIT') => {
      const dniCtrl = this.clienteFormInSitu.get('dni_cuit');
      if (tipo === 'DNI') {
        dniCtrl?.setValidators([Validators.required, Validators.pattern(/^\d{7,8}$/)]);
      } else {
        dniCtrl?.setValidators([Validators.required, Validators.pattern(/^\d{2}-\d{8}-\d{1}$/)]);
      }
      dniCtrl?.updateValueAndValidity();
    });

    this.vehiculoFormInSitu = this.fb.group({
      cliente_id: ['', [Validators.required]],
      patente: ['', [Validators.required, Validators.pattern(/^[A-Z]{3}\d{3}$|^[A-Z]{2}\d{3}[A-Z]{2}$/i)]],
      marca: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      modelo: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      anio: [new Date().getFullYear(), [Validators.min(1900), Validators.max(2030)]],
      kilometraje: [0, [Validators.min(0)]],
      color: ['', [Validators.maxLength(30)]],
      numero_chasis: ['', [Validators.maxLength(50)]]
    });
  }

  cargarListaClientes(): void {
    this.clienteService.obtenerClientes().subscribe({
      next: (clientes) => this.listaClientes.set(clientes || []),
      error: () => this.listaClientes.set([])
    });
  }

  // Métodos Modal Cliente In-Situ (TK102)
  abrirModalCliente(): void {
    this.clienteFormInSitu.reset({
      tipo_documento: 'DNI',
      condicion_iva: 'CF'
    });
    this.errorModalCliente.set(null);
    this.mostrarModalCliente.set(true);
  }

  cerrarModalCliente(): void {
    this.mostrarModalCliente.set(false);
  }

  guardarClienteInSitu(): void {
    if (this.clienteFormInSitu.invalid) {
      this.clienteFormInSitu.markAllAsTouched();
      return;
    }

    this.guardandoClienteInSitu.set(true);
    this.errorModalCliente.set(null);

    const formVal = this.clienteFormInSitu.value;
    const payload: ClientePayload = {
      nombre: formVal.nombre.trim(),
      apellido: formVal.apellido.trim(),
      tipo_documento: formVal.tipo_documento,
      dni_cuit: formVal.dni_cuit.trim(),
      condicion_iva: formVal.condicion_iva,
      telefono: formVal.telefono ? formVal.telefono.trim() : undefined,
      domicilio: formVal.domicilio ? formVal.domicilio.trim() : undefined
    };

    this.clienteService.crearCliente(payload).subscribe({
      next: (clienteCreado) => {
        this.guardandoClienteInSitu.set(false);
        this.toastService.exito(`Cliente "${clienteCreado.nombre} ${clienteCreado.apellido}" creado exitosamente.`);
        this.cargarListaClientes();
        this.cerrarModalCliente();

        // Si aún no hay vehículo, abrir modal de vehículo preseleccionando este cliente
        this.abrirModalVehiculo(clienteCreado.id);
      },
      error: (err) => {
        this.guardandoClienteInSitu.set(false);
        const msg = err.error?.dni_cuit || err.error?.detail || err.error?.error || 'Error al registrar cliente in-situ.';
        this.errorModalCliente.set(Array.isArray(msg) ? msg[0] : msg);
      }
    });
  }

  // Métodos Modal Vehículo In-Situ (TK102)
  abrirModalVehiculo(clienteIdPreseleccionado?: string): void {
    this.cargarListaClientes();
    this.vehiculoFormInSitu.reset({
      cliente_id: clienteIdPreseleccionado || '',
      anio: new Date().getFullYear(),
      kilometraje: 0
    });
    this.errorModalVehiculo.set(null);
    this.mostrarModalVehiculo.set(true);
  }

  cerrarModalVehiculo(): void {
    this.mostrarModalVehiculo.set(false);
  }

  guardarVehiculoInSitu(): void {
    if (this.vehiculoFormInSitu.invalid) {
      this.vehiculoFormInSitu.markAllAsTouched();
      return;
    }

    this.guardandoVehiculoInSitu.set(true);
    this.errorModalVehiculo.set(null);

    const formVal = this.vehiculoFormInSitu.value;
    const payload: VehiculoCreatePayload = {
      cliente_id: formVal.cliente_id,
      patente: formVal.patente.trim().toUpperCase(),
      marca: formVal.marca.trim(),
      modelo: formVal.modelo.trim(),
      anio: formVal.anio ? Number(formVal.anio) : undefined,
      kilometraje: formVal.kilometraje !== null ? Number(formVal.kilometraje) : 0,
      color: formVal.color ? formVal.color.trim() : undefined,
      numero_chasis: formVal.numero_chasis ? formVal.numero_chasis.trim() : undefined
    };

    this.vehiculoService.crearVehiculo(payload).subscribe({
      next: (vehiculoCreado) => {
        this.guardandoVehiculoInSitu.set(false);
        this.toastService.exito(`Vehículo "${vehiculoCreado.patente}" registrado exitosamente.`);
        
        // Asignar en el formulario principal y refrescar selector
        this.ordenForm.get('vehiculo_id')?.setValue(vehiculoCreado.id);
        this.selectedVehiculoDetails.set(vehiculoCreado);
        
        // Recargar datos en el selector de vehículos
        this.vehiculoSelector?.cargarVehiculos();

        // Cargar datos del cliente asociado
        if (vehiculoCreado.cliente_id) {
          this.clienteService.getClienteById(vehiculoCreado.cliente_id).subscribe({
            next: (cli) => this.selectedClienteDetails.set(cli),
            error: () => this.selectedClienteDetails.set(null)
          });
        }

        this.cerrarModalVehiculo();
      },
      error: (err) => {
        this.guardandoVehiculoInSitu.set(false);
        const msg = err.error?.patente || err.error?.cliente_id || err.error?.detail || err.error?.error || 'Error al registrar vehículo in-situ.';
        this.errorModalVehiculo.set(Array.isArray(msg) ? msg[0] : msg);
      }
    });
  }

  onSubmit(): void {
    if (this.ordenForm.invalid) {
      this.ordenForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formVal = this.ordenForm.value;
    const payload: OrdenPayload = {
      vehiculo_id: formVal.vehiculo_id,
      descripcion_problema: formVal.descripcion_problema,
      fecha_ingreso: formVal.fecha_ingreso,
      complejidad: formVal.complejidad,
      estado: formVal.modo === 'PRESUPUESTO' ? 'en_presupuesto' : 'ingresado'
    };

    this.ordenService.crearOrden(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.router.navigate([this.returnUrl()], {
          state: { successOT: res.numero_ot }
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        console.error('Error al registrar orden de trabajo:', err);

        if (err.error?.vehiculo_id) {
          const detail = Array.isArray(err.error.vehiculo_id) ? err.error.vehiculo_id[0] : err.error.vehiculo_id;
          this.errorMessage.set(`Vehículo: ${detail}`);
        } else if (err.error?.descripcion_problema) {
          const detail = Array.isArray(err.error.descripcion_problema) ? err.error.descripcion_problema[0] : err.error.descripcion_problema;
          this.errorMessage.set(`Descripción: ${detail}`);
        } else if (err.error?.fecha_ingreso) {
          const detail = Array.isArray(err.error.fecha_ingreso) ? err.error.fecha_ingreso[0] : err.error.fecha_ingreso;
          this.errorMessage.set(`Fecha: ${detail}`);
        } else if (err.error?.detail || err.error?.error) {
          this.errorMessage.set(err.error.detail || err.error.error);
        } else if (typeof err.error === 'object' && err.error !== null) {
          const firstKey = Object.keys(err.error)[0];
          const message = Array.isArray(err.error[firstKey]) ? err.error[firstKey][0] : err.error[firstKey];
          this.errorMessage.set(`${firstKey.toUpperCase()}: ${message}`);
        } else {
          this.errorMessage.set('No se pudo registrar la Orden de Trabajo. Verifique su conexión.');
        }
      }
    });
  }
}

