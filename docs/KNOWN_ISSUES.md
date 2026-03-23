# Errores Conocidos y Patrones Problemáticos

> **Este es el archivo más importante a largo plazo.**
> Acá se anota todo lo que Claude Code hace mal, se equivoca seguido, o genera problemas recurrentes.
> Cada entrada evita que el mismo error se repita. Esto es lo que realmente hace que Claude Code mejore con el tiempo.
>
> Empieza vacío. Se llena con el uso.

## Cómo usar este archivo

### Cuándo agregar algo

- Claude Code generó código que rompió algo y no se dio cuenta
- Claude Code repitió un error que ya se había corregido antes
- Claude Code tomó una decisión que contradice la arquitectura del proyecto
- Un patrón del proyecto es contraintuitivo y Claude lo hace mal
- Alguna dependencia o API tiene comportamiento inesperado que causa bugs

### Formato de cada entrada

```markdown
### [Fecha] — Descripción corta del problema

**Qué pasó**: [Qué hizo Claude Code mal]
**Por qué está mal**: [Qué consecuencia tuvo o podría tener]
**Qué hacer en vez**: [La forma correcta]
**Archivos afectados**: [Dónde prestar atención]
```

---

## Registro de errores

<!-- 
Agregar entradas nuevas acá arriba (las más recientes primero).
Ejemplo:

### 2025-02-18 — No usar JSON.parse() sin try/catch

**Qué pasó**: Claude Code usó JSON.parse() directo sin manejo de error, y cuando el string no era JSON válido crasheó la aplicación
**Por qué está mal**: JSON.parse con input no confiable siempre puede fallar
**Qué hacer en vez**: Envolver en try/catch o usar una función utilitaria safeJsonParse()
**Archivos afectados**: Todo lugar donde se parsee JSON de fuentes externas
-->

*Todavía no hay errores registrados. Esto se va llenando con el uso.*

---

*El CLAUDE.md más efectivo no es el que se escribe una vez: es el que se actualiza cada vez que algo sale mal.*
