# Convenciones de Código

> Reglas de estilo y patrones que Claude Code DEBE seguir.
> Si ya hay un patrón en el proyecto, seguilo aunque conozcas una forma "mejor".
> Consistencia > genialidad.
>
> Para manejo de errores → ver `DEBUGGING.md` (es la única fuente de verdad sobre ese tema)
> Para reglas de testing → ver `TESTING.md` (es la única fuente de verdad sobre ese tema)

## Principio rector

El código se escribe para humanos que lo van a leer después, no para la máquina. Si alguien nuevo abre un archivo y no entiende qué hace en 30 segundos, el código es demasiado complejo.

## Nomenclatura

### Principios (aplican a cualquier lenguaje)

- Los nombres deben decir QUÉ HACE, no cómo lo hace
- Evitar abreviaciones salvo las universales (id, url, api, db)
- Nombres de una letra solo para iteradores triviales (i, j)
- Booleanos empiezan con is/has/can/should
- Funciones empiezan con verbo: get, create, validate, send, calculate

```
✅ getUserById(userId)       ❌ getData(id)
✅ isPaymentValid            ❌ flag
✅ calculateTotalWithTax()   ❌ processStuff()
✅ MAX_RETRY_ATTEMPTS        ❌ x, tmp, val
```

### Convenciones por lenguaje

Seguir la convención estándar del lenguaje del proyecto:

| Lenguaje | Variables/funciones | Clases | Constantes | Archivos |
|----------|-------------------|--------|------------|----------|
| JavaScript/TS | camelCase | PascalCase | SCREAMING_SNAKE | camelCase o kebab-case |
| Python | snake_case | PascalCase | SCREAMING_SNAKE | snake_case |
| Go | camelCase/PascalCase | PascalCase | PascalCase | snake_case |
| PHP | camelCase | PascalCase | SCREAMING_SNAKE | PascalCase |

**Usar siempre lo que ya exista en el proyecto.** Si el proyecto ya tiene un estilo, ese estilo gana.

## Estructura de funciones

### Regla de las 30 líneas

Si una función tiene más de 30 líneas, probablemente hace demasiadas cosas. Partila.

### Una función = una responsabilidad

Si necesitás la palabra "y" para describir qué hace, son dos funciones.

### Patrón "early return"

Validar al inicio y salir rápido. Evitar pirámides de ifs anidados. Esto aplica en cualquier lenguaje:

```
✅ Bien: Validar → retornar error temprano → lógica principal limpia
❌ Mal: if → if → if → lógica enterrada en 3 niveles de nesting
```

## Comentarios

### Cuándo sí

- El "por qué" detrás de decisiones no obvias
- Workarounds o hacks temporales (con TODO y fecha)
- Regex complejas o lógica de negocio enrevesada
- Links a documentación externa relevante

### Cuándo no

- Lo que el código ya dice claramente ("obtiene el usuario por ID")
- Código comentado "por las dudas" (para eso está Git)
- Explicaciones de sintaxis básica del lenguaje

## Imports y dependencias

- Agrupar imports: primero librerías externas, luego módulos internos
- No importar cosas que no se usan
- Preferir imports específicos sobre importar módulos enteros

## Formato y linting

**No le pidas a Claude Code que formatee código manualmente.** Usá las herramientas automáticas del proyecto. Esto se configura en `docs/HOOKS.md` para que corra automáticamente.

## API / Endpoints

- Usar verbos HTTP correctos (GET lee, POST crea, PUT/PATCH actualiza, DELETE borra)
- Respuestas con estructura consistente (definir UNA estructura y usarla siempre)
- Validar TODOS los inputs del usuario en el boundary (controller/route/handler)
- Códigos HTTP apropiados (200, 201, 400, 401, 403, 404, 500)

## Base de datos

- Queries parametrizadas SIEMPRE. Nunca concatenar inputs del usuario en queries
- Verificar resultados vacíos explícitamente (no asumir que siempre hay datos)
- Índices para columnas que se usan en filtros o joins
- Nombres de tablas en plural, columnas en singular (convención, ajustar al proyecto)

## Supabase

### Migraciones obligatorias

Si el proyecto usa Supabase, toda modificación al schema de la base de datos DEBE tener una migración correspondiente.

**Estructura obligatoria:**
```
supabase/
  migrations/
    YYYYMMDDHHMMSS_nombre_descriptivo.sql
  seed.sql (opcional)
```

**Convención de nombres:**
- Formato: `YYYYMMDDHHMMSS_nombre_descriptivo.sql`
- El nombre describe QUÉ hace la migración, no cuándo
- Ejemplos:
  - `20260323120000_create_users_table.sql`
  - `20260323120100_add_email_index_to_users.sql`
  - `20260323120200_create_notifications_table.sql`

**Reglas:**
1. **Toda tarea que cambie schema debe incluir migración.** No se acepta "después la creo".
2. Las migraciones son idempotentes cuando sea posible (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
3. Cada migración tiene un solo propósito. No mezclar creación de tabla con seed de datos.
4. Las migraciones destructivas (DROP, ALTER TYPE, etc.) requieren confirmación explícita del usuario.
5. Usar `supabase migration new nombre` para generar el timestamp correcto.

**En el plan de implementación:** toda etapa que modifique modelo de datos debe incluir una tarea de migración como parte de la etapa (→ ver `docs/PLANNING.md`).

---

*Estas convenciones se aplican a menos que el proyecto ya tenga convenciones propias. En ese caso, las del proyecto tienen prioridad.*
