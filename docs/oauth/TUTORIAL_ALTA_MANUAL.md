# Tutorial: Alta manual de OAuth Google

> Lo que tenés que hacer VOS (no el código) para que la autenticación funcione.
> Tiempo estimado: 15-20 minutos.
> Requisito previo: tener una cuenta Google con acceso a Google Cloud Console.

---

## Resumen de pasos

1. [Crear proyecto en Google Cloud Console](#1-crear-proyecto-en-google-cloud-console)
2. [Habilitar Google+ API / People API](#2-habilitar-la-api)
3. [Configurar la pantalla de consentimiento OAuth](#3-pantalla-de-consentimiento-oauth)
4. [Crear credenciales OAuth 2.0](#4-crear-credenciales-oauth-20)
5. [Agregar URIs de redirección](#5-agregar-uris-de-redirección)
6. [Cargar las variables de entorno](#6-cargar-las-variables-de-entorno)
7. [Configurar variables en Railway](#7-configurar-variables-en-railway)
8. [Agregar el email admin a la allowlist](#8-agregar-el-email-admin-a-la-allowlist)
9. [Verificar que todo funciona](#9-verificar-que-todo-funciona)

---

## 1. Crear proyecto en Google Cloud Console

1. Ir a [https://console.cloud.google.com](https://console.cloud.google.com)
2. En la barra superior, hacer click en el selector de proyectos (dice "My Project" o similar)
3. Click en **"Proyecto nuevo"** (arriba a la derecha del modal)
4. Nombre: algo descriptivo como `pendientes-iea-prod` o el nombre de tu app
5. Click en **"Crear"**
6. Esperar unos segundos y seleccionar el proyecto recién creado en el selector

---

## 2. Habilitar la API

NextAuth necesita acceder al perfil del usuario de Google.

1. En el menú lateral: **"APIs y servicios"** → **"Biblioteca"**
2. Buscar **"Google People API"**
3. Click en el resultado → Click en **"Habilitar"**

> Si no encontrás "People API", buscá "Google+ API". En proyectos nuevos se usa People API.

---

## 3. Pantalla de consentimiento OAuth

Esta es la pantalla que ve el usuario cuando Google le pregunta si autoriza el acceso.

1. En el menú lateral: **"APIs y servicios"** → **"Pantalla de consentimiento de OAuth"**
2. Tipo de usuario: seleccioná **"Interno"** si todos los usuarios van a ser del mismo Google Workspace (ej: `@institutoiea.edu.ar`). Si no, elegí **"Externo"**.
   - **Interno**: no requiere verificación de Google, ideal para uso interno
   - **Externo**: puede requerir verificación si vas a tener más de 100 usuarios o pedís scopes sensibles
3. Click en **"Crear"**
4. Completar el formulario:
   - **Nombre de la aplicación**: nombre visible para el usuario (ej: "Panel IEA")
   - **Correo de asistencia al usuario**: tu email
   - **Dominio autorizado**: si tu app corre en un dominio propio, agregarlo (ej: `tuapp.up.railway.app`)
   - **Información de contacto del desarrollador**: tu email
5. Click en **"Guardar y continuar"**
6. En "Permisos" (Scopes): no hace falta agregar nada especial. NextAuth usa los scopes básicos por default (`email`, `profile`, `openid`). Click en **"Guardar y continuar"**
7. Revisar el resumen → Click en **"Volver al panel"**

---

## 4. Crear credenciales OAuth 2.0

1. En el menú lateral: **"APIs y servicios"** → **"Credenciales"**
2. Click en **"+ Crear credenciales"** → **"ID de cliente de OAuth"**
3. Tipo de aplicación: **"Aplicación web"**
4. Nombre: algo como `pendientes-prod-web`
5. Por ahora dejá los campos de URIs vacíos — los completamos en el siguiente paso
6. Click en **"Crear"**
7. Va a aparecer un modal con:
   - **ID de cliente** → esto es `GOOGLE_CLIENT_ID`
   - **Secreto de cliente** → esto es `GOOGLE_CLIENT_SECRET`
8. **Copiar ambos valores** y guardarlos en un lugar seguro (gestor de contraseñas, 1Password, etc.)

> Si cerrás el modal sin copiarlos, podés volver a verlos desde "Credenciales" → click en el lápiz de edición de tu cliente.

---

## 5. Agregar URIs de redirección

Esto le dice a Google adónde puede redirigir al usuario después del login. **Si el URI no está en esta lista, Google va a rechazar el login.**

1. En **"APIs y servicios"** → **"Credenciales"** → click en el lápiz de edición de tu cliente OAuth
2. En la sección **"URIs de redireccionamiento autorizados"**, agregar:

**Para desarrollo local:**
```
http://localhost:3000/api/auth/callback/google
```

**Para producción en Railway:**
```
https://TU-DOMINIO.up.railway.app/api/auth/callback/google
```

> Reemplazá `TU-DOMINIO` con el dominio real que te asigna Railway. Lo encontrás en Railway → tu servicio → pestaña "Settings" → "Domains".

3. Si tenés dominio propio configurado, agregar también:
```
https://tudominio.com/api/auth/callback/google
```

4. Click en **"Guardar"**

**Importante:** Cada vez que cambies el dominio (por ejemplo al mover de staging a producción), tenés que volver acá y agregar el nuevo URI.

---

## 6. Cargar las variables de entorno

### En desarrollo local

1. Copiar `.env.example` a `.env.local`:
```bash
cp .env.example .env.local
```

2. Editar `.env.local` y completar:
```bash
# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generado con: openssl rand -base64 32>"

# Google OAuth
GOOGLE_CLIENT_ID="<tu Client ID de Google>"
GOOGLE_CLIENT_SECRET="<tu Client Secret de Google>"
```

3. Generar el secret:
```bash
openssl rand -base64 32
```
Copiar el output y pegarlo como valor de `NEXTAUTH_SECRET`.

> `.env.local` está en `.gitignore`. Nunca commitear credenciales.

---

## 7. Configurar variables en Railway

1. Ir a [https://railway.app](https://railway.app) → tu proyecto → tu servicio
2. Click en la pestaña **"Variables"**
3. Agregar cada variable con **"New Variable"**:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | La connection string de tu DB en Railway (se genera automáticamente si usás el plugin PostgreSQL) |
| `NEXTAUTH_SECRET` | El valor generado con `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | El Client ID de Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | El Client Secret de Google Cloud Console |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram (si usás el bot) |
| `TELEGRAM_WEBHOOK_SECRET` | `openssl rand -hex 32` |
| `OPENAI_API_KEY` | Tu API key de OpenAI |

> **No agregar** `NEXTAUTH_URL` en Railway. Con `trustHost: true` en la configuración de NextAuth, Railway lo detecta automáticamente del dominio del servicio.

4. Después de agregar las variables, Railway va a hacer un redeploy automático.

### Cómo obtener DATABASE_URL en Railway

Si estás usando el plugin de PostgreSQL de Railway:
1. Click en el servicio de PostgreSQL
2. Pestaña **"Variables"**
3. Copiar el valor de `DATABASE_URL` (o `DATABASE_PUBLIC_URL` para acceso externo)

---

## 8. Agregar el email admin a la allowlist

La app tiene una tabla `AllowedEmail` que controla quién puede loguearse. **Si el email no está ahí, el login va a ser rechazado aunque las credenciales de Google sean correctas.**

### El primer admin (bootstrap)

El email del primer admin está hardcodeado en `prisma/startup.mjs`. Antes de deployar:

1. Abrir `prisma/startup.mjs`
2. Buscar esta línea:
```javascript
VALUES (gen_random_uuid()::text, 'federicopronesti@institutoiea.edu.ar', now())
```
3. Reemplazar el email por el tuyo
4. Buscar también:
```javascript
WHERE "email" = 'federicopronesti@institutoiea.edu.ar';
```
5. Reemplazar también por el tuyo

Este script corre automáticamente al arrancar el servidor en Railway y hace dos cosas:
- Agrega el email a `AllowedEmail` (si no existe)
- Actualiza el rol del usuario a `ADMIN` (workaround porque NextAuth crea usuarios con rol `EMPLOYEE` por default)

### Agregar más usuarios después del deploy

Una vez que el primer admin está logueado, puede agregar más emails desde el panel de administración (si está implementada esa sección) o directamente por SQL:

```sql
INSERT INTO "AllowedEmail" ("id", "email", "createdAt")
VALUES (gen_random_uuid()::text, 'nuevo@email.com', now())
ON CONFLICT ("email") DO NOTHING;
```

En Railway, podés ejecutar SQL desde:
- El plugin de PostgreSQL → pestaña "Query"
- O con cualquier cliente PostgreSQL externo usando la `DATABASE_PUBLIC_URL`

---

## 9. Verificar que todo funciona

### Checklist antes del primer login

- [ ] Variables de entorno cargadas en Railway (o en `.env.local` para dev)
- [ ] URI de redirección agregado en Google Cloud Console
- [ ] Email del admin correcto en `startup.mjs`
- [ ] Deploy exitoso en Railway (sin errores en los logs)

### Probar el login

1. Abrir la URL de la app
2. Debe redirigir a `/login`
3. Click en "Iniciar sesión con Google"
4. Seleccionar la cuenta de Google del admin
5. Debe redirigir al panel principal (`/`)

### Si algo falla

**"Error: redirect_uri_mismatch"** (página de Google en rojo)
→ El URI de redirección en Google Cloud Console no coincide con el de la app. Revisá el paso 5.

**Login exitoso pero redirige a `/login` de vuelta**
→ El email no está en `AllowedEmail`. Revisá el paso 8. También puede ser que `startup.mjs` no corrió correctamente — revisá los logs de Railway.

**"Error: Configuration"** o error en los logs del servidor
→ Falta alguna variable de entorno. Verificar que `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, y `NEXTAUTH_SECRET` estén correctamente cargadas.

**Login funciona pero el usuario queda en `/login` sin acceso al panel**
→ El usuario existe pero tiene rol `EMPLOYEE`. El UPDATE de `startup.mjs` puede no haber corrido. Verificar en la DB:
```sql
SELECT email, role FROM "User" WHERE email = 'tu@email.com';
UPDATE "User" SET role = 'ADMIN' WHERE email = 'tu@email.com';
```

---

## Referencia rápida — URLs clave

| Recurso | URL |
|---|---|
| Google Cloud Console | https://console.cloud.google.com |
| Credenciales OAuth | https://console.cloud.google.com/apis/credentials |
| Railway | https://railway.app |
| Callback URL (dev) | `http://localhost:3000/api/auth/callback/google` |
| Callback URL (prod) | `https://TU-DOMINIO.up.railway.app/api/auth/callback/google` |
