# P15 — Blindaje institucional y sanitización de contenido académico (CEO-57)

**Estado:** VERIFICADA · **Owner:** Codex / Juako · **Versión:** 1.1.0
**Objetivo:** Web Next.js y shell Capacitor (`lib/academic-content.ts`, `app/components/AcademicProse.tsx`, `app/globals.css`)
**Issue:** CEO-57

## 1. Intención y alcance

CEOUBB necesita una frontera de confianza antes de habilitar los editores multimodales. Esta fase acepta HTML no confiable, preserva una allowlist académica, elimina contenido ejecutable y presentación invasiva, normaliza recursos externos y entrega una superficie tipográfica institucional reusable. No persiste contenido ni implementa edición, Markdown, LaTeX o uploads.

## 2. Requisitos formales

- **REQ-PROSE-01 (Event-Driven):** WHEN untrusted academic HTML enters the rendering pipeline, the system SHALL remove scripts, event attributes, executable elements, custom elements and unsafe URL protocols before creating a React HTML sink.
- **REQ-PROSE-02 (Ubiquitous):** The sanitization pipeline SHALL preserve only approved semantic formatting, headings, paragraphs, quotes, lists, tables, code, figures, images and links with attributes explicitly valid for their element.
- **REQ-PROSE-03 (Event-Driven / Unwanted Behavior):** WHEN a sanitized fragment contains an absolute external HTTP(S) link, the system SHALL add `target="_blank"` and `rel="noopener noreferrer"`; IF an image source is not HTTPS or an internal relative URL, THEN the system SHALL remove the image.
- **REQ-PROSE-04 (Event-Driven):** WHEN HTML pasted from Word or Moodle contains `mso-*` declarations, fixed font families, absolute point sizes, source classes, IDs or legacy font tags, the system SHALL remove that presentation while preserving safe textual and tabular structure.
- **REQ-PROSE-05 (Ubiquitous):** The system SHALL expose an `AcademicProse` component that always sanitizes its `html` prop and renders it inside `.academic-prose` using the current Manrope body, Merriweather headings, CEOUBB tokens and monospace code typography.
- **REQ-PROSE-06 (Event-Driven):** WHEN approved HTML contains a table, the system SHALL wrap it in a keyboard-focusable labelled region with horizontal overflow and SHALL produce idempotent sanitized output.
- **REQ-PROSE-07 (Unwanted Behavior):** IF untrusted academic HTML exceeds 100,000 characters, THEN the system SHALL reject it before DOM parsing and `AcademicProse` SHALL render a static Chilean-Spanish message asking the author to divide the material.

## 3. Criterios BDD

```gherkin
Feature: Renderizado seguro de contenido académico

  Scenario: Un vector XSS se elimina por completo
    Given HTML con script, onerror y un enlace javascript
    When se procesa con sanitizeAcademicHtml
    Then no quedan etiquetas ejecutables, eventos ni protocolos inseguros
    And el texto académico seguro conserva su estructura permitida

  Scenario: Un documento de Word pierde su tema de origen
    Given una tabla con mso, fuente fija, tamaño en pt, clase, id y font
    When se procesa y renderiza dentro de AcademicProse
    Then desaparecen los estilos y metadatos de origen
    And permanecen la tabla y su contenido textual

  Scenario: Recursos externos quedan acotados
    Given enlaces externos e internos e imágenes HTTPS y data URI
    When se sanitiza el fragmento
    Then el enlace externo usa noopener noreferrer y target blank
    And el interno conserva navegación local
    And la imagen data URI desaparece

  Scenario: Una tabla ancha funciona en móvil
    Given una tabla Moodle de múltiples columnas
    When se sanitiza dos veces y se muestra en pantalla estrecha
    Then existe un único envoltorio desplazable y enfocable
    And el desbordamiento horizontal queda contenido en la tabla

  Scenario: Un documento excede el presupuesto seguro de CPU
    Given HTML académico de 100.001 caracteres
    When entra al pipeline de sanitización
    Then se rechaza antes de construir el DOM
    And AcademicProse muestra un mensaje seguro que pide dividir el material
```

