# Revisión de código con IA (modo auditor)

> Objetivo: sumar una "segunda mirada" automática al flujo de desarrollo para detectar riesgos técnicos, de producto y de operación antes del merge.

## 1) Principios del esquema

- La IA revisora **no reemplaza** al autor ni al reviewer humano: los complementa.
- Debe revisar **contra reglas explícitas del repo** (no contra gustos personales).
- Cada revisión debe dejar trazabilidad en un artefacto (`AUDIT_YYYY-MM-DD_<branch>.md`).
- El resultado de auditoría debe ser **accionable**: hallazgo + severidad + evidencia + cambio sugerido.

## 2) Cuándo correr auditoría IA

### Mínimo recomendado

- Cada sesión con cambios importantes (feature, refactor transversal, seguridad, performance).
- Antes de abrir PR o antes de merge a `main`.

### Obligatorio

- Cambios en seguridad, autenticación, autorización, pagos, datos personales y migraciones de DB.
- Cambios de arquitectura o contratos API.

## 3) Modelos y política

### Política A (flexible)

- Se permite cualquier IA revisora (Claude, GPT u otra) siempre que use este checklist.

### Política B (estricta, recomendada para entornos regulados)

- **Toda auditoría debe pasar por al menos una IA revisora** usando el checklist de este documento.
- Si se usan dos IAs distintas (ej: Claude + GPT), el criterio de desempate lo define el reviewer humano.
- Para proyectos con el sub-agente `revisor` configurado, usarlo para revisiones rápidas del día a día y reservar las auditorías formales para pre-deploy.

## 4) Flujo operativo sugerido

1. **Autor implementa** cambio y corre checks locales (`test`, `lint`, `build`).
2. **IA revisora** analiza diff + contexto (archivos de reglas del repo).
3. **Genera auditoría** en `AUDIT_YYYY-MM-DD_<branch>.md`.
4. **Autor aplica remediaciones** y deja notas de resolución.
5. **Re-auditoría rápida** sobre los puntos críticos.
6. **PR** con link al informe y riesgos remanentes explícitos.

## 5) Prompt base para IA revisora

Usar este prompt como plantilla:

```text
Actuá como revisor técnico senior.

Contexto:
- Repositorio: [nombre]
- Objetivo del cambio: [resumen]
- Archivos modificados: [lista]
- Reglas a respetar: CLAUDE.md, CONVENTIONS.md, TESTING.md, SECURITY.md, GIT-WORKFLOW.md, API_STANDARDS.md, DATABASE.md, PERFORMANCE.md, OPERATIONS.md

Tarea:
1) Revisá el diff con foco en:
   - Correctitud funcional
   - Seguridad
   - Performance
   - Mantenibilidad
   - Cobertura de tests
   - Riesgo de regresión
2) Clasificá cada hallazgo por severidad: CRÍTICO / ALTO / MEDIO / BAJO.
3) Para cada hallazgo, devolvé:
   - Qué está mal
   - Evidencia concreta (archivo + bloque)
   - Riesgo si no se corrige
   - Cambio sugerido exacto
4) Si no hay hallazgos, justificá por qué el cambio es seguro para merge.
5) Entregá un informe final listo para guardar como AUDIT_YYYY-MM-DD_<branch>.md.
```

## 6) Formato estándar de informe de auditoría

```markdown
# Auditoría IA — [branch/PR]

## Resumen ejecutivo
- Estado: Aprobado / Aprobado con observaciones / Rechazado
- Hallazgos: X críticos, Y altos, Z medios, N bajos
- Recomendación de merge: Sí / No

## Hallazgos

### [SEVERIDAD] Título corto
- Evidencia: `ruta/archivo` (líneas o bloque)
- Riesgo:
- Recomendación:
- Estado: Pendiente / Corregido / Aceptado por riesgo

## Checklist de cobertura
- Seguridad
- Tests
- Contratos API
- Migraciones
- Observabilidad
- Rollback

## Decisión final
- Responsable:
- Fecha:
- Próximos pasos:
```

## 7) Mejores prácticas (resumen)

- Revisar sobre **diff pequeño y contextualizado** (evitar PR gigantes).
- Pedir a la IA que cite evidencia específica y que priorice por severidad.
- Separar "sugerencias de estilo" de "riesgos reales".
- Exigir que cada hallazgo termine en una decisión: corregido, aceptado o descartado con motivo.
- Mantener historial de auditorías para detectar patrones repetidos.

## 8) Integración con PR

- Adjuntar el `AUDIT_*.md` al PR (link o archivo).
- En `PR_TEMPLATE.md`, incluir:
  - IA revisora usada
  - Resultado de auditoría
  - Hallazgos críticos/altos y su resolución

## 9) Política rápida lista para copiar

```text
Toda sesión con cambios importantes requiere auditoría IA.
Toda auditoría genera un archivo AUDIT_YYYY-MM-DD_<branch>.md.
En modalidad estricta, la auditoría con IA es obligatoria antes de merge.
No se mergea con hallazgos críticos abiertos.
```
