# Integrar Bot de Telegram con LLM

> Skill para integrar un bot de Telegram con function calling de LLM.
> Invocar con: `/project:telegram`
> Lee el playbook y guía al usuario paso a paso.

## Paso 1: Leer el playbook

Leé en silencio:
- `docs/playbooks/telegram.md` — guía agnóstica de integración
- `docs/telegram/TELEGRAM_BOT_IMPLEMENTACION.md` — referencia detallada (si existe)
- `docs/telegram/TELEGRAM_BOT_TUTORIAL_ALTA.md` — guía operacional (si existe)
- `docs/ARCHITECTURE.md` — para entender el stack actual

## Paso 2: Evaluar el proyecto

Antes de hacer cualquier cambio:
- ¿El proyecto tiene backend Python (FastAPI/Django/etc.)? El bot necesita asyncio.
- ¿Tiene base de datos? Se necesita para whitelist de usuarios y configuración.
- ¿Qué datos o funcionalidades va a exponer el bot? Esto define las tools.
- ¿Ya tiene un proveedor LLM configurado (OpenAI/Anthropic)?

## Paso 3: Preguntar al usuario

Hacé estas preguntas (de a 2-3):

1. **¿Qué va a poder hacer el bot?** (consultar datos, ejecutar acciones, ambas cosas) — esto define las tools
2. **¿Qué roles necesitás?** (operador básico + admin, o algo más granular)
3. **¿El bot va a funcionar en chats privados, grupos, o ambos?**
4. **¿Qué proveedor de LLM preferís?** (OpenAI con gpt-4o-mini es el más económico y probado)
5. **¿Ya tenés el token del bot de Telegram?** — si no, guiar a crearlo con @BotFather

## Paso 4: Definir las tools

Con lo que el usuario necesita, armá una lista de tools:

```
TOOLS DEL BOT:

Operador:
- tool_1: descripción
- tool_2: descripción

Admin (adicionales):
- tool_3: descripción

FUERA DEL LLM (comandos directos):
- /agregar_operador
- /quitar_operador
```

Regla: las operaciones de gestión de usuarios NUNCA van como tools del LLM (prevención de prompt injection).

## Paso 5: Planificar

```
SESIÓN: Integración Bot de Telegram
OBJETIVO: [descripción]

PASOS:
1. Crear modelos de DB (usuarios, config, grupos)
2. Implementar módulo telegram/ (bot, service, llm_service, tools, tool_executor, rate_limiter)
3. Integrar con el lifespan del servidor
4. Crear endpoints REST de administración
5. [panel web si aplica]

ARCHIVOS QUE VOY A CREAR:
- [lista]
```

## Paso 6: Esperar aprobación

No escribas código hasta que el usuario apruebe el plan y la lista de tools.

## Paso 7: Implementar

Seguí el playbook `docs/playbooks/telegram.md`. Orden recomendado:
1. Modelos de DB + migraciones
2. `service.py` (CRUD)
3. `tools.py` + `tool_executor.py` (definición y ejecución)
4. `llm_service.py` (interfaz LLM)
5. `rate_limiter.py`
6. `bot.py` (handler principal + integración)
7. `routes_telegram.py` (API REST)
8. Frontend de admin (si aplica)

## Paso 8: Verificar

- [ ] Correr build/tests del proyecto
- [ ] Bot arranca (ver log "Bot de Telegram activo")
- [ ] `/api/health` reporta `bot_active: true`
- [ ] `/start` responde correctamente a un usuario autorizado
- [ ] Una consulta de prueba devuelve datos reales
- [ ] Un usuario no autorizado recibe "No tenés acceso"
- [ ] Rate limiter funciona
- [ ] (Si hay grupos) El bot responde en grupos whitelisted
- [ ] Actualizar `docs/ARCHITECTURE.md`
- [ ] Actualizar `SESSION_LOG.md`
