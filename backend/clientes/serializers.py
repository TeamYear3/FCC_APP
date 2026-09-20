import re
from rest_framework import serializers
from .models import Cliente

class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = [
            'id',
            'usuario',
            'nombre',
            'apellido',
            'tipo_documento',
            'dni_cuit',
            'condicion_iva',
            'telefono',
            'domicilio',
            'creado_en',
            'actualizado_en'
        ]
        read_only_fields = ['id', 'creado_en', 'actualizado_en']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Si se está actualizando (la instancia ya existe), hacemos inmutables DNI/CUIT
        if self.instance is not None:
            self.fields['tipo_documento'].read_only = True
            self.fields['dni_cuit'].read_only = True

    def validate(self, attrs):
        # La validación de DNI/CUIT y su unicidad solo aplica en la creación.
        # En la actualización estos campos son de solo lectura y son descartados por DRF.
        if self.instance is None:
            tipo_doc = attrs.get('tipo_documento', 'DNI')
            dni_cuit_raw = attrs.get('dni_cuit', '').strip()

            if tipo_doc == 'DNI':
                dni_cuit_limpio = re.sub(r'\D', '', dni_cuit_raw)
                if not re.match(r'^\d{7,8}$', dni_cuit_limpio):
                    raise serializers.ValidationError({
                        'dni_cuit': 'El DNI debe contener entre 7 y 8 dígitos numéricos.'
                    })
                attrs['dni_cuit'] = dni_cuit_limpio
            elif tipo_doc == 'CUIT':
                dni_cuit_limpio = re.sub(r'\D', '', dni_cuit_raw)
                if len(dni_cuit_limpio) != 11:
                    raise serializers.ValidationError({
                        'dni_cuit': 'El CUIT debe contener 11 dígitos numéricos.'
                    })
                cuit_formateado = f"{dni_cuit_limpio[:2]}-{dni_cuit_limpio[2:10]}-{dni_cuit_limpio[10]}"
                attrs['dni_cuit'] = cuit_formateado

            # Validar unicidad preventivamente para dar un error amigable
            if Cliente.objects.filter(dni_cuit=attrs['dni_cuit']).exists():
                raise serializers.ValidationError({
                    'dni_cuit': 'Ya existe un cliente registrado con este DNI/CUIT.'
                })

        return attrs
