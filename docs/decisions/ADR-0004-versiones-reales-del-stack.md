# ADR-0004: Versiones del stack y decisiones de configuración

> **Fecha**: 2026-03-23 (actualizado 2026-03-23)
> **Estado**: Aceptada

## Contexto

El ARCHITECTURE.md y el plan original documentaron el stack con Next.js 15 y Zod 3. Al implementar el template se instalaron Next.js 16 y Zod 4. Una revisión posterior detectó que esas versiones son bleeding edge y generan deuda técnica innecesaria. Se bajaron a Next.js 15 y Zod 3.

## Decisiones

### Stack de versiones (versiones actuales)

| Componente | Versión instalada | Razón |
|---|---|---|
| Next.js | ^15.3.3 (resuelve 15.5.x) | LTS estable, `middleware.ts` sin deprecaciones |
| React | ^19.1.0 | Compatible con Next.js 15, stable |
| Zod | ^3.25.67 (resuelve 3.25.x) | API bien documentada, estable, ampliamente conocida |
| NextAuth | ^5.0.0-beta.30 | Beta estable, PrismaAdapter funcional |
| Prisma | ^6.19.2 | Estable |

### Por qué bajamos de Next.js 16 a Next.js 15

- Next.js 16 deprecó la convención `middleware.ts` en favor de `proxy` sin documentación oficial estable
- El cambio generó un warning en cada build y una entrada en KNOWN_ISSUES
- Next.js 15 es el LTS vigente; el middleware funciona correctamente sin advertencias
- Principio del proyecto: "la solución más aburrida que funcione es la mejor"

### Por qué bajamos de Zod 4 a Zod 3

- Zod 4 tiene menos documentación y tutoriales disponibles
- Las APIs del proyecto (`z.object`, `z.string`, `z.enum`, `z.optional`, `z.nullable`) son idénticas en ambas versiones
- La documentación que Claude Code tiene internalizada es de Zod 3
- El downgrade fue transparente — ningún cambio de código necesario

### shadcn/ui: no instalado en el template base

shadcn/ui requiere inicialización por proyecto (`npx shadcn@latest init`). El template no lo pre-instala porque cada proyecto configura su propio tema y componentes. Los componentes UI del template son Tailwind puro + Radix UI.

### ESLint: flat config nativo (sin `eslint-config-next`)

La combinación `eslint-config-next` + `@eslint/eslintrc` FlatCompat causa conflictos con ESLint 9 flat config. Se usa `typescript-eslint` con flat config nativo. El script de lint es `eslint src/ tests/`.

## Consecuencias

- `middleware.ts` funciona sin warnings en Next.js 15
- Tests (64) y build pasan sin errores
- Stack alineado con lo que Claude Code conoce bien
