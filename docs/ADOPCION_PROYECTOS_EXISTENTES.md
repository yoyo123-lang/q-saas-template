# Adopción del template en proyectos existentes

> Guía completa para aplicar este sistema a un proyecto que ya tiene código.
> Para ejecutar la adopción de forma guiada, usá `/project:onboard`.
> Si el proyecto es nuevo, seguí el flujo base del `README.md`.

---

## Cuándo usar esta guía

Usá esta guía si el proyecto ya tiene código en producción y detectás uno o más síntomas:

- Bugs recurrentes en módulos críticos.
- Deploys con rollback frecuente.
- Cambios simples que tardan demasiado por miedo a romper.
- Falta de trazabilidad (no se sabe por qué se decidió algo).
- Performance degradada al crecer usuarios/datos.
- Incidentes de seguridad por prácticas inconsistentes.

---

## Principios de adopción

1. **Documentar antes de refactorizar**: primero explícito, después correcto.
2. **No frenar el negocio**: adoptar por capas y con hitos cortos.
3. **Priorizar por riesgo**: seguridad, datos, pagos y disponibilidad primero.
4. **Medir mejora**: cada fase debe tener métricas de entrada/salida.
5. **Evitar "big bang"**: cambios pequeños, reversibles y con rollback.

---

## Fase 1 — Setup (copiar archivos del template)

### Qué copiar

```
template/
├── docs/                    ← Copiar TODA la carpeta
│   ├── roles/               ← Sistema de revisión
│   ├── decisions/           ← Template para ADRs
│   ├── playbooks/           ← Playbooks de integraciones
│   └── [todos los .md]      ← Completar con datos reales
├── .claude/
│   ├── agents/              ← Copiar TODA la carpeta
│   └── commands/            ← Copiar TODA la carpeta
├── .github/workflows/       ← Copiar y ADAPTAR al stack (ver abajo)
└── CLAUDE.md                ← MERGE, no reemplazar (ver abajo)
```

### Cómo manejar CLAUDE.md

**Si tu proyecto NO tiene CLAUDE.md:** Copiar directamente el del template.

**Si tu proyecto YA tiene CLAUDE.md:** No reemplazarlo. En cambio, pedile a Claude:

```
Tengo un CLAUDE.md existente en mi proyecto y el CLAUDE.md del template que acabo
de copiar en docs/_CLAUDE_TEMPLATE.md. Necesito que hagas un merge inteligente:
- Mantené las reglas específicas de mi proyecto
- Incorporá las secciones del template que me falten
- No dupliques contenido
- Priorizá mis reglas si hay conflicto
```

### Cómo manejar ARCHITECTURE.md

El template trae dos versiones:
- `docs/ARCHITECTURE.md` — completado con datos del template (sirve como **ejemplo de referencia**)
- `docs/ARCHITECTURE_TEMPLATE.md` — versión vacía con placeholders `[completar]`

**Para tu proyecto:** Renombrá `ARCHITECTURE_TEMPLATE.md` a `ARCHITECTURE.md` (reemplazando el del template) y completalo con datos reales. Podés consultar el `ARCHITECTURE.md` original del template como ejemplo del formato esperado.

### Cómo adaptar los workflows de CI/CD

Los workflows en `.github/workflows/` incluyen un mecanismo clave: **cuando un CI falla en un PR, postea los logs de error como comentario en el PR**. Esto permite que Claude Code diagnostique errores de CI sin salir de la conversación.

**Si tu proyecto ya tiene workflows:** No los reemplaces. Agregá el step de "failure logs to PR" a cada job existente. El patrón es:

```yaml
# Agregar al final de cada job, después de todos los steps
- name: Post failure logs to PR
  if: failure() && github.event_name == 'pull_request'
  uses: actions/github-script@v7
  with:
    script: |
      // Descargar logs del job que falló
      const jobs = await github.rest.actions.listJobsForWorkflowRun({
        owner: context.repo.owner, repo: context.repo.repo,
        run_id: context.runId, filter: 'latest'
      });
      const failedJob = jobs.data.jobs.find(j => j.conclusion === 'failure');
      if (!failedJob) return;
      const logs = await github.rest.actions.downloadJobLogsForWorkflowRun({
        owner: context.repo.owner, repo: context.repo.repo,
        job_id: failedJob.id
      });
      const lines = logs.data.split('\n');
      const tail = lines.slice(-80).join('\n');
      await github.rest.issues.createComment({
        owner: context.repo.owner, repo: context.repo.repo,
        issue_number: context.issue.number,
        body: `## ❌ CI failed\n\`\`\`\n${tail}\n\`\`\`\n[Full logs](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})`
      });
