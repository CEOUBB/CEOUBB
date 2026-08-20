Requirement traceability markers used in this change, one per spec requirement in `specs/legal/privacy-and-terms/spec.md`:

| Marker        | Requirement                                          |
| :------------ | :--------------------------------------------------- |
| `REQ-PRIV-01` | Academic Personal Data Inventory Disclosure          |
| `REQ-PRIV-02` | Recipient and Access Disclosure for Academic Data    |
| `REQ-PRIV-03` | Legal Basis and Institutional Independence Statement |
| `REQ-PRIV-04` | Per-Category Retention Disclosure                    |
| `REQ-PRIV-05` | Data Subject Rights Procedure                        |
| `REQ-PRIV-06` | Published Terms of Use                               |
| `REQ-PRIV-07` | Session Recording Must Not Capture Academic Content  |
| `REQ-PRIV-08` | Enforced Erasure of Aged Audit IP Addresses          |

## 1. Deploy Prerequisites

- [x] 1.1 Confirm the mailbox `contacto@ceoubb.com` exists on the `ceoubb.com` domain and reaches a monitored recipient. Blocks every task in group 6 — the rights procedure publishes a response deadline against this address. Verify by sending a message and receiving it.
- [x] 1.2 Set `CRON_SECRET` in the Vercel project environment (production and preview). Verify with `pnpm dlx vercel env ls`.

## 2. Failing Tests (RED)

- [x] 2.1 Create `tests/privacy-terms.test.ts` reading `app/privacidad/page.tsx`, `app/terminos/page.tsx`, `app/Portal.tsx`, `app/sitemap.xml/route.ts` and `sentry.client.config.ts` as text, with assertions for: the contact address is `contacto@ceoubb.com` (REQ-PRIV-05); no address outside `ceoubb.com`, `alumnos.ubiobio.cl` or `ubiobio.cl` appears on either legal page (REQ-PRIV-05); the privacy page names grades on the 1.0–7.0 scale, enrollments, submissions, push tokens and the grade audit trail with its IP address (REQ-PRIV-01); it names the owner, the section teacher and the student as the readers of grades (REQ-PRIV-02); it cites Ley 21.719 and states the grades are not the official university record (REQ-PRIV-03); it states the 12-month audit-IP bound (REQ-PRIV-04); it lists access, rectification, deletion, opposition, portability and blocking with a response deadline (REQ-PRIV-05); the terms page states institutional-domain eligibility and teacher responsibility for published grades (REQ-PRIV-06); the footer and the sitemap both link `/privacidad` and `/terminos` (REQ-PRIV-06); and `sentry.client.config.ts` passes `maskAllText`, `maskAllInputs` and `blockAllMedia` as literal `true` (REQ-PRIV-07).
- [x] 2.2 Add pure-function assertions for the retention cutoff helper in the same file (REQ-PRIV-08): an entry timestamped 13 months ago is eligible, one timestamped 11 months ago is not, and the batch limit is a finite positive integer.
- [x] 2.3 Register `tests/privacy-terms.test.ts` in the `verify:fast` script list in `package.json`.
- [x] 2.4 Run `pnpm run verify:fast` and confirm the new assertions fail for the right reason (missing files and missing text), not on a syntax or import error.

## 3. Data Layer

- [x] 3.1 Add `purgeAgedAuditIpAddresses` to `lib/services/academic-catalog.ts` beside the existing `gradeAuditLogs` writers, marked `// Implements: REQ-PRIV-08`. It takes an explicit cutoff timestamp and a batch limit, issues one `UPDATE grade_audit_logs SET ip_address = NULL WHERE timestamp < cutoff AND ip_address IS NOT NULL` bounded by `.limit()`, and returns the number of rows affected. No schema change and no row deletion.
- [x] 3.2 Export the retention window (12 months) and the batch limit as named constants from the same module so the cron route and the tests read one definition.
- [x] 3.3 Run `pnpm run typecheck` and confirm exit code 0 with no `any`, no `@ts-ignore` and no unsafe assertion.

## 4. API Route

- [x] 4.1 Create `app/api/cron/audit-retention/route.ts`, marked `// Implements: REQ-PRIV-08`, exporting `dynamic = "force-dynamic"`. It compares the `Authorization` header against `Bearer ${process.env.CRON_SECRET}` in constant time, returns HTTP 401 with a structured JSON error and no mutation when the credential is absent or wrong, and otherwise calls `purgeAgedAuditIpAddresses` and returns `{ purged: <count> }`.
- [x] 4.2 Fail closed when `CRON_SECRET` is unset in the environment: respond 401, never treat a missing secret as an open door.
- [x] 4.3 Add the daily schedule for `/api/cron/audit-retention` to the `crons` array in `vercel.json`.

