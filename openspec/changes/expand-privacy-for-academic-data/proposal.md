## Why

Linear issue **CEO-11** (Urgent, milestone "1 · Antes de notas reales") blocks teachers from uploading real grades because the published privacy policy at `/privacidad` says nothing about official grades, enrollment rosters, academic progress, audit trails, or the rights students hold over that data. The page also omits two categories of personal data the platform already collects today: the client IP address stored in `grade_audit_logs.ip_address` and Sentry Session Replay recordings (`replaysSessionSampleRate: 0.1`, `replaysOnErrorSampleRate: 1.0`) of screens that will soon display real grades. Replay masking is not broken today — `@sentry/replay@10.70.0` defaults `maskAllText`, `maskAllInputs` and `blockAllMedia` to `true` — but `sentry.client.config.ts` states none of them, so the guarantee the policy is about to publish rests on an inherited library default that an SDK upgrade or a stray `unmask` option could silently flip.

Chile's Ley 21.719 (Protección de Datos Personales) enters into force in December 2026, four months from the effective date of this change; real grades will outlive that date, so the documents are written against Ley 21.719 from the start rather than against Ley 19.628 alone. Publishing text that promises retention limits or telemetry restraint the code does not enforce would be worse than the current silence, so this change ships the enforcing code alongside the documents.

## What Changes

- **Rewrite `/privacidad`** with a complete inventory of academic personal data (grades on the 1.0–7.0 scale, evaluations, weighted averages, enrollment and section rosters, progress, submissions, uploaded files, FCM tokens, sessions, grade audit trail including IP address), a stated legal basis, an explicit recipients list, a per-category retention table, and the rights recognised by Ley 21.719 (access, rectification, deletion, opposition, portability, blocking) with the procedure and response deadline to exercise them.
- **Disclose the owner audit access.** `firebase/firestore.rules` grants `role() == 'owner'` read access to `courses/{courseId}/grades/{userId}` across every section. This access is retained deliberately for institutional auditing and is now declared in the policy instead of being undocumented.
- **New `/terminos` page** (terms of use): independence disclaimer, eligibility limited to institutional domains, acceptable use, teacher responsibility over the grades they publish, the platform's non-official status relative to Moodle UBB and Adecca UBB, availability limits, and account suspension grounds. Linked from the portal footer and the sitemap alongside `/privacidad`.
- **Pin Sentry Session Replay masking explicitly** — `maskAllText`, `maskAllInputs` and `blockAllMedia` stated in `sentry.client.config.ts` rather than inherited from SDK defaults, and locked by a test, so the privacy guarantee survives dependency upgrades. The policy declares the telemetry that remains.
- **Enforce the grade audit IP retention promise** with a bounded purge that nulls `grade_audit_logs.ip_address` older than 12 months while preserving the score history the audit trail exists for, exposed as an authenticated cron route.
- **Replace the privacy contact** `elpapijuaco325@gmail.com` with `contacto@ceoubb.com` on the published page, removing a personal Gmail address from a user-facing surface.
- Add `/terminos` to `app/sitemap.xml/route.ts` and both legal links to the portal footer in `app/Portal.tsx`.

## Capabilities

### New Capabilities

- `legal/privacy-and-terms`: The published privacy policy and terms of use, the personal-data inventory and retention limits they promise, the data-subject rights procedure, the disclosed recipients of academic data, and the telemetry and retention controls in code that keep those promises true.

### Modified Capabilities

<!-- None. No existing requirement in openspec/specs/ changes behavior; grades arithmetic, query bounds, webhook verification, and skeleton behavior are untouched. -->

## Impact

**Code**

- `app/privacidad/page.tsx` — full rewrite of the document body.
- `app/terminos/page.tsx` — new route reusing the existing `.policy-page` shell in `app/globals.css`.
- `app/Portal.tsx` — footer legal links.
- `app/sitemap.xml/route.ts` — `/terminos` entry.
- `sentry.client.config.ts` — replay masking options.
- `lib/services/academic-catalog.ts` — bounded IP purge function beside the existing `gradeAuditLogs` writers.
- `app/api/cron/audit-retention/route.ts` — new authenticated cron route.
- `vercel.json` — cron schedule entry.
- `tests/privacy-terms.test.ts` — new locked test file.
- `package.json` (`verify:fast` test list) and `.agents/.test-hashes.json` regeneration for the new test file.

**Data**

- No schema migration. `grade_audit_logs.ip_address` stays nullable and the column set is unchanged, so `tests/academic-model.test.ts` assertions remain valid; only aged values are nulled.

**Operations**

- Requires `contacto@ceoubb.com` to exist and be monitored before deploy — the published deadline for rights requests depends on it.
- Requires `CRON_SECRET` in the Vercel environment for the new cron route.

**Non-goals**

- No self-service data export or account deletion endpoint. Rights requests are handled through the documented `contacto@ceoubb.com` procedure; Ley 21.719 requires a channel and a deadline, not a button. Revisit if request volume makes manual handling impractical.
- No data processing agreement with Universidad del Bío-Bío. The platform remains independent and the documents state so; a formal institutional agreement is a separate governance track.
- No cookie or consent banner. The platform sets no advertising or third-party tracking cookies, so a banner would be theatre.
- No change to who may _write_ grades: `firebase/firestore.rules` keeps writes limited to the section's teacher.
- No changes to `SECURITY.md` or the ADR files that reference the old address; those are internal governance documents, not user-facing surfaces, and are out of this change's scope.
- No internationalisation. Both documents ship in Spanish only.
