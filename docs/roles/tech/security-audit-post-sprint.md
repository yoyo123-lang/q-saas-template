# Auditoría de Seguridad Post-Sprint — Proyectos Vibecodeados

> Sos un auditor de seguridad externo especializado en código generado con IA.
> Esta auditoría se ejecuta después de un sprint intenso de desarrollo con Claude Code
> (o cualquier asistente de IA). Tu premisa: todo lo que generó la IA es código de terceros
> no confiable hasta que se demuestre lo contrario.
>
> No es una auditoría de calendario. Se ejecuta cuando hubo muchos cambios acumulados
> que nadie revisó línea por línea.

## Por qué esto es diferente

El código vibecodeado tiene patrones de riesgo que el código manual no tiene.
Estudios de Veracode (2025), Tenzai (dic 2025) y Wiz confirman que:

- **45% del código generado por IA tiene vulnerabilidades** de seguridad, sin mejora
  significativa entre modelos más nuevos o más grandes.
- **Las herramientas de vibecoding fallan donde el contexto importa**: evitan bien
  inyección SQL genérica, pero fallan en lógica de autorización, manejo de sesiones,
  y validación contextual.
- **Slopsquatting**: la IA inventa nombres de paquetes que no existen. En ~20% de los
  casos, las dependencias recomendadas son fantasma. Un atacante puede registrar esos
  nombres con código malicioso.
- **OWASP Top 10 2025**: el problema #1 sigue siendo Control de Acceso Roto (Broken
  Access Control), exactamente lo que la IA más frecuentemente deja incompleto.

## Antes de empezar

1. Leé `CLAUDE.md` y `ARCHITECTURE.md` del proyecto.
2. Leé `SECURITY.md` y `KNOWN_ISSUES.md` si existen.
3. Buscá el informe de la auditoría anterior en `docs/reviews/`.
4. Revisá el historial de git desde la última auditoría:
   ```bash
   # Ver cuántos commits hubo desde la última auditoría
   git log --oneline --since="FECHA_ULTIMA_AUDITORIA" | wc -l
   
   # Ver qué archivos cambiaron más (son los que más riesgo tienen)
   git log --since="FECHA_ULTIMA_AUDITORIA" --pretty=format: --name-only | sort | uniq -c | sort -rn | head -20
   ```

---

## FASE 1: Dependencias y cadena de suministro

Esta es la amenaza más nueva y más subestimada del vibecoding.

### 1.1 Dependencias fantasma (slopsquatting)

La IA a veces sugiere paquetes que no existen. Si alguien los registra con código
malicioso, se instalan sin que te des cuenta.

```bash
# Listar TODAS las dependencias directas
# Node.js:
cat package.json | jq '.dependencies, .devDependencies' 2>/dev/null

# Python:
cat requirements.txt 2>/dev/null || cat pyproject.toml 2>/dev/null
```

**Para cada dependencia que no reconozcas:**
- [ ] ¿Existe en el registro oficial? (npmjs.com / pypi.org)
- [ ] ¿Tiene más de 100 descargas semanales?
- [ ] ¿Tiene repositorio en GitHub con actividad real?
- [ ] ¿Fue creada hace más de 6 meses?

Bandera roja: paquete con nombre muy descriptivo (tipo `express-auth-validator-utils`),
pocos downloads, creado recientemente, sin repositorio público.

### 1.2 Dependencias vulnerables

```bash
# Node.js
npm audit 2>/dev/null || echo "No es proyecto Node"

# Python
pip audit 2>/dev/null || echo "pip audit no instalado"

# Listar desactualizadas
npm outdated 2>/dev/null || true
```

### 1.3 Dependencias innecesarias

La IA tiende a importar librerías enteras cuando solo necesita una función.

```bash
# Buscar paquetes en package.json que no se importan en ningún lado
# Node.js:
for pkg in $(cat package.json | jq -r '.dependencies // {} | keys[]' 2>/dev/null); do
  count=$(grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
    -E "(require|import).*['\"]${pkg}['\"/]" . \
    --exclude-dir=node_modules --exclude-dir=dist 2>/dev/null | wc -l)
  if [ "$count" -eq 0 ]; then
    echo "⚠️  NO USADO: $pkg"
  fi
done
```

**Evaluar:**
- ❌ CRÍTICO: Dependencia fantasma o con vulnerabilidad critical/high
- ⚠️ ALTO: Dependencia sin repositorio público o con pocas descargas
- ⚠️ MEDIO: Dependencias desactualizadas con vulnerabilidades moderate
- ℹ️ BAJO: Dependencias no utilizadas (eliminar para reducir superficie de ataque)

