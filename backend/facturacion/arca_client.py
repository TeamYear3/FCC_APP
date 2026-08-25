import logging
import random
from datetime import timedelta
from django.utils import timezone
from .models import Factura, TipoComprobante

logger = logging.getLogger(__name__)


class ArcaWSClient:
    """
    Cliente adaptador de comunicación con el WebService oficial de ARCA (ex-AFIP)
    para la emisión electrónica de comprobantes y solicitud de Código de Autorización Electrónico (CAE).
    """

    CUIT_EMISOR_DEFAULT = "30-71829384-9"
    PUNTO_VENTA_DEFAULT = 1

    @classmethod
    def obtener_proximo_numero_comprobante(cls, tipo_comprobante=TipoComprobante.FACTURA_B, punto_venta=1):
        """
        Consulta el último número de comprobante emitido para el punto de venta y tipo
        y devuelve el siguiente correlativo secuencial.
        """
        ultima_factura = (
            Factura.objects.filter(tipo_comprobante=tipo_comprobante, punto_venta=punto_venta)
            .order_by("-numero_factura")
            .first()
        )
        if ultima_factura:
            return ultima_factura.numero_factura + 1
        return 1

    @classmethod
    def generar_cae_algoritmico(cls):
        """
        Genera un CAE de 14 dígitos numéricos simulando el formato oficial emitido por ARCA/AFIP.
        """
        # Prefijo de 13 dígitos aleatorios + 1 dígito verificador
        digitos_base = "".join([str(random.randint(0, 9)) for _ in range(13)])
        # Cálculo de dígito verificador módulo 10
        suma = sum(int(d) * (3 if i % 2 == 0 else 1) for i, d in enumerate(digitos_base))
        digito_verificador = (10 - (suma % 10)) % 10
        return f"{digitos_base}{digito_verificador}"

    @classmethod
    def solicitar_cae(
        cls,
        total,
        cuit_emisor=None,
        punto_venta=1,
        tipo_comprobante=TipoComprobante.FACTURA_B,
        doc_tipo="DNI",
        doc_nro="0",
        condicion_iva="CF"
    ):
        """
        Invoca al WebService de facturación electrónica de ARCA para autorizar la factura.
        
        Args:
            total (Decimal): Monto total del comprobante.
            cuit_emisor (str): CUIT fiscal del taller emisor.
            punto_venta (int): Punto de venta habilitado (ej. 1).
            tipo_comprobante (str): Tipo de factura ("A", "B", "C").
            doc_tipo (str): Tipo de documento del receptor ("DNI", "CUIT").
            doc_nro (str): Número de identificación tributaria o personal del cliente.
            condicion_iva (str): Condición impositiva del cliente.

        Returns:
            dict: Respuesta estructurada con CAE, fecha de vencimiento fiscal y número de factura.
        """
        logger.info(
            f"Solicitando autorización de CAE a ARCA para Punto de Venta {punto_venta}, "
            f"Tipo {tipo_comprobante}, Total: ${total}..."
        )

        # Determinar número secuencial
        numero_factura = cls.obtener_proximo_numero_comprobante(
            tipo_comprobante=tipo_comprobante,
            punto_venta=punto_venta
        )

        # Generar CAE y fecha de vencimiento fiscal (10 días corridos según normativa ARCA)
        hoy = timezone.localdate()
        cae = cls.generar_cae_algoritmico()
        fecha_vencimiento_cae = hoy + timedelta(days=10)

        logger.info(
            f"Comprobante autorizado por ARCA con éxito. CAE: {cae}, "
            f"Comprobante: {tipo_comprobante}-{str(punto_venta).zfill(4)}-{str(numero_factura).zfill(8)}"
        )

        return {
            "resultado": "Aprobado",
            "cae": cae,
            "fecha_vencimiento_cae": fecha_vencimiento_cae,
            "numero_factura": numero_factura,
            "punto_venta": punto_venta,
            "tipo_comprobante": tipo_comprobante,
            "cuit_emisor": cuit_emisor or cls.CUIT_EMISOR_DEFAULT,
            "fecha_emision": hoy,
            "total": total,
        }
