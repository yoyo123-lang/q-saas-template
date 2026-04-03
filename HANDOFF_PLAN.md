# Plan de Handoff — [BU_NAME] ([BU_DESCRIPTION])

> Objetivo: dejar deuda técnica en cero y documentación lista para que un equipo de desarrollo pueda tomar el proyecto sin depender del creador original.
> Timeline estimado: 2 semanas (10 días hábiles)
>
> INSTRUCCIONES: Reemplazá [BU_NAME] y [BU_DESCRIPTION] con los datos de tu BU.
> Agregá items específicos de tu dominio en cada fase (marcados con [BU-SPECIFIC]).

---

## Fase 1: Limpieza e Higiene del Repo (Días 1–2)

### 1.1 Limpieza de artefactos
- [ ] Revisar y eliminar archivos temporales, session logs del root
- [ ] Eliminar ZIPs de otros proyectos si existen (orchestrator*.zip, *-main.zip, etc.)
- [ ] Verificar `.gitignore` cubre: `sessions/`, `uploads/`, `*.zip`, `SESSION_LOG.md`, `.env.local`
- [ ] Verificar que no hay secrets hardcodeados en el código

### 1.2 Dependencias
- [ ] `npm audit` — resolver vulnerabilidades críticas/altas
- [ ] `npx depcheck` — eliminar dependencias sin usar
- [ ] Fijar versiones exactas en `package.json`
- [ ] Documentar versión de Node requerida (>=20)

### 1.3 Formato y linting
- [ ] Agregar Prettier (`.prettierrc`) si no existe
- [ ] Agregar scripts `format` y `format:check`
- [ ] Correr Prettier sobre todo el codebase
- [ ] Agregar Prettier check al CI

---

## Fase 2: Base de Datos y Migraciones (Días 2–3)

### 2.1 Migraciones — CRÍTICO
- [ ] Verificar que `prisma/migrations/` existe y está commiteado
- [ ] Si se usa `db push` en vez de `prisma migrate dev`, migrar a migraciones versionadas
- [ ] Generar migración inicial si no existe: `npx prisma migrate dev --name init`
- [ ] Verificar que `npx prisma migrate deploy` funciona contra DB vacía
- [ ] Documentar proceso en `docs/DATABASE.md`

### 2.2 Entorno local
- [ ] Crear `docker-compose.yml` con PostgreSQL 16
- [ ] Documentar alternativa Docker a Supabase cloud
- [ ] Verificar migraciones + seed contra PostgreSQL local
- [ ] Agregar script `db:reset` (drop + migrate + seed)

---

## Fase 3: Documentación para Humanos (Días 3–5)

### 3.1 CONTRIBUTING.md
- [ ] Crear `CONTRIBUTING.md` con setup paso a paso:
  - Prerrequisitos (Node 20+, npm, Docker opcional)
  - Clonar, instalar, configurar `.env.local`
  - Levantar DB, migrar, seedear
  - `npm run dev` → verificar
  - Cómo correr tests (unit y E2E)
  - Convenciones de commits y PRs

### 3.2 Índice de documentación
- [ ] Crear `docs/README.md` categorizando los archivos de docs/:
  - **Para devs nuevos**: CONTRIBUTING.md, ARCHITECTURE.md, CONVENTIONS.md
  - **Arquitectura**: ARCHITECTURE.md, DATABASE.md, API_STANDARDS.md
  - **Procesos**: GIT-WORKFLOW.md, TDD.md, TESTING.md
  - **Operaciones**: DEPLOYMENT.md, SECURITY.md
  - **Solo Claude Code**: CLAUDE.md, COMO_PEDIR.md, MULTI-AGENT.md, REGLAS_PREVENTIVAS.md

### 3.3 Documentación del dominio [BU-SPECIFIC]
- [ ] Documentar flujo principal del negocio (end-to-end)
- [ ] Documentar integraciones externas críticas
- [ ] Documentar modelos de datos y relaciones clave
- [ ] Documentar reglas de negocio no obvias

### 3.4 Inventario de servicios
- [ ] Crear `docs/SERVICES_INVENTORY.md`:
  - Supabase (DB), Vercel (hosting), Google OAuth, Resend (email)
  - [BU-SPECIFIC]: servicios adicionales (MercadoPago, Twilio, AFIP, etc.)
  - Dashboard URLs, accesos, ubicación de secrets
  - Costos estimados

---

## Fase 4: Testing y Calidad (Días 5–7)

### 4.1 Cobertura
- [ ] Configurar coverage en Vitest
- [ ] Documentar estado actual de coverage
- [ ] Definir umbral mínimo en CI

### 4.2 Tests faltantes
- [ ] Tests unitarios para validaciones Zod
- [ ] Tests unitarios para lógica de negocio principal [BU-SPECIFIC]
- [ ] Tests para autenticación y autorización
- [ ] Tests para multi-tenancy (si aplica)
- [ ] E2E: flujo principal del producto
- [ ] Tests para integraciones externas con mocks [BU-SPECIFIC]

### 4.3 Build verification
- [ ] `npm run build` sin warnings
- [ ] Smoke tests verdes
- [ ] Documentar QA manual si aplica

---

## Fase 5: Observabilidad (Días 7–8)

### 5.1 Error tracking
- [ ] Integrar Sentry
- [ ] Source maps configurados
- [ ] `SENTRY_DSN` en `.env.example`

### 5.2 Logging
- [ ] Logging estructurado con niveles
- [ ] Logging en endpoints críticos [BU-SPECIFIC]
- [ ] Health check (`/api/health`) con status de DB

---

## Fase 6: Deuda Técnica (Días 8–10)

### 6.1 Tech debt
- [ ] Revisar `docs/KNOWN_ISSUES.md`
- [ ] Convertir items en GitHub Issues con prioridad (P0/P1/P2)
- [ ] Resolver P0 antes del handoff

### 6.2 Seguridad
- [ ] `npm audit` limpio
- [ ] Verificar sanitización de inputs (XSS, SQL injection)
- [ ] Verificar rate limiting en endpoints públicos
- [ ] Verificar que tokens de reset tienen expiración y single-use
- [ ] Auditar multi-tenancy si aplica (todos los endpoints validan tenant)
- [ ] [BU-SPECIFIC]: auditoría de seguridad del dominio

### 6.3 Decisiones técnicas pendientes
- [ ] Documentar ADRs para decisiones técnicas importantes (en `docs/decisions/`)
- [ ] Documentar workarounds temporales y cuándo revisarlos

---

## Fase 7: Validación Final (Día 10)

### 7.1 Checklist pre-handoff
- [ ] Clone fresco → CONTRIBUTING.md → funciona
- [ ] Tests pasan en CI
- [ ] Build limpio
- [ ] `.env.example` completo
- [ ] Sin secrets en código
- [ ] Docs indexados en `docs/README.md`
- [ ] Tech debt P0 resuelto
- [ ] Migraciones versionadas en Git
- [ ] Sentry integrado
- [ ] Coverage reportado

### 7.2 Handoff prep
- [ ] Demo del producto (30 min)
- [ ] Walkthrough técnico: flujo principal
- [ ] Lista de "cosas que solo yo sé"
- [ ] Accesos transferidos al equipo

---

## Notas específicas de [BU_NAME]

> Completar esta sección con notas específicas de tu BU.
> Ejemplos de cosas que documentar acá:
> - ¿Cuál es la integración más crítica? (AFIP, MercadoPago, WhatsApp, etc.)
> - ¿Hay algún workaround temporal que sea frágil?
> - ¿Qué parte del código es la más compleja o la que más bugs genera?
> - ¿Hay algún deadline regulatorio o contractual?
