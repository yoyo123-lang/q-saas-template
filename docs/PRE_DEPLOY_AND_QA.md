# Validación Pre-Deploy y QA Funcional

> Este archivo complementa a `CLAUDE.md` y `DEBUGGING.md`.
> Resuelve tres problemas concretos:
> 1. Código que se sube roto (no compila en producción).
> 2. Código que compila pero no hace lo que se pidió.
> 3. Herramientas de debug que no sirven para diagnosticar.

---

## PARTE 1: Pre-Deploy — Nada sale si no compila

### Regla absoluta

**Antes de hacer push, commit final, o cualquier subida a producción (Vercel u otro host), Claude Code DEBE correr el build completo localmente y verificar que pase sin errores.**

No hay excepciones. Si no compila acá, no va a compilar allá.

### Secuencia obligatoria antes de push

```
1. npm run build          (o el equivalente del proyecto)
   → Si falla: arreglar TODOS los errores. Repetir hasta que pase limpio.

2. npm run lint            (si existe)
   → Si hay errores (no warnings): arreglar antes de continuar.

3. npm test               (si hay tests)
   → Si falla algún test: arreglar antes de continuar.

4. Revisar el output del build buscando:
   - Warnings de TypeScript que indiquen problemas reales
   - Imports que no resuelven
   - Variables de entorno que falten
```

### Errores comunes que DEBEN detectarse ANTES del push

| Error | Cómo detectarlo | Qué hacer |
|-------|-----------------|-----------|
| Error de tipos TypeScript | `npm run build` falla | Arreglar el tipo, no poner `any` ni `as unknown` |
| Import de archivo que no existe | `npm run build` falla | Verificar ruta y nombre exacto |
| Variable de entorno faltante | Build pasa pero la app crashea | Verificar contra `.env.example` |
| Dependencia no instalada | `npm run build` falla | `npm install` y verificar `package.json` |
| Prisma: esquema desactualizado | Build falla con error de tipos Prisma | `npx prisma generate` antes del build |
| Prisma: migración no aplicada | La app levanta pero falla al consultar DB | `npx prisma migrate deploy` |

### Lo que Claude Code DEBE decir antes de hacer push

```
✅ Build local: pasó sin errores
✅ Lint: limpio (o N warnings no críticos)
✅ Tests: X de X pasaron
→ Procedo a hacer push a [branch]
```

Si no puede confirmar estos tres puntos, NO debe hacer push.

---

## PARTE 2: QA Funcional — Que compile no significa que funcione

### Regla de verificación funcional

**Después de implementar cualquier funcionalidad, Claude Code DEBE verificar que produce resultados reales, no solo que no tira errores.**

Un build exitoso solo confirma que no hay errores de sintaxis o tipos. NO confirma que la funcionalidad hace lo que se pidió.

### Qué verificar según el tipo de funcionalidad

#### Workers, crons o procesos batch

1. ¿Procesó datos reales? Si procesó 0 registros: investigar POR QUÉ antes de declarar terminado.
2. ¿El resultado tiene sentido? Si debería encontrar 50 items y encontró 0, algo está mal.
3. ¿Los datos se guardaron correctamente? Verificar en la base de datos.

#### APIs o endpoints

1. Hacer al menos UNA llamada real con datos reales. No alcanza con "responde 200".
2. Probar el caso más común Y al menos un caso borde.

#### Pantallas o interfaces

1. ¿La pantalla muestra datos reales? Si muestra "No hay datos" cuando debería haber, investigar.
2. ¿Los botones/acciones funcionan? Verificar estados de carga, error y éxito.

### Lo que Claude Code DEBE reportar después de implementar

```
FUNCIONALIDAD: [nombre]

VERIFICACIÓN FUNCIONAL:
- Ejecuté: [qué se hizo para probar]
- Resultado obtenido: [datos concretos]
- Resultado esperado: [qué debería haber pasado]
- ¿Coinciden? Sí / No

SI NO COINCIDEN:
- Diferencia: [qué no cuadra]
- Causa probable: [hipótesis]
- Próximo paso: [qué voy a hacer para arreglarlo]
```

