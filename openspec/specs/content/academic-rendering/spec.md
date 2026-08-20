# content/academic-rendering Specification

## Purpose

Define el contrato de visualización de contenido académico escrito como Markdown + LaTeX o HTML enriquecido seguro, con salida inicial estable en web y Android Capacitor, matemática accesible, código científico copiable y callouts institucionales.

## Requirements

### Requirement: Deterministic Multimodal Rendering

WHEN `AcademicContentRenderer` receives a declared `markdown` or `html` source, the renderer SHALL transform it into deterministic semantic HTML during the initial React render and SHALL preserve common academic structures including headings, paragraphs, lists, links, tables and safe inline HTML.

The renderer MUST remove executable or destructive markup before it reaches the DOM, including scripts, event-handler attributes and unsafe URL schemes. Sanitization SHALL execute before trusted KaTeX and syntax-highlighting transforms add their own markup.

#### Scenario: Markdown and safe HTML share one renderer

- **GIVEN** one Markdown source with a table and one HTML source with headings and lists
- **WHEN** each source is passed to `AcademicContentRenderer` with its declared format
- **THEN** both SHALL produce semantic HTML under one `.academic-prose` boundary

#### Scenario: Executable HTML is rejected

- **GIVEN** content containing a script, an event-handler attribute and a `javascript:` link
- **WHEN** the renderer transforms the content
- **THEN** none of those executable payloads SHALL appear in the rendered HTML

### Requirement: Initial KaTeX Rendering Without FOUC

WHEN a source contains inline `$...$` or display `$$...$$` LaTeX, the renderer SHALL emit KaTeX HTML and MathML during the initial render and MUST NOT wait for a post-mount DOM scan.

The application SHALL include the matching KaTeX stylesheet in the root layout so formula markup and its styles participate in the same initial document, preventing a flash of unstyled mathematical content.

#### Scenario: Gaussian integral is rendered as display math

- **GIVEN** the source `$$\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$`
- **WHEN** the renderer processes the source
- **THEN** the initial HTML SHALL contain a KaTeX display expression with accessible MathML

#### Scenario: Inline math remains inline

- **GIVEN** a paragraph containing `$E = mc^2$`
- **WHEN** the renderer processes the source
- **THEN** the formula SHALL render inline without converting the paragraph into a display block

### Requirement: Bounded Scientific Syntax Highlighting

WHEN a fenced code block declares Python, MATLAB, C, SQL or R, the renderer SHALL apply server-compatible syntax highlighting and SHALL label the block with its language.

The renderer MUST register only the required scientific language grammars and MUST NOT autodetect an undeclared language. Code and code metadata SHALL use the self-hosted JetBrains Mono font with a deterministic fallback stack.

#### Scenario: Supported scientific languages are highlighted

- **GIVEN** one fenced block for each of Python, MATLAB, C, SQL and R
- **WHEN** the renderer processes the source
- **THEN** each block SHALL carry a language class and highlighted token markup

#### Scenario: Unknown language degrades to plain text

- **GIVEN** a fenced block declaring an unsupported language
- **WHEN** the renderer processes the source
- **THEN** its text SHALL remain escaped and readable without automatic language detection

### Requirement: Accessible Quick Copy

WHEN a rendered code block is displayed in a clipboard-capable browser, the renderer SHALL expose a keyboard-reachable copy control that writes the block's exact text to the clipboard and announces success in Spanish.

IF clipboard access rejects or is unavailable, THEN the renderer SHALL preserve the code and announce a non-destructive Spanish error without reloading or replacing the content.

#### Scenario: Code is copied from its block

- **GIVEN** a rendered Python block and an available Clipboard API
- **WHEN** the user activates its `Copiar código` control
- **THEN** the exact source text SHALL be passed to the clipboard and an accessible success message SHALL be announced

#### Scenario: Clipboard rejection is recoverable

- **GIVEN** a browser that rejects clipboard writes
- **WHEN** the user activates the copy control
- **THEN** the code SHALL remain visible and an accessible failure message SHALL be announced

### Requirement: Institutional Academic Callouts and Responsive Content

WHERE safe HTML uses `callout-notice` or `callout-assessment`, the renderer SHALL preserve the class and style it as an academic notice or evaluation using the existing heraldic tokens, without using those accents as primary actions.

WHILE the viewport is narrow, wide tables, display formulas and code blocks SHALL scroll inside their own boundary and MUST NOT force horizontal overflow on the page.

#### Scenario: Academic callout classes survive sanitization

- **GIVEN** safe HTML containing `callout-notice` and `callout-assessment`
- **WHEN** the renderer transforms the source
- **THEN** both classes SHALL remain inside `.academic-prose` and receive distinct institutional treatments

#### Scenario: Wide academic content stays contained

- **GIVEN** a wide table, formula or code line on a 375 px viewport
- **WHEN** the content is displayed
- **THEN** overflow SHALL remain local to that element and the document SHALL have no horizontal overflow
