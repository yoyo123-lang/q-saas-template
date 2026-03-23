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

### 2026-03-23 — Query a DB en cada session callback de NextAuth

**Qué pasó**: El `session` callback en `src/lib/auth.ts` hace `prisma.user.findUnique({ select: { role: true } })` en cada request autenticado para inyectar el rol en la sesión.
**Por qué está mal**: Agrega una query por request autenticado. Con tráfico alto o DB con latencia, se convierte en cuello de botella.
**Tradeoff aceptado**: Se mantiene porque:
- Es una query simple por PK (`id`) con `select: { role: true }` — es la query más rápida posible.
- La alternativa (JWT strategy) requiere: migrar de sesiones en DB a JWT, manejar invalidación manual cuando cambia el rol, y perder la capacidad de invalidar sesiones server-side. Esa complejidad no se justifica para el volumen esperado del template.
- Si un proyecto derivado necesita escalar, la migración a JWT strategy es el camino. Documentar en ese momento.
**Qué hacer si escala**: Migrar a `strategy: "jwt"`, codificar el role en el token JWT (se actualiza solo al login), y agregar lógica de invalidación cuando el rol cambie.
**Archivos afectados**: `src/lib/auth.ts` (session callback)

---

*El CLAUDE.md más efectivo no es el que se escribe una vez: es el que se actualiza cada vez que algo sale mal.*
