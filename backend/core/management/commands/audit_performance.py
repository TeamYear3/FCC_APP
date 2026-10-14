import json
import re
import time
from collections import Counter
from django.core.management.base import BaseCommand
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient
from usuarios.models import Usuario
from clientes.models import Cliente
from vehiculos.models import Vehiculo
from ordenes.models import OrdenTrabajo, ItemPresupuesto, TipoItem
from turnos.models import Turno


def normalize_sql(query_sql: str) -> str:
    """Normaliza una consulta SQL sustituyendo literales y valores para identificar patrones duplicados."""
    normalized = re.sub(r"\'[^\']*\'", "'?'", query_sql)
    normalized = re.sub(r"\b\d+\b", "?", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


class Command(BaseCommand):
    help = "Audita el rendimiento y cuenta consultas SQL ejecutadas por los endpoints REST clave para establecer la línea base."

    def add_arguments(self, parser):
        parser.add_argument(
            "--iterations",
            type=int,
            default=3,
            help="Cantidad de iteraciones por endpoint para promediar tiempos de respuesta (por defecto: 3).",
        )
        parser.add_argument(
            "--seed-volume",
            action="store_true",
            help="Genera datos semilla representativos para observar el impacto de consultas N+1.",
        )
        parser.add_argument(
            "--output",
            type=str,
            default="",
            help="Ruta de archivo para guardar el reporte en formato Markdown o JSON.",
        )
        parser.add_argument(
            "--format",
            choices=["table", "markdown", "json"],
            default="table",
            help="Formato de salida por consola (table, markdown, json).",
        )

    def handle(self, *args, **options):
        iterations = options["iterations"]
        seed_volume = options["seed_volume"]
        output_path = options["output"]
        output_format = options["format"]

        self.stdout.write(self.style.MIGRATE_HEADING("=== FCC_APP: Auditoría de Línea Base de Rendimiento y Queries SQL ==="))

        user = self._get_or_create_admin()

        if seed_volume:
            self._seed_benchmark_data(user)

        client = APIClient()
        client.force_authenticate(user=user)

        endpoints = self._resolve_endpoints()

        results = []

        for item in endpoints:
            name = item["name"]
            url = item["url"]
            method = item.get("method", "GET")

            self.stdout.write(f"Auditory endpoint: {method} {url} ({name})...")

            # 1. Medir queries y capturar trazas en una ejecución aislada
            with CaptureQueriesContext(connection) as ctx:
                start_time = time.perf_counter()
                if method == "GET":
                    response = client.get(url)
                elif method == "POST":
                    response = client.post(url, data=item.get("payload", {}), format="json")
                else:
                    response = client.get(url)
                duration_first = (time.perf_counter() - start_time) * 1000.0

            status_code = response.status_code
            queries = list(ctx.captured_queries)
            query_count = len(queries)

            # Normalizar y detectar duplicados
            normalized_queries = [normalize_sql(q["sql"]) for q in queries]
            counts = Counter(normalized_queries)
            duplicate_patterns = {sql: count for sql, count in counts.items() if count > 1}
            total_duplicate_queries = sum(count - 1 for count in duplicate_patterns.values())

            # 2. Medir tiempo promedio en N iteraciones
            durations = [duration_first]
            for _ in range(iterations - 1):
                t0 = time.perf_counter()
                if method == "GET":
                    client.get(url)
                elif method == "POST":
                    client.post(url, data=item.get("payload", {}), format="json")
                durations.append((time.perf_counter() - t0) * 1000.0)

            avg_duration_ms = round(sum(durations) / len(durations), 2)

            sql_time_ms = round(sum(float(q.get("time", 0.0)) for q in queries) * 1000.0, 2)

            res_entry = {
                "name": name,
                "url": url,
                "method": method,
                "status_code": status_code,
                "query_count": query_count,
                "duplicate_queries": total_duplicate_queries,
                "duplicate_patterns_count": len(duplicate_patterns),
                "has_n_plus_one": total_duplicate_queries > 0,
                "avg_duration_ms": avg_duration_ms,
                "sql_time_ms": sql_time_ms,
                "duplicate_details": [
                    {"occurrences": count, "pattern": sql[:160] + ("..." if len(sql) > 160 else "")}
                    for sql, count in duplicate_patterns.items()
                ],
            }
            results.append(res_entry)

        # Renderizar salida
        if output_format == "json":
            self.stdout.write(json.dumps(results, indent=2, ensure_ascii=False))
        elif output_format == "markdown":
            md_content = self._render_markdown(results)
            self.stdout.write(md_content)
        else:
            self._render_table(results)

        if output_path:
            with open(output_path, "w", encoding="utf-8") as f:
                if output_path.endswith(".json"):
                    json.dump(results, f, indent=2, ensure_ascii=False)
                else:
                    f.write(self._render_markdown(results))
            self.stdout.write(self.style.SUCCESS(f"\n[OK] Reporte exportado exitosamente a: {output_path}"))

    def _get_or_create_admin(self):
        admin = Usuario.objects.filter(is_superuser=True, rol="admin").first()
        if not admin:
            admin = Usuario.objects.filter(rol="admin").first()
        if not admin:
            admin = Usuario.objects.create(
                email="admin_benchmark@fccapp.com",
                nombre="Admin Benchmark",
                rol="admin",
                is_active=True,
                is_staff=True,
                is_superuser=True,
            )
            admin.set_password("Benchmark123!")
            admin.save()
        return admin

    def _resolve_endpoints(self):
        endpoints = [
            {"name": "Listado de Clientes", "url": "/api/clientes/", "method": "GET"},
            {"name": "Listado de Vehículos", "url": "/api/vehiculos/", "method": "GET"},
            {"name": "Listado de Órdenes", "url": "/api/ordenes/", "method": "GET"},
            {"name": "Listado de Facturas", "url": "/api/facturas/", "method": "GET"},
            {"name": "Listado de Turnos", "url": "/api/turnos/", "method": "GET"},
        ]

        # Agregar detalle de orden si existe alguna orden
        primera_ot = OrdenTrabajo.objects.first()
        if primera_ot:
            endpoints.append({
                "name": "Detalle de Orden de Trabajo",
                "url": f"/api/ordenes/{primera_ot.id}/",
                "method": "GET",
            })
            endpoints.append({
                "name": "Items Presupuesto de Orden",
                "url": f"/api/ordenes/{primera_ot.id}/items/",
                "method": "GET",
            })

        primer_cliente = Cliente.objects.first()
        if primer_cliente:
            endpoints.append({
                "name": "Detalle de Cliente",
                "url": f"/api/clientes/{primer_cliente.id}/",
                "method": "GET",
            })

        primer_vehiculo = Vehiculo.objects.first()
        if primer_vehiculo:
            endpoints.append({
                "name": "Detalle de Vehículo e Historial",
                "url": f"/api/vehiculos/{primer_vehiculo.id}/historial/",
                "method": "GET",
            })

        return endpoints

    def _seed_benchmark_data(self, user):
        self.stdout.write(self.style.WARNING("Generando datos semilla de benchmark (volumen controlado)..."))
        cliente, _ = Cliente.objects.get_or_create(
            dni_cuit="20359998881",
            defaults={"nombre": "Cliente Empresa", "apellido": "Benchmark SA", "email": "empresa@benchmark.com", "telefono": "1198765432"},
        )
        vehiculo, _ = Vehiculo.objects.get_or_create(
            patente="BEN999",
            defaults={
                "cliente": cliente,
                "marca": "Toyota",
                "modelo": "Hilux Benchmark",
                "anio": 2023,
                "kilometraje": 25000,
            },
        )
        ot, _ = OrdenTrabajo.objects.get_or_create(
            vehiculo=vehiculo,
            defaults={
                "tecnico": user if user.rol == "tecnico" else None,
                "descripcion_problema": "Falla testigo check engine y ruido tren delantero para benchmark",
                "estado": "ingresado",
            },
        )
        if not ot.items_presupuesto.exists():
            ItemPresupuesto.objects.create(
                orden_trabajo=ot,
                tipo=TipoItem.MANO_DE_OBRA,
                descripcion="Diagnóstico computarizado OBD2",
                cantidad=1,
                precio_unitario=55000.0,
                completado=True,
            )
            ItemPresupuesto.objects.create(
                orden_trabajo=ot,
                tipo=TipoItem.MANO_DE_OBRA,
                descripcion="Alineación y balanceo computarizado",
                cantidad=1,
                precio_unitario=38000.0,
                completado=False,
            )
            ItemPresupuesto.objects.create(
                orden_trabajo=ot,
                tipo=TipoItem.REPUESTO,
                descripcion="Filtro de combustible original",
                cantidad=1,
                precio_unitario=42000.0,
                completado=False,
            )
            ItemPresupuesto.objects.create(
                orden_trabajo=ot,
                tipo=TipoItem.REPUESTO,
                descripcion="Pastillas de freno delanteras cerámicas",
                cantidad=2,
                precio_unitario=65000.0,
                completado=False,
            )
        self.stdout.write(self.style.SUCCESS("[OK] Datos semilla generados exitosamente."))

    def _render_table(self, results):
        self.stdout.write("\n" + "=" * 105)
        header = f"{'Endpoint':<34} | {'Método':<6} | {'HTTP':<4} | {'Queries SQL':<11} | {'Duplicadas':<10} | {'Tiempo Avg':<11} | {'Alerta N+1'}"
        self.stdout.write(header)
        self.stdout.write("-" * 105)
        for r in results:
            alert = self.style.ERROR("SI (N+1)") if r["has_n_plus_one"] else self.style.SUCCESS("NO (Optimo)")
            avg_str = f"{r['avg_duration_ms']} ms"
            line = (
                f"{r['name'][:34]:<34} | "
                f"{r['method']:<6} | "
                f"{r['status_code']:<4} | "
                f"{r['query_count']:<11} | "
                f"{r['duplicate_queries']:<10} | "
                f"{avg_str:<11} | "
                f"{alert}"
            )
            self.stdout.write(line)
        self.stdout.write("=" * 105 + "\n")

        # Imprimir detalles de duplicados detectados
        has_duplicates = any(r["has_n_plus_one"] for r in results)
        if has_duplicates:
            self.stdout.write(self.style.WARNING("Detalle de Consultas SQL Repetidas / Patrones N+1 Identificados:"))
            for r in results:
                if r["has_n_plus_one"]:
                    self.stdout.write(self.style.NOTICE(f"\n--> {r['name']} ({r['url']}): {r['duplicate_queries']} consultas repetidas"))
                    for pat in r["duplicate_details"]:
                        self.stdout.write(f"    [{pat['occurrences']}x] {pat['pattern']}")
        else:
            self.stdout.write(self.style.SUCCESS("No se detectaron consultas SQL duplicadas en los endpoints analizados."))

    def _render_markdown(self, results) -> str:
        lines = [
            "# Reporte de Línea Base de Rendimiento Backend: Consultas SQL y Tiempos de Respuesta",
            "",
            "> Medición automatizada generada mediante el comando `python manage.py audit_performance`.",
            "",
            "| Endpoint | Método | Estado HTTP | Total Queries SQL | Consultas Repetidas | Tiempo Respuesta (ms) | Diagnóstico N+1 |",
            "| :--- | :---: | :---: | :---: | :---: | :---: | :---: |",
        ]
        for r in results:
            diag = "[ALERTA N+1]" if r["has_n_plus_one"] else "[OPTIMO]"
            lines.append(
                f"| `{r['url']}` ({r['name']}) | `{r['method']}` | `{r['status_code']}` | **{r['query_count']}** | {r['duplicate_queries']} | {r['avg_duration_ms']} ms | {diag} |"
            )

        lines.append("")
        lines.append("## Detalle de Cuellos de Botella y Patrones SQL Duplicados")
        lines.append("")
        for r in results:
            if r["has_n_plus_one"]:
                lines.append(f"### {r['name']} (`{r['url']}`)")
                lines.append(f"- **Queries totales:** {r['query_count']}")
                lines.append(f"- **Consultas repetidas:** {r['duplicate_queries']}")
                lines.append("- **Patrones detectados:**")
                for pat in r["duplicate_details"]:
                    lines.append(f"  * `{pat['occurrences']}x`: `{pat['pattern']}`")
                lines.append("")

        return "\n".join(lines)
