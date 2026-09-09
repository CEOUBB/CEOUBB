# Refinamiento de la PR 178

## Decisiones

- Sujeto: consultar y registrar notas chilenas, reconocer una entrega recibida y confirmar una eliminación en CEOUBB.
- Modo: operar. Alcance limitado a los elementos añadidos en la PR 178; se conserva la composición del aula y del calendario.
- Referencias: planilla de calificaciones, comprobante de entrega y borrador docente.
- Paleta: tokens existentes de superficie, tinta, texto secundario, borde, azul de acción y verde de estado. Neutros de sesgo frío; se preservan los valores OKLCH de DESIGN.md.
- Tipografía: Manrope para mensajes y controles, cifras tabulares para notas; Merriweather permanece en los títulos existentes.
- Espacio: 6–8 px entre iconos y controles relacionados; 16 px para separar una confirmación de los metadatos.
- Forma: controles de 8 px de radio. Separación mediante borde fino, sin nuevos relieves ni halos de color.
- Movimiento: ninguno nuevo; feedback textual de guardado en espacio reservado.
- Firma: el comprobante se reconoce por una sola verificación junto a «Entrega recibida», con archivo, fecha y trazabilidad conservados.

## Revisión de la dirección

Se descartaron el chip verde truncado, la doble verificación, los halos de guardado y la llamada celebratoria. La frase de objetivo alcanzado debe funcionar tanto para aprobar como para eximirse y explicitar que depende de los valores simulados. Las confirmaciones identifican la acción y agrupan conservar/cancelar antes de eliminar; no compiten con guardar un bloque.

## Verificación

La prueba `e2e/pr178-refinement.spec.ts` monta los componentes reales con datos sintéticos y callbacks aislados, siguiendo el patrón existente de comunicaciones. No verifica persistencia en Firebase ni modifica datos remotos.

- Aprobado: compilación de producción, 616 pruebas unitarias, 25 pruebas de integración, 35 invariantes, 69 sellos de integridad y 31 specs.
- Aprobado: recorridos a 1440 y 390 px con guardado, error, cancelación y foco inicial seguro en el descarte. Capturas locales en `.impeccable/review/pr178-*.png`.
- Aprobado: typecheck, lint, formato y chequeo deliberate sin hallazgos en los componentes examinados.
- Impeccable detectó dos elementos previos de SubmissionSlot (rebote al arrastrar y texto de trazabilidad a 11 px), fuera de los cambios de esta PR. React Doctor informa 84/100 comparando toda la rama con main; los avisos corresponden a importaciones, tamaño de componentes y preventDefault de formularios ya existentes. No se ampliaron cambios ni se silenciaron reglas.
- La primera suite completa heredó `CEOUBB_ENVIRONMENT=preview` y falló en tres aserciones de aislamiento productivo. La repetición con el entorno estándar pasó íntegra, sin modificar tests ni lógica de autenticación.

## Revisión de bots de la PR

- React Doctor, `no-prevent-default`: no requiere cambio. Los diálogos se montan por estado de React y ejecutan callbacks de cliente; su envío evita deliberadamente la navegación del formulario. Una server action no ofrece degradación sin JavaScript para un diálogo que depende de JavaScript para existir.
- React Doctor, `no-giant-component`: aviso de mantenibilidad de PublishView, sin defecto funcional identificado. No se fragmenta el componente para mejorar la puntuación.
- PR Review Agent, callback ref: se invoca de nuevo al renderizar, pero `dialog && !dialog.open` evita repetir `showModal()`. No se encontró una reapertura ni una pérdida de foco que justificara reemplazarlo.
- PR Review Agent, notas de un dígito: defecto reproducido. Se amplió la expresión de decimales para aceptar también 1–7, reutilizando la validación y el redondeo existentes. Se corrigió el contrato del test y su sello con autorización explícita del usuario; se añadieron comprobaciones de 1–7, espacios y rechazo de 0, 8 y 9. Los atajos de dos dígitos y el rechazo de 05 se conservan.