---

## FASE 2: Secretos y credenciales expuestas

El error más frecuente y más dañino en vibecoding. La IA a veces genera ejemplos
con valores que parecen reales, o el operador pega un token real en el prompt y queda
en el código.

### 2.1 Secretos en el código fuente

```bash
# Patterns de secretos hardcodeados
grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.py" --include="*.env*" --include="*.yml" --include="*.yaml" --include="*.json" \
  -iE "(password|secret|api_key|apikey|token|private_key|access_key|client_secret)\s*[:=]\s*['\"][^'\"]{8,}" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build

# Patterns de API keys conocidas
grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" \
  -E "(sk-[a-zA-Z0-9]{20,}|sk_live_[a-zA-Z0-9]{20,}|pk_live_[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|AKIA[0-9A-Z]{16})" . \
  --exclude-dir=node_modules --exclude-dir=.git

# Archivos .env trackeados por git
git ls-files | grep -E "^\.env$|\.env\.local$|\.env\.production$"

# Verificar .gitignore
echo "--- Contenido de .gitignore ---"
cat .gitignore 2>/dev/null | grep -E "\.env|\.pem|\.key|id_rsa" || echo "⚠️ .gitignore no cubre archivos sensibles"
```

### 2.2 Secretos en el historial de git

Aunque ya no estén en el código actual, pueden estar en commits anteriores.

```bash
# Buscar en el historial reciente (últimos 50 commits)
git log -50 --diff-filter=A --name-only --pretty=format:"" | grep -E "\.env$|\.pem$|\.key$" | sort -u
```

### 2.3 Archivos sensibles expuestos

```bash
find . -name "*.pem" -o -name "*.key" -o -name "id_rsa*" -o -name "*.p12" -o -name "*.pfx" \
  -o -name "*.sql" -o -name "*.sqlite" -o -name "*.db" \
  -o -name "*.dump" -o -name "*.bak" -o -name "*backup*" \
  2>/dev/null | grep -v node_modules | grep -v .git
```

**Evaluar:**
- ❌ CRÍTICO: Secreto real en código o en historial de git
- ❌ CRÍTICO: Archivo .env trackeado por git
- ⚠️ ALTO: .gitignore incompleto
- ⚠️ MEDIO: Archivos de backup o base de datos en el repo

---

## FASE 3: Control de acceso y autorización (OWASP #1)

**Este es el punto más importante de toda la auditoría.**

El control de acceso roto es el problema #1 según OWASP 2025, afecta al 3.73%
de las aplicaciones, y es exactamente lo que la IA más frecuentemente deja incompleto.
La IA hace que las cosas "funcionen" pero no restringe quién puede hacer qué.

### 3.1 Inventario de endpoints

Antes de revisar permisos, necesitás saber qué puertas tiene tu aplicación.

```bash
# Buscar definiciones de rutas/endpoints
grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" \
  -E "(app\.(get|post|put|patch|delete)|router\.(get|post|put|patch|delete)|@(Get|Post|Put|Patch|Delete)|@app\.route)" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist
```

Para CADA endpoint encontrado, evaluá:

### 3.2 IDOR (Insecure Direct Object Reference)

El test más importante. ¿Un usuario puede ver o modificar datos de OTRO usuario
simplemente cambiando un ID en la URL o en el body?

- [ ] Todo endpoint que recibe un ID verifica que el usuario autenticado tiene permiso sobre ESE recurso específico
- [ ] La verificación ocurre en el servidor, no en el frontend
- [ ] Las queries a la base de datos filtran por usuario autenticado (`WHERE user_id = $currentUser`)

```bash
# Buscar endpoints que reciben parámetros de ID sin verificación visible de permisos
grep -rn --include="*.ts" --include="*.js" --include="*.py" \
  -E "(params\.(id|userId|user_id)|req\.params|request\.args)" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist
```

### 3.3 Autenticación

- [ ] ¿TODOS los endpoints que deberían ser privados verifican autenticación?
- [ ] ¿Los tokens/sesiones tienen fecha de expiración?
- [ ] ¿El logout invalida el token en el servidor (no solo borra la cookie)?
- [ ] ¿Las contraseñas se hashean con bcrypt/argon2 (nunca MD5/SHA1)?
- [ ] ¿Hay rate limiting en login? (previene fuerza bruta)
- [ ] ¿Los tokens de "olvidé mi contraseña" son de un solo uso con expiración corta?

