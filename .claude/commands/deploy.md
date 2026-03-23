# Pre-deploy y release

> Skill para verificar que todo está listo antes de subir código a producción.
> Invocar con: `/project:deploy`
> No hagas push hasta completar todas las verificaciones.

## Paso 1: Verificar estado del repositorio

Corré en silencio:

```bash
git status
git log --oneline -5
```

Reportá:

```
ESTADO DEL REPO:
- Rama: [nombre]
- Cambios sin commitear: [sí/no — si sí, listar]
- Último commit: [hash + mensaje]
```

Si hay cambios sin commitear, preguntá al usuario si quiere commitear antes de seguir. No se hace deploy con cambios sueltos.

## Paso 2: Secuencia obligatoria de verificación

Corré estos checks en orden. Si uno falla, parar y arreglar antes de seguir → ver `docs/PRE_DEPLOY_AND_QA.md`.

```
1. Build (npm run build o equivalente)
   → Si falla: arreglar TODOS los errores. Repetir hasta que pase limpio.

2. Lint (si existe)
   → Si hay errores (no warnings): arreglar antes de continuar.

3. Tests (si existen)
   → Si falla algún test: arreglar antes de continuar.

4. Revisar output del build buscando:
   - Warnings que indiquen problemas reales
   - Imports que no resuelven
   - Variables de entorno faltantes
```

Reportá:

```
VERIFICACIÓN:
- Build: ✅/❌ [detalle si falla]
- Lint: ✅/❌/⚠️ [N warnings no críticos]
- Tests: ✅/❌ [X de Y pasaron]
```

Si algo falla, no avanzar. Arreglar y volver a correr.

## Paso 3: Scan de seguridad rápido

Corré el security scan rápido → ver `docs/roles/tech/security-scan-quick.md`:

1. Dependencias con vulnerabilidades conocidas (`npm audit` o equivalente)
2. Secretos en código (buscar patrones de API keys, tokens, passwords)
3. `.env` o archivos sensibles trackeados por git

```
SEGURIDAD:
- Dependencias: ✅/⚠️ [N vulnerabilidades — severidad]
- Secretos en código: ✅/❌ [detalle]
- Archivos sensibles: ✅/❌ [detalle]
```

Si hay hallazgos CRÍTICOS de seguridad, **no avanzar**. Corregir primero.

## Paso 4: Verificar diff contra main

```bash
git diff main --stat
```

Mostrá al usuario un resumen de todo lo que va a subir:

```
CAMBIOS vs MAIN:
- [N] archivos modificados
- [N] archivos nuevos
- [N] archivos eliminados

RESUMEN:
- [lista breve de qué cambia, agrupado por feature/fix]
```

Si el diff es muy grande (>20 archivos o >500 líneas), advertir al usuario y sugerir revisar si todo es intencional.

## Paso 5: Verificar TODOs bloqueantes

Buscá en el código:

```
TODO, FIXME, HACK, XXX, TEMP
```

Filtrá solo los que estén en archivos del diff (no en todo el proyecto). Reportá:

```
TODOs EN CÓDIGO NUEVO:
- [archivo:línea] — [texto del TODO]
```

Si hay alguno que parezca bloqueante (ej: "TODO: validar antes de deploy"), preguntá al usuario.

## Paso 6: Generar changelog

Basado en los commits desde main, generá un changelog corto:

```
CHANGELOG:
- [tipo] [descripción corta] ([hash])
- [tipo] [descripción corta] ([hash])

Tipos: feat, fix, refactor, docs, chore, security
```

Mostrá al usuario para validación.

## Paso 7: Confirmar y ejecutar

Mostrá el resumen final:

```
🚀 LISTO PARA DEPLOY

Build: ✅
Lint: ✅
Tests: ✅ [X de Y]
Seguridad: ✅
TODOs bloqueantes: [ninguno / N pendientes]

CAMBIOS:
[changelog resumido]

DESTINO: push a [rama] → [plataforma de deploy si se detectó]

¿Procedo con el push?
```

Esperá confirmación explícita del usuario.

Si confirma:

1. Hacer push (`git push -u origin [rama]`)
2. Verificar que el push fue exitoso
3. Si hay CI/CD detectado, informar que los checks van a correr

```
✅ PUSH EXITOSO

Rama: [nombre]
Commit: [hash]
Remote: [URL si está disponible]

[Si hay CI/CD]: Los checks de CI van a correr automáticamente.
```

## Paso 8: Actualizar SESSION_LOG.md

```markdown
### [fecha] — Deploy a [rama/entorno]
- Cambios: [changelog resumido]
- Verificaciones: build ✅, lint ✅, tests ✅, security ✅
- Push: [hash] → [rama]
```

---

## Reglas

- Si el build falla, no se hace deploy. Sin excepciones.
- Si hay secretos en el código, no se hace deploy. Sin excepciones.
- El push solo se hace con confirmación explícita del usuario.
- No forzar push (`--force`) a menos que el usuario lo pida explícitamente.
- Si el usuario pide push a main/master, advertir sobre el riesgo.

---

*Un deploy sin verificar es una ruleta rusa con el servidor de producción.*
