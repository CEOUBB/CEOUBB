# P0B — Institutional adoption dossier

Objective: UBB adopts CEOUBB as its official LMS. That decision is made against the criteria below, not against a feature table. Every item is currently unbuilt or unspecified. Section 7 of `docs/institutional/moodle-adecca-comparison.md` carries the detail and rationale; section 8 there is the recommended path.

None of this can be produced in the week before a presentation, so it starts now and runs alongside the pilot ([`p0-pilot-safety.md`](p0-pilot-safety.md)).

## P0B.1 Institutional identity

1. Institutional SSO — SAML 2.0, OIDC or CAS — against the UBB directory, replacing consumer Google sign-in.
2. Role from directory membership, not the email suffix.
3. Per-enrollment roles (docente, ayudante, estudiante, coordinador, administrativo), so one person can teach one course and study another.
4. Remove the two hardcoded personal Gmail owner exceptions, replaced by directory-backed administrator accounts.
5. Re-document the domain-to-role rule in `AGENTS.md` as an _authentication_ invariant for the pilot, with authorization moved to enrollment records. A deliberate amendment to a stated invariant: one commit, tests updated.

Acceptance: no role decision anywhere in the stack depends on parsing an email address, and no permanent superuser is bound to a personal consumer account.

Risk today: consumer Google sign-in plus email-domain string matching in `lib/access-policy.ts`, with two hardcoded personal Gmail addresses holding permanent owner rights across web, both rules files and the Android service. Pragmatic for a pilot; audit findings in an institutional review, and the domain rule cannot express per-course roles at all.

## P0B.2 Academic records integration

1. Roster provisioning from the institutional student record system, or a documented manual process with named owners.
2. Bulk enrollment import (CSV or institutional API), idempotent, dry-run mode, reconciliation report.
3. Written decision on **actas**: either CEOUBB feeds the official grade record — pulling in firma electrónica avanzada under Ley 19.799 and the state digital-transformation rules — or it is documented as explicitly non-authoritative. Both are acceptable; silence is not.

## P0B.3 Interoperability and migration

1. LTI 1.3 / LTI Advantage.
2. SCORM and/or xAPI for packaged content.
3. IMS Common Cartridge for course exchange; QTI for item banks.
4. Moodle `.mbz` course importer plus roster and historical-content ingestion. No institution replaces an LMS that cannot ingest fifteen years of existing courses; usually the largest single line item in an LMS transition, and entirely unstarted.

## P0B.4 Legal and data protection

Estado: carpeta borrador preparada en [`docs/legal/`](../legal/README.md) por CEO-40. Sigue pendiente la revisión de Jurídica, individualizar al operador legal de CEOUBB, cerrar las brechas técnicas, autorizar subencargados y firmar el convenio; el borrador no cambia la condición independiente del proyecto.

1. Define UBB as controller and CEOUBB as processor under Ley 19.628 and the Ley 21.719 regime; execute a data-processing agreement.
2. Publish retention periods, deletion process, data-protection contact.
3. Confirm and document that Firestore, Storage and Functions remain in `southamerica-west1`.
4. Update `/privacidad` to cover official academic grades **before** any teacher enters real data.

## P0B.5 Accessibility conformance

WCAG 2.2 AA audit of the portal and the web study library, remediation, published conformance statement. For a state body this is a legal obligation under Ley 20.422 and the state digital-transformation accessibility norms, not a quality goal.

## P0B.6 Ownership, tenancy and continuity

1. Declare a source license; offer transfer to UBB or source escrow.
2. Document tenancy-transfer for the Firebase project, Vercel project and Turso database — today all on personal accounts.
3. State a maintenance and handover commitment. Two maintainers is a bus factor of two, the most common reason an institution declines a homegrown platform.
4. Commission an external penetration test; the 2026-08-09 audit was internal.
5. Define the support path and an SLA.

## P0B.7 Evidence from an authorized pilot

1. Obtain the written pilot authorization (`BLOCKED` in `PLAN.md`).
2. Keep the "independent, non-official platform" disclaimer in the UI until that agreement exists. Presenting an unauthorized product as institutional is the fastest way to lose the bid.
3. Instrument the pilot for uptime, adoption rate, teacher and student satisfaction, support volume, measured cost per student.
4. Deliver the pilot report together with P0B.1–P0B.6, and only then propose CEOUBB as an official service.
