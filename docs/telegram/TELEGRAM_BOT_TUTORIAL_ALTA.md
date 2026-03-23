# Tutorial de Alta del Bot de Telegram — Guía para el Administrador

> **Para quién es este tutorial**: Para vos, el administrador del sistema, que necesitás dar de alta el bot de Telegram en un proyecto nuevo. Cubre todos los pasos que **tenés que hacer vos** (crear el bot, configurar variables, habilitar funciones), y no la parte técnica del código.

---

## Índice

1. [Paso 1 — Crear el bot en BotFather](#paso-1--crear-el-bot-en-botfather)
2. [Paso 2 — Obtener las API Keys de OpenAI o Anthropic](#paso-2--obtener-las-api-keys-de-openai-o-anthropic)
3. [Paso 3 — Configurar las variables de entorno en Railway](#paso-3--configurar-las-variables-de-entorno-en-railway)
4. [Paso 4 — Verificar que el bot arrancó](#paso-4--verificar-que-el-bot-arrancó)
5. [Paso 5 — Activar el bot desde el panel web](#paso-5--activar-el-bot-desde-el-panel-web)
6. [Paso 6 — Agregar operadores al bot](#paso-6--agregar-operadores-al-bot)
7. [Paso 7 — Probar el bot](#paso-7--probar-el-bot)
8. [Paso 8 — (Opcional) Agregar el bot a un grupo](#paso-8--opcional-agregar-el-bot-a-un-grupo)
9. [Gestión cotidiana](#gestión-cotidiana)
10. [Si algo no funciona](#si-algo-no-funciona)

---

## Paso 1 — Crear el bot en BotFather

BotFather es el bot oficial de Telegram para gestionar bots.

**1.1 Abrir BotFather**

Buscá en Telegram: `@BotFather` → abrilo → enviá `/start`

**1.2 Crear un bot nuevo**

Enviá el comando:
```
/newbot
```

BotFather te va a preguntar dos cosas:

1. **Nombre del bot** (se muestra en el chat): ej. `Asistente IEA`
2. **Username del bot** (identificador único, debe terminar en `bot`): ej. `asistente_iea_bot`

**1.3 Guardar el token**

BotFather te va a dar un token con este formato:
```
7123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**⚠️ IMPORTANTE:** Este token es la contraseña del bot. Si se filtra, cualquiera puede controlar el bot. Nunca lo pongas en el código ni en un repositorio. Si se filtra, revocarlo inmediatamente (ver más abajo).

**1.4 Desactivar el Privacy Mode (OBLIGATORIO para grupos)**

Si vas a usar el bot en grupos de Telegram, este paso es **obligatorio**. Sin él, el bot responde `/start` pero ignora mensajes de texto en grupos silenciosamente.

```
/mybots
→ seleccionar tu bot
→ Bot Settings
→ Group Privacy
→ Turn off
```

Debería quedar en estado "DISABLED" (privacidad de grupo desactivada).

> **¿Por qué?** Con Privacy Mode activado, el bot solo recibe comandos (mensajes que empiezan con `/`) en grupos. Para que reciba mensajes de texto libre (como "@bot buscame el DNI 12345"), el Privacy Mode debe estar apagado.

**1.5 Revocar el token si se filtra**

Si el token se expone accidentalmente:
```
/mybots
→ seleccionar tu bot
→ API Token
→ Revoke current token
```

Vas a recibir un token nuevo. Actualizá la variable de entorno `TELEGRAM_BOT_TOKEN` con el nuevo valor.

---

## Paso 2 — Obtener las API Keys de OpenAI o Anthropic

El bot usa un LLM para interpretar los mensajes en lenguaje natural. Necesitás al menos una clave de alguno de los dos proveedores.

### Opción A — OpenAI (recomendado por defecto)

El proyecto usa `gpt-4o-mini` por defecto. Es el modelo más económico y suficientemente capaz.

**Costo aproximado:** ~$0.000044 por consulta (prácticamente cero para el volumen de uso esperado).

1. Ir a: https://platform.openai.com/api-keys
2. Click en **"+ Create new secret key"**
3. Darle un nombre descriptivo: ej. `Recaudador IEA Bot`
4. Copiar la clave (empieza con `sk-...`)

**⚠️ La clave se muestra UNA SOLA VEZ.** Si la perdés, tenés que crear una nueva.

Configurar límite de gasto en: https://platform.openai.com/settings/organization/billing → Spend limits

### Opción B — Anthropic (alternativa)

1. Ir a: https://console.anthropic.com/settings/keys
2. Click en **"Create Key"**
3. Darle un nombre: ej. `Recaudador IEA Bot`
4. Copiar la clave (empieza con `sk-ant-...`)

---

## Paso 3 — Configurar las variables de entorno en Railway

Ir al proyecto en Railway → seleccionar el servicio de backend → tab **"Variables"**.

Agregar las siguientes variables:

| Variable | Valor | Descripción |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | El token de BotFather | Token del bot |
| `OPENAI_API_KEY` | La clave de OpenAI | Si usás OpenAI |
| `ANTHROPIC_API_KEY` | La clave de Anthropic | Si usás Anthropic |

**Cómo agregar una variable en Railway:**
1. Click en **"+ New Variable"**
2. Nombre: `TELEGRAM_BOT_TOKEN`
3. Valor: pegar el token
4. Enter / Save

Después de agregar las variables, Railway va a hacer un redeploy automático del servicio.

> **Tip de seguridad:** Railway encripta las variables de entorno. Aun así, nunca las compartas por chat ni las pegues en el código.

---

## Paso 4 — Verificar que el bot arrancó

Una vez que el redeploy termina, verificar en los logs de Railway:

**Logs esperados al arrancar correctamente:**
```
INFO - Iniciando bot de Telegram (long-polling)...
INFO - Bot de Telegram activo.
```

**También podés verificar via la API de health:**
```
GET https://tu-app.railway.app/api/health
```

Respuesta esperada:
```json
{"status": "ok", "bot_active": true}
```

Si `bot_active` es `false`, el bot no arrancó. Revisar los logs de Railway para ver el error.

---

## Paso 5 — Activar el bot desde el panel web

El bot arranca pero **empieza desactivado** (`bot_enabled = false`). Hay que activarlo desde el panel web.

1. Ir al panel web del proyecto → sección **"Bot de Telegram"**
2. En **"Configuración del bot"**:
   - Tildar **"Bot habilitado"**
   - Verificar que el proveedor y modelo sean correctos (por defecto: OpenAI / gpt-4o-mini)
   - El rate limit por defecto es 200 mensajes/hora por usuario (más que suficiente)
3. Click en **"Guardar configuración"**

Esto activa el bot sin necesidad de reiniciar el servicio. El cambio es inmediato.

---

## Paso 6 — Agregar operadores al bot

Solo los usuarios que estén en la whitelist pueden usar el bot.

**Desde el panel web** (sección "Operadores autorizados"):

1. Click en **"+ Agregar operador"**
2. Ingresar el username de Telegram (sin el `@`): ej. `mariaperez`
3. Seleccionar el rol: **operador** o **admin**
4. Click en **"Agregar"**

**Roles:**

| Rol | Qué puede consultar |
|---|---|
| **operador** | Datos de un alumno específico: suscripciones, débitos, tarjeta, beca, legajo, links de pago |
| **admin** | Todo lo anterior + estadísticas globales, rechazos, ejecuciones de cobro, cruce de datos, gestión de operadores |

> **Recomendación:** El primer usuario (vos) debería ser `admin`. Los operadores del área de cobranzas deberían ser `operador`.

**Desde Telegram (solo admins):**

Una vez que estés dado de alta como admin, podés agregar operadores directamente desde Telegram:

```
/agregar_operador @username
/quitar_operador @username
/operadores
```

---

## Paso 7 — Probar el bot

**7.1 Vincular tu cuenta de Telegram**

Abrí el bot en Telegram (buscá `@nombre_del_bot`) y enviá:
```
/start
```

El bot debería responderte con tu rol:
```
Hola @tuusername! Sos administrador.

Podés consultarme sobre alumnos, suscripciones y cobros en lenguaje natural.
Enviá /help para ver ejemplos.
```

Si el bot no responde o dice "No tenés acceso", verificar:
- Que el bot esté habilitado (`bot_enabled = true` en el panel)
- Que tu username esté en la whitelist (sin el `@`)
- Que el `TELEGRAM_BOT_TOKEN` sea correcto

**7.2 Ver ejemplos de consultas**

```
/help
```

**7.3 Hacer una consulta de prueba**

Enviá algo en lenguaje natural:
```
¿Cuántos alumnos hay en el padrón?
```

El bot debería responder con el conteo total de alumnos.

**¿Por qué esta consulta?** No depende de datos específicos de alumnos, así que funciona aunque el padrón esté vacío. Si el padrón ya tiene datos, probá:
```
Buscar alumno García
```

---

## Paso 8 — (Opcional) Agregar el bot a un grupo

Si querés que el bot opere en un grupo privado de Telegram (ej: un grupo de cobranzas):

**8.1 Agregar el bot al grupo**

En Telegram, ir al grupo → Agregar miembro → buscar `@nombre_del_bot` → agregar.

**8.2 Obtener el Chat ID del grupo**

Agregar el bot `@getidsbot` al grupo. Este bot responde con el Chat ID del grupo.

El Chat ID de un **grupo siempre es un número negativo** (ej: `-1001234567890`).

**8.3 Registrar el grupo en el panel web**

En el panel web → sección "Grupos autorizados" → **"+ Agregar grupo"**:
- **Nombre**: ej. `Grupo Cobranzas`
- **Chat ID**: el número negativo del grupo

**8.4 Usar el bot en el grupo**

En el grupo, el bot responde cuando:
- Lo mencionás con `@nombre_del_bot`: ej. `@asistente_iea_bot buscame el DNI 12345678`
- Respondés directamente a un mensaje del bot

El bot **NO responde** a todos los mensajes del grupo (solo cuando se lo mencionan o se responde a él).

---

## Gestión cotidiana

### Agregar un operador nuevo

**Panel web:** Bot de Telegram → Operadores → "+ Agregar operador"

**Telegram (si sos admin):**
```
/agregar_operador @username
```

### Desactivar un operador temporalmente

**Panel web:** Click en "Desactivar" en la fila del operador.

El operador no puede borrar mensajes, pero el cambio es inmediato.

### Cambiar el rol de un operador

**Panel web:** En la columna "Rol" de la tabla de operadores, cambiar el selector (operador/admin). El cambio se guarda automáticamente.

### Cambiar el modelo de LLM

**Panel web:** Configuración del bot → Proveedor de IA / Modelo → Guardar.

No requiere reiniciar el servicio. El cambio aplica para el próximo mensaje.

Modelos disponibles:
- **OpenAI:** `gpt-4o-mini` (económico, bueno), `gpt-4o` (más capaz), `o4-mini`, `gpt-5-mini-2025-08-07`
- **Anthropic:** `claude-haiku-4-5-20251001` (rápido y económico), `claude-sonnet-4-6` (más capaz)

### Deshabilitar el bot temporalmente

**Panel web:** Configuración del bot → desmarcar "Bot habilitado" → Guardar.

Los usuarios que intenten usar el bot reciben: "El bot está temporalmente deshabilitado."

### Ver estado del bot

```
GET https://tu-app.railway.app/api/health
```
```json
{"status": "ok", "bot_active": true}
```

---

## Si algo no funciona

### El bot no responde a ningún mensaje

**Verificar en orden:**

1. ¿`TELEGRAM_BOT_TOKEN` está configurado en Railway? → Variables de entorno del servicio.
2. ¿El bot arrancó? → Logs de Railway: buscar "Bot de Telegram activo."
3. ¿`/api/health` devuelve `bot_active: true`?
4. ¿El bot está habilitado en el panel web? → `bot_enabled = true`.
5. ¿El usuario está en la whitelist? → Panel web → Operadores.
6. ¿El usuario envió `/start` primero? → Es necesario para vincular el chat.

### El bot responde a mensajes privados pero no al grupo

**Verificar:**

1. ¿Privacy Mode está desactivado? → BotFather → `/mybots` → Bot Settings → Group Privacy → debe decir "DISABLED".
2. ¿El grupo está en la whitelist? → Panel web → Grupos autorizados.
3. ¿El Chat ID es correcto? → Debe ser el número negativo del grupo.
4. ¿El usuario que habla en el grupo está en la whitelist individual de usuarios?
5. ¿El mensaje va dirigido al bot? → Debe mencionar `@bot` o ser un reply a un mensaje del bot.

### El bot dice "No tenés acceso" a un usuario nuevo

**Causa:** El usuario no está en la whitelist de operadores.

**Solución:** Agregar su username desde el panel web o con `/agregar_operador @username`.

**Importante:** El username en Telegram debe coincidir **exactamente** con el registrado (sin `@`). Si el usuario cambió su username en Telegram, hay que actualizar el registro.

### El bot dice "No tenés acceso" a un usuario que ya estaba configurado

**Posibles causas:**

1. El usuario cambió su username de Telegram → actualizar en el panel web.
2. El usuario está marcado como inactivo → activar en el panel web.
3. El `telegram_user_id` no coincide → puede pasar si se borró y recreó el usuario en la DB. Solución: desactivar y volver a crear el operador.

### Respuestas lentas o inconsistentes del LLM

**Verificar:**

1. ¿Las API keys de OpenAI/Anthropic son válidas y tienen saldo?
2. ¿Hay errores en los logs de Railway relacionados con las APIs LLM?
3. Probar cambiar al modelo `gpt-4o-mini` si se usa un modelo más pesado.

### Cómo revocar el token del bot si se filtró

```
En Telegram → @BotFather → /mybots → seleccionar bot → API Token → Revoke current token
```

Luego actualizar `TELEGRAM_BOT_TOKEN` en Railway con el nuevo token. El redeploy se hace automáticamente.

---

## Resumen de variables de entorno para el bot

| Variable | Obligatoria | Descripción |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Sí | Token del bot (de BotFather) |
| `OPENAI_API_KEY` | Si usás OpenAI | Clave de API de OpenAI |
| `ANTHROPIC_API_KEY` | Si usás Anthropic | Clave de API de Anthropic |

Al menos una clave de LLM (OpenAI o Anthropic) debe estar configurada. Si se configura solo una, el proveedor en el panel web debe coincidir.

---

## Resumen de checklist de alta

- [ ] Crear bot en BotFather → obtener token
- [ ] Desactivar Privacy Mode en BotFather (si se va a usar en grupos)
- [ ] Obtener API Key de OpenAI o Anthropic
- [ ] Configurar `TELEGRAM_BOT_TOKEN` en Railway
- [ ] Configurar `OPENAI_API_KEY` o `ANTHROPIC_API_KEY` en Railway
- [ ] Verificar en logs: "Bot de Telegram activo."
- [ ] Verificar `/api/health` devuelve `bot_active: true`
- [ ] Activar bot en panel web (`bot_enabled = true`)
- [ ] Agregar tu usuario como admin en el panel web
- [ ] Enviar `/start` al bot desde Telegram
- [ ] Enviar una consulta de prueba
- [ ] Agregar operadores necesarios
- [ ] (Si se usan grupos) Agregar bot al grupo, obtener Chat ID, registrar en panel web