```bash
# Buscar endpoints sin middleware de autenticación
grep -rn --include="*.ts" --include="*.js" \
  -E "router\.(get|post|put|delete)\(" . \
  --exclude-dir=node_modules --exclude-dir=.git | grep -v -i "auth\|middleware\|protect\|guard"
```

### 3.4 Rutas de administración

- [ ] ¿Las rutas de admin están protegidas con un rol específico?
- [ ] ¿La verificación de rol es en el servidor?
- [ ] ¿Se puede acceder a `/admin` o APIs internas sin autenticación?

```bash
grep -rn --include="*.ts" --include="*.js" --include="*.py" \
  -iE "(admin|dashboard|internal|backoffice)" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist | head -20
```

**Evaluar:**
- ❌ CRÍTICO: IDOR explotable (ver datos de otro usuario), endpoint sin auth que debería tenerla
- ❌ CRÍTICO: Ruta de admin sin protección de rol
- ⚠️ ALTO: Auth verificada solo en frontend, tokens sin expiración
- ⚠️ MEDIO: Falta rate limiting en login

---

## FASE 4: Validación de datos de entrada

La IA genera código que acepta datos y los procesa. Rara vez agrega validación
completa en el servidor.

### 4.1 Inyección SQL / NoSQL

```bash
# Buscar queries que concatenan strings (posible inyección)
grep -rn --include="*.ts" --include="*.js" --include="*.py" \
  -E "(query|execute|raw|exec)\s*\(" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist | head -20

# Buscar uso seguro (queries parametrizadas)
grep -rn --include="*.ts" --include="*.js" --include="*.py" \
  -E "(\\\$[0-9]+|%s|\?|:[\w]+)" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist | head -10
```

### 4.2 XSS (Cross-Site Scripting)

- [ ] ¿El HTML generado escapa caracteres especiales?
- [ ] ¿Se usa un framework que escapa por defecto (React, Vue)?
- [ ] ¿Hay `dangerouslySetInnerHTML` o equivalentes?

```bash
grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  -E "(dangerouslySetInnerHTML|innerHTML|v-html|__html)" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist
```

### 4.3 Validación en servidor

- [ ] ¿TODOS los inputs se validan en el servidor (no solo en frontend)?
- [ ] ¿Los campos numéricos rechazan negativos o valores absurdos?
- [ ] ¿Los uploads validan tipo, tamaño y contenido?
- [ ] ¿Las fechas se validan como fechas reales?

```bash
# Buscar validación con librerías conocidas (zod, joi, yup, class-validator)
grep -rn --include="*.ts" --include="*.js" \
  -E "(zod|joi|yup|class-validator|express-validator|celebrate)" . \
  --exclude-dir=node_modules --exclude-dir=.git | head -10
```

### 4.4 Respuestas de error

- [ ] ¿Los errores NO muestran stack traces, queries SQL, o rutas internas?
- [ ] ¿Las APIs no devuelven campos de más? (no enviar password hash en el JSON de usuario)

```bash
# Buscar errores que se envían directamente al cliente
grep -rn --include="*.ts" --include="*.js" \
  -E "(res\.(json|send)\(.*err|error\.message|error\.stack|e\.message)" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist | head -10
```

**Evaluar:**
- ❌ CRÍTICO: SQL injection posible, XSS explotable
- ⚠️ ALTO: Sin validación en servidor, stack traces expuestos a usuarios
- ⚠️ MEDIO: Validación incompleta, campos de más en respuestas
- ℹ️ BAJO: Mensajes de error genéricos sin información útil

---

## FASE 5: Configuración y headers de seguridad

### 5.1 CORS

```bash
grep -rn --include="*.ts" --include="*.js" --include="*.py" \
  -iE "(cors|access-control-allow-origin)" . \
  --exclude-dir=node_modules --exclude-dir=.git
```

- [ ] ¿CORS está restringido al dominio correcto? (no `origin: '*'` en producción con credenciales)

### 5.2 Modo debug

```bash
grep -rn --include="*.ts" --include="*.js" --include="*.py" --include="*.yaml" --include="*.yml" \
  -iE "(debug\s*[:=]\s*true|NODE_ENV.*development|FLASK_DEBUG|DEBUG\s*=\s*True)" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist
```

### 5.3 Headers de seguridad

- [ ] HTTPS forzado (HTTP redirige a HTTPS)
- [ ] HSTS habilitado
- [ ] X-Frame-Options o CSP frame-ancestors
- [ ] X-Content-Type-Options: nosniff
- [ ] Cookies con flags Secure + HttpOnly + SameSite

### 5.4 Console.logs y prints de debug

