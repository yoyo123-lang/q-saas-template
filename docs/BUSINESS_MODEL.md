# Modelo de Negocio

> Este archivo documenta las reglas de negocio del proyecto.
> Es la fuente de verdad para los roles de revisión de capa 2 (Business Logic, Data/Analytics).
> Sin este archivo completo, esos roles no pueden funcionar.

> **¿Proyecto nuevo?** Completá las secciones a medida que definas el producto.
> **¿Proyecto existente?** Corré `/project:descubrimiento` para que Claude recorra el código y te ayude a llenarlo.

---

## Tipo de proyecto

<!-- Elegí uno. Esto determina qué roles de capa 2 aplican. -->

- [ ] Web simple / landing (no necesita este archivo)
- [ ] SaaS con billing
- [ ] SaaS con API pública
- [ ] Marketplace
- [ ] SaaS regulado (salud, finanzas, legal)
- [ ] Otro: [describir]

---

## Propuesta de valor

### ¿Qué problema resuelve?
[completar]

### ¿Para quién? (segmentos de usuario)
<!-- Ej: "Freelancers que necesitan facturar", "PyMEs argentinas con menos de 50 empleados" -->
[completar]

### ¿Cómo se diferencia de alternativas?
[completar]

---

## Monetización

### Modelo de ingresos
<!-- Ej: freemium, suscripción mensual/anual, por uso, comisión por transacción, ads -->
[completar]

### Planes y límites

| Plan | Precio | Límites | Features exclusivas |
|------|--------|---------|---------------------|
| [completar] | [completar] | [completar] | [completar] |

### Ciclo de billing
- Período: [mensual / anual / ambos / por uso]
- Trial: [sí/no, duración, condiciones]
- Qué pasa al vencer el trial: [completar]
- Qué pasa al downgrade: [completar — ej: "datos se mantienen 90 días, features pro se deshabilitan"]
- Qué pasa si falla el pago: [completar — ej: "3 reintentos, después suspensión"]
- Pasarela de pago: [Stripe / MercadoPago / Payway / otra]

---

## Reglas de negocio

> Estas son las reglas que el CÓDIGO debe cumplir. El Business Logic Reviewer valida contra esta lista.
> Ser lo más explícito posible. "El usuario puede X" no alcanza. "El usuario con plan Free puede crear hasta 3 proyectos; al intentar el 4to ve un modal de upgrade" sí alcanza.

### Autenticación y acceso
- Quién puede registrarse: [completar]
- Métodos de login: [email+password / Google OAuth / magic link / otro]
- Roles de usuario: [completar — ej: owner, admin, member, viewer]
- Qué puede hacer cada rol: [completar]

### Reglas por plan/rol
<!-- Listá cada regla con el formato: CUANDO [condición] ENTONCES [resultado] -->

1. [completar]
2. [completar]

### Reglas de dominio específicas
<!-- Las reglas de negocio propias del producto. Ej: "Un turno cancelado con menos de 24hs de anticipación cobra el 50%", "Los cupones de descuento no se acumulan", "El score se recalcula cada 24hs a las 3AM" -->

1. [completar]
2. [completar]

---

## Entidades de dominio

> Los conceptos centrales del producto y cómo se relacionan.
> Esto ayuda a validar que el modelo de datos refleje la realidad del negocio.

```
[Completar con diagrama de relaciones. Ej:]

Tenant (organización)
  └── User (miembro del tenant)
       └── Project (creado por el user, pertenece al tenant)
            └── Invoice (asociada al project)

Subscription (1 por tenant)
  └── Plan (free, pro, enterprise)
```

### Invariantes de datos
<!-- Condiciones que SIEMPRE deben ser verdaderas en la base de datos -->

1. [completar — ej: "Todo user pertenece a exactamente un tenant"]
2. [completar — ej: "No puede haber dos subscriptions activas para el mismo tenant"]
3. [completar — ej: "El monto de una invoice no puede ser negativo"]

---

## Métricas clave

> El Data/Analytics Reviewer valida que estas métricas estén siendo medidas.

### Métricas de negocio
| Métrica | Definición | Dónde se mide |
|---------|-----------|---------------|
| [ej: MRR] | [ej: Suma de suscripciones activas mensualizadas] | [ej: dashboard admin] |

### Eventos de funnel
<!-- Los eventos que marcan el recorrido del usuario. El código debe trackearlos. -->

| Evento | Cuándo se dispara | Prioridad |
|--------|-------------------|-----------|
| [ej: signup_completed] | [ej: Usuario confirma email] | Alta |
| [ej: first_project_created] | [ej: Usuario crea su primer proyecto] | Alta |
| [ej: trial_converted] | [ej: Usuario pasa de trial a pago] | Crítica |

### Alertas de negocio
<!-- Situaciones que deberían generar una alerta/notificación al equipo -->

1. [completar — ej: "Churn rate > 5% mensual"]
2. [completar — ej: "Pago fallido 3 veces seguidas"]

---

## Integraciones externas

| Servicio | Para qué se usa | Criticidad |
|----------|-----------------|------------|
| [completar] | [completar] | [alta/media/baja] |

---

## Historial de cambios

| Fecha | Qué cambió | Por qué |
|-------|-----------|---------|
| [completar] | [completar] | [completar] |
