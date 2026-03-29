# Board Context — Qontrata

> Contexto general de la Business Unit para el Q Company Board.
> Este archivo permite al Board entender qué es Qontrata, en qué estado está y cómo interpretarlo.

---

## Identidad de la BU

| Campo | Valor |
|-------|-------|
| **Nombre** | Qontrata |
| **Repo** | `yoyo123-lang/q-saas-template` |
| **Tipo** | SaaS B2B multi-tenant |
| **Mercado** | Argentina |
| **Vertical** | Reclutamiento / HR Tech |
| **Estado** | En desarrollo activo |

## Descripcion

Qontrata es una bolsa de trabajo SaaS multi-empresa para el mercado argentino. Permite a PyMEs y empresas medianas publicar puestos de trabajo, gestionar el pipeline completo de reclutamiento (publicacion, postulacion, entrevista, contratacion) y administrar candidatos.

## Stack tecnico

| Componente | Tecnologia |
|------------|-----------|
| Framework | Next.js (App Router) |
| ORM | Prisma |
| Base de datos | Supabase PostgreSQL |
| Auth | NextAuth.js (Google OAuth + credentials) |
| Pagos | MercadoPago (checkout + webhooks) |
| Deploy | Vercel |
| UI | Tailwind CSS + shadcn/ui |

## Actores del sistema

| Rol | Descripcion | Autenticacion |
|-----|------------|---------------|
| `SUPER_ADMIN` | Q Company — opera cross-tenant, reportes globales | Google OAuth |
| `EMPRESA_ADMIN` | Administrador de una empresa cliente | Google OAuth / email+password |
| `EMPRESA_USER` | Usuario de empresa con acceso limitado | Google OAuth / email+password |
| `CANDIDATO` | Postulante que aplica a puestos | Email+password / Google OAuth |

## Modelo de monetizacion

| Plan | Target | Precio |
|------|--------|--------|
| BASICO (Gratis) | PyMEs chicas | $0 — funcionalidad limitada |
| PROFESIONAL | PyMEs medianas | Pago mensual — mas puestos, usuarios, CVs |
| ENTERPRISE | Empresas grandes | Pago mensual — sin limites |

- Pasarela: MercadoPago
- Sistema de creditos por empresa
- Enforcement de limites por plan (puestos activos, usuarios, CVs descargados, puestos destacados)

## Heartbeat al Board

El cron `/api/cron/board-heartbeat` envia metricas al Board cada 5 minutos.

Ver `docs/board/METRICS_MAP.md` para el detalle completo de metricas y eventos.

## Contacto / ownership

| Rol | Quien |
|-----|-------|
| Operador | Q Company (operador solo + Claude Code) |
| Board | Q Company Board (q-company) |

---

## Historial de cambios

| Fecha | Que cambio | Por que |
|-------|-----------|---------|
| 2026-03-29 | Creacion inicial | Documentar contexto de BU para el Board |
