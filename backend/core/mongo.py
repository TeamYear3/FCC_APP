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