```

**Si tu proyecto NO tiene workflows:** Copiá los del template y adaptá los comandos de build/test/lint a tu stack. Los comandos del template son para Node.js (`npm run build`, `npx vitest`, etc.) — reemplazalos por los equivalentes de tu lenguaje.

**Prerequisito:** El repositorio necesita permisos de escritura en PRs. En Settings > Actions > General > Workflow permissions, habilitá "Read and write permissions".

### Qué NO copiar si ya existe en tu proyecto
- `.gitignore` — mergear a mano si hace falta
- `package.json`, `requirements.txt`, etc. — nunca sobreescribir
- Cualquier archivo de configuración del framework

---

## Fase 2 — Normalización de documentación (sin tocar lógica)

Esta fase crea un mapa común para dejar de operar "de memoria".

### 2.1 Completar ARCHITECTURE.md

Si seguiste la Fase 1, ya tenés `docs/ARCHITECTURE.md` con placeholders `[completar]`. Pedile a Claude:

```
Recorré este proyecto y completá docs/ARCHITECTURE.md con la información real:
stack, estructura de carpetas, módulos, dependencias, y cómo se levanta.
Reemplazá todos los [completar] con datos concretos.
```

Revisá el resultado — Claude va a inferir la mayoría pero puede equivocarse en decisiones de diseño que no son obvias desde el código.

### 2.2 Completar documentos mínimos obligatorios

Rellenar estos archivos con datos reales del proyecto (no placeholders):

1. `ARCHITECTURE.md` — módulos actuales, dependencias, límites y decisiones pendientes.
2. `API_STANDARDS.md` — estado actual del contrato + brechas contra estándar.
3. `DATABASE.md` — modelo vigente, migraciones, índices críticos, política de backups.
4. `TESTING.md` — cobertura real por capa, estrategia objetivo y brechas.
5. `SECURITY.md` — estado de auth/autz, secretos, hardening y auditoría.
6. `DEPLOYMENT.md` + `OPERATIONS.md` — proceso real de despliegue, rollback, monitoreo.

### 2.3 Diagnóstico de brechas

Crear una matriz `GAP_ANALYSIS.md`:

| Estándar esperado | Estado actual | Riesgo | Esfuerzo | Plan de cierre |
|---|---|---|---|---|
| (qué pide la plantilla) | (cómo está hoy) | alto/medio/bajo | S/M/L | (sprint/hito) |

### 2.4 Gobernanza mínima antes de tocar código

- PR template obligatorio en cada cambio.
- Checklist de auditoría IA en cambios sensibles.
- Regla de "no merge sin checks básicos" (tests + lint + build).
- Definición de severidad de incidentes y responsable on-call.

**Salida esperada de Fase 2:** el equipo comparte un mismo contrato operativo y técnico.

---

## Fase 3 — Descubrimiento de modelo de negocio

> **Solo si tu proyecto es un SaaS, marketplace, o tiene lógica de negocio compleja.**
> Para una landing page o web simple, salteá esta fase.

```
/project:descubrimiento
```

Claude recorre el código buscando auth, billing, planes, roles, entidades e integraciones. Genera `docs/BUSINESS_MODEL.md` con lo que pudo inferir y te hace preguntas para completar el resto.

Esto activa los roles de **Capa 2** (Business Logic Reviewer + Data/Analytics Reviewer).

---

## Fase 4 — Normalización de código (por dominio, incremental)

Con la documentación alineada, se corrige el código por lotes priorizados.

### Orden de prioridad

1. Seguridad y compliance.
2. Integridad de datos y migraciones riesgosas.
3. Módulos con más incidentes/retrabajo.
4. Cuellos de performance de alto impacto.
5. Estandarización de estilo y consistencia general.

### Estrategia de ejecución (cada lote)

Para cada dominio/módulo:

1. Definir alcance acotado (qué entra / qué no).
2. Agregar pruebas de caracterización (capturan comportamiento actual).
3. Refactorizar de forma segura (pasos pequeños).
4. Verificar contrato API/DB/no funcionales.
5. Medir métricas antes/después.
6. Documentar decisiones en ADR si aplica.

Usar `/project:cambio` o `/project:cambio-grande` según el tamaño del lote.

### Definition of Done por módulo

- Sin regresiones en tests críticos.
- Sin hallazgos críticos/altos de seguridad abiertos.
- SLO/SLA acordados sin degradación.
- Runbook operativo actualizado.
- Brecha correspondiente en `GAP_ANALYSIS.md` marcada como cerrada.

---

## Fase 5 — Activar roles de revisión y establecer rutina

### Qué roles activar según tu proyecto

| Tu proyecto es... | Roles que aplican |
|---|---|
| Web simple / landing | Capa 1: los 7 roles horizontales |
| SaaS con billing | Capa 1 + Business Logic Reviewer + Data/Analytics Reviewer |
| SaaS con API pública | Capa 1 + Business Logic + Data/Analytics |
| Marketplace | Capa 1 + Business Logic + Data/Analytics |

### Rutina del día a día

1. **Iniciar sesión:** `/project:sesion`
2. **Desarrollar** usando `/project:cambio` o `/project:cambio-grande`
3. **Antes de deploy:** `/project:deploy` (o `/project:revision` para auditoría completa)
4. **Cerrar sesión:** `/project:cierre`

### Cuándo volver a correr el descubrimiento

Volver a correr `/project:descubrimiento` cuando:
- Se agrega un plan nuevo o se cambian los precios
- Se cambia la pasarela de pago
- Se agregan roles de usuario nuevos
- Se cambia una regla de negocio importante
- Se agrega una integración crítica

---

## Plan sugerido de 30/60/90 días

### Día 0-30 (alineación)

- Completar Fases 1, 2 y 3.
- Cerrar quick wins de alto riesgo y bajo esfuerzo.
- Definir roadmap trimestral de normalización.

### Día 31-60 (estabilización)

- Ejecutar 2 a 4 lotes técnicos en módulos críticos (Fase 4).
- Reducir incidentes repetitivos.
- Endurecer pipelines (checks y gates obligatorios).

### Día 61-90 (escalamiento)

- Consolidar métricas de calidad.
- Replicar patrón de adopción en todo el sistema.
- Formalizar governance continuo (auditorías periódicas).

---

## KPIs mínimos para saber si funciona

- Frecuencia de deploy sin rollback.
- Lead time de cambio (PR abierto a producción).
- Tasa de fallas en producción.
- MTTR (tiempo medio de recuperación).
- Cobertura de tests en módulos críticos.
- Hallazgos de seguridad por severidad.

> Recomendación: fijar línea base al inicio y revisar semanal/quincenalmente.

---

## Anti-patrones a evitar

- "Primero refactorizamos todo y después documentamos".
- Migración masiva sin feature flags ni rollback.
- Estandarizar nombres sin resolver riesgos reales.
- Métricas ambiguas o imposibles de medir.
- Hacer una vez y no mantener (sin dueños ni cadencia).

---

## Checklist de adopción

- [ ] Archivos del template copiados (Fase 1)
- [ ] CLAUDE.md mergeado (si ya existía uno)
- [ ] `docs/ARCHITECTURE.md` completado con datos reales
- [ ] Documentos mínimos completados (API, DB, Testing, Security, Deploy, Ops)
- [ ] `GAP_ANALYSIS.md` creado con priorización por riesgo/esfuerzo
- [ ] `docs/BUSINESS_MODEL.md` completado (si aplica)
- [ ] Pipeline con gates mínimos (test/lint/build)
- [ ] Workflows de CI con failure logs to PR configurados
- [ ] Primera revisión con roles ejecutada
- [ ] Roadmap 30/60/90 acordado
- [ ] Rutina de sesión/cierre establecida

---

*Adoptar estándares no es reescribir el proyecto. Es ponerle nombre a lo que ya existe para poder mejorarlo sin romperlo.*
