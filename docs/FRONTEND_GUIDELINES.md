# Reglas de Frontend, UX y Accesibilidad

> Aplicable sólo si el proyecto tiene interfaz web/móvil.

## 1) Sistema de diseño

- Definir librería base (ej. Material, Tailwind + design tokens, etc.).
- Centralizar tokens: color, spacing, tipografía, elevaciones.

## 2) Accesibilidad mínima

- Contraste AA como base.
- Navegación completa por teclado.
- `aria-label`/roles en componentes interactivos.
- Estados focus visibles.

## 3) Responsive

- Estrategia explícita: mobile-first o desktop-first.
- Breakpoints definidos y documentados.

## 4) Estados obligatorios en UI

- Loading,
- Empty,
- Error,
- Success.

Cada pantalla crítica debe implementar los cuatro estados.

## 5) Performance frontend

- Lazy loading de rutas pesadas.
- Optimización de imágenes y assets.
- Presupuesto de bundle por app/ruta.
- Evitar re-render innecesario en componentes base.
