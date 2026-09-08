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

### Requirement: Manejo seguro y libre de efectos colaterales en endpoints de autorización LTI (REQ-INT-04)

WHEN una solicitud OIDC / LTI 1.3 es recibida en el endpoint de autorización, el sistema SHALL procesar los parámetros en estructuras de memoria seguras sin producir efectos secundarios ni mutaciones de estado en handlers HTTP de lectura (GET), y SHALL aplicar esquemas de validación estrictos y tipados.

#### Scenario: Validación de retorno OIDC sin efectos colaterales en GET

- **WHEN** un cliente o navegador inicia un flujo de autorización LTI mediante HTTP GET o POST
- **THEN** la recolección y verificación de parámetros SHALL ejecutarse sin mutaciones de estado persistente antes de la validación criptográfica
- **AND** ningún handler GET desencadenará escrituras no autorizadas o mutaciones susceptibles a prefetching

### Requirement: Almacenamiento concurrente y validación de esquemas Zod 4 en interoperabilidad (REQ-INT-05)

WHEN se importan, empaquetan o validan herramientas y recursos de interoperabilidad (LTI, xAPI, QTI 2.1), el sistema SHALL utilizar esquemas estrictos Zod 4 (`z.strictObject`) y procesar la persistencia y extracción de archivos mediante operaciones concurrentes no bloqueantes.

#### Scenario: Subida concurrente de artefactos empaquetados

- **WHEN** se publica un recurso empaquetado con múltiples archivos
- **THEN** la subida de los archivos a almacenamiento SHALL realizarse de manera concurrente
- **AND** en caso de fallo, la eliminación de los archivos parciales SHALL ejecutarse concurrentemente sin bloquear secuencialmente

#### Scenario: Validación estricta con esquemas Zod 4

- **WHEN** se parsea la configuración de una herramienta externa o una declaración xAPI
- **THEN** la validación SHALL ejecutarse mediante `z.strictObject` rechazando propiedades no declaradas
- **AND** no se utilizarán APIs obsoletas de versiones anteriores de la biblioteca de esquemas
