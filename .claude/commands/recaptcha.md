# Integrar reCAPTCHA v3

> Skill para integrar Google reCAPTCHA v3 (invisible) en el proyecto actual.
> Invocar con: `/project:recaptcha`
> Lee el playbook y guía al usuario paso a paso.

## Paso 1: Leer el playbook

Leé en silencio:
- `docs/playbooks/recaptcha.md` — guía agnóstica de integración
- `docs/recaptcha/RECAPTCHA_IMPLEMENTACION.md` — referencia detallada (si existe)
- `docs/recaptcha/RECAPTCHA_ALTA_MANUAL.md` — pasos manuales de alta (si existe)
- `docs/ARCHITECTURE.md` — para entender el stack actual

## Paso 2: Evaluar el proyecto

Antes de hacer cualquier cambio, respondé internamente:
- ¿Qué formularios necesitan protección? (login, registro, contacto, etc.)
- ¿El proyecto tiene endpoints de API que reciben datos de formularios?
- ¿Usa Next.js? Si sí, usar `next/script` para cargar el widget.
- ¿Ya tiene algún sistema de captcha?

## Paso 3: Preguntar al usuario

1. **¿En qué formularios querés reCAPTCHA?** (login, registro, contacto, todos)
2. **¿Ya tenés las claves de Google reCAPTCHA?** (Site Key + Secret Key) — si no, guiar al usuario a crearlas en `https://www.google.com/recaptcha/admin/create`
3. **¿Querés que en desarrollo se salte la verificación?** (recomendado: sí, fail-open en dev, fail-closed en prod)

## Paso 4: Planificar

Armá un plan con los formularios a proteger y los archivos a tocar.

```
SESIÓN: Integración reCAPTCHA v3
OBJETIVO: [descripción]

PASOS:
1. [paso concreto]

ARCHIVOS QUE VOY A TOCAR:
- [lista]
```

## Paso 5: Esperar aprobación

No escribas código hasta que el usuario apruebe el plan.

## Paso 6: Implementar

Seguí el playbook `docs/playbooks/recaptcha.md`. Puntos críticos:
- Verificar captcha ANTES de procesar credenciales/datos
- Usar `application/x-www-form-urlencoded` al llamar a Google (no JSON)
- Fail-closed en producción
- Usar `next/script` (no `<script>` HTML) en Next.js

## Paso 7: Verificar

- [ ] Correr build del proyecto
- [ ] En dev sin secret key: el formulario funciona (captcha se salta)
- [ ] En dev con secret key: el formulario funciona y se ve el token en Network
- [ ] Verificar que el badge de reCAPTCHA aparece en la página
- [ ] Actualizar `docs/ARCHITECTURE.md` si corresponde
- [ ] Actualizar `SESSION_LOG.md`
