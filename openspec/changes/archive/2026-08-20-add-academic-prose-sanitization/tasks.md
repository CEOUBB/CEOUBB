## 1. Contract and RED

- [x] 1.1 Definir REQ-PROSE-01 a REQ-PROSE-06 con BDD, arquitectura y límites de seguridad.
- [x] 1.2 Añadir `tests/academic-content.test.ts` para XSS, protocolos, Word/Moodle, tablas e idempotencia.
- [x] 1.3 Registrar la suite en `test`, `test:unit` y `verify:fast`; generar el snapshot SHA-256 antes de GREEN.

## 2. Sanitization Pipeline

- [x] 2.1 Instalar `isomorphic-dompurify@3.0.0` y conservar compatibilidad con Node `>=22.13.0`.
- [x] 2.2 Implementar allowlist, limpieza por etiqueta y salida branded en `lib/academic-content.ts`.
- [x] 2.3 Endurecer enlaces e imágenes y envolver tablas sin aceptar atributos del documento de origen.
- [x] 2.4 Rechazar entradas mayores a 100.000 caracteres antes del parseo y ofrecer fallback seguro en el componente.

## 3. Rendering and Institutional Design

- [x] 3.1 Implementar `AcademicProse` como único sink React con sanitización obligatoria.
- [x] 3.2 Añadir `.academic-prose` a `app/globals.css` con tokens Manrope/Merriweather y ritmo editorial.
- [x] 3.3 Añadir regiones de tabla responsivas, código desplazable, imágenes acotadas y foco visible.

## 4. Verification and Archive

- [x] 4.1 Ejecutar la suite focal y `pnpm run verify:fast` sin modificar el snapshot durante GREEN tras la enmienda de límite.
- [x] 4.2 Ejecutar invariantes, lint, formato, auditoría de producción y suite completa.
- [x] 4.3 Actualizar la spec verificada y `PLAN.md`, confirmar trazabilidad y preparar el archivo OpenSpec.
