# editor/multimodal-authoring Specification

## Purpose
TBD - created by archiving change add-multimodal-academic-editor. Update Purpose after archive.

## Requirements

### Requirement: Estado canónico sincronizado

**REQ-EDITOR-01:** WHEN un docente cambia entre Visual, Markdown + LaTeX y HTML, el editor SHALL convertir hacia la superficie de destino y SHALL preservar el contenido semántico, las estructuras académicas y cualquier marcado HTML no representable mediante passthrough crudo.

#### Scenario: El contenido visual permanece al cambiar de modo

- **GIVEN** un docente redacta texto con énfasis, enlace, fórmula, tabla y callout en Visual
- **WHEN** cambia a Markdown y luego a HTML
- **THEN** cada estructura SHALL continuar presente y editable

#### Scenario: El HTML desconocido no se descarta

- **GIVEN** una fuente HTML contiene una etiqueta no cubierta por Markdown
- **WHEN** el docente cambia a Markdown y vuelve a HTML
- **THEN** el editor SHALL conservar ese marcado como HTML crudo sin ejecutarlo

### Requirement: Superficie Visual académica

**REQ-EDITOR-02:** WHILE el modo Visual está activo, el editor SHALL ofrecer negrita, cursiva, subrayado, alineación izquierda/centro/derecha, tabla, fórmula LaTeX, bloque de código, callout y enlace mediante controles accesibles.

#### Scenario: Una herramienta modifica la selección

- **GIVEN** el foco y una selección están dentro del lienzo Visual
- **WHEN** el docente activa una herramienta de formato o inserción
- **THEN** el editor SHALL modificar la selección y SHALL sincronizar el valor canónico inmediatamente

### Requirement: Fuentes Markdown y HTML

**REQ-EDITOR-03:** WHILE Markdown está activo, el editor SHALL mostrar una fuente monoespaciada con LaTeX y preview en tiempo real. WHILE HTML está activo, el editor SHALL permitir escribir o pegar marcado libre hasta el límite vigente sin evaluar scripts en la superficie de autoría.

#### Scenario: Markdown actualiza la prueba de lectura

- **GIVEN** el modo Markdown está activo
- **WHEN** el docente escribe una fórmula o un bloque de código
- **THEN** la vista previa compartida SHALL reflejar el valor sin esperar una publicación

#### Scenario: HTML peligroso permanece inerte

- **GIVEN** el modo HTML contiene script, iframe o un handler de evento
- **WHEN** el docente abre Visual o la vista previa
- **THEN** ese código MUST NOT ejecutarse ni convertirse en un nodo activo

### Requirement: Operación WCAG 2.2 por teclado

**REQ-EDITOR-04:** The editor SHALL implement the WAI-ARIA tabs and toolbar keyboard patterns, visible focus, accessible names, a minimum 24×24 CSS pixel target and status announcements.

#### Scenario: Pestañas y toolbar se recorren sin puntero

- **GIVEN** el foco está en una pestaña o botón de toolbar
- **WHEN** se presionan Flecha izquierda, Flecha derecha, Inicio o Fin
- **THEN** el foco SHALL avanzar de forma circular y la pestaña enfocada SHALL activarse

#### Scenario: Atajos visuales inmediatos

- **GIVEN** el foco está dentro del lienzo Visual
- **WHEN** el docente presiona Ctrl/Cmd+B, Ctrl/Cmd+I o Ctrl/Cmd+K
- **THEN** el editor SHALL aplicar negrita, cursiva o enlace inmediatamente

### Requirement: Compatibilidad del formulario existente

**REQ-EDITOR-05:** The multimodal editor SHALL preserve the controlled `value`, `onChange`, `name` and `required` contract of `RichPostEditor` and SHALL NOT change the persisted classroom post schema.

#### Scenario: Publicación conserva body string

- **GIVEN** el editor se usa en el formulario de publicación o modificación
- **WHEN** se envía el formulario
- **THEN** `FormData.get("body")` SHALL return the synchronized canonical string
