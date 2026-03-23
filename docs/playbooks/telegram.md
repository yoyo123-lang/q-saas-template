# Playbook: Bot de Telegram con LLM

> Guía agnóstica para integrar un bot de Telegram con function calling de LLM.
> Stack probado: Python + FastAPI + SQLAlchemy + OpenAI/Anthropic.
> Referencia detallada: `docs/telegram/TELEGRAM_BOT_IMPLEMENTACION.md` y `docs/telegram/TELEGRAM_BOT_TUTORIAL_ALTA.md`

---

## Cuándo usar esto

- Querés un bot de Telegram que responda en lenguaje natural usando un LLM.
- El bot necesita consultar datos de tu aplicación (DB, APIs internas).
- Querés controlar quién puede usar el bot (whitelist de usuarios).
- Necesitás diferentes niveles de acceso (roles: operador, admin).

## Arquitectura general

```
Usuario de Telegram
       │
       │ mensaje en lenguaje natural
       ▼
  [Bot long-polling]  ← asyncio.Task dentro del proceso del servidor
       │
       │ 1. Verificar whitelist (tabla de usuarios autorizados)
       │ 2. Verificar que el bot esté habilitado
       │ 3. Rate limiting
       │ 4. LLM interpreta → decide qué tool llamar (function calling)
       │ 5. Ejecutar la tool (query a DB, llamada a API, etc.)
       │ 6. LLM formatea el resultado en lenguaje natural
       │
       ▼
  Respuesta al usuario
```

**Decisiones clave:**
- **Long-polling** (no webhook): más simple, no requiere HTTPS público ni URL fija.
- **Bot como asyncio.Task** dentro del mismo proceso del servidor. No es un servicio separado.
- **LLM como intérprete de intención** (function calling): el LLM decide QUÉ función ejecutar, pero no ve datos crudos directamente.
- **Rate limiter in-memory**: suficiente para <50 usuarios concurrentes.

## Variables de entorno

```bash
# Token del bot (obtener de @BotFather en Telegram)
TELEGRAM_BOT_TOKEN=

# Proveedor LLM (al menos uno)
OPENAI_API_KEY=       # si usás OpenAI
ANTHROPIC_API_KEY=    # si usás Anthropic
```

El bot **solo inicia si `TELEGRAM_BOT_TOKEN` está configurado**. Si falta, el servidor arranca normalmente sin bot.

## Estructura de archivos del módulo

```
app/modules/telegram/
├── __init__.py
├── bot.py            # Handler principal, long-polling, comandos
├── service.py        # CRUD de usuarios/grupos/config en DB
├── llm_service.py    # Interfaz unificada OpenAI/Anthropic
├── tools.py          # Definición de tools (function calling)
├── tool_executor.py  # Ejecución de cada tool → resultado string
└── rate_limiter.py   # Rate limiter in-memory

app/api/
└── routes_telegram.py  # Endpoints REST para administrar el bot

app/models/
└── telegram_user.py    # Modelos de DB
```

## Modelos de base de datos

### Usuarios autorizados

```python
# Adaptar al ORM del proyecto (SQLAlchemy, Prisma, etc.)
class TelegramUser:
    id: int                    # PK
    telegram_username: str     # username de Telegram (sin @), unique
    telegram_user_id: int?     # ID numérico inmutable, se autocompleta en primer mensaje
    telegram_chat_id: int?     # ID del chat privado, se autocompleta
    role: str                  # "operador" | "admin"
    is_active: bool            # permite desactivar sin borrar
    created_at: datetime
    updated_at: datetime
```

**Importante:** El `telegram_username` es mutable (el usuario puede cambiarlo). El `telegram_user_id` es el identificador numérico inmutable. Siempre guardar ambos y priorizar la búsqueda por `user_id`.

### Grupos autorizados (opcional)

```python
class TelegramGroup:
    id: int
    chat_id: int         # siempre negativo (ej: -1001234567890)
    name: str
    is_active: bool
    created_at: datetime
```

### Configuración del bot (singleton)

```python
class TelegramConfig:
    id: int = 1                          # singleton
    bot_enabled: bool = False            # arranca desactivado
    llm_provider: str = "openai"         # "openai" | "anthropic"
    llm_model: str = "gpt-4o-mini"       # modelo a usar
    rate_limit_per_hour: int = 200       # por usuario
    system_prompt_override: str?         # override del prompt del sistema
```

## Componentes clave

### bot.py — Handler principal

Responsabilidades:
- Iniciar bot en long-polling como `asyncio.Task`
- Registrar handlers: `/start`, `/help`, comandos admin, mensajes de texto
- Verificar whitelist, `bot_enabled`, rate limit en cada mensaje
- Orquestar flujo: LLM interpret → tool execute → LLM format

