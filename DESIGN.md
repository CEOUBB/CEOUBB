---
name: CEOUBB Design System
description: Campus de separadores de archivador; escritorio gris frío, hojas blancas sin borde, Inter con tamaño óptico y azul UBB para acciones y estado.
colors:
  primary: "oklch(0.5 0.19 258)"
  primary-active: "oklch(0.43 0.17 258)"
  primary-wash: "oklch(0.5 0.19 258 / 0.08)"
  primary-tint: "oklch(0.5 0.19 258 / 0.13)"
  canvas-soft: "oklch(0.966 0.004 265)"
  surface: "#ffffff"
  ink: "oklch(0.21 0.006 265)"
  ink-secondary: "oklch(0.38 0.008 265)"
  ink-muted: "oklch(0.5 0.01 265)"
  ink-faint: "oklch(0.53 0.01 265)"
  hairline: "oklch(0.2 0.01 265 / 0.09)"
  control-border: "oklch(0.64 0.01 265)"
  fill-quiet: "oklch(0.2 0.01 265 / 0.05)"
  fill-quiet-strong: "oklch(0.2 0.01 265 / 0.09)"
  danger: "oklch(0.52 0.2 27)"
  danger-wash: "oklch(0.52 0.2 27 / 0.09)"
  state-ok: "oklch(0.42 0.11 155)"
  state-pending: "oklch(0.47 0.11 65)"
  tone-sky: "#38bdf8"
  tone-emerald: "#10b981"
  tone-gold: "#f59e0b"
  tone-red: "#e31b23"
  tone-teal: "#0d9488"
  tone-purple: "#8b5cf6"
typography:
  page-title:
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.026em"
    fontVariation: "opsz auto"
  section-title:
    fontFamily: "Inter, sans-serif"
    fontSize: "19px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  card-title:
    fontFamily: "Inter, sans-serif"
    fontSize: "18px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.018em"
  item-title:
    fontFamily: "Inter, sans-serif"
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-0.012em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  lead:
    fontFamily: "Inter, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  button:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    letterSpacing: "-0.005em"
  metadata:
    fontFamily: "Inter, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  tab-label:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 650
    letterSpacing: "0.02em"
    fontFeature: '"lnum", "pnum"'
rounded:
  xs: "5px"
  sm: "7px"
  md: "10px"
  lg: "14px"
  xl: "20px"
  full: "9999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  xxl: "28px"
  page: "32px"
  gutter: "36px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "40px"
  button-quiet:
    backgroundColor: "{colors.fill-quiet}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.sm}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  header-search:
    backgroundColor: "{colors.fill-quiet}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    height: "36px"
  side-item:
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.md}"
    padding: "7px 10px"
    height: "38px"
  side-item-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  course-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px 18px 6px"
  divider-tab:
    typography: "{typography.tab-label}"
    padding: "0 12px"
    height: "24px"
  classroom-top:
    rounded: "{rounded.xl}"
    padding: "24px 28px 22px"
  course-tabs:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "0 18px"
    height: "50px"
  agenda-sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  agenda-next:
    padding: "16px 16px 8px"
  agenda-later-row:
    rounded: "{rounded.md}"
    padding: "10px"
    height: "60px"
  pending-stack:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  pending-row:
    rounded: "{rounded.md}"
    padding: "10px"
    height: "60px"
  communications-row:
    rounded: "{rounded.md}"
    padding: "12px"
    height: "64px"
  conversation-sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    width: "clamp(340px, 38%, 440px)"
  message-bubble:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "9px 14px 10px"
  message-bubble-own:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "9px 14px 10px"
  message-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
    height: "42px"
  notification-row:
    rounded: "{rounded.md}"
    padding: "10px 12px 10px 6px"
    height: "60px"
---

# Design System: CEOUBB

## Overview

**Creative North Star: "Separadores de archivador"**

Cada sección del campus es un separador de archivador con su propio color. El escritorio es gris frío; sobre él descansan hojas blancas que se elevan con sombra en capas y sin bordes. El aula abierta es ese separador unido sin costura a su hoja: la pestaña con el código de la asignatura sobresale, la cabecera conserva el tinte del separador y la tira blanca de pestañas del aula cierra la pieza.

La densidad es de herramienta de trabajo: títulos de 32px, cuerpo de 14px, filas de 38 a 58px. Inter con eje óptico organiza todo el campus; el azul UBB queda reservado para acciones e indicadores de estado, y el color de sección nunca compite con él porque identifica, no ordena.

**Alcance y fuente:** `app/globals.css` declara los tokens en `:root:has(.app-shell, .policy-page, .public-page)`, de modo que el campus, las páginas públicas de ayuda y políticas, la página 404 y el error del sistema comparten el sistema, y los diálogos y hojas montados en `body` lo heredan. `app/campus.css` compone el campus; `app/campus-base.css` contiene la base de componentes que consume esos tokens y `app/mobile-shell.css` el comportamiento móvil. `app/layout.tsx` carga Inter con eje `opsz` y sin precarga. El código construido prevalece sobre las capturas en `.impeccable/review`.

**La Regla del Acceso Intacto.** La pantalla pública de acceso (login) conserva su propio sistema independiente con Merriweather para títulos y Manrope para la interfaz, sus tokens base de `app/globals.css` y su composición. Este rediseño no la toca: el acceso no monta `.app-shell`, `.policy-page` ni `.public-page`, así que ningún token de este documento lo alcanza.

**Key Characteristics:**

