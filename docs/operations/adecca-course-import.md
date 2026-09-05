# Importación local de materiales ADECCA

## Alcance

CEOUBB no se conecta a ADECCA ni solicita RUT, contraseña, cookies, tokens o claves API. El flujo recibe archivos que el docente descargó y organizó en su propio dispositivo. El paquete original se analiza localmente y no se conserva: sólo se suben los archivos compatibles que el docente confirma.

ADECCA no documenta un respaldo portátil equivalente a `.mbz`. Por eso esta herramienta se presenta como importador de materiales locales y no como restauración integral o conexión oficial.

Mientras no exista autorización institucional escrita, las pruebas y revisiones deben usar únicamente contenido y cuentas sintéticas.

## Formatos aceptados

- ZIP con carpetas y archivos académicos pasivos, hasta 250 MiB comprimidos.
- JSON con un `adecca-manifest.json` versión 1 para contenido descriptivo y enlaces.
- CSV UTF-8 con correos estudiantiles institucionales, hasta 1 MiB y 5.000 filas.

Los adjuntos admitidos coinciden con Storage: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, PNG, JPEG, WEBP, TXT, CSV y ZIP. Se comprueban extensión, MIME y firma; TXT/CSV sensibles se omiten. Los documentos binarios no se inspeccionan para detectar datos personales: revise su contenido antes de seleccionarlos.

Un ZIP puede incluir opcionalmente `adecca-manifest.json` en su raíz. Un JSON independiente no puede adjuntar binarios.

## Preparar un ZIP

Una estructura sencilla preserva mejor las unidades:

```text
Curso.zip
├── Programa.pdf
├── Guia didactica.pdf
├── descripcion.html
├── Unidad 1/
│   ├── README.md
│   ├── Apuntes.pdf
│   └── Ejercicios.docx
└── Unidad 2/
    └── Presentacion.pptx
```

- Cada carpeta se convierte en una unidad acotada.
- `README.md`, `README.txt`, `descripcion.html` y `descripcion.htm` aportan contenido descriptivo saneado.
- Programa y guía didáctica se clasifican como guías.
- Los demás archivos permitidos se publican como recursos.
- Los enlaces HTTP o HTTPS se conservan como vínculos; CEOUBB nunca descarga su destino.

No incluya ejecutables, JavaScript, formularios, iframes, entregas, notas, intentos, conversaciones, logs o datos personales innecesarios. El analizador rechaza rutas inseguras, archivos cifrados, CRC inválido y paquetes que exceden sus presupuestos.

## Manifiesto opcional

```json
{
  "format": "ceoubb-adecca-package",
  "version": 1,
  "source": {
    "courseId": "curso-sintetico-2026",
    "courseName": "Curso sintético de demostración",
    "courseShortName": "DEMO-1",
    "adeccaVersion": "local"
  },
  "items": [
    {
      "sourceId": "bienvenida",
      "title": "Bienvenida",
      "kind": "notice",
      "folder": "Inicio",
      "body": "Contenido sintético para revisión."
    },
    {
      "sourceId": "programa",
      "title": "Programa",
      "kind": "guide",
      "filePath": "Programa.pdf"
    }
  ],
  "participants": [
    {
      "sourceUserId": "estudiante-sintetica-1",
      "email": "estudiante.sintetica@alumnos.ubiobio.cl",
      "role": "student"
    }
  ]
}
```

Las credenciales o secretos en claves o valores invalidan el manifiesto. Se redactan correos/RUT de metadatos descriptivos y se omiten enlaces inseguros o alojados en ADECCA. `filePath` debe apuntar a una ruta relativa presente en el mismo ZIP. Cuando se declara `sha256`, debe coincidir con el archivo completo.

## Importar en una sección

1. Abra un ramo con período académico abierto usando una cuenta owner, docente o coordinadora activa.
2. Seleccione **Importar ADECCA** en el encabezado.
3. Elija el ZIP, JSON o CSV local y revise origen, unidades, publicaciones, archivos, bytes, estudiantes y omisiones.
4. Active **Importar participantes** sólo si corresponde; viene desactivado por defecto.
5. Pulse **Importar en esta sección** y mantenga la ventana abierta hasta recibir el resultado.
6. Descargue el reporte JSON para conservar el detalle de omisiones o fallas parciales.

Reimportar el mismo paquete actualiza documentos deterministas y no duplica archivos cuyo tamaño y SHA-256 completo coinciden. Nunca elimina material histórico que ya no esté presente ni envía notificaciones a estudiantes.

## Límites y retención

| Recurso              |              Límite |
| :------------------- | ------------------: |
| ZIP comprimido       |             250 MiB |
| Contenido expandido  |             512 MiB |
| Entradas de archivo  |              20.000 |
| Archivo individual   |              50 MiB |
| JSON                 |               8 MiB |
| CSV                  | 1 MiB / 5.000 filas |
| Lote API             |       100 registros |
| Escrituras Firestore |      400 por commit |
| Matrícula pendiente  |             90 días |

Una matrícula pendiente conserva solamente correo institucional, sección, rol estudiantil y fechas técnicas. Si la cuenta no inicia sesión dentro de 90 días, queda disponible para purga.

La purga diaria procesa como máximo 5.000 pendientes vencidos por proveedor y ejecución. Cloudflare la programa a las 05:30 UTC; Vercel conserva su endpoint de cron existente. `CRON_SECRET` debe estar configurado en el entorno desplegado y las ejecuciones deben supervisarse: las filas vencidas nunca conceden acceso aunque una purga se retrase.

## Despliegue y recuperación

Aplique `drizzle/0013_importacion_adecca.sql` después de todas las migraciones anteriores y antes de habilitar la nueva versión. La entrega se realiza como PR; no aplica migraciones ni despliega producción automáticamente.

Cada trabajo queda asociado a sección, paquete, actor y plan. Los reintentos del mismo actor con el mismo paquete y selección de estudiantes retoman la ejecución; cada lote lleva un token emitido por el servidor y el resultado se calcula a partir de registros aplicados únicos. Un lote concurrente devuelve conflicto; un bloqueo interrumpido puede recuperarse después de diez minutos al reintentar el lote. Una ejecución finalizada no admite más escrituras y su siguiente importación obtiene un token nuevo.

Cancelar detiene nuevas operaciones, pero no revierte contenido ya publicado. Reintente con la misma cuenta, paquete y opción de estudiantes para recuperar una ejecución interrumpida. Las cargas ya terminadas pueden dejar archivos sin publicación si se cancela antes del lote; reimportar con otra cuenta también puede dejar el blob anterior. Esta versión no elimina automáticamente esos archivos ni preserva un historial independiente por cada reintento: mantiene el último trabajo por sección y huella. La limpieza de archivos huérfanos requiere revisión administrativa de referencias.

## Diagnóstico

- **Paquete inválido:** vuelva a comprimir una carpeta limpia, sin accesos directos ni rutas absolutas.
- **Archivo omitido:** revise la extensión, el tamaño y el hash indicado en el reporte.
- **Sección de solo lectura:** el período está cerrado o archivado; no se permite importar.
- **Permisos insuficientes:** confirme que su matrícula docente o de coordinación está activa en esa sección.
- **Resultado parcial:** descargue el reporte, corrija únicamente los elementos fallidos y reimporte; el proceso es idempotente.

El contrato completo y sus escenarios verificables están en `docs/specs/p22-adecca-course-import.md`.
