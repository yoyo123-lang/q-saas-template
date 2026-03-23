# ADR-0004: Versiones reales del stack y sus implicaciones

> **Fecha**: 2026-03-23
> **Estado**: Aceptada

## Contexto

El ADR-0003 y el ARCHITECTURE.md original documentaron el stack con Next.js 15 y Zod 3. Al implementar el template, las versiones instaladas resultaron ser Next.js 16 y Zod 4. Estas versiones introdujeron cambios breaking que afectan la configuración del proyecto.

## Cambios respecto al plan original

### Next.js 15 → Next.js 16

**Implicaciones:**

1. **`next lint` eliminado**: El subcomando `next lint` ya no existe. Se migró el script a `eslint src/ tests/` con ESLint 9 flat config nativo.
2. **`middleware.ts` deprecado**: Next.js 16 depreca la convención `middleware.ts` en favor de `proxy`. El archivo funciona hoy pero emite un warning en el build. Ver `docs/KNOWN_ISSUES.md`.
3. **`eslint-config-next` incompatible**: La combinación `eslint-config-next` + `@eslint/eslintrc` FlatCompat causa un error circular en ESLint 9. Se reemplazó por `typescript-eslint` con flat config nativo.

### Zod 3 → Zod 4

**Implicaciones:**

1. **API mayormente compatible**: Los cambios entre Zod 3 y 4 son principalmente internos. Los schemas existentes (`createProjectSchema`, `updateProjectSchema`) funcionan sin modificación.
2. **`.safeParse()` sin cambios**: El patrón de validación usado en el proyecto es compatible.

### shadcn/ui: no instalado en el template base

**Decisión**: shadcn/ui requiere inicialización por proyecto (`npx shadcn@latest init`). El template no lo pre-instala porque cada proyecto configura su propio tema. Los componentes UI del template son Tailwind puro + Radix UI.

## Consecuencias

### Lo que ganamos
- Stack actualizado con las versiones más recientes al momento de creación (Next.js 16, Zod 4)
- Lint funcional con ESLint 9 flat config nativo (más simple, sin adaptadores)

### Lo que perdemos o se complica
- `middleware.ts` emite warning en build — deuda técnica documentada en KNOWN_ISSUES.md
- Los proyectos que clonen el template deben estar al tanto de que Next.js 16 cambió el API de middleware

### Lo que hay que tener en cuenta a futuro
- Cuando Next.js 16 documente oficialmente la API `proxy`, migrar `src/middleware.ts`
- Actualizar ARCHITECTURE.md si se instala shadcn/ui en un proyecto derivado
