# Git Worktrees — Desarrollo en Ramas Aisladas

> Cada sesión de trabajo se hace en un worktree dedicado.
> Si algo sale mal, se descarta sin afectar `main`.
> Es la red de seguridad para un operador solo.

## Qué es un worktree

Un worktree es una copia de trabajo del repositorio en otra carpeta, apuntando a otra rama. No es un clone — comparten el mismo `.git`. Los cambios en un worktree no afectan al otro.

```text
mi-proyecto/              ← main (no se toca directamente)
mi-proyecto-worktrees/
├── feat-nueva-pantalla/  ← rama feature/nueva-pantalla
├── fix-calculo-iva/      ← rama fix/calculo-iva
└── ...
```

## Cuándo usar worktrees

| Situación | ¿Worktree? |
|---|---|
| Feature nueva o cambio mediano-grande (>3 archivos) | Sí |
| Fix puntual de 1-2 archivos con bajo riesgo | No hace falta, trabajar en rama normal |
| Refactor que toca muchos archivos | Sí, obligatorio |
| Experimento o prueba de concepto | Sí — si no funciona, se descarta limpio |
| Cambio solo de documentación | No hace falta |

## Flujo completo

### Crear worktree al inicio de sesión

```bash
# Desde la raíz del proyecto (main)
# 1. Asegurarse de estar actualizado
git checkout main
git pull origin main

# 2. Crear rama + worktree en una carpeta hermana
BRANCH_NAME="feature/nombre-descriptivo"
WORKTREE_DIR="../$(basename $(pwd))-worktrees/$(echo $BRANCH_NAME | tr '/' '-')"

git worktree add -b "$BRANCH_NAME" "$WORKTREE_DIR"

# 3. Moverse al worktree
cd "$WORKTREE_DIR"

# 4. Instalar dependencias (el worktree no comparte node_modules)
npm install   # o el equivalente del proyecto
```

Después de esto, todo el trabajo de la sesión se hace dentro del worktree.

### Verificar estado del worktree

```bash
# Ver todos los worktrees activos
git worktree list

# Output ejemplo:
# /home/user/mi-proyecto                    abc1234 [main]
# /home/user/mi-proyecto-worktrees/feature-nueva-pantalla  def5678 [feature/nueva-pantalla]
```

### Al terminar la sesión — Opciones

#### Opción A: Mergear a main (todo salió bien)

```bash
# Desde el worktree, commitear todo
git add -A
git commit -m "feat: descripción del cambio"

# Volver a main
cd /ruta/al/proyecto/principal
git checkout main

# Mergear
git merge feature/nombre-descriptivo

# Limpiar worktree y rama
git worktree remove "../mi-proyecto-worktrees/feature-nombre-descriptivo"
git branch -d feature/nombre-descriptivo
```

#### Opción B: Crear PR (si se usa GitHub/GitLab)

```bash
# Desde el worktree, push de la rama
git push origin feature/nombre-descriptivo

# Crear PR desde la interfaz web
# Después del merge, limpiar:
git worktree remove "../mi-proyecto-worktrees/feature-nombre-descriptivo"
git branch -d feature/nombre-descriptivo
```

#### Opción C: Descartar (algo salió mal)

```bash
# Volver a main
cd /ruta/al/proyecto/principal

# Borrar worktree y rama — se pierde todo el trabajo, main queda intacto
git worktree remove --force "../mi-proyecto-worktrees/feature-nombre-descriptivo"
git branch -D feature/nombre-descriptivo
```

#### Opción D: Dejar para después (sesión incompleta)

```bash
# Commitear el progreso parcial
git add -A
git commit -m "wip: sesión incompleta — [descripción de dónde quedó]"

# El worktree queda ahí. En la próxima sesión:
cd /ruta/al/worktree
# y seguir trabajando
```

## Verificación antes de mergear

Antes de mergear un worktree a main, correr DESDE EL WORKTREE:

```bash
# 1. Tests
npm test   # o equivalente

# 2. Build
npm run build   # o equivalente

# 3. Lint
npm run lint   # o equivalente

# 4. Diff contra main — revisar que no haya sorpresas
git diff main --stat
```

Si algo falla, arreglar en el worktree. Main no se contaminó.

## Setup del proyecto (único, primera vez)

```bash
# Crear la carpeta de worktrees si no existe
mkdir -p "../$(basename $(pwd))-worktrees"

# Agregar al .gitignore global (no al del repo)
echo "*-worktrees/" >> ~/.gitignore_global
git config --global core.excludesfile ~/.gitignore_global
```

## Comandos de referencia rápida

| Acción | Comando |
|---|---|
| Crear worktree + rama | `git worktree add -b rama ../carpeta` |
| Listar worktrees | `git worktree list` |
| Eliminar worktree limpio | `git worktree remove ../carpeta` |
| Eliminar worktree forzado | `git worktree remove --force ../carpeta` |
| Limpiar worktrees huérfanos | `git worktree prune` |

## Reglas para Claude Code

- Si `/project:sesion` decide que el trabajo amerita worktree (>3 archivos o riesgo medio-alto), crearlo automáticamente.
- Nunca trabajar directamente en main para features o refactors.
- Al cerrar sesión (`/project:cierre`), preguntar qué hacer con el worktree (mergear, PR, descartar, dejar).
- Si el build falla en el worktree, arreglar ahí. No mergear código roto.
- Los worktrees no se commitean al repo (están fuera del directorio del proyecto).
