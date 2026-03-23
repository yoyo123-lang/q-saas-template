# Implementación de reCAPTCHA v3 — Documentación técnica

> **Propósito:** Referencia para replicar esta implementación en un proyecto Next.js en blanco, evitando errores conocidos.
> **Versión:** reCAPTCHA v3 (invisible, basada en score)
> **Scope:** Solo el flujo de login

---

## Índice

1. [Visión general](#1-visión-general)
2. [Archivos involucrados](#2-archivos-involucrados)
3. [Frontend — componente de login](#3-frontend--componente-de-login)
4. [Backend — endpoint de login](#4-backend--endpoint-de-login)
5. [Variables de entorno](#5-variables-de-entorno)
6. [Comportamiento por ambiente](#6-comportamiento-por-ambiente)
7. [Errores conocidos y sus fixes](#7-errores-conocidos-y-sus-fixes)
8. [Decisiones de diseño](#8-decisiones-de-diseño)

---

## 1. Visión general

reCAPTCHA v3 es **invisible para el usuario**: no muestra checkbox ni desafíos visuales. Google analiza el comportamiento del usuario y devuelve un **score de 0.0 a 1.0** (1.0 = humano, 0.0 = bot).

**Flujo completo:**

```
Usuario llena el form
        ↓
Frontend pide token a Google (grecaptcha.execute)
        ↓
Google devuelve token JWT firmado
        ↓
Frontend envía token junto con usuario/contraseña al backend
        ↓
Backend verifica token con Google (siteverify API)
        ↓
Google responde: { success, score, action, ... }
        ↓
Si score >= 0.5 → continúa con autenticación
Si score < 0.5 o error → 403 Forbidden
```

**Componentes necesarios:**
- **Site key** (pública): se usa en el frontend para inicializar el widget y pedir tokens
- **Secret key** (privada): se usa en el servidor para verificar tokens con Google

---

## 2. Archivos involucrados

| Archivo | Rol |
|---|---|
| `src/app/login/page.tsx` | Carga el script de reCAPTCHA, ejecuta el captcha antes de hacer POST |
| `src/app/api/auth/login/route.ts` | Verifica el token con Google antes de validar credenciales |
| `.env.example` | Documenta la variable `RECAPTCHA_SECRET_KEY` |
| `.env.local` / variables de producción | Contiene el valor real de `RECAPTCHA_SECRET_KEY` |

---

## 3. Frontend — componente de login

**Archivo:** `src/app/login/page.tsx`

### 3.1 Site key

```typescript
// Hardcodeada como constante — no requiere NEXT_PUBLIC_ prefix
// porque no va a cambiar entre ambientes del mismo proyecto
const RECAPTCHA_SITE_KEY = "6Le593ks...";  // tu site key de Google
```

> **Por qué hardcodeada y no en env var:** La site key es pública (puede verse en el HTML del browser de todas formas). No tiene riesgo de seguridad. Evita la complejidad de agregar una variable de entorno para algo que no varía.

### 3.2 Declaración de tipos TypeScript

Necesaria porque `window.grecaptcha` no tiene tipos en TypeScript por defecto:

```typescript
declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}
```

### 3.3 Estado para saber si el script cargó

```typescript
const [recaptchaListo, setRecaptchaListo] = useState(false);
```

Crítico: no se puede llamar a `grecaptcha.execute()` antes de que el script de Google cargue. Si se intenta, rompe con error de runtime.

### 3.4 Carga del script de Google

```tsx
<Script
  src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
  onLoad={() => {
    window.grecaptcha.ready(() => setRecaptchaListo(true));
  }}
/>
```

**Puntos importantes:**
- Se usa `next/script` (no `<script>` HTML puro) para que Next.js gestione la carga
- `?render=SITE_KEY` en la URL activa el modo v3 (sin este parámetro carga v2)
- `grecaptcha.ready()` es el callback que se ejecuta cuando la librería está lista para usar
- Solo cuando se llama ese callback se setea `recaptchaListo = true`

### 3.5 Ejecución del captcha al hacer submit

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  let recaptchaToken = "";

  if (recaptchaListo) {
    recaptchaToken = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, {
      action: "login",  // etiqueta para analytics en Google console
    });
  }

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, password, recaptchaToken }),
  });
  // ...
};
```

**Puntos importantes:**
- Si `recaptchaListo === false` (script no cargó), `recaptchaToken` queda `""` y el backend rechazará con 403
- `action` es solo una etiqueta; afecta los reportes en la consola de Google, no la validación
- `grecaptcha.execute()` es asíncrono, necesita `await`

---

## 4. Backend — endpoint de login

**Archivo:** `src/app/api/auth/login/route.ts`

### 4.1 Constantes

```typescript
const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const RECAPTCHA_MIN_SCORE = 0.5;  // umbral mínimo aceptado (0.0–1.0)
```

### 4.2 Función de verificación

```typescript
async function verificarRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  // Comportamiento por ambiente:
  if (!secret) {
    if (process.env.NODE_ENV === "production") return false;  // fail-closed
    return true;  // solo en dev se salta la verificación
  }

  if (!token) return false;

  try {
    const res = await fetch(RECAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });

    const data = (await res.json()) as { success: boolean; score?: number };
    return data.success && (data.score ?? 0) >= RECAPTCHA_MIN_SCORE;
  } catch {
    return false;  // si Google no responde, rechazar
  }
}
```

### 4.3 Uso en el handler POST

```typescript
export async function POST(request: Request) {
  const body = await request.json();
  const { usuario, password, recaptchaToken } = body;

  // 1. Verificar captcha ANTES que las credenciales
  const captchaOk = await verificarRecaptcha(recaptchaToken ?? "");
  if (!captchaOk) {
    return NextResponse.json(
      { error: "Verificación de seguridad fallida" },
      { status: 403 }
    );
  }

  // 2. Recién acá se validan las credenciales
  // ...
}
```

**Por qué verificar el captcha primero:** Si se verifican credenciales antes del captcha, un atacante puede hacer fuerza bruta aprovechando que Google falla temporalmente (race condition). Captcha siempre primero.

### 4.4 Request a Google — formato exacto

La API de Google solo acepta `application/x-www-form-urlencoded`, **no JSON**:

```
POST https://www.google.com/recaptcha/api/siteverify
Content-Type: application/x-www-form-urlencoded