- Escritorio gris frío (`canvas-soft`) y hojas blancas sin borde con sombra en capas.
- Pestaña de separador en el tono de la sección sobre fichas de curso y cabecera de aula.
- El tono de sección es idéntico como pestaña, marca del riel, bloque de calendario y chip de publicación.
- Azul UBB sólo para acciones y estado; nunca como decoración ni como color de sección.
- Inter con tamaño óptico; cifras tabulares para datos y proporcionales para identificadores.

## Colors

Neutros fríos casi sin croma, un azul institucional para actuar y un conjunto acotado de tonos de sección que pertenecen a los datos, no a la interfaz.

### Primary

- **Azul UBB** (`primary`): botones principales, enlaces de acción ("Entrar al aula", "Ver calendario"), foco, cursor de texto y controles nativos mediante `accent-color`. `primary-active` oscurece el hover.
- **Velo azul** (`primary-wash`, `primary-tint`): selección clara en listas (día elegido del calendario, conversación abierta en Avisos y mensajes), campana abierta y hover de las acciones azules del panel de notificaciones. Las filas no leídas no se tiñen: el no leído es un punto.

### Secondary

- **Tonos de sección** (`tone-sky`, `tone-emerald`, `tone-gold`, `tone-red`, `tone-teal`, `tone-purple`): el color académico que el docente elige para la sección. Llega como `--course-tone` en línea y se deriva en tres mezclas OKLCH: `--tone-wash` (15% con blanco) para pestaña, portada y cabecera de aula; `--tone-wash-strong` (26%); `--tone-ink` (52% con tinta casi negra) para texto e iconos sobre el tinte. El indicador de pestaña activa del aula y la marca del riel usan el tono puro.

### Neutral

- **Escritorio gris frío** (`canvas-soft`): fondo de cabecera, riel y área de trabajo. En el campus `--paper` se redefine con este valor y `--canvas-soft` lo hereda; fuera del campus conserva su valor global.
- **Hoja** (`surface`): fichas, paneles, listas, diálogos, campos y la tira de pestañas del aula.
- **Tinta** (`ink`, `ink-secondary`, `ink-muted`, `ink-faint`): título y cuerpo, texto secundario, metadatos, separadores tipográficos y marcadores de posición.
- **Rellenos tranquilos** (`fill-quiet`, `fill-quiet-strong`): buscador de cabecera, filtro de cursos, botones discretos, hover de filas y fondo del conmutador de vista.
- **Línea fina** (`hairline`): sombra de 0.5px bajo la cabecera y sobre la navegación inferior; anillo de 0.5px dentro de las sombras de hoja. `control-border` delimita campos nativos.
- **Peligro** (`danger`, `danger-wash`): eliminar, urgencia de evaluaciones de hoy o próximas, contador de notificaciones de la cabecera y avisos de error en Avisos y mensajes.
- **Estado escrito** (`state-ok`, `state-pending`): verde y ámbar oscuros, sólo como color de texto o de icono, nunca como fondo. `state-ok` marca lo correcto, abierto o al día (el icono de "Todo al día"); `state-pending` marca lo pendiente ("Por responder" en el directorio del docente, el contador de caracteres del compositor). Se escriben como valores literales en `app/campus-base.css`, no como propiedades personalizadas.

### Named Rules

**La Regla del Azul que Actúa.** El azul aparece sólo donde hay una acción o un estado: botón, enlace, foco, selección, día de hoy, no leído. Si un elemento azul no se puede pulsar ni comunica estado, es un error.

**La Regla del Tono Único.** Una sección tiene un solo tono y se ve igual en la pestaña de su ficha, en la marca del riel, en el bloque del calendario, en la cabecera del aula y en el chip de publicación. No introducir variaciones por superficie.

## Typography

**Display Font:** Inter mediante `--font-inter`, con respaldo -apple-system, BlinkMacSystemFont, Segoe UI y Roboto. `--font-display` apunta a la misma familia dentro del campus.
**Body Font:** Inter, la misma familia, con `font-optical-sizing: auto`.

**Character:** una sola familia que cambia de carácter con el tamaño gracias al eje óptico: compacta y firme en los títulos, abierta y legible en el texto de 13 y 14px. Los títulos llevan tracking negativo; los pesos intermedios (550, 650) separan jerarquías sin saltos bruscos.

### Hierarchy

- **Page title** (700, 32px, 1.15): "Mis cursos", títulos de página y nombre de la asignatura en el aula. Baja a 28px hasta 700px.
- **Section title** (650, 19px, 1.3): encabezados de bloque del dashboard, columnas del aula y grupos de recursos.
- **Card title** (650, 18px, 1.3): nombre del curso en la ficha y título de la próxima evaluación.
- **Item title** (650, 16px, 1.4): publicaciones.
- **Lead** (400, 15px, 1.5): descripción bajo el título de página, máximo 72ch.
- **Body** (400, 14px, 1.5): navegación, docente, filas y formularios.
- **Metadata** (400, 13px, 1.45): sección, período, actividad, breadcrumb.
- **Tab label** (650, 12px, tracking 0.02em): código de asignatura en la pestaña del separador.

### Named Rules

**La Regla de las Dos Cifras.** Fechas, notas, contadores, horas y tablas usan `--num` (`lining-nums tabular-nums`) o `.num`. Los identificadores (código de asignatura, número de sección, período en el encabezado, campos de fecha) usan `lining-nums proportional-nums`: se leen como nombres, no como columnas.

