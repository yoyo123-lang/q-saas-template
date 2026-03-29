# Instrucciones de Conexión al Q Company Board

> **Para**: una sesión de Claude Code trabajando en el repo de una BU (ej: Qautiva)
> **Objetivo**: conectar esta BU al Board central de Q Company para recibir docs sincronizados, enviar métricas y recibir directivas
> **Prerrequisito**: que el onboarding de docs ya se haya hecho en el repo de q-company (los archivos BUSINESS_MODEL.md, METRICS_MAP.md y BOARD_CONTEXT.md ya existen en `docs/bu/{slug}/`)

## Orden de lectura recomendado

Antes de empezar la implementación técnica, leer en este orden:

1. `docs/board/BOARD_CONTEXT.md` — Qué es el Board, cómo funciona la conexión
2. `docs/board/BUSINESS_MODEL.md` — El modelo de negocio de esta BU (fuente de verdad)
3. `docs/board/METRICS_MAP.md` — Qué métricas enviar y a qué roles AI del Board alimentan
4. Este documento — Implementación técnica paso a paso

> Si los archivos del Board todavía no llegaron (la carpeta `docs/board/` está vacía), significa que el sync desde q-company no corrió todavía. Pedile al admin del Board que lo ejecute.

---

## Contexto

Q Company es un grupo empresarial con un Board central (repo `q-company`) que funciona como directorio ejecutivo con roles AI (CFO, CTO, CRO, CSO, VP Product, VP Engineering).

### Flujo de documentos

Los documentos de negocio (BUSINESS_MODEL.md, METRICS_MAP.md, BOARD_CONTEXT.md) se **crean y editan en q-company**. Un workflow de GitHub Actions los sincroniza automáticamente al repo de la BU via PR. La BU **no crea estos archivos** — solo los recibe.

```
q-company (fuente de verdad)
  docs/bu/{slug}/BUSINESS_MODEL.md
  docs/bu/{slug}/METRICS_MAP.md
  docs/bu/{slug}/BOARD_CONTEXT.md
        │
        │  workflow: sync-bu-docs.yml
        │  (push a main → crea PR en repo de la BU)
        ▼
repo de la BU (copia sincronizada)
  docs/board/BUSINESS_MODEL.md
  docs/board/METRICS_MAP.md
  docs/board/BOARD_CONTEXT.md
```

### Comunicación en runtime

- **BU → Board**: métricas, eventos, heartbeat (HTTP POST con API key en header `x-api-key`)
- **Board → BU**: directivas (HTTP POST con firma HMAC-SHA256 en header `x-board-signature`)

---

## TAREA 1: Preparar carpeta para recibir docs sincronizados

Crear la carpeta donde van a llegar los docs desde q-company:

```bash
mkdir -p docs/board
touch docs/board/.gitkeep
```

> Los archivos BUSINESS_MODEL.md, METRICS_MAP.md y BOARD_CONTEXT.md van a llegar via PR automático desde q-company. No los crees manualmente.

---

## TAREA 2: Configurar variables de entorno

Pedirle al usuario las credenciales del Board y agregarlas al `.env`:

### Cómo obtener las credenciales

Las credenciales se generan automáticamente cuando el admin del Board registra esta BU en el dashboard de Q Company (`/dashboard` → crear nueva BU). El admin va a recibir:

- **BOARD_API_KEY**: se muestra UNA SOLA VEZ al crear la BU (formato: `qb_{slug}_{key}`). Si se pierde, hay que regenerarla.
- **BOARD_BU_ID**: el ID de la BU en el Board (visible en la URL del dashboard: `/dashboard/bu/{id}`)
- **BOARD_WEBHOOK_SECRET**: se genera automáticamente (formato: `whsec_{secret}`). Se puede regenerar desde el dashboard.
- **BOARD_URL**: siempre es `https://q-company.vercel.app` en producción.

> Si no tenés las credenciales, contactá al admin del Board antes de avanzar con la implementación técnica.

```env
BOARD_API_KEY=qb_{slug}_{key}       # API key de la BU (la provee el admin del Board)
BOARD_BU_ID={buId}                   # ID de la BU en el Board
BOARD_URL=https://q-company.vercel.app
BOARD_WEBHOOK_SECRET={secret}        # Para verificar directivas recibidas del Board
CRON_SECRET={secret}                 # Para proteger endpoints de cron
```

**Reglas de seguridad:**
- Nunca hardcodear keys en el código
- Nunca logear API keys
- HTTPS obligatorio en producción

---

## TAREA 3: Personalizar Board Client

El template ya incluye `src/lib/board-client.ts` con todas las funciones necesarias:

