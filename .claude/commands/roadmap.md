# Roadmap de proyecto (meta-planificación)

> Skill para planificar proyectos grandes que van a requerir múltiples sesiones.
> Invocar con: `/project:roadmap`
> Produce un `ROADMAP.md` de alto nivel. No genera código.
> Para implementar, usar `/project:cambio-grande` sesión por sesión.

## Cuándo usar este skill

- El usuario pide construir una aplicación completa o un SaaS
- El plan de implementación tendría >5 etapas o >3 sesiones
- Hay múltiples módulos con dependencias entre sí (auth, billing, dashboard, etc.)

## Paso 1: Entender el proyecto

Preguntale al usuario:

1. **¿Qué hace la aplicación?** (el problema que resuelve, en 2-3 oraciones)
2. **¿Quién la usa?** (tipos de usuarios, roles)
3. **¿Cuáles son las funcionalidades core?** (las 3-5 cosas que SÍ o SÍ tiene que tener)
4. **¿Hay algo que ya exista?** (diseños, APIs externas, código previo, referencias)
5. **¿Hay restricciones técnicas?** (hosting, presupuesto, integraciones obligatorias)

Si el usuario ya dio contexto suficiente en su mensaje, no repetir preguntas que ya estén respondidas. Hacer SOLO las preguntas que falten.

## Paso 2: Explorar el template

Leé (en silencio):
- `BLUEPRINT.md` — qué configuración tiene el template
- `docs/ARCHITECTURE.md` — stack actual, estructura de carpetas
- `SESSION_LOG.md` — qué se construyó hasta ahora
- `KNOWN_ISSUES.md` — restricciones conocidas

Identificá qué ya provee el template y qué hay que construir desde cero.

## Paso 3: Definir módulos

Descomponer el proyecto en **módulos** — unidades funcionales independientes. Cada módulo:
- Tiene un propósito claro (ej: "autenticación", "billing", "dashboard de admin")
- Puede funcionar de forma aislada (o con mocks para dependencias)
- Corresponde a 1-3 sesiones de implementación

### Orden canónico de construcción para SaaS

Seguir este orden salvo que haya razones específicas para cambiarlo:

```
1. Schema y migraciones de base de datos
2. Tipos compartidos (interfaces, DTOs, enums)
3. Auth y autorización (si no lo provee el template)
4. Modelos y servicios de backend (lógica de negocio)
5. Endpoints / API routes
6. Layout y navegación base del frontend
7. Páginas y componentes de frontend (por feature)
8. Integración frontend ↔ backend (reemplazar mocks por APIs reales)
9. Integraciones externas (pagos, email, notificaciones)
10. Tests E2E
11. Polish y QA final
```

Para cada módulo, definir:
- **Nombre** descriptivo
- **Descripción** en 1-2 oraciones
- **Dependencias** — qué módulos deben estar listos antes
- **Capa** — backend, frontend, fullstack, infra
- **Sesiones estimadas** — cuántas sesiones de implementación (usar `docs/ESTIMATION.md`)
- **Prioridad** — crítico / importante / nice-to-have

## Paso 4: Agrupar en sesiones

Agrupar módulos (o partes de módulos) en sesiones respetando:

1. **Capacidad por sesión**: máximo ~4 etapas / ~15 tareas atómicas por sesión
2. **Coherencia lógica**: cada sesión produce algo funcional y testeable
3. **Dependencias**: no planificar un módulo antes de sus dependencias
4. **Frontend + Backend juntos**: si una sesión hace endpoints, la siguiente (o la misma) conecta el frontend
5. **Migraciones al inicio**: toda sesión que cambie el schema empieza por la migración

### Reglas de agrupación

- Una sesión NO mezcla módulos sin relación (no hacer "billing + notificaciones" en la misma sesión)
- Si un módulo es grande, partirlo en sesiones: ej. "Billing — Sesión 1: modelo + servicio", "Billing — Sesión 2: endpoints + frontend"
- Dejar 10-15 min de buffer por sesión para revisión y cierre
- Las primeras 2-3 sesiones deben producir algo visible (motivación y feedback temprano)

## Paso 5: Generar ROADMAP.md

Crear el archivo `ROADMAP.md` en la raíz del proyecto con este formato:

```markdown
# Roadmap: [Nombre del proyecto]

## Visión
[Qué hace la app, para quién, en 2-3 oraciones]

## Módulos

| # | Módulo | Descripción | Capa | Depende de | Sesiones est. | Prioridad |
|---|--------|-------------|------|------------|---------------|-----------|
| M1 | [nombre] | [descripción] | BE/FE/Full | — | 1 | Crítico |
| M2 | [nombre] | [descripción] | BE | M1 | 2 | Crítico |
| M3 | [nombre] | [descripción] | FE | M1, M2 | 1 | Importante |

## Plan de sesiones

### Sesión 1: [nombre descriptivo]
- **Módulos**: M1 (completo)
- **Objetivo**: [qué queda funcionando al terminar]
- **Pre-requisitos**: ninguno
- **Incluye migraciones**: sí/no
- **Estimación**: ~[N] min [modelo]

### Sesión 2: [nombre descriptivo]
- **Módulos**: M2 (backend)
- **Objetivo**: [qué queda funcionando al terminar]
- **Pre-requisitos**: Sesión 1 completada
- **Incluye migraciones**: sí/no
- **Estimación**: ~[N] min [modelo]

[... más sesiones ...]

## Orden de construcción
[Diagrama ASCII o lista que muestre las dependencias y el flujo]

```
S1: Auth ──→ S2: Modelos ──→ S4: Integración
                    ↓
              S3: Frontend ──→ S4
```

## Fuera de alcance
[Qué NO se va a construir ahora, para que quede explícito]

## Resumen

| Métrica | Valor |
|---------|-------|
| Módulos | [N] |
| Sesiones estimadas | [N] |
| Modelo recomendado | [Opus/Sonnet] |
| Tiempo total estimado | ~[N] min |
```

## Paso 6: Validar con el usuario

Presentar el roadmap completo y preguntar:

1. **¿El orden tiene sentido?** — ¿hay algo que preferís tener antes?
2. **¿Falta algún módulo?** — ¿algo que no mencionaste?
3. **¿Hay algo que sobra?** — ¿algo que querés sacar del alcance?
4. **¿Las prioridades están bien?** — ¿qué es lo más urgente?

Esperá aprobación antes de guardar.

## Paso 7: Guardar y orientar

1. Guardar `ROADMAP.md` en la raíz del proyecto
2. Actualizar `SESSION_LOG.md` con la creación del roadmap
3. Indicar al usuario cómo continuar:

```
✅ ROADMAP CREADO

Próximo paso: arrancar la Sesión 1 con /project:sesion o /project:cambio-grande.
Al inicio de cada sesión, voy a leer el ROADMAP.md para saber qué toca.
Al cerrar cada sesión, voy a actualizar el estado de los módulos.
```

## Actualización del roadmap entre sesiones

Al inicio de cada sesión (`/project:sesion`), si existe `ROADMAP.md`:
- Leerlo y mostrar progreso: "Sesión N de M — módulos completados: X/Y"
- Identificar qué sesión toca según el plan

Al cierre de cada sesión (`/project:cierre`), si existe `ROADMAP.md`:
- Marcar módulos/sesiones completadas
- Ajustar estimaciones de sesiones futuras si cambió algo
- Documentar decisiones que afecten sesiones posteriores

---

*Planificar el plan no es burocracia. Es la diferencia entre construir una casa con planos y construirla "a ojo".*