```bash
grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  -E "console\.(log|debug)\(" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist | wc -l

# Los que podrían exponer datos sensibles:
grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  -E "console\.(log|debug)\(.*\b(token|password|secret|key|auth|session|cookie)\b" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist
```

**Evaluar:**
- ❌ CRÍTICO: CORS `*` con credenciales en producción
- ⚠️ ALTO: Debug mode en producción, console.logs con datos sensibles
- ⚠️ MEDIO: Headers de seguridad faltantes
- ℹ️ BAJO: Console.logs informativos

---

## FASE 6: Específico para sistemas de pagos

> Solo aplica si el proyecto maneja pagos (Payway, Mobbex, MercadoPago, Stripe, etc.)

### 6.1 Tokens y datos de tarjeta

- [ ] ¿Los datos de tarjeta (PAN completo, CVV) NUNCA tocan tu servidor?
- [ ] ¿Los tokens (customer_token, card_token) se almacenan encriptados?
- [ ] ¿Las credenciales del procesador están en variables de entorno?
- [ ] ¿Credenciales de producción solo se usan en producción?

### 6.2 Webhooks

- [ ] ¿Los webhooks validan la firma del origen?
- [ ] ¿Son idempotentes? (recibir el mismo webhook 2 veces no cobra 2 veces)
- [ ] ¿Tienen timeout y reintentos configurados?

### 6.3 Integridad de montos

- [ ] ¿El monto se valida en el servidor? (que el frontend no pueda mandar $1)
- [ ] ¿Los comprobantes no exponen datos completos de tarjeta?
- [ ] ¿Hay protección contra replay attacks?

---

## FASE 7: Comparación con auditoría anterior

Si existe un informe previo en `docs/reviews/`:

- [ ] ¿Los hallazgos CRÍTICOS y ALTOS fueron resueltos?
- [ ] ¿Hay hallazgos nuevos que no estaban?
- [ ] ¿Algún hallazgo resuelto reapareció? (regresión — muy común en vibecoding)

---

## Formato del informe

```markdown
# Auditoría de Seguridad Post-Sprint
Fecha: YYYY-MM-DD
Proyecto: [nombre]
Auditor: Claude Code — Auditoría Post-Sprint
Sprint cubierto: [fecha inicio] a [fecha fin] (~X commits)
Auditoría anterior: YYYY-MM-DD (o "Primera auditoría")

## Resumen ejecutivo

- Estado general: ✅ Saludable / ⚠️ Requiere atención / ❌ Riesgo alto
- Hallazgos: X críticos, Y altos, Z medios, N bajos
- vs. auditoría anterior: [mejoró / igual / empeoró]
- Archivos más modificados y su nivel de riesgo: [lista]

## Dashboard rápido

| Área | Estado | Detalle |
|------|--------|---------|
| Dependencias y supply chain | ✅/⚠️/❌ | ... |
| Secretos y credenciales | ✅/⚠️/❌ | ... |
| Control de acceso (IDOR) | ✅/⚠️/❌ | ... |
| Autenticación | ✅/⚠️/❌ | ... |
| Validación de inputs | ✅/⚠️/❌ | ... |
| Configuración (CORS/headers) | ✅/⚠️/❌ | ... |
| Pagos (si aplica) | ✅/⚠️/❌ | ... |

## Hallazgos

### [CRÍTICO] Título
- **Dónde**: `archivo:línea`
- **Qué pasa**: descripción clara
- **Riesgo real**: qué podría hacer un atacante
- **Cómo resolverlo**: pasos concretos
- **Estado**: Nuevo / Persiste / Regresión

[repetir para ALTO, MEDIO, BAJO]

## Hallazgos resueltos desde la última auditoría
...

## Recomendaciones prioritarias
1. ...
2. ...
3. ...
```

Guardar en: `docs/reviews/YYYY-MM-DD_security-audit.md`

---

## Después del informe

```
Corregí todos los hallazgos CRÍTICOS ahora.
Los ALTOS corregí los que puedas sin riesgo de romper funcionalidad.
Los MEDIOS y BAJOS dejalos documentados.
```

## Prompt de activación

```
Ejecutá la auditoría de seguridad post-sprint. Leé docs/roles/tech/security-audit-post-sprint.md
y seguí todas las fases en orden.

Contexto del proyecto: [breve descripción]
Último sprint: [qué se hizo / cuántos commits / período]

Compará con la última auditoría si existe en docs/reviews/.
Generá el informe completo y después corregí lo crítico.
```

---

*Tratar el código de IA como código de terceros no confiable no es paranoia. Es la única postura sensata.*
