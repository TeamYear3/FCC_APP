import logging
import uuid
from django.db import IntegrityError, DatabaseError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Manejador global personalizado de excepciones para Django REST Framework (TK164).

    Garantiza que la API devuelva siempre respuestas JSON estructuradas ante cualquier
    fallo crítico, previene la emisión de respuestas HTML 500 y trazas de depuración,
    asigna un `error_id` único (UUID) y transforma errores de integridad en HTTP 409.
    """
    error_id = str(uuid.uuid4())
    view = context.get("view", None)
    view_name = view.__class__.__name__ if view else "Desconocida"

    # Intentar el manejador estándar de DRF
    response = exception_handler(exc, context)

    # 1. Errores de integridad y base de datos (clave duplicada, restricciones FK, etc.)
    if isinstance(exc, (IntegrityError, DatabaseError)):
        logger.warning(
            "IntegrityError / DatabaseError capturado [%s] en %s: %s",
            error_id,
            view_name,
            exc,
            exc_info=True,
        )
        data = {
            "error": "Error de integridad de datos o registro duplicado.",
            "error_id": error_id,
            "status_code": status.HTTP_409_CONFLICT,
        }
        resp = Response(data, status=status.HTTP_409_CONFLICT)
        resp["X-Error-ID"] = error_id
        return resp

    # 2. Excepciones no controladas por DRF (que por defecto generarían HTML 500 en Django)
    if response is None:
        logger.error(
            "Excepción no controlada del servidor [%s] en %s: %s",
            error_id,
            view_name,
            exc,
            exc_info=True,
        )
        data = {
            "error": "Se produjo un error interno en el servidor.",
            "error_id": error_id,
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
        }
        resp = Response(data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        resp["X-Error-ID"] = error_id
        return resp

    # 3. Excepciones ya manejadas por DRF (ValidationError 400, NotAuthenticated 401, etc.)
    # Inyectar error_id y status_code para garantizar uniformidad
    if isinstance(response.data, dict):
        response.data.setdefault("error_id", error_id)
        if "status_code" not in response.data:
            response.data["status_code"] = response.status_code

    response["X-Error-ID"] = error_id
    return response
