# Metrics Map — Qontrata

> Mapeo completo de metricas y eventos de negocio para el Q Company Board.
> Este archivo es la referencia para implementar el cron heartbeat y los event dispatchers.

---

## Metricas del Heartbeat (cron cada 5 min)

Endpoint: `/api/cron/board-heartbeat`

### Metricas activas (ya implementadas)

| Key | Que mide | Query | Periodo |
|-----|----------|-------|---------|
| `empresas_activas` | Empresas con flag activa=true | `COUNT(empresas WHERE activa=true)` | Mes actual |
| `puestos_publicados` | Puestos en estado publicado | `COUNT(puestos WHERE estado=PUBLICADO)` | Mes actual |
| `postulaciones_mes` | Postulaciones nuevas del mes | `COUNT(postulaciones WHERE createdAt >= inicioMes)` | Mes actual |

### Metricas propuestas (pendientes de implementacion)

| Key | Que mide | Query | Periodo | Prioridad |
|-----|----------|-------|---------|-----------|
| `candidatos_registrados` | Total de candidatos en plataforma | `COUNT(candidatos)` | Acumulado | Media |
| `entrevistas_mes` | Entrevistas agendadas este mes | `COUNT(entrevistas WHERE createdAt >= inicioMes)` | Mes actual | Media |
| `contrataciones_mes` | Postulaciones marcadas como contratadas | `COUNT(postulaciones WHERE estado=CONTRATADA AND updatedAt >= inicioMes)` | Mes actual | Alta |
| `mrr_simulado` | Revenue mensual recurrente | `SUM(planes.precio WHERE suscripcion.activa=true)` | Snapshot | Alta |
| `empresas_plan_pro` | Empresas en plan PROFESIONAL | `COUNT(suscripciones WHERE plan=PROFESIONAL AND activa=true)` | Snapshot | Media |
| `empresas_plan_enterprise` | Empresas en plan ENTERPRISE | `COUNT(suscripciones WHERE plan=ENTERPRISE AND activa=true)` | Snapshot | Media |
| `tasa_conversion_postulacion` | Ratio contrataciones/postulaciones | `contrataciones_mes / postulaciones_mes` | Mes actual | Media |

---

## Eventos de negocio (fire-and-forget)

Estos eventos se disparan en el momento que ocurren y se envian al Board como notificaciones.

### Eventos activos (ya integrados)

| Evento | Se dispara cuando... | Archivo fuente | Payload clave |
|--------|---------------------|----------------|---------------|
| `empresa_creada` | Se crea una empresa (onboarding o admin) | `onboarding/empresa/actions.ts`, `admin/empresas/route.ts` | empresaId, nombre, plan |
| `puesto_publicado` | Un puesto cambia a estado PUBLICADO | `admin/puestos/[id]/estado/route.ts` | puestoId, empresaId, titulo |
| `postulacion_recibida` | Un candidato se postula a un puesto | `public/postulaciones/route.ts` | postulacionId, puestoId, candidatoId |
| `postulacion_avanzada` | Se cambia el estado de una postulacion | `admin/postulaciones/[id]/estado/route.ts` | postulacionId, estadoAnterior, estadoNuevo |
| `entrevista_agendada` | Se crea una entrevista | `admin/entrevistas/route.ts` | entrevistaId, postulacionId, fecha |
| `contratacion_realizada` | Se marca una postulacion como contratada | `admin/contratados/[postulacionId]/marcar/route.ts` | postulacionId, puestoId, candidatoId |
| `suscripcion_activada` | Se activa una suscripcion paga | `services/billing-service.ts` | empresaId, plan, monto |
| `suscripcion_cancelada` | Se cancela una suscripcion | `services/billing-service.ts` | empresaId, planAnterior |

### Eventos propuestos (pendientes)

| Evento | Se dispararia cuando... | Prioridad |
|--------|------------------------|-----------|
| `empresa_limite_alcanzado` | Empresa llega al 90%+ de un limite de su plan | Media |
| `candidato_registrado` | Un candidato se registra por primera vez | Baja |
| `puesto_cerrado` | Un puesto pasa a estado CERRADO | Baja |

---

## Formato de envio al Board

### Heartbeat payload

```json
{
  "bu": "qontrata",
  "timestamp": "2026-03-29T12:00:00Z",
  "metrics": {
    "empresas_activas": 42,
    "puestos_publicados": 156,
    "postulaciones_mes": 1230,
    "contrataciones_mes": 45,
    "mrr_simulado": 125000,
    "empresas_plan_pro": 18,
    "empresas_plan_enterprise": 3,
    "candidatos_registrados": 8500,
    "entrevistas_mes": 89,
    "tasa_conversion_postulacion": 0.037
  }
}
```

### Event payload

```json
{
  "bu": "qontrata",
  "event": "contratacion_realizada",
  "timestamp": "2026-03-29T14:30:00Z",
  "data": {
    "postulacionId": "...",
    "puestoId": "...",
    "candidatoId": "...",
    "empresaId": "..."
  }
}
```

---

## Implementacion

### Heartbeat

- Cron: cada 5 minutos via Vercel Cron
- Ruta: `/api/cron/board-heartbeat`
- Queries: Prisma contra Supabase PostgreSQL
- Destino: Q Company Board API

### Eventos

- Patron: fire-and-forget (no bloquean la operacion principal)
- Si el Board no responde, el evento se pierde (aceptable — las metricas del heartbeat son la fuente de verdad numerica)
- Los eventos son complementarios: dan contexto temporal, no reemplazan al heartbeat

---

## Historial de cambios

| Fecha | Que cambio | Por que |
|-------|-----------|---------|
| 2026-03-29 | Creacion inicial | Mapear metricas y eventos existentes + propuestos para el Board |