**La Regla de la Fecha de Calendario.** Las únicas mayúsculas del campus son las abreviaturas de día y mes que forman una fecha: las hojas de fecha de la agenda del dashboard (11px y 10.5px), y en el calendario la cabecera de días de la cuadrícula horaria, el encabezado de días del mes, la tira semanal del teléfono y las hojas de fecha de la agenda (11px, peso 600, tracking 0.04em; 10px con tracking 0.02em en la semana compacta del teléfono). El mes mínimo usa iniciales de una letra (L, M, X, J, V, S, D) a 11px sin tracking. Siempre acompañan a un número de día; son el formato de una hoja de calendario, no rótulos sobre títulos.

**La Regla de la Escala Local del Calendario.** El calendario usa tamaños fuera de la jerarquía del campus y los mantiene dentro de `.planner`: 11px para zona horaria, horas del canal, abreviaturas, "más" y título mínimo de bloque; 10px para la píldora de la hora actual y, en la semana compacta del teléfono, para zona, horas y abreviaturas; 11.5, 12.5 y 13.5px para chips, detalles de bloque y controles; el título del rango a 19px peso 650 con tracking -0.018em en escritorio y 21px peso 700 en el teléfono; cifras de fecha de 22px (agenda), 19px (cabecera de la cuadrícula y agenda del teléfono), 17px (tira semanal), 15px (semana y mes del teléfono), 13px (mes) y 12.5px (mes mínimo). Es una excepción local registrada, no una ampliación de la escala: no extender estos valores a otras superficies.

## Layout

Cabecera de 56px más área segura; riel de 256px a la izquierda, sobre el mismo gris que el escritorio y sin línea divisoria. El contenido tiene un máximo de 1360px con padding horizontal `clamp(20px, 3vw, 44px)`. Portal y aula comienzan 32px bajo la cabecera; los bloques del portal se separan 28px.

El dashboard combina cursos y una columna de agenda de 320px con separación de 36px. Las fichas usan `auto-fill` con mínimo de 264px, separación de 20px entre columnas y 34px entre filas para dejar sitio a la pestaña que sobresale. La agenda es una sola hoja: la próxima evaluación es su cabecera y las siguientes, sus filas.

| Umbral       | Comportamiento construido                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Hasta 1200px | Agenda de 288px y separación de 28px; lista de secciones de Administrar ramos de 208px.                                     |
| Hasta 900px  | El riel pasa a superponerse con sombra de diálogo; dashboard y Administrar ramos en una columna.                            |
| Hasta 767px  | El shell móvil oculta el riel y muestra navegación inferior de 58px más área segura.                                        |
| Hasta 700px  | Padding de contenedor de 16px, comienzo a 20px, títulos de 28px, cabecera de aula y pestañas con radio `lg` en vez de `xl`. |

Desde 768px la cabecera es translúcida sobre el escritorio (`saturate(180%) blur(20px)`); por debajo es opaca. En las vistas de día y semana el calendario fija la altura de su zona de trabajo en `clamp(520px, calc(100dvh - var(--header-offset) - 210px), 1040px)` y desplaza las horas dentro de su hoja con barras finas; en el teléfono la altura es `max(380px, …)` descontando cabecera, navegación inferior, área segura y la barra propia. La columna lateral del calendario (272px) desaparece cuando el contenedor `planner` mide menos de 880px.

## Elevation & Depth

La profundidad viene de la diferencia entre escritorio y hoja más una sombra en capas que incluye un anillo de 0.5px en lugar de borde. Toda superficie elevada pierde el borde y gana `--shadow-1`; popovers, paleta de comandos y diálogos suben a `--shadow-2`. Las fichas de curso usan `drop-shadow` en lugar de `box-shadow` para que la sombra siga el contorno de la pestaña que sobresale.

### Shadow Vocabulary

- **Hoja** (`0 0 0 0.5px oklch(0.2 0.01 265 / 0.09), 0 1px 2px oklch(0.2 0.01 265 / 0.06), 0 6px 16px -6px oklch(0.2 0.01 265 / 0.12)`): paneles, listas, publicaciones, tablas y el destino activo del riel.
- **Hoja levantada** (`0 0 0 0.5px oklch(0.2 0.01 265 / 0.09), 0 2px 4px oklch(0.2 0.01 265 / 0.05), 0 10px 24px -6px oklch(0.2 0.01 265 / 0.12)`): hover de botones secundarios y del menú de importación; en reposo, la columna de conversación de escritorio y el botón circular que baja al último mensaje.
- **Flotante** (`0 0 0 0.5px oklch(0.2 0.01 265 / 0.1), 0 6px 14px oklch(0.2 0.01 265 / 0.07), 0 24px 56px -12px oklch(0.2 0.01 265 / 0.24)`): popovers, paleta, diálogos y riel superpuesto.
- **Control** (`0 0 0 0.5px oklch(0.2 0.01 265 / 0.16), 0 1px 1.5px oklch(0.2 0.01 265 / 0.08)`): botón secundario, tecla del buscador, opción elegida del conmutador.
- **Separador** (`drop-shadow(0 0 0.5px oklch(0.2 0.01 265 / 0.24)) drop-shadow(0 4px 8px oklch(0.2 0.01 265 / 0.08))`, en hover `0 10px 18px` a 0.11): ficha de curso con su pestaña y pila de sección en Avisos y mensajes.
- **Burbuja** (`0 0 0 0.5px var(--hairline), 0 1px 1.5px oklch(0.2 0.01 265 / 0.06)`): burbuja entrante de un mensaje sobre el escritorio; la burbuja propia, azul, no lleva sombra.
- **Foco de campo** (`0 0 0 4px oklch(0.5 0.19 258 / 0.22)`): halo azul de campos enfocados junto con el borde azul.

### Named Rules

