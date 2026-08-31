# Prueba de capacidad institucional P0.7

Este runbook ejecuta y conserva la evidencia de CEO-71 para la envolvente de 12.000 estudiantes, 15.000 identidades, 3.000 secciones, 72.000 matrículas y 3.000 sesiones concurrentes. La prueba sólo admite los recursos aislados de Staging y falla antes de escribir si cualquiera de los tres destinos no coincide con los identificadores canónicos.

## Resultado que se puede afirmar

Una ejecución `full` aprobada demuestra, para el intervalo y la versión desplegada indicados en el artefacto, que Staging sostuvo 3.000 sesiones autenticadas durante 30 minutos después de una rampa de 10 minutos. No convierte el resultado en SLA contractual, no demuestra producción y no cubre RPO/RTO; el simulacro de restauración corresponde a P0.8.

Una ejecución `smoke`, incompleta o fallida sólo valida el arnés o genera trabajo de remediación. Nunca se presenta como evidencia institucional aprobada.

La primera ejecución institucional aprobada es [CEO-71 del 2026-08-31](evidence/ceo-71-2026-08-31.md), respaldada por [GitHub Actions #33399710498](https://github.com/CEOUBB/CEOUBB/actions/runs/33399710498). Esa evidencia corresponde al hosting Vercel del commit probado; el arnés reutilizable apunta al staging vigente en Cloudflare y una repetición futura debe identificarse como evidencia separada.

## Arquitectura de la prueba

El workflow `Capacidad institucional en staging` reparte seis shards entre seis runners. Cada shard prepara 2.500 identidades, 2.000 estudiantes, 500 secciones, 12.000 matrículas y 500 usuarios virtuales activos. Los identificadores son deterministas y no se solapan entre shards; las escrituras son idempotentes y se agrupan en lotes máximos de 400. Después del smoke, todos esperan una barrera común derivada del inicio del mismo run; un shard que llegue con más de 15 segundos de atraso falla cerrado. Cada runner sostiene 31 minutos para garantizar al menos 30 minutos de superposición aun con el desfase admitido.

Cada sesión inicia con Firebase Auth y obtiene una sesión de aplicación real mediante `/api/auth/firebase`. El arnés exige exactamente 500 sesiones establecidas por shard. Los intentos iniciales fallidos se reintentan y se reportan como señal separada; sólo un 401/403 durante el trabajo posterior cuenta como error de autorización. Después mezcla:

- apertura del portal y APIs paginadas de identidad, matrículas y cursos en Cloudflare/Turso;
- consulta SQL directa y acotada a Turso para aislar su latencia;
- lectura de 20 avisos, libro de calificaciones, nota individual, certamen publicado y borrador en Firestore;
- actualización de un borrador de certamen existente en 10% de las acciones.

Los usuarios virtuales conservan la sesión y esperan entre 5 y 15 segundos entre acciones. Esto modela concurrencia humana sostenida y evita confundir el objetivo de sesiones simultáneas con un bucle de solicitudes sin tiempo de lectura.

## Salvaguardas

- `CONFIRM_STAGING` debe ser exactamente `STAGING_ONLY`.
- Cloudflare debe ser `https://staging.ceoubb.com`.
- Firebase debe ser `centro-de-estudio-ubb-staging`.
- Turso debe usar el host `ceoubb-staging`.
- Las contraseñas sintéticas se generan por ejecución, se guardan con permisos `0600`, no se publican como artefacto y se borran al terminar.
- Las cuentas se crean o actualizan a un máximo coordinado cercano a ocho mutaciones por segundo entre los seis shards, con reintento exponencial ante cuotas transitorias de Identity Platform.
- Email/password se habilita temporalmente sólo para las identidades sintéticas verificadas y se deshabilita en la consolidación.
- Los datos sintéticos persistentes llevan identificadores `load-*`; no contienen datos personales reales.

## Ejecución

Desde GitHub Actions, abrir `Capacidad institucional en staging`, elegir `smoke` o `full` y escribir `STAGING_ONLY`. La PR de la rama específica de CEO-71 inicia una ejecución `full` una vez para producir la primera evidencia. Las ejecuciones posteriores son manuales para evitar consumo accidental.

Antes de un `full` conviene ejecutar `smoke`. El perfil completo inicia en una barrera común 20 minutos después de crear el run y dura aproximadamente 42 minutos por shard: hasta 10 minutos de rampa, 31 minutos de meseta protectora y 30 segundos de salida, más consolidación.

Los prerequisitos del Environment `Staging` son:

- federación OIDC ya configurada para `github-staging-deployer@centro-de-estudio-ubb-staging.iam.gserviceaccount.com`;
- `TURSO_AUTH_TOKEN` de la base aislada;
- `STAGING_FIREBASE_API_KEY` de la aplicación web Firebase aislada;
- opcionalmente `TURSO_PLATFORM_API_TOKEN` y `TURSO_ORGANIZATION` para adjuntar el contador de uso de la API de Turso.

## Gates y consolidación

El consolidador suma conteos y sesiones, pero usa el peor p95/p99 de los seis shards. El resultado `PASS` exige:

- seis shards `full`, exactamente 3.000 sesiones autenticadas, 3.000 VU y superposición de meseta mínima de 1.800 segundos;
- p95 HTTP <= 2.000 ms y p99 <= 4.000 ms;
- HTTP 5xx < 0,1%, respuestas HTTP/transportes inesperadas < 0,1% y cero errores de autorización durante el trabajo autenticado;
- lecturas Firestore por apertura simulada <= 200;
- métricas de lecturas y escrituras entregadas por Cloud Monitoring;
- proyección anual <= CLP 1.000 por estudiante.

Cloud Monitoring puede retrasar los puntos hasta cuatro minutos. El recolector espera y reintenta antes de clasificar la telemetría como ausente. La falta de contadores del proveedor deja la evidencia incompleta y no se sustituye con estimaciones del cliente.

## Costo

La proyección conserva el modelo de `capacity-cost-baseline.md`: 12.000 estudiantes, 20 ventanas punta equivalentes por año, CLP 1.000/USD y 25% de contingencia. Sustituye el volumen anual supuesto de operaciones por las lecturas y escrituras observadas durante la carga, anualizadas a 20 ventanas, y mantiene USD 4.017 para hosting, Turso, almacenamiento, red y reservas no medidas en esta ejecución. Los créditos promocionales no reducen el run rate.

La latencia y el volumen de solicitudes Turso sí se informan directamente desde k6. Si existe un token de plataforma, también se adjunta el delta de usage Turso; su ausencia no inventa un contador.

## Artefactos y trazabilidad

Cada ejecución conserva durante 30 días:

- `capacity-summary-0.json` a `capacity-summary-5.json`;
- `telemetry.json` con contadores de proveedor;
- `capacity-evidence.json` para procesamiento automático;
- `capacity-evidence.md` para el dossier.

El reporte sanitizado de una ejecución institucional se copia a `docs/operations/evidence/` con la URL del run. Nunca se versionan tokens, contraseñas ni archivos `.capacity/`.

## Diagnóstico

- `CAPACITY_TARGET_REJECTED`: algún destino no es el Staging canónico; no flexibilizar el guardrail.
- `CAPACITY_CONFIG_INCOMPLETE`: falta un secreto o la confirmación exacta.
- `CAPACITY_AUTH_FAILED`: revisar permisos Identity Platform del service account y el dominio autorizado de Firebase.
- `CAPACITY_FIXTURE_FAILED`: revisar cuotas y esquemas de Turso/Firestore; los upserts permiten repetir el mismo shard.
- `INCOMPLETE`: faltó un shard o telemetría del proveedor; repetir sin declarar capacidad.
- `FAIL`: conservar el artefacto, abrir remediación y repetir con la misma envolvente, sin bajar la meta.