## 5. Telemetry

- [x] 5.1 Pass `maskAllText: true`, `maskAllInputs: true` and `blockAllMedia: true` explicitly to `Sentry.replayIntegration()` in `sentry.client.config.ts`, marked `// Implements: REQ-PRIV-07`, with a short comment stating that these are published privacy guarantees and must not be removed on an SDK upgrade.

## 6. Legal Documents

- [x] 6.1 Rewrite the body of `app/privacidad/page.tsx` in Spanish inside the existing `.policy-page` shell, keeping it a server component with no client interactivity, and update the "Vigente desde" date. Sections: alcance e independencia institucional (REQ-PRIV-03), datos que guardamos (REQ-PRIV-01), para qué los usamos, quién puede verlos (REQ-PRIV-02), por cuánto tiempo (REQ-PRIV-04), proveedores y telemetría (REQ-PRIV-01, REQ-PRIV-07), tus derechos y cómo ejercerlos (REQ-PRIV-05), contacto. Carry the `// Implements:` markers for each requirement the file satisfies, and keep the existing `REQ-DELIB-08` marker.
- [x] 6.2 In the "quién puede verlos" section, state plainly that the platform administrator can read the grades of any section for auditing, that a teacher reads only their own sections, and that a student reads only their own record (REQ-PRIV-02). Do not soften it into a generic "personal autorizado".
- [x] 6.3 In the retention section, state the 12-month bound on the audit IP address and that the score history itself is preserved (REQ-PRIV-04), using the same number as the constant from task 3.2.
- [x] 6.4 Replace the contact address with `contacto@ceoubb.com` and state the maximum response window for rights requests and what a request must contain to identify the requester (REQ-PRIV-05). Route grade rectification to the section teacher, noting the correction is recorded in the audit trail.
- [x] 6.5 Create `app/terminos/page.tsx` as a server component reusing the `.policy-page` shell and the `policy-brand` link, marked `// Implements: REQ-PRIV-06`: independencia respecto de la Universidad del Bío-Bío y de Moodle UBB / Adecca UBB, quién puede usar la plataforma (dominios institucionales), uso aceptable, responsabilidad del docente sobre las notas que publica, ausencia de garantía de disponibilidad, causales de suspensión de cuenta, y enlace cruzado a `/privacidad`.
- [x] 6.6 Add `/terminos` beside `/privacidad` in the footer `legal-note` paragraph of `app/Portal.tsx` (REQ-PRIV-06).
- [x] 6.7 Add the `/terminos` `<url>` entry to `app/sitemap.xml/route.ts` with the same `yearly` changefreq and `0.5` priority as `/privacidad` (REQ-PRIV-06).
- [x] 6.8 Apply `.num` (`font-variant-numeric: tabular-nums lining-nums`) to any inline numeral in the retention text, per the project's data-and-numerals rule. Add no new CSS beyond what `.policy-page` already provides.
  - **Desviación deliberada:** el "sin CSS nuevo" no se cumplió. `.policy-page` se extendió con reglas para `h3`, listas, índice numerado y una rejilla `dl` de término/regla. Un documento legal de ocho secciones se consulta buscando una cláusula, y sin índice ni rejilla la retención por categoría quedaba en prosa corrida. Las reglas son de `.policy-page`, no chrome por ruta, así que ambas páginas las comparten y el diseño sigue siendo el incumbente.

## 7. Verification

- [x] 7.1 Run `pnpm run verify:fast` and confirm every assertion from group 2 now passes (GREEN), with zero assertions weakened or removed.
- [x] 7.2 Regenerate the Test-Locking snapshot with `node scripts/verify-test-hashes.mjs --generate`, then re-run `node scripts/verify-test-hashes.mjs --check` and confirm it reports no untracked or mismatched file.
- [x] 7.3 Run `pnpm run verify:invariants` and confirm the security invariants and Firebase rules still validate.
- [x] 7.4 Run `pnpm run lint` and `pnpm test` and confirm exit code 0 with zero warnings.
- [x] 7.5 Read `/privacidad` and `/terminos` at 375px and 1280px and confirm no horizontal overflow and no layout regression against the existing `.policy-page` responsive rules.
- [ ] 7.6 After deploy, call `/api/cron/audit-retention` without the credential and confirm HTTP 401 with no mutation, then with the credential and confirm a `{ purged: <count> }` response.
- [ ] 7.7 Update `PLAN.md` with the handoff notes, then move Linear CEO-11 to done and unblock real grade uploads.
