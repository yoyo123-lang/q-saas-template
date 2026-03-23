# Performance y Monitoreo

> Para un proyecto que escale, no alcanza con que funcione: tiene que funcionar RÁPIDO y tiene que ser MEDIBLE.
> Claude Code debe pensar en performance desde el diseño, no como parche después.

## Principio

**No optimizar antes de medir.** Pero sí diseñar de forma que medir sea fácil y optimizar sea posible.

## Base de datos

### Índices

- Toda columna usada en WHERE, JOIN, ORDER BY, o que sea foreign key → necesita índice
- No agregar índices "por las dudas" (cada índice hace más lento el INSERT/UPDATE)
- Si una query tarda más de 100ms en desarrollo, necesita revisión

### Queries

- Evitar SELECT * — pedir solo las columnas necesarias
- Usar LIMIT siempre que sea posible
- Evitar N+1: no hacer queries dentro de un loop (usar JOINs o batch queries)
- Queries complejas que se repiten → considerar vistas o materializar resultados

### Regla del N+1

```
❌ Mal: Para cada usuario, buscar sus pedidos (100 usuarios = 101 queries)
✅ Bien: Buscar todos los usuarios, después buscar todos los pedidos de esos IDs (2 queries)
```

## Caching

### Cuándo usar cache

- Datos que se leen mucho más de lo que se escriben
- Respuestas de APIs externas que no cambian frecuentemente
- Cálculos costosos que se repiten con los mismos inputs

### Cuándo NO usar cache

- Datos que cambian constantemente
- Datos donde la frescura es crítica (saldos, stock en tiempo real)
- Si el overhead de manejar invalidación es mayor que el beneficio

### Si se implementa cache

- Definir siempre un TTL (tiempo de expiración)
- Tener una forma de invalidar el cache manualmente
- Documentar qué se cachea y por cuánto tiempo
- Loguear hits y misses para saber si el cache está siendo útil

## Respuestas de API

### Tiempos objetivo

| Tipo de operación | Objetivo | Alarma |
|------------------|----------|--------|
| Lectura simple (un registro) | < 100ms | > 300ms |
| Lectura con joins | < 200ms | > 500ms |
| Escritura simple | < 200ms | > 500ms |
| Operación compleja | < 1s | > 3s |
| Proceso batch/background | Variable | Documentar estimado |

Estos son orientativos. Ajustar según la realidad del proyecto.

### Paginación

- Nunca retornar colecciones enteras sin paginar
- Definir un límite por defecto (ej: 20 items) y un máximo (ej: 100 items)
- Incluir metadata de paginación en la respuesta (total, page, limit)

## Medición

### Qué medir

- Tiempo de respuesta de endpoints (p50, p95, p99)
- Tiempo de ejecución de queries lentas
- Uso de memoria del proceso
- Tasa de errores (porcentaje de requests que fallan)

### Cómo medir

Si el proyecto es chico, alcanza con:

- Loguear duración de requests (middleware que mida inicio→fin)
- Loguear queries lentas (la mayoría de los ORMs/drivers tienen esta opción)
- Revisar logs periódicamente

Si el proyecto crece:

- Agregar un servicio de monitoreo (ej: Sentry para errores, cualquier APM para tiempos)
- Crear un ADR cuando se elija la herramienta de monitoreo

### Regla del "si no lo medís, no lo sabés"

Cuando Claude Code implemente algo que pueda ser lento (queries complejas, llamadas a APIs externas, procesamiento de archivos), debe agregar logs de duración:

```
logger.info("Operación completada", { operation: "processInvoices", duration: "342ms", count: 150 })
```

## Anti-patrones de performance

- ❌ Cargar datos que no se van a usar
- ❌ Hacer llamadas a APIs externas dentro de loops
- ❌ Guardar archivos grandes en la base de datos (usar storage externo)
- ❌ Procesar tareas pesadas en el thread principal (usar colas/workers)
- ❌ No paginar resultados
- ❌ Optimizar antes de tener datos que justifiquen la optimización

---

*Performance no es hacer las cosas rápido: es saber qué es lento y por qué.*
