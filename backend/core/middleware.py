import contextvars
import logging
import uuid
from typing import Optional

logger = logging.getLogger(__name__)

# Variable de contexto local al hilo / tarea asíncrona para propagar el Request ID
_current_request_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "current_request_id", default=None
)


def get_current_request_id() -> Optional[str]:
    """Retorna el request_id activo en el contexto actual, o None si no hay solicitud activa."""
    return _current_request_id.get()


class RequestIDFilter(logging.Filter):
    """
    Filtro de logging para inyectar automáticamente el identificador de solicitud
    `request_id` en cada registro de log (TK165).
    """

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_current_request_id() or getattr(record, "request_id", "system")
        return True


class RequestTracingMiddleware:
    """
    Middleware de trazabilidad y correlación de solicitudes HTTP (TK165).

    - Intercepta el encabezado entrante `X-Request-ID` (o lo genera mediante UUID v4 si está ausente).
    - Establece el `request_id` en la instancia de la solicitud y en el contexto de logging.
    - Adjunta el encabezado `X-Request-ID` a la respuesta HTTP saliente para correlación cliente-servidor.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming_id = request.META.get("HTTP_X_REQUEST_ID")
        if incoming_id and incoming_id.strip():
            request_id = incoming_id.strip()
        else:
            request_id = str(uuid.uuid4())

        request.request_id = request_id
        token = _current_request_id.set(request_id)

        try:
            response = self.get_response(request)
        finally:
            _current_request_id.reset(token)

        if response is not None:
            response["X-Request-ID"] = request_id

        return response
