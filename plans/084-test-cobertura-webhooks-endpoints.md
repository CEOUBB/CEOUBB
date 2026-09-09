# Plan 084: Cobertura de Integración en Route Handlers de Webhooks (Linear y GitHub)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 8a0d7eb..HEAD -- app/api/webhooks/linear/route.ts app/api/webhooks/github/route.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `8a0d7eb`, 2026-09-09

## Why this matters

Las rutas de API `app/api/webhooks/linear/route.ts` y `app/api/webhooks/github/route.ts` gestionan la recepción de eventos externos y despachan alertas al equipo en Discord.
Aunque existen pruebas para las firmas criptográficas en `tests/linear-webhook.test.ts` y `tests/github-webhook.test.ts`, los Route Handlers `POST(request)` en Next.js tienen **0% de cobertura directa**. Casos como ausencia de secretos en el entorno (404/500), firmas manipuladas (401), cuerpos no JSON (400) y timestamps caducados (replay attacks, 401) no están verificados en la capa HTTP.

## Current state

- Relevant files:
  - `app/api/webhooks/linear/route.ts` — Endpoint POST receptor de webhooks de Linear (174 líneas, 0% coverage directo).
  - `app/api/webhooks/github/route.ts` — Endpoint POST receptor de webhooks de GitHub Actions (85 líneas, 0% coverage directo).
  - `tests/webhook-routes.test.ts` — Nuevo archivo de pruebas de integración HTTP a crear.

Fragmento de código a probar (`app/api/webhooks/linear/route.ts:5-38`):
```ts
export async function POST(request: Request) {
  try {
    const linearWebhookSecret = process.env.LINEAR_WEBHOOK_SECRET;
    if (!linearWebhookSecret) {
      return new Response(null, { status: 404 });
    }
    const discordWebhookUrl = process.env.DISCORD_LINEAR_WEBHOOK_URL;
    if (!discordWebhookUrl) {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }
    const rawBody = await request.text();
    if (!verifyLinearSignature(rawBody, request.headers.get("linear-signature"), linearWebhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    ...
```

## Commands you will need

| Purpose   | Command                                                                                   | Expected on success |
|-----------|-------------------------------------------------------------------------------------------|---------------------|
| Run test  | `node --experimental-strip-types --test tests/webhook-routes.test.ts`                    | all pass            |
| Fast gate | `pnpm run verify:fast`                                                                    | exit 0              |
| Format    | `pnpm run format`                                                                         | exit 0              |

## Scope

**In scope**:
- `tests/webhook-routes.test.ts` (create)
- `package.json` (añadir al script `test`)
- `.agents/.test-hashes.json` (actualizar sellado con `node scripts/verify-test-hashes.mjs --generate`)

**Out of scope**:
- No modificar el código de producción de `app/api/webhooks/linear/route.ts` ni `app/api/webhooks/github/route.ts`.

## Git workflow

- Match Conventional Commits: `test(webhooks): agregar pruebas de integracion para endpoints linear y github (#084)`

## Steps

### Step 1: Crear `tests/webhook-routes.test.ts`

Crear la suite de pruebas usando la API estándar `Request` y mockeando `globalThis.fetch` para capturar llamadas hacia Discord.

La suite debe verificar:
1. `POST /api/webhooks/linear`:
   - Responde 404 si `LINEAR_WEBHOOK_SECRET` no está definido.
   - Responde 500 si `DISCORD_LINEAR_WEBHOOK_URL` no está definido.
   - Responde 401 si la cabecera `linear-signature` no coincide con HMAC-SHA256 del cuerpo.
   - Responde 400 si el payload no es un JSON válido.
   - Responde 401 si `webhookTimestamp` tiene más de 60 segundos de antigüedad (defensa contra replay attacks).
   - Responde 200 con `{ message: "No data payload" }` si falta el campo `data`.
   - Procesa un evento de `Issue` válido con firma auténtica y timestamp actual, despachando el mensaje a Discord con código 200.
2. `POST /api/webhooks/github`:
   - Responde 404 si `GITHUB_WEBHOOK_SECRET` no está definido.
   - Responde 500 si `DISCORD_CI_ALERTS_WEBHOOK_URL` no está definido.
   - Responde 401 si `x-hub-signature-256` es inválida o ausente.
   - Responde 400 si el payload es JSON malformado.
   - Responde 200 ignorando eventos que no sean `workflow_run` fallido (`conclusion != "failure"`).
   - Procesa un fallo de CI legítimo, notificando a Discord con código 200.

**Verify**: `node --experimental-strip-types --test tests/webhook-routes.test.ts` → exit 0, todos los tests pasan.

### Step 2: Registrar en `package.json` y regenerar hash

1. Añadir `tests/webhook-routes.test.ts` a `package.json` en `"test"`.
2. Ejecutar `node scripts/verify-test-hashes.mjs --generate`.
3. Ejecutar `pnpm run verify:fast`.

**Verify**: `pnpm run verify:fast` → exit 0.

## Test plan

- Ejecutar `node --experimental-strip-types --test --experimental-test-coverage tests/webhook-routes.test.ts` y corroborar que las rutas de webhook alcanzan >90% de cobertura.

## STOP conditions

- Asegurar que las variables de entorno alteradas en cada prueba (`process.env.LINEAR_WEBHOOK_SECRET`, etc.) se limpien o restauren al finalizar el test para no contaminar tests subsecuentes.
