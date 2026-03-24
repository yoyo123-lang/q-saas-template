# Arquitectura del Proyecto

> Fuente de verdad de arquitectura para [nombre del proyecto].
> Este archivo es generado durante el onboarding (`/project:onboard`) y debe mantenerse actualizado.
> Copiá este template y reemplazá todos los `[completar]` con datos reales de tu proyecto.

## 1) Visión del proyecto

- **Proyecto en una oración:** [completar]
- **Problema que resuelve / para quién:** [completar]
- **Objetivos de negocio:** [completar]
- **Alcance:** [completar — qué incluye y qué NO incluye]
- **Estado actual:** [completar — MVP, beta, producción, etc.]
- **Roadmap:** [completar]

## 2) Arquitectura del sistema

### 2.1 Diagrama general

```text
[completar — diagrama ASCII del flujo principal]
Ejemplo:
[Browser] → [Framework] → [API/Routes]
                               ↓
                          [ORM/Queries]
                               ↓
                          [Base de datos]
```

### 2.2 Estilo arquitectónico

- Tipo: [completar — monolito, microservicios, serverless, etc.]
- Justificación: [completar]

### 2.3 Módulos

| Módulo | Responsabilidad | Datos que maneja |
|---|---|---|
| [completar] | [completar] | [completar] |

### 2.4 Comunicación interna

| Origen | Destino | Mecanismo |
|---|---|---|
| [completar] | [completar] | [completar — REST, gRPC, eventos, queries directas, etc.] |

### 2.5 Dependencias externas

| Servicio | Uso | Riesgo | Fallback |
|---|---|---|---|
| [completar] | [completar] | Alto/Medio/Bajo | [completar o "sin fallback"] |

### 2.6 ADRs

- (Se crean durante la adopción en `docs/decisions/`)

## 3) Stack tecnológico

| Componente | Tecnología | Versión | Motivo |
|---|---|---|---|
| Lenguaje | [completar] | [completar] | [completar] |
| Framework | [completar] | [completar] | [completar] |
| Estilos | [completar] | [completar] | [completar] |
| Base de datos | [completar] | [completar] | [completar] |
| ORM | [completar o "sin ORM"] | [completar] | [completar] |
| Auth | [completar] | [completar] | [completar] |
| Validación | [completar] | [completar] | [completar] |
| Deploy | [completar] | [completar] | [completar] |

### 3.1 Tecnologías prohibidas/deprecadas

- [completar — qué NO usar en este proyecto y por qué]

## 4) Estructura de carpetas

```text
[completar — árbol de carpetas real del proyecto]
```

## 5) Variables de entorno

Definidas en `.env.example`:

| Variable | Propósito | Requerida |
|---|---|---|
| [completar] | [completar] | Sí/No |

## 6) Restricciones conocidas

- [completar — limitaciones técnicas, de negocio, o convenciones obligatorias]

---

*Última actualización: [completar]*
