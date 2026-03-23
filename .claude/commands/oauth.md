# Integrar OAuth con Google

> Skill para integrar Google OAuth en el proyecto actual.
> Invocar con: `/project:oauth`
> Lee el playbook y guía al usuario paso a paso.

## Paso 1: Leer el playbook

Leé en silencio:
- `docs/playbooks/oauth.md` — guía agnóstica de integración
- `docs/oauth/IMPLEMENTACION_OAUTH.md` — referencia detallada del stack Next.js (si existe)
- `docs/ARCHITECTURE.md` — para entender el stack actual del proyecto

## Paso 2: Evaluar el proyecto

Antes de hacer cualquier cambio, respondé estas preguntas internamente:
- ¿El proyecto usa Next.js? Si sí, el playbook aplica directamente.
- ¿Ya tiene algún sistema de auth? Si sí, evaluar si se reemplaza o complementa.
- ¿Tiene base de datos configurada? Se necesita para persistir sesiones.
- ¿Tiene Prisma u otro ORM? Afecta cómo se crea el adapter.

## Paso 3: Preguntar al usuario

Hacé estas preguntas (de a 2-3, no todas juntas):

1. **¿Qué proveedor de OAuth querés usar?** (Google es el probado; GitHub, Discord, etc. también se pueden agregar)
2. **¿Necesitás control de acceso por allowlist de emails?** (solo entran los que vos autorices vs. cualquiera puede registrarse)
3. **¿Necesitás roles?** (admin/usuario/etc.) — si sí, ¿cuáles?
4. **¿Ya tenés las credenciales de Google Cloud Console?** (Client ID y Client Secret) — si no, explicar cómo obtenerlas

## Paso 4: Planificar

Con las respuestas, armá un plan siguiendo el formato de `/project:sesion`:

```
SESIÓN: Integración OAuth
OBJETIVO: [descripción]

PASOS:
1. [paso concreto]
2. [paso concreto]

ARCHIVOS QUE VOY A TOCAR:
- [lista]
```

Usá el playbook `docs/playbooks/oauth.md` como referencia para los archivos a crear.

## Paso 5: Esperar aprobación

No escribas código hasta que el usuario apruebe el plan.

## Paso 6: Implementar

Seguí el playbook y las reglas de `docs/REGLAS_PREVENTIVAS.md`. Al terminar cada paso, verificá que compila.

## Paso 7: Verificar

- [ ] Correr build del proyecto
- [ ] Verificar que el flujo de login funciona end-to-end
- [ ] Verificar que rutas protegidas redirigen sin sesión
- [ ] Actualizar `docs/ARCHITECTURE.md` si cambia la estructura
- [ ] Actualizar `SESSION_LOG.md`
