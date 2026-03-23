# Playbook: reCAPTCHA v3

> Guía agnóstica para integrar Google reCAPTCHA v3 (invisible) en un proyecto nuevo.
> Stack probado: Next.js + API routes.
> Referencia detallada: `docs/recaptcha/RECAPTCHA_IMPLEMENTACION.md` y `docs/recaptcha/RECAPTCHA_ALTA_MANUAL.md`

---

## Cuándo usar esto

- Tenés un formulario público (login, registro, contacto) que querés proteger contra bots.
- Querés protección invisible (sin checkbox "No soy un robot").
- Querés verificación server-side con score (0.0 = bot, 1.0 = humano).

## Cómo funciona

```
Usuario completa formulario
        ↓
Frontend pide token a Google (grecaptcha.execute) — invisible
        ↓
Google devuelve token JWT firmado
        ↓
Frontend envía token junto con los datos del form al backend
        ↓
Backend verifica token con Google (siteverify API)
        ↓
Si score >= 0.5 → procesar formulario
Si score < 0.5 → 403 Forbidden
```

## Componentes necesarios

| Componente | Qué es | Dónde va |
|---|---|---|
| **Site Key** (pública) | Inicializa el widget en el browser | Frontend (hardcodeada en el código) |
| **Secret Key** (privada) | Verifica tokens con Google | Variable de entorno en el servidor |

## Variables de entorno

```bash
# Solo la secret key va como variable de entorno (es privada)
RECAPTCHA_SECRET_KEY=6Le593ks...XXXXXXX

# La site key es pública — va hardcodeada en el componente frontend
# No necesita NEXT_PUBLIC_ porque se pone directamente en el código
```

## Frontend — Cargar script y ejecutar captcha

**Ejemplo para Next.js (adaptar al framework del proyecto):**

```typescript
"use client";
import Script from "next/script";
import { useState } from "react";

// Site key pública — reemplazar con la del proyecto
const RECAPTCHA_SITE_KEY = "TU_SITE_KEY_AQUI";

// Declaración de tipos para window.grecaptcha
declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export default function FormularioProtegido() {
  const [recaptchaListo, setRecaptchaListo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let recaptchaToken = "";

    if (recaptchaListo) {
      recaptchaToken = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, {
        action: "login",  // etiqueta para analytics de Google — adaptar según el form
      });
    }

    const res = await fetch("/api/tu-endpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ /* datos del form */, recaptchaToken }),
    });
    // manejar respuesta...
  };

  return (
    <>
      <Script
        src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
        onLoad={() => {
          window.grecaptcha.ready(() => setRecaptchaListo(true));
        }}
      />
      <form onSubmit={handleSubmit}>
        {/* campos del form */}
        <button type="submit">Enviar</button>
      </form>
    </>
  );
}
```

**Puntos clave:**
- Usar `next/script` (no `<script>` HTML) en Next.js.
- `?render=SITE_KEY` en la URL activa el modo v3.
- No llamar a `grecaptcha.execute()` antes de que `recaptchaListo` sea `true`.
- Si el script no cargó, `recaptchaToken` queda `""` y el backend rechaza.

## Backend — Verificar token con Google

```typescript
const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const RECAPTCHA_MIN_SCORE = 0.5;

async function verificarRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  // Comportamiento por ambiente
  if (!secret) {
    if (process.env.NODE_ENV === "production") return false;  // fail-closed en prod
    return true;  // en dev se salta la verificación
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

**Uso en el handler:**

```typescript
export async function POST(request: Request) {
  const body = await request.json();
  const { recaptchaToken, ...datos } = body;

  // 1. Verificar captcha ANTES de procesar
  const captchaOk = await verificarRecaptcha(recaptchaToken ?? "");
  if (!captchaOk) {
    return NextResponse.json({ error: "Verificación de seguridad fallida" }, { status: 403 });
  }

  // 2. Recién acá procesar los datos del formulario
  // ...
}
```

## Comportamiento por ambiente

| Situación | Resultado |
|---|---|
| Dev sin `RECAPTCHA_SECRET_KEY` | Captcha se salta (para no bloquear desarrollo) |
| Prod sin `RECAPTCHA_SECRET_KEY` | **Bloquea todo** (fail-closed) |
| Prod con secret key configurada | Verifica con Google, requiere score >= 0.5 |
| Token vacío `""` | Rechaza (403) |
| Google no responde | Rechaza (403) |

## Alta en Google reCAPTCHA Console

1. Ir a: `https://www.google.com/recaptcha/admin/create`
2. Completar:
   - **Label:** nombre descriptivo del proyecto
   - **reCAPTCHA type:** seleccionar **v3**
   - **Domains:** agregar todos los dominios (sin `https://`). Incluir `localhost` para dev.
3. Submit → Google muestra **Site Key** y **Secret Key**
4. Guardar ambas claves

## Checklist de integración

- [ ] Crear registro en Google reCAPTCHA Console (seleccionar **v3**)
- [ ] Agregar dominios (producción + `localhost`)
- [ ] Poner la **Site Key** en el componente frontend
- [ ] Configurar `RECAPTCHA_SECRET_KEY` como variable de entorno en el servidor
- [ ] Agregar script de Google al componente del formulario
- [ ] Implementar `verificarRecaptcha()` en el backend
- [ ] Verificar captcha ANTES de procesar credenciales/datos
- [ ] Probar en dev: el login funciona sin secret key
- [ ] Probar en prod: el login funciona con secret key correcta
- [ ] Verificar en Google Console que aparecen requests en Analytics

## Decisiones de diseño

| Decisión | Razón |
|---|---|
| reCAPTCHA v3 (no v2) | Invisible — sin fricción para el usuario |
| Score mínimo 0.5 | Equilibrio entre seguridad y falsos positivos |
| Captcha antes de credenciales | Evita fuerza bruta aunque Google falle temporalmente |
| Site key hardcodeada | Es pública — simplifica config sin riesgo |
| Fail-closed en producción | Mejor bloquear que dejar pasar bots |
| `application/x-www-form-urlencoded` | Es lo único que acepta la API de siteverify de Google |

## Errores comunes

| Error | Causa | Fix |
|---|---|---|
| `grecaptcha is undefined` | Se llama a `execute()` antes de que cargue el script | Usar flag `recaptchaListo` |
| Google responde `invalid-input-secret` | Content-Type incorrecto al llamar a siteverify | Usar `URLSearchParams`, no JSON |
| Google responde `invalid-keys` | Dominio no registrado en la consola | Agregar dominio exacto |
| Login bloqueado en prod sin error claro | Falta `RECAPTCHA_SECRET_KEY` en las variables | Agregar la variable y redeploy |
| Token expirado (score 0) | Usuario tardó >2 minutos en completar el form | Caso borde poco frecuente — considerar regenerar token |

---

*Referencia detallada: `docs/recaptcha/RECAPTCHA_IMPLEMENTACION.md` y `docs/recaptcha/RECAPTCHA_ALTA_MANUAL.md`*
