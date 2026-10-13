# Reporte de cobertura backend — AUT-BE-06 (Sprint 4)

**Métrica de calidad:** cobertura mínima requerida ≥ 80% sobre los módulos auditados.
**Herramienta:** `coverage.py`.
**Configuración:** [backend/.coveragerc](../backend/.coveragerc).
**Base de datos:** PostgreSQL 16; la ejecución no usó SQLite.

## Resultado de ejecución

| Fecha | Base de datos | Tests ejecutados | Fallos | Cobertura global | Estado del DoD |
|---|---|---:|---:|---:|---|
| 2026-10-12 | PostgreSQL 16 | 239 | 0 | 87% | Superado |

La cobertura se generó con `coverage.py` desde la suite completa del backend. El informe global superó el umbral de 80% usando `--fail-under=80`.

## Comando de reproducción

Desde `backend`, con PostgreSQL disponible y las variables `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER` y `POSTGRES_PASSWORD` configuradas:

```powershell
.venv\Scripts\python.exe -m coverage run --source=. manage.py test --settings=config.settings.test
.venv\Scripts\python.exe -m coverage report -m --fail-under=80
.venv\Scripts\python.exe -m coverage html
```

El reporte HTML se genera en `backend/htmlcov/index.html`. Las cifras de esta tabla provienen de la ejecución indicada arriba.
