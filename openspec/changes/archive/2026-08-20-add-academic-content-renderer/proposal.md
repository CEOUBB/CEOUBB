## Estado

`APROBADA` — el usuario solicitó ejecutar CEO-58 de extremo a extremo y autorizó expresamente avanzar sin pausas de aprobación intermedia el 2026-08-20.

## Why

Linear **CEO-58** requiere una superficie única que represente publicaciones docentes escritas como Markdown + LaTeX o como HTML enriquecido. Hoy el portal no dispone de un renderer compartido, no carga los estilos de KaTeX en el documento inicial y no ofrece resaltado ni copia de código. Resolver cada formato dentro de una vista distinta produciría divergencias entre la web y la WebView de Android, que consume la misma aplicación remota.

El cambio debe ser SSR-first. Las fórmulas, el HTML seguro y el resaltado se materializan antes de entregar el documento; la mejora de portapapeles es el único comportamiento cliente. Esto evita una segunda pasada visual después del montaje, conserva el HTML inicial durante navegaciones RSC y limita el trabajo del hilo principal.

## What Changes

- Agrega `AcademicContentRenderer`, con entrada explícita `markdown` o `html`, salida semántica bajo `.academic-prose` y saneamiento AST previo a cualquier HTML generado por KaTeX o Highlight.js.
- Renderiza `$...$` y `$$...$$` con KaTeX durante el render inicial, importando su CSS desde el layout raíz para impedir contenido matemático sin estilo.
- Registra únicamente Python, MATLAB, C, SQL y R en Highlight.js, sin autodetección ni paquete completo de lenguajes.
- Incorpora JetBrains Mono mediante `next/font`, bloques con nombre de lenguaje y un control accesible de copia al portapapeles.
- Estiliza tablas responsivas y callouts `callout-notice` / `callout-assessment` con los tokens institucionales existentes.
- Agrega pruebas bloqueadas por SHA-256 para fórmulas, código, HTML seguro, callouts, copy toolbar y degradación de lenguajes no soportados.

## Capabilities

### New Capabilities

- `content/academic-rendering`: transformación determinista y segura de contenido académico multimodal a HTML inicial, con matemática, código científico, callouts y mejora accesible de copiado.

### Modified Capabilities

<!-- Ninguna capacidad viva cambia su contrato. -->

## Impact

**Código**

- `lib/academic-content.ts` — pipeline Markdown/HTML, saneamiento, KaTeX, resaltado y toolbar de código.
- `app/components/AcademicContentRenderer.tsx` — API pública del renderer.
- `app/components/AcademicContentClient.tsx` — portapapeles y anuncio accesible.
- `app/globals.css` — blindaje visual `.academic-prose`, callouts, matemática, tablas y highlighting.
- `app/layout.tsx` — CSS de KaTeX y variable de JetBrains Mono en el HTML inicial.
- `tests/academic-content-renderer.test.ts` — criterios BDD ejecutables.
- `package.json`, `pnpm-lock.yaml`, `.agents/.test-hashes.json` — dependencias, registro de suite y test-locking.

**Dependencias**

- Unified/Remark/Rehype para un pipeline AST isomorfo y ordenable.
- KaTeX para salida HTML + MathML accesible.
- Highlight.js con registros selectivos de cinco lenguajes.

**Datos y operaciones**

- Sin esquema, consultas, API, Firebase ni despliegues externos.
- La complejidad es lineal respecto del tamaño de una publicación y no agrega listeners ni trabajo por estudiante/sección.

## Non-goals

- No crea el editor multimodal ni el wizard de publicación (CEO-59 y CEO-60).
- No migra publicaciones existentes ni modifica Firestore/Turso.
- No implementa limpieza de estilos `mso-*`, pegado desde Word o una política HTML extensible por docentes; ese blindaje completo pertenece a CEO-57.
- No habilita ejecución de código, diagramas Mermaid, iframes, scripts, estilos inline ni contenido remoto activo.
- No agrega autodetección de lenguajes ni carga todos los gramáticos de Highlight.js.
- No integra todavía el renderer en una publicación productiva que no existe en `main`; entrega la unidad reutilizable y verificada que consumirán CEO-59/CEO-60.