**La Regla de la Hoja sin Borde.** Una superficie elevada nunca lleva borde visible; su límite es el anillo de 0.5px de la sombra. Los únicos bordes son los de campos nativos (incluida la línea inferior de 1.5px del título en la creación rápida), el borde tonal de 1px de los bloques del calendario y de su copia al moverlos, el anillo de 1.5px del marcador de bloque hecho y el borde izquierdo de 1px en línea fina de cada columna de día de la cuadrícula horaria. La retícula del mes y las líneas de hora se dibujan con sombras interiores y gradientes, no con bordes.

**La Regla sin Divisores.** Ni cabecera, ni riel, ni pie, ni filas de lista usan líneas divisorias; la separación se logra con espacio, con la diferencia entre escritorio y hoja o con la sombra de 0.5px de la cabecera.

## Shapes

Rectángulos suaves en escala corta: 5px para teclas y detalles, 7px para botones discretos, 10px para acciones, campos y destinos del riel, 14px para hojas y fichas, 20px para diálogos, la ficha abierta de Administrar ramos y el conjunto del aula. El círculo completo queda para avatares, el día de hoy y los saltos del índice de recursos.

La silueta propia del sistema es el separador: la ficha de curso tiene la esquina superior izquierda recta porque de ella nace la pestaña (radio superior de 9px; 10px en el aula), y un remate cóncavo de 10 a 12px hecho con un gradiente radial la funde con el borde superior. La pila de cada sección en Avisos y mensajes repite la pestaña de 24px con el mismo radio de 9px y el mismo remate. La misma forma, en 16 por 12px, es la marca de sección en el riel y, en 12 por 9px, la marca de cada sección en la lista de Administrar ramos. Las muestras del selector de identidad visual repiten la forma en 16 por 12px. En el calendario la marca de sección es un rectángulo de 16 por 12px en el tono puro con radio `4px 4px 2px 2px` y una base interior más clara de 4px; es la única medida de radio del calendario fuera de los tokens, junto con los extremos de 16px de la banda de semana del mes mínimo. Lo demás usa tokens: `sm` para bloques y opciones del conmutador, `md` para controles, `lg` para hojas y popovers, `xl` para el botón flotante y las hojas inferiores del teléfono. Los mensajes son burbujas `xl` con la esquina de la cola en `xs`: abajo a la izquierda en las entrantes y abajo a la derecha en las propias; cada burbuja siguiente de una tanda cierra también la esquina superior de su lado, de modo que la tanda se lee como una sola columna. El compositor es una píldora `xl` y enviar, un círculo de 42px.

## Components

### Buttons

- **Shape:** rectángulo suave (10px), 40px de alto, 44px con puntero grueso.
- **Primary:** azul UBB con texto blanco, padding horizontal de 18px, sombra corta azulada e inserto de luz de 0.5px; hover a `primary-active`.
- **Secondary:** hoja blanca con sombra de control; en hover sube a hoja levantada sin cambiar de color.
- **Quiet:** relleno tranquilo con texto secundario y radio de 7px para paginación, filtros y acciones de contenido; la acción de eliminar es transparente en `danger` y se separa 24px de las demás.
- **Press:** `scale(0.97)` con transición de 0ms; deshabilitado a opacidad 0.45. Las transiciones nombran propiedades concretas (fondo, sombra, color, transformación) con 140ms `cubic-bezier(0.22, 1, 0.36, 1)`.

### Cards / Containers

- **Corner Style:** 14px.
- **Background:** hoja blanca sobre escritorio gris.
- **Shadow Strategy:** hoja; flotante para lo que se superpone (ver Elevation & Depth).
- **Border:** ninguno.
- **Internal Padding:** 20 a 22px en publicaciones, 18px en la próxima evaluación, 28px en estados vacíos del aula.

### Inputs / Fields

- **Style:** borde de 1px en `control-border`, fondo blanco, radio de 10px; el hover oscurece el borde.
- **Focus:** borde azul y halo de 4px; los controles enfocados no animan. El filtro de cursos y el buscador de cabecera son rellenos tranquilos sin borde que pasan a hoja con halo al enfocarse.

### Navigation

- **Riel:** destinos de 38px, 14px peso 500, iconos de 22px en tinta tenue. El destino activo es una hoja blanca con sombra de hoja, peso 600 e icono azul. Los cursos del riel sustituyen el icono por la marca de separador en su tono.
- **Cabecera:** marca de 15px peso 650, contexto, buscador de 36px, notificaciones y cuenta con hover de relleno tranquilo.
- **Móvil:** navegación inferior de 58px más área segura; el destino activo es azul con un velo azul tras el icono.

### Course Card (signature)

Separador de archivador: pestaña de 24px con el código de asignatura en `tab-label` y cifras proporcionales; franja de portada de 52px en `--tone-wash` reservada para la portada docente; cuerpo con nombre en `card-title`, docente, sección y período en metadatos, actividad y próxima fecha en cifras tabulares; acción "Entrar al aula" azul a todo el ancho con flecha. El hover sólo profundiza la sombra.

### Classroom Divider (signature)

La cabecera del aula es el separador abierto: hoja en `--tone-wash` con radio de 20px sólo en la esquina superior derecha, pestaña de 26px con el código sobresaliendo arriba a la izquierda, breadcrumb e identidad en `--tone-ink`, título de 32px. Debajo, sin espacio, la tira blanca de pestañas del aula con radio inferior de 20px; pestañas de 50px y un indicador de 3px en el tono puro de la sección bajo la activa, cuyo icono toma `--tone-ink`.

### Administrar ramos

