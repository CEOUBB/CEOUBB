---
name: CEOUBB Design System
description: Campus académico con navegación clara, azul institucional para acciones y títulos Merriweather sobre una interfaz Manrope.
colors:
  primary: "oklch(0.48 0.18 255)"
  primary-active: "oklch(0.38 0.16 255)"
  navy: "oklch(0.24 0.09 255)"
  primary-wash: "rgba(0, 85, 184, 0.07)"
  canvas: "oklch(0.975 0.005 240)"
  canvas-soft: "oklch(0.975 0.005 240)"
  surface: "#ffffff"
  ink: "oklch(0.2 0.03 260)"
  ink-secondary: "oklch(0.36 0.03 255)"
  ink-muted: "oklch(0.48 0.03 250)"
  ink-faint: "oklch(0.52 0.03 250)"
  base-hairline: "oklch(0.92 0.006 60)"
  campus-hairline: "oklch(0.9 0.012 250)"
  control-border: "#64748b"
  rail-text: "oklch(0.36 0.03 255)"
  rail-hover: "oklch(0.975 0.005 240)"
  sky: "oklch(0.75 0.14 235)"
  gold: "oklch(0.75 0.16 75)"
  red: "oklch(0.55 0.22 25)"
  red-deep: "oklch(0.42 0.2 25)"
  emerald: "oklch(0.7 0.17 155)"
  emerald-deep: "oklch(0.5 0.12 160)"
  teal: "oklch(0.58 0.12 185)"
  purple: "oklch(0.62 0.22 300)"
  purple-deep: "oklch(0.35 0.2 300)"
  pink: "oklch(0.65 0.22 350)"
  bronze: "oklch(0.38 0.12 60)"
typography:
  page-title:
    fontFamily: 'Merriweather, "Iowan Old Style", Georgia, serif'
    fontSize: "clamp(27px, 2.6vw, 36px)"
    fontWeight: 700
    lineHeight: 1.22
    letterSpacing: "-0.035em"
  section-title:
    fontFamily: 'Merriweather, "Iowan Old Style", Georgia, serif'
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.35
  course-title:
    fontFamily: 'Merriweather, "Iowan Old Style", Georgia, serif'
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  page-description:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
  button:
    fontFamily: "Manrope, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  metadata:
    fontFamily: "Manrope, sans-serif"
    fontSize: "12px"
    lineHeight: 1.6
rounded:
  xs: "4px"
  sm: "5px"
  md: "8px"
  symbol: "10px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "28px"
  xxl: "32px"
  spacious: "48px"
  section: "64px"
components:
  app-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    height: "62px"
  sidebar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.rail-text}"
    width: "248px"
    padding: "24px 14px 18px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "10px 22px"
  button-primary-hover:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "10px 22px"
  course-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  header-search:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.md}"
  classroom-tabs:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "0 20px"
---

# Design System: CEOUBB

## Overview

**Creative North Star: "Campus académico"**

Navegación clara, documentos blancos y jerarquía académica contenida. Merriweather identifica títulos y asignaturas; Manrope organiza navegación, formularios y metadatos. Cursos y agenda ocupan el área de trabajo con acciones explícitas para entrar al aula y administrar la sección.

**Alcance y fuente:** `app/globals.css` conserva los tokens base; `app/mobile-shell.css`, el comportamiento móvil; `app/campus.css`, importado después de ambos, aplica el rediseño al portal autenticado y páginas de ayuda y políticas. El frontmatter registra el campus y los tokens base compartidos, distinguiendo `base-hairline` de `campus-hairline`. Las capturas revisadas cubren dashboard a 1440px y 390px, gestión docente, aula, recursos y contacto; el código final prevalece sobre capturas anteriores.

**Regla del acceso intacto.** El login conserva exactamente su composición, colores, tipografía y comportamiento. No trasladar el rediseño a selectores raíz ni al acceso. Las entradas a biblioteca pertenecen al campus; `public/biblioteca/` y las demás carpetas de biblioteca quedan fuera de este alcance.

**Key Characteristics:**

- Cabecera y navegación lateral blancas, selección azul tenue y superficies de borde fino.
- Controles rectangulares suaves y poco relieve.
- Identidad académica visible: asignatura, período y sección.
- Descargo de independencia conservado en el pie y las páginas de ayuda.

## Colors

### Primary

