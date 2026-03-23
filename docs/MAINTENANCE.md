# Mantenimiento y Deuda Técnica

> Reglas para mantener el proyecto saludable a largo plazo.
> Claude Code debe aplicar estas prácticas de forma continua, no solo cuando se lo pidan.

## Detección proactiva

Claude Code debe avisar cuando detecte:

- Funciones de más de 30 líneas → proponer dividirlas
- Archivos de más de 300 líneas → proponer extraer módulos
- Código duplicado en 2+ lugares → proponer abstracción
- Dependencias con vulnerabilidades conocidas
- Código comentado que lleva más de 1 commit
- Variables o funciones que no se usan
- TODOs o FIXMEs acumulados

## Regla del Boy Scout

*"Dejá el código un poco mejor de como lo encontraste."*

Cuando toques un archivo para otra tarea, si ves algo que se puede mejorar fácilmente (nombre confuso, import innecesario, comentario desactualizado), mejoralo. Pero:

- Solo mejoras obvias y de bajo riesgo
- Nunca mezclar refactors con features en el mismo commit
- Si el refactor es grande, proponerlo como tarea separada

## Ciclo de revisión

Periódicamente (o cuando se pida), Claude Code debe:

1. **Código muerto**: Funciones, variables, archivos que no se usan
2. **Dependencias**: Auditar vulnerabilidades y paquetes abandonados
3. **TODOs**: Listar todos los TODO/FIXME/HACK con su contexto
4. **Documentación**: ¿ARCHITECTURE.md refleja la realidad?
5. **Tests**: ¿Hay áreas sin cobertura?
6. **Performance**: ¿Hay queries lentas o endpoints que tardaron? → ver `PERFORMANCE.md`

## Formato para proponer mejoras

```
⚠️ DEUDA TÉCNICA DETECTADA
Archivo: [ruta]
Problema: [qué pasa]
Impacto: [por qué importa]
Propuesta: [qué hacer]
Prioridad: Alta / Media / Baja
```

## Señales de alarma

Si 3+ de estas señales están presentes, parar y hacer mantenimiento:

- Los tests tardan demasiado en correr
- Hay más de 5 TODOs/FIXMEs abiertos
- Cuesta más de 5 minutos entender un módulo
- Un cambio simple requiere tocar 3+ archivos
- Los bugs reaparecen después de "arreglados"
- El auditor de dependencias reporta vulnerabilidades altas

---

*La deuda técnica es como la deuda financiera: un poquito está bien, demasiada te quiebra.*
