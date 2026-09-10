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

## Contrato

- REQ-CEO72-01: mes completo, navegación, indicadores y acceso a actividades.
- REQ-CEO72-02: creación semanal hasta una fecha, máximo 26 semanas; guardado atómico y sesiones editables por separado.
- REQ-CEO72-03: crear rangos y mover bloques mediante puntero/tacto, límites 08:00–21:00, Escape cancela.
- REQ-CEO72-04: listeners Firestore privados paginados, estados de carga/error y alternativas completas por teclado.

Se reutiliza el esquema de eventos existente, incluido `clase`. No se necesita una migración ni una segunda fuente de datos.

## Revisión, evidencia y límites

Revisión independiente del 10 de septiembre de 2026: **ship**, sin hallazgos materiales dentro del alcance inspeccionado. Las capturas `.impeccable/review/desktop.png`, `mobile.png`, `week-desktop.png` y `week-mobile.png` muestran las vistas mensual y semanal a 1280 px CSS y Pixel 7 de 393 px CSS. Mantienen la identidad del campus, la agenda móvil legible y los controles accesibles; no se observó desbordamiento material. Los controles del transporte de prueba aparecen al final, fuera del componente de producto.

La lectura de componentes y adaptador confirma alternativas por teclado, selección táctil explícita, diálogo nativo, estados de guardado y error, recurrencia atómica y listeners paginados. El agente implementador reportó seis recorridos aprobados de `e2e/calendar-ceo72.spec.ts`, que cubren tacto CDP, ratón, teclado, cancelación, fallo de guardado, recurrencia y más de 200 registros; el revisor inspeccionó sus assertions, sin volver a ejecutarlos.

La evidencia usa componentes reales con transporte SDK sintético. No acredita el shell completo, Firestore desplegado, sincronización entre dispositivos físicos ni conformidad WCAG integral. No se midió contraste computado ni se revisaron capturas del diálogo abierto o del estado de error. Esta revisión documenta una extensión local; `DESIGN.md` conserva la autoridad sobre la identidad global.
