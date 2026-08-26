## 1. Validation foundation (Zod)

- [x] 1.1 `pnpm add zod`. Owner-authorized dependency; record it in `PLAN.md` handoff notes alongside the reason.
- [x] 1.2 Create `lib/support-request.ts` with `CATEGORIAS_SOPORTE`, `solicitudSoporteSchema` and the inferred `SolicitudSoporte` type exactly as specified in `design.md` D4. Mark `// Implements: REQ-SUP-01`.
- [x] 1.3 Create `tests/support-request.test.ts` covering every field bound, trimming, lower-casing of the email, rejection of an unknown category, and rejection of a populated honeypot. Register it in the three script lists in `package.json` (`test`, `test:unit`, `verify:fast`).
- [x] 1.4 Migrate `app/api/admin/users/route.ts` query-parameter parsing to a Zod schema, preserving today's behavior exactly: page defaults to 1 and floors at 1, limit defaults to 50 and clamps to 1..100, `q` trims and truncates to 100 characters, and the `LIKE` escaping of `%`, `_` and `\` is unchanged. Mark `// Implements: REQ-SUP-01`.
- [x] 1.5 Run `tests/admin-api.test.ts` and confirm it passes unmodified. Do not touch a single assertion; if it fails, the migration is wrong.
- [x] 1.6 Run `pnpm run verify:fast` and `node scripts/verify-test-hashes.mjs --check` before continuing. Nothing below depends on unverified validation.

## 2. Persistence

- [x] 2.1 Add `solicitudesSoporte` to `db/schema.ts` per `design.md` D8, with both composite indexes. Mark `// Implements: REQ-SUP-07, REQ-SUP-10`.
- [x] 2.2 Generate the Drizzle migration into `drizzle/` and verify it is purely additive: no existing table altered, no backfill.
- [x] 2.3 Create `lib/services/support-requests.ts` exposing `registrarSolicitud()`, `marcarEntregada()`, `marcarFallida()` and `contarSolicitudesRecientes()`. Every read carries an explicit `.limit()` and is served by an index. Mark `// Implements: REQ-SUP-04, REQ-SUP-07, REQ-SUP-10`.
- [x] 2.4 Implement the IP hashing helper as `SHA-256(ip + SOPORTE_IP_PEPPER)` using `node:crypto`. The raw address must not be persisted, logged or forwarded anywhere. Mark `// Implements: REQ-SUP-05`.

## 3. Delivery seam

- [x] 3.1 Create `lib/services/support-mail.ts` exporting `enviarCorreoSoporte(solicitud): Promise<{ entregado: boolean; error?: string }>`, with the driver chosen by `SOPORTE_MAIL_DRIVER` and defaulting to the no-op driver when unset. Mark `// Implements: REQ-SUP-08, REQ-SUP-09`.
- [x] 3.2 Implement the `brevo` driver as a plain `fetch` POST to `https://api.brevo.com/v3/smtp/email` with the `api-key` header. No vendor SDK. Send `textContent` only and never `htmlContent`, so the no-HTML guarantee is structural. Set `sender` to the configured address, `to` to `contacto@ceoubb.com`, and `replyTo` to the submitter. Mark `// Implements: REQ-SUP-08`.
- [x] 3.3 Make every failure path return `{ entregado: false, error }` with a message that never contains the API key. Treat any non-2xx response and any thrown network error alike.
- [x] 3.4 Create `tests/support-mail.test.ts` covering the no-op default, a successful `brevo` send, a provider error, the absence of `htmlContent` in the payload, and the `sender` / `replyTo` split. Register it in the three `package.json` script lists.

## 4. API route

- [x] 4.1 Create `app/api/soporte/route.ts`. Order of operations is fixed and each step must short-circuit: content-type and 8 KB body bound, schema parse, honeypot, minimum three-second dwell, rate-limit count, insert, deliver, update state. Mark `// Implements: REQ-SUP-01, REQ-SUP-02, REQ-SUP-03, REQ-SUP-04, REQ-SUP-06, REQ-SUP-07`.
- [x] 4.2 Derive the declared role with `roleForEmail()` from `lib/access-policy.ts`. Do not write a domain regular expression anywhere in this change. Never reject on domain. Mark `// Implements: REQ-SUP-06`.
- [x] 4.3 Attach `userId` when a valid session cookie is present, using `getSessionUser()`, and proceed normally when it is absent.
- [x] 4.4 Return 201 on delivered, 202 on received-but-undelivered, 400 on validation failure, 413 on oversized body, 429 on rate limit. Honeypot and dwell rejections return a response indistinguishable from acceptance.
- [x] 4.5 Create `tests/support-api.test.ts` covering each status code, the honeypot and dwell silent rejections, the cross-instance rate limit behavior, persistence before delivery, the `fallido` path leaving the row intact, and the absence of the raw IP in the stored row. Register it in the three `package.json` script lists.

