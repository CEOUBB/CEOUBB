# P17 — Importación de cursos Moodle UBB

**Estado:** VERIFICADA · **Issue:** CEO-39 · **Fecha:** 2026-08-23

**Rama:** `elpapijuaco325/ceo-39-poder-importar-cursos-que-ya-existen-en-moodle-ubb`

## Contrato canónico

La propuesta, el diseño, los requisitos EARS con RFC 2119 y los escenarios BDD aprobados viven en el cambio OpenSpec [`import-moodle-course-backups`](../../openspec/changes/import-moodle-course-backups/proposal.md). La capacidad archivada en OpenSpec pasa a ser la fuente viva después de cerrar el cambio.

## Alcance verificado

- Detectar y analizar localmente respaldos Moodle `.mbz` en TGZ/TAR o ZIP y nóminas CSV.
- Previsualizar secciones, publicaciones, archivos, estudiantes y omisiones antes de escribir.
- Restaurar de forma idempotente `page`, `label`, `url`, `assign`, capítulos `book`, `resource`, `folder` y paquetes SCORM como descarga pasiva.
- Verificar tamaño, extensión, MIME, SHA-1, CRC, rutas y presupuestos de expansión antes de cargar archivos.
- Autorizar cada lote contra una matrícula docente o coordinadora activa en la sección de destino.
- Vincular cuentas estudiantiles existentes y conservar correos institucionales pendientes por un máximo de 90 días.
- Mantener una bitácora relacional acotada y entregar un reporte JSON detallado al docente.

## Límites deliberados

No se restauran cuestionarios, bancos de preguntas, foros, intentos, calificaciones, entregas ni estados de interacción. CEOUBB no ejecuta SCORM dentro del portal en esta entrega y LTI 1.3 requiere un contrato separado de registro, claves, privacidad y ciclo de vida. Estos elementos aparecen como omisiones, nunca como contenido falsamente migrado.

## Presupuestos

| Recurso                |                             Límite |
| :--------------------- | ---------------------------------: |
| Respaldo comprimido    |                            250 MiB |
| Contenido expandido    |                            512 MiB |
| Entradas de archivo    |                             20.000 |
| XML individual         | 8 MiB / 100.000 nodos / 64 niveles |
| Archivo restaurable    |                             50 MiB |
| Nómina CSV             |                1 MiB / 5.000 filas |
| Lote API               |                      100 registros |
| Commit Firestore       |                     400 escrituras |
| Historial por consulta |                   50 importaciones |

## Evidencia de verificación

- Prueba focal Moodle: 10/10.
- `pnpm run verify:fast`: 237/237.
- `pnpm run verify:invariants`: 31/31.
- `pnpm test`: build Next.js 16 y 262/262 pruebas.
- TypeScript, ESLint, Prettier, Cloud Functions y OpenSpec estricto: limpios.
- Flujo relacional de inicio, pendiente e historial: smoke test local con migración generada.
- Interfaz: 1440×900 y 390×844, sin error overlay, errores de consola ni desbordamiento horizontal.

React Doctor conserva seis avisos revisados y deliberados por `await` secuencial. Los archivos se procesan uno por uno para acotar memoria; los lotes preservan orden y presión del backend; las mutaciones Turso se serializan dentro de transacciones.
