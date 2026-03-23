# Deploy y Operaciones por Ambiente

> Objetivo: que cualquier persona (o agente) pueda desplegar y revertir sin ambigüedad.
> Para verificación de build y QA funcional antes de push → ver `PRE_DEPLOY_AND_QA.md`.

## 1) Ambientes

| Ambiente | Objetivo | Rama fuente | URL | Responsable |
|---|---|---|---|---|
| local | Desarrollo y pruebas manuales | feature/* | localhost | Equipo dev |
| staging | Validación pre-producción | develop / release/* | [URL_STAGING] | Equipo QA/tech lead |
| production | Servicio real a usuarios | main | [URL_PROD] | Owner on-call |

## 2) Variables por ambiente (mínimo)

- Mantener sincronizado con `.env.example`.
- Nunca usar secretos reales en docs.

| Variable | Local | Staging | Prod | Descripción |
|---|---|---|---|---|
| DATABASE_URL | ✅ | ✅ | ✅ | Conexión DB (Supabase PostgreSQL) |
| DIRECT_URL | ✅ | ✅ | ✅ | Conexión directa (migraciones Prisma) |
| NEXTAUTH_URL | ✅ | auto (Vercel) | auto (Vercel) | URL base de la app |
| NEXTAUTH_SECRET | ✅ | ✅ | ✅ | Firma de sesiones NextAuth |
| GOOGLE_CLIENT_ID | ✅ | ✅ | ✅ | OAuth client ID |
| GOOGLE_CLIENT_SECRET | ✅ | ✅ | ✅ | OAuth client secret |
| ADMIN_EMAIL | ✅ | ✅ | ✅ | Email del admin (seed + auto-promoción) |

> **Nota:** Esta tabla refleja las variables reales del template. Verificar contra `.env.example` como fuente de verdad. Proyectos derivados pueden agregar variables propias (APP_ENV, LOG_LEVEL, REDIS_URL, etc.).

## 3) Checklist pre-deploy

> Detalle completo del proceso de build local en `PRE_DEPLOY_AND_QA.md` (Parte 1).

- [ ] Build local verde y reproducible (`npm run build` sin errores).
- [ ] Lint sin errores.
- [ ] Tests unitarios, integración y smoke test en verde.
- [ ] QA funcional: la funcionalidad produce resultados reales → ver `PRE_DEPLOY_AND_QA.md` (Parte 2).
- [ ] Migraciones revisadas (forward + rollback documentado).
- [ ] Variables de entorno confirmadas contra `.env.example`.
- [ ] Alertas y dashboards activos.
- [ ] Ventana de despliegue aprobada.
- [ ] Plan de rollback validado.

## 4) Flujo de deploy

### 4.1 Staging

1. Merge de rama a `develop` o `release/*`.
2. CI ejecuta: lint + tests + build + security checks.
3. Deploy automático a staging.
4. Correr smoke tests y pruebas manuales críticas.
5. Aprobación explícita para promover a producción.

### 4.2 Producción

1. Crear tag de release (`vX.Y.Z`).
2. CI ejecuta pipeline de release.
3. Aplicar migraciones compatibles hacia adelante.
4. Deploy gradual (rolling/canary si aplica).
5. Verificar health checks y métricas de error/latencia.
6. Cerrar release con changelog.

## 5) Runbook de rollback

### Condiciones para rollback inmediato

- Error rate > umbral por 5 min.
- Degradación severa de latencia p95.
- Falla de autenticación/autorización.
- Fallas de negocio crítico (pagos, registro, checkout, etc.).

### Pasos

1. Pausar nuevas promociones.
2. Revertir a la última versión estable.
3. Si la migración no es backward compatible, ejecutar rollback DB documentado.
4. Validar health checks + smoke tests mínimos.
5. Comunicar incidente y abrir postmortem.

## 6) DNS, dominios y SSL

- Registrar dominios y subdominios por ambiente.
- Forzar HTTPS y redirección de HTTP.
- Renovación automática de certificados (o tarea operacional con recordatorio).
- HSTS habilitado en producción.

## 7) Entregables mínimos para declarar "operable"

- [ ] Este archivo completado con valores reales por proyecto.
- [ ] `OPERATIONS.md` con alertas y procedimiento de incidentes.
- [ ] `API_STANDARDS.md` referenciado por backend.
- [ ] `DATABASE.md` con migraciones/backups/seeds.
