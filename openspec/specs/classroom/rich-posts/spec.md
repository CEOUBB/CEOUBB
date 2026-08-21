# classroom/rich-posts Specification

## Purpose

Defines safe technical classroom publications with a bounded Markdown subset, syntax-highlighted code, KaTeX formulas, a shared live preview, historical plain-text compatibility and identical rendering in the web portal and Android remote WebView.

## Requirements

### Requirement: Safe Markdown Rendering and Legacy Compatibility

The classroom SHALL render publication bodies as a bounded Markdown subset through escaped UI nodes and SHALL preserve the visible text and line breaks of historical plain-text bodies without requiring a data migration.

#### Scenario: Historical plain-text post remains readable

- **WHEN** a stored post body contains ordinary text and line breaks without Markdown syntax
- **THEN** every original text segment SHALL remain visible in order and its paragraph breaks SHALL remain legible

#### Scenario: Supported Markdown is rendered

- **WHEN** a post contains headings, lists, blockquotes, emphasis, inline code or safe links
- **THEN** the classroom SHALL render the corresponding semantic elements without converting author text into an HTML string

### Requirement: Technical Code Block Highlighting

WHEN a fenced block declares MATLAB, Python, C++ or SQL, the classroom SHALL preserve and escape the complete source code and SHALL apply deterministic language-aware syntax highlighting. Unknown languages MUST render as escaped plain code.

#### Scenario: Required languages are recognized

- **WHEN** fenced blocks declare `matlab`, `python`, `cpp`, `c++` and `sql`
- **THEN** the system SHALL normalize them to MATLAB, Python, C++ and SQL tokenizers and SHALL preserve the original code text

#### Scenario: Unknown language is inert

- **WHEN** a fenced block declares an unsupported language
- **THEN** the system SHALL display its complete escaped source without evaluating it or assigning a supported-language tokenizer

### Requirement: Restricted KaTeX Formula Rendering

WHEN a body contains inline or display TeX delimiters, the classroom SHALL render the expression with the existing vendored KaTeX runtime using untrusted-input restrictions and accessible MathML. IF the runtime is unavailable or rejects the expression, THEN the original TeX source SHALL remain visible.

#### Scenario: Inline and display formulas render

- **WHEN** a post contains `$\\sum F_x = 0$` and a `$$...$$` display expression
- **THEN** KaTeX SHALL receive each expression with trust disabled, strict errors enabled and bounded expansion and size

#### Scenario: Invalid formula falls back to source

- **WHEN** KaTeX rejects an expression
- **THEN** the original delimited TeX SHALL remain visible and the rest of the post SHALL continue rendering

### Requirement: Shared Live Teacher Preview

WHILE a teacher composes or edits a classroom publication, the classroom SHALL show a live preview produced by the same renderer used for the published feed.

#### Scenario: Preview matches published rendering

- **WHEN** a teacher types Markdown, a MATLAB fence and a formula
- **THEN** the preview SHALL use the shared rich renderer and the saved post SHALL use that same component

#### Scenario: Failed save preserves the draft

- **WHEN** Firebase rejects a publish or edit operation
- **THEN** the controlled title and body draft MUST remain available for correction and retry

### Requirement: Stored XSS and Unsafe Destination Prevention

IF a publication contains raw HTML, event attributes, executable URL schemes or dangerous TeX features, THEN the classroom SHALL render the author input as inert text or omit the unsafe destination and SHALL NOT inject author-generated HTML into the page.

#### Scenario: Raw HTML remains inert

- **WHEN** a body contains `<script>`, `<img onerror>` or any other raw HTML tag
- **THEN** no author tag SHALL become an executable DOM element and its source SHALL remain escaped text

#### Scenario: Executable URL is rejected

- **WHEN** an inline or post resource link uses `javascript:`, `data:` or a control character
- **THEN** the destination MUST NOT be assigned to an `href`

#### Scenario: Renderer avoids unsanitized HTML injection

- **WHEN** the rich renderer implementation is inspected
- **THEN** it MUST NOT use `dangerouslySetInnerHTML` for Markdown, code or formula source

### Requirement: Web and Android Rendering Parity

WHERE the classroom runs inside the Android Capacitor application, the system SHALL use the same remote portal renderer and authoring UI as the browser and SHALL NOT introduce a duplicated native Markdown implementation.

#### Scenario: Android displays the web renderer

- **WHEN** an Android user opens a classroom post after the remote bundle is deployed
- **THEN** the WebView SHALL load the same `RichText` component, syntax tokenizer and vendored KaTeX assets used by the web portal

#### Scenario: Technical content keeps overflow local on Android

- **WHEN** an Android user opens a six-column Markdown table, a long code line or a wide KaTeX formula
- **THEN** each technical element SHALL expose local horizontal touch scrolling and SHALL NOT widen the post card or classroom layout

### Requirement: Safe Markdown Tables

WHEN a body contains a pipe-delimited Markdown table with a valid separator row, the classroom SHALL render a semantic table from escaped React nodes and SHALL process every cell through the same safe inline parser used by paragraphs. IF a table cell contains raw HTML or an executable link destination, THEN the source SHALL remain inert and the destination SHALL be omitted.

#### Scenario: Six-column table remains usable on a phone

- **WHEN** a publication contains a valid table with six columns
- **THEN** every header and data cell SHALL remain present inside a labeled horizontal scroll region

#### Scenario: Invalid table syntax preserves author text

- **WHEN** pipe-delimited text lacks a valid separator row or uses an incompatible column count
- **THEN** the renderer SHALL treat it as ordinary paragraph content without discarding text

### Requirement: Bounded New Writes Without Historical Truncation

The classroom SHALL limit every newly published or edited body to 40,000 characters. IF a historical stored body is larger, THEN the renderer SHALL continue to display it without mutating or truncating the stored value.

#### Scenario: Authoring limit is enforced

- **WHEN** a teacher reaches 40,000 characters in the controlled editor
- **THEN** the editor SHALL prevent additional input and the Firebase write boundary MUST reject an oversized bypass attempt

#### Scenario: Oversized legacy body remains readable

- **WHEN** the feed receives a historical body larger than the authoring limit
- **THEN** the renderer SHALL parse and display the stored value without writing a truncated replacement
