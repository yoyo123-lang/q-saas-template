# ADR-0003: Template con código base funcional

**Estado:** Aceptada
**Fecha:** 2026-03-23
**Contexto:** El templete-blanco tiene el mejor sistema de reglas para vibecoding, pero cada proyecto nuevo requiere implementar auth, layout, dashboard, API routes, conexión a DB, estados de UI y configuración de deploy desde cero (4-8 horas).

## Decisión

Extender el templete-blanco con código funcional que compile y se pueda deployar. El resultado es q-saas-template: un repositorio que al clonarlo, llenar BLUEPRINT.md y correr `/project:sesion`, permite a Claude Code transformar el esqueleto genérico en un SaaS específico.

## Stack elegido

| Componente | Elección | Motivo |
|---|---|---|
| Framework | Next.js 15 (App Router) | Máximo contexto de Claude Code, ya usado en todos los proyectos |
| Lenguaje | TypeScript (strict) | Consistencia con proyectos existentes |
| Estilos | Tailwind CSS 4 | Mobile-first por defecto, ya en uso |
| Base de datos | Supabase (PostgreSQL) | Tier gratuito generoso, auth integrada opcional |
| ORM | Prisma | Tipos auto-generados, ya en uso |
| Autenticación | NextAuth v5 + Google OAuth | Playbook probado en producción |
| Validación | Zod | Server-side, inferencia de tipos |
| UI Components | shadcn/ui | Accesibles, customizables, sin vendor lock-in |
| Deploy | Vercel (default) | Ya en uso |

## Qué incluye

1. Auth completa (Google OAuth, allowlist, roles, middleware)
2. Layout con dashboard (sidebar, header, breadcrumbs, landing)
3. Modelo de ejemplo "projects" con CRUD completo
4. Componentes de UI reutilizables (loading, empty, error, confirm, data-table, status-badge)
5. Health check endpoint
6. Configuración de deploy (vercel.json, .env.example)
7. Tests del CRUD de ejemplo (unitarios + integración)
8. SEO base (metadata, robots.txt, sitemap.xml)
9. BLUEPRINT.md para personalización de nuevos proyectos

## Qué NO incluye

- Pasarelas de pago → playbook existente
- Bot de Telegram → `/project:telegram`
- reCAPTCHA → `/project:recaptcha`
- Notificaciones, i18n, emails transaccionales, analytics

## Consecuencias

- **Positiva:** Setup de proyecto nuevo baja de 4-8 horas a 30-60 minutos
- **Positiva:** Patrón CRUD completo sirve como referencia para Claude Code
- **Positiva:** Tests incluidos establecen el estándar de calidad desde el inicio
- **Riesgo:** Mantener el template actualizado con cambios en dependencias
- **Mitigación:** Dependencias mínimas, versiones específicas en package.json