Es el archivador abierto del docente. La lista de secciones descansa sobre el escritorio como el riel: filas de 56px con la marca de separador en el tono de la sección, y la elegida como hoja blanca con sombra de hoja. La ficha del ramo repite el separador del aula: pestaña con el código, cabecera en `--tone-wash` con el nombre en 26px y período y sección en `--tone-ink`, y debajo, en la misma hoja, pestañas de 50px con el indicador de 3px en el tono puro. El formulario de creación es un separador nuevo cuya pestaña muestra en vivo el código escrito (o "Nuevo ramo") y cuyo tinte sigue el color elegido. La identidad visual se elige con seis muestras de color sobre relleno tranquilo; la elegida pasa a hoja de control con un anillo interior en su tono. Los campos usan una rejilla de seis columnas (tercio, dos tercios o fila completa) que en teléfonos pasa a una sola columna.

### Agenda

Una sola hoja con dos columnas que se alinean de arriba abajo: fecha (48px) y texto, a 14px. La cabecera es la próxima evaluación en `--tone-wash` de su sección, como el separador del aula: una hoja de fecha blanca con sombra de control (día y mes a 11px en mayúsculas, el día de la semana en `--tone-ink`, número de 24px peso 700), el título en `card-title` sin recortar, el ramo y la ponderación ("40% de la nota") a 13px peso 550 en `--tone-ink`, y al pie la cuenta regresiva a 13px (`danger` si es hoy o pronto) frente a "Ir al ramo" en azul. Toda la cabecera abre el ramo: el botón se extiende sobre ella, el hover profundiza el tinte y el foco la rodea con un anillo azul de 2px. Debajo, las siguientes son filas de 60px como mínimo con 6px de margen dentro de la hoja: fecha compacta (día de la semana a 10.5px, número de 19px), título de 14.5px peso 600 hasta tres líneas, ramo con su marca de separador de 12 por 9px y ponderación a 12.5px, y la cuenta regresiva a la derecha. El título y la ponderación vienen separados en los datos (`title`, `weight`); ramo y ponderación se separan con un punto que, si la ponderación baja de renglón, queda recortado en vez de colgar. Sin evaluaciones, la hoja "Espacio para organizarte" del mismo patrón que "Todo al día", con el icono en `state-ok`.

### Páginas públicas y estados del sistema

Ayuda, contacto, preguntas frecuentes y políticas son documentos de lectura: cabecera con la marca y "Volver al portal" como botón secundario, y una hoja de 48 por 56px de padding con títulos de 34px, párrafos de 16px con interlineado 1.65 y medida de 68ch. El índice de cláusulas es una rejilla tranquila sobre el escritorio con destinos de 32px. La página 404 y el error del sistema usan la misma silueta de separador: una hoja con la pestaña "Error 404" o "Error del sistema", título de 30px y dos acciones, la principal en azul.

### Estados como texto

Rol, estado de período, estado de corrección, tipo de recurso, tramo de beneficio y suma de ponderaciones se escriben como texto de 12.5 a 13px: neutro para lo descriptivo, verde (`state-ok`) para lo correcto, abierto o al día, ámbar (`state-pending`) para lo pendiente, como "Por responder", y `danger` para lo vencido. No se dibujan como píldoras. Las acciones de contenido ("Modificar", "Eliminar") quedan visibles en cada publicación; "Eliminar" se separa 24px, va en `danger` y siempre pide confirmación en línea.

### Calendar

**Agenda y línea de tiempo.** La cabecera de página lleva "Calendario", un resumen de una línea del período visible y "Nuevo bloque". Debajo, una barra de una sola línea: "Hoy", flechas de período, el título del rango (que abre el selector de fecha) y el conmutador de vista. A la izquierda, una columna de 272px sobre el escritorio, como el riel, con el mes mínimo, "Lo que viene" y "Ramos"; a la derecha, la hoja de la vista. "Lo que viene" es una hoja con las evaluaciones y entregas de los próximos 28 días (máximo 8): marca de separador, título, ramo, cuenta regresiva en `danger` si es hoy o pronto y la acción "Planificar estudio", que en escritorio aparece al pasar o enfocar la fila. "Ramos" filtra por sección en filas de 34px; un ramo oculto pasa a tinta tenue y su marca queda como contorno de 1.5px en su tono. La columna se pliega a mano, la elección se guarda en el dispositivo y desaparece sola cuando el contenedor `planner` mide menos de 880px.

**Vistas.** Día, semana, mes y una agenda continua de cuatro semanas; la vista elegida se guarda en el dispositivo. El conmutador es un relleno tranquilo fuerte con la opción elegida como hoja de control.

**Cuadrícula horaria.** De 08:00 a 21:00, filas de 48px y canal de horas de 58px. Las horas y las medias horas, más tenues, se dibujan con gradientes en `--planner-line` (tinta al 7.5%). La cabecera de días y la franja de entregas quedan fijas dentro del desplazamiento: evaluaciones y entregas son chips de 24px en `--tone-wash` (`--tone-wash-strong` para evaluaciones), nunca bloques entre las horas, y la franja se pliega. Hoy lleva su número en un círculo azul de 34px y un velo azul tenue en la columna; los fines de semana, un gris aún más tenue. La hora actual es una línea `danger` de 2px con un punto de 10px, por debajo de los bloques, y una píldora `danger` con la hora en el canal. La parte transcurrida de hoy queda bajo un velo del escritorio al 60%. Una hora libre muestra velo azul y un signo más al pasar o enfocar.

