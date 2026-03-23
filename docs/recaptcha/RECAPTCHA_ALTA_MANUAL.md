# reCAPTCHA v3 — Pasos manuales de alta

> **Para quién es esto:** El desarrollador/admin que da de alta el proyecto en Google y configura las variables de entorno en la plataforma de deploy.
> **Tiempo estimado:** 10–15 minutos.
> **Prerrequisito:** Tener una cuenta Google y acceso al panel de deploy (Vercel, Railway, etc.)

---

## Índice

1. [Alta en Google reCAPTCHA Console](#1-alta-en-google-recaptcha-console)
2. [Configurar la Secret Key en el deploy](#2-configurar-la-secret-key-en-el-deploy)
3. [Actualizar la Site Key en el código](#3-actualizar-la-site-key-en-el-código)
4. [Verificar que todo funciona](#4-verificar-que-todo-funciona)
5. [Checklist final](#5-checklist-final)

---

## 1. Alta en Google reCAPTCHA Console

### Paso 1.1 — Ir a la consola de reCAPTCHA

Abrí: **https://www.google.com/recaptcha/admin/create**

Iniciá sesión con tu cuenta Google si no lo hiciste.

---

### Paso 1.2 — Completar el formulario de registro

Vas a ver un formulario con estos campos:

**Label (Etiqueta):**
```
cazadominios-produccion
```
Podés poner cualquier nombre descriptivo. Es solo para identificarlo en tu panel.

---

**reCAPTCHA type:**
Seleccioná → **reCAPTCHA v3**

> ⚠️ No elegir v2 ("I'm not a robot"). El código está escrito para v3.

---

**Domains (Dominios):**

Agregá **todos** los dominios donde va a correr la app. Sin `https://`, sin paths.

Ejemplos:
```
tudominio.com
www.tudominio.com
```

Si estás en desarrollo local también podés agregar:
```
localhost
```

> **Importante:** Si el dominio no está en esta lista, Google rechazará los tokens con error `invalid-keys`. Agregá el dominio exacto que aparece en la barra de tu browser.

---

**Owners:**
Tu email ya aparece por defecto. Podés agregar más si necesitás.

---

**Accept the reCAPTCHA Terms of Service:**
Tildá el checkbox.

---

### Paso 1.3 — Hacer click en "Submit"

Google te va a mostrar **dos claves**:

```
Site key:    6Le593ks...AAAAAAA   ← Esta va en el código (pública)
Secret key:  6Le593ks...BBBBBBB   ← Esta va en las variables de entorno (privada)
```

**Guardá las dos en un lugar seguro ahora** — después podés verlas en el panel pero es más cómodo tenerlas a mano.

---

## 2. Configurar la Secret Key en el deploy

La Secret Key **nunca va al código fuente**. Va como variable de entorno en tu plataforma.

### Si usás Vercel

1. Ir a tu proyecto en **vercel.com**
2. Ir a **Settings → Environment Variables**
3. Agregar:
   - **Name:** `RECAPTCHA_SECRET_KEY`
   - **Value:** tu secret key de Google
   - **Environment:** marcar `Production` (y `Preview` si querés que también funcione en previews)
4. Hacer click en **Save**
5. **Redeploy el proyecto** (los cambios de env vars requieren un nuevo deploy para tomar efecto)

> Para redeploy: ir a la tab **Deployments**, hacer click en los tres puntos del último deploy y seleccionar **Redeploy**.

---

### Si usás Railway

1. Ir a tu proyecto en **railway.app**
2. Seleccionar el servicio de tu app
3. Ir a la tab **Variables**
4. Agregar:
   - **Key:** `RECAPTCHA_SECRET_KEY`
   - **Value:** tu secret key de Google
5. Railway redeploya automáticamente al guardar variables.

---

### Si usás otro proveedor

El nombre de la variable debe ser exactamente:
```
RECAPTCHA_SECRET_KEY
```

El valor es la Secret Key de Google (empieza con `6L...`).

---

### Para desarrollo local

En la raíz del proyecto, en el archivo `.env.local` (crealo si no existe, **nunca lo commiteés**):

```bash
RECAPTCHA_SECRET_KEY=tu-secret-key-de-google
```

> Si no ponés esta variable en dev, el login funciona igual (el captcha se saltea automáticamente en `NODE_ENV=development`). Solo la necesitás si querés probar el captcha real en local.

---

## 3. Actualizar la Site Key en el código

La Site Key está hardcodeada en el componente de login. **Necesitás cambiarla** si creaste un nuevo registro en Google.

**Archivo a editar:** `src/app/login/page.tsx`

**Línea a modificar (línea 6):**
```typescript
// ANTES (site key del proyecto original):
const RECAPTCHA_SITE_KEY = "6Le593ksAAAAABYeTNmwkhs4r1Do_68QJRvu_E1j";

// DESPUÉS (tu nueva site key):
const RECAPTCHA_SITE_KEY = "TU_NUEVA_SITE_KEY_AQUÍ";
```

**También actualizar la URL de carga del script** — está en la misma línea de JSX pero se arma dinámicamente con la constante, así que si cambiás la constante arriba alcanza.

---

## 4. Verificar que todo funciona

### 4.1 Verificación en development

1. Corré `npm run dev`
2. Abrí `http://localhost:3000/login`
3. Abrí DevTools → Network
4. Completá el form y hacé Submit
5. Verificá en Network que el request a `/api/auth/login` sale con un body como:
   ```json
   {
     "usuario": "...",
     "password": "...",
     "recaptchaToken": "03AGdBq25..."
   }
   ```
   El `recaptchaToken` debe ser un string largo (token JWT de Google). Si es `""` (vacío), el script de Google no cargó.

6. Verificá que el login funciona.

---

### 4.2 Verificación en producción

1. Abrí la URL de producción
2. Abrí DevTools → Network
3. Intentá hacer login con credenciales correctas → debe funcionar
4. Intentá hacer login con credenciales incorrectas → debe dar error de credenciales (no de captcha)

**Si el login da "Verificación de seguridad fallida":**
- La `RECAPTCHA_SECRET_KEY` no está configurada o está mal copiada
- El dominio no está registrado en Google Console
- La Site Key y la Secret Key no corresponden al mismo registro en Google

---

### 4.3 Verificar en Google Console

1. Ir a **https://www.google.com/recaptcha/admin**
2. Seleccionar tu registro
3. Ir a **Statistics** / **Analytics**
4. Deberías ver requests apareciendo (puede tardar unos minutos en mostrarse)

---

## 5. Checklist final

Antes de dar por terminado el alta, confirmá que:

- [ ] Creé el registro en Google reCAPTCHA Console seleccionando **v3**
- [ ] Agregué el dominio de producción exacto (sin `https://`, sin path)
- [ ] Guardé la **Site Key** y la **Secret Key**
- [ ] Actualicé `RECAPTCHA_SITE_KEY` en `src/app/login/page.tsx` con mi Site Key
- [ ] Agregué `RECAPTCHA_SECRET_KEY` como variable de entorno en el servidor de producción
- [ ] Redepoyé la app (si el proveedor lo requiere)
- [ ] Verifiqué que el login funciona en producción con credenciales correctas
- [ ] Verifiqué que el login rechaza con credenciales incorrectas (y no con error de captcha)

---

## Preguntas frecuentes

**¿Puedo usar la misma Site/Secret Key para desarrollo y producción?**
Sí, siempre que agregues `localhost` a los dominios en Google Console. Sin embargo, es recomendable tener registros separados (uno para dev, uno para prod) para que las estadísticas sean limpias.

**¿Qué pasa si un usuario legítimo tiene score bajo?**
El umbral configurado es 0.5. Un usuario humano normal raramente baja de ese score. Si ves falsos positivos frecuentes, podés bajar el umbral a 0.3 en `src/app/api/auth/login/route.ts`, línea `RECAPTCHA_MIN_SCORE`.

**¿Los tokens de reCAPTCHA expiran?**
Sí, los tokens son válidos por 2 minutos desde que se generan. Si el usuario tarda mucho en hacer submit, el token expira y Google lo rechaza. En ese caso el usuario verá "Verificación de seguridad fallida". Es un caso borde muy poco frecuente.

**¿Cómo sé si es un problema de dominio o de secret key?**
Cuando el dominio no está registrado, Google devuelve `{ "error-codes": ["invalid-keys"] }` y `success: false`. Podés logear `data` en `verificarRecaptcha()` temporalmente para ver el detalle.

**¿Puedo ver qué score está obteniendo cada request?**
En producción, el score aparece en Google Analytics de reCAPTCHA. Para debugging puntual, podés logear `data.score` en el servidor (solo en dev, nunca en prod).

---

*Ver también: `RECAPTCHA_IMPLEMENTACION.md` — documentación técnica del código.*
