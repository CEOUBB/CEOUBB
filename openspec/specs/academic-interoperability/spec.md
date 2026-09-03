# Academic Interoperability

## Purpose

Intercambiar herramientas y contenidos académicos con aislamiento por sección. Contrato, perfiles y pruebas: `docs/specs/p21-academic-interoperability.md`.

## Requirements

### Requirement: Lanzamientos LTI autenticados

WHEN un usuario abre una herramienta registrada, el sistema SHALL emitir un lanzamiento LTI 1.3 firmado RS256 sólo tras verificar sesión, matrícula, redirect exacto y hint consumible.

#### Scenario: Reutilización de hint

- **GIVEN** un lanzamiento ya consumido
- **WHEN** se repite la autorización
- **THEN** el sistema rechaza el intento con 409

### Requirement: Contenidos empaquetados aislados

WHEN se reproduce un paquete SCORM o xAPI, el sistema SHALL usar un origen separado con una capacidad por usuario y recurso; SHALL limitar tamaño, formato, rutas y persistencia del progreso.

#### Scenario: Origen del portal

- **GIVEN** un paquete con HTML ejecutable
- **WHEN** se pide su contenido desde el origen del portal
- **THEN** no se sirve el HTML

### Requirement: Intercambio de preguntas QTI

WHEN se importa o exporta QTI 2.1, el sistema SHALL preservar los ítems del perfil soportado y advertir las omisiones sin ejecutar código de preguntas.

#### Scenario: Pregunta compatible

- **GIVEN** un banco con alternativa única
- **WHEN** se exporta y vuelve a importar
- **THEN** se conservan enunciado, alternativas, respuesta y puntaje
