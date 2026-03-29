# Modelo de Negocio — Qontrata

> Fuente de verdad del modelo de negocio para el Q Company Board.
> Los roles de revision (Business Logic, Data/Analytics) validan contra este documento.

---

## Tipo de proyecto

- [x] SaaS con billing

---

## Propuesta de valor

### Que problema resuelve?

Las PyMEs y empresas medianas argentinas no tienen herramientas accesibles para gestionar reclutamiento de forma profesional. Publican en multiples sitios, reciben CVs por email, y pierden candidatos por falta de seguimiento.

### Para quien?

- PyMEs argentinas con 5-200 empleados que contratan regularmente
- Empresas medianas que necesitan un pipeline de reclutamiento estructurado
- Candidatos buscando empleo en el mercado argentino

### Como se diferencia?

- Precio accesible para PyMEs (plan gratuito funcional)
- Pipeline completo integrado (publicacion → postulacion → entrevista → contratacion)
- Multi-empresa desde el dia 1 (cada empresa es un tenant aislado)
- Mercado argentino con pagos en MercadoPago

---

## Monetizacion

### Modelo de ingresos

Freemium con suscripcion mensual. Plan gratuito limitado + planes pagos con mas capacidad.

### Planes y limites

| Plan | Precio | Puestos activos | Usuarios | CVs descargados | Puestos destacados |
|------|--------|-----------------|----------|-----------------|-------------------|
| BASICO | Gratis | Limitado | Limitado | Limitado | No |
| PROFESIONAL | Pago mensual | Mas | Mas | Mas | Si |
| ENTERPRISE | Pago mensual | Sin limite | Sin limite | Sin limite | Si |

> Los limites exactos por plan se definen en la configuracion del sistema y se enforcean en runtime.

### Ciclo de billing

- Periodo: Mensual
- Trial: Por definir
- Pasarela: MercadoPago (checkout pro + webhooks)
- Sistema de creditos por empresa para operaciones puntuales
- Si falla el pago: Reintento automatico via MercadoPago, despues suspension de features pagos

---

## Reglas de negocio

### Autenticacion y acceso

- **SUPER_ADMIN**: Login via Google OAuth. Acceso cross-tenant a todas las empresas, reportes globales, gestion de planes.
- **EMPRESA_ADMIN**: Login via Google OAuth o email+password. Gestiona su empresa: puestos, postulaciones, entrevistas, usuarios, billing.
- **EMPRESA_USER**: Login via Google OAuth o email+password. Acceso limitado dentro de su empresa (segun permisos otorgados por el admin).
- **CANDIDATO**: Registro y login via email+password o Google OAuth. Puede postularse a puestos publicos, ver estado de sus postulaciones.

### Reglas por plan/rol

1. CUANDO una empresa con plan BASICO intenta publicar mas puestos del limite ENTONCES se muestra modal de upgrade
2. CUANDO una empresa con plan BASICO intenta agregar mas usuarios del limite ENTONCES se bloquea la accion y se sugiere upgrade
3. CUANDO una empresa intenta descargar mas CVs del limite de su plan ENTONCES se bloquea y se sugiere upgrade o compra de creditos
4. CUANDO una empresa con plan BASICO intenta destacar un puesto ENTONCES se muestra modal de upgrade (feature exclusiva de planes pagos)
5. CUANDO un EMPRESA_USER intenta acceder a una seccion sin permisos ENTONCES se muestra error 403
6. CUANDO un CANDIDATO intenta acceder al dashboard de empresa ENTONCES se redirige a su vista de candidato

### Reglas de dominio especificas

1. Un puesto pasa por estados: BORRADOR → PUBLICADO → PAUSADO → CERRADO
2. Una postulacion pasa por estados: RECIBIDA → EN_REVISION → ENTREVISTA → CONTRATADA → RECHAZADA
3. Solo puestos en estado PUBLICADO son visibles para candidatos
4. Un candidato no puede postularse dos veces al mismo puesto
5. Una entrevista se agenda sobre una postulacion en estado EN_REVISION o ENTREVISTA
6. Marcar una postulacion como CONTRATADA cierra automaticamente el puesto (o no, configurable por empresa)
7. Los creditos de empresa se descuentan al realizar operaciones puntuales (ej: destacar puesto, descargar CV)

