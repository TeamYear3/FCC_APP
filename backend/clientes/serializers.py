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

    def validate(self, attrs):
        tipo_doc = attrs.get('tipo_documento', 'DNI')
        dni_cuit = attrs.get('dni_cuit', '').strip()
        
        attrs['dni_cuit'] = dni_cuit

        if tipo_doc == 'DNI':
            if not re.match(r'^\d{7,8}$', dni_cuit):
                raise serializers.ValidationError({
                    'dni_cuit': 'El DNI debe contener entre 7 y 8 dígitos numéricos.'
                })
        elif tipo_doc == 'CUIT':
            if not re.match(r'^\d{2}-\d{8}-\d{1}$', dni_cuit):
                raise serializers.ValidationError({
                    'dni_cuit': 'El CUIT debe tener el formato XX-XXXXXXXX-X.'
                })

        # Validar unicidad preventivamente para dar un error amigable
        if Cliente.objects.filter(dni_cuit=dni_cuit).exists():
            raise serializers.ValidationError({
                'dni_cuit': 'Ya existe un cliente registrado con este DNI/CUIT.'
            })

        return attrs