### Anti-patrones de QA

- ❌ "El endpoint responde 200" → eso no dice nada sobre si los datos son correctos
- ❌ "El worker ejecutó sin errores" → si procesó 0 registros, no hizo nada útil
- ❌ "Funciona correctamente" sin mostrar evidencia concreta
- ❌ Declarar terminado algo que devuelve arrays vacíos o contadores en cero
- ❌ Mostrar solo el log de éxito e ignorar los warnings o errores parciales

---

## PARTE 3: Herramientas de Debug — Que sirvan para encontrar el problema

> Para la metodología general de debugging (pasos, errores silenciosos, logging) → ver `DEBUGGING.md`.
> Esta sección trata exclusivamente sobre la **calidad de las herramientas de diagnóstico** que construye Claude Code.

### Regla principal: diagnosticar ANTES de construir herramientas

```
ANTES de crear cualquier herramienta de debug, Claude Code DEBE:

1. Leer los logs de error existentes completos
2. Identificar la línea exacta donde falla
3. Formular una hipótesis de por qué falla
4. Verificar la hipótesis directamente (leyendo código, datos, config)

Solo si después de esto no puede encontrar la causa → construir una herramienta específica.
```

**La herramienta de debug es el ÚLTIMO recurso, no el primero.**

### Si hay que construir debug, que sea específico

```
❌ MAL: Página genérica que muestra "estado del sistema"
✅ BIEN: Prueba específica que ejecuta el paso que falla, con datos reales,
         y muestra exactamente dónde se rompe

❌ MAL: Loguear "proceso iniciado... proceso terminado"
✅ BIEN: Loguear cada paso intermedio con los datos que maneja:
         - "Buscando dominios en página X → encontrados: [lista]"
         - "Consultando RDAP para dominio Y → respuesta: [status, datos]"
         - "Guardando dominio Z → resultado: [éxito/error, detalle]"
```

### Estructura de una herramienta de debug útil

```
HIPÓTESIS QUE ESTOY VERIFICANDO:
"Creo que [X] falla porque [Y]. Esta herramienta va a confirmar o descartar eso."

QUÉ HACE:
1. Ejecuta el paso que falla, aislado del resto
2. Muestra datos de ENTRADA
3. Muestra cada PASO INTERMEDIO
4. Muestra la SALIDA vs lo ESPERADO

CÓMO INTERPRETAR:
- Si muestra [A]: el problema es [X], la solución es [M]
- Si muestra [B]: el problema es [Y], la solución es [N]
```

### Lo que Claude Code DEBE hacer cuando le pido debug

```
PASO 1: Leer los logs/errores existentes y decirme qué encontró
PASO 2: Formular hipótesis concreta ("creo que falla porque...")
PASO 3: Verificar la hipótesis de la forma más directa posible
PASO 4: Si no alcanza, proponer herramienta de debug específica
PASO 5: Ejecutar y reportar hallazgos con datos reales
PASO 6: Proponer solución basada en lo que encontró
```

---

## PARTE 4: Definition of Done

Antes de declarar CUALQUIER tarea como terminada:

### Nivel 1: Compila (obligatorio siempre)
- [ ] Build pasa sin errores
- [ ] Lint pasa sin errores
- [ ] No hay imports rotos ni dependencias faltantes
- [ ] Variables de entorno necesarias documentadas

### Nivel 2: Funciona (obligatorio para features y fixes)
- [ ] Se probó con datos reales
- [ ] El resultado tiene sentido (no arrays vacíos ni contadores en cero sin explicación)
- [ ] Se verificó caso común + al menos un caso borde
- [ ] Errores parciales identificados y explicados

### Nivel 3: Es útil (obligatorio para herramientas de debug)
- [ ] Muestra información accionable, no genérica
- [ ] Se probó contra el problema real que se investiga
- [ ] El resultado permite tomar una decisión o avanzar

---

*Un deploy exitoso no es cuando el código llega a producción. Es cuando el usuario obtiene lo que pidió.*
