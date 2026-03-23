# Test-Driven Development — Proceso Obligatorio

> Para la estrategia de testing por capas (qué testear, cobertura, datos) → ver `TESTING.md`.
> Este archivo describe el PROCESO de cómo escribir código nuevo con tests.
> Es obligatorio para lógica de negocio, endpoints, y servicios.
> Es opcional para cambios cosméticos, documentación, y configuración.

## El ciclo Red-Green-Refactor

```text
┌─────────────────────────────────────────────────────┐
│                                                     │
│  1. RED: Escribir un test que describe              │
│     lo que el código DEBERÍA hacer.                 │
│     Correrlo. DEBE FALLAR.                          │
│     Si pasa sin escribir código → el test           │
│     no está testeando nada útil. Reescribirlo.      │
│                                                     │
│  2. GREEN: Escribir el código MÍNIMO                │
│     para que el test pase.                          │
│     No más. No "por si acaso". No "ya que estamos". │
│     Correr el test. DEBE PASAR.                     │
│     Correr TODOS los tests. DEBEN PASAR.            │
│                                                     │
│  3. REFACTOR (opcional): Si el código que           │
│     escribiste es feo pero funciona, ahora          │
│     limpialo. Los tests te protegen.                │
│     Correr TODOS los tests después de refactorear.  │
│                                                     │
│  4. COMMIT: Test + código + refactor = un commit.   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Reglas estrictas

### Lo que NUNCA se puede hacer

1. **Escribir código de producción sin un test que lo justifique.** Si no hay un test fallando que requiera ese código, el código no se escribe.

2. **Escribir más código del necesario para pasar el test.** Si el test pide que `suma(2, 3)` devuelva `5`, la implementación es `return a + b`. No es `return a + b + 0` "por robustez", ni agregar validaciones que ningún test pide todavía.

3. **Commitear código con tests que fallan.** Si un test falla, se arregla antes de commitear. No se comenta el test. No se skipea. No se deja "para después".

4. **Borrar o comentar un test para que "pase el build".** Si un test molesta es porque encontró un bug. Arreglar el bug, no matar al mensajero.

### Lo que SÍ se puede hacer

- Escribir varios tests primero (todos en rojo) y después implementar uno por uno. Esto es útil cuando tenés claro todos los casos de una función.
- Empezar con el "happy path" (caso normal) y después agregar tests de error y edge cases.
- Saltarse TDD para código que no tiene lógica testeable (HTML estático, CSS, archivos de config).

## Cuándo es obligatorio y cuándo no

| Tipo de código | TDD obligatorio | Por qué |
|---|---|---|
| Funciones de negocio (cálculos, validaciones, transformaciones) | Sí | Es la lógica más importante y más frágil |
| Servicios (CRUD, integraciones) | Sí | Los bugs acá corrompen datos |
| Endpoints de API | Sí (al menos happy path + error) | Son la puerta de entrada al sistema |
| Componentes de UI con lógica | Sí para la lógica, no para el render | Testear la lógica, no los píxeles |
| Componentes de UI sin lógica | No | No hay qué testear |
| Archivos de configuración | No | No hay lógica |
| Migraciones de DB | No (pero sí verificar que corren) | Se verifican ejecutándolas |
| Scripts de utilidad | Depende de la complejidad | Si tiene lógica condicional, sí |

## Ejemplo concreto del ciclo

**Tarea: Crear función `calcularAjusteAlquiler(montoBase, indiceIPC)`**

### Paso 1 — RED: Escribir el test

```typescript
// tests/calcular-ajuste.test.ts
describe("calcularAjusteAlquiler", () => {
  it("aplica el índice IPC al monto base", () => {
    expect(calcularAjusteAlquiler(100000, 1.05)).toBe(105000);
  });

  it("rechaza monto negativo", () => {
    expect(() => calcularAjusteAlquiler(-1, 1.05)).toThrow("Monto inválido");
  });

  it("rechaza índice menor a 1", () => {
    expect(() => calcularAjusteAlquiler(100000, 0.5)).toThrow("Índice inválido");
  });
});
```

Correr: `npm test` → 3 tests fallan ✅ (es lo esperado)

### Paso 2 — GREEN: Escribir el código mínimo

```typescript
// src/utils/calcular-ajuste.ts
export function calcularAjusteAlquiler(montoBase: number, indiceIPC: number): number {
  if (montoBase < 0) throw new Error("Monto inválido");
  if (indiceIPC < 1) throw new Error("Índice inválido");
  return Math.round(montoBase * indiceIPC);
}
```

Correr: `npm test` → 3 tests pasan ✅

### Paso 3 — REFACTOR: ¿Hay algo que limpiar?

En este caso no, el código es simple. Si lo hubiera, refactorear y verificar que siguen pasando.

### Paso 4 — COMMIT

```bash
git add src/utils/calcular-ajuste.ts tests/calcular-ajuste.test.ts
git commit -m "feat: calcularAjusteAlquiler con validación de inputs"
```

## Qué pasa si el implementador escribe código antes del test

Si Claude Code o el sub-agente implementador escribe código de producción sin que haya un test fallando que lo requiera:

1. Borrar el código de producción.
2. Escribir el test primero.
3. Ver que falle.
4. Reescribir el código.

Esto suena extremo pero es la única forma de garantizar que los tests realmente cubren el código. Si se escribe el test después, hay una tendencia natural a escribir el test para que pase con el código que ya existe, en vez de testear lo que debería hacer.

## Relación con el flujo de sub-agentes

```text
Agente principal asigna tarea al IMPLEMENTADOR:
  "Implementá la tarea 2.3: función markAsRead con verificación de ownership"

IMPLEMENTADOR:
  1. Lee la tarea
  2. Escribe el test (RED)
  3. Corre el test → falla ✅
  4. Escribe el código mínimo (GREEN)
  5. Corre el test → pasa ✅
  6. Corre TODOS los tests → pasan ✅
  7. Refactor si hace falta
  8. Reporta como completado

MICRO-REVISOR verifica:
  - ¿Hay test para la funcionalidad nueva? (si no, CORREGIR)
  - ¿El test cubre el caso normal y al menos un caso de error?
  - ¿El código hace solo lo que la tarea pide?
```
