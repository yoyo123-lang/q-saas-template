# Revisión a demanda

> Skill para correr roles de revisión sin implementar cambios.
> Invocar con: `/project:revision`
> Útil para auditorías pre-deploy, revisiones periódicas, o después de un sprint.

## Paso 1: Determinar alcance

Preguntale al usuario:

**¿Qué tipo de revisión necesitás?**

1. **Técnica (capa 1)** — Roles horizontales: código, QA, seguridad, performance, devops, UX, producto
2. **Negocio (capa 2)** — Roles verticales: lógica de negocio, data/analytics (requiere BUSINESS_MODEL.md)
3. **Completa (ambas capas)** — Todo en orden
4. **Específica** — Solo algunos roles puntuales

### Si elige "Específica"

Mostrar la lista de roles disponibles y dejar que elija:

```
Roles de capa 1 (técnicos):
  1. Code Reviewer — código limpio, patrones
  2. QA Engineer — bugs, casos borde
  3. Security Auditor — vulnerabilidades, auth
  4. Performance Engineer — lentitud, escalabilidad
  5. DevOps / SRE — deploy, monitoreo
  6. UX Reviewer — interacción, accesibilidad
  7. Product Reviewer — valor al usuario

Roles de capa 2 (negocio):
  A. Business Logic Reviewer — reglas de negocio, billing
  B. Data & Analytics Reviewer — tracking, métricas

¿Cuáles querés correr? (ej: "1, 3, 6" o "A y B")
```

## Paso 2: Determinar qué revisar

Preguntá:

**¿Qué revisamos?**

1. **Todo el proyecto** — Revisión completa (más lento, más exhaustivo)
2. **Cambios recientes** — Solo lo que cambió desde el último commit/tag/fecha
3. **Archivos específicos** — Solo ciertos archivos o carpetas

### Si elige "Cambios recientes"

Preguntar: **¿Desde cuándo?** y usar:
- `git diff [referencia]` para obtener la lista de archivos
- Si no especifica, usar el último tag o los últimos 5 commits

## Paso 3: Verificar prerrequisitos

### Para capa 2

Si el usuario pidió roles de capa 2, verificar que `docs/BUSINESS_MODEL.md` existe y tiene contenido.

- **Si no existe o está vacío:**
```
⚠️ Los roles de negocio requieren docs/BUSINESS_MODEL.md completo.
Opciones:
1. Correr /project:descubrimiento primero para generarlo
2. Continuar solo con roles técnicos (capa 1)
```

- **Si existe pero tiene secciones [POR DEFINIR]:**
```
ℹ️ BUSINESS_MODEL.md tiene secciones sin completar.
Los roles de negocio van a funcionar pero pueden tener puntos ciegos
en las secciones marcadas como [POR DEFINIR].
¿Continuar así o completar primero?
```

## Paso 4: Ejecutar roles

### Orden de ejecución

```
FASE 1 — Secuencial (base):
  → Code Reviewer (siempre primero)

FASE 2 — Paralelo (técnicos independientes):
  → Security + Performance + DevOps (en paralelo, sub-agentes)

FASE 3 — Paralelo (experiencia):
  → QA + UX + Product (en paralelo, sub-agentes)

FASE 4 — Paralelo (negocio, si aplica):
  → Business Logic + Data/Analytics (en paralelo, sub-agentes)
```

**Por qué este orden:**
- Code Review primero porque los otros roles asumen código limpio
- Security/Performance/DevOps son independientes entre sí
- QA/UX/Product son independientes entre sí
- Negocio va al final porque valida contra la spec, no contra el código

### Instrucciones para sub-agentes

Para cada rol, lanzar un sub-agente con:

```
Adoptá el rol definido en docs/roles/[ROL].md.
Alcance: [todo el proyecto / archivos del diff / archivos específicos].
[Si es capa 2: Leé docs/BUSINESS_MODEL.md como referencia.]

Devolvé tu análisis en este formato compacto:

ROL: [nombre]
ESTADO: ✅ Aprobado / ⚠️ Con observaciones / ❌ Bloqueado
CRÍTICOS: [N]
  - [título] — archivo:línea — [problema en 1 oración]
ALTOS: [N]
  - [título] — archivo:línea — [problema en 1 oración]
MEDIOS: [N]
  - [título] — archivo:línea — [problema en 1 oración]
BAJOS: [N] (solo contar, no listar)
LO BUENO: [2-3 puntos positivos]
```

### Manejo de contexto

- Cada sub-agente corre aislado (contexto propio)
- El orquestador solo recibe el resumen compacto
- Si un rol necesita más contexto del que cabe, dividir la revisión por módulo/carpeta

## Paso 5: Consolidar resultados

Recopilar todos los resúmenes y generar un dashboard:

```
═══════════════════════════════════════════
  REVISIÓN: [tipo] — [fecha]
  ALCANCE: [todo / cambios recientes / específico]
═══════════════════════════════════════════

  DASHBOARD
  ─────────────────────────────────────────
  Rol                  │ Estado │ C │ A │ M
  ─────────────────────│────────│───│───│───
  Code Reviewer        │  ✅    │ 0 │ 1 │ 2
  QA Engineer          │  ⚠️    │ 0 │ 2 │ 1
  Security Auditor     │  ✅    │ 0 │ 0 │ 1
  Performance          │  ❌    │ 1 │ 0 │ 0
  DevOps / SRE         │  ✅    │ 0 │ 0 │ 0
  UX Reviewer          │  ⚠️    │ 0 │ 1 │ 3
  Product Reviewer     │  ✅    │ 0 │ 0 │ 1
  Business Logic       │  ⚠️    │ 0 │ 1 │ 0
  Data/Analytics       │  ✅    │ 0 │ 0 │ 2
  ─────────────────────│────────│───│───│───
  TOTAL                │  ⚠️    │ 1 │ 5 │ 10

  C=Críticos  A=Altos  M=Medios
═══════════════════════════════════════════
```

## Paso 6: Actuar sobre hallazgos

### Si hay CRÍTICOS

```
⛔ HAY HALLAZGOS CRÍTICOS

[lista con rol, archivo, problema]

¿Querés que los corrija ahora?
```

Si el usuario dice sí → corregir, commitear, re-verificar con el rol afectado.

### Si hay ALTOS (sin CRÍTICOS)

```
⚠️ HAY HALLAZGOS ALTOS

[lista con rol, archivo, problema]

¿Querés que los corrija ahora o los dejamos documentados?
```

### Si solo hay MEDIOS/BAJOS

```
✅ REVISIÓN APROBADA CON OBSERVACIONES

[N] hallazgos medios y [N] bajos documentados.
No requieren acción inmediata.
```

## Paso 7: Generar informes

Generar informe consolidado en `docs/reviews/`:

**Nombre:** `YYYY-MM-DD_revision-[tipo].md` (ej: `2026-03-18_revision-completa.md`)

**Contenido:** El dashboard + hallazgos detallados de cada rol + lo bueno + recomendaciones.

Actualizar `SESSION_LOG.md` con un resumen de la revisión.

```
✅ REVISIÓN COMPLETA

Tipo: [técnica/negocio/completa/específica]
Roles: [N] ejecutados
Resultado: [aprobado/con observaciones/bloqueado]
Informe: docs/reviews/[archivo]
Hallazgos: [N] críticos, [N] altos, [N] medios, [N] bajos
Corregidos: [N] / Pendientes: [N]
```

---

*Revisar no es desconfiar del que construyó. Es respetar al que va a usar lo que se construyó.*
