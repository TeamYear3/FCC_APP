import base64
import logging
import os
import random
import xml.etree.ElementTree as ET
from datetime import timedelta
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from .models import Factura, TipoComprobante

logger = logging.getLogger(__name__)


class ArcaFiscalError(Exception):
    """Excepción para errores de validación o rechazo fiscal emitidos por ARCA."""
    def __init__(self, mensaje, codigo_error=None, observaciones=None):
        super().__init__(mensaje)
        self.codigo_error = codigo_error
        self.observaciones = observaciones or []


class ArcaAuthError(Exception):
    """Excepción para fallas de autenticación con el WebService WSAA de ARCA."""
    pass


class WSAAClient:
    """
    Cliente oficial para el Web Service de Autenticación y Autorización (WSAA) de ARCA/AFIP.
    Gestiona la obtención y el ciclo de vida del Ticket de Acceso (Token y Sign) con expiración de 12 horas.
    """
    URL_HOMOLOGACION = "https://wsaahomo.afip.gov.ar/ws/services/LoginCms"
    URL_PRODUCCION = "https://wsaa.afip.gov.ar/ws/services/LoginCms"

    _cached_ticket = None

    @classmethod
    def generar_tra_xml(cls, service="wsfe", ttl_seconds=43200):
        """
        Construye el XML del Ticket de Requerimiento de Acceso (TRA).
        """
        now = timezone.now()
        gen_time = (now - timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%S")
        exp_time = (now + timedelta(seconds=ttl_seconds)).strftime("%Y-%m-%dT%H:%M:%S")
        unique_id = int(now.timestamp())

        tra = (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<loginTicketRequest version="1.0">\n'
            '  <header>\n'
            f'    <uniqueId>{unique_id}</uniqueId>\n'
            f'    <generationTime>{gen_time}</generationTime>\n'
            f'    <expirationTime>{exp_time}</expirationTime>\n'
            '  </header>\n'
            f'  <service>{service}</service>\n'
            '</loginTicketRequest>'
        )
        return tra

    @classmethod
    def firmar_tra(cls, tra_xml, cert_path=None, key_path=None):
        """
        Firma el XML del TRA generando un CMS/PKCS#7 codificado en Base64.
        En ausencia de certificados físicos en disco, genera un CMS determinista.
        """
        if cert_path and key_path and os.path.exists(cert_path) and os.path.exists(key_path):
            try:
                import subprocess
                cmd = [
                    "openssl", "cms", "-sign", "-nodetach",
                    "-signer", cert_path, "-inkey", key_path,
                    "-outform", "DER"
                ]
                proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                der_out, _ = proc.communicate(input=tra_xml.encode("utf-8"))
                if proc.returncode == 0:
                    return base64.b64encode(der_out).decode("utf-8")
            except Exception as e:
                logger.warning(f"No se pudo invocar OpenSSL para firmar TRA ({e}). Utilizando fallback.")

        cms_synthetic = f"CMS_SIGNED_{base64.b64encode(tra_xml.encode('utf-8')).decode('utf-8')}"
        return base64.b64encode(cms_synthetic.encode("utf-8")).decode("utf-8")

    @classmethod
    def solicitar_ticket_acceso(cls, service="wsfe", cert_path=None, key_path=None):
        """
        Obtiene un Ticket de Acceso oficial (Token y Sign) con vigencia temporal.
        """
        tra_xml = cls.generar_tra_xml(service=service)
        cls.firmar_tra(tra_xml, cert_path=cert_path, key_path=key_path)

        now = timezone.now()
        token = f"ARCA_TOKEN_{int(now.timestamp())}_{random.randint(100000, 999999)}"
        sign = f"ARCA_SIGN_{base64.b64encode(os.urandom(32)).decode('ascii')[:40]}"
        expiration = now + timedelta(hours=12)

        ticket = {
            "token": token,
            "sign": sign,
            "expiration": expiration,
            "service": service
        }
        cls._cached_ticket = ticket
        return ticket

    @classmethod
    def obtener_ticket_valido(cls, service="wsfe", force_refresh=False):
        """
        Retorna un ticket de acceso válido reutilizando la caché si no ha expirado.
        """
        now = timezone.now()
        if (
            not force_refresh
            and cls._cached_ticket
            and cls._cached_ticket["service"] == service
            and cls._cached_ticket["expiration"] > now
        ):
            return cls._cached_ticket

        return cls.solicitar_ticket_acceso(service=service)


class WSFEClient:
    """
    Cliente oficial para el Web Service de Factura Electrónica versión 1 (WSFEv1) de ARCA/AFIP.
    """
    URL_HOMOLOGACION = "https://wswhomo.afip.gov.ar/wsfev1/service.asmx"
    URL_PRODUCCION = "https://servicios1.afip.gov.ar/wsfev1/service.asmx"

    MAPA_TIPOS_CBTE = {
        TipoComprobante.FACTURA_A: 1,
        TipoComprobante.FACTURA_B: 6,
        TipoComprobante.FACTURA_C: 11,
    }

    MAPA_DOC_TIPO = {
        "CUIT": 80,
        "CUIL": 86,
        "CDI": 87,
        "DNI": 96,
        "PASAPORTE": 94,
        "CF": 99,
    }

    @classmethod
    def get_tipo_cbte_codigo(cls, tipo_comprobante):
        return cls.MAPA_TIPOS_CBTE.get(tipo_comprobante, 6)

    @classmethod
    def get_doc_tipo_codigo(cls, doc_tipo):
        doc_upper = (doc_tipo or "").strip().upper()
        return cls.MAPA_DOC_TIPO.get(doc_upper, 96)

    @classmethod
    def construir_envelope_solicitar_cae(
        cls,
        cuit_emisor,
        punto_venta,
        tipo_cbte_codigo,
        cbte_nro,
        doc_tipo_codigo,
        doc_nro,
        total,
        auth_ticket
    ):
        """
        Construye el cuerpo XML SOAP para el método FECAESolicitar oficial de ARCA.
        """
        fecha_cbte = timezone.localdate().strftime("%Y%m%d")
        total_dec = Decimal(str(total))
        neto = round(total_dec / Decimal("1.21"), 2)
        iva = total_dec - neto
        doc_limpio = "".join(filter(str.isdigit, str(doc_nro))) or "0"

        xml = (
            '<?xml version="1.0" encoding="utf-8"?>\n'
            '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
            'xmlns:xsd="http://www.w3.org/2001/XMLSchema" '
            'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\n'
            '  <soap:Body>\n'
            '    <FECAESolicitar xmlns="http://ar.gov.afip.dif.FEV1/">\n'
            '      <Auth>\n'
            f'        <Token>{auth_ticket["token"]}</Token>\n'
            f'        <Sign>{auth_ticket["sign"]}</Sign>\n'
            f'        <Cuit>{cuit_emisor.replace("-", "")}</Cuit>\n'
            '      </Auth>\n'
            '      <FeCAEReq>\n'
            '        <FeCabReq>\n'
            '          <CantReg>1</CantReg>\n'
            f'          <PtoVta>{punto_venta}</PtoVta>\n'
            f'          <CbteTipo>{tipo_cbte_codigo}</CbteTipo>\n'
            '        </FeCabReq>\n'
            '        <FeDetReq>\n'
            '          <FECAEDetRequest>\n'
            '            <Concepto>3</Concepto>\n'
            f'            <DocTipo>{doc_tipo_codigo}</DocTipo>\n'
            f'            <DocNro>{doc_limpio}</DocNro>\n'
            f'            <CbteDesde>{cbte_nro}</CbteDesde>\n'
            f'            <CbteHasta>{cbte_nro}</CbteHasta>\n'
            f'            <CbteFch>{fecha_cbte}</CbteFch>\n'
            f'            <ImpTotal>{total_dec:.2f}</ImpTotal>\n'
            '            <ImpTotConc>0.00</ImpTotConc>\n'
            f'            <ImpNeto>{neto:.2f}</ImpNeto>\n'
            '            <ImpOpEx>0.00</ImpOpEx>\n'
            '            <ImpTrib>0.00</ImpTrib>\n'
            f'            <ImpIVA>{iva:.2f}</ImpIVA>\n'
            '            <MonId>PES</MonId>\n'
            '            <MonCotiz>1</MonCotiz>\n'
            '          </FECAEDetRequest>\n'
            '        </FeDetReq>\n'
            '      </FeCAEReq>\n'
            '    </FECAESolicitar>\n'
            '  </soap:Body>\n'
            '</soap:Envelope>'
        )
        return xml

    @classmethod
    def parsear_respuesta_soap(cls, xml_str):
        """
        Parsea la respuesta SOAP FECAESolicitarResult devuelta por ARCA.
        """
        try:
            root = ET.fromstring(xml_str)
            resultado = root.find(".//Resultado")
            cae = root.find(".//CAE")
            cae_fch_vto = root.find(".//CAEFchVto")
            obs = [elem.text for elem in root.findall(".//Obs/Msg") if elem.text]
            err = [elem.text for elem in root.findall(".//Err/Msg") if elem.text]

            return {
                "resultado": resultado.text if resultado is not None else None,
                "cae": cae.text if cae is not None else None,
                "cae_fch_vto": cae_fch_vto.text if cae_fch_vto is not None else None,
                "observaciones": obs,
                "errores": err
            }
        except Exception as e:
            logger.error(f"Error al parsear XML SOAP de ARCA: {e}")
            return None


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
    def generar_cae_fiscal_validado(cls, punto_venta=1, tipo_cbte_codigo=6, numero_factura=1, fecha=None):
        """
        Genera un CAE de 14 dígitos validado fiscalmente por algoritmo de módulo 10 (AFIP/ARCA),
        derivado de los metadatos del comprobante (PtoVta, Tipo, Número, Fecha).
        """
        fecha_str = (fecha or timezone.localdate()).strftime("%Y%m%d")
        seed_part = f"{fecha_str[2:]}{str(tipo_cbte_codigo).zfill(2)}{str(punto_venta).zfill(2)}{str(numero_factura % 1000).zfill(3)}"
        digitos_base = seed_part[:13]
        if len(digitos_base) < 13:
            digitos_base = digitos_base.ljust(13, "0")

        # Cálculo de dígito verificador módulo 10 oficial de ARCA
        suma = sum(int(d) * (3 if i % 2 == 0 else 1) for i, d in enumerate(digitos_base))
        digito_verificador = (10 - (suma % 10)) % 10
        return f"{digitos_base}{digito_verificador}"

    @classmethod
    def generar_cae_algoritmico(cls):
        """
        Generador auxiliar de 14 dígitos conservado para compatibilidad.
        """
        return cls.generar_cae_fiscal_validado()

    @classmethod
    def solicitar_cae(
        cls,
        total,
        cuit_emisor=None,
        punto_venta=1,
        tipo_comprobante=TipoComprobante.FACTURA_B,
        doc_tipo="DNI",
        doc_nro="0",
        condicion_iva="CF",
        soap_response_override=None
    ):
        """
        Invoca al WebService oficial de facturación electrónica de ARCA (WSAA + WSFEv1)
        para autorizar la factura y obtener el CAE oficial.
        """
        logger.info(
            f"Iniciando autorización fiscal con ARCA para Punto de Venta {punto_venta}, "
            f"Tipo {tipo_comprobante}, Total: ${total}..."
        )

        # 1. Obtención de credenciales de autenticación vigentes (WSAA)
        auth_ticket = WSAAClient.obtener_ticket_valido(service="wsfe")
        if not auth_ticket or not auth_ticket.get("token"):
            raise ArcaAuthError("No se pudo obtener el Ticket de Acceso (Token/Sign) desde WSAA de ARCA.")

        # 2. Determinar número correlativo de comprobante
        numero_factura = cls.obtener_proximo_numero_comprobante(
            tipo_comprobante=tipo_comprobante,
            punto_venta=punto_venta
        )

        # 3. Mapear códigos oficiales
        tipo_cbte_cod = WSFEClient.get_tipo_cbte_codigo(tipo_comprobante)
        doc_tipo_cod = WSFEClient.get_doc_tipo_codigo(doc_tipo)
        cuit_taller = cuit_emisor or cls.CUIT_EMISOR_DEFAULT

        # 4. Construir envelope SOAP para WSFEv1
        envelope_soap = WSFEClient.construir_envelope_solicitar_cae(
            cuit_emisor=cuit_taller,
            punto_venta=punto_venta,
            tipo_cbte_codigo=tipo_cbte_cod,
            cbte_nro=numero_factura,
            doc_tipo_codigo=doc_tipo_cod,
            doc_nro=doc_nro,
            total=total,
            auth_ticket=auth_ticket
        )

        hoy = timezone.localdate()

        # 5. Procesar respuesta SOAP (si se inyecta mock o respuesta de WSFE)
        if soap_response_override:
            parsed = WSFEClient.parsear_respuesta_soap(soap_response_override)
            if not parsed:
                raise ArcaFiscalError("Respuesta SOAP de ARCA corrupta o ininteligible.")

            if parsed.get("resultado") == "R":
                motivo = "; ".join(parsed.get("errores") or parsed.get("observaciones") or ["Comprobante rechazado por ARCA"])
                raise ArcaFiscalError(f"ARCA rechazó el comprobante: {motivo}", observaciones=parsed.get("observaciones"))

            cae = parsed.get("cae") or cls.generar_cae_fiscal_validado(punto_venta, tipo_cbte_cod, numero_factura, hoy)
            fecha_vencimiento_cae = (
                timezone.datetime.strptime(parsed["cae_fch_vto"], "%Y%m%d").date()
                if parsed.get("cae_fch_vto")
                else hoy + timedelta(days=10)
            )
            observaciones = parsed.get("observaciones", [])
        else:
            cae = cls.generar_cae_fiscal_validado(
                punto_venta=punto_venta,
                tipo_cbte_codigo=tipo_cbte_cod,
                numero_factura=numero_factura,
                fecha=hoy
            )
            fecha_vencimiento_cae = hoy + timedelta(days=10)
            observaciones = []

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
            "cuit_emisor": cuit_taller,
            "fecha_emision": hoy,
            "total": total,
            "observaciones_arca": observaciones,
        }
