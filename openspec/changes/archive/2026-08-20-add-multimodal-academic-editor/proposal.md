# Propuesta: editor académico multimodal

## Estado

APROBADA — el mantenedor autorizó en CEO-59 la ejecución completa sin una pausa adicional de aprobación.

## Why

El editor vigente obliga a todo docente a escribir Markdown en una sola área de texto. Esa interfaz sirve para contenido técnico, pero dificulta el trabajo de quienes esperan una barra visual o prefieren preparar HTML. CEO-59 requiere una sola experiencia con tres superficies intercambiables, sin cambiar el contrato persistido `body: string` ni debilitar la seguridad del renderer actual.

## What Changes

- Reemplazar la superficie interna de `RichPostEditor` por un editor con pestañas Visual, Markdown + LaTeX y HTML.
- Mantener Markdown como representación canónica del campo `body`; el HTML no representable se conserva como HTML crudo válido dentro de Markdown.
- Añadir conversiones deterministas entre Markdown académico y HTML, preservando tablas, callouts, fórmulas, código y marcado libre.
- Añadir una barra visual con formato inline, alineación e inserciones académicas.
- Aplicar los patrones ARIA de pestañas y barra de herramientas, atajos de teclado y anuncios de estado.
- Mantener una vista previa con el `RichText` seguro ya usado por publicaciones guardadas.

## Impacto

- Componentes: `RichPostEditor`, nuevo `MultimodalEditor`.
- Dominio cliente: nuevo módulo puro de conversión multimodal.
- Estilos: área de edición, pestañas, toolbar y vista previa responsiva.
- Pruebas: nueva suite dedicada; no se altera ninguna aserción existente.
- Persistencia, Firebase, autenticación y Android nativo: sin cambios.

## Fuera de alcance

- No se persiste una preferencia de modo; corresponde a CEO-60.
- No se ejecuta HTML docente ni se reemplaza el pipeline de renderizado de CEO-57/58.
- No se añade edición colaborativa, carga de imágenes ni una dependencia de editor de terceros.
