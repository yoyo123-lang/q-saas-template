# Implementación del Bot de Telegram — Guía Técnica

> **Propósito**: Este documento describe cómo fue implementado el bot de Telegram en el proyecto Recaudador Mobbex IEA. Está pensado para replicar la implementación en un proyecto en blanco, evitando los errores que surgieron durante el desarrollo.

---

## Índice

1. [Arquitectura general](#1-arquitectura-general)
2. [Dependencias](#2-dependencias)
3. [Variables de entorno](#3-variables-de-entorno)
4. [Base de datos — modelos y migraciones](#4-base-de-datos--modelos-y-migraciones)
5. [Estructura de archivos del módulo](#5-estructura-de-archivos-del-módulo)
6. [Módulo por módulo](#6-módulo-por-módulo)
   - [bot.py — Handler principal](#61-botpy--handler-principal)
   - [service.py — Lógica de negocio DB](#62-servicepy--lógica-de-negocio-db)
   - [llm_service.py — Interfaz LLM](#63-llm_servicepy--interfaz-llm)
   - [tools.py — Definición de herramientas](#64-toolspy--definición-de-herramientas)
   - [tool_executor.py — Ejecución de herramientas](#65-tool_executorpy--ejecución-de-herramientas)
   - [rate_limiter.py — Rate limiting](#66-rate_limiterpy--rate-limiting)
7. [Integración con FastAPI (lifespan)](#7-integración-con-fastapi-lifespan)
8. [API REST de administración](#8-api-rest-de-administración)
9. [Frontend — Página de administración](#9-frontend--página-de-administración)
10. [Flujo completo de un mensaje](#10-flujo-completo-de-un-mensaje)
11. [Roles y permisos](#11-roles-y-permisos)
12. [Soporte de grupos de Telegram](#12-soporte-de-grupos-de-telegram)
13. [Errores comunes y cómo evitarlos](#13-errores-comunes-y-cómo-evitarlos)
14. [Tests](#14-tests)

---

## 1. Arquitectura general

```
Usuario de Telegram
       │
       │ mensaje en lenguaje natural
       ▼
  [Bot long-polling]  ← asyncio.Task dentro del proceso FastAPI
       │
       │ 1. Verificar whitelist (tabla telegram_users)
       │ 2. Verificar bot_enabled (tabla telegram_config)
       │ 3. Rate limiting (in-memory)
       │ 4. LLM interpreta → decide qué tool llamar
       │ 5. tool_executor ejecuta la query SQL
       │ 6. LLM formatea el resultado en lenguaje natural
       │
       ▼
  Respuesta al usuario
```

**Decisiones clave:**
- **Long-polling** en lugar de webhook (más simple; no requiere HTTPS público ni URL fija en Railway).
- **Bot como `asyncio.Task`** dentro del mismo proceso FastAPI. No es un servicio separado.
- **LLM como intérprete de intención** (function calling): el LLM decide QUÉ función SQL ejecutar, pero no ve los datos crudos directamente.
- **Rate limiter in-memory** (sin Redis) — suficiente para 15-20 usuarios.
- **Historial de conversación in-memory** — últimos 3 mensajes por usuario; se pierde al reiniciar.

---

## 2. Dependencias

Agregar al `requirements.txt`:

```
# Telegram bot
python-telegram-bot>=21.0,<22

# LLM providers (configurar el que se use)
openai>=1.60,<2
anthropic>=0.45,<1
```

**Importante:** `python-telegram-bot` v21+ usa `asyncio` nativo. No mezclar con versiones anteriores.

---

## 3. Variables de entorno

En el `.env` / `.env.example`:

```bash
# Token del bot de Telegram (de BotFather)
TELEGRAM_BOT_TOKEN=

# OpenAI API Key (si se usa OpenAI como proveedor)
OPENAI_API_KEY=

# Anthropic API Key (si se usa Anthropic como proveedor)
ANTHROPIC_API_KEY=
```

En `core/config.py` (Settings con pydantic-settings):

```python
# Telegram bot
telegram_bot_token: Optional[str] = None
openai_api_key: Optional[str] = None
anthropic_api_key: Optional[str] = None
```

El bot **solo inicia si `TELEGRAM_BOT_TOKEN` está configurado**. Si falta, el lifespan simplemente no crea la task.

---

## 4. Base de datos — modelos y migraciones

### 4.1 Modelos SQLAlchemy

**`app/models/telegram_user.py`**:

```python
class TelegramUser(Base):
    __tablename__ = "telegram_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    telegram_username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    telegram_user_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, nullable=True, index=True)
    telegram_chat_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="operador")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class TelegramGroup(Base):
    """Whitelist de grupos donde el bot puede operar."""
    __tablename__ = "telegram_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    chat_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class TelegramConfig(Base):
    """Singleton id=1 — configuración del bot editable en caliente."""
    __tablename__ = "telegram_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    bot_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    llm_provider: Mapped[str] = mapped_column(String(20), nullable=False, default="openai")
    llm_model: Mapped[str] = mapped_column(String(50), nullable=False, default="gpt-4o-mini")
    llm_reasoning_effort: Mapped[str] = mapped_column(String(10), nullable=False, default="low")
    rate_limit_per_hour: Mapped[int] = mapped_column(Integer, nullable=False, default=200)
    system_prompt_override: Mapped[str | None] = mapped_column(Text, nullable=True)
```

### 4.2 Migraciones Alembic

Se crearon 3 migraciones incrementales:

| Revisión | Qué hace |
|---|---|
| `018_add_telegram_tables` | Crea `telegram_users` y `telegram_config`. Inserta fila de config por defecto e inserta el admin inicial. |
| `020_add_telegram_user_id` | Agrega `telegram_user_id` (BigInteger, único, indexado) a `telegram_users`. Permite auth por ID numérico inmutable en lugar de username (que puede cambiar). |
| `021_add_telegram_groups` | Crea `telegram_groups` para whitelist de grupos. |

**Lección aprendida:** El `telegram_username` en Telegram es **mutable** — el usuario puede cambiarlo. El `telegram_user_id` es el identificador numérico inmutable. Siempre agregar esta columna (puede ser `nullable=True` inicialmente y rellenarse en el primer mensaje del usuario).

---

## 5. Estructura de archivos del módulo

```
backend/app/modules/telegram/
├── __init__.py
├── bot.py            # Handler principal, long-polling, comandos
├── service.py        # CRUD de usuarios/grupos/config en DB
├── llm_service.py    # Interfaz para OpenAI y Anthropic
├── tools.py          # Definición de tools (function calling)
├── tool_executor.py  # Ejecución de cada tool → query SQL → string
└── rate_limiter.py   # Rate limiter in-memory

backend/app/api/
└── routes_telegram.py  # Endpoints REST para administrar el bot

backend/app/models/
└── telegram_user.py    # Modelos SQLAlchemy
```

---

## 6. Módulo por módulo

### 6.1 `bot.py` — Handler principal

**Responsabilidades:**
- Iniciar el bot en long-polling como `asyncio.Task`.
- Registrar handlers: `/start`, `/help`, comandos de admin, y mensajes de texto libre.
- Verificar whitelist, `bot_enabled`, y rate limit en cada mensaje.
- Orquestar el flujo LLM → tool → respuesta.

**Patrones importantes:**

```python
# Cache de grupos con TTL para evitar queries en cada mensaje
_group_cache: dict[int, bool] = {}
_GROUP_CACHE_TTL = 300  # segundos

# Historial de conversación in-memory
_conversation_history: dict[int, list[dict]] = {}
_MAX_HISTORY = 3
```

**Lookup de usuario — orden de seguridad:**
1. Por `telegram_user_id` (inmutable) — evita ataques de rotación de username.
2. Por `telegram_username` — fallback para usuarios existentes sin `user_id` almacenado.

**Auto-healing migration:** En `set_chat_id()`, si el `telegram_user_id` aún no está guardado en DB, se persiste en la primera interacción. Así los usuarios existentes se migran automáticamente sin intervención manual.

**Flujo de `handle_message`:**
```
1. Verificar que sea chat privado o grupo whitelisted
2. Si es grupo: verificar que el bot sea mencionado (@bot o reply)
3. Verificar whitelist → obtener user + config
4. Verificar bot_enabled
5. Verificar rate limit
6. Guardar chat_id + user_id (auto-healing)
7. Enviar "typing..."
8. LLM.interpret → decide tool_name + tool_params
9. Si hay tool: ejecutar tool → LLM.format_response
10. Si no hay tool: usar respuesta directa del LLM
11. Truncar a 4000 chars si excede el límite de Telegram
12. Responder
13. Actualizar historial
```

**Inicialización del bot:**
```python
async def start_bot(token: str) -> None:
    application = ApplicationBuilder().token(token).build()
    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("help", cmd_help))
    # ... más handlers ...
    application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message)
    )
    await application.initialize()
    await application.start()
    await application.updater.start_polling(
        allowed_updates=Update.ALL_TYPES,
        drop_pending_updates=True,  # Ignorar mensajes mientras el bot estuvo offline
    )
    # Mantener vivo indefinidamente
    try:
        await asyncio.Event().wait()
    finally:
        await application.updater.stop()
        await application.stop()
        await application.shutdown()
```

### 6.2 `service.py` — Lógica de negocio DB

CRUD puro sobre las tablas de Telegram. Funciones principales:

| Función | Descripción |
|---|---|
| `list_telegram_users(session)` | Lista todos los usuarios |
| `get_telegram_user_by_username(session, username)` | Lookup por username |
| `get_telegram_user_by_user_id(session, user_id)` | Lookup por ID numérico |
| `create_telegram_user(session, data)` | Alta de operador |
| `update_telegram_user(session, user_id, data)` | Editar rol/estado |
| `set_chat_id(session, username, chat_id, user_id)` | Auto-healing: persiste chat_id y user_id |
| `list_telegram_groups(session)` | Lista grupos autorizados |
| `create_telegram_group(session, data)` | Agregar grupo |
| `get_or_create_telegram_config(session)` | Obtener/crear config singleton |
| `update_telegram_config(session, data)` | Actualizar config del bot |

### 6.3 `llm_service.py` — Interfaz LLM

Abstracción unificada para OpenAI y Anthropic. El LLM se usa en **dos etapas**:

**Etapa 1 — `interpret()`:** Decide qué tool llamar y con qué parámetros.

**Etapa 2 — `format_response()`:** Convierte el resultado crudo de la tool en lenguaje natural para el usuario.

```python
@dataclass
class LLMResponse:
    tool_name: str | None
    tool_params: dict | None
    text: str | None
```

**Clientes cacheados a nivel de módulo:**
```python
_openai_client = None
_anthropic_client = None
```
Los clientes se inicializan una vez y se reutilizan para no crear un nuevo pool HTTP por cada mensaje.

**Diferencias entre proveedores:**

| | OpenAI | Anthropic |
|---|---|---|
| Tools | `tools` + `tool_choice: "auto"` | `tools` con formato diferente |
| System prompt | En `messages` con `role: "system"` | Parámetro `system` separado |
| Reasoning | `reasoning_effort` (solo en o3/o4/gpt-5) | No aplica |
| Detección de tool call | `finish_reason == "tool_calls"` | `block.type == "tool_use"` |

**Función `to_anthropic_tools()`** en `tools.py` convierte el formato OpenAI al formato Anthropic:
```python
# OpenAI: {"type": "function", "function": {"name": ..., "description": ..., "parameters": ...}}
# Anthropic: {"name": ..., "description": ..., "input_schema": ...}
```

**System prompt:** Definido como constante `SYSTEM_PROMPT` en `llm_service.py`. Cubre:
- Rol READ-ONLY (no proponer acciones)
- Formato para Telegram (conciso)
- Reglas de negocio específicas (ej: cómo hablar de pagos, variantes de cobro de links)

### 6.4 `tools.py` — Definición de herramientas

Dos listas de tools en formato OpenAI function calling:

```python
TOOLS_OPERADOR = [...]      # disponibles para todos los usuarios
TOOLS_ADMIN_EXTRA = [...]   # adicionales solo para admins

def get_tools_for_role(role: str) -> list[dict]:
    if role == "admin":
        return TOOLS_OPERADOR + TOOLS_ADMIN_EXTRA
    return TOOLS_OPERADOR
```

**Tools de operador** (consultas individuales):
- `buscar_alumno` — por DNI o nombre
- `ver_suscripciones` — suscripciones Mobbex de un alumno
- `ver_debitos` — historial de débitos
- `ver_estado_operacion` — último débito
- `ver_beca` — % de beca del alumno
- `ver_tarjeta` — tarjeta de débito asociada
- `ver_legajo` — link al legajo en sistema externo
- `ver_link_cambio_tarjeta` — link para que el alumno actualice su tarjeta
- `ver_beca_carrera` — % de beca de una carrera
- `buscar_link_pago` — link de pago (Mobbex/MercadoPago) según plan y variante

**Tools de admin** (estadísticas y cruce de datos):
- `estadisticas_recaudacion` — totales por mes/año
- `contar_alumnos` — conteo por condición
- `ver_ejecuciones` — últimas ejecuciones de cobro
- `ver_rechazos` — operaciones rechazadas recientes
- `ver_estado_archivos` — estado de carga de archivos del sistema
- `ver_calendario_debitos` — configuración del calendario de cobros
- `buscar_alumnos_con_suscripcion` — cruce padrón × suscripciones
- `buscar_operacion` — por uid Mobbex (con conciliación PayWay)
- `buscar_mapeo_token` — mapeo de tarjetas tokenizadas
- `buscar_por_tarjeta` — por últimos 4 dígitos de tarjeta
- `alumnos_por_fecha_registro` — alumnos por fecha de inscripción
- `contar_suscriptores_sin_alumno` — suscripciones sin alumno vinculado

**Seguridad importante:**
```python
# NOTA: agregar_operador, quitar_operador y listar_operadores
# NO se exponen como tools LLM para prevenir ataques de prompt injection.
# Solo se invocan vía comandos explícitos (/agregar_operador, etc.)
# donde el rol de admin se verifica directamente.
```

### 6.5 `tool_executor.py` — Ejecución de herramientas

Cada tool tiene un handler `async def _nombre_tool(params: dict, session: AsyncSession) -> str`.

La función de dispatch:
```python
async def execute_tool(session: AsyncSession, tool_name: str, params: dict) -> str:
    try:
        handler = _TOOL_HANDLERS.get(tool_name)
        if handler is None:
            return f"[Error interno] Tool desconocida: {tool_name}"
        return await handler(params, session)
    except Exception as exc:
        logger.exception("Error ejecutando tool %s: %s", tool_name, type(exc).__name__)
        return "[Error interno al ejecutar la consulta]"
```

**Regla:** `execute_tool` **nunca lanza excepciones** — los errores se devuelven como string para que el LLM los formatee en lenguaje natural.

**Patrón de llamada desde bot.py:**
```python
# El bot NO tiene una sesión activa; el executor abre su propia sesión
async def _db_call(coro_func, *args, **kwargs):
    async with get_session_factory()() as session:
        return await coro_func(session, *args, **kwargs)

result = await _db_call(execute_tool, tool_name, tool_params)
```

### 6.6 `rate_limiter.py` — Rate limiting

In-memory con ventana deslizante de 1 hora:

```python
class RateLimiter:
    def __init__(self, limit_per_hour: int = 200):
        self._buckets: DefaultDict[str, deque] = defaultdict(deque)

    def is_allowed(self, username: str, limit_override: int | None = None) -> bool:
        # Elimina timestamps fuera de la ventana de 1 hora
        # Retorna True si no se alcanzó el límite
```

**Instancia global:**
```python
rate_limiter = RateLimiter()
```

El límite por hora se lee de `TelegramConfig.rate_limit_per_hour` (configurable desde el panel, sin reiniciar el bot).

---

## 7. Integración con FastAPI (lifespan)

En `app/main.py`:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ...setup DB, migrations...

    # Bot de Telegram — solo si hay token
    bot_task = None
    if settings.telegram_bot_token:
        from app.modules.telegram.bot import start_bot
        bot_task = asyncio.create_task(start_bot(settings.telegram_bot_token))

        def _on_bot_done(task: asyncio.Task):
            if not task.cancelled() and task.exception() is not None:
                logging.getLogger("app.bot").error(
                    "El bot terminó inesperadamente: %s", task.exception()
                )

        bot_task.add_done_callback(_on_bot_done)

    app.state.bot_task = bot_task
    yield

    # Shutdown: cancelar el bot limpiamente
    if bot_task is not None:
        bot_task.cancel()
        try:
            await bot_task
        except asyncio.CancelledError:
            pass
```

El endpoint `/api/health` reporta el estado del bot:
```python
@app.get("/api/health")
async def health_check():
    bot_task = getattr(app.state, "bot_task", None)
    bot_active = bot_task is not None and not bot_task.done()
    return {"status": "ok", "bot_active": bot_active}
```

---

## 8. API REST de administración

Router montado en `/api/telegram`:

```python
app.include_router(routes_telegram.router, prefix="/api/telegram", tags=["telegram"])
```

**Endpoints de usuarios:**
- `GET    /api/telegram/users`         — listar operadores
- `POST   /api/telegram/users`         — agregar operador
- `PUT    /api/telegram/users/{id}`    — editar rol/estado
- `DELETE /api/telegram/users/{id}`    — eliminar operador

**Endpoints de grupos:**
- `GET    /api/telegram/groups`        — listar grupos
- `POST   /api/telegram/groups`        — agregar grupo
- `PUT    /api/telegram/groups/{id}`   — editar nombre/estado
- `DELETE /api/telegram/groups/{id}`   — eliminar grupo

**Endpoints de configuración:**
- `GET    /api/telegram/config`        — ver config actual
- `PUT    /api/telegram/config`        — actualizar config

Todos requieren autenticación Bearer (JWT del panel web).

---

## 9. Frontend — Página de administración

`frontend/src/pages/TelegramPage.tsx` — Tres secciones:

1. **Configuración del bot** — toggle `bot_enabled`, proveedor LLM, modelo, reasoning effort, rate limit, system prompt override.
2. **ABM de operadores** — tabla con username, rol (selector), estado (toggle activo/inactivo), si el chat está vinculado. Modal para agregar nuevos.
3. **ABM de grupos** — tabla con nombre, Chat ID, estado. Modal para agregar. Nota sobre cómo obtener el Chat ID de un grupo.

**Nota en el frontend sobre grupos:**
```
El ID de un grupo siempre es negativo (ej: -1001234567890).
Usá @getidsbot en el grupo para obtenerlo.
```

---

## 10. Flujo completo de un mensaje

```
Usuario → "¿Qué tarjeta tiene el DNI 12345678?"
                    │
                    ▼
         [bot.py: handle_message]
         ┌─────────────────────────────────────────────────────┐
         │ 1. ¿Grupo? → ¿bot mencionado? → ¿grupo whitelisted? │
         │ 2. get_authorized_user(username, user_id)            │
         │ 3. ¿bot_enabled? → rate_limit?                       │
         │ 4. set_chat_id (auto-healing)                        │
         │ 5. send_action("typing")                             │
         └─────────────────────────────────────────────────────┘
                    │
                    ▼
         [llm_service.py: LLMService.interpret()]
         ┌──────────────────────────────────────────┐
         │ System prompt + historial + tools + msg  │
         │                                          │
         │ LLM decide:                              │
         │   tool_name = "ver_tarjeta"              │
         │   tool_params = {"dni": "12345678"}      │
         └──────────────────────────────────────────┘
                    │
                    ▼
         [bot.py: _handle_tool_call]
         send_action("typing")   ← renovar antes de la 2da llamada LLM
                    │
                    ▼
         [tool_executor.py: execute_tool]
         ┌──────────────────────────────────────────┐
         │ _ver_tarjeta({"dni": "12345678"}, session)│
         │   → query a student_subscriptions        │
         │   → fallback a operations                │
         │ Retorna: "Tarjeta(s) del DNI 12345678:\n │
         │  • CFPEA — Visa Débito *1234"            │
         └──────────────────────────────────────────┘
                    │
                    ▼
         [llm_service.py: LLMService.format_response()]
         ┌──────────────────────────────────────────┐
         │ Formatea el resultado crudo en lenguaje  │
         │ natural y conciso para Telegram          │
         └──────────────────────────────────────────┘
                    │
                    ▼
         "El DNI 12345678 tiene registrada una Visa Débito
          terminada en 1234 en la cuenta CFPEA."
                    │
                    ▼
         update.message.reply_text(respuesta)
         _add_to_history(chat_id, "user", msg)
         _add_to_history(chat_id, "assistant", respuesta)
```

---

## 11. Roles y permisos

| Rol | Qué puede hacer |
|---|---|
| `operador` | Consultas individuales de alumnos (suscripciones, débitos, tarjeta, beca, legajo, links de pago) |
| `admin` | Todo lo anterior + estadísticas globales, rechazos, ejecuciones, cruce de datos, gestión de operadores |

**Comandos exclusivos de admin (no expuestos al LLM):**
- `/agregar_operador @username`
- `/quitar_operador @username`
- `/operadores`

El rol se verifica **antes** de ejecutar el comando, no solo en la lista de tools.

---

## 12. Soporte de grupos de Telegram

El bot puede operar en grupos de Telegram privados, además de chats privados.

**Condiciones para que el bot responda en un grupo:**
1. El grupo debe estar en la tabla `telegram_groups` con `is_active = true`.
2. El mensaje debe ir dirigido al bot: reply a un mensaje del bot, o mencionar `@bot_username`.
3. El usuario que escribe debe estar en la whitelist (`telegram_users`).

**Privacy Mode de Telegram:**
> El Privacy Mode debe estar **DESACTIVADO** en BotFather para que el bot reciba mensajes de texto libre en grupos. Sin este paso, el bot responde `/start` pero ignora `@bot buscame X` en grupos silenciosamente.
>
> **Cómo desactivar:** BotFather → `/mybots` → seleccionar bot → Bot Settings → Group Privacy → Turn off

**Cache de grupos:**
```python
_group_cache: dict[int, bool] = {}
_GROUP_CACHE_TTL = 300  # 5 minutos
```
Se cachea el resultado de la query por 5 minutos para no ir a DB en cada mensaje del grupo.

**Limpiar la mención del texto:**
```python
# En grupos, quitar @bot del texto para no confundir al LLM
if not is_private and context.bot.username:
    message_text = message_text.replace(f"@{context.bot.username}", "").strip()
```

---

## 13. Errores comunes y cómo evitarlos

### ❌ El bot no responde en grupos aunque está configurado

**Causa:** Privacy Mode activado en BotFather.
**Solución:** BotFather → `/mybots` → Bot Settings → Group Privacy → Turn off.

### ❌ `execute_tool` se llama con la sesión del request HTTP

**Causa:** En FastAPI, las sesiones de `get_session()` son del request HTTP. El bot corre como asyncio.Task fuera de ese contexto.
**Solución:** El bot crea sus propias sesiones con `get_session_factory()`:
```python
async def _db_call(coro_func, *args, **kwargs):
    async with get_session_factory()() as session:
        return await coro_func(session, *args, **kwargs)
```

### ❌ Error "typing..." expira antes de que el LLM responda

**Causa:** Telegram cancela el "typing" indicator después de ~5 segundos.
**Solución:** Enviar dos `send_action("typing")` — uno antes del primer LLM call y otro antes del segundo:
```python
await update.message.chat.send_action("typing")  # antes de interpret()
# ...después de ejecutar la tool...
await update.message.chat.send_action("typing")  # antes de format_response()
```

### ❌ El historial de conversación confunde al LLM

**Causa:** El historial crece indefinidamente y el LLM recibe contexto irrelevante.
**Solución:** Limitar a los últimos 3 mensajes:
```python
_MAX_HISTORY = 3
if len(history) > _MAX_HISTORY:
    _conversation_history[chat_id] = history[-_MAX_HISTORY:]
```

### ❌ El bot responde a mensajes que no son para él en grupos

**Causa:** No se verifica si el mensaje va dirigido al bot antes de procesar.
**Solución:** Verificar primero (sin query a DB) y luego verificar whitelist:
```python
if is_group:
    if not _is_bot_addressed(update, context):
        return  # salir antes de cualquier query a DB
    if not await _is_group_whitelisted(group_chat_id):
        return
```

### ❌ Mensajes perdidos cuando el bot estuvo offline

**Causa:** Por defecto python-telegram-bot procesa mensajes pendientes al reiniciar.
**Solución:**
```python
await application.updater.start_polling(
    allowed_updates=Update.ALL_TYPES,
    drop_pending_updates=True,  # ignorar mensajes acumulados mientras estaba offline
)
```

### ❌ El LLM llama tools de gestión de operadores por prompt injection

**Causa:** Si se exponen `agregar_operador`/`quitar_operador` como tools LLM, un usuario puede engañar al LLM.
**Solución:** Estas tools se invocan **solo** desde comandos explícitos (`/agregar_operador`), donde el rol de admin se verifica directamente. No se exponen en la lista de tools del LLM.

### ❌ `telegram_user_id` no se guarda y los usuarios quedan sin auth por ID

**Causa:** El `user_id` numérico no se almacena al crear el usuario desde el panel.
**Solución:** Auto-healing en `set_chat_id()` — la primera vez que el usuario manda un mensaje, se guarda su `telegram_user_id`:
```python
if user_id is not None and user.telegram_user_id is None:
    user.telegram_user_id = user_id
    changed = True
```

---

## 14. Tests

Los tests del módulo Telegram están en `backend/tests/test_telegram.py`.

Cubren:
- ABM de usuarios (CRUD completo)
- ABM de grupos (CRUD completo)
- Configuración del bot (GET/PUT)
- Rate limiter (is_allowed, remaining, seconds_until_reset)
- Tools de operador y admin
- Auth (usuario inactivo, usuario inexistente)

Para correr:
```bash
cd backend
pytest tests/test_telegram.py -v
```
