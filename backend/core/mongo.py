import logging
from datetime import datetime, timezone
from django.conf import settings

logger = logging.getLogger(__name__)

try:
    from pymongo import MongoClient
    PYMONGO_AVAILABLE = True
except ImportError:
    PYMONGO_AVAILABLE = False
    logger.warning("PyMongo no está instalado en el entorno Python.")


class MongoDBClient:
    """
    Cliente Singleton para la gestión del pool de conexiones a MongoDB
    con tolerancia a fallos (Graceful Fallback).
    """
    _instance = None
    _client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MongoDBClient, cls).__new__(cls)
            cls._instance._init_connection()
        return cls._instance

    def _init_connection(self):
        if not PYMONGO_AVAILABLE:
            self._client = None
            return

        mongo_uri = getattr(settings, "MONGO_URI", "mongodb://localhost:27017/")
        try:
            # serverSelectionTimeoutMS de 1500ms para no bloquear la API si Mongo está offline
            self._client = MongoClient(mongo_uri, serverSelectionTimeoutMS=1500)
        except Exception as e:
            logger.error(f"Error al inicializar conexión con MongoDB: {e}")
            self._client = None

    def get_db(self):
        if self._client is None:
            return None
        db_name = getattr(settings, "MONGO_DB_NAME", "fcc_app")
        try:
            return self._client[db_name]
        except Exception as e:
            logger.error(f"Error al acceder a la base de datos Mongo '{db_name}': {e}")
            return None


def registrar_auditoria_ot(orden_id, estado_anterior, estado_nuevo, usuario=None, metadata=None):
    """
    Registra un evento de trazabilidad y cambio de estado de una OT en MongoDB.
    """
    try:
        db = MongoDBClient().get_db()
        if db is None:
            logger.warning("MongoDB no disponible. Omitiendo registro de auditoría NoSQL.")
            return False

        coleccion = db["auditoria_estados_ot"]

        documento = {
            "orden_id": str(orden_id),
            "estado_anterior": str(estado_anterior) if estado_anterior else None,
            "estado_nuevo": str(estado_nuevo),
            "usuario_id": str(usuario.id) if usuario and hasattr(usuario, "id") and usuario.id else None,
            "usuario_email": usuario.email if usuario and hasattr(usuario, "email") else None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metadata": metadata or {}
        }

        coleccion.insert_one(documento)
        logger.info(f"Auditoría NoSQL registrada en MongoDB para Orden #{orden_id}")
        return True
    except Exception as e:
        logger.error(f"Excepción al registrar auditoría en MongoDB para OT #{orden_id}: {e}")
        return False


def obtener_auditoria_ot(orden_id):
    """
    Recupera el historial cronológico de auditoría NoSQL para una OT específica.
    """
    try:
        db = MongoDBClient().get_db()
        if db is None:
            return []

        coleccion = db["auditoria_estados_ot"]
        cursor = coleccion.find({"orden_id": str(orden_id)}).sort("timestamp", -1)

        registros = []
        for doc in cursor:
            # Convertir ObjectId de Mongo a string para serialización JSON limpia
            doc["_id"] = str(doc["_id"])
            registros.append(doc)

        return registros
    except Exception as e:
        logger.error(f"Excepción al consultar auditoría MongoDB para OT #{orden_id}: {e}")
        return []