**Flujo de `handle_message`:**
```
1. ¿Chat privado o grupo whitelisted?
2. Si grupo: ¿el bot fue mencionado (@bot o reply)?
3. Buscar usuario en whitelist (primero por user_id, luego por username)
4. ¿Bot habilitado? ¿Rate limit ok?
5. Auto-healing: guardar chat_id y user_id si no estaban
6. Enviar "typing..."
7. LLM.interpret() → decide tool_name + tool_params
8. Si hay tool: ejecutar → LLM.format_response()
9. Truncar a 4000 chars (límite de Telegram)
10. Responder y actualizar historial
```

**Inicialización del bot (ejemplo Python):**

```python
async def start_bot(token: str) -> None:
    application = ApplicationBuilder().token(token).build()
    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("help", cmd_help))
    application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message)
    )
    await application.initialize()
    await application.start()
    await application.updater.start_polling(
        allowed_updates=Update.ALL_TYPES,
        drop_pending_updates=True,  # ignorar mensajes acumulados mientras offline
    )
    try:
        await asyncio.Event().wait()  # mantener vivo
    finally:
        await application.updater.stop()
        await application.stop()
        await application.shutdown()
```

### llm_service.py — Interfaz LLM

El LLM se usa en **dos etapas**:

1. **`interpret()`:** Recibe el mensaje del usuario + tools disponibles. Decide qué tool llamar y con qué parámetros.
2. **`format_response()`:** Recibe el resultado crudo de la tool. Lo convierte en lenguaje natural para Telegram.

```python
@dataclass
class LLMResponse:
    tool_name: str | None      # None si no hay tool que ejecutar
    tool_params: dict | None
    text: str | None           # respuesta directa si no hay tool
```

**Diferencias entre proveedores:**

| Aspecto | OpenAI | Anthropic |
|---|---|---|
| Tools format | `{"type": "function", "function": {...}}` | `{"name": ..., "input_schema": ...}` |
| System prompt | En `messages` con `role: "system"` | Parámetro `system` separado |
| Tool call detection | `finish_reason == "tool_calls"` | `block.type == "tool_use"` |

### tools.py — Definición de herramientas

Dos listas por rol:

```python
TOOLS_OPERADOR = [...]      # consultas básicas
TOOLS_ADMIN_EXTRA = [...]   # estadísticas y gestión

def get_tools_for_role(role: str) -> list[dict]:
    if role == "admin":
        return TOOLS_OPERADOR + TOOLS_ADMIN_EXTRA
    return TOOLS_OPERADOR
```

**Seguridad crítica:** Las operaciones de gestión de usuarios (agregar/quitar operadores) **NO se exponen como tools del LLM**. Solo se ejecutan vía comandos explícitos (`/agregar_operador`) donde el rol se verifica directamente. Esto previene ataques de prompt injection.

### tool_executor.py — Ejecución

```python
async def execute_tool(session, tool_name: str, params: dict) -> str:
    handler = _TOOL_HANDLERS.get(tool_name)
    if handler is None:
        return f"[Error interno] Tool desconocida: {tool_name}"
    try:
        return await handler(params, session)
    except Exception:
        return "[Error interno al ejecutar la consulta]"
```

**Regla:** `execute_tool` **nunca lanza excepciones** — los errores se devuelven como string para que el LLM los formatee.

### rate_limiter.py — Rate limiting

```python
class RateLimiter:
    def __init__(self, limit_per_hour: int = 200):
        self._buckets: dict[str, deque] = defaultdict(deque)

    def is_allowed(self, username: str) -> bool:
        # Ventana deslizante de 1 hora
        # Elimina timestamps viejos, retorna True si no alcanzó el límite
```

## Integración con el servidor (FastAPI)

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    bot_task = None
    if settings.telegram_bot_token:
        from app.modules.telegram.bot import start_bot
        bot_task = asyncio.create_task(start_bot(settings.telegram_bot_token))

        def _on_bot_done(task):
            if not task.cancelled() and task.exception():
                logger.error("Bot terminó inesperadamente: %s", task.exception())
        bot_task.add_done_callback(_on_bot_done)

    app.state.bot_task = bot_task
    yield

    if bot_task is not None:
        bot_task.cancel()
        try:
            await bot_task
        except asyncio.CancelledError:
            pass
```

## API REST de administración

```
GET    /api/telegram/users         # listar operadores
POST   /api/telegram/users         # agregar operador
PUT    /api/telegram/users/{id}    # editar rol/estado
DELETE /api/telegram/users/{id}    # eliminar operador

