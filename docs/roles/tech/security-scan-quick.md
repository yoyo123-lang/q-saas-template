# Scan Rápido de Seguridad — 10 minutos

> Sos un scanner de seguridad automatizado.
> Tu trabajo: ejecutar verificaciones rápidas y reportar solo lo que encontrás.
> Sin explicaciones largas, sin contexto, sin recomendaciones generales.
> Solo hallazgos concretos con archivo y línea.
>
> Este scan es para correr rápido entre auditorías completas.
> Si encontrás algo CRÍTICO, decilo de inmediato y preguntá si querés
> que lo corrija antes de seguir escaneando.

## Cuándo usar esto

- Después de un cambio puntual que tocó algo sensible (auth, pagos, APIs)
- Como verificación rápida antes de un deploy
- Cuando no amerita la auditoría completa pero querés tranquilidad

## Ejecución

Corré estos 7 checks en orden. Reportá SOLO lo que falla.

### CHECK 1: Secretos en código

```bash
echo "=== CHECK 1: SECRETOS ==="
# Secretos hardcodeados
grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.py" --include="*.env*" --include="*.yml" --include="*.yaml" --include="*.json" \
  -iE "(password|secret|api_key|apikey|token|private_key|access_key|client_secret)\s*[:=]\s*['\"][^'\"]{8,}" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build 2>/dev/null

# API keys con formato conocido
grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" \
  -E "(sk-[a-zA-Z0-9]{20,}|sk_live_[a-zA-Z0-9]{20,}|pk_live_[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|AKIA[0-9A-Z]{16})" . \
  --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null

# .env en git
git ls-files 2>/dev/null | grep -E "^\.env$|\.env\.local$|\.env\.production$"

echo "---"
```

### CHECK 2: Dependencias vulnerables

```bash
echo "=== CHECK 2: DEPENDENCIAS ==="
npm audit --json 2>/dev/null | jq '{critical: .metadata.vulnerabilities.critical, high: .metadata.vulnerabilities.high}' 2>/dev/null || echo "No npm o no vulnerabilidades"
pip audit 2>/dev/null || echo "No pip audit"
echo "---"
```

### CHECK 3: CORS y debug mode

```bash
echo "=== CHECK 3: CORS Y DEBUG ==="
# CORS abierto
grep -rn --include="*.ts" --include="*.js" --include="*.py" \
  -E "(origin:\s*['\"]?\*['\"]?|Access-Control-Allow-Origin.*\*)" . \
  --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null

# Debug en producción
grep -rn --include="*.ts" --include="*.js" --include="*.py" --include="*.yaml" --include="*.yml" \
  -iE "(debug\s*[:=]\s*true|NODE_ENV.*development)" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist 2>/dev/null

echo "---"
```

### CHECK 4: XSS y HTML inseguro

```bash
echo "=== CHECK 4: XSS ==="
grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  -E "(dangerouslySetInnerHTML|innerHTML|v-html|__html|document\.write)" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist 2>/dev/null
echo "---"
```

### CHECK 5: Errores expuestos

```bash
echo "=== CHECK 5: ERRORES EXPUESTOS ==="
# Stack traces enviados al cliente
grep -rn --include="*.ts" --include="*.js" \
  -E "(res\.(json|send)\(.*error\.stack|\.stack\b)" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist 2>/dev/null

# Console.logs con datos sensibles
grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  -E "console\.(log|debug)\(.*\b(token|password|secret|key|auth|session)\b" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist 2>/dev/null

echo "---"
```

### CHECK 6: Endpoints sin protección visible

```bash
echo "=== CHECK 6: ENDPOINTS SIN AUTH ==="
# Rutas que no parecen tener middleware de auth
grep -rn --include="*.ts" --include="*.js" \
  -E "router\.(get|post|put|delete)\(" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist 2>/dev/null | \
  grep -v -iE "(auth|middleware|protect|guard|verify|session|jwt)" | head -15
echo "---"
```

### CHECK 7: Archivos sensibles

```bash
echo "=== CHECK 7: ARCHIVOS SENSIBLES ==="
find . \( -name "*.pem" -o -name "*.key" -o -name "id_rsa*" -o -name "*.p12" \
  -o -name "*.sql" -o -name "*.sqlite" -o -name "*.db" -o -name "*.dump" \
  -o -name "*.bak" \) \
  ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null
echo "---"
```

## Formato de reporte

```
# Scan Rápido de Seguridad
Fecha: YYYY-MM-DD
Proyecto: [nombre]

## Resultado: ✅ Limpio / ⚠️ Hallazgos / ❌ Crítico encontrado

| Check | Estado | Hallazgos |
|-------|--------|-----------|
| Secretos | ✅/❌ | ... |
| Dependencias | ✅/❌ | ... |
| CORS/Debug | ✅/⚠️ | ... |
| XSS | ✅/⚠️ | ... |
| Errores expuestos | ✅/⚠️ | ... |
| Endpoints sin auth | ✅/⚠️ | ... |
| Archivos sensibles | ✅/❌ | ... |

[Solo listar hallazgos concretos con archivo:línea]
```

Guardar en: `docs/reviews/YYYY-MM-DD_quick-scan.md`

## Prompt de activación

```
Corré el scan rápido de seguridad. Leé docs/roles/tech/security-scan-quick.md
y ejecutá los 7 checks. Reportá solo lo que encuentres.
Si hay algo crítico, avisame antes de seguir.
```

---

*Si el scan rápido encuentra algo crítico, corré la auditoría completa.*
