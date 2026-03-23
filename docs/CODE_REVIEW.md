# Protocolo de Recepción de Code Review

> Cómo procesar feedback de code reviews con rigor técnico, no con acuerdo performativo.
>
> Inspirado en: Superpowers (`obra/superpowers`, skill `receiving-code-review`)

---

## Principio central

**Verificar antes de implementar. Preguntar antes de asumir. Corrección técnica por encima de comodidad social.**

---

## Respuestas prohibidas

Nunca responder a feedback de review con:

- "Tenés toda la razón!" / "You're absolutely right!"
- "Excelente observación!" / "Great catch!"
- Implementar el cambio sugerido inmediatamente sin verificar

Estas respuestas son performativas — priorizan la relación social sobre la corrección técnica. Un reviewer prefiere que verifiques su sugerencia a que la implementes a ciegas.

---

## Flujo de procesamiento de feedback

### Paso 1: Leer TODO el feedback completo

No empezar a corregir después del primer punto. Los items pueden estar relacionados entre sí — entender parcialmente = implementar mal.

### Paso 2: Reformular los requerimientos

Para cada punto del review, reformular en tus palabras qué se espera. Esto confirma que entendiste.

### Paso 3: Verificar contra el codebase

Antes de implementar cualquier sugerencia, verificar en el código:

- ¿El problema que señala el reviewer realmente existe?
- ¿La solución sugerida es técnicamente correcta en ESTE contexto?
- ¿La sugerencia no rompe algo que funciona?
- ¿Hay una razón por la cual el código está como está?

### Paso 4: Evaluar técnicamente

Para cada sugerencia, una de tres respuestas:

1. **Implementar** — la sugerencia es correcta y mejora el código
2. **Pushback técnico** — la sugerencia no aplica, con razón concreta
3. **Preguntar** — no hay suficiente contexto para decidir

### Paso 5: Implementar de a uno

Aplicar cambios uno por uno, testeando después de cada uno. No hacer todos los cambios juntos.

---

## Evaluación YAGNI de sugerencias

Antes de implementar una sugerencia de "buena práctica", verificar:

- ¿Se usa actualmente en el proyecto? (buscar en el codebase)
- ¿Resuelve un problema real o un problema teórico?
- ¿Agrega complejidad que no se justifica?

Ejemplos comunes de sugerencias YAGNI:
- "Deberías agregar un sistema de caché" → ¿Hay un problema de performance medido?
- "Falta logging estructurado" → ¿El proyecto tiene volumen como para necesitarlo?
- "Esto debería ser configurable" → ¿Alguien va a necesitar configurarlo?
- "Usá el patrón Strategy acá" → ¿Hay más de una implementación real?

---

## Diferencia entre feedback interno y externo

### Feedback del usuario/dueño del proyecto

- Implementar después de entender (sin acuerdo performativo)
- Es la autoridad final sobre qué se necesita
- Si algo no tiene sentido técnico, explicar por qué con datos

### Feedback de reviewers externos (CI, linters, agentes)

Aplicar mayor escrutinio:

- ¿La sugerencia es técnicamente correcta?
- ¿Rompe funcionalidad existente?
- ¿Hay una razón arquitectónica para el código actual?
- ¿Es compatible con la plataforma/versión que usamos?
- ¿Aplica evaluación YAGNI?

**Feedback externo = sugerencias para evaluar, no órdenes para ejecutar.**

---

## Cuándo hacer pushback

Hacer pushback técnico cuando una sugerencia:

- **Rompe funcionalidad** — "Eso cambiaría el comportamiento de X porque..."
- **Carece de contexto** — "Eso se hizo así porque [razón], ver ADR-XXXX"
- **Viola YAGNI** — "No hay uso actual de eso en el proyecto, agregar complejidad sin necesidad"
- **Contradice la arquitectura** — "El proyecto usa [patrón X], esto iría en contra"
- **Es específico de otra plataforma** — "Eso aplica para [framework Y], nosotros usamos [Z]"

### Formato del pushback

```
No implemento [sugerencia] porque [razón técnica concreta].
El código actual [hace X] porque [razón].
[Evidencia: archivo:línea, ADR, test que lo prueba].
```

### Si tu pushback estaba equivocado

Corregir sin disculpas extensas:

```
Revisé de nuevo. Tenías razón sobre [X] porque [razón técnica].
Implemento el cambio.
```

No: "Disculpame, tenés toda la razón, debería haberlo visto antes..."

---

## Anti-racionalizaciones de code review

| Lo que te decís | La realidad |
|---|---|
| "El reviewer tiene más experiencia, hago lo que dice" | La experiencia no garantiza contexto sobre TU proyecto |
| "Es más fácil implementar que discutir" | Un cambio incorrecto es más caro que una conversación |
| "Si lo pide el reviewer, debe ser necesario" | Los reviewers también se equivocan o sugieren sin contexto |
| "Ya que estamos, agrego esta mejora también" | Scope creep. Hacé solo lo que se pidió |
| "Es una sugerencia menor, la implemento rápido" | ¿Verificaste que no rompe nada? ¿Pasaron los tests? |
| "No quiero parecer difícil rechazando sugerencias" | Profesionalismo es defender la calidad, no agradar |

---

## Resumen

1. Leer TODO el feedback antes de actuar
2. Verificar técnicamente cada sugerencia contra el codebase
3. Implementar lo correcto, pushback lo incorrecto, preguntar lo ambiguo
4. Cambios de a uno, con tests después de cada uno
5. Sin acuerdo performativo — rigor técnico siempre
