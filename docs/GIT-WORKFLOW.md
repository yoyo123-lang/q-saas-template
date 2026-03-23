# Flujo de trabajo con Git

> Branching, commits, pull requests y política de revisión.

## 1) Branching

- `main`: producción.
- `develop` (opcional): integración.
- `feature/*`, `fix/*`, `chore/*`, `docs/*`, `security/*`.

## 2) Commits

Formato:

```text
tipo: descripción corta
```

Tipos válidos: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `security`.

Reglas:

- Un commit = un cambio lógico.
- Nunca commitear secretos.
- Commits deben dejar el repo en estado consistente.

## 3) Pull Requests

- Usar `PR_TEMPLATE.md`.
- Debe incluir: contexto, qué cambia, cómo probar, riesgos y rollback.
- Toda PR requiere al menos una revisión aprobatoria.

## 4) Política de revisión (RACI)

| Actividad | Responsable (R) | Aprobador (A) | Consultado (C) | Informado (I) |
|---|---|---|---|---|
| Cambio funcional | autor PR | tech lead | QA | equipo |
| Cambio seguridad | autor + security champ | security owner | tech lead | equipo |
| Cambio arquitectura | autor + owner módulo | arquitecto/lead | backend/frontend leads | equipo |


## 5) Auditoría con IA (opcional/obligatoria según política)

- Cambios importantes deben pasar por auditoría IA y generar `AUDIT_YYYY-MM-DD_<branch>.md`.
- Si el equipo adopta política estricta, **la auditoría IA es obligatoria** antes de merge.
- No mergear con hallazgos críticos abiertos.
- Registrar en el PR qué hallazgos fueron corregidos y cuáles se aceptan por riesgo.

## 6) Gates antes de merge

- [ ] CI en verde (lint + tests + build + security checks).
- [ ] Documentación actualizada.
- [ ] No hay conflictos con `main`.
- [ ] Riesgo y rollback documentados.
- [ ] Auditoría IA adjunta (si aplica por política).

## 7) Versionado

- SemVer: `MAJOR.MINOR.PATCH`.
- Releases etiquetadas y con changelog.
