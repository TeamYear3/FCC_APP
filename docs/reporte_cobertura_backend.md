# Reporte de cobertura backend — AUT-BE-06 (Sprint 4)

**Métrica de calidad:** cobertura mínima requerida ≥ 80% sobre los módulos auditados.
**Herramienta:** `coverage.py`.
**Configuración:** [backend/.coveragerc](../backend/.coveragerc).
**Estado de la medición:** pendiente de ejecución contra PostgreSQL. Los valores se completarán con el resultado reproducible; las cifras anteriores no se consideran verificadas.

## Resultado de ejecución

Completar esta tabla después de ejecutar la suite:

| Fecha | Base de datos | Tests ejecutados | Fallos | Cobertura global | Estado del DoD |
|---|---|---:|---:|---:|---|
| Pendiente | PostgreSQL | Pendiente | Pendiente | Pendiente | Pendiente |

## Comando de reproducción

Desde `backend` en Windows:

```powershell
.venv\Scripts\python.exe -m coverage run --source=. manage.py test
.venv\Scripts\python.exe -m coverage report -m
.venv\Scripts\python.exe -m coverage html
```

El reporte HTML se genera en `backend/htmlcov/index.html`. Registrar aquí los resultados que devuelvan los comandos; no completar cifras manualmente.
