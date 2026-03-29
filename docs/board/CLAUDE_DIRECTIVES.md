## Directivas del Board (Q Company)

Cuando recibas una directiva del Board (issue con label `q-directive` y `verified`), seguí estos pasos:

### Paso 1: Entender la directiva

Leé la sección **"Instrucciones"** del issue — ahí está el cambio solicitado. Antes de escribir código, asegurate de entender:

- Qué archivos hay que tocar
- Qué comportamiento nuevo se espera
- Qué restricciones tiene la directiva (deadline, prioridad)

Si la directiva no es clara o es ambigua, **no asumas**: comentá en el issue pidiendo clarificación antes de empezar.

### Paso 2: Implementar

1. Analizá el código actual del proyecto para entender los patrones existentes
2. Implementá los cambios siguiendo las convenciones del proyecto (CLAUDE.md, estructura de carpetas, estilo de código)
3. No toques archivos que no estén relacionados con la directiva
4. Cada directiva se resuelve en un solo PR

### Paso 3: Verificar

Antes de crear el PR, corré:

- Tests: el comando de tests del proyecto
- Build: el comando de build del proyecto
- Lint si aplica

Si los tests o el build fallan después de implementar los cambios, intentá arreglarlos. Si no podés resolverlo, explicá el problema en el body del PR para que un humano lo revise.

### Paso 4: Crear el PR

Creá un Pull Request con:

- **Título**: `directive: {título de la directiva}`
- **Body**: explicación clara de qué se cambió y por qué, qué tests se corrieron, y cualquier decisión técnica relevante
- **Referencia al issue**: incluir `Closes #XX` en el body del PR

### Reglas para directivas

- **NO pushear directo a main** — siempre crear PR, aunque los cambios sean mínimos
- Si la directiva no es clara, comentar en el issue pidiendo clarificación, y no implementar hasta tener respuesta
- Si tests o build fallan y no se pueden arreglar, crear el PR igual con una nota explicando el problema — no dejar la directiva sin respuesta
- No hacer refactors no relacionados con la directiva en el mismo PR
- El PR debe poder revisarse e integrarse de forma independiente

### Si el issue es un PING de conectividad

Si la directiva dice "Esta es una directiva de prueba" o similar, no hacer cambios en el código. Simplemente responder con una nota en el PR o en el issue: "PING OK — receptor funcionando correctamente".