**Bloques.** Superficie tonal plana: `--course-tone` al 13% con blanco, borde de 1px al 26% y radio `sm`, sin franja lateral, sombra ni pulso. El bloque en curso sube al 20% con borde al 44%. Un marcador circular de 14px (18px con puntero grueso) con anillo de 1.5px marca el bloque como hecho, que baja a opacidad 0.55 con el título tachado. El contenido responde a consultas de contenedor por alto (una sola línea bajo 34px, título en dos líneas desde 44px, segundo detalle desde 72px, cuatro líneas desde 96px) y por ancho (sin hora de término bajo 86px, sin eliminar bajo 72px, sin hora ni detalle bajo 52px, sin marcador y con título de 11px bajo 44px). Al crear, la vista previa es azul UBB con hoja levantada; al mover o redimensionar, una copia tonal con borde al 52% y sombra flotante, mientras el original queda a opacidad 0.35. El borde inferior redimensiona; con puntero grueso el asa mide 14px y queda siempre visible, y el área táctil de eliminar crece a 44px; eliminar siempre pide confirmación.

**Mes.** Hoja con retícula interna de línea fina hecha con sombras interiores; celdas de 118px como mínimo y fines de semana con un 40% de escritorio. El día elegido lleva `primary-wash` y un anillo interior de 1.5px de `primary` al 55%; el número de hoy es un círculo azul de 26px. Evaluaciones y entregas son filas de 20px en `--tone-wash`; los bloques, un punto de 6px en su tono. Bajo el mes, la lista del día elegido.

**Agenda.** Una sola hoja con los días de cuatro semanas: hoja de fecha de 52px con la abreviatura en mayúsculas y el número de 22px, en azul si es hoy; un día sin actividad se escribe en tinta tenue.

**Popovers.** Creación rápida (344px), detalle académico (328px), selector de fecha (300px) y atajos (288px) usan la capa superior nativa: hoja con radio `lg` y sombra flotante, sin fondo que bloquee. La creación rápida abre junto al rango elegido; el detalle académico ofrece "Ir al aula" y "Planificar estudio".

**Teléfono.** Hasta 767px el `h1` queda oculto a la vista y el resumen desaparece; el título del rango pasa a barra de aplicación (21px, peso 700) al frente de la barra y el conmutador ocupa su propia fila. "Nuevo bloque" se convierte en un botón flotante de 56px con radio `xl` y sombra azulada sobre la navegación inferior. La vista de día suma una tira semanal (abreviatura de 11px, número de 17px en círculo de 38px y puntos de 5px por ramo; el día elegido en `primary-tint`, hoy en azul pleno) y oculta la cabecera de la cuadrícula, porque la tira ya nombra el día. Las filas miden 54px y el canal 46px; la semana compacta baja el canal a 38px, usa 10px en zona, horas y abreviaturas y reduce los chips al icono. En el mes las celdas miden 54px, los eventos pasan a puntos de 5px y la selección pasa al número. Los popovers se vuelven hojas inferiores a todo el ancho, de 88dvh como máximo, con radio `xl` arriba, agarradera de 36 por 4px y fondo oscurecido al 32%; sus acciones crecen a 44px. Crear un bloque abre directamente el diálogo completo.

**Controles.** `--planner-control` mide 36px con puntero fino y 44px con puntero grueso (Hoy, flechas, rango y conmutador); los días del mes mínimo pasan de 32 a 40px.

**Movimiento.** Sólo donde explica un cambio: el indicador del conmutador se desliza con resorte 340/28; el período nuevo entra 30px desde el lado hacia el que se avanzó (240ms, `--ease-out-quint`) mientras el canal de horas queda quieto; el gesto horizontal sigue al dedo y se asienta en 220ms; los bloques entran desde `scale(0.96)` en 180ms y salen a `scale(0.97)` en 120ms; la marca de hecho aparece con resorte 620/26; los popovers suben 6px desde `scale(0.98)` y las hojas del teléfono 32px, ambos con `@starting-style`; el velo transcurrido avanza en 600ms. Con movimiento reducido los bloques y la marca cambian sin transición, el `MotionConfig` del portal anula los resortes y el campus fija transiciones y animaciones a 0ms.

**Carga.** `CalendarSkeleton` monta la cabecera, la barra, el mes mínimo y la lista de ramos reales en la vista y el panel guardados en el dispositivo; sólo "Lo que viene" y los bloques son huesos.

### Avisos y mensajes

**Estructura.** Cabecera de página con un resumen de una línea y, si hay pendientes, "Marcar todo como leído" como botón secundario de 36px. Debajo, dos bloques separados 36px (32px en el teléfono): "Sin leer" y "Historial", en `section-title`; la cuenta de "Sin leer" va a 15px peso 600 en tinta tenue y en cifras tabulares.

**Banda sin leer.** Cada sección con novedades es un separador apilado: hoja blanca con la esquina superior izquierda recta, sombra de separador y la pestaña de 24px con el código. La cabecera de 50px en `--tone-wash` lleva el nombre (15px, 650, una línea), "N nuevos" (13px, 550) y la acción de marcar la sección como leída (36px; 44px con puntero grueso), todo en `--tone-ink`. Las filas miden 60px (68px en el teléfono): marca, título de 15px peso 600 y detalle de 13px a dos líneas como máximo, y la hora de 12.5px a la derecha. Se ve la primera novedad; detrás asoman una hoja de 7px con sangría de 16px (escritorio al 45%) y, con dos o más ocultas, otra de 6px con sangría de 32px (escritorio al 80%). "Ver N más" despliega hasta cuatro y el resto se cuenta en una línea de 12.5px. Las pilas forman una rejilla `auto-fill` de 300px como mínimo con 46px entre filas, para la pestaña, y 20px entre columnas; una columna en el teléfono. Sin pendientes, una hoja "Todo al día" con el icono en `state-ok`.

