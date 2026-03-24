# Adopción del template en proyecto existente

> Skill para adoptar este sistema de documentación y estándares en un proyecto que ya tiene código.
> Invocar con: `/project:onboard`
> No toques código ni archivos del proyecto hasta completar el diagnóstico y tener aprobación.

## Paso 1: Detectar el stack

Leé el proyecto en silencio para identificar:

- Lenguaje y framework (package.json, requirements.txt, go.mod, Cargo.toml, etc.)
- Base de datos y ORM (si hay)
- Herramientas de build, lint y test
- CI/CD (GitHub Actions, etc.)
- Hosting/deploy (Vercel, Railway, Docker, etc.)
- **Supabase**: buscar `@supabase/supabase-js` en dependencias, `supabase` en config, o carpeta `supabase/`

Resumí en formato compacto:

```
STACK DETECTADO:
- Lenguaje: [lenguaje + versión si se puede inferir]
- Framework: [nombre + versión]
- DB: [motor + ORM] o "sin DB"
- Supabase: [sí/no]
- Build: [comando]
- Lint: [comando] o "no configurado"
- Test: [comando + framework] o "no configurado"
- Deploy: [plataforma] o "no detectado"
```

## Paso 2: Verificar que el proyecto compila

Corré el build del proyecto:

```
1. Instalar dependencias (npm install, pip install, etc.)
2. Correr build (npm run build o equivalente)
3. Correr lint (si existe)
4. Correr tests (si existen)
```

Reportá el estado:

```
ESTADO DEL PROYECTO:
- Build: ✅/❌ [detalle si falla]
- Lint: ✅/❌/⚠️ sin configurar
- Tests: ✅/❌/⚠️ sin configurar [cobertura si se puede medir]
```

Si el build falla, avisá al usuario. No se puede adoptar estándares sobre código que no compila.

## Paso 3: Diagnóstico rápido

Usá sub-agentes `explorador` en paralelo para evaluar:

1. **Estructura**: ¿Sigue algún patrón reconocible? ¿Hay separación de capas?
2. **Documentación**: ¿Hay README? ¿Hay docs? ¿Están actualizados?
3. **Tests**: ¿Qué cobertura tiene? ¿Qué módulos no tienen tests?
4. **Seguridad básica**: ¿Hay secretos en el código? ¿Se validan inputs? ¿Hay .env.example?

Resumí los hallazgos:

```
DIAGNÓSTICO:
- Estructura: [descripción breve + patrón detectado]
- Documentación: [estado]
- Tests: [cobertura estimada + módulos sin tests]
- Seguridad: [hallazgos rápidos o "sin problemas obvios"]
- Deuda técnica visible: [top 3 problemas]
```

## Paso 4: Completar ARCHITECTURE.md

1. Si existe `docs/ARCHITECTURE_TEMPLATE.md` (versión con placeholders), renombralo a `docs/ARCHITECTURE.md`
2. Si `docs/ARCHITECTURE.md` ya tiene datos del template (no del proyecto), reemplazá todo el contenido con los placeholders de `ARCHITECTURE_TEMPLATE.md`
3. Con lo que descubriste, completá `docs/ARCHITECTURE.md` con datos reales del proyecto. Reemplazá todos los `[completar]` con información concreta.

Mostrá el resultado al usuario para validación.

## Paso 5: Proponer plan de adopción

### Detectar si es proyecto fullstack

Si en el paso 1 se detectó frontend y backend separados (carpetas distintas, deploys separados, o framework fullstack con API routes significativas):
- Incluir en el plan de adopción la estructura de planificación separada (→ ver `docs/PLANNING.md` sección "Proyectos fullstack")
- Proponer crear `FRONTEND_PLAN.md` y `BACKEND_PLAN.md` como parte de la Fase 2

### Detectar si usa Supabase

Si en el paso 1 se detectó Supabase:
1. Verificar que existe `supabase/migrations/`. Si no existe, incluir su creación en Fase 1.
2. Incluir la convención de migraciones (→ ver `docs/CONVENTIONS.md` sección "Supabase") en el plan de adopción.
3. Si hay schema actual sin migraciones, proponer generar una migración base como quick win.

