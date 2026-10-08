from django.db import migrations


def populate_numero_ot(apps, schema_editor):
    OrdenTrabajo = apps.get_model('ordenes', 'OrdenTrabajo')
    ordenes_sin_numero = OrdenTrabajo.objects.filter(numero_ot__in=['', None]).order_by('creado_en', 'id')
    
    # Obtener el mayor correlativo existente
    ultimas_ordenes = OrdenTrabajo.objects.exclude(numero_ot__in=['', None]).order_by('creado_en', 'id')
    last_num = 0
    for ot in ultimas_ordenes:
        if ot.numero_ot and ot.numero_ot.startswith('OT-'):
            try:
                num = int(ot.numero_ot.replace('OT-', ''))
                if num > last_num:
                    last_num = num
            except (ValueError, TypeError):
                pass
                
    counter = last_num + 1
    for orden in ordenes_sin_numero:
        orden.numero_ot = f'OT-{counter:04d}'
        orden.save(update_fields=['numero_ot'])
        counter += 1


def reverse_populate(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('ordenes', '0012_alter_ordentrabajo_options_and_more'),
    ]

    operations = [
        migrations.RunPython(populate_numero_ot, reverse_populate),
    ]
