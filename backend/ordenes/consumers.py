import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from core.mongo import registrar_evento_websocket, obtener_historial_eventos_websocket

logger = logging.getLogger(__name__)

class OrdenesConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = 'ordenes_actualizaciones'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            action = text_data_json.get('action')

            if action == 'historial':
                orden_id = text_data_json.get('orden_id')
                numero_ot = text_data_json.get('numero_ot')
                tipo_evento = text_data_json.get('tipo_evento')
                limit = text_data_json.get('limit', 50)

                eventos = await sync_to_async(obtener_historial_eventos_websocket)(
                    orden_id=orden_id,
                    numero_ot=numero_ot,
                    tipo_evento=tipo_evento,
                    limit=limit
                )
                await self.send(text_data=json.dumps({
                    'type': 'historial_eventos',
                    'orden_id': orden_id,
                    'numero_ot': numero_ot,
                    'total': len(eventos),
                    'eventos': eventos
                }))
                return

            await self.send(text_data=json.dumps({
                'type': 'ping_pong',
                'payload': text_data_json
            }))
        except Exception as e:
            logger.error(f"Error procesando mensaje en WebSocket: {e}")

    async def orden_actualizada(self, event):
        payload = event.get('payload') or event.get('data', {})
        await sync_to_async(registrar_evento_websocket)(
            tipo_evento='orden_actualizada',
            payload=payload,
            grupo=self.room_group_name
        )
        await self.send(text_data=json.dumps({
            'type': 'orden_actualizada',
            'payload': payload
        }))

    async def notificacion_presupuesto(self, event):
        payload = event.get('data') or event.get('payload', {})
        await sync_to_async(registrar_evento_websocket)(
            tipo_evento='notificacion_presupuesto',
            payload=payload,
            grupo=self.room_group_name
        )
        await self.send(text_data=json.dumps({
            'type': 'orden_actualizada',
            'payload': payload
        }))

    async def adjunto_actualizado(self, event):
        payload = event.get('payload') or event.get('data', {})
        await sync_to_async(registrar_evento_websocket)(
            tipo_evento='adjunto_actualizado',
            payload=payload,
            grupo=self.room_group_name
        )
        await self.send(text_data=json.dumps({
            'type': 'adjunto_actualizado',
            'payload': payload
        }))


