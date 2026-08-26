## Why

Linear issues **CEO-63** (`/contacto`) and **CEO-64** (`/faq`), both High priority, close the last gap in CEOUBB's public surface: the platform tells students and teachers what it does with their data (`/privacidad`), what the rules are (`/terminos`) and how accessible it is (`/accesibilidad`), but it offers no way to ask a question and no answers to the questions people actually ask. Today the only contact route is a `mailto:contacto@ceoubb.com` buried in section 6 of the accessibility statement, which nobody reads before they are already stuck.

This matters more than a normal content gap because CEOUBB is positioning itself as the replacement for Moodle UBB and Adecca UBB. An LMS asking a university to trust it with thousands of students' grades cannot answer "how do I get help?" with a link nobody can find. The accessibility statement already publishes a response commitment — acknowledgement within five working days, an answer or accessible alternative within thirty calendar days — and that promise currently has no intake mechanism behind it.

The two pages ship together because they are one journey: the FAQ absorbs the repeatable questions so the contact form receives only the ones that need a person, and the FAQ's closing call to action is the contact page. Splitting them would ship a support form with no self-service filter in front of it.

## What Changes

- **New public page `/contacto`** on the existing `.policy-page` chrome shared by `/privacidad`, `/terminos` and `/accesibilidad`, carrying a support request form (name, institutional email, category, subject, message), the official contact channels, and the response commitment already published in the accessibility statement.
- **New public page `/faq`** on the same chrome, with question groups covering institutional accounts and access, courses and sections, grades and the Chilean 1.0–7.0 weighted average, the study library, and the mobile application; native `<details>`/`<summary>` disclosure, a client-side filter over question and answer text, deep-linkable question anchors, and a closing route to `/contacto`.
- **New API route `POST /api/soporte`** that validates the submission, persists it, and delivers it by email to `contacto@ceoubb.com`. The route is public — a student locked out of their account is precisely the person who needs it — so it carries its own abuse controls: a per-IP rate limit, a hidden honeypot field, a minimum time-to-submit check, and a hard body size bound.
- **New Turso table `solicitudes_soporte`** holding each submission with a delivery state. The row is written before the email is attempted, so a provider outage degrades to a queued ticket rather than a lost message. There is no admin inbox UI in this change; the owner reads the table directly.
- **Provider-agnostic email seam `lib/services/support-mail.ts`** with a single `enviarCorreoSoporte()` port and an HTTP driver selected by environment variable. The concrete provider account is not contracted yet; the seam ships with a driver that speaks a plain REST mail API over `fetch`, and a no-op driver that leaves the ticket queued when the credentials are absent, so the pages ship and work before the mail account exists.
- **Zod becomes the project's validation library.** A shared schema in `lib/support-request.ts` validates the same submission in the browser and on the server from one definition. This change also migrates the hand-rolled query-parameter validation in `app/api/admin/users/route.ts` — the Gold Standard Reference that `AGENTS.md` already describes as Zod-validated — so the reference file matches the standard it documents.
- **Institutional email domains are enforced through the existing SSOT.** The form's email field is validated by `roleForEmail()` from `lib/access-policy.ts`, not by a new regular expression, so the contact form cannot drift from the platform's role policy.
- Both routes are added to `app/sitemap.xml/route.ts`, to the portal footer in `app/Portal.tsx`, and to the secondary footer navigation in `app/portal-shell.tsx`.

Non-goals and explicit exclusions:

- **No admin inbox, no ticket lifecycle.** No status transitions, assignment, threading, or reply-from-app. The table is a durable record and a delivery fallback, not a helpdesk.
- **No authenticated-only variant.** Both pages are public. A signed-in user gets their name and email prefilled; nothing more.
- **No file attachments** on support requests. Uploads on an unauthenticated public endpoint are a storage-abuse surface this change does not open.
- **No Sonner or other toast library.** Submission feedback uses the project's established persistent `aria-live` region with `.tool-status`, because a confirmation that disappears after four seconds is worst exactly where it matters most.
- **No Discord delivery.** The Discord integration in this repository is internal engineering tooling; user-authored correspondence goes to the institutional mailbox.
- **No FAQ content management.** Questions and answers are typed content in the repository, reviewed like any other published text.
- **No email provider contract.** Choosing and paying for the mail service is a separate decision; this change makes the code ready for it and degrades safely without it.

## Capabilities

### New Capabilities

- `communications/support-requests`: The public support intake pipeline — the shared validation schema, the abuse controls on a public unauthenticated endpoint, the durable record written before delivery is attempted, the provider-agnostic email delivery seam targeting `contacto@ceoubb.com`, and the degraded behavior when no mail provider is configured.
- `ui/public-help-pages`: The `/contacto` and `/faq` published surfaces — their membership in the `.policy-page` family, the support form's states and accessible feedback, the FAQ's disclosure, filtering and deep-linking behavior, and the WCAG 2.2 AA conformance both pages must hold so the existing accessibility statement stays truthful.

### Modified Capabilities

<!-- None. `auth` is consumed through roleForEmail() without changing its requirements; `database` query-bound requirements are satisfied, not altered. -->

## Impact

- **New files**: `app/contacto/page.tsx`, `app/contacto/ContactForm.tsx` (client), `app/faq/page.tsx`, `app/faq/FaqBrowser.tsx` (client), `app/faq/faq-content.ts`, `app/api/soporte/route.ts`, `lib/support-request.ts`, `lib/services/support-mail.ts`, `lib/services/support-requests.ts`, plus a Drizzle migration and tests.
- **Modified files**: `db/schema.ts` (new table), `app/globals.css` (form and disclosure classes inside the `.policy-page` family), `app/sitemap.xml/route.ts`, `app/Portal.tsx`, `app/portal-shell.tsx`, `app/accesibilidad/page.tsx` (its conformance scope list must name the two new pages), `app/api/admin/users/route.ts` (Zod migration), `package.json`.
- **New dependency**: `zod`, authorized explicitly by the project owner. No toast library, no mail SDK — the mail driver is `fetch` against a REST endpoint.
- **New environment variables**: the mail provider's API key, the sender address, and the destination address, all absent-safe.
- **Accessibility conformance**: `/accesibilidad` currently claims full WCAG 2.2 AA conformance over an enumerated page list. Adding two public pages without adding them to that list would silently narrow a published conformance claim, so extending it is part of this change, not a follow-up.
