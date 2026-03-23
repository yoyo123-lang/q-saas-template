# Arquitectura del Proyecto

> Fuente de verdad de arquitectura. Este archivo debe quedar completo en onboarding técnico.

## 1) Visión del proyecto (obligatorio)

- **Proyecto en una oración:** [completar]
- **Problema que resuelve / para quién:** [completar]
- **Objetivos de negocio (no técnicos):** [completar]
- **Alcance (sí/no):** [completar]
- **Estado actual:** MVP / beta / producción
- **Roadmap:** [link]

## 2) Arquitectura del sistema

## 2.1 Diagrama general (C4-lite/ASCII)

```text
[Clientes] -> [API Gateway] -> [Servicio App] -> [DB]
                         \-> [Cache/Queue]
                         \-> [Servicios externos]
```

## 2.2 Estilo arquitectónico

- Tipo elegido: monolito modular / microservicios / híbrido.
- Justificación: [coste, velocidad, escalado, equipo].

## 2.3 Módulos/servicios

| Módulo | Responsabilidad | Datos que maneja | Owner |
|---|---|---|---|
| auth | login/autorización | usuarios/sesiones | [owner] |
| billing | cobros/facturas | pagos/transacciones | [owner] |

## 2.4 Comunicación interna

| Origen | Destino | Mecanismo | Contrato |
|---|---|---|---|
| api | auth | HTTP interno | OpenAPI |
| app | worker | Cola/evento | esquema evento v1 |

## 2.5 Dependencias externas

| Servicio | Uso | Riesgo | Fallback |
|---|---|---|---|
| proveedor_x | pagos | crítico | retry + cola + alerta |

## 2.6 ADRs

- Las decisiones arquitectónicas se registran con `ADR-TEMPLATE.md`.
- Listar ADRs activos:
  - `ADR-0001-sistema-documentacion-modular.md`

## 3) Stack tecnológico

| Componente | Tecnología | Versión exacta | Motivo |
|---|---|---|---|
| Lenguaje | [ej. TypeScript] | [x.y.z] | [completar] |
| Framework | [ej. NestJS] | [x.y.z] | [completar] |
| Base de datos | [ej. PostgreSQL] | [x.y] | [completar] |
| Cache/cola | [ej. Redis] | [x.y] | [completar] |
| Infra | [ej. AWS/GCP] | n/a | [completar] |

## 3.1 Tecnologías prohibidas/deprecadas

- [completar: librerías o versiones no permitidas]

## 4) Estructura de carpetas

> Mantener actualizado al cambiar estructura.

```text
/ (raíz)
  ARCHITECTURE.md
  CONVENTIONS.md
  SECURITY.md
  TESTING.md
  API_STANDARDS.md
  DATABASE.md
  DEPLOYMENT.md
  OPERATIONS.md
```

## 5) Variables de entorno

- Definir todas en `.env.example`.
- Documentar propósito y ambiente en `DEPLOYMENT.md`.

## 6) Restricciones conocidas

- Límites técnicos / presupuestarios / de compliance.
- Riesgos conocidos y mitigaciones.

---

*Última actualización: 2026-02-18*
