# Blindaje institucional y sanitización de contenido académico (CEO-57)

## Why

El editor multimodal permitirá que docentes peguen HTML producido por Word, Moodle u otras herramientas. Ese contenido cruza un límite de confianza: puede incluir scripts, eventos, protocolos ejecutables y estilos que rompen el diseño institucional. CEOUBB necesita una única tubería reusable antes de habilitar los modos de edición de CEO-58 y CEO-59.

## What Changes

- Incorporar `isomorphic-dompurify` en una versión compatible con el contrato Node del proyecto.
- Crear una sanitización DOM isomórfica con allowlist estricta para formato académico, tablas, listas, código, imágenes y enlaces.
- Eliminar atributos de eventos, protocolos inseguros, elementos ejecutables y estilos invasivos de Word/Moodle.
- Reforzar enlaces HTTP(S) externos con `target="_blank"` y `rel="noopener noreferrer"`; limitar imágenes a HTTPS o rutas internas.
- Exponer `AcademicProse` como único contenedor React que sanitiza antes de usar `dangerouslySetInnerHTML`.
- Rechazar antes del parseo fragmentos mayores a 100.000 caracteres y mostrar un fallback seguro en español.
- Añadir estilos globales `.academic-prose` alineados con Manrope/Merriweather y tablas responsivas con desplazamiento horizontal.
- Incorporar una suite bloqueada por SHA-256 para los vectores XSS y la normalización institucional.

## Capabilities

### New Capabilities

- `editor/academic-content`: sanitización, endurecimiento de enlaces e imágenes y presentación institucional de HTML académico no confiable.

### Modified Capabilities

Ninguna. Esta base no cambia publicaciones persistidas, reglas Firebase, contratos de aula ni modos de edición.

## Impact

**Código**

- `lib/academic-content.ts` — allowlist, sanitización DOM y normalización segura.
- `app/components/AcademicProse.tsx` — límite de renderizado React.
- `app/globals.css` — tipografía, ritmo editorial, código, imágenes y tablas responsivas.
- `tests/academic-content.test.ts` — XSS, protocolos, Word/Moodle, SSR e idempotencia.
- `package.json`, `pnpm-lock.yaml` y `.agents/.test-hashes.json` — dependencia y registro de suite.

**Seguridad y escala**

- Trabajo acotado a fragmentos de hasta 100.000 caracteres y sin lecturas, escrituras ni listeners adicionales.
- No se persiste HTML en este cambio; los futuros editores deberán reutilizar esta frontera sin crear sinks paralelos.

**Non-goals**

- No se implementan los editores visual, Markdown o HTML de CEO-58/59.
- No se incorporan KaTeX, resaltado de sintaxis, carga de imágenes ni persistencia de contenido.
- No se migran publicaciones históricas ni se cambia su representación actual de texto plano.
