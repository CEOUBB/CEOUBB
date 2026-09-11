# CEO-72: calendario académico

## Decisiones previas

- **Subject / modo Operate:** estudiantes UBB organizan estudio y clases alrededor de evaluaciones y entregas del semestre.
- **Ground:** horario de clases, semanas lectivas, certámenes, entregas y sesiones de estudio.
- **Palette:** se heredan los tokens OKLCH de DESIGN.md; azul institucional para selección y foco, superficie blanca, lienzo frío, tinta académica y separadores del campus. Los tonos de sección conservan su significado.
- **Type:** Merriweather identifica el calendario; Manrope organiza días, actividades y controles. Fechas y horas tabulares.
- **Space:** 4/8/12 px dentro de días y controles; 24 px entre navegación, calendario y detalle.
- **Shape:** marco de 12 px y divisiones planas; sin sombras añadidas.
- **Motion:** selección y arrastre inmediatos; se conserva el movimiento reducido del campus.
- **Signature:** mes lectivo completo con etiquetas de evaluación/entrega y una agenda del día legible incluso a 390 px.

Crítica: la tipografía y la paleta coinciden intencionalmente con el campus existente. La densidad cambia según el dispositivo: títulos de eventos en escritorio, indicadores con detalle del día en móvil. La interacción táctil usa un modo explícito de selección para conservar el desplazamiento habitual.

## Refinamiento tras revisión de PR

Decisión deliberate: el horario sigue siendo una herramienta académica, con Merriweather para contexto y Manrope para operaciones. Conserva los tonos de sección y los neutros fríos del campus. Los controles comparten una altura exterior de 44 px, radio de 8 px y texto de 13 px; las flechas mantienen ancho compacto y las etiquetas el espacio que necesitan. Dentro de los bloques se mantienen separaciones de 5–8 px, frente a los 24 px entre áreas. El bloque pasa a una superficie tonal plana de radio pequeño y borde uniforme de 1 px, sin franja lateral, sombra ni indicador pulsante. No se añade movimiento. La firma sigue siendo la lectura del horario, no el contorno de cada evento.

Crítica: la altura común resuelve la diferencia visible entre segmentos, navegación y fecha; igualar también sus anchos ocultaría la función de las flechas y desperdiciaría espacio móvil. El control de selección táctil depende de `any-pointer: coarse`, no del ancho de pantalla, para cubrir también portátiles híbridos.

En móvil, el mes funciona como selector de fechas de 64 px de alto con un contador explícito de actividades. Los títulos completos, horarios, tipo y ramo se leen en una agenda a todo el ancho, insertada justo debajo de la semana seleccionada mediante CSS Grid. La misma agenda se mantiene al final del mes en escritorio; no se duplica contenido ni se añade estado. El resumen reemplaza los puntos de color aislados, que no explicaban qué había programado. Los títulos admiten varias líneas y la acción de añadir conserva una sola línea de texto, también a 320 px.

- PR Review Agent: falso positivo sobre persistencia de fecha; `lib/firebase/calendar.ts` ya incorpora `date: input.date` en `values` y lo envía a `updateDoc`.
- React Doctor: la búsqueda `days.includes` ocurre al pulsar una tecla, no en un bucle de render. Se reutiliza el `Map` de botones existente para encontrar y enfocar el destino. El aviso de tamaño de `CalendarView` es de mantenibilidad; no justifica dividir el componente en esta revisión visual.

## Contrato

- REQ-CEO72-01: mes completo, navegación, indicadores y acceso a actividades.
- REQ-CEO72-02: creación semanal hasta una fecha, máximo 26 semanas; guardado atómico y sesiones editables por separado.
- REQ-CEO72-03: crear rangos y mover bloques mediante puntero/tacto, límites 08:00–21:00, Escape cancela.
- REQ-CEO72-04: listeners Firestore privados paginados, estados de carga/error y alternativas completas por teclado.

Se reutiliza el esquema de eventos existente, incluido `clase`. No se necesita una migración ni una segunda fuente de datos.

## Revisión, evidencia y límites

El refinamiento posterior pasa ocho recorridos en Chromium y Pixel 7. Las aserciones miden la altura de los controles, la visibilidad inicial del selector táctil según el dispositivo, el borde uniforme y estado completado de un bloque, y la posición de la agenda entre semanas al seleccionar distintas fechas. Se inspeccionan capturas del mes a 1280, 393 y 320 px y de la semana en escritorio y móvil. Los títulos completos no desbordan a 320 px. React Doctor conserva 89/100, con sólo el aviso de tamaño de `CalendarView`; deliberate no encuentra hallazgos en los tres componentes refinados.

Revisión independiente del 10 de septiembre de 2026: **ship**, sin hallazgos materiales dentro del alcance inspeccionado. Las capturas `.impeccable/review/desktop.png`, `mobile.png`, `week-desktop.png` y `week-mobile.png` muestran las vistas mensual y semanal a 1280 px CSS y Pixel 7 de 393 px CSS. Mantienen la identidad del campus, la agenda móvil legible y los controles accesibles; no se observó desbordamiento material. Los controles del transporte de prueba aparecen al final, fuera del componente de producto.

La lectura de componentes y adaptador confirma alternativas por teclado, selección táctil explícita, diálogo nativo, estados de guardado y error, recurrencia atómica y listeners paginados. El agente implementador reportó seis recorridos aprobados de `e2e/calendar-ceo72.spec.ts`, que cubren tacto CDP, ratón, teclado, cancelación, fallo de guardado, recurrencia y más de 200 registros; el revisor inspeccionó sus assertions, sin volver a ejecutarlos.

La evidencia usa componentes reales con transporte SDK sintético. No acredita el shell completo, Firestore desplegado, sincronización entre dispositivos físicos ni conformidad WCAG integral. No se midió contraste computado ni se revisaron capturas del diálogo abierto o del estado de error. Esta revisión documenta una extensión local; `DESIGN.md` conserva la autoridad sobre la identidad global.
