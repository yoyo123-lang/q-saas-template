# Ciclo de cambio con revisión automática

> Skill para implementar un cambio y correr revisión técnica automática.
> Invocar con: `/project:cambio`
> Para cambios grandes (multi-etapa), usar `/project:cambio-grande`.

## Paso 1: Entender el cambio

Preguntale al usuario:

1. **¿Qué necesitás cambiar?** (el resultado, no la implementación)
2. **¿Hay algo que debería ver antes?** (archivo, pantalla, error, referencia)

Si la respuesta es clara → paso 2. Si es ambigua → UNA pregunta más para clarificar.

## Paso 2: Evaluar alcance

Antes de implementar, evaluá:

- ¿Cuántos archivos va a tocar? (si >5 archivos o múltiples features → sugerir `/project:cambio-grande`)
- ¿Hay riesgo? (billing, auth, datos de usuarios → requiere worktree)

Proponé un mini-plan (máximo 5 líneas):

```
CAMBIO: [descripción en una oración]
ARCHIVOS: [lista]
RIESGO: [bajo/medio/alto]
```

Esperá aprobación.

## Paso 3: Implementar

Aplicá el cambio siguiendo `docs/REGLAS_PREVENTIVAS.md`. Hacé commit atómico al terminar.

## Paso 4: Detectar tipo de cambio y seleccionar roles

Analizá el `git diff` del commit que acabás de hacer. Clasificá el cambio:

### Reglas de detección automática

Revisá los archivos modificados y el contenido del diff:

| Si el diff contiene... | Tipo de cambio | Roles a correr |
|------------------------|----------------|----------------|
| Archivos nuevos de componentes/páginas + lógica | Feature nueva | 1 (Code) + 2 (QA) + 3 (Security) + 6 (UX) |
| Solo archivos de test o fix puntual | Bug fix | 1 (Code) + 2 (QA) |
| Archivos de auth, middleware, tokens, permisos | Seguridad/auth | 1 (Code) + 3 (Security) |
| Queries, índices, cache, lazy loading | Optimización | 1 (Code) + 4 (Performance) |
| Dockerfile, CI/CD, deploy configs, env | Infra/deploy | 1 (Code) + 5 (DevOps) |
| CSS, estilos, componentes UI, layouts | UI/diseño | 1 (Code) + 6 (UX) |
| Solo renombramientos, formato, comentarios | Cosmético | 1 (Code) solo |

Si el cambio cruza varias categorías, combinar los roles. **El Code Reviewer (1) siempre corre.**

Mostrá al usuario qué roles vas a correr y por qué:

```
ROLES SELECCIONADOS (según el diff):
- Code Reviewer ← siempre
- Security Auditor ← detecté cambios en middleware de auth
- QA Engineer ← hay lógica nueva
Ejecutando...
```

## Paso 5: Ejecutar roles con sub-agentes

### Reglas de ejecución

1. **Code Reviewer siempre corre primero** (solo, no en paralelo). Si encuentra algo CRÍTICO, corregir antes de seguir.

2. **Los demás roles corren en paralelo** usando sub-agentes. Cada sub-agente:
   - Lee el archivo del rol (`docs/roles/[rol].md`)
   - Revisa SOLO los archivos modificados en el diff (no el proyecto entero)
   - Devuelve hallazgos en formato compacto

3. **Formato de instrucción para cada sub-agente:**

```
Adoptá el rol definido en docs/roles/[ROL].md.
Revisá SOLO estos archivos: [lista del diff].
Devolvé hallazgos en este formato:
ESTADO: ✅/⚠️/❌
CRÍTICOS: [lista o "ninguno"]
ALTOS: [lista o "ninguno"]
MEDIOS: [lista o "ninguno"]
```

4. **Recopilar resultados** de todos los sub-agentes en un resumen consolidado.

## Paso 6: Evaluar y actuar

### Si hay hallazgos CRÍTICOS

```
⛔ REVISIÓN ENCONTRÓ HALLAZGOS CRÍTICOS

[Rol]: [hallazgo] — archivo:línea
[Rol]: [hallazgo] — archivo:línea

Corrijo estos hallazgos antes de continuar.
```

Corregir automáticamente. Después de corregir, volver a correr SOLO los roles que encontraron CRÍTICOS para verificar.

### Si hay hallazgos ALTOS (sin CRÍTICOS)

```
⚠️ REVISIÓN ENCONTRÓ HALLAZGOS ALTOS

[lista]

Corrijo estos hallazgos.
```

Corregir automáticamente. No hace falta re-verificar.

### Si solo hay MEDIOS/BAJOS o está limpio

```
✅ REVISIÓN PASÓ

[resumen: X medios, Y bajos — o "limpio"]
Los hallazgos medios/bajos quedan documentados para después.
```

Continuar al paso 7.

## Paso 7: Documentar

1. **Commit** con las correcciones de la revisión (si hubo).

2. **Actualizar SESSION_LOG.md**:
```
### [fecha] — [descripción del cambio]
- Cambio: [qué se hizo]
- Archivos: [lista]
- Revisión: [roles corridos] — [resultado: aprobado/con observaciones]
- Hallazgos corregidos: [lista breve o "ninguno"]
- Pendientes: [medios/bajos si los hay]
```

3. **Generar informe** en `docs/reviews/` SOLO si hubo hallazgos ALTOS o CRÍTICOS. Para cambios limpios, el registro en SESSION_LOG es suficiente.

## Paso 8: Confirmar al usuario

```
✅ CAMBIO COMPLETO

Implementado: [qué]
Revisión: [roles corridos] — [resultado]
Hallazgos corregidos: [N] / Pendientes: [N]
Commit: [hash corto]
```

---

*Implementar sin revisar es como cocinar sin probar. Puede salir bien, pero no apostés a eso.*
