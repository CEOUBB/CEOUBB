# Ambiente staging de CEOUBB

## Inventario canónico

| Recurso            | Staging                           | Producción                        |
| :----------------- | :-------------------------------- | :-------------------------------- |
| Firebase           | `centro-de-estudio-ubb-staging`   | `centro-de-estudio-ubb`           |
| Firestore          | `(default)`, `southamerica-west1` | `(default)`, `southamerica-west1` |
| Turso              | `ceoubb-staging`                  | `ceoubb`                          |
| Vercel             | `ceoubb-staging.vercel.app`       | Production (`ceoubb.com`)         |
| GitHub Environment | `Staging`                         | `Production`                      |

Staging no contiene una copia de producción. Su dataset ordinario usa cuatro identidades sintéticas, dos secciones y ocho matrículas deterministas. La carga de CEO-9 se genera por un proceso separado y nunca mediante el sembrado ordinario.

## Estado provisionado

- Firebase `centro-de-estudio-ubb-staging`: Firestore, Storage, Google Authentication y cuatro Cloud Functions activos en `southamerica-west1`.
- Turso `ceoubb-staging`: cinco migraciones aplicadas; el sembrado repetido converge a 4 usuarios, 2 secciones y 8 matrículas.
- Firestore staging: 24 documentos sintéticos deterministas verificados.
- GitHub `Staging`: federación OIDC activa y `TURSO_AUTH_TOKEN` cifrado en el Environment.
- Vercel Preview: alias estable `ceoubb-staging.vercel.app`, autorizado para OAuth en Firebase staging, con Firebase y Turso separados de los valores que conserva Production.

El primer token Turso emitido durante el provisionamiento fue revocado antes de usarse. Sólo el reemplazo instalado en GitHub y Vercel permanece vigente.

## Variables y secretos

Vercel Preview define las siete variables públicas `NEXT_PUBLIC_CEOUBB_ENVIRONMENT=staging` y `NEXT_PUBLIC_FIREBASE_*`, junto con `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` para `ceoubb-staging`. Vercel Production conserva únicamente valores productivos.

El GitHub Environment `Staging` guarda el secreto de Turso con acceso acotado:

- `TURSO_AUTH_TOKEN`: token dedicado a `ceoubb-staging`.

La URL no secreta de `ceoubb-staging` queda declarada en el workflow. Firebase no usa llaves JSON persistentes en staging. GitHub obtiene una credencial efímera mediante OIDC, limitada al repositorio `CEOUBB/CEOUBB`, al Environment `Staging` y a la cuenta `github-staging-deployer@centro-de-estudio-ubb-staging.iam.gserviceaccount.com`. `Production` conserva sus credenciales independientes y nunca comparte acceso con staging. Ningún valor secreto se copia a archivos versionados, logs o descripciones de PR.

## Flujo de publicación

1. Cada push a `main` invoca `.github/workflows/firebase-release.yml` con promoción desactivada.
2. El workflow verifica el commit, publica reglas, índices y Functions al alias `staging`, y ejecuta el sembrado.
3. Sólo después del éxito del mismo SHA continúa el despliegue web productivo ya existente.
4. Una promoción Firebase productiva se inicia manualmente con `promote_to_production=true`; el workflow vuelve a ejecutar staging y su job productivo depende de ese resultado.

Cada despliegue Preview actualiza el alias `ceoubb-staging.vercel.app`. Los comentarios de PR conservan además la URL inmutable de la versión para trazabilidad, pero el acceso funcional y los redireccionamientos OAuth usan siempre el alias autorizado.

Para validar o resembrar staging localmente con credenciales dedicadas:

```powershell
$env:CEOUBB_ENVIRONMENT = "staging"
$env:FIREBASE_PROJECT_ID = "centro-de-estudio-ubb-staging"
$env:TURSO_DATABASE_URL = "libsql://ceoubb-staging-<organizacion>.turso.io"
$env:TURSO_AUTH_TOKEN = "<token-staging>"
$env:FIREBASE_ACCESS_TOKEN = "<token-oauth-efimero>"
pnpm run staging:seed
```

La ejecución es idempotente. Cualquier identificador Firebase distinto al staging canónico o cualquier host Turso sin `ceoubb-staging` aborta antes de escribir.

## Rollback e incidentes

- Si staging falla, producción queda bloqueada y se corrige el mismo commit o uno posterior.
- Revertir el código no borra staging ni sus evidencias.
- Un error de fixture se corrige en el manifest y se vuelve a sembrar; no se copia producción para “arreglar” staging.
- Si el token Turso se expone, usar `Invalidate All Tokens` sólo en `ceoubb-staging`, emitir un reemplazo y actualizar GitHub `Staging` y Vercel Preview antes de reintentar.
- El borrado del proyecto, base o tokens es una operación destructiva separada, fuera del rollback normal.
- La capacidad, RPO y RTO continúan etiquetados como objetivos hasta completar P0.7/P0.8.
