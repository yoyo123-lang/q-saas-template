# Trabajo de diseño visual

> Skill para cuando se necesita crear o mejorar una pantalla/componente visual.
> Invocar con: `/project:diseño`
> El objetivo es producir un resultado visual de alta calidad con la menor cantidad de iteraciones.

## Paso 1: Obtener contexto visual

Antes de escribir una sola línea de código, preguntale al usuario:

1. **¿Tenés una captura o referencia visual de algo parecido a lo que querés?**
   (puede ser de otro sitio, de Dribbble, de una app, de un competidor, de otra pantalla del mismo proyecto)

2. **¿Cuál es la identidad visual de este proyecto?**

Si el proyecto ya tiene un brand manual o definiciones visuales, leé el archivo correspondiente.
Si no tiene, preguntá:
- Paleta de colores (al menos color primario y secundario, en hex)
- Tipografía (si tiene preferencia, o usar Inter como default)
- Estilo general en 2-3 palabras (ej: "limpio y profesional", "oscuro y moderno", "simple y funcional")

## Paso 2: Definir qué se va a construir

Preguntá (solo lo que no esté claro):

- **¿Qué información muestra esta pantalla?** (datos concretos, no abstracciones)
- **¿Qué acciones puede hacer el usuario?** (botones, filtros, formularios)
- **¿Tiene que funcionar en celular?** (asumir sí salvo que diga lo contrario)

## Paso 3: Describir antes de codear

Antes de implementar, describí en 3-5 oraciones qué vas a construir:

```
VOY A HACER:
- [Layout general: qué va arriba, qué va a la izquierda, qué va al centro]
- [Colores principales que voy a usar]
- [Componentes clave: tabla, cards, formulario, gráfico, etc.]
- [Comportamiento en celular: qué cambia]
```

Esperá el OK del usuario.

## Paso 4: Implementar

Al codear la pantalla, aplicar siempre:

### Estilo
- Usar la paleta del proyecto. Nunca hardcodear colores sin que estén en la config de Tailwind o en variables CSS.
- Tipografía consistente. Un solo font family salvo que haya razón para mezclar.
- Espaciado generoso. Es mejor que sobre espacio a que falte.
- Bordes redondeados consistentes (elegir un radio y mantenerlo).

### Estados obligatorios (de los roles de QA y Product)
Toda pantalla que muestre datos debe tener estos 4 estados implementados:
- **Loading**: indicador visible mientras cargan los datos
- **Empty**: mensaje claro cuando no hay datos ("No hay pagos registrados todavía")
- **Error**: mensaje entendible si algo falla ("No pudimos cargar los datos. Intentá de nuevo.")
- **Success**: los datos cargados correctamente

### Responsive
- Mobile-first siempre.
- Probar mentalmente: ¿esto se ve bien en 375px de ancho? ¿Y en 1440px?
- En celular, una columna. En desktop, puede ser más.
- Botones y links lo suficientemente grandes para tocar con el dedo (mínimo 44x44px).
- Texto legible sin hacer zoom (mínimo 16px para body).

### Accesibilidad básica
- Navegación por teclado (Tab funciona en orden lógico).
- Contraste suficiente (texto gris claro sobre blanco = malo).
- Alt text en imágenes informativas.
- Labels en todos los campos de formulario.

### SEO (si es un sitio público)
- Title tag descriptivo y único por página.
- Meta description útil.
- URLs legibles (no `/page/abc123`).
- Open Graph tags para compartir en redes.
- Sitemap.xml presente.

## Paso 5: Iterar

Después de la primera implementación:

1. Preguntale al usuario: "¿Esto se acerca a lo que querías? ¿Qué ajustarías?"
2. Aplicá los ajustes.
3. Normalmente en 2-3 rondas queda bien.

Si el usuario tiene una captura de referencia, comparar mentalmente el resultado con la referencia y señalar las diferencias antes de que el usuario las note.

---

## Paletas de proyectos conocidos

> Actualizar esta sección a medida que se definen nuevos proyectos.

### Qobra Pagos
- Primario: `#0F172A` (dark navy)
- Acento: `#2563EB` (electric blue)
- Tipografía: Inter
- Estilo: profesional, serio, fintech

### CETAE
- Primario: `#2D3436` (charcoal)
- Acento: `#E8563F` (coral)
- Estilo: educativo, moderno

### Micrositios de utilidad (default)
- Usar paleta limpia y neutra
- Acento que depende de la categoría (finanzas = azul/verde, salud = azul/blanco, automotor = gris/naranja)
- Priorizar velocidad de carga sobre efectos visuales
- Espacio prominente para AdSense sin molestar la experiencia

### Red de Medios IA
- Cada portal tiene su propia identidad
- Consultar el brand manual del portal específico si existe
- Default: limpio, tipo periódico digital, mucho espacio para contenido