GET    /api/telegram/groups        # listar grupos
POST   /api/telegram/groups        # agregar grupo
PUT    /api/telegram/groups/{id}   # editar
DELETE /api/telegram/groups/{id}   # eliminar

GET    /api/telegram/config        # ver config actual
PUT    /api/telegram/config        # actualizar config
```

Todos requieren autenticación (Bearer token o equivalente del proyecto).

## Dependencias

```
# requirements.txt
python-telegram-bot>=21.0,<22
openai>=1.60,<2       # si usás OpenAI
anthropic>=0.45,<1    # si usás Anthropic
```

## Alta del bot — Pasos manuales

### 1. Crear bot en BotFather

1. En Telegram, buscar `@BotFather` → `/start`
2. Enviar `/newbot`
3. Elegir nombre y username (debe terminar en `bot`)
4. Guardar el token (formato: `7123456789:AAFxxx...`)
5. **Si se va a usar en grupos:** desactivar Privacy Mode:
   ```
   /mybots → tu bot → Bot Settings → Group Privacy → Turn off
   ```

### 2. Configurar variables de entorno

En la plataforma de deploy (Railway, Render, etc.):
- `TELEGRAM_BOT_TOKEN` = token de BotFather
- `OPENAI_API_KEY` o `ANTHROPIC_API_KEY` = clave del proveedor LLM

### 3. Verificar que arrancó

En los logs del servidor buscar: `Bot de Telegram activo.`

O via API: `GET /api/health` → `{"bot_active": true}`

### 4. Activar y agregar operadores

Desde el panel web de administración:
1. Habilitar bot (`bot_enabled = true`)
2. Agregar tu usuario como admin
3. Enviar `/start` al bot en Telegram
4. Probar con una consulta

## Checklist de integración

- [ ] Crear bot en BotFather → obtener token
- [ ] Desactivar Privacy Mode si se va a usar en grupos
- [ ] Obtener API Key de OpenAI o Anthropic
- [ ] Crear tablas en DB (usuarios, config, grupos)
- [ ] Implementar módulo `telegram/` (bot, service, llm_service, tools, tool_executor, rate_limiter)
- [ ] Integrar con el lifespan del servidor (asyncio.Task)
- [ ] Crear endpoints REST de administración
- [ ] Crear panel web de administración (config, usuarios, grupos)
- [ ] Definir tools según el dominio del proyecto
- [ ] Implementar executors para cada tool
- [ ] Configurar variables de entorno en deploy
- [ ] Verificar bot activo en logs y `/api/health`
- [ ] Activar bot desde panel web
- [ ] Agregar admin y probar flujo completo

## Decisiones de diseño

| Decisión | Razón |
|---|---|
| Long-polling (no webhook) | Más simple; no requiere HTTPS público ni URL fija |
| Bot como asyncio.Task (no servicio separado) | Menos infra; comparte el proceso del servidor |
| LLM en dos etapas (interpret + format) | Separa la decisión de la presentación |
| Tools de gestión fuera del LLM | Previene prompt injection en operaciones sensibles |
| Rate limiter in-memory | Suficiente para <50 usuarios; evita depender de Redis |
| Historial limitado a 3 mensajes | Evita que contexto irrelevante confunda al LLM |
| `drop_pending_updates=True` | No procesar mensajes acumulados durante downtime |
| Lookup por user_id antes que username | El username es mutable; el user_id numérico no |

## Errores comunes

| Error | Causa | Fix |
|---|---|---|
| Bot no responde en grupos | Privacy Mode activado en BotFather | Desactivar desde `/mybots → Bot Settings → Group Privacy` |
| `execute_tool` usa sesión del request HTTP | En FastAPI, las sesiones del request no sirven para el bot | El bot debe crear sus propias sesiones de DB |
| "typing..." desaparece antes de responder | Telegram cancela el indicator después de ~5s | Enviar dos `send_action("typing")`: antes de interpret y antes de format |
| Historial confunde al LLM | Crece indefinidamente | Limitar a últimos 3 mensajes |
| Bot responde a todo en grupos | No verifica si fue mencionado | Verificar `@bot` o reply antes de procesar |
| Mensajes viejos al reiniciar | `drop_pending_updates` no está activado | Agregar `drop_pending_updates=True` en `start_polling` |
| Prompt injection para gestionar operadores | Tools de gestión expuestas al LLM | Mover a comandos explícitos fuera del LLM |
| Auth falla después de cambio de username | Se busca solo por username mutable | Implementar auto-healing de user_id |

---

*Referencia detallada: `docs/telegram/TELEGRAM_BOT_IMPLEMENTACION.md` y `docs/telegram/TELEGRAM_BOT_TUTORIAL_ALTA.md`*