def registrar_telemetria_arca(datos_solicitud, respuesta_arca, orden_id=None, exitoso=True, error=None):
    """
    Registra la telemetría y respuesta fiscal de ARCA (ex-AFIP) en colecciones NoSQL de MongoDB (TK191 / US-11).
    """
    try:
        db = MongoDBClient().get_db()
        if db is None:
            logger.warning("MongoDB no disponible. Omitiendo registro de telemetría ARCA NoSQL.")
            return False

        coleccion = db["telemetria_arca"]

        respuesta_serializable = {}
        if isinstance(respuesta_arca, dict):
            for k, v in respuesta_arca.items():
                if hasattr(v, "isoformat"):
                    respuesta_serializable[k] = v.isoformat()
                elif hasattr(v, "__str__"):
                    respuesta_serializable[k] = str(v)
                else:
                    respuesta_serializable[k] = v
        else:
            respuesta_serializable = str(respuesta_arca) if respuesta_arca else {}

        documento = {
            "orden_id": str(orden_id) if orden_id else None,
            "solicitud": datos_solicitud or {},
            "respuesta": respuesta_serializable,
            "exitoso": bool(exitoso),
            "error": str(error) if error else None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        coleccion.insert_one(documento)
        logger.info(f"Telemetría ARCA persistida exitosamente en MongoDB para OT #{orden_id}")
        return True
    except Exception as e:
        logger.error(f"Excepción al persistir telemetría fiscal ARCA en MongoDB: {e}")
        return False


def obtener_telemetria_arca(orden_id=None, limit=50):
    """
    Recupera el historial de telemetría fiscal NoSQL de ARCA desde MongoDB.
    """
    try:
        db = MongoDBClient().get_db()
        if db is None:
            return []

        coleccion = db["telemetria_arca"]
        filtro = {}
        if orden_id:
            filtro["orden_id"] = str(orden_id)

        cursor = coleccion.find(filtro).sort("timestamp", -1).limit(limit)

        registros = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            registros.append(doc)

        return registros
    except Exception as e:
        logger.error(f"Excepción al consultar telemetría ARCA en MongoDB: {e}")
        return []


def registrar_evento_websocket(tipo_evento, payload, grupo=None):
    """
    Registra un evento emitido por WebSocket en MongoDB (TK192 / US-13).
    Colección: 'eventos_websocket'
    Documento:
    - evento_id: str
    - tipo_evento: str
    - orden_id: str | None (extraído de payload)
    - numero_ot: str | None (extraído de payload)
    - payload: dict (serializable)
    - grupo: str | None
    - timestamp: ISO-8601 UTC
    """
    try:
        import uuid
        db = MongoDBClient().get_db()
        if db is None:
            logger.warning("MongoDB no disponible. Omitiendo persistencia de evento WebSocket.")
            return False

        coleccion = db["eventos_websocket"]

        orden_id = None
        numero_ot = None
        evento_id = None
        payload_dict = {}
        if isinstance(payload, dict):
            evento_id = payload.get("evento_id")
            orden_id = payload.get("orden_id")
            numero_ot = payload.get("numero_ot")
            for k, v in payload.items():
                if hasattr(v, "isoformat"):
                    payload_dict[k] = v.isoformat()
                elif hasattr(v, "value"):
                    payload_dict[k] = str(v.value)
                elif hasattr(v, "__str__") and not isinstance(v, (str, int, float, bool, list, dict, type(None))):
                    payload_dict[k] = str(v)
                else:
                    payload_dict[k] = v
        else:
            payload_dict = {"raw": str(payload)}

        if evento_id:
            existente = coleccion.find_one({"evento_id": str(evento_id)})
            if existente:
                return True
        else:
            evento_id = str(uuid.uuid4())
            payload_dict["evento_id"] = evento_id

        documento = {
            "evento_id": str(evento_id),
            "tipo_evento": str(tipo_evento),
            "orden_id": str(orden_id) if orden_id else None,
            "numero_ot": str(numero_ot) if numero_ot else None,
            "payload": payload_dict,
            "grupo": str(grupo) if grupo else None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        coleccion.insert_one(documento)
        logger.info(f"Evento WebSocket '{tipo_evento}' persistido exitosamente en MongoDB (OT #{numero_ot or orden_id})")
        return True
    except Exception as e:
        logger.error(f"Excepción al persistir evento WebSocket en MongoDB: {e}")
        return False


def obtener_historial_eventos_websocket(orden_id=None, numero_ot=None, tipo_evento=None, limit=50):
    """
    Recupera el historial cronológico de eventos WebSocket persistidos en MongoDB (TK192 / US-13).
    """
    try:
        db = MongoDBClient().get_db()
        if db is None:
            return []

        coleccion = db["eventos_websocket"]
        filtro = {}
        if orden_id:
            filtro["orden_id"] = str(orden_id)
        if numero_ot:
            filtro["numero_ot"] = str(numero_ot)
        if tipo_evento:
            filtro["tipo_evento"] = str(tipo_evento)

        cursor = coleccion.find(filtro).sort("timestamp", -1).limit(limit)

        registros = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            registros.append(doc)

        return registros
    except Exception as e:
        logger.error(f"Excepción al consultar historial de eventos WebSocket en MongoDB: {e}")
        return []


def registrar_diagnostico_obd2(orden_id, codigos_dtc, parametros_en_vivo=None, escaner=None, notas=None, tecnico=None, numero_ot=None, patente=None):
    """
    Registra una lectura de diagnóstico computarizado y códigos OBD-II en MongoDB (TK193 / US-07).
    Colección: 'diagnosticos_obd2'
    Documento:
    - diagnostico_id: str (UUID)
    - orden_id: str
    - numero_ot: str | None
    - patente: str | None
    - codigos_dtc: list (objetos o strings normalizados con codigo, descripcion, etc.)
    - parametros_en_vivo: dict (lecturas dinámicas de sensores: RPM, STFT, LTFT, temperatura, etc.)
    - escaner: str | None
    - notas: str | None
    - tecnico: dict | None (id, email, nombre)
    - timestamp: ISO-8601 UTC
    """
    try:
        import uuid
        db = MongoDBClient().get_db()
        if db is None:
            logger.warning("MongoDB no disponible. Omitiendo registro de diagnóstico OBD-II NoSQL.")
            return None

        coleccion = db["diagnosticos_obd2"]

        # Normalizar códigos DTC
        dtc_normalizados = []
        if isinstance(codigos_dtc, list):
            for item in codigos_dtc:
                if isinstance(item, dict):
                    dtc_normalizados.append({
                        "codigo": str(item.get("codigo", "")).strip().upper(),
                        "descripcion": str(item.get("descripcion", "")).strip(),
                        "sistema": str(item.get("sistema", "")).strip() or None,
                        "estado": str(item.get("estado", "activo")).strip().lower()
                    })
                elif isinstance(item, str):
                    dtc_normalizados.append({
                        "codigo": item.strip().upper(),
                        "descripcion": "",
                        "sistema": None,
                        "estado": "activo"
                    })
        elif isinstance(codigos_dtc, str):
            for c in codigos_dtc.split(","):
                code = c.strip().upper()
                if code:
                    dtc_normalizados.append({
                        "codigo": code,
                        "descripcion": "",
                        "sistema": None,
                        "estado": "activo"
                    })

        # Normalizar parámetros en vivo (serializable dict)
        live_params = {}
        if isinstance(parametros_en_vivo, dict):
            for k, v in parametros_en_vivo.items():
                if hasattr(v, "isoformat"):
                    live_params[k] = v.isoformat()
                elif hasattr(v, "value"):
                    live_params[k] = str(v.value)
                elif hasattr(v, "__str__") and not isinstance(v, (str, int, float, bool, list, dict, type(None))):
                    live_params[k] = str(v)
                else:
                    live_params[k] = v
        elif parametros_en_vivo is not None:
            live_params = {"raw": str(parametros_en_vivo)}

        tecnico_info = None
        if tecnico:
            if hasattr(tecnico, "id"):
                tecnico_info = {
                    "id": str(tecnico.id),
                    "email": getattr(tecnico, "email", None),
                    "nombre": f"{getattr(tecnico, 'nombre', '')} {getattr(tecnico, 'apellido', '')}".strip() or None
                }
            elif isinstance(tecnico, dict):
                tecnico_info = tecnico

        diagnostico_id = str(uuid.uuid4())
        documento = {
            "diagnostico_id": diagnostico_id,
            "orden_id": str(orden_id),
            "numero_ot": str(numero_ot) if numero_ot else None,
            "patente": str(patente).upper() if patente else None,
            "codigos_dtc": dtc_normalizados,
            "parametros_en_vivo": live_params,
            "escaner": str(escaner) if escaner else None,
            "notas": str(notas) if notas else None,
            "tecnico": tecnico_info,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        coleccion.insert_one(documento)
        logger.info(f"Diagnóstico OBD-II registrado en MongoDB para OT #{numero_ot or orden_id} (DTCs: {len(dtc_normalizados)})")
        if "_id" in documento:
            documento["_id"] = str(documento["_id"])
        return documento
    except Exception as e:
        logger.error(f"Excepción al registrar diagnóstico OBD-II en MongoDB: {e}")
        return None


def obtener_diagnosticos_obd2(orden_id=None, patente=None, limit=50):
    """
    Recupera el historial de diagnósticos y lecturas OBD-II NoSQL desde MongoDB (TK193 / US-07).
    """
    try:
        db = MongoDBClient().get_db()
        if db is None:
            return []

        coleccion = db["diagnosticos_obd2"]
        filtro = {}
        if orden_id:
            filtro["orden_id"] = str(orden_id)
        if patente:
            filtro["patente"] = str(patente).upper()

        cursor = coleccion.find(filtro).sort("timestamp", -1).limit(limit)

        registros = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            registros.append(doc)

        return registros
    except Exception as e:
        logger.error(f"Excepción al consultar diagnósticos OBD-II en MongoDB: {e}")
        return []