## 5. Shared styles

- [x] 5.1 Add to `app/globals.css`, scoped under `.policy-page`: `.policy-form`, `.policy-field`, `.policy-field-error`, `.policy-field-note`, `.policy-disclosure`, `.policy-filter`, `.policy-empty`, `.policy-confirm`. Every value comes from `DESIGN.md`; introduce no new token.
- [x] 5.2 Inputs and the textarea: white surface, 1px `{colors.hairline}` border, `{rounded.xs}` 4px radius, `Manrope` at `{typography.body-sm}`. Do not use a pill radius on a form control.
- [x] 5.3 Submit control: `{rounded.full}` pill in `{colors.primary}` with the `{colors.primary-active}` press state, minimum 44x44px touch target, and a visible disabled state.
- [x] 5.4 Focus ring in `{colors.primary}` on every interactive element, meeting AA contrast against both the white surface and the paper canvas.
- [x] 5.5 Disclosure motion: `interpolate-size: allow-keywords` with a 140 ms transition on `block-size` and `opacity` via `::details-content`. Name the two properties explicitly; `transition: all` is banned. Mark `// Implements: REQ-HELP-10`.
- [x] 5.6 Wrap every transition added here in `@media (prefers-reduced-motion: reduce)` set to none.
- [x] 5.7 Apply `lining-nums tabular-nums` to the FAQ result counter.

## 6. `/faq`

- [x] 6.1 Write `app/faq/faq-content.ts` as a typed array of five categories with stable slugs: institutional accounts and access, courses and sections, grades and the weighted average, study library, mobile application and notifications. Mark `// Implements: REQ-HELP-06`.
- [x] 6.2 Write the answers in Spanish. **No em dashes anywhere in a question or an answer.** Restructure with a full stop, a comma, a colon or parentheses instead. Verify with a grep for the character before marking this done.
- [x] 6.3 Verify every factual claim against its source before writing it: the grades answer against `lib/grades.ts`, the access answer against `lib/access-policy.ts`, the mobile answer against the Capacitor configuration, and the independence disclaimer against `/terminos`. Invent nothing.
- [x] 6.4 Build `app/faq/page.tsx` as a Server Component on the `.policy-page` chrome, with the category index reusing `.policy-index`, and every question as a `<details id="{slug}">`. No `name` attribute; multiple questions stay open at once. Mark `// Implements: REQ-HELP-01, REQ-HELP-06`.
- [x] 6.5 Build `app/faq/FaqBrowser.tsx` as the client component: debounced filter over question and answer text, result count in a polite live region, matches auto-expanded, and an empty state routing to `/contacto`. Mark `// Implements: REQ-HELP-07`.
- [x] 6.6 Confirm every question and answer is present in the server-rendered HTML, so the page is complete without JavaScript.
- [x] 6.7 Open a targeted question on load from the URL fragment, and scroll it into view. Mark `// Implements: REQ-HELP-08`.
- [x] 6.8 Close the page with a route to `/contacto`. Mark `// Implements: REQ-HELP-09`.

## 7. `/contacto`

- [x] 7.1 Build `app/contacto/page.tsx` as a Server Component on the `.policy-page` chrome. No hero band, no eyebrow above the `h1`, no feature grid. Mark `// Implements: REQ-HELP-01`.
- [x] 7.2 Publish the contact channels as a definition list with `contacto@ceoubb.com` as a live `mailto:` link, the response commitment matching `/accesibilidad` word for word in substance, and the independence disclaimer. Mark `// Implements: REQ-HELP-02`.
- [x] 7.3 Place a route to `/faq` above the form, so self-service is offered before a message is written. Mark `// Implements: REQ-HELP-09`.
- [x] 7.4 Build `app/contacto/ContactForm.tsx` with the four states from `design.md` D3, validating against the shared schema. Mark `// Implements: REQ-HELP-03, REQ-HELP-04`.
- [x] 7.5 Every control gets a persistently visible `<label>`. No placeholder-as-label anywhere.
- [x] 7.6 On field error, set `aria-invalid`, associate the message with `aria-describedby`, convey the failure in text rather than colour, and move focus to the first invalid field. Mark `// Implements: REQ-HELP-04`.
- [x] 7.7 Hide the honeypot from both layout and assistive technology, with `tabIndex={-1}`, `aria-hidden` and `autoComplete="off"`. Confirm a screen reader never announces it. Mark `// Implements: REQ-SUP-03`.
- [x] 7.8 Record the mount timestamp for the dwell check and send it with the submission.
- [x] 7.9 On the email field losing focus, show the non-blocking non-institutional notice using `roleForEmail()`. It must not block submission and must not mark the field invalid. Mark `// Implements: REQ-HELP-05`.
- [x] 7.10 Replace the form in place with the persistent confirmation panel on 201 and 202, with distinct copy for each: delivered, versus received and pending delivery. Both offer the direct address. Mark `// Implements: REQ-HELP-03, REQ-SUP-09`.
- [x] 7.11 Preserve entered values on failure and announce the failure in the status region.
- [x] 7.12 Prefill name and email from the session when one exists. Nothing else.

