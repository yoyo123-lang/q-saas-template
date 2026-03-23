# Debugging y Prevención de Errores Silenciosos

> Este es el ÚNICO archivo sobre manejo de errores. Si otro doc necesita referir errores, apunta acá.
> Para reglas sobre calidad de herramientas de diagnóstico → ver `PRE_DEPLOY_AND_QA.md` (Parte 3).
> Un error silencioso es peor que un crash: el crash te avisa, el error silencioso te arruina los datos sin que lo sepas.

## Regla de oro

**Si algo puede fallar, DEBE fallar de forma ruidosa y descriptiva.** Nunca tragarse un error. Nunca devolver null/None como si nada. Nunca seguir adelante cuando algo salió mal.

## Los 7 pecados de los errores silenciosos

Estos aplican en CUALQUIER lenguaje. Los ejemplos muestran el concepto, adaptá la sintaxis a tu stack.

### 1. Catch/except vacío

```
❌ try { operacion() } catch (e) { /* silencio */ }
❌ try: operacion() except: pass

✅ Siempre loguear + propagar o manejar explícitamente
```

### 2. Devolver null/None/nil sin explicar

```
❌ return result[0]     // undefined si no hay datos, nadie lo sabe
✅ if (!result) throw NotFoundError("Recurso no encontrado")
```

### 3. Ignorar el resultado de una operación

```
❌ sendEmail(user, template)   // ¿se envió? ¿falló? no sabemos
✅ result = sendEmail(user, template)
   if (!result.success) → loguear, reintentar, o avisar
```

### 4. Fallback que esconde problemas

```
❌ config = loadConfig() || {}     // si falla, usa vacío y todo anda "raro"
✅ config = loadConfig()
   if (!config) throw Error("Configuración inválida o no encontrada")
```

### 5. Promesas/futuros sin manejo de error

```
❌ fetchData(url).then(data => process(data))    // si falla, nadie se entera
✅ Siempre manejar el caso de error (catch, except, error callback)
```

### 6. Asumir que una respuesta externa es válida

```
❌ data = apiResponse.results[0].value   // ¿y si results está vacío?
✅ Validar cada paso: ¿response OK? → ¿tiene results? → ¿tiene [0]? → ¿tiene value?
```

### 7. Conversiones sin validar

```
❌ price = Number(input)    // "abc" → NaN → se propaga por todos los cálculos
✅ Convertir + validar inmediatamente (isNaN, isinstance, etc.)
```

## Sistema de logging

### Niveles

| Nivel | Cuándo | Ejemplo |
|-------|--------|---------|
| `error` | Algo falló y necesita atención | Base de datos caída, API de pagos no responde |
| `warn` | Inesperado pero no crítico | Email no enviado, retry exitoso |
| `info` | Eventos importantes del negocio | Usuario creado, pago procesado |
| `debug` | Detalles para desarrollo | Query ejecutada, tiempo de respuesta |

### Qué loguear

Un log útil tiene: QUÉ se intentó + CON QUÉ datos + QUÉ salió mal.

```
✅ logger.error("Error procesando pago", {userId, amount, gateway, errorCode, errorMessage})
❌ logger.error("error")
❌ console.log("acá llegó")
```

### Qué NUNCA loguear

Passwords, tokens completos, números de tarjeta, datos personales sensibles, contenido de JWTs.

## Metodología de debugging

Cuando algo no funciona, seguir estos pasos EN ORDEN:

1. **Reproducir**: ¿Puedo hacer que pase de manera consistente? ¿Cuáles son los pasos exactos?
2. **Aislar**: ¿En qué archivo/función ocurre? ¿Qué cambió desde que funcionaba?
3. **Entender**: ¿POR QUÉ falla? (datos, lógica, timing, configuración). Leer el error completo.
4. **Arreglar**: Test que reproduce el bug → fix más pequeño posible → verificar que pasa → verificar que no rompió nada
5. **Prevenir**: ¿Por qué no lo detectamos antes? ¿Hace falta validación, test, o log?

### Regla de los 2 intentos

Si después de 2 intentos no funciona: **parar**, explicar qué se intentó, proponer un enfoque completamente diferente, y pedir feedback antes de seguir.

## Validaciones obligatorias

### Al arrancar la aplicación

Verificar que todo lo necesario está configurado ANTES de que el programa empiece a funcionar. Si falta algo esencial, fallar inmediatamente con un mensaje claro que diga qué falta y cómo solucionarlo.

### En cada función pública

Validar los argumentos al inicio. Si son inválidos, fallar con un mensaje descriptivo ANTES de hacer cualquier otra cosa.

## Checklist anti-errores-silenciosos

Antes de dar por terminado un cambio:

- [ ] ¿Todos los bloques catch/except hacen algo con el error?
- [ ] ¿Todas las operaciones asíncronas tienen manejo de error?
- [ ] ¿Las funciones que pueden no encontrar algo lo manejan explícitamente?
- [ ] ¿Los valores de retorno de operaciones importantes se verifican?
- [ ] ¿Las conversiones de tipo se validan?
- [ ] ¿Los accesos a propiedades opcionales se protegen?
- [ ] ¿No quedaron logs de debugging temporal?
- [ ] ¿Los logs de error tienen suficiente contexto para diagnosticar?

---

*Un error que grita es un error que se arregla hoy. Un error que susurra es un error que te despierta a las 3 AM en producción.*
