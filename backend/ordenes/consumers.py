import json
from channels.generic.websocket import AsyncWebsocketConsumer

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
            await self.send(text_data=json.dumps({
                'type': 'ping_pong',
                'payload': text_data_json
            }))
        except Exception:
            pass

    async def orden_actualizada(self, event):
        payload = event.get('payload') or event.get('data', {})
        await self.send(text_data=json.dumps({
            'type': 'orden_actualizada',
            'payload': payload
        }))

    async def notificacion_presupuesto(self, event):
        payload = event.get('data') or event.get('payload', {})
        await self.send(text_data=json.dumps({
            'type': 'orden_actualizada',
            'payload': payload
        }))