secret=TU_SECRET_KEY&response=TOKEN_DEL_FRONTEND
```

Respuesta de Google:
```json
{
  "success": true,
  "score": 0.9,
  "action": "login",
  "challenge_ts": "2026-03-10T12:00:00Z",
  "hostname": "tudominio.com"
}
```

---

## 5. Variables de entorno

```bash
# .env.local (desarrollo) o variables de producción en Vercel/Railway/etc.
RECAPTCHA_SECRET_KEY=6Le593ks...XXXXXXX  # clave SECRETA (nunca al frontend)
```

**La site key NO va en variables de entorno** — está hardcodeada en `login/page.tsx`.

---

## 6. Comportamiento por ambiente

| Situación | Resultado |
|---|---|
| `NODE_ENV=development`, sin `RECAPTCHA_SECRET_KEY` | Verifica siempre como válido (salta captcha) |
| `NODE_ENV=production`, sin `RECAPTCHA_SECRET_KEY` | Bloquea todo login (fail-closed) |
| `NODE_ENV=production`, con `RECAPTCHA_SECRET_KEY` | Verifica con Google, requiere score >= 0.5 |
| Token vacío `""` | Rechaza (403) |
| Google no responde (timeout/error) | Rechaza (403) |
| Score < 0.5 | Rechaza (403) |

---

## 7. Errores conocidos y sus fixes

### Error 1: Fail-open (bug crítico ya resuelto)

**Síntoma:** El login funcionaba incluso en producción sin `RECAPTCHA_SECRET_KEY` configurada.

**Causa:** La versión original de `verificarRecaptcha` retornaba `true` cuando no había secret, sin distinguir entre dev y prod.

**Fix aplicado:**
```typescript
// ANTES (incorrecto — fail-open):
if (!secret) return true;

// DESPUÉS (correcto — fail-closed en prod):
if (!secret) {
  if (process.env.NODE_ENV === "production") return false;
  return true;
}
```

### Error 2: Llamar a grecaptcha antes de que cargue el script

**Síntoma:** `TypeError: window.grecaptcha is undefined` o `grecaptcha.execute is not a function`

**Fix:** Usar el flag `recaptchaListo` y solo llamar `execute()` cuando está en `true`:
```typescript
if (recaptchaListo) {
  recaptchaToken = await window.grecaptcha.execute(...)
}
```

### Error 3: Usar `<script>` HTML en vez de `next/script`

**Síntoma:** El script carga pero el evento `onLoad` no se ejecuta, o hay warnings de Next.js en consola.

**Fix:** Siempre usar `import Script from "next/script"` en proyectos Next.js.

### Error 4: Content-Type incorrecto al llamar a Google

**Síntoma:** Google responde `{ success: false, "error-codes": ["invalid-input-secret"] }` aunque el secret sea correcto.

**Fix:** La API de siteverify requiere `application/x-www-form-urlencoded`, no `application/json`. Usar `new URLSearchParams(...)` como body.

---

## 8. Decisiones de diseño

| Decisión | Razón |
|---|---|
| reCAPTCHA v3 (no v2) | Sin fricciones para el usuario — no muestra desafíos visuales |
| Solo en login | Es el único endpoint de acceso humano. Los workers usan `ADMIN_SECRET` via header |
| Score mínimo 0.5 | Punto medio equilibrado. Valores más altos dan falsos positivos; más bajos dan poca protección |
| Captcha verificado antes que credenciales | Evita que bots agoten intentos de fuerza bruta aunque Google falle temporalmente |
| Site key hardcodeada (no en env) | Es pública de todas formas; simplifica la configuración |
| Fail-closed en producción | La seguridad debe degradar de forma segura. Mejor bloquear que dejar pasar |

---

*Ver también: `RECAPTCHA_ALTA_MANUAL.md` — pasos que debe realizar el desarrollador en Google Console y en la plataforma de deploy.*
