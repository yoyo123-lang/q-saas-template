# Cómo pedirle cosas a Claude Code

> **Este archivo es para vos, no para Claude Code.**
> Es tu machete personal. Miralo 30 segundos antes de escribir el prompt.
> Si no podés describir el resultado en 2-3 oraciones, todavía no tenés claro
> qué querés. Pensalo un poco más en Claude.ai antes de mandarlo a Claude Code.

---

## La regla de los 3 elementos

Todo pedido que funcione bien tiene estas tres cosas:

1. **QUÉ** quiero que pase (el resultado, no la implementación)
2. **PARA QUIÉN** (qué va a ver/hacer el usuario final)
3. **CONTEXTO** (de dónde vienen los datos, qué ya existe, qué no tocar)

Si tu pedido tiene los tres, va a salir bien. Si le falta alguno, Claude Code va a asumir y probablemente mal.

---

## Templates por tipo de tarea

### Pantalla / página nueva

```
Necesito una pantalla de [QUÉ] que muestre [QUÉ DATOS].
El usuario debe poder [ACCIONES: filtrar, ordenar, exportar, buscar, etc.].
Los datos vienen de [FUENTE: API X, base de datos, endpoint Y, hardcodeado por ahora].
Referencia visual: [LINK, screenshot, o "como la pantalla X que ya existe en el proyecto"].
Mobile-first. Formato argentino para números y fechas.
```

**Ejemplo real:**
"Necesito una pantalla que muestre los pagos del último mes de un alumno.
El usuario puede filtrar por estado (aprobado, rechazado, pendiente) y por fecha.
Los datos vienen de la API de Mobbex. Quiero que se parezca al dashboard de la tesorería.
Mobile-first. Montos en pesos argentinos con formato 1.000,50."

### Endpoint / API

```
Necesito un endpoint que [QUÉ HACE].
Recibe: [QUÉ DATOS, en qué formato].
Devuelve: [QUÉ ESTRUCTURA].
Validaciones: [QUÉ PUEDE SALIR MAL o qué datos son opcionales].
¿Necesita autenticación? [SÍ/NO. Si sí, qué rol puede acceder].
```

### Fix / corrección de bug

```
El problema: [QUÉ PASA, qué ves en pantalla o en los logs].
Lo esperado: [QUÉ DEBERÍA PASAR].
Cómo reproducirlo: [PASOS concretos, o "pasa siempre" / "pasa a veces"].
Dónde creo que está: [ARCHIVO o MÓDULO, si tenés idea. Si no, decilo].
```

**Ejemplo real:**
"Cuando un alumno tiene más de 5 pagos rechazados, la pantalla muestra un
error genérico en vez de listar los pagos. Debería mostrar la lista normal
con los rechazados marcados en rojo. Pasa siempre. Creo que es algo del
componente de la tabla de pagos."

### Micrositio nuevo (de la cartera)

```
Seguí el playbook de micrositios (docs/onboarding/playbook-micrositios-utilidad.md).
El sitio resuelve: [PROBLEMA en una oración].
Datos de: [API o fuente con URL si la tenés].
Dominio: [nombre.com.ar].
Referencia visual: [LINK a un sitio que te guste como se ve].
Keywords principales: [2-3 keywords de SEO que querés atacar].
```

### Funcionalidad compleja o que no tenés del todo clara

```
/project:sesion

[y dejá que Claude Code te guíe con las preguntas]
```

Este es el caso más importante: **si no estás seguro de qué querés, no escribas un prompt largo tratando de adivinar.** Usá el skill de sesión y dejá que Claude Code te pregunte. Vas a llegar a un mejor resultado más rápido.

### Cambio visual / de diseño

```
/project:diseño

[y pasale una captura de referencia si la tenés]
```

### Refactor o mejora de algo existente

```
Quiero mejorar [QUÉ PARTE del proyecto].
El problema actual es: [QUÉ ANDA MAL o es lento o es confuso].
El resultado esperado: [CÓMO DEBERÍA QUEDAR].
Restricción: no tocar [QUÉ ARCHIVOS o funcionalidad no debe cambiar].
```

---

## Errores comunes que te cuestan tiempo

### "Hacé la autenticación"
**Problema:** Hay 50 formas de hacer autenticación. Claude Code va a elegir una y probablemente no sea la que querías.
**Mejor:** "Hacé login con email y contraseña, JWT, refresh token con rotación, formulario mobile-first de máximo 3 campos."

### "Arreglá los estilos"
**Problema:** ¿Qué estilos? ¿Dónde? ¿Qué está mal?
**Mejor:** "Los botones en la pantalla de pagos se ven distintos a los del dashboard. Unificá al estilo del dashboard."

### "Optimizá esto"
**Problema:** ¿Optimizar qué? ¿Velocidad? ¿Código? ¿UX?
**Mejor:** "La pantalla de listado de alumnos tarda 4 segundos en cargar. Debería cargar en menos de 1 segundo."

### "Hacé algo parecido a [concepto abstracto]"
**Problema:** "Algo parecido" puede significar cualquier cosa.
**Mejor:** "Mirá [URL] y hacé algo con la misma estructura pero con nuestra paleta de colores y estos datos: [datos]."

---

## Cuándo usar cada herramienta

| Situación | Herramienta |
|---|---|
| Tengo una idea pero no sé bien cómo formularla | Claude.ai (esta conversación) |
| Ya sé qué quiero pero es algo complejo | `/project:sesion` en Claude Code |
| Ya sé qué quiero y es algo puntual | Prompt directo en Claude Code |
| Quiero una pantalla pero no sé cómo debería verse | `/project:diseño` en Claude Code |
| Terminé de trabajar | `/project:cierre` en Claude Code |

---

## El test del prompt

Antes de mandar un prompt a Claude Code, preguntate:

1. ¿Puedo describir el resultado en 2-3 oraciones? → Si no, ir a Claude.ai primero
2. ¿Dije QUÉ quiero que vea el usuario? → Si no, agregarlo
3. ¿Dije de dónde vienen los datos? → Si no, agregarlo
4. ¿Hay algo que NO debe cambiar? → Si sí, decirlo explícitamente
5. ¿Tengo una referencia visual? → Si sí, adjuntarla. Siempre mejora el resultado
