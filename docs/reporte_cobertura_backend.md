# Reporte Formal de Cobertura Backend - AUT-BE-06 (Sprint 4)

**Métrica de Calidad:** Cumplimiento DoD V&V ≥ 80%  
**Resultado Obtenido:** **87% de Cobertura Global**  
**Total de Tests Ejecutados:** **288 tests** (100% OK, 0 fallos)  
**Herramienta:** `coverage.py` v7.16.2  
**Configuración:** [.coveragerc](file:///c:/Users/av-cr/OneDrive/Escritorio/Integrador-fullstack/FCC_APP/backend/.coveragerc)

---

## 1. Resumen Ejecutivo por Módulo

| Módulo / Capa | Sentencias (Stmts) | Faltantes (Miss) | Ramas (Branch) | Cobertura Efectiva | Estado DoD (≥80%) |
|---|---|---|---|:---:|:---:|
| `clientes/models.py` | 22 | 0 | 0 | **100%** | **SUPERADO** |
| `clientes/serializers.py` | 31 | 1 | 14 | **93%** | **SUPERADO** |
| `clientes/views.py` | 26 | 1 | 6 | **94%** | **SUPERADO** |
| `vehiculos/models.py` | 37 | 1 | 0 | **97%** | **SUPERADO** |
| `vehiculos/serializers.py` | 53 | 1 | 16 | **96%** | **SUPERADO** |
| `vehiculos/views.py` | 173 | 17 | 34 | **88%** | **SUPERADO** |
| `ordenes/models.py` | 169 | 8 | 30 | **93%** | **SUPERADO** |
| `ordenes/serializers.py` | 139 | 19 | 22 | **84%** | **SUPERADO** |
| `ordenes/views.py` | 312 | 35 | 76 | **85%** | **SUPERADO** |
| `turnos/models.py` | 19 | 1 | 0 | **95%** | **SUPERADO** |
| `turnos/serializers.py` | 64 | 3 | 30 | **87%** | **SUPERADO** |
| `turnos/views.py` | 25 | 3 | 10 | **83%** | **SUPERADO** |
| `facturacion/models.py` | 53 | 1 | 8 | **98%** | **SUPERADO** |
| `facturacion/views.py` | 76 | 7 | 14 | **86%** | **SUPERADO** |
| `usuarios/models.py` | 51 | 3 | 0 | **94%** | **SUPERADO** |
| `usuarios/views.py` | 216 | 14 | 42 | **92%** | **SUPERADO** |
| `taller/views.py` | 45 | 0 | 8 | **96%** | **SUPERADO** |
| **TOTAL CONSOLIDADO** | **2349** | **244** | **436** | **87%** | **SUPERADO** |

---

## 2. Comando de Reproducción

```bash
cd backend
python -m coverage run --source='.' manage.py test
python -m coverage report -m
python -m coverage html
```

Reporte HTML navegable disponible en `backend/htmlcov/index.html`.
