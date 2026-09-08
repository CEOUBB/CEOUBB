# ui/not-found-page Specification

## Purpose

Define el comportamiento visual, semántico y de accesibilidad de la página de error 404 institucional (No Encontrado) para CEOUBB, garantizando un diseño deliberado, sin estética genérica de IA, con tokens OKLCH y recuperación de navegación fluida.

## Requirements

### Requirement: Página 404 Institucional con Diseño Impecable y Deliberado (REQ-UI-404)

WHEN un usuario o agente navega a cualquier ruta que no existe en el sistema o una acción invoca `notFound()`, el sistema SHALL renderizar la página `app/not-found.tsx` aplicando los principios de `/deliberate` y `/impeccable`:

1. El texto visible SHALL estar redactado estrictamente en español formal institucional.
2. La tipografía SHALL utilizar el emparejamiento canónico del sistema: titulares en `Merriweather` (serif) y cuerpo/utilidad en `Manrope` (sans-serif).
3. Los estilos de superficie y color SHALL utilizar exclusivamente tokens semánticos OKLCH de `DESIGN.md` (`bg-surface-base`, `text-surface-foreground`, `border-surface-border`), evitando negros puros (`#000000`, `bg-black`, `bg-zinc-950`).
4. El contenedor principal SHALL estar marcado semánticamente con el elemento `<main id="main-content">` con foco accesible programático.
5. El diseño SHALL proveer un control primario de retorno claro que enlace a la raíz (`/`) con estados interactivos completos (`:hover`, `:active`, `:focus-visible` calibrados con muelles no lineales).
6. La interfaz SHALL respetar la preferencia del sistema de movimiento reducido (`prefers-reduced-motion`).

#### Scenario: Visitante navega a una URL inexistente

- **GIVEN** un visitante navegando en `https://ceoubb.com`
- **WHEN** solicita una ruta no registrada (ej. `/cursos-antiguos` o `/pagina-inexistente`)
- **THEN** el sistema SHALL responder con código de estado HTTP 404
- **AND** SHALL renderizar la interfaz `app/not-found.tsx` en español institucional
- **AND** SHALL incluir un enlace accesible para volver al inicio del portal

#### Scenario: Accesibilidad y tecnologías de asistencia en error 404

- **GIVEN** un usuario con lector de pantalla o navegación por teclado
- **WHEN** aterriza en la página de error 404
- **THEN** el landmark `<main>` SHALL estar presente y ser el primer punto de referencia navegable
- **AND** el botón de retorno SHALL recibir foco accesible visible con ratio de contraste superior a 4.5:1
