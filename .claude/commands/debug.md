# Sesión de debugging estructurado

> Skill para diagnosticar y arreglar un bug de forma metódica.
> Invocar con: `/project:debug`
> No escribas código hasta tener una hipótesis verificada.

## Paso 1: Entender el problema

Preguntale al usuario:

1. **¿Qué debería pasar?** (comportamiento esperado)
2. **¿Qué pasa en cambio?** (comportamiento actual)
3. **¿Podés darme el error, log, o pasos para reproducir?**

Si el usuario pasa un error o log, leelo completo — no te quedes con la primera línea.

## Paso 2: Reproducir

Intentá reproducir el problema:

1. Si hay un test que falla → correrlo y ver el output completo
2. Si hay un error en runtime → buscar el archivo y línea exacta
3. Si es un comportamiento incorrecto → identificar el flujo que lo produce

```
REPRODUCCIÓN:
- Reproducible: sí/no
- Dónde ocurre: [archivo:línea o flujo]
- Frecuencia: [siempre / a veces / solo con ciertos datos]
```

Si no se puede reproducir, preguntá al usuario por más contexto. No avances sin poder reproducir.

## Paso 3: Aislar

Usá sub-agentes `explorador` para investigar en paralelo:

1. **¿Qué archivo/función es responsable?** — rastrear el flujo desde el punto de falla hacia atrás
2. **¿Qué cambió?** — `git log --oneline -10` + `git diff` de archivos sospechosos
3. **¿Hay patrones similares que funcionen?** — buscar código análogo que sí ande

```
AISLAMIENTO:
- Función/archivo responsable: [ruta:función]
- Último cambio relevante: [commit hash + qué cambió]
- Código análogo que funciona: [ruta:función] o "no hay"
```

## Paso 4: Formular hipótesis

Basado en lo anterior, formulá **máximo 3 hipótesis** ordenadas por probabilidad:

```
HIPÓTESIS:
1. [más probable] — [evidencia que la soporta]
2. [posible] — [evidencia]
3. [menos probable] — [evidencia]

Voy a verificar la hipótesis 1 primero.
```

## Paso 5: Verificar hipótesis

Para cada hipótesis, verificá de la forma más directa posible → ver `docs/DEBUGGING.md`:

- Leer el código y los datos involucrados
- Agregar un log temporal específico si es necesario
- Correr el caso que falla con la hipótesis en mente

```
VERIFICACIÓN:
- Hipótesis 1: ✅ confirmada / ❌ descartada — [evidencia]
```

Si la hipótesis 1 se descarta, pasar a la 2. Si las 3 se descartan, volver al paso 3 con un enfoque diferente.

### Regla de los 2 intentos

Si después de 2 rondas de hipótesis no encontrás la causa → **parar**, explicar qué se intentó y qué se descartó, y pedir feedback al usuario antes de seguir.

## Paso 6: Escribir test que reproduce el bug

**ANTES de arreglar**, escribí un test que falle por el bug:

```
TEST: [nombre descriptivo del caso]
- Input: [datos que causan el bug]
- Expected: [resultado correcto]
- Actual: [resultado incorrecto — el test debe fallar]
```

Corré el test y confirmá que falla por la razón correcta.

Si el proyecto no tiene framework de tests configurado, documentá el caso de reproducción en el commit message.

## Paso 7: Arreglar

Aplicá el fix más pequeño posible:

1. Corregir solo lo necesario — no refactorizar de paso
2. Correr el test del paso 6 → debe pasar
3. Correr todos los tests → no debe romper nada más
4. Correr build → debe pasar

```
FIX:
- Archivo: [ruta]
- Cambio: [descripción breve]
- Test: ✅ pasa (antes fallaba)
- Tests completos: ✅ [X de Y]
- Build: ✅
```

## Paso 8: Prevenir

Preguntate (y respondé al usuario):

```
PREVENCIÓN:
- ¿Por qué no se detectó antes?: [faltaba test / log insuficiente / validación ausente]
- ¿Hace falta agregar algo?: [test adicional / validación / log / documentación]
- ¿Puede pasar en otro lugar?: [sí → dónde / no]
```

Si puede pasar en otro lugar, proponé arreglarlo como tarea separada (no en este fix).

## Paso 9: Commit y documentar

Hacer commit atómico con mensaje que explique el POR QUÉ:

```
fix: [descripción corta]

El bug ocurría porque [causa raíz].
[contexto adicional si es necesario]
```

Actualizar `SESSION_LOG.md`:

```markdown
### [fecha] — Fix: [descripción]
- Bug: [qué pasaba]
- Causa: [por qué]
- Fix: [qué se cambió]
- Test: [nombre del test agregado]
- Prevención: [qué se hizo para evitar recurrencia]
```

Si el bug fue causado por un patrón que Claude Code tiende a repetir, proponé una entrada en `KNOWN_ISSUES.md`.

## Paso 10: Confirmar

```
✅ BUG RESUELTO

Problema: [qué pasaba]
Causa: [por qué]
Fix: [archivo:línea — cambio]
Test: [nombre]
Commit: [hash]
```

---

## Reglas

- No arregles sin reproducir primero. Si no podés reproducir, no podés verificar el fix.
- No arregles sin hipótesis. "Probar cosas a ver si funciona" no es debugging.
- Test primero, fix después. Si no hay test, el bug puede volver.
- El fix más chico posible. No refactorizar, no "mejorar" código vecino, no agregar features.
- Regla de los 2 intentos: si no lo encontrás, parar y pedir ayuda.
- Nunca silenciar un error como "solución". Un try/catch vacío no es un fix.

---

*Un bug que arreglás sin entender es un bug que va a volver. Con amigos.*
