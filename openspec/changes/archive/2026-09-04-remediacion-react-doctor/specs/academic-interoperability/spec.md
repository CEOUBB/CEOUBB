## ADDED Requirements

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
