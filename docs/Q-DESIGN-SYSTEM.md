# Q Design System — Especificación Técnica

> Documento canónico del sistema de diseño unificado para el ecosistema Q.
> Todas las BU deben seguir esta especificación. Solo cambia `--q-accent` por producto.

## 1. Arquitectura de Tokens CSS

Usamos CSS custom properties con Tailwind v4 `@theme` para definir tokens semánticos que se adaptan a light/dark mode.

### Estructura del `globals.css`

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

/* =============================================
   Q DESIGN SYSTEM — TOKENS
   BU: [nombre] | Accent: [hex]
   ============================================= */

@theme {
  /* — Accent (ÚNICO valor que cambia por BU) — */
  --color-q-accent: #2563EB;        /* Cambiar por BU */
  --color-q-accent-light: #3B82F6;  /* Variant clara del accent */
  --color-q-accent-dim: #1D4ED8;    /* Variant oscura del accent */

  /* — Navy (compartido, nunca cambia) — */
  --color-q-navy-950: #0B0F1A;
  --color-q-navy-900: #0F172A;
  --color-q-navy-800: #1E293B;
  --color-q-navy-700: #334155;

  /* — Neutros (compartido) — */
  --color-q-gray-50: #F8FAFC;
  --color-q-gray-100: #F1F5F9;
  --color-q-gray-200: #E2E8F0;
  --color-q-gray-300: #CBD5E1;
  --color-q-gray-400: #94A3B8;
  --color-q-gray-500: #64748B;
  --color-q-gray-600: #334155;
  --color-q-gray-700: #1E293B;
  --color-q-gray-900: #0F172A;

  /* — Status (compartido) — */
  --color-q-success: #10B981;
  --color-q-success-bg: #ECFDF5;
  --color-q-success-text: #065F46;
  --color-q-error: #EF4444;
  --color-q-error-bg: #FEF2F2;
  --color-q-error-text: #991B1B;
  --color-q-warning: #F59E0B;
  --color-q-warning-bg: #FFFBEB;
  --color-q-warning-text: #92400E;
  --color-q-info: #3B82F6;
  --color-q-info-bg: #EFF6FF;
  --color-q-info-text: #1E40AF;
  --color-q-neutral: #6B7280;
  --color-q-neutral-bg: #F3F4F6;
  --color-q-neutral-text: #374151;

  /* — Tipografía — */
  --font-sans: "Inter", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;

  /* — Radios — */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
}

/* =============================================
   LIGHT MODE (default)
   ============================================= */

:root {
  --q-bg: var(--color-q-gray-50);
  --q-surface: #FFFFFF;
  --q-surface-hover: var(--color-q-gray-100);
  --q-text-primary: var(--color-q-navy-900);
  --q-text-secondary: var(--color-q-navy-700);
  --q-text-body: var(--color-q-gray-600);
  --q-text-muted: var(--color-q-gray-500);
  --q-text-disabled: var(--color-q-gray-400);
  --q-border: var(--color-q-gray-300);
  --q-border-light: var(--color-q-gray-200);
  --q-table-header-bg: var(--color-q-gray-50);
  --q-table-hover: var(--color-q-gray-50);
  --q-input-bg: #FFFFFF;
  --q-input-border: var(--color-q-gray-300);
}

/* =============================================
   DARK MODE
   ============================================= */

.dark {
  --q-bg: #0B1120;
  --q-surface: #111827;
  --q-surface-hover: #1A2332;
  --q-text-primary: #F1F5F9;
  --q-text-secondary: #CBD5E1;
  --q-text-body: #94A3B8;
  --q-text-muted: #64748B;
  --q-text-disabled: #475569;
  --q-border: #1E293B;
  --q-border-light: #162032;
  --q-table-header-bg: #0F172A;
  --q-table-hover: #1A2332;
  --q-input-bg: #1A2332;
  --q-input-border: #334155;

  /* Status colors en dark — backgrounds más sutiles */
  --color-q-success-bg: rgba(16, 185, 129, 0.12);
  --color-q-success-text: #34D399;
  --color-q-error-bg: rgba(239, 68, 68, 0.12);
  --color-q-error-text: #F87171;
  --color-q-warning-bg: rgba(245, 158, 11, 0.12);
  --color-q-warning-text: #FBBF24;
  --color-q-info-bg: rgba(59, 130, 246, 0.12);
  --color-q-info-text: #60A5FA;
  --color-q-neutral-bg: rgba(107, 114, 128, 0.12);
  --color-q-neutral-text: #9CA3AF;
}

/* =============================================
   BASE STYLES
   ============================================= */

* { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  background-color: var(--q-bg);
  color: var(--q-text-primary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

## 2. Colores por BU

| BU | `--color-q-accent` | `--color-q-accent-light` | `--color-q-accent-dim` |
|---|---|---|---|
| q-saas-template | `#2563EB` | `#3B82F6` | `#1D4ED8` |
| qobra | `#2563EB` | `#3B82F6` | `#1D4ED8` |
| qontacta | `#10B981` | `#34D399` | `#059669` |
| qautiva | `#8B5CF6` | `#A78BFA` | `#7C3AED` |
| qapitaliza | `#F59E0B` | `#FBBF24` | `#D97706` |
| qontrata | `#F43F5E` | `#FB7185` | `#E11D48` |
| qontabiliza | `#06B6D4` | `#22D3EE` | `#0891B2` |
| q-company | `#3B82F6` | `#60A5FA` | `#2563EB` |

## 3. Tipografía

| Nivel | Tamaño | Peso | Line-height | Uso |
|---|---|---|---|---|
| Display | 32px | Bold (700) | 1.0 | Montos grandes |
| H1 | 24px | Bold (700) | 1.2 | Títulos de página |
| H2 | 20px | Semibold (600) | 1.2 | Títulos de sección |
| H3 | 16px | Semibold (600) | 1.3 | Títulos de cards |
| Body | 14px | Regular (400) | 1.5 | Texto general |
| Body Bold | 14px | Medium (500) | 1.5 | Labels con énfasis |
| Small | 12px | Regular (400) | 1.5 | Metadata, timestamps |
| Badge | 11px | Medium (500) | 1.0 | Texto en pills |

Fuente: **Inter** — `https://fonts.google.com/specimen/Inter`
Pesos: 400, 500, 600, 700

## 4. Sidebar (compartido, nunca cambia)

```
Background:        #0F172A (siempre dark navy, en light Y dark mode)
Logo:              Wordmark BU en blanco, top, padding generoso
Menu items:        text-white/80, Lucide icons stroke-width 1.5
Item activo:       text-white, border-left 2px var(--color-q-accent), bg-white/5
Section labels:    uppercase, tracking-wide, text-gray-500, 11px
Usuario:           Bottom, avatar circular, nombre + rol
Width:             256px (desktop), overlay en mobile
```

## 5. Componentes

### Buttons
```
Primario:    bg-q-accent, text-white, radius-md (8px)
Secundario:  bg-transparent, border 1px q-accent, text-q-accent
Ghost:       bg-transparent, text-q-accent
Peligro:     bg-q-error, text-white
Estados:     hover (10% más oscuro), disabled (50% opacidad), focus (ring 2px accent)
```

### Cards
```
Background:  var(--q-surface)
Border:      1px var(--q-border-light) [solo en dark mode]
Shadow:      shadow-sm [solo en light mode]
Radius:      12px
Padding:     24px
```

### Badges (pill)
```
Radius:      full
Padding:     px-2.5 py-1
Font:        11px medium
Variantes:   success, error, warning, info, neutral
             Cada uno: bg-[status]-bg, text-[status]-text
```

### Data Tables
```
Header:      bg var(--q-table-header-bg), text var(--q-text-muted), 12px semibold uppercase
Filas:       bg var(--q-surface), border-bottom var(--q-border-light)
Hover:       bg var(--q-table-hover)
Texto:       13px regular, var(--q-text-body)
Montos:      text-right, font-medium
```

### Inputs
```
Default:     bg var(--q-input-bg), border 1px var(--q-input-border), radius-md
Focus:       border 2px var(--color-q-accent), ring 3px accent/15%
Error:       bg var(--color-q-error-bg), border 1px var(--color-q-error)
Disabled:    bg var(--q-surface-hover), text var(--q-text-disabled)
```

## 6. Dark/Light Mode Toggle

Estrategia: clase `.dark` en `<html>`.

```tsx
// lib/theme.ts
export function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

export function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.classList.add('dark');
  }
}
```

En el layout root:
```tsx
<script dangerouslySetInnerHTML={{ __html: `
  (function() {
    var t = localStorage.getItem('theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  })()
` }} />
```

## 7. Localización Argentina

```
Moneda:       $ 120.664,98 (punto miles, coma decimales)
Fechas:       DD/MM/AAAA HH:MM
Porcentajes:  87,3%
Voseo:        "Ingresá", "Creá", "Configurá"
```

## 8. Mockups de Referencia

Disponibles en Google Stitch:
- **Light Mode**: proyecto "Q Design System — qontabiliza — Light Mode"
- **Dark Mode**: proyecto "Q Design System — qontabiliza — Dark Mode"

Pantallas de referencia: Dashboard, Facturación (tabla), Nuevo Producto (form), Punto de Venta (layout especial).

## 9. Reglas de diseño premium

1. **NO usar pure black** (#000) — siempre navy tintados
2. **NO usar white puro** para texto en dark mode — máximo #F1F5F9
3. **NO usar drop shadows pesados** en dark mode — profundidad por capas de superficie
4. **NO usar bordes de alto contraste** — usar var(--q-border-light)
5. **Spacing generoso** — productos premium respiran
6. **Accent como acento único** — no saturar la UI con color
