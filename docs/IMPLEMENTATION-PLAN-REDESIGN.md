# Plan de Implementación — q-saas-template (Base Canónica)

> Este es el template base del ecosistema Q. Los cambios aquí definen el estándar para todas las BU.
> Una vez completado, cada BU replica estos archivos cambiando solo el accent color.

## Contexto

- **Repo**: yoyo123-lang/q-saas-template
- **Branch**: claude/check-stitch-connection-SyJI4
- **Stack**: Next.js 15.3.3, React 19, Tailwind CSS 4.2.2, TypeScript 5.9
- **Estado actual**: globals.css mínimo (`@import "tailwindcss"` solamente), componentes con colores hardcodeados en grises

## Referencia visual

- Leer `docs/Q-DESIGN-SYSTEM.md` en este mismo repo — contiene TODOS los tokens, colores, y especificaciones
- Mockups en Stitch (proyecto "Q Design System — qontabiliza")

## Tareas

### Tarea 1: globals.css con tokens del design system

**Archivo**: `src/app/globals.css`

Reemplazar contenido completo con la especificación de `docs/Q-DESIGN-SYSTEM.md` sección 1.
El accent del template es `#2563EB` (azul, igual que qobra).

### Tarea 2: Tema dark/light

**Archivos nuevos**:
- `src/lib/theme.ts` — funciones `toggleTheme()` e `initTheme()`
- `src/components/shared/theme-toggle.tsx` — botón toggle sol/luna (Lucide icons: Sun, Moon)

**Modificar**:
- `src/app/layout.tsx` — agregar script inline para prevenir flash of unstyled content (FOUC), usando el snippet de `docs/Q-DESIGN-SYSTEM.md` sección 6

### Tarea 3: Actualizar sidebar

**Archivo**: `src/components/layout/sidebar.tsx`

Cambios:
- Background: `bg-[#0F172A]` (siempre dark navy, independiente del mode)
- Logo: texto "q-saas" en blanco, top con padding `p-6`
- Items: `text-white/80 hover:text-white hover:bg-white/5`
- Item activo: `text-white bg-white/5 border-l-2 border-[var(--color-q-accent)]`
- Footer: usuario con avatar, nombre, rol
- Agregar `ThemeToggle` en el footer del sidebar
- Mobile: overlay con `bg-black/50`, botón hamburger en header

### Tarea 4: Actualizar header

**Archivo**: `src/components/layout/header.tsx`

Cambios:
- Background: `bg-[var(--q-surface)]`
- Border bottom: `border-b border-[var(--q-border-light)]`
- Title: `text-[var(--q-text-primary)]`
- Breadcrumbs en `text-[var(--q-text-muted)]`

### Tarea 5: Actualizar componentes shared

**5a. `src/components/shared/status-badge.tsx`**
- Reemplazar colores hardcodeados por tokens semánticos:
  - active → `bg-[var(--color-q-success-bg)] text-[var(--color-q-success-text)]`
  - paused → `bg-[var(--color-q-warning-bg)] text-[var(--color-q-warning-text)]`
  - completed → `bg-[var(--color-q-info-bg)] text-[var(--color-q-info-text)]`
  - archived → `bg-[var(--color-q-neutral-bg)] text-[var(--color-q-neutral-text)]`
  - error/rejected → `bg-[var(--color-q-error-bg)] text-[var(--color-q-error-text)]`

**5b. `src/components/shared/data-table.tsx`**
- Header: `bg-[var(--q-table-header-bg)] text-[var(--q-text-muted)]`
- Filas: `bg-[var(--q-surface)] border-b border-[var(--q-border-light)]`
- Hover: `hover:bg-[var(--q-table-hover)]`

**5c. `src/components/shared/confirm-dialog.tsx`**
- Background del modal: `bg-[var(--q-surface)]`
- Overlay: `bg-black/50`
- Texto: usar tokens `--q-text-*`

**5d. `src/components/shared/empty-state.tsx`**
- Texto: `text-[var(--q-text-muted)]`
- Ícono: `text-[var(--q-text-disabled)]`

**5e. `src/components/shared/loading-state.tsx`**
- Spinner/skeleton: usar `bg-[var(--q-surface-hover)]` con animación pulse

**5f. `src/components/shared/error-state.tsx`**
- Ícono: `text-[var(--color-q-error)]`
- Texto: `text-[var(--q-text-muted)]`
- Botón retry: usar accent

### Tarea 6: Font Inter

**Archivo**: `src/app/layout.tsx`

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

// En el <html>:
<html lang="es" className={inter.variable}>
```

### Tarea 7: Verificación

- [ ] Light mode se ve correcto (fondos blancos/grises, texto navy)
- [ ] Dark mode se ve correcto (fondos navy, texto claro)
- [ ] Toggle funciona y persiste en localStorage
- [ ] No hay flash de tema incorrecto al cargar
- [ ] Sidebar es siempre dark navy en ambos modos
- [ ] Badges de estado cambian correctamente entre modos
- [ ] Tablas se ven bien en ambos modos
- [ ] Build sin errores: `npm run build`

## Orden de ejecución

1. Tarea 6 (Font) → 2. Tarea 1 (globals.css) → 3. Tarea 2 (theme) → 4. Tarea 3 (sidebar) → 5. Tarea 4 (header) → 6. Tarea 5 (shared) → 7. Verificación

## Notas para el agente

- NO agregar dependencias nuevas (Inter viene de next/font/google, Lucide ya está instalado)
- NO cambiar la estructura de carpetas
- NO modificar lógica de negocio, solo estilos y tema
- Usar SIEMPRE los CSS custom properties del design system, NUNCA hardcodear colores
- Priorizar legibilidad y mantenibilidad