`primary` identifica acciones principales, enlaces y destinos activos; `primary-active` oscurece el hover y `primary-wash` marca selecciones claras. Los valores OKLCH son los del código, sin equivalencias hex aproximadas.

### Secondary

`navy` permanece en el panel de acceso a biblioteca en Recursos. El riel blanco combina `rail-text`, `rail-hover` y texto azul primario sobre `primary-wash` para la selección. El bloque de biblioteca del panel personal se retiró por petición del usuario.

### Neutral

`canvas` sostiene el área de trabajo; `surface`, tarjetas, cabecera y campos. El token base `--canvas-soft`, registrado como `canvas-soft`, resuelve mediante `--paper` al fondo claro compartido por el cuerpo, el panel de acceso y superficies secundarias; conserva su valor global. La escala `ink` ordena texto y metadatos. `campus-hairline` sustituye localmente `--border-hairline`; el acceso conserva `base-hairline`. `control-border` permanece disponible para controles con borde más marcado.

### Academic accents

Sky, gold, red, emerald, teal, purple, pink y bronze conservan categorías y estados existentes. El símbolo de curso consume `--course-tone`: mezcla 13% del tono con blanco para el fondo y 50% con la tinta principal para el icono. El color acompaña la identidad textual de sección.

## Typography

**Display Font:** Merriweather mediante `--font-display`, con respaldo Iowan Old Style y Georgia. **Body Font:** Manrope mediante `--font-core`. JetBrains Mono mediante `--font-mono` se reserva para identificadores y códigos. `app/layout.tsx` carga las tres familias.

El frontmatter recoge la escala reutilizada. El título de aula usa `clamp(28px, 2.8vw, 36px)` con interlínea 1.25; la ficha docente, 26px; los títulos de apoyo de agenda, 18px con interlínea 1.4. La marca de cabecera usa 18px y baja a 15px hasta 700px. La introducción de políticas usa 17px con interlínea 1.75 y baja a 16px hasta 700px.

**Regla de la firma académica.** Mantener Merriweather en títulos y nombres de asignatura al ajustar densidad. Fechas, notas, contadores y tablas usan `--num: lining-nums tabular-nums` o `.num`.

El acceso conserva su escala independiente: marca `clamp(2rem, 4.6vw, 6rem)`, peso 600 con énfasis 700, interlínea 0.98; título de login `clamp(1.8rem, 3.1vw, 2.45rem)`, peso 700, interlínea 1.06. Estas medidas no son títulos del campus.

## Layout

Cabecera de mínimo 62px más `--safe-top`; riel de 248px que puede cerrarse. El contenido tiene máximo local de 1440px y padding horizontal `clamp(24px, 3.2vw, 52px)`. Portal y aula comienzan a 36px bajo la cabecera. La escala base de espacio permanece intacta; el campus también usa separaciones intermedias de 20px.

| Umbral       | Comportamiento construido                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Desde 901px  | Navegación lateral dentro de la cuadrícula.                                                                                     |
| Hasta 1200px | Agenda de 270px, separación de 24px y cursos en una columna; selector docente de 190px.                                         |
| Hasta 900px  | Riel superpuesto de 284px, limitado a 84vw; gestión docente en una columna.                                                     |
| Hasta 767px  | El shell móvil oculta riel y menú y muestra navegación inferior de 58px más área segura. Reserva ese espacio bajo el contenido. |
| Hasta 700px  | Cursos antes de agenda, una columna; padding local de contenedor y tarjetas de 20px; comienzo del contenido a 24px.             |

En escritorio amplio, el dashboard usa agenda de 300px y separación de 32px. Los cursos usan `auto-fit` con mínimo de 270px y separación de 20px. Gestión docente combina selector de 228px y formulario. Las pestañas de aula permiten desplazamiento horizontal. Algunas reglas móviles heredadas fijan padding de 16px directamente en la vista; el token local de 20px no es universal.

Las políticas tienen máximo de 1040px, artículo con padding `clamp(24px, 4vw, 48px)`, texto limitado a 75ch e introducción de 66ch. Hasta 700px, exterior y artículo usan 16px y 20px de padding horizontal respectivamente.

## Elevation & Depth

