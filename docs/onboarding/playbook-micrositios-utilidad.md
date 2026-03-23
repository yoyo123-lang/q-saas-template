# 🚀 Playbook: Cartera de Micrositios de Utilidad — Argentina

> **Tipo**: Playbook estratégico para usar con `guia_onboarding.md`
> **Cuándo usarlo**: Cuando el proyecto sea un sitio chico que resuelve un problema puntual para argentinos, usa datos públicos/APIs, y se monetiza con ads.
> **Cómo usarlo**: Claude te va a pedir que adjuntes este archivo cuando detecte que tu proyecto encaja. Pegalo en la conversación cuando te lo pida.

---

## Qué estamos haciendo

Construir **carteras de micrositios de utilidad** orientados al público argentino. Son sitios simples que resuelven UN problema específico de la vida cotidiana, usan datos públicos o APIs gratuitas, y se monetizan con publicidad (AdSense) + sponsors + donaciones.

La estrategia es: muchos sitios chicos interconectados que se potencian entre sí (SEO cruzado), en vez de un solo sitio grande.

---

## La metodología (paso a paso)

### PASO 1: Elegir la categoría/nicho

Ejemplos de categorías con alto potencial en Argentina:
- ✅ **Finanzas personales** (ya en desarrollo — dólar, sueldos, inflación, alquileres, impuestos, créditos, jubilaciones, servicios)
- 🔲 **Salud** (turnos, prepagas, medicamentos, farmacias de turno, calendario vacunación, obras sociales)
- 🔲 **Educación** (becas, inscripciones, calendario escolar, universidades, carreras, promedios)
- 🔲 **Automotor** (patentes, multas, VTV, seguros, precios autos usados, combustible, peajes)
- 🔲 **Hogar** (mudanzas, precios materiales construcción, expensas, servicios, reclamos)
- 🔲 **Trámites** (DNI, pasaporte, antecedentes, partidas, turnos, ANSES, AFIP/ARCA)
- 🔲 **Trabajo** (búsqueda empleo, CV, sueldos por rubro, convenios colectivos, indemnización)
- 🔲 **Clima/Agro** (pronóstico, precios granos, siembra, cosecha, estado rutas)
- 🔲 **Turismo interno** (precios vuelos, hoteles, feriados, destinos, rutas, peajes)
- 🔲 **Mascotas** (veterinarias de guardia, vacunación, precios alimento, adopción)

### PASO 2: Investigar competidores

Pedile a Claude que busque:

```
Buscá en Google los sitios argentinos más visitados en la categoría [CATEGORÍA]. 
Usá búsquedas como:
- site:.com.ar [tema principal]
- [tema] argentina calculadora/herramienta/gratis
- mejores sitios de [tema] argentina

Para cada competidor encontrá:
- Qué hace exactamente
- Cuánto tráfico tiene (buscá en SimilarWeb o Semrush)
- Cómo monetiza (ads, suscripción, sponsors)
- Qué le falta o hace mal
- Qué APIs o datos públicos usa
```

### PASO 3: Ingeniería inversa del líder del nicho

Elegir al sitio más exitoso de la categoría:

```
Hacé ingeniería inversa completa de [URL DEL SITIO]:
1. Quién lo hizo (buscar en LinkedIn, Twitter, About)
2. Con qué tecnología está hecho (ver código fuente, headers)
3. De dónde saca los datos (APIs, scraping, datos manuales)
4. Cómo monetiza (AdSense, sponsors, afiliados, API paga)
5. Qué páginas tiene y cómo estructura el contenido
6. Cuánto tráfico tiene y de dónde viene
7. Qué se podría mejorar o hacer diferente

Generá un informe en markdown con todo.
```

### PASO 4: Diseñar la cartera de 8-12 sitios

```
Con base en la investigación de competidores de [CATEGORÍA], diseñá una cartera 
de 8-12 micrositios interconectados para Argentina.

Para cada sitio necesito:
1. Nombre sugerido y dominio .com.ar
2. Qué problema resuelve (en una oración)
3. Funcionalidades principales (calculadoras, tablas, calendarios, comparadores)
4. De dónde saca los datos (APIs gratuitas con URLs exactas, datos públicos, scraping)
5. Keywords de SEO con alto volumen de búsqueda
6. Cómo se enlaza naturalmente con los otros sitios de la cartera
7. Estimación de dificultad (fácil/medio/difícil)
8. Estimación de tráfico potencial (bajo/medio/alto/explosivo)

Organizalos en 3 tiers:
- TIER 1: Los que se arman rápido con APIs gratis y generan tráfico inmediato
- TIER 2: Buenos pero necesitan más trabajo
- TIER 3: Ambiciosos, para cuando ya haya audiencia

Incluí una estrategia de cross-linking entre todos los sitios.
Incluí monetización (AdSense + sponsors potenciales del rubro).
```