## 4. Diseño técnico

La implementación y sus decisiones vinculantes se registran en `openspec/changes/archive/2026-08-20-add-academic-prose-sanitization/`; el contrato vigente vive en `openspec/specs/editor/academic-content/spec.md`. `isomorphic-dompurify@3.0.0` ofrece exports Node/browser compatibles con el mínimo Node del repositorio. La sanitización limita la entrada a 100.000 caracteres antes de parsear, usa `RETURN_DOM_FRAGMENT`, depura atributos por etiqueta, valida URLs con base `https://ceoubb.com`, elimina imágenes inseguras y agrega únicamente atributos constantes controlados por CEOUBB. `AcademicProse` es el único sink React y `.academic-prose` consume los tokens canónicos de `DESIGN.md`.

## 5. DAG de ejecución

- [x] **T1 — REQ-PROSE-01..06:** formalizar propuesta, delta OpenSpec, diseño y tareas. `pnpm exec openspec validate add-academic-prose-sanitization --strict`
- [x] **T2 — REQ-PROSE-01..06:** crear suite RED, registrar comandos y bloquear hashes. `node --experimental-strip-types --test tests/academic-content.test.ts`
- [x] **T3 — REQ-PROSE-01..04/06/07:** instalar dependencia e implementar pipeline DOM acotado. `pnpm run verify:fast`
- [x] **T4 — REQ-PROSE-05/06:** implementar componente y estilos institucionales responsive. `pnpm run lint && pnpm run typecheck`
- [x] **T5 — REQ-PROSE-01..07:** ejecutar gates, auditar dependencias, archivar OpenSpec y preparar PR. `pnpm run verify:invariants && pnpm test`

## 6. Gate de aprobación

El mantenedor aprobó requisitos, arquitectura, alcance y ejecución al solicitar expresamente implementar CEO-57, no pedir aprobaciones intermedias y publicar el resultado en un pull request el 20 de agosto de 2026. La sustitución de Inter/Source Serif 4 por Manrope/Merriweather obedece a la fuente de verdad vigente `DESIGN.md` integrada en `main` y no cambia el objetivo funcional.

## 7. Evidencia de verificación

- `node --experimental-strip-types --test tests/academic-content.test.ts`: 7/7 escenarios anti-XSS, allowlist, URL, Word/Moodle, idempotencia, CSS y límite en verde.
- `pnpm run verify:fast`: typecheck, 198/198 pruebas, test-locking de 24 archivos y 8 especificaciones vivas en verde.
- `pnpm run verify:invariants`: 31/31 y reglas Firebase válidas; no se modificó ninguna superficie de autorización.
- `pnpm run lint`, `pnpm run format:check` y `pnpm run check:functions`: salida 0, sin errores ni advertencias.
- `pnpm test`: build de producción Next.js 16 y 223/223 pruebas en verde.
- `pnpm audit --prod`: cero vulnerabilidades conocidas. `pnpm peers check` conserva la deuda preexistente de `main` entre `@eslint/js@10.0.1` y `eslint@9.39.5`; la nueva dependencia no declara peers.
- `openspec validate add-academic-prose-sanitization --strict`: delta válido antes de archivar.
- Corpus manual: nueve vectores adicionales de SVG/MathML/form/object/iframe/srcset/credenciales eliminados. Carga SSR medida en 181 ms para 29,5 kB, 2,4 s para 118 kB y 36,7 s para 295 kB; REQ-PROSE-07 ahora rechaza 100.001 caracteres antes del parseo en 0,4 ms.
- React Doctor changed-scope reportó 100/100 sin hallazgos; la revisión vinculante es ESLint + typecheck porque el componente nuevo aún no está integrado en una ruta de CEO-58/59.
