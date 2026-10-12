# Generated for TK162 - Migracion de datos para sanitizar chasis vacios historicos a NULL

from django.db import migrations


def convertir_chasis_vacio_a_null(apps, schema_editor):
    Vehiculo = apps.get_model('vehiculos', 'Vehiculo')
    # Actualizar todos los vehiculos que tengan numero_chasis = '' a None (NULL en SQL)
    Vehiculo.objects.filter(numero_chasis='').update(numero_chasis=None)


def revertir_chasis_null_a_vacio(apps, schema_editor):
    # Funcion inversa declarada para asegurar la reversibilidad de la migracion
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('vehiculos', '0005_vehiculo_tipo_motor'),
    ]

    operations = [
        migrations.RunPython(convertir_chasis_vacio_a_null, revertir_chasis_null_a_vacio),
    ]
