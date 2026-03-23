# Estimación de Dificultad y Tiempo

> Guía para estimar tareas en minutos-modelo y planificar sesiones.
> Usar como referencia al crear planes de implementación → ver `PLANNING.md`.

## Tabla de referencia por tipo de tarea

| Tipo de tarea | Ejemplo | Opus (min) | Sonnet (min) |
|---------------|---------|-----------|-------------|
| Tarea atómica trivial | Renombrar variable, agregar campo a tipo existente | 1-2 | 2-3 |
| Tarea atómica simple | Crear archivo con función pura + test | 2-4 | 3-5 |
| Tarea atómica media | Endpoint CRUD + validación + test | 4-7 | 5-10 |
| Tarea atómica compleja | Integración con servicio externo + manejo de errores + test | 7-12 | 10-15 |
| Etapa (3-5 tareas) | Modelo de datos completo con migraciones y tests | 15-30 | 20-40 |
| Feature chico (1-2 etapas) | ABM completo de una entidad | 30-60 | 40-80 |
| Feature mediano (3-4 etapas) | Sistema de notificaciones con real-time | 60-120 | 80-160 |
| Feature grande (5+ etapas) | Auth completo con OAuth + roles + permisos | 120-240 | 160-320 |

### Factores multiplicadores

| Factor | Multiplicador |
|--------|--------------|
| Código existente bien estructurado | x0.8 |
| Código legacy sin tests | x1.5 |
| Primera vez con la tecnología | x1.3 |
| Documentación/revisión incluida | x1.2 |
| Cambio que toca >5 archivos | x1.2 |

## Cuándo usar Opus vs Sonnet

| Escenario | Modelo recomendado |
|-----------|-------------------|
| Tareas atómicas y cambios simples | Sonnet |
| Etapas de implementación estándar | Sonnet |
| Diseño de arquitectura o APIs | Opus |
| Debugging de problemas difíciles | Opus |
| Cambios que tocan >5 archivos con lógica compleja | Opus |
| Refactors grandes con muchas dependencias | Opus |
| Documentación y configuración | Sonnet |

**Regla práctica:** Sonnet para ejecutar, Opus para pensar. Si la tarea requiere más razonamiento que escritura de código, usá Opus.

## Estimación de sesiones

Una sesión es una unidad de trabajo continuo con Claude Code. Planificar sesiones ayuda a dividir el trabajo en bloques manejables.

### Capacidad por sesión

| Modelo | Capacidad típica por sesión | Máximo recomendado |
|--------|---------------------------|-------------------|
| Opus | 60-90 min de trabajo efectivo | 120 min |
| Sonnet | 45-70 min de trabajo efectivo | 90 min |

### Reglas para dividir en sesiones

1. **Una sesión = una unidad lógica completa.** Al terminar la sesión, todo debe compilar y pasar tests.
2. **No mezclar features en una sesión.** Si sobra tiempo, documentar o hacer quick wins.
3. **Si el plan tiene >5 etapas**, dividir en sesiones de 3-4 etapas cada una.
4. **Dejar 10-15 min al final** para revisión, documentación y cierre.

### Ejemplo de estimación para un plan

```
Feature: Sistema de notificaciones push
Modelo: Sonnet

Sesión 1 (~45 min):
  Etapa 1: Modelo de datos (20 min) — 4 tareas atómicas
  Etapa 2: Servicio de notificaciones (25 min) — 4 tareas atómicas

Sesión 2 (~50 min):
  Etapa 3: Endpoints REST (25 min) — 5 tareas atómicas
  Etapa 4: Integración con frontend (25 min) — 4 tareas atómicas

Total: 2 sesiones, ~95 min Sonnet
```

## Cómo estimar un plan nuevo

1. **Listar las tareas atómicas** de cada etapa
2. **Clasificar cada tarea** según la tabla de referencia
3. **Sumar minutos por etapa** y aplicar factores multiplicadores si corresponde
4. **Agrupar etapas en sesiones** respetando la capacidad por sesión
5. **Agregar resumen de estimación** al final del plan con formato:

```markdown
## Resumen de estimación

| Sesión | Etapas | Tareas | Tiempo estimado ([modelo]) | Puede correr en paralelo |
|--------|--------|--------|---------------------------|--------------------------|
| 1 | 1, 2 | 1.1 a 2.4 | ~45 min | No (comparten archivo X) |
| 2 | 3, 4 | 3.1 a 4.4 | ~50 min | Sí (independientes) |

**Total: [N] tareas, [M] sesiones, ~[T] min [modelo].**
```

---

*Estimar no es adivinar. Es usar la experiencia acumulada para planificar con menos sorpresas.*
