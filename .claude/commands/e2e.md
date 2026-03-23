# Tests E2E con Playwright

> Skill para generar tests end-to-end automáticamente.
> Invocar con: `/project:e2e`
> Playbook técnico: `docs/playbooks/e2e.md`

## Paso 1: Detectar estado del proyecto

Leé estos archivos (en silencio):
- `playwright.config.ts` — ¿existe?
- `tests/e2e/` — ¿hay tests?
- `package.json` — ¿está `@playwright/test` en devDependencies?
- `docs/playbooks/e2e.md` — referencia técnica

Clasificá el estado:

| Si... | Estado | Ir a... |
|---|---|---|
| No existe `playwright.config.ts` ni `@playwright/test` en package.json | Sin setup | Paso 2A |
| Existe config pero no hay tests (o solo smoke) | Setup parcial | Paso 2B |
| Existe config y hay tests | Setup completo | Paso 2B |

## Paso 2A: Setup inicial (proyecto sin Playwright)

Preguntale al usuario:

> **¿Es un proyecto nuevo o uno existente que ya tiene features?**
> - **Nuevo**: Instalo infraestructura base + smoke tests (nivel 0 + 1)
> - **Existente**: Instalo infraestructura base + genero tests para entidades que ya existen

Esperá respuesta. Después:

1. Instalar dependencia:
```bash
npm install -D @playwright/test
npx playwright install chromium
```

2. Crear archivos base siguiendo `docs/playbooks/e2e.md`:
   - `playwright.config.ts`
   - `tests/e2e/fixtures/auth.ts`
   - `tests/e2e/smoke.spec.ts`
   - `tests/e2e/auth.spec.ts`

3. Agregar scripts a `package.json`:
```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:headed": "playwright test --headed"
}
```

4. Crear `.github/workflows/e2e.yml` si no existe.

5. Correr `npx playwright test` para verificar que funciona.

Reportar:

```
✅ SETUP E2E COMPLETO

Instalado: @playwright/test + chromium
Archivos creados:
- playwright.config.ts
- tests/e2e/fixtures/auth.ts
- tests/e2e/smoke.spec.ts
- tests/e2e/auth.spec.ts
- .github/workflows/e2e.yml

Tests: [N] pasando / [N] fallando

¿Querés generar tests para alguna entidad? (ej: "proyectos", "clientes")
```

Si el usuario dijo "existente", continuar al Paso 2B automáticamente.

## Paso 2B: Generar tests para entidad o flujo

Preguntale al usuario:

> **¿Qué querés cubrir con tests e2e?**
> 1. **Entidad CRUD** — crear/editar/eliminar (ej: proyectos, clientes, facturas)
> 2. **Flujo específico** — un flujo de usuario multi-paso (ej: checkout, onboarding)
> 3. **Ruta protegida** — verificar que una ruta requiere auth/rol

Esperá respuesta.

### Si eligió "Entidad CRUD"

1. Preguntá: **¿Qué entidad?** (nombre)

2. Investigá el código del proyecto (en silencio):
   - Buscar el modelo en `prisma/schema.prisma`
   - Buscar las API routes en `src/app/api/`
   - Buscar las páginas en `src/app/dashboard/` o equivalente
   - Buscar componentes de formulario

3. Identificar:
   - URL base de la entidad en el frontend
   - Campos del formulario de creación (ids, tipos, si son requeridos)
   - Campos visibles en la lista
   - Si tiene soft delete (`deletedAt`)
   - Selectores específicos del UI (botones, modales, etc.)

4. Mostrar al usuario lo que detectaste:

```
ENTIDAD DETECTADA: [Nombre]

Modelo Prisma: [campos relevantes]
URL frontend: [URL]
Formulario: [campos con tipos]
Lista muestra: [campos]
Soft delete: [sí/no]

¿Genero tests CRUD con estos datos?
```

5. Esperá aprobación. Después generar el test siguiendo el **Patrón CRUD** de `docs/playbooks/e2e.md`, adaptando:
   - Selectores reales del proyecto (inspeccionar componentes)
   - Valores de test que tengan sentido para la entidad
   - Nombres de botones y labels reales del UI

6. Correr `npx playwright test tests/e2e/[entidad].spec.ts` para verificar.

7. Si falla, iterar: leer el error, ajustar selectores, re-correr. Máximo 3 iteraciones.

### Si eligió "Flujo específico"

1. Preguntá: **Describí el flujo paso a paso** (o decime dónde está implementado para que lo lea)

2. Investigá el código del flujo.

3. Generar test siguiendo el **Patrón Flujo multi-paso** de `docs/playbooks/e2e.md`.

4. Correr y verificar.

### Si eligió "Ruta protegida"

1. Preguntá: **¿Qué ruta?** y **¿qué rol necesita?**

2. Generar test siguiendo el **Patrón Ruta protegida** de `docs/playbooks/e2e.md`.

3. Correr y verificar.

## Paso 3: Reportar resultado

```
✅ TESTS E2E GENERADOS

Entidad/Flujo: [nombre]
Archivo: tests/e2e/[nombre].spec.ts
Tests: [N] pasando / [N] fallando

Cobertura e2e actual:
- Smoke (nivel 0): ✅
- Auth (nivel 1): ✅
- [Entidad 1] CRUD (nivel 2): ✅
- [Entidad 2] CRUD (nivel 2): ⬜ pendiente
```

## Paso 4: Ofrecer siguiente paso

> **¿Querés cubrir algo más?**
> - Otra entidad o flujo → volver al Paso 2B
> - Nada más por ahora → hacer commit

Si el usuario quiere commitear, hacer commit atómico con mensaje descriptivo.

---

## Reglas de ejecución

1. **Siempre leer el código antes de generar tests.** No asumir la UI — inspeccionar componentes reales.
2. **Usar selectores resilientes**: `getByRole` > `getByText` > `getByTestId` > CSS selectors.
3. **No inventar datos**: usar valores que tengan sentido para el dominio del proyecto.
4. **Si un test falla, investigar y corregir** — no saltear. Máximo 3 iteraciones por test.
5. **Seguir las convenciones del proyecto** para nombres de archivo, idioma de comentarios, etc.
6. **Los tests generados NO requieren credenciales reales** — la fixture de auth crea sesiones en DB.
7. **No modificar código de producción** para que un test pase — adaptar el test al código existente.

---

*Los tests e2e no reemplazan los tests unitarios ni de integración. Son una capa adicional que valida flujos de usuario completos.*