---

## Entidades de dominio

```
Empresa (tenant)
  ├── EmpresaUsuario (EMPRESA_ADMIN / EMPRESA_USER)
  ├── Puesto (publicado por la empresa)
  │     └── Postulacion (candidato → puesto)
  │           └── Entrevista (agendada sobre postulacion)
  ├── Suscripcion (1 activa por empresa → Plan)
  └── CreditoEmpresa (saldo de creditos)

Candidato (registro independiente)
  └── Postulacion (candidato → puesto)

Plan (BASICO / PROFESIONAL / ENTERPRISE)
  └── Limites (puestos, usuarios, CVs, destacados)
```

### Invariantes de datos

1. Toda empresa tiene exactamente una suscripcion activa (puede ser plan BASICO gratuito)
2. Todo puesto pertenece a exactamente una empresa
3. Toda postulacion referencia un candidato y un puesto
4. No puede haber dos postulaciones del mismo candidato al mismo puesto
5. Una entrevista siempre esta asociada a una postulacion existente
6. Los creditos de una empresa no pueden ser negativos
7. Un EMPRESA_USER pertenece a exactamente una empresa

---

## Metricas clave

### Metricas de negocio

| Metrica | Definicion | Donde se mide |
|---------|-----------|---------------|
| empresas_activas | COUNT(empresas WHERE activa=true) en el mes actual | Cron board-heartbeat |
| puestos_publicados | COUNT(puestos WHERE estado=PUBLICADO) en el mes actual | Cron board-heartbeat |
| postulaciones_mes | COUNT(postulaciones creadas este mes) | Cron board-heartbeat |
| candidatos_registrados | COUNT(candidatos) total | Board (propuesto) |
| entrevistas_mes | COUNT(entrevistas creadas este mes) | Board (propuesto) |
| contrataciones_mes | COUNT(postulaciones WHERE estado=CONTRATADA este mes) | Board (propuesto) |
| mrr_simulado | Suma de suscripciones activas x precio del plan | Board (propuesto) |
| empresas_plan_pro | COUNT(suscripciones activas plan PROFESIONAL) | Board (propuesto) |
| empresas_plan_enterprise | COUNT(suscripciones activas plan ENTERPRISE) | Board (propuesto) |
| tasa_conversion_postulacion | contrataciones_mes / postulaciones_mes | Board (propuesto) |

### Eventos de funnel

| Evento | Cuando se dispara | Prioridad |
|--------|-------------------|-----------|
| empresa_creada | Se crea empresa (onboarding o admin) | Alta |
| puesto_publicado | Un puesto cambia a estado PUBLICADO | Alta |
| postulacion_recibida | Un candidato se postula (ruta publica) | Alta |
| postulacion_avanzada | Se cambia el estado de una postulacion | Media |
| entrevista_agendada | Se crea una entrevista | Media |
| contratacion_realizada | Se marca postulacion como CONTRATADA | Critica |
| suscripcion_activada | Se activa una suscripcion paga | Critica |
| suscripcion_cancelada | Se cancela una suscripcion | Critica |

### Alertas de negocio

1. Churn: empresa cancela suscripcion paga
2. Empresa llega al 90% de su limite de puestos (oportunidad de upgrade)
3. MRR cae respecto al mes anterior
4. Empresa creada hace 30 dias sin publicar ningun puesto (riesgo de abandono)

---

## Integraciones externas

| Servicio | Para que se usa | Criticidad |
|----------|----------------|------------|
| MercadoPago | Checkout de suscripciones + webhooks de pago | Alta |
| Google OAuth | Autenticacion de usuarios | Alta |
| Supabase | Base de datos PostgreSQL | Alta |
| Vercel | Hosting y deploy | Alta |
| Q Company Board | Reportes de metricas via heartbeat | Media |

---

## Historial de cambios

| Fecha | Que cambio | Por que |
|-------|-----------|---------|
| 2026-03-29 | Creacion inicial | Documentar modelo de negocio de Qontrata para el Board |
