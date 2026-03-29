# Plan de Estandarización Tecnológica — q-saas-template

**Dificultad:** BAJA | **Riesgo:** BAJO | **Sesiones estimadas:** 1

Este es el template base. Todo lo que mejoremos acá se propaga a futuras BUs.

---

## Tareas Ordenadas

### 1.1 — `next.config.ts`: Quitar `output: "standalone"`

qontrata2 descubrió que `standalone` causa problemas con Prisma engine binary en Vercel serverless.

**Archivo:** `next.config.ts`
**Acción:** Cambiar a config sin standalone:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
```

**Razón:** Vercel no necesita standalone mode. Además se agrega `images.remotePatterns` para Google OAuth avatares que todas las BUs necesitan.

---

### 1.2 — `vercel.json`: Agregar Content-Security-Policy

El template NO tiene CSP. qontrata2 y qontacta ya lo tienen.

**Archivo:** `vercel.json`
**Acción:** Agregar dentro del array `headers[0].headers`:

```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'"
}
```

---

### 1.3 — `package.json`: Agregar `postinstall` script

qontabiliza y qontrata2 ya lo tienen, el template no.

**Archivo:** `package.json`
**Acción:** Agregar al objeto `scripts`:

```json
"postinstall": "prisma generate"
```

---

### 1.4 — `eslint.config.mjs`: Agregar `varsIgnorePattern`

qontrata2 tiene la versión más permisiva y práctica.

**Archivo:** `eslint.config.mjs`
**Acción:** Cambiar la regla `no-unused-vars`:

```js
"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]
```

---

### 1.5 — `tsconfig.json`: Agregar exclusión de archivos test

qontrata2 excluye test files de la compilación TS.

**Archivo:** `tsconfig.json`
**Acción:** Actualizar `exclude`:

```json
"exclude": [
  "node_modules",
  "prisma/seed.ts",
  "playwright.config.ts",
  "tests/e2e/**",
  "**/*.test.ts",
  "**/*.test.tsx"
]
```

---

### 1.6 — `playwright.config.ts`: Aumentar timeout

30s es poco para CI con DB. Alinear con qontrata2.

**Archivo:** `playwright.config.ts`
**Acción:**
- Cambiar `timeout: 30_000` → `timeout: 60_000` en webServer
- Agregar soporte para `globalTeardown` (comentado como referencia)

---

### 1.7 — Verificar CLAUDE.md sección Board

Ya está bien en el template. Solo confirmar que está completa con:
- Referencias a `src/lib/board-client.ts`
- Cron jobs documentados
- Variables de entorno Board listadas

---

## Criterio de Éxito

- [ ] `npm run build` pasa sin errores
- [ ] `npm run lint` pasa sin errores
- [ ] `npm run test` pasa sin errores
- [ ] `vercel.json` incluye CSP header
- [ ] `next.config.ts` no tiene `output: "standalone"`
- [ ] `package.json` tiene script `postinstall`