**Historial.** Un conmutador "Todo", "Avisos", "Mensajes" en relleno tranquilo fuerte de 36px (40px y a todo el ancho en el teléfono) con la opción elegida como hoja de control. "Todo" y "Avisos" listan sólo lo ya leído: lo nuevo vive en la banda. Van en una sola hoja agrupados por día, con rótulos de 12.5px peso 600 en tinta tenue ("Hoy", "Ayer" o el día con fecha larga) que quedan fijos bajo la cabecera al desplazar. "Mensajes" es el directorio: buscador de 40px en relleno tranquilo y la lista completa de conversaciones. Las filas miden 64px (68px en el teléfono): marca de 36px, título de 15px peso 500, vista previa de 14px y metadatos de 13px, con la hora relativa a la derecha ("Ahora", "Hace N min", la hora, "Ayer", el día de la semana o la fecha corta). Una conversación sin leer sube el título a 650 y la vista previa a tinta plena; la abierta lleva `primary-wash`. La marca va en `--tone-wash` con su contenido en `--tone-ink`: un cuadrado `md` con el icono del tipo de publicación para los avisos y un círculo con las iniciales para las conversaciones.

**La Regla del Punto Donde Cabe.** La columna inicial de 10px con el punto azul de 9px existe sólo donde una fila puede estar sin leer: el directorio de conversaciones y la campana. Las filas del historial de avisos, que siempre están leídas, no reservan esa columna. El punto lleva nombre accesible ("Sin leer", "No leído").

**Conversación.** Desde 768px la rejilla abre una segunda columna de `clamp(340px, 38%, 440px)` a 24px del historial: una hoja fija bajo la cabecera, con radio `xl`, sombra de hoja levantada y alto `min(100dvh - cabecera - 48px, 900px)`. Su cabecera de 68px va en `--tone-wash`: marca de 38px sobre blanco, título de 16px peso 650 y contexto de 12.5px, en `--tone-ink`. El historial es escritorio (`--paper`), y sobre él las entrantes son hojas blancas con sombra de burbuja y las propias, azul UBB con texto blanco y selección invertida; texto de 15px con interlineado 1.45. Los mensajes del mismo autor con menos de 10 minutos entre sí forman una tanda (82% de ancho, 86% en el teléfono; 3px entre burbujas y 14px entre tandas), y la tanda ajena lleva el nombre del autor a 12px peso 600. Cada día abre con un separador fijo centrado (12px, 600, sobre una píldora del color del escritorio) y "Mensajes nuevos" (12px, 650, azul) precede al primer mensaje ajeno sin leer. Bajo cada tanda, la hora del último mensaje a 11.5px, con " · Enviado" en la última propia ya entregada; mientras se envía, la burbuja baja a opacidad 0.62 con "Enviando…". Un círculo de 36px con hoja levantada baja al último mensaje.

**Compositor.** Campo nativo con borde de 1px en `control-border`, radio `xl`, 15px (16px en el teléfono para que el sistema no amplíe) que crece con `field-sizing: content` de 42 a 168px; sin ese soporte, `@supports not (field-sizing: content)` lo fija en 86px. Enviar es un círculo azul de 42px que, desactivado, pasa a relleno tranquilo fuerte. Con puntero fino Enter envía y Mayús + Enter agrega una línea, y sólo entonces se muestra esa pista; con puntero grueso Enter siempre agrega una línea. Los errores van en `danger-wash` con icono `danger`.

**Teléfono.** Bajo 768px la conversación es una capa a pantalla completa sin radio ni sombra: la cabecera suma el área segura, "Volver" de 44px reemplaza a cerrar y el compositor descuenta el área segura inferior. Mientras está abierta, el documento no se desplaza y la cabecera y la navegación inferior se ocultan cuando la capa termina de entrar (360ms).

**Campana.** En escritorio, un popover de 400px como máximo con radio `lg`, sombra flotante y alto `min(72vh, 580px)`; en el teléfono, una hoja inferior de vaul a todo el ancho, de 88dvh como máximo, con radio `xl` arriba, título de 19px peso 700, acciones de 44px y filas de 64px. Encabezado "Notificaciones" (16px, 650) con "Marcar todas como leídas" en azul. Las filas se agrupan en "Sin leer" y "Anteriores", o "Recientes" cuando no hay pendientes, con rótulos de 12.5px peso 600 en tinta tenue; cada fila mide 60px con la columna del punto, marca de 34px, título de 14.5px (500; 650 sin leer), detalle de 13px y hora de 12px. Cierra con "Ver todas las notificaciones" (48px, azul) sobre escritorio al 55%. El icono de la campana pasa a relleno con pendientes y el contador `danger` se corta en "99+". Como la hoja del teléfono se monta en `body`, `app/campus.css` deriva `--tone-wash`, `--tone-wash-strong` y `--tone-ink` también dentro de `.sheet-content`.

**Movimiento.** Las pilas entran desde `scale(0.96)` con opacidad y salen igual en 160ms; las que quedan ocupan su lugar con resorte 340/28 (`SPRING_LAYOUT`). Al desplegar, las hojas traseras se pliegan a `scaleY(0.2)` y se funden, la lista crece por `grid-template-rows` en 360ms y las filas bajan 8px escalonadas cada 30ms hasta 90ms. El indicador del conmutador se desliza con `layoutId` y el mismo resorte. En escritorio la columna se abre con `grid-template-columns` en 380ms y la hoja entra con `@starting-style` desde 24px a la derecha y opacidad 0 (opacidad 200ms, desplazamiento 380ms); al cerrar se funde en 120ms. En el teléfono la capa entra desde `translate: 100% 0` en 360ms y sale con resorte 380/38. El último mensaje aparece 10px más abajo desde `scale(0.98)`. Todo usa `--ease-spring` y `--ease-out-quint`.