## 8. Wiring and published documents

- [x] 8.1 Add `/contacto` and `/faq` to `app/sitemap.xml/route.ts`. Mark `// Implements: REQ-HELP-09`.
- [x] 8.2 Add both links to the portal footer in `app/Portal.tsx` beside Privacidad, Términos and Accesibilidad.
- [x] 8.3 Add both links to the secondary footer navigation in `app/portal-shell.tsx`.
- [x] 8.4 Add both routes to the enumerated conformance scope in `app/accesibilidad/page.tsx`. Leaving them out would silently narrow a published claim. Mark `// Implements: REQ-HELP-10`.
- [x] 8.5 Extend `app/privacidad/page.tsx` with `solicitudes_soporte` as a data category: name, institutional or personal email, message content, hashed client address, and derived role. Add its retention row at **12 months, after which the whole row is deleted**, and state that the sending address is never stored in readable form. Mark `// Implements: REQ-SUP-05`.
- [x] 8.6 Add Brevo to the providers section of `app/privacidad/page.tsx`. A support message leaves the platform through a third party, and section 6 already enumerates the others.
- [x] 8.7 Update `tests/privacy-terms.test.ts` and `tests/accessibility.test.ts` for the new published content. Extend assertions; do not weaken or remove one.

## 8b. Em dashes removed from every published page

- [x] 8b.1 Locate every em dash in user-facing copy: `app/privacidad/page.tsx`, `app/terminos/page.tsx`, `app/accesibilidad/page.tsx`, `app/Portal.tsx`, `app/portal-shell.tsx` and any other file rendering Spanish text a student or teacher reads.
- [x] 8b.2 Rewrite each occurrence by restructuring the sentence: a full stop, a comma, a colon where what follows explains what precedes, or parentheses for a true aside. **Preserve the meaning of every sentence exactly.** This is published legal text; add nothing, drop nothing, soften no commitment.
- [x] 8b.3 Run `tests/privacy-terms.test.ts` and `tests/accessibility.test.ts` unmodified. A failure means the rewrite changed something it should not have. Fix the copy, never the assertion.
- [x] 8b.4 Confirm zero em dashes remain in any file under `app/` that renders user-facing copy.

## 9. Verification and handoff

- [x] 9.1 Run the impeccable mechanical detector over every changed UI file: `node C:\Users\Pipe\.claude\skills\impeccable\scripts\detect.mjs --json app/contacto app/faq app/globals.css`. Fix every finding in one batch.
- [x] 9.2 Verify both pages by keyboard alone at 320px, 768px and 1280px: reachable controls in logical order, visible focus at every step, no horizontal scroll.
- [x] 9.3 Verify AA contrast on every new surface and state, including the disabled submit control and the error text.
- [x] 9.4 Verify with reduced motion enabled that the disclosure opens instantly.
- [x] 9.5 Grep the FAQ content for em dashes one final time. The result must be empty.
- [x] 9.6 Run `pnpm run verify:fast`, `pnpm run verify:invariants`, `pnpm run typecheck`, `pnpm run lint` and `pnpm test`. All must exit 0 with zero warnings.
- [x] 9.7 Confirm every `REQ-SUP-XX` and `REQ-HELP-XX` has at least one `// Implements:` marker in code.
- [x] 9.8 Update `PLAN.md` with the handoff: the Zod authorization, the pending mail provider decision, the pending retention period, and the `pendiente` ticket backlog to watch after deployment.
- [x] 9.9 Commit in Spanish with Conventional Commits, referencing CEO-63 and CEO-64.

## 10. Deferred, recorded rather than built

- [x] 10.1 Owner action, outside the codebase: create the Brevo account, authenticate the `notificaciones.ceoubb.com` subdomain with the DKIM and SPF records Brevo issues (do not touch the root-domain records Zoho Mail uses), then set `SOPORTE_MAIL_DRIVER=brevo`, `SOPORTE_MAIL_API_KEY`, `SOPORTE_MAIL_FROM` and `SOPORTE_MAIL_TO` in Vercel. Until then the form runs on the no-op driver and every ticket stays `pendiente`.
- [ ] 10.2 Retry job for tickets left in `pendiente` or `fallido`. The state column already makes this possible; build it when the backlog proves it is needed.
- [ ] 10.3 Owner-facing inbox view for `solicitudes_soporte`. Out of scope by decision; the owner reads the table directly until volume justifies a screen.
