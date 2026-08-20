import os
import uuid
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

try:
    import cloudinary
    import cloudinary.uploader
    HAS_CLOUDINARY = True
except ImportError:
    HAS_CLOUDINARY = False


def subir_imagen_diagnostico(file_obj, orden_id):
    """
    Suba una imagen de diagnóstico.
    Utiliza Cloudinary si está configurado en settings o variables de entorno.
    De lo contrario, utiliza el almacenamiento de archivos multimedia local de Django como fallback.

    Retorna un diccionario con:
    - url_secure: URL accesible de la imagen
    - public_id: Identificador en Cloudinary o ruta relativa local
    - nombre_archivo: Nombre original del archivo
    - tamanio: Tamaño en bytes
    - mime_type: Content type
    """
    nombre_original = getattr(file_obj, 'name', 'foto_diagnostico.jpg')
    tamanio = getattr(file_obj, 'size', 0)
    content_type = getattr(file_obj, 'content_type', 'image/jpeg')

    cloud_name = getattr(settings, 'CLOUDINARY_CLOUD_NAME', os.getenv('CLOUDINARY_CLOUD_NAME'))

    if HAS_CLOUDINARY and cloud_name:
        try:
            folder_path = f"fcc_app/diagnosticos/ot_{orden_id}"
            upload_result = cloudinary.uploader.upload(
                file_obj,
                folder=folder_path,
                resource_type="image"
            )
            return {
                'url_secure': upload_result.get('secure_url'),
                'public_id': upload_result.get('public_id'),
                'nombre_archivo': nombre_original,
                'tamanio': tamanio,
                'mime_type': content_type
            }
        except Exception as e:
            print(f"Error al subir a Cloudinary, haciendo fallback a local: {e}")

    # Fallback local a MEDIA_ROOT / MEDIA_URL
    ext = os.path.splitext(nombre_original)[1] or '.jpg'
    nombre_unico = f"ot_{orden_id}_{uuid.uuid4().hex[:8]}{ext}"
    relative_path = os.path.join('diagnosticos', str(orden_id), nombre_unico)

    saved_path = default_storage.save(relative_path, ContentFile(file_obj.read()))
    media_url = getattr(settings, 'MEDIA_URL', '/media/')
    url_secure = f"{media_url.rstrip('/')}/{saved_path.replace(os.sep, '/')}"

    return {
        'url_secure': url_secure,
        'public_id': saved_path,
        'nombre_archivo': nombre_original,
        'tamanio': tamanio,
        'mime_type': content_type
    }


def eliminar_imagen_diagnostico(public_id):
    """
    Elimina una imagen de Cloudinary o del almacenamiento local.
    """
    if not public_id:
        return

    cloud_name = getattr(settings, 'CLOUDINARY_CLOUD_NAME', os.getenv('CLOUDINARY_CLOUD_NAME'))

    if HAS_CLOUDINARY and cloud_name and not public_id.startswith('diagnosticos'):
        try:
            cloudinary.uploader.destroy(public_id)
            return
        except Exception as e:
            print(f"Error al eliminar de Cloudinary: {e}")

    if default_storage.exists(public_id):
        try:
            default_storage.delete(public_id)
        except Exception as e:
            print(f"Error al eliminar archivo local {public_id}: {e}")
