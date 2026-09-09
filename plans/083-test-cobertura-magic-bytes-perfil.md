# Plan 083: Cobertura de Seguridad en Magic Bytes y Preferencias de Usuario

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 8a0d7eb..HEAD -- lib/services/user-profile.ts`
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

`lib/services/user-profile.ts` contiene la función defensiva `detectImageMagicBytes` (REQ-SEC-12, REQ-CFG-02) que examina firmas binarias en subida de avatares para evitar la inyección de archivos ejecutables, scripts o binarios políglotas con extensiones simuladas. Además, maneja la lectura (`readPreferencesFromFirestore`) y proyección (`writePreferencesToFirestore`, `projectUserPhotoToFirestore`) de configuración de usuario.
Actualmente esta lógica crítica de seguridad y proyección carece de pruebas unitarias exhaustivas sobre buffers binarios límite y degradaciones ante fallos en Firestore (cobertura actual del archivo: 43.8%).

## Current state

- Relevant files:
  - `lib/services/user-profile.ts` — Detección binaria de imágenes, gestión de Storage y proyección Firestore.
  - `tests/user-profile-magic-bytes.test.ts` — Nueva suite de pruebas unitarias a crear.

Fragmento de código a probar (`lib/services/user-profile.ts:93-133`):
```ts
export function detectImageMagicBytes(
  buffer: ArrayBuffer
): "image/jpeg" | "image/png" | "image/webp" | null {
  if (!buffer || buffer.byteLength < 12) return null;
  const bytes = new Uint8Array(buffer.slice(0, 12));
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // WebP: RIFF (bytes 0-3) .... WEBP (bytes 8-11)
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}
```

## Commands you will need

| Purpose   | Command                                                                                   | Expected on success |
|-----------|-------------------------------------------------------------------------------------------|---------------------|
| Run test  | `node --experimental-strip-types --test tests/user-profile-magic-bytes.test.ts`          | all pass            |
| Fast gate | `pnpm run verify:fast`                                                                    | exit 0              |
| Format    | `pnpm run format`                                                                         | exit 0              |

## Scope

**In scope**:
- `tests/user-profile-magic-bytes.test.ts` (create)
- `package.json` (añadir a la lista del script `test`)
- `.agents/.test-hashes.json` (actualizar sellado con `node scripts/verify-test-hashes.mjs --generate`)

**Out of scope**:
- No modificar `lib/services/user-profile.ts`.
- No alterar endpoints ni esquemas existentes.

## Git workflow

- Match Conventional Commits: `test(profile): agregar pruebas de magic bytes y persistencia de perfil (#083)`

## Steps

### Step 1: Crear `tests/user-profile-magic-bytes.test.ts`

Crear la suite de pruebas unitarias con `node:test` y `node:assert/strict` cubriendo:
1. `detectImageMagicBytes`:
   - PNG válido: buffer con `[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...]` retorna `"image/png"`.
   - JPEG válido: buffer con `[0xff, 0xd8, 0xff, 0xe0, ...]` retorna `"image/jpeg"`.
   - WebP válido: buffer con `'RIFF'` en offset 0..3 y `'WEBP'` en offset 8..11 retorna `"image/webp"`.
   - Rechazo de buffer nulo o < 12 bytes: retorna `null`.
   - Rechazo de formatos no admitidos: GIF (`GIF89a`), PDF (`%PDF`), HTML (`<!DOCTYPE`), ejecutable (`MZ`).
   - Rechazo de cabeceras corruptas: `'RIFF'` sin `'WEBP'` (ej. audio WAV) retorna `null`.
2. `readPreferencesFromFirestore`:
   - Valida rechazo ante `userId` malformado (segmento de ruta inválido).
   - Valida degradación suave retornando `defaultPreferences()` ante 404 o fallo de red simulado en `fetch`.
3. `projectUserPhotoToFirestore` y `writePreferencesToFirestore`:
   - Valida que arrojen error si `userId` contiene caracteres de escape o recorrido de ruta.

**Verify**: `node --experimental-strip-types --test tests/user-profile-magic-bytes.test.ts` → exit 0, todos los tests pasan.

### Step 2: Registrar en `package.json` y regenerar hash

1. Añadir `tests/user-profile-magic-bytes.test.ts` al script `"test"` de `package.json`.
2. Ejecutar `node scripts/verify-test-hashes.mjs --generate`.
3. Ejecutar `pnpm run verify:fast`.

**Verify**: `pnpm run verify:fast` → exit 0.

## Test plan

- Ejecutar `node --experimental-strip-types --test --experimental-test-coverage tests/user-profile-magic-bytes.test.ts` y verificar que las líneas no cubiertas de `detectImageMagicBytes` bajan a 0.

## STOP conditions

- Si se requiere simular `globalThis.fetch` para `readPreferencesFromFirestore`, guardar la referencia original y restaurarla en un bloque `try/finally` o hook de limpieza `test.afterEach`.
