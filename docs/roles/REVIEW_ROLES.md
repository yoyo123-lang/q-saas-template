# Sistema de Revisión por Roles

> Objetivo: antes de salir a producción, pasar el proyecto por múltiples "ojos" especializados.
> Cada rol busca problemas desde un ángulo diferente. Claude Code adopta el rol, revisa, reporta, y después repara.

## Cómo funciona

En una empresa de software seria, antes de que algo salga a producción lo revisan varias personas con distintas especialidades. Un QA busca bugs, un experto en seguridad busca vulnerabilidades, un ingeniero de performance busca cuellos de botella, etc.

Acá hacemos lo mismo pero con Claude Code. Al terminar el desarrollo, le pedís que se ponga cada "sombrero" en orden y haga su revisión.

## Flujo recomendado

```
DESARROLLO TERMINADO
        │
        ▼
┌──────────────────────┐
│  1. CODE REVIEWER    │  ← ¿El código es limpio, mantenible, consistente?
│     (Tech Lead)      │
└──────────┬───────────┘
           │ corregir hallazgos
           ▼
┌──────────────────────┐
│  2. QA ENGINEER      │  ← ¿Funciona? ¿Qué pasa con datos raros?
│     (Tester)         │
└──────────┬───────────┘
           │ corregir hallazgos
           ▼
┌──────────────────────┐
│  3. SECURITY AUDITOR │  ← ¿Es seguro? ¿Hay puertas abiertas?
│     (Seguridad)      │
└──────────┬───────────┘
           │ corregir hallazgos
           ▼
┌──────────────────────┐
│  4. PERFORMANCE      │  ← ¿Es rápido? ¿Escala?
│     ENGINEER         │
└──────────┬───────────┘
           │ corregir hallazgos
           ▼
┌──────────────────────┐
│  5. DEVOPS / SRE     │  ← ¿Se puede desplegar, monitorear, revertir?
│     (Operaciones)    │
└──────────┬───────────┘
           │ corregir hallazgos
           ▼
┌──────────────────────┐
│  6. UX REVIEWER      │  ← ¿Se siente bien usarla? ¿Es accesible?
│     (Experiencia)    │
└──────────┬───────────┘
           │ corregir hallazgos
           ▼
┌──────────────────────┐
│  7. PRODUCT REVIEWER │  ← ¿Resuelve lo que el usuario necesita?
│     (Producto)       │
└──────────┬───────────┘
           │ corregir hallazgos
           ▼
┌──────────────────────┐
│  8. CONSISTENCY      │  ← ¿Las capas están alineadas? (FE↔BE↔BD)
│     REVIEWER         │
└──────────┬───────────┘
           │ corregir hallazgos
           ▼
      LISTO PARA DEPLOY
```

## Cómo usar cada rol

### En Claude Code, decí algo como:

```
Ponete el rol de [NOMBRE DEL ROL]. Leé docs/roles/tech/[ARCHIVO].md y seguí
las instrucciones. Revisá todo el proyecto y generá el informe.
```

### Después de cada informe:

```
Ahora corregí todos los hallazgos CRÍTICOS y ALTOS que encontraste.
Los MEDIOS y BAJOS dejamelos listados para después.
```

### Si querés hacer todos los roles en secuencia:

```
Vamos a hacer la revisión pre-producción completa. Leé docs/REVIEW_ROLES.md 
y ejecutá los roles de capa 1 en orden (1→7). Si el proyecto tiene
docs/BUSINESS_MODEL.md, seguí con los de capa 2. Para cada rol: revisá,
reportá, corregí lo crítico y alto, y pasá al siguiente.
```

## Regla de precedencia

> **Negocio manda.** Si una regla técnica contradice una regla de negocio, la de negocio gana.
> El rol técnico debe reportar el conflicto como hallazgo, no resolverlo solo.
>
> Los roles técnicos consultan `docs/BUSINESS_TECHNICAL_MAP.md` (si existe) para conocer
> las restricciones de negocio que aplican a su dominio. El mapa se genera/actualiza
> corriendo `/project:descubrimiento`.

## Roles disponibles