### PASO 5: Verificar dominios disponibles

```
Buscá variantes de nombres de dominio creativos para estos sitios y verificá 
cuáles están libres en .com.ar y .ar. 

Usá búsquedas tipo:
- site:[dominio.com.ar]
- "[dominio.com.ar]" OR "[dominio.ar]"
- Verificá en rdap.nic.ar si es posible

Para cada sitio sugiere: dominio principal + dominio backup.
Priorizá nombres que sean:
- Cortos (máximo 3 palabras)
- Fáciles de recordar y escribir
- Que contengan la keyword principal
- Formato pregunta ('cuantocobro', 'cuantosale') o posesivo ('misueldo', 'mipatente')
```

### PASO 6: Generar los prompts para Claude Code

```
Para cada uno de los [N] sitios de la cartera, generá un prompt AUTOCONTENIDO 
que pueda pegar en una nueva conversación de Claude Code para que lo construya 
desde cero.

Cada prompt debe incluir:
1. DESCRIPCIÓN: Qué hace el sitio en 2 oraciones
2. STACK: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Recharts, Vercel
3. PÁGINAS: Estructura completa con rutas
4. APIS: URLs exactas, formato de respuesta, si necesita auth
5. FÓRMULAS: Si hay cálculos, las fórmulas exactas con ejemplos
6. DISEÑO: Paleta de colores, tipografía, tema visual (diferente para cada sitio)
7. SEO: Keywords principales con volumen estimado
8. CROSS-LINKS: A qué otros sitios de la cartera debe enlazar y en qué contexto
9. FASES: Ordenadas de MVP a versión completa
10. VARIABLES DE ENTORNO: Qué API keys necesita

IMPORTANTE: 
- Cada prompt debe funcionar de forma independiente (no asumir contexto previo)
- Incluir el CLAUDE.md completo dentro del prompt
- Usar solo APIs gratuitas o con tier gratuito generoso
- Priorizar APIs sin autenticación para el MVP
```

---

## Estrategia de monetización

### Ingresos por sitio:
1. **Google AdSense** — CPC varía por categoría:
   - Finanzas: $0.10-0.50/click (alto)
   - Salud: $0.05-0.30/click (medio-alto)
   - Educación: $0.03-0.15/click (medio)
   - Automotor: $0.05-0.25/click (medio-alto)

2. **Sponsors directos** — Contactar empresas del rubro cuando el sitio tenga tráfico
3. **API paga** — Si el sitio agrega valor sobre datos crudos, ofrecer API premium
4. **Afiliados** — Links a servicios relevantes (bancos, fintechs, seguros, etc.)
5. **Cafecito / donaciones** — Pedir colaboración voluntaria

### Objetivo de ingresos:
- Un sitio bien posicionado en una keyword argentina popular puede generar entre $50-500 USD/mes en AdSense
- Una cartera de 10 sitios interconectados: $500-5.000 USD/mes potencial

---

## Estrategia SEO cruzada

Cada sitio de la cartera debe enlazar naturalmente a los demás. Esto crea un efecto de red donde el posicionamiento de uno ayuda a todos.

```
Reglas:
- Los enlaces deben ser ÚTILES para el usuario, no spam
- Ubicarlos en el contenido, no solo en el footer
- Cada sitio enlaza al menos a 3 otros de la cartera
- Usar anchor text descriptivo y variado
```

---

## Criterios para elegir ideas de sitios

Antes de agregar un sitio a la cartera, debe cumplir al menos 4 de estos 6:

| # | Criterio | Pregunta clave |
|---|----------|----------------|
| 1 | **Datos gratuitos** | ¿Hay una API o fuente de datos pública y confiable? |
| 2 | **Demanda comprobable** | ¿La gente lo busca en Google? (verificar con Google Trends) |
| 3 | **Competencia baja-media** | ¿Los competidores son sitios viejos, feos, o incompletos? |
| 4 | **Tráfico recurrente** | ¿El usuario vuelve periódicamente? |
| 5 | **Picos de tráfico** | ¿Hay eventos que disparan búsquedas? (aumentos, vencimientos, cambios de ley) |
| 6 | **Cross-link natural** | ¿Se conecta lógicamente con otros sitios de la cartera? |

---

## Fuentes de datos recurrentes en Argentina

### APIs abiertas (sin auth)
- **DolarApi.com** — Cotizaciones del dólar (todas las variantes)
- **ArgentinaDatos** — Inflación, UVA, riesgo país, tasas, feriados, cotizaciones históricas
- **CriptoYa.com** — Precios cripto en exchanges argentinos
- **datos.gob.ar** — Portal de datos abiertos del gobierno (miles de datasets)
- **SEPA / Precios Claros** — Precios de supermercados (datos del gobierno)