Basado en el diagnóstico, proponé un plan priorizado por riesgo → ver `docs/ADOPCION_PROYECTOS_EXISTENTES.md`:

```
PLAN DE ADOPCIÓN:

FASE 1 — Inmediato (esta sesión):
- [ ] Completar ARCHITECTURE.md ← ya hecho
- [ ] Crear SESSION_LOG.md
- [ ] [quick wins de alto riesgo y bajo esfuerzo]

FASE 2 — Próximas 2-3 sesiones:
- [ ] [items priorizados por riesgo]

FASE 3 — Cuando se estabilice:
- [ ] [items de consolidación]

NO TOCAR AHORA:
- [cosas que explícitamente se dejan para después]
```

Máximo 15 líneas el plan. Si es más largo, el alcance es demasiado grande.

## Paso 6: Esperar aprobación

No arranques a hacer cambios hasta que el usuario apruebe el plan. Si ajusta algo, actualizar y confirmar.

## Paso 7: Ejecutar Fase 1

Implementá solo la Fase 1 del plan aprobado:

1. `ARCHITECTURE.md` completo (ya debería estar del paso 4)
2. `SESSION_LOG.md` creado con la primera entrada
3. Quick wins aprobados

Después de cada cambio, verificá que el build sigue pasando.

## Paso 8: Configurar hooks básicos

Si el proyecto tiene build y lint funcionando, proponé configurar hooks mínimos → ver `docs/HOOKS.md`:

1. **Proteger archivos sensibles** (migrations, .env, .lock)
2. **Formatear al guardar** (si hay formatter configurado)

Preguntá al usuario antes de configurar.

## Paso 9: Configurar CI/CD con failure logs to PR

Detectar el estado actual de CI/CD:

```
CI/CD DETECTADO:
- GitHub Actions: [sí/no] [listar workflows si existen]
- Otro CI: [nombre] o "no detectado"
- Failure logs to PR: [sí/no]
```

### Si ya tiene GitHub Actions

Verificar si los workflows existentes ya incluyen el step de "failure logs to PR" (buscar `actions/github-script` con `if: failure()`). Si no lo tienen, proponer agregar el step a cada job → ver `docs/ADOPCION_PROYECTOS_EXISTENTES.md` sección "Cómo adaptar los workflows de CI/CD".

### Si NO tiene GitHub Actions

Proponer copiar los workflows del template (`.github/workflows/ci.yml` y `.github/workflows/e2e.yml`) y adaptar los comandos al stack detectado en el Paso 1:

1. Reemplazar `npm ci` / `npm run build` / `npx vitest` por los equivalentes del stack
2. Ajustar las versiones de Node.js o runtime según corresponda
3. Mantener el step de "failure logs to PR" sin cambios (es agnóstico al stack)

### Si usa otro CI (no GitHub Actions)

Documentar en el plan de adopción como tarea pendiente: "Adaptar mecanismo de failure logs to PR para [nombre del CI]". El patrón es: si el CI falla en un PR, postear los últimos 80 líneas de logs como comentario en el PR.

Preguntá al usuario antes de hacer cambios en workflows.

## Paso 10: Confirmar

```
✅ ONBOARDING COMPLETO

Stack: [resumen]
Documentación creada: [lista]
Quick wins aplicados: [lista o "ninguno"]
Hooks configurados: [lista o "ninguno"]
CI/CD failure logs to PR: [configurado/pendiente/no aplica]
Build: ✅ sigue pasando

PRÓXIMOS PASOS (Fase 2):
- [ ] [siguiente item del plan]
```

Actualizá `SESSION_LOG.md` con todo lo hecho.

---

## Reglas

- No refactorizar código durante el onboarding. El objetivo es documentar y estabilizar, no reescribir.
- Si el build está roto, eso es prioridad 0. No se adoptan estándares sobre código que no compila.
- Completar ARCHITECTURE.md con datos reales, no con placeholders.
- El plan de adopción es una PROPUESTA. El usuario decide qué y cuándo.

---

*Adoptar estándares no es reescribir el proyecto. Es ponerle nombre a lo que ya existe para poder mejorarlo sin romperlo.*
