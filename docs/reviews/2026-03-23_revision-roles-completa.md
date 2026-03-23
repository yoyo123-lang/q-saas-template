# Revisión completa por roles — q-saas-template
Fecha: 2026-03-23
Revisó: Claude Code (roles 1→6 + 8, capa 1)

## Resumen

| Rol | Estado | Críticos | Altos | Medios |
|-----|--------|----------|-------|--------|
| Code Reviewer | ⚠️ | 0 | 5 | 6 |
| QA Engineer | ⚠️ | 4 | 5 | 6 |
| Security Auditor | ⚠️ | 0 | 4 | 5 |
| Performance Engineer | ⚠️ | 3 | 5 | 3 |
| DevOps / SRE | ⚠️ | 0 | 5 | 6 |
| Consistency Reviewer | ⚠️ | 0 | 2 | 3 |

**Estado final post-correcciones: ⚠️ Aprobado con observaciones**

---

## Hallazgos corregidos (críticos y altos)

### CRÍTICOS

**[QA] handleDelete sin manejo de error — projects/page.tsx y [id]/page.tsx**
- `handleDelete` no verificaba `response.ok` ni el body. En el detail page hacía redirect aunque el delete fallara.
- Corregido: try/catch + verificación de `json.success` en ambas páginas.

**[QA] status query param sin validación runtime**
- `searchParams.get("status") as ProjectStatus | null` era un cast sin verificación runtime.
- Corregido: validación con `z.enum(...).safeParse()` antes de usar el valor.

**[Performance] N+1 en requireAdmin — segunda query redundante**
- `requireAdmin()` hacía `prisma.user.findUnique` para leer el role, que ya venía en `session.user.role`.
- Corregido: usa `session.user.role` directamente, elimina la query DB extra. También se eliminó el import de `prisma` del archivo.

**[Performance] Sort en DataTable no memoizado**
- `[...data].sort(...)` se ejecutaba en cada render aunque data/sortKey/sortDir no cambiaran.
- Corregido: `useMemo` con dependencias `[data, sortKey, sortDir]`.

**[Performance] findOwnedProject sin select**
- `findFirst` sin `select` traía todos los campos (incluyendo `description: @db.Text`) solo para verificar ownership.
- Corregido: `select: { id: true }`.

### ALTOS

**[QA/Security] PUT y DELETE con `where: { id }` sin userId**
- Los updates de Prisma no incluían `userId` en el WHERE, solo en el `findOwnedProject` previo.
- Corregido: `where: { id, userId: userId! }` en PUT y DELETE como defensa en profundidad.

**[QA] limit puede ser negativo**
- `Math.min(Number(searchParams.get("limit")) || 25, 100)` no cubría negativos.
- Corregido: `Math.max(1, Math.min(...))`.

**[Performance] Índice compuesto faltante**
- El query principal filtra por `userId + deletedAt + createdAt` pero solo había índices simples.
- Corregido: `@@index([userId, deletedAt, createdAt])` en schema.prisma + migración SQL.

**[QA] Nombre con solo espacios pasaba validación**
- `z.string().min(1)` valida longitud, no contenido real.
- Corregido: `.trim().min(1)` en createProjectSchema y updateProjectSchema. Test nuevo agregado.

**[DevOps] Health check catch silencioso**
- El `catch` en `/api/health` no logueaba por qué fallaba la DB.
- Corregido: `console.error("[health] Error de conexión:", err)`.

**[DevOps] README con versiones incorrectas**
- README decía Next.js 16 y Zod 4.
- Corregido: Next.js 15 y Zod 3.

---

## Hallazgos pendientes (medios/bajos para backlog)

### Medios
- **[Code]** `require-admin.ts` exporta `requireAuth` — nombre engañoso del módulo
- **[Code]** `breadcrumbs.tsx` tiene `labelMap` desacoplado de `nav-config.ts` — dos fuentes de verdad
- **[Code]** `dashboard/page.tsx` hace fetch manual en vez de usar el hook `useProjects`
- **[Code]** 6 `useState` separados para el formulario de edición en `[id]/page.tsx`
- **[Code]** Cast `session.user as { role?: string }` en auth.ts — debería usar el tipo augmentado
- **[Security]** Sin CSP header en `vercel.json`
- **[Security]** Sin rate limiting en ningún endpoint
- **[Security]** `NEXTAUTH_SECRET` vacío sin validación de startup
- **[Security]** `console.error` loguea objetos de error completos (stack traces) en producción
- **[Security]** `trustHost: true` en NextAuth sin restricción de host explícita
- **[Performance]** Páginas de dashboard son `"use client"` completas — SSR mejoraría TTI
- **[Performance]** Sin `Cache-Control` en endpoints GET
- **[Performance]** `PrismaClient` sin `connection_limit` configurado (riesgo en serverless)
- **[DevOps]** Sin migraciones Prisma (`prisma migrate`) — solo `db:push`. Rollback de DB imposible.
- **[DevOps]** Logs de error sin `request_id` — difícil correlacionar a las 3 AM
- **[DevOps]** Sin staging configurado
- **[Consistency]** `STATUS_OPTIONS` hardcodeado en `[id]/page.tsx` — tercera fuente de verdad del enum
- **[Consistency]** `useProjects` no expone `next_cursor` ni `has_more` — paginación ignorada en FE

### Notas sobre falso positivo
- El Consistency Reviewer reportó que `setProjects(json.data)` era incorrecto. Verificación manual confirmó que el shape de `apiSuccess({ data: array, meta: {...} })` devuelve `json.data = array` directamente. El hook es correcto.

---

## Estado de tests
- **Pre-review:** 64 tests ✅
- **Post-review:** 65 tests ✅ (1 nuevo caso: nombre con solo espacios)
- **Build:** limpio ✅