**Carga.** `CommunicationsSkeleton`, `PendingBandSkeleton`, `ConversationListSkeleton` y `ConversationSkeleton` repiten la geometría de la banda, el directorio y la conversación; el esqueleto de la campana conserva vacía la columna del punto.

## Movimiento y carga

El movimiento explica continuidad, nunca decora. Todo vive en `app/globals.css` (transiciones de vista y fotogramas) y `app/campus-base.css` (material de los esqueletos).

- **Cambio de pantalla.** Con puntero o toque, la vista que sale se funde en 100ms y la que entra llega 90ms después: opacidad y 10px de subida en 300ms con `--ease-spring`. Las pestañas del aula entran 20px desde el lado de la pestaña elegida y el indicador de 3px se desliza hasta ella. Con teclado o movimiento reducido el cambio es inmediato (`lib/view-transition.ts`). Cabecera y barra inferior tienen nombre de transición propio y no parpadean.
- **Momento firma.** Al abrir un ramo desde su ficha, la pestaña del separador con el código viaja de la ficha a la cabecera del aula en 440ms mientras las pantallas se funden; al volver, regresa a su ficha.
- **Esqueletos.** Muestran todo lo que ya se conoce (copia fija, nombre, código y tono del ramo, cuenta, vista del calendario) y dibujan huesos sólo para lo que falta. El hueso es tinta al 7.5% (5% en el apagado), por lo que funciona sobre hoja, escritorio o tinte de sección; `.sk-line` ocupa exactamente el alto de línea del texto que reemplaza. Aparece tras 140ms para que una carga rápida no destelle, y un único brillo diagonal recorre la página a velocidad constante (`lib/skeleton-wave.ts`).
- **Resolución.** Un módulo diferido se funde con su esqueleto mediante una transición de vista que deja quietos títulos y controles; las listas que llegan dentro de una vista entran con `resolve`: opacidad y 6px en 320ms, escalonadas hasta 120ms; si la última entrada fue el teclado, aparecen sin animar.
- **Superposiciones.** El menú de cuenta baja 6px desde `scale(0.97)` y los diálogos de escritorio suben 8px desde `scale(0.97)`, ambos con `@starting-style` y sólo con puntero. El panel de la campana baja 6px desde `scale(0.98)` con resorte 340/28 en cada apertura, y el contador de la cabecera crece desde `scale(0.86)` cuando cambia.
- **Avisos y mensajes.** La columna de conversación entra con `@starting-style`: 24px y opacidad en escritorio, 100% desde la derecha en el teléfono. Pilas e indicador del conmutador usan el resorte 340/28. El detalle está en Components.
- **Primer cuadro en el teléfono.** La barra inferior viaja siempre en el HTML del servidor y el ancho decide qué cromo se pinta; bajo 768px el shell llega móvil desde el primer cuadro y la hidratación no reordena nada.
- **Movimiento reducido.** Huesos estáticos sin brillo, sin transiciones de vista y sin resolución animada.

## Do's and Don'ts

### Do:

- **Do** declarar tokens nuevos en el bloque `:root:has(.app-shell, .policy-page, .public-page)` de `app/globals.css` para que campus, páginas públicas y elementos montados en `body` los hereden.
- **Do** pasar el color de sección como `--course-tone` y consumir sólo `--tone-wash`, `--tone-wash-strong`, `--tone-ink` o el tono puro.
- **Do** elevar con `--shadow-1` y quitar el borde a toda superficie nueva; usar `--shadow-2` sólo para lo que flota.
- **Do** usar cifras tabulares para datos y proporcionales para códigos y secciones.
- **Do** mantener 44px de área táctil con puntero grueso y la navegación inferior móvil de 58px más área segura.
- **Do** respetar el movimiento reducido: el campus fija transiciones, animaciones y desplazamiento automático a 0ms y los componentes React animados usan `useReducedMotion()`.
- **Do** conservar el descargo de independencia en el pie y los distintivos de tiendas sin enlace.

### Don't:

- **Don't** aplicar este sistema a la pantalla de acceso ni a selectores raíz fuera de ese bloque; el login mantiene Merriweather, Manrope y su composición.
- **Don't** usar azul UBB como color de sección ni como decoración.
- **Don't** dibujar líneas divisorias entre cabecera, riel, pie o filas.
- **Don't** poner rótulos pequeños en mayúsculas, píldoras de etiqueta ni textos sobre los títulos.
- **Don't** usar `transition: all`, gradientes de texto, resplandores saturados ni emojis como iconos; los iconos son de `@phosphor-icons/react`.
- **Don't** desplazar elementos en hover; el hover cambia fondo o sombra.
- **Don't** afirmar conformidad WCAG por estas capturas o comprobaciones automáticas; la auditoría integral sigue pendiente.

### Pendientes conocidos

- En Administrar ramos, la marca de color de la lista puede no coincidir con el tono del portal, porque el portal deriva el tono de una plantilla o de un hash. Está registrado como tarea de datos aparte.
- El marcador del día de hoy en el calendario y el indicador de no leído usan azul a propósito: son estado bajo la Regla del Azul que Actúa. El no leído es un punto de 9px en la columna inicial de la campana y del directorio de conversaciones, más peso 650 en el título; un aviso no leído vive en la banda "Sin leer" y no en el historial. El contador de la cabecera usa `danger`.
