# Cierre de sesión de trabajo

> Skill para cerrar una sesión de desarrollo de forma ordenada.
> Invocar con: `/project:cierre`
> Ejecutar SIEMPRE antes de cerrar la terminal o hacer /clear.

## Paso 1: Revisar qué se hizo

Mirá los archivos modificados en esta sesión (usá `git diff --name-only` o `git status`).

Listá en formato corto:
- Qué archivos se crearon
- Qué archivos se modificaron
- Qué funcionalidad se agregó o cambió

## Paso 2: Verificar estado

Corré los checks básicos del proyecto:

```
1. Build (npm run build o equivalente) → ¿pasa?
2. Lint (si existe) → ¿pasa?
3. Tests (si existen) → ¿pasan?
```

Si algo falla, avisale al usuario ANTES de seguir. No cerrar sesión con código roto.

## Paso 3: Evaluar KNOWN_ISSUES

Preguntale al usuario:

"Durante esta sesión, ¿hubo algo que tuve que corregir más de una vez o que salió mal y tuvimos que rehacer?"

Si la respuesta es sí, proponé una entrada para `KNOWN_ISSUES.md` con este formato:

```markdown
### [FECHA] — [Descripción corta]

**Qué pasó**: [qué se hizo mal]
**Por qué está mal**: [qué consecuencia tuvo]
**Qué hacer en vez**: [la forma correcta]
**Archivos afectados**: [dónde prestar atención]
```

Si la respuesta es no, seguir sin agregar nada.

## Paso 4: Actualizar SESSION_LOG.md

Actualizar (o crear si no existe) `SESSION_LOG.md` con:

```markdown
## Sesión: [nombre descriptivo]
**Fecha**: [YYYY-MM-DD]
**Objetivo**: [qué se intentó hacer]

### Estado
- ✅ [completado]
- 🔄 [en progreso — dónde quedó]
- ⬜ [pendiente]

### Archivos modificados
- `ruta/archivo` — qué se cambió

### Para la próxima sesión
- [ ] [tarea pendiente concreta]
```

## Paso 4b: Refinar spec de la sesión siguiente (si hay roadmap)

Si existe `ROADMAP.md` y la carpeta `sessions/`:

1. Identificar cuál es la próxima sesión según el roadmap
2. Leer su spec (`sessions/S0N-*.md`)
3. Evaluar si algo de esta sesión afecta esa spec:
   - ¿Se cambió el schema respecto a lo planificado?
   - ¿Se tomó una decisión de diseño que cambia el approach?
   - ¿Se creó/renombró un archivo que la spec referencia?
   - ¿Quedó algo pendiente que la próxima sesión necesita absorber?
4. Si hay cambios, actualizar la spec de la próxima sesión:
   - Actualizar la sección "Dependencias de sesiones anteriores" con nombres reales
   - Actualizar "Archivos clave > Existentes" con los archivos que efectivamente se crearon
   - Agregar decisiones de diseño que se tomaron durante la implementación
   - Ajustar criterios de aceptación si el alcance cambió
   - Marcar con `[ACTUALIZADO en cierre de Sesión N]` los cambios para trazabilidad
5. Si no hay cambios, no tocar la spec

```
SPEC SIGUIENTE: sessions/S0[N+1]-[nombre].md
Estado: [✅ sin cambios / 🔄 actualizada — N campos modificados]
Cambios: [lista breve de qué se actualizó, si aplica]
```

## Paso 5: Commit y manejo de rama

### Si se está trabajando en un worktree:

Preguntale al usuario:

> "Estamos trabajando en el worktree `[nombre]` (rama `[rama]`). ¿Qué querés hacer?"
> - **Mergear a main** — el trabajo está listo y verificado
> - **Push + PR** — para revisión antes de mergear
> - **Dejar para después** — commitear como WIP y retomar en otra sesión
> - **Descartar** — algo salió mal, borrar todo y volver a main limpio

Ejecutar la opción elegida siguiendo los pasos de `docs/GIT-WORKTREES.md`.

### Si NO se está en un worktree:

Si hay cambios sin commitear:
1. Preguntale al usuario si quiere commitear ahora
2. Si dice sí, hacer commit con mensaje descriptivo
3. Incluir SESSION_LOG.md y KNOWN_ISSUES.md en el commit si se modificaron

## Paso 6: Nombrar la sesión

Sugerile al usuario un nombre descriptivo para la sesión:

```
/rename [nombre-sugerido]
```

---

## Reglas

- No omitir el paso 3 (KNOWN_ISSUES). Es el paso más importante a largo plazo.
- Si el build falla, no cerrar. Arreglar primero.
- El SESSION_LOG es para la PRÓXIMA sesión. Escribilo pensando en alguien que arranca desde cero.
- Ser breve. El cierre no debería tomar más de 2-3 minutos.
- Si el proyecto tiene roadmap con specs (`sessions/`), siempre revisar si la spec siguiente necesita actualización. No cerrar sin verificar.