- `sendHeartbeat(version, uptimeSeconds, checks)` — cada 5 minutos
- `sendMetrics(metrics[])` — máximo 100 por request
- `sendEvents(events[])` — máximo 100 por request, occurred_at en UTC ISO
- `updateDirectiveStatus(directiveId, status, notes?, result?)` — reportar progreso de directivas

El board-client funciona en modo "desconectado" cuando faltan env vars (útil en desarrollo).

---

## TAREA 4: Personalizar métricas

Editar dos archivos con las métricas reales de esta BU:

1. `src/app/api/cron/board-metrics/route.ts` — función `collectMetrics()`
2. `src/app/api/v1/directives/receive/route.ts` — función `collectAndSendMetrics()`

Ambas deben calcular las mismas métricas. Ejemplos por tipo de BU:

| Tipo de BU | Métricas típicas |
|------------|-----------------|
| SaaS | mrr, arpu, active_organizations, churn_rate, activation_rate |
| Marketplace | activos_activos, volumen_transacciones, tasa_conversion, revenue |
| HR | empresas_activas, puestos_publicados, postulaciones_mes |
| Contabilidad | monthly_revenue, invoices_issued, pos_transactions, avg_invoice_value |
| AI Platform | active_clients, projects_in_progress, credits_revenue, domains_revenue |

---

## TAREA 5: Verificar crons en vercel.json

El template ya incluye los crons configurados. Verificar que estén presentes en `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/board-heartbeat", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/board-metrics", "schedule": "0 8 * * 1" }
  ]
}
```

Si la BU necesita métricas mensuales además de semanales, agregar:
```json
{ "path": "/api/cron/board-metrics-monthly", "schedule": "0 8 1 * *" }
```

---

## TAREA 6: Agregar referencia al CLAUDE.md

Agregar esta sección al `CLAUDE.md` del repo:

```markdown
## Conexión con Q Company Board

Esta BU pertenece al grupo Q Company y reporta al Board central.
Ver `docs/board/BOARD_CONTEXT.md` para entender la conexión.

Archivos sincronizados con el Board (llegan via PR automático desde q-company):
- `docs/board/BUSINESS_MODEL.md` — modelo de negocio (fuente de verdad)
- `docs/board/BOARD_CONTEXT.md` — contexto de conexión y directivas
- `docs/board/METRICS_MAP.md` — mapeo de métricas a roles AI del Board

Estos archivos se editan en el repo de q-company, NO acá. Los cambios llegan via PR automático.
```

---

## TAREA 7: Test de conexión

Verificar que la conexión funciona enviando una métrica de prueba:

```typescript
import { sendMetrics } from '@/lib/board-client'

await sendMetrics([
  { key: 'test_metric', value: 1, period: new Date().toISOString().slice(0, 10) }
])
```

Si responde `201` con `{ success: true }`, la conexión está OK.

---

## Checklist final

- [ ] Carpeta `docs/board/` creada (con `.gitkeep`)
- [ ] Variables de entorno configuradas (`BOARD_API_KEY`, `BOARD_BU_ID`, `BOARD_URL`, `BOARD_WEBHOOK_SECRET`, `CRON_SECRET`)
- [ ] Variables agregadas al `.env.example`
- [ ] Board client revisado (`src/lib/board-client.ts`)
- [ ] Métricas personalizadas para esta BU
- [ ] Métricas actualizadas en `src/lib/board-metrics.ts` (fuente única de verdad)
- [ ] Heartbeat cron configurado (cada 5 minutos)
- [ ] Metrics cron configurado (semanal + mensual si aplica)
- [ ] Endpoint `/api/v1/directives/receive` funcionando con validación HMAC
- [ ] `CLAUDE.md` actualizado con referencia al Board
- [ ] Test de conexión exitoso (métrica de prueba enviada)
- [ ] Commit con mensaje: `feat: conectar BU al Q Company Board`

---

## Notas para la sesión de Claude Code

- **Los docs de negocio NO se crean acá.** Se crean en q-company y llegan via PR de sync.
- **Las credenciales las provee el admin del Board.** Si el usuario no las tiene, pedírselas antes de avanzar.
- **El board-client usa modo desconectado** cuando faltan env vars — no rompe el flujo principal.
- **Si la API del Board falla**, el retry con exponential backoff ya está implementado en board-client.ts.
- **El heartbeat es lo más urgente** — si no llega en 15 min, el Board genera alerta.
- **Eventos son fire-and-forget** — nunca hacer `await sendEvents(...)` en el flujo principal. Usar `.catch()`.
