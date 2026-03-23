# Monitoreo, Logs e Incidentes

> Qué monitorear, cómo loguear, umbrales de alerta y procedimiento de incidentes.

## 1) Qué monitorear

- **Disponibilidad**: uptime y health checks.
- **Performance**: latencia p50/p95/p99 por endpoint crítico.
- **Errores**: tasa 4xx/5xx y errores de negocio.
- **Infra**: CPU, memoria, disco, conexiones DB.
- **Dependencias externas**: latencia y tasa de fallo por proveedor.

## 2) Niveles de logs

- `DEBUG`: sólo en local/staging.
- `INFO`: eventos de negocio relevantes.
- `WARN`: degradaciones recuperables.
- `ERROR`: fallas operativas o de negocio.

### Nunca loguear

- contraseñas,
- tokens,
- secretos,
- PII sin enmascarar.

## 3) Alertas mínimas

| Alerta | Umbral sugerido | Canal |
|---|---|---|
| Error rate 5xx alto | >2% durante 5 min | Pager + Slack |
| Latencia p95 alta | >2x baseline durante 10 min | Slack |
| Caída de dependencia crítica | 3 fallos consecutivos | Pager |
| DB saturada | >85% conexiones sostenidas | Slack |

## 4) Procedimiento de incidente

1. Detectar y clasificar severidad (SEV1/SEV2/SEV3).
2. Nombrar Incident Commander.
3. Mitigar impacto (feature flag, rollback, failover).
4. Comunicar estado cada 15 min.
5. Cerrar con postmortem en <72h.

## 5) Postmortem (template)

- Timeline.
- Causa raíz.
- Impacto y alcance.
- Qué funcionó / qué falló.
- Acciones correctivas (due date + owner).