| # | Rol | Archivo | Qué busca |
|---|-----|---------|-----------|
| 1 | Code Reviewer (Tech Lead) | `docs/roles/tech/code-reviewer.md` | Código limpio, patrones, mantenibilidad |
| 2 | QA Engineer | `docs/roles/tech/qa-engineer.md` | Bugs, casos borde, flujos rotos |
| 3 | Security Auditor | `docs/roles/tech/security-auditor.md` | Vulnerabilidades, datos expuestos, auth |
| 4 | Performance Engineer | `docs/roles/tech/performance-engineer.md` | Lentitud, queries pesadas, memoria |
| 5 | DevOps / SRE | `docs/roles/tech/devops-sre.md` | Deploy, logs, monitoreo, rollback |
| 6 | UX Reviewer | `docs/roles/tech/ux-reviewer.md` | Interacción, consistencia visual, accesibilidad |
| 7 | Product Reviewer | `docs/roles/business/product-reviewer.md` | Funcionalidad real, valor al usuario |
| 8 | Consistency Reviewer | `docs/roles/tech/consistency-reviewer.md` | Tipos FE=BE, endpoints BE=llamadas FE, migraciones BD=modelos |

## Cuándo usar qué

No siempre hay que pasar todos los roles. Depende del tipo de cambio y del tipo de proyecto.

### Capa 1: Roles horizontales (aplican siempre)

| Tipo de cambio | Roles recomendados |
|---------------|-------------------|
| Feature nueva importante | Todos los de capa 1 (1→8) |
| Fix de un bug | 1 (Code Review) + 2 (QA) |
| Cambio de seguridad/auth | 1 + 3 (Security) |
| Optimización | 1 + 4 (Performance) |
| Cambio de deploy/infra | 1 + 5 (DevOps) |
| Cambio de UI/diseño/estilos | 1 + 6 (UX) |
| Feature fullstack (FE + BE + BD) | 1 + 8 (Consistency) como mínimo |
| Primer deploy de proyecto nuevo | Todos los de capa 1 (1→8) |
| Cambio chico/cosmético | 1 (Code Review) solo |

### Capa 2: Roles verticales (aplican según el tipo de proyecto)

Los roles de capa 2 validan lógica de negocio y datos. Se activan cuando el proyecto tiene `docs/BUSINESS_MODEL.md` completo. Sin ese archivo, estos roles no pueden funcionar.

Para generar `BUSINESS_MODEL.md` en un proyecto existente, correr `/project:descubrimiento`.

| # | Rol | Archivo | Qué busca |
|---|-----|---------|-----------|
| A | Business Logic Reviewer | `docs/roles/business/business-logic-reviewer.md` | Reglas de negocio, billing, permisos por plan |
| B | Data & Analytics Reviewer | `docs/roles/business/data-analytics-reviewer.md` | Tracking, métricas, eventos de funnel |

### Cuándo activar capa 2

| Tu proyecto es... | Capa 2 recomendada |
|-------------------|-------------------|
| Web simple / landing | No necesita capa 2 |
| SaaS con billing | A (Business Logic) + B (Data/Analytics) |
| SaaS con API pública | A + B |
| Marketplace | A + B |
| SaaS regulado (salud, finanzas) | A + B |

### Cómo se combinan las capas

Para un SaaS, la revisión pre-producción completa sería:

```
Capa 1: Code Reviewer → QA → Security → Performance → DevOps → UX → Product → Consistency
                                       │
                                       ▼
Capa 2: Business Logic Reviewer → Data/Analytics Reviewer
```

Capa 1 primero (asegurar que el código funciona, es seguro y usable), capa 2 después (asegurar que el negocio está bien implementado).

## Formato estándar de informe

Cada rol genera un informe con este formato:

```markdown
# Revisión: [NOMBRE DEL ROL]
Fecha: YYYY-MM-DD
Proyecto: [nombre]
Revisó: Claude Code en rol de [rol]

## Resumen
- Estado: ✅ Aprobado / ⚠️ Aprobado con observaciones / ❌ Bloqueado
- Hallazgos: X críticos, Y altos, Z medios, N bajos

## Hallazgos

### [CRÍTICO] Título
- Dónde: `archivo:línea`
- Problema: qué está mal
- Riesgo: qué puede pasar si no se arregla
- Solución: qué hacer

### [ALTO] Título
...

## Lo que está bien
- [cosas positivas del proyecto]

## Recomendaciones generales
- [mejoras no urgentes]
```

## Dónde se guardan los informes

Los informes se guardan en `docs/reviews/`:

```
docs/reviews/
  YYYY-MM-DD_code-review.md
  YYYY-MM-DD_qa.md
  YYYY-MM-DD_security.md
  YYYY-MM-DD_ux.md
  YYYY-MM-DD_business-logic.md
  YYYY-MM-DD_data-analytics.md
  ...
```

Esto deja trazabilidad de qué se revisó y cuándo.

---

*Siete ojos ven más que dos. Y cada uno busca cosas diferentes.*