### APIs con auth gratuita
- **BCRA API** — Variables económicas oficiales (token gratuito)
- **EstadísticasBCRA.com** — CER, Leliqs, Merval (100 consultas/día gratis)
- **CoinGecko** — Criptomonedas (API key gratuita)
- **ExchangeRate-API** — Cambio de monedas (1500 calls/mes gratis)
- **IOL InvertirOnline** — Bolsa argentina (25K calls/mes gratis)

### Datos de scraping potencial
- **ANSES** — Calendario de pagos
- **ARCA (ex AFIP)** — Vencimientos impositivos
- **INDEC** — Estadísticas nacionales
- **Ministerios varios** — Datos sectoriales

---

## Roadmap general de ejecución

```
SEMANA 1-2:  Investigación + diseño de cartera (con Claude chat)
SEMANA 2-3:  Verificación de dominios + registro
SEMANA 3-4:  Construcción de los 2 primeros sitios (con Claude Code)
SEMANA 5-6:  Construcción de 2 sitios más + SEO básico
MES 2:       3-4 sitios más + monetización (AdSense)
MES 3:       Completar cartera + optimización + primeros sponsors
MES 4+:      Mantenimiento + nueva categoría
```

---

## Cartera ya en desarrollo: FINANZAS PERSONALES

### Sitios definidos (12):
1. **CotizAR** — Cotizaciones dólar/cripto/monedas → `cotizahoy.com.ar`
2. **CalculáTuSueldo** — Sueldo neto, ganancias, monotributo → `sueldoneto.com.ar`
3. **InflaciónAR** — Calculadora de inflación + históricos → `inflacionhoy.com.ar`
4. **AlquilerAR** — Ajuste de alquileres (IPC, ICL, UVA) → `ajustealquiler.com.ar`
5. **VencimientosAR** — Calendario fiscal ARCA + ANSES → `misimpuestos.com.ar`
6. **ConvertidorAR** — Conversor de monedas + calculadora freelancer → `cuantopesos.com.ar`
7. **CréditoUVA** — Simulador hipotecario multi-banco → `creditouva.com.ar`
8. **JubilacionesAR** — Simulador jubilatorio + calendario cobro → `mijubilacion.com.ar`
9. **ServiciosAR** — Tarifas de luz, gas, nafta, prepaid → `cuantosale.com.ar`
10. **PatentesAR** — Calculadora patentes + multas → `mipatente.com.ar`
11. **PreciosSuper** — Comparador supermercados → `preciosuper.com.ar`
12. **CostoDeVida** — Comparador costo de vida por ciudad → `cuantonecesito.com.ar`

### Estado: Prompts individuales ya generados para Claude Code. Dominios verificados como probablemente disponibles.

---

## Cómo arrancar una nueva categoría

Si la guía de onboarding ya detectó que tu proyecto es de esta categoría, Claude va a seguir esta metodología automáticamente empezando por el Paso 1.

Si querés arrancar directo sin la guía de onboarding, pegá esto en una conversación nueva:

```
Estoy construyendo una cartera de micrositios de utilidad para Argentina. 
Ya tengo una cartera de finanzas personales en desarrollo (12 sitios).

Ahora quiero hacer lo mismo con la categoría: [NUEVA CATEGORÍA]

Mi metodología es:
1. Investigar los sitios argentinos más exitosos de esta categoría
2. Hacer ingeniería inversa del líder del nicho
3. Diseñar 8-12 micrositios interconectados que usen APIs y datos gratuitos
4. Verificar disponibilidad de dominios .com.ar
5. Generar prompts autocontenidos para construir cada sitio con Claude Code

Stack: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Recharts, 
deploy en Vercel. Monetización: AdSense + sponsors + Cafecito.

Empecemos por el paso 1: investigar competidores de [NUEVA CATEGORÍA] en Argentina.
```

---

## Notas estratégicas

- **Velocidad > Perfección.** Es mejor tener 10 sitios funcionales al 80% que 2 sitios perfectos. El tráfico se construye con presencia.
- **Los picos de tráfico son oro.** Cada vez que hay un aumento de nafta, sube impuestos, vence un plazo, o cambia una ley, miles de personas buscan herramientas. Tener el sitio listo para ese momento es la clave.
- **El cross-linking es el multiplicador.** Un sitio solo compite contra gigantes. 10 sitios interconectados se potencian mutuamente en SEO.
- **APIs argentinas gratuitas son el superpoder.** DolarApi, ArgentinaDatos, datos.gob.ar, BCRA — hay datos riquísimos que nadie explota bien todavía.
- **Cada sitio debe resolver UN problema de forma excelente.** No hacer "portales de todo". Mejor "cuantocobro.com.ar" que "finanzaspersonales.com.ar".
