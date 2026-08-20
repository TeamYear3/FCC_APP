import { TestBed } from '@angular/core/testing';
import { WebSocketService, WebSocketEventPayload } from './websocket.service';
import { firstValueFrom } from 'rxjs';

describe('WebSocketService', () => {
  let service: WebSocketService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WebSocketService]
    });
    service = TestBed.inject(WebSocketService);
  });

  afterEach(() => {
    service.desconectar();
  });

  it('debe crearse el servicio WebSocketService', () => {
    expect(service).toBeTruthy();
    expect(service.estadoConexion()).toBe('desconectado');
  });

  it('debe filtrar y emitir eventos específicos al invocar escucharEvento', async () => {
    const mockPayload: WebSocketEventPayload<{ orden_id: string; estado: string }> = {
      type: 'orden_actualizada',
      payload: { orden_id: 'ot-99', estado: 'en_proceso' }
    };

    const promesaEvento = firstValueFrom(service.escucharEvento<{ orden_id: string; estado: string }>('orden_actualizada'));

    service.simularMensaje(mockPayload);

    const datos = await promesaEvento;
    expect(datos.orden_id).toBe('ot-99');
    expect(datos.estado).toBe('en_proceso');
  });

  it('debe ignorar eventos que no coincidan con el tipo solicitado', () => {
    let llamado = false;
    service.escucharEvento('orden_actualizada').subscribe(() => {
      llamado = true;
    });

    service.simularMensaje({ type: 'otro_evento', payload: {} });
    expect(llamado).toBe(false);
  });

  it('debe actualizar el estado a desconectado al llamar a desconectar()', () => {
    service.desconectar();
    expect(service.estadoConexion()).toBe('desconectado');
  });
});