Los bordes y la diferencia entre lienzo y superficie crean el relieve principal. El campus redefine `--shadow-1` como `0 2px 3px oklch(0.24 0.03 255 / 0.025), 0 8px 24px oklch(0.24 0.03 255 / 0.04)`. Las tarjetas de curso permanecen estables al pasar el cursor; su enlace de entrada se subraya y el foco interior marca el borde. Acciones principales y paneles docentes eliminan su sombra. Diálogos y riel superpuesto conservan `--shadow-2` global. La cabecera del campus es opaca y no usa backdrop blur.

## Shapes

Acciones y navegación redondean a 8px; símbolos de curso a 10px; tarjetas de curso, agenda, cabecera y pestañas de aula a 12px. La ficha docente conserva 16px. Bordes de 1px delimitan superficies. Las píldoras permanecen en avatares, indicadores y algunos controles públicos, incluido el envío de contacto; las acciones principales del campus usan rectángulos suaves.

## Components

**Navegación:** destinos laterales de mínimo 44px con icono y etiqueta. Cabecera con marca, contexto, búsqueda, notificaciones y cuenta; buscador de radio 8px y mínimo 38px. La navegación inferior combina icono, etiqueta y un fondo azul tenue detrás del icono seleccionado.

**Acciones y foco:** botones principales y secundarios de mínimo 44px, texto de 13px y peso 600. Primario azul; secundario blanco con borde fino. Conservan presión a `scale(0.985)`. Foco global de 2px en azul separado 2px; foco del riel de 2px en azul separado 3px. Los controles enfocados dentro del campus y políticas eliminan la transición.

**Cursos y agenda:** símbolo de 44px, código, nombre Merriweather, docente, sección, actividad y entrada al aula. Padding de 24px, reducido a 20px en móvil, sin portada gráfica vacía. La agenda muestra próxima evaluación o estado vacío con un único acceso contextual al calendario. No repite iconos de agenda ni un botón de calendario en la cabecera, y no contiene promoción de biblioteca.

**Gestión docente:** selector con puntos de color de 8px y estado activo explícito; ficha con título y una sola línea de contexto para período y sección. Pestañas de 48px, campos con etiquetas visibles y guardado al pie. Los formularios conservan sus controles nativos y variantes existentes.

**Aula:** cabecera blanca con breadcrumb, título, identidad y acciones. Cabecera y pestañas son superficies independientes con borde completo y radio 12px. Pestañas de mínimo 48px; publicaciones e información del ramo debajo. Las acciones docentes incluyen corrección, importación Moodle y nueva publicación según rol y estado.

**Calendario y comunicaciones:** cuadrícula de horario con desplazamiento acotado a `min(60dvh, 620px)` y región accesible por teclado, identificada como Horario semanal. Cabecera, franja de eventos y cuadrícula comparten `scrollbar-width: thin` y reserva estable para mantener alineadas sus columnas. Comunicaciones mantiene listado y conversación, y presenta un estado vacío sin un panel de conversación innecesario.

**Recursos y ayuda:** entrada a biblioteca, acceso móvil, índice y filas de enlaces de mínimo 84px con padding 18px. Contacto usa artículo de lectura y accesos directos de mínimo 44px, con el primero azul. El pie conserva ayuda, privacidad, términos, accesibilidad y descargo de independencia.

**Movimiento:** `--transition-base` local es `150ms ease-out`; las tarjetas transicionan solo borde y sombra durante 150ms. Botones heredan `--transition-fast` de 120ms con `cubic-bezier(0.2, 0, 0, 1)`. Movimiento reducido fija scroll automático y transiciones y animaciones a 0ms dentro del campus y sus páginas de políticas. Los componentes React animados deben respetar `useReducedMotion()`.

## Do's and Don'ts

- Mantener login y Merriweather intactos; aplicar el campus en su capa local.
- Conservar identidad de sección, estados reales y acciones con etiquetas claras.
- Usar tokens semánticos y Phosphor para interfaz; respetar marcas externas existentes en Recursos.
- Mantener foco visible, teclado, áreas seguras y movimiento reducido.
- Preservar independencia y distintivos de tiendas sin enlace hasta el acuerdo institucional.
- No modificar ni duplicar carpetas de biblioteca para extender este sistema.
- No introducir gradientes de texto, resplandores saturados, emojis decorativos ni `transition: all`.
- No convertir rótulos pequeños en mayúsculas de tablas o navegación en decoración encima de títulos.
- No afirmar conformidad WCAG AA o AAA por estas capturas o comprobaciones automáticas; la auditoría integral sigue pendiente.
