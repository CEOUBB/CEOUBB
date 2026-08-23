## Why

Linear **CEO-39** cubre la objeción central de una migración institucional: la UBB no puede adoptar un LMS que obligue a reconstruir manualmente cursos, nóminas y materiales acumulados en Moodle. CEOUBB ya posee identidad de sección, matrícula relacional y almacenamiento por curso, pero no entiende respaldos `.mbz`, no reconcilia sus participantes y no deja evidencia de una restauración.

El mantenedor pidió ejecutar sin pausas ni solicitudes de aprobación. Esa instrucción constituye la aprobación humana anticipada de los gates de requisitos, arquitectura y orden de tareas para este alcance; el cambio registra esa decisión y continúa mediante TDD y los gates automáticos del repositorio.

## What Changes

- Analizar en el dispositivo respaldos Moodle 2+ `.mbz` en TGZ o ZIP y nóminas CSV, sin enviar el contenedor completo a Next.js.
- Validar el archivo contra límites de tamaño, expansión, cantidad de entradas, rutas, CRC/SHA-1 y XML sin DTD antes de ofrecer cualquier escritura.
- Mostrar una previsualización con curso de origen, secciones, actividades, archivos, participantes y omisiones explícitas.
- Restaurar páginas, etiquetas, URL, tareas y materiales compatibles en la sección CEOUBB abierta, conservando orden, carpetas, fechas y nombres cuando el contrato de destino lo permite.
- Preservar paquetes SCORM como archivos descargables sin afirmar compatibilidad de ejecución; declarar como omitidos quizzes, intentos, calificaciones y mensajes de foro.
- Reconciliar únicamente participantes con rol Moodle `student`: matrículas de cuentas existentes se proyectan a Firestore y correos institucionales aún no registrados quedan pendientes por 90 días para reclamarse al iniciar sesión.
- Hacer la operación idempotente mediante identificadores deterministas por sitio, curso y elemento de Moodle; una repetición actualiza el mismo contenido y nunca borra material histórico ausente del respaldo nuevo.
- Guardar una bitácora acotada del resultado y permitir descargar el reporte completo en JSON desde la interfaz docente.

## Capabilities

### New Capabilities

- `integrations/moodle-course-import`: análisis, previsualización, restauración, reconciliación de nómina, reporte e idempotencia de respaldos Moodle y listas CSV.

### Modified Capabilities

- `integrations`: incorpora Moodle como origen externo con validación y límites propios.
- `academic`: permite reclamar matrículas pendientes al crear o actualizar una sesión institucional.

## Impact

**Código**

- `lib/moodle/` — contenedores, XML, modelo de respaldo y CSV.
- `lib/firebase/moodle-import.ts` — carga directa y acotada de binarios a Storage.
- `lib/services/moodle-import.ts` y `app/api/courses/[sectionId]/imports/moodle/route.ts` — autorización, escrituras de contenido, nómina y bitácora.
- `db/schema.ts` y `drizzle/` — trabajos de importación y matrículas pendientes.
- `app/views/classroom/MoodleImportDialog.tsx`, `MaterialsSection.tsx` y `app/globals.css` — flujo docente accesible.
- `app/api/auth/firebase/route.ts` — reclamación idempotente de matrículas pendientes.
- `tests/moodle-import.test.ts`, `package.json` y `.agents/.test-hashes.json` — aceptación y bloqueo SHA-256.

**Datos y escala**

- Máximo 250 MiB comprimidos, 512 MiB expandidos, 20.000 entradas, 100 participantes o publicaciones por llamada y 50 MiB por archivo.
- Los bytes del `.mbz` permanecen en el dispositivo; sólo archivos compatibles viajan directamente a Storage y metadatos acotados llegan a la API.
- Una fila de auditoría por respaldo y una fila temporal por correo aún no registrado; no se guardan nombres, teléfonos, contraseñas ni otros perfiles Moodle pendientes.

**Non-goals**

- No se implementan LTI 1.3, ejecución SCORM/xAPI, IMS Common Cartridge ni QTI.
- No se restauran intentos, respuestas, notas oficiales, foros, mensajería, logs ni contraseñas Moodle.
- No se crea una nueva sección a partir del respaldo; el docente elige la sección CEOUBB de destino abriendo su aula.
- No se despliegan migraciones, variables ni servicios externos desde esta PR.
