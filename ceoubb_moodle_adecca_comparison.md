# Comparative Technical Analysis & Institutional Adoption Dossier
## Moodle UBB vs. Adecca UBB vs. CEOUBB

**Status revision: 2026-08-11 (second revision).** The original edition of this document was a gap analysis written before implementation. The first revision recorded what was built. This revision reframes the document around the project's stated objective: **presenting CEOUBB to Universidad del Bío-Bío as the next official LMS.** That objective raises the bar rather than lowering it, so the document now separates *feature parity* (sections 2–5) from *institutional adoption readiness* (sections 7–9), and states what a state university's evaluation will demand that a pilot never had to answer.

Implementation notes, the manual verification matrix and deployment status live in `PLAN.md`; architectural invariants live in `AGENTS.md`.

> **Scope caveat that governs the whole document.** Everything shipped so far is *interface scaffolding on a single-cohort pilot*. The course catalogue is a static TypeScript module (`lib/courses.ts`), not a database, and course identity is a bare `courseId` with no section and no academic period. That is acceptable for six ramos and one cohort and is **not** acceptable for a university with thousands of courses and thousands of students. Sections 6 and 7 list what must change before the platform is opened beyond the pilot, and what must additionally exist before it can be proposed as an official service.

---

## 1. Executive Summary

This document compares the two official **Universidad del Bío-Bío (UBB)** virtual campus platforms — **Moodle UBB** (`moodleubb.ubiobio.cl`) and **Adecca UBB** (`adecca.ubiobio.cl`) — against **Centro de Estudio UBB (CEOUBB)** (`ceoubb.com`).

**Moodle UBB** offers a standard, feature-rich global LMS experience. **Adecca UBB** provides a fast, custom-tailored administrative course workflow despite running on legacy PHP 5.6 infrastructure. **CEOUBB** is a modern web application (Next.js, Turso, Firebase) with strong visual quality and offline capability.

As of this revision, CEOUBB has closed the multi-course, hierarchical-content, gradebook and live-badge gaps **at the interface level**. It has not closed them at the data-architecture level: the course catalogue, the academic hierarchy and the enrollment model do not exist in a database. The personal file locker was deliberately deferred.

**The objective is official adoption.** That means the deciding evidence is not feature count — CEOUBB already exceeds both platforms on grade projection and offline study — but institutional fitness: identity federation, records integration, interoperability, accessibility conformance, auditability, continuity and cost per student. Those are section 7. None of them are built, and most are not yet even specified. Until they are, CEOUBB is a well-built pilot, not a candidate service.

---

## 2. Platform Comparison Matrix

### 2.1 Teaching and learning features

| Feature / Dimension | Moodle UBB | Adecca UBB | CEOUBB (2026-08-11) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Architectural Stack** | Apache, PHP 7.4-8.x, YUI, jQuery, Bootstrap 4/5 | Apache, **PHP 5.6.40 (EOL)**, Smarty/jSmart, Ace Admin (BS 3.x) | Next.js (App Router), React 19, TypeScript, Turso, Firebase | Stable |
| **Course System Architecture** | Dynamic full hierarchy (Faculties → Departments → Courses) | Course catalog grid with Sede, Period, Coordinator | Generic classroom for any course; catalogue in a static registry module | **Partial** — interface done, data model pending |
| **Academic hierarchy** (facultad, departamento, carrera, plan de estudio) | Full | Full, plus Sede and Coordinador | None — flat list of six ramos | **Open — blocking for adoption** |
| **Sections / paralelos** | Groups and groupings per course | Native | None — one `courseId` per ramo, shared by every paralelo and every year | **Open — blocking for adoption** |
| **Academic periods and rollover** | Course archival, restore, per-period instances | Native period selector | `PERIOD` is a constant in `lib/courses.ts`; no archival, no rollover | **Open — blocking for adoption** |
| **Gradebook & Evaluations** | Comprehensive User Report (formulas, weights, feedback) | Tabular report, test result links | Teacher-authored weighting scheme, official grades per student, plus a private student simulator | **Done** |
| **Grade projection** | Not offered | Not offered | Weighted average plus the exact score still needed to pass (4,0) or to be exempt, reported as secured / reachable / unreachable | **Done — exceeds both platforms** |
| **Course Content Structure** | Linear sections / Topics with H5P, Quizzes, Files, Assignments | Expandable Tree View by RA folders | Collapsible folders by RA code, teacher-assigned via datalist | **Done** (one level, not a deep tree) |
| **Assignment submissions** | Full submission workflow | `Archivos Entregas` | None | **Open** |
| **Quizzes and item banks** | Full quiz engine, question bank | Test result links | None | **Open** |
| **Personal Cloud Locker** | "Archivos Privados" | **"Mi Bodega"** (500 MB, drag-and-drop, Mahara sync) | None | **Deferred by decision** |
| **Calendar & Scheduling** | Mini-calendar + cross-course deadline timeline | Full interactive calendar (Month/Week/Day/Agenda) with class schedules | Timeline aggregating registry dates plus every dated item of every published gradebook | **Partial** — dynamic, but timeline only, no month grid, no class schedules |
| **Participants & Community** | Basic participant roster | Tabbed roster + DataTables + email links | Avatar grid, no role tabs, no search, no contact actions | **Open** |
| **Roster search / filtering at scale** | Paginated participant search | DataTables server-side | None — the roster loads whole | **Open** |
| **Notifications & Badges** | Global notification center + messaging drawer | Quick badge counters (avisos, activities, deadlines) | Per-course unread counters from local last-seen; Android FCM push | **Partial** — badges done, no messaging, no web notification centre |
| **Reporting & analytics for coordinators** | Course, activity and completion reports | Administrative reports per carrera | None | **Open** |
| **UI Aesthetics & UX** | Clean, spacious Boost theme | Classic blue-gradient admin dashboard | Light institutional design system (Motion, Phosphor) | Stable |
| **Mobile & Offline Support** | Responsive web + official Moodle App | Basic Bootstrap 3 grid, no offline app | Native Android app + PWA + offline KaTeX study library | **Stable — exceeds Adecca** |

### 2.2 Institutional fitness

These rows decide an official-adoption evaluation. They are absent from the original comparison because a pilot never had to answer them.

| Dimension | Moodle UBB | Adecca UBB | CEOUBB (2026-08-11) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Institutional identity / SSO** | Institutional authentication against the university directory | Institutional authentication | Consumer Google sign-in, role derived from email domain string matching in `lib/access-policy.ts`, plus two hardcoded personal Gmail owner exceptions | **Open — blocking** |
| **Student-record (SIS) integration** | Roster provisioning from institutional records | Native — it *is* the administrative workflow | None; enrollment does not exist as data | **Open — blocking** |
| **Official actas / firma electrónica** | Grade export to institutional process | Native | Explicitly a convenience copy, never the institutional record | **Open — needs a written decision** |
| **Interoperability standards** (LTI 1.3, SCORM, xAPI, IMS CC, QTI) | Broad support | Limited | None | **Open — blocking** |
| **Migration path from the incumbent** | n/a | n/a | None — no `.mbz` import, no roster import, no historical content ingestion | **Open — blocking** |
| **Role model depth** | Site, category, course and activity roles; ayudantes; coordinadores | Coordinador, docente, alumno, administrativo | Three global roles derived from email domain; no per-course role, no `Ayudante`, no coordinador | **Open — blocking** |
| **Audit trail on grades** | Grade history with author and timestamp | Administrative logs | None | **Open — blocking** |
| **Backups and restore** | University-operated backup regime | University-operated | None documented, none drilled | **Open — blocking** |
| **Staging environment** | Institutional test instance | Institutional test instance | None — one Firebase project, deploys go straight to production | **Open** |
| **Accessibility conformance** | Moodle publishes a WCAG conformance statement | Bootstrap 3 baseline, no statement | Designed for accessibility; no audit, no conformance statement | **Open — legal obligation for a state body** |
| **Data protection posture** (Ley 19.628 / 21.719) | University is controller, service is internal | University is controller, service is internal | Independent third party holding academic data with no agreement in place | **Open — blocking** |
| **Hosting and tenancy** | University infrastructure | University infrastructure | Personal Firebase project `centro-de-estudio-ubb` and a personal Vercel/Turso account | **Open — needs a transfer procedure** |
| **Source ownership / licensing / escrow** | GPL, community-maintained | University-owned | Undeclared; two maintainers | **Open — blocking** |
| **Capacity and cost per student** | Known to DTI | Known to DTI | Unmeasured, unbudgeted | **Open — blocking** |
| **Support path and SLA** | Institutional helpdesk | Institutional helpdesk | None | **Open** |
| **Independent security assessment** | Moodle upstream plus institutional review | Institutional review | Internal audit only (2026-08-09) | **Open** |

---

## 3. Gap Analysis — Resolution Status

### A. Course System Architecture — **PARTIALLY RESOLVED**

*Original finding:* CEOUBB hardcoded the `courses` array in `app/Portal.tsx` and hardcoded all Firestore/Storage paths to `courses/estatica`. Any course other than Estática redirected to the study library.

*What was done:* `lib/courses.ts` is now the single course registry. `app/EstaticaClassroom.tsx` became the generic `app/Classroom.tsx`, which renders any course. Every function in `lib/firebase-classroom-client.ts` takes `courseId` as its first argument. Firestore and Storage rules moved from `courses/estatica/...` to `courses/{courseId}/...`, guarded on every write path by a `validCourse(courseId)` pattern check. All six ramos now open a real classroom.

*What is still open:* there is no `courses` table, no academic hierarchy, no sections and no enrollment. Worse than a missing table, **course identity itself is wrong for a university**: `courseId = "estatica"` is a single global bucket, so two paralelos of the same asignatura, or the same asignatura in 2027-1, would write into the same `courses/estatica/posts` collection. Course identity must become *asignatura × período × sección* before any real cohort beyond the pilot uses it. See section 6.

### B. Gradebook & Evaluation Submissions — **RESOLVED for grades, OPEN for submissions**

*What was done:* two complementary features, as specified by the owner.

- **Official grades.** A teacher authors the weighting scheme at `courses/{courseId}/meta/gradebook` — evaluation name, percentage, date, plus the course's exemption grade — and enters each student's grades in a matrix. Written only by teachers and owners; each student reads only their own row.
- **Student simulator.** A student types hypothetical scores into any evaluation that has no official grade yet. The panel shows the weighted average of what is already graded and, for both the 4,0 passing grade and the course's exemption grade, the score still needed across everything pending — reported as *already secured*, a concrete number, or *no longer reachable*. The simulation is private, stored inside the student's own progress document, and persists across devices.

The arithmetic lives in `lib/grades.ts`, a pure module with no Firebase import, covered by nine cases in `tests/grades.test.ts`. Required scores round *up* to one decimal, matching Chilean practice.

*What is still open:* students cannot upload a submission file against an evaluation, and cannot see teacher feedback text. `saveStudentScores` writes the grade matrix in a single batch, which exceeds Firestore's 500-operation batch limit for a section of more than roughly 250 students; it must chunk before any real section is loaded.

*Compliance note:* official grades are personal academic data. Today CEOUBB is a convenience copy, never the institutional record — and there is **no audit trail**: nothing records who changed a score, when, or what the previous value was. A disclaimer covers that in a pilot. It does not cover it in an official gradebook, where grade history is a baseline expectation. The privacy page has also not been updated to cover grades and must be before teachers enter real data.

### C. Content Organization — **RESOLVED**

Course materials are grouped into collapsible folders using the native `<details>` element. Folder names default to the course's RA codes plus "Certámenes anteriores" and "General"; teachers pick or type one through a `<datalist>`, and can move an existing file between folders. Files published before this change fall into "General". No dependency was added.

This is a single level of grouping, not Adecca's arbitrarily deep tree. That is sufficient for a semester's material and can be deepened if it stops being.

### D. Personal File Locker ("Mi Bodega") — **DEFERRED BY DECISION**

Not built. It is the feature with the highest recurring Storage cost and the least demonstrated demand. Adecca can offer 500 MB per student because it runs on university-owned servers; Firebase Storage bills per GB stored and per GB downloaded. Revisit with a quota decision (100 MB or 250 MB per student) when there is evidence students want it — and note that at university scale this feature alone would dominate the cost-per-student figure that section 7 requires.

### E. Interactive Academic Calendar — **PARTIALLY RESOLVED**

*What was done:* the calendar no longer renders a hardcoded array. It aggregates the registry's known evaluation dates plus every dated item of every published gradebook, so a teacher defining a weighting scheme with dates populates the calendar for the whole cohort automatically. A course with a gradebook uses the gradebook; a course without one falls back to the registry.

*What is still open:* it remains a timeline, not a month/week/day grid, and it does not carry weekly class schedules the way Adecca does. The timeline was kept deliberately — for deadlines it is denser and more legible than a month grid — but recurring class schedules are a genuine missing capability.

### F. Live Badges — **RESOLVED for badges, OPEN for messaging**

Course cards now show real unread counts. A collection-group query over course posts is compared against a per-course last-seen timestamp in `localStorage`; opening a course marks it read. No per-user unread state was added to Firestore, so a student who clears site data sees everything as new once — an acceptable trade for zero backend at pilot size, and one of the three things that break at scale (section 6).

Direct messaging and a web notification centre were not built. FCM push on `course_estatica_students` remains the only push path, and that topic name is itself single-course.

### G. Participant Directory — **OPEN**

Untouched. Still an avatar grid with no `Ayudantes` role, no search or filter, and no contact actions. The roster also loads whole, with no pagination.

---

## 4. What Shipped — File Inventory

New:

- `lib/courses.ts` — course registry (ids, codes, tones, cover copy, learning outcomes, known evaluation dates).
- `lib/grades.ts` — pure Chilean-scale grade arithmetic.
- `app/Classroom.tsx` — the generic classroom, replacing `app/EstaticaClassroom.tsx`.
- `app/portal-views.tsx` — dashboard, calendar, resources, administration.
- `tests/grades.test.ts` — nine cases, wired into `pnpm test`.

Changed:

- `lib/firebase-classroom-client.ts` — `courseId` threaded through everything; gradebook, official-grade and simulation reads/writes; two portal-wide collection-group subscriptions.
- `app/Portal.tsx` — reduced to the shell (session, access screen, header, routing). It is the only module that imports the course registry.
- `firebase/firestore.rules`, `firebase/storage.rules` — wildcard course paths with a `validCourse` guard; new `meta` and `grades` collections; the recursive read rules that collection-group queries require.
- `app/globals.css` — folder and grade-table styles on the existing tokens.
- `AGENTS.md`, `PLAN.md` — architecture, seams and handoff.
- `tests/rendered-html.test.mjs` — the rules test now asserts the wildcard exists *and* is guarded, so an unguarded course write path fails the build.

**Verification.** `pnpm test` passes 37/37 including the production build. Lint is unchanged from its pre-existing baseline. Everything behind the institutional Google sign-in is **unverified** — that requires UBB credentials and is the manual matrix in `PLAN.md`. **Nothing has been deployed.** The Firebase rules must be deployed before any web deploy, or writes to any course other than Estática will be denied in production.

---

## 5. Roadmap — Revised

Phase 0 is new and comes first. The feature phases below it were previously ordered as if the foundation were already in place; it is not.

### Phase 0: Production baseline (must precede every other phase)
* [ ] Academic data model: `facultades`, `departamentos`, `carreras`, `asignaturas`, `periodos`, `secciones`, `enrollments`. Course identity becomes *asignatura × período × sección*.
* [ ] Enrollment-aware Firestore rules, with Emulator Suite tests as a merge gate.
* [ ] GitHub Actions CI: lint, test, build, Functions check, rules tests.
* [ ] Staging Firebase project and a seeded emulator dataset. No more direct-to-production deploys.
* [ ] Firestore and Turso backups, plus a **drilled** restore with stated RPO/RTO.
* [ ] Audit trail on the gradebook and on official grades.
* [ ] Stated capacity and cost targets (section 7.4), and a load check against them.

### Phase 1: Multi-course infrastructure & dynamic enrollment
* [x] Parameterize the classroom into a reusable component for any course.
* [x] Course-keyed Firestore and Storage paths with guarded wildcard rules.
* [x] Decouple the view components from the catalogue, so the data source can be swapped in one place.
* [ ] Bulk enrollment import (CSV or institutional API), idempotent, with a dry-run mode.
* [ ] Period rollover and archival of past sections.

### Phase 2: Hierarchical content & personal storage
* [x] Collapsible folders for course materials, with teacher-assigned folder names and a move action.
* [ ] "Mi Bodega" personal cloud locker. Deferred; needs a quota decision and a cost estimate first.

### Phase 3: Gradebook engine & assignment submissions
* [x] Teacher-authored weighting scheme with dates and an exemption grade.
* [x] Official grades per student, teacher-written, student-read-own.
* [x] Student grade simulator with pass and exemption projections.
* [ ] Chunked grade writes for sections above the Firestore batch limit.
* [ ] Assignment submission uploads against an evaluation.
* [ ] Teacher feedback text per grade.

### Phase 4: Dynamic calendar & live notification badges
* [x] Calendar aggregating registry dates and published gradebook dates.
* [x] Per-course unread badges on the course cards.
* [ ] Month/week/day calendar views.
* [ ] Recurring weekly class schedules.
* [ ] Web notification centre and direct messaging.

### Phase 5: Participants & community
* [ ] `Ayudante` and `Coordinador` roles, as per-enrollment roles rather than global ones.
* [ ] Roster search, filter, role tabs and pagination.
* [ ] Contact actions.

### Phase 6: Institutional adoption (see sections 7–9)
* [ ] Institutional SSO replacing consumer Google sign-in.
* [ ] SIS integration, or a documented manual provisioning process.
* [ ] LTI 1.3 support, and a migration importer from Moodle UBB.
* [ ] WCAG 2.2 AA audit and conformance statement.
* [ ] Legal, tenancy, licensing and continuity dossier.

---

## 6. Scale — The Blocking Work

The current implementation is correct for six ramos and one cohort. The following are correct at that size and wrong at university size. They should be fixed as part of the data-model migration, not afterwards.

1. **Course identity.** `courseId` carries no section and no academic period, so paralelos and successive years collide in one collection. Fix first; every item below depends on the identity being right.

2. **Activity sweep.** The unread-badge query reads the newest posts across *every* course in the database and filters client-side, capped at 120 documents. Past roughly a few dozen active courses, a student's own course posts stop fitting inside that window and the badges silently show nothing. Fix: filter by the user's enrolled courses, or maintain a per-user aggregate unread document.

3. **Gradebook sweep.** The calendar query reads *every* published gradebook in the database, with no limit, on every portal load. Six document reads today; thousands per session at scale, with the matching cost and latency. Fix: the same enrollment filter.

4. **Course-agnostic read permission.** The security rules grant any signed-in UBB account read access to every course's posts and gradebook. Harmless while one cohort shares the same six ramos. A privacy problem the moment unrelated carreras or facultades share the project — a student of one carrera would be able to read another's course material and evaluation scheme. Fix: gate course reads on an enrollment check in the rules. **Treat this as release-blocking before the platform is opened beyond the pilot cohort.**

5. **Unbounded reads in the UI.** Posts, files, the participant roster and the grade matrix all load whole. Every one needs pagination before a 300-student section opens them.

6. **Batch limits.** `saveStudentScores` writes one batch for the whole section; Firestore caps a batch at 500 operations. Chunk it.

7. **Missing indexes.** Enrollment-filtered queries will need composite indexes in `firebase/firestore.indexes.json` that do not exist today.

**The catalogue-location decision — settled.** Earlier revisions of this document posed Turso-versus-Firestore as an open question and called splitting the data across both "the option that will hurt". At university scale the split is the standard answer, not the trap. The recommendation is:

- **Turso is the system of record** for facultades, departamentos, carreras, asignaturas, periodos, secciones and enrollments. It sits with the existing user directory, it is relational, and it is what reports and imports will query.
- **Firestore holds a narrow one-way projection** — marker documents such as `enrollments/{uid}/courses/{courseSectionId}` — that exists for one reason only: so security rules can answer "is this user enrolled here?" with `exists()`.
- The projection has exactly **one writer** (the enrollment service or a Cloud Function reacting to enrollment changes), is never authored by a client, and carries no data beyond membership and role. Any drift is repaired by re-projecting from Turso.

Record any deviation from this as a deliberate decision with its reason; do not let a second writer appear.

---

## 7. Institutional Adoption Readiness

The stated objective is that UBB adopts CEOUBB as its official LMS. That decision is not made by comparing feature tables; it is made by DTI, the Vicerrectoría Académica and the university's legal counsel against the criteria below. Every item here is currently unbuilt or unspecified.

### 7.1 Identity and academic records

| Requirement | Why it is required | Current state |
| :--- | :--- | :--- |
| Institutional SSO (SAML 2.0 / OIDC / CAS) against the UBB directory | A state university does not delegate account control to consumer Google identities, and role must come from directory membership, not from an email suffix | Consumer Google sign-in; role derived by string matching in `lib/access-policy.ts` |
| Removal of the two hardcoded personal Gmail owner exceptions | An audit will find them. A permanent superuser bound to a personal consumer account is a finding on its own | Present in `lib/access-policy.ts`, both rules files and the Android service |
| Per-enrollment roles (docente, ayudante, estudiante, coordinador, administrativo) | The same person is a teacher in one course and a student in another; domain-derived global roles cannot express that | Three global roles |
| SIS provisioning of rosters | Nobody hand-enrolls thousands of students each semester | Enrollment does not exist as data |
| A written decision on **actas** | Either CEOUBB feeds the official grade record — which pulls in firma electrónica avanzada under Ley 19.799 and the state digital-transformation rules — or it is documented as explicitly non-authoritative. Both are acceptable; silence is not | Undecided; "convenience copy" disclaimer only |

The domain-based access policy should be re-documented as an **authentication** invariant for the pilot, with authorization moving to per-enrollment records. That is a change to a rule `AGENTS.md` currently states as absolute, and must be made deliberately.

### 7.2 Interoperability and migration

Standard evaluation checklist, none of it present today:

- **LTI 1.3 / LTI Advantage**, so university and third-party tools plug in.
- **SCORM and/or xAPI** for packaged content.
- **IMS Common Cartridge** for course exchange, **QTI** for item banks.
- **A migration path from the incumbent**: Moodle `.mbz` course import, roster import, and ingestion of historical course content. No institution replaces an LMS that cannot ingest fifteen years of existing courses. This is usually the single most expensive line item in an LMS transition, and it is entirely unstarted.

### 7.3 Legal, continuity and ownership

- **Data protection.** Define UBB as controller and CEOUBB as processor under Ley 19.628 and the Ley 21.719 regime; execute a data-processing agreement; publish retention periods, a deletion process and a DPO contact. Firestore, Storage and Functions already live in `southamerica-west1`, which helps.
- **Accessibility.** For a state body this is a legal obligation, not a quality goal: Ley 20.422 and the state digital-transformation accessibility norms. Deliver a WCAG 2.2 AA audit and a published conformance statement.
- **Data ownership, portability and exit.** Full export in open formats, plus a written statement of what happens to the data if the project stops.
- **Source ownership.** Declare a license, and offer transfer to UBB or source escrow. Two maintainers is a bus factor of two — the most common reason an institution declines a homegrown platform. Answer it with an explicit maintenance and handover commitment.
- **Hosting and tenancy.** Today the platform runs on a personal Firebase project and personal Vercel/Turso accounts. UBB may require its own tenancy or on-premise hosting. Document the tenancy-transfer procedure before it is asked for.
- **Independent security assessment.** An external penetration test. The 2026-08-09 audit was internal.
- **Business continuity.** Backups, a drilled restore, an incident process and a support path with a stated SLA.

### 7.4 Capacity, cost and evidence

No document in this repository states a capacity target, so "production-ready" is currently untestable. Fill these in and treat them as acceptance criteria for the scale work in section 6:

| Target | Value | Notes |
| :--- | :--- | :--- |
| Concurrent students at peak (exam week) | *to define* | Drives read/write budget |
| Active course-sections per period | *to define* | Drives the sweep fixes |
| Total enrolled students | *to define* | Drives Turso sizing and import design |
| Firestore reads per portal load | *to define* | Today: unbounded, grows with total courses in the database |
| Storage GB stored / GB downloaded per month | *to define* | Dominated by "Mi Bodega" if that is ever built |
| **Cost per student per year** | *to define* | The number a rectoría-level decision actually turns on; benchmark against what Moodle UBB costs UBB today |
| Uptime target and RPO/RTO | *to define* | Required for any service agreement |

---

## 8. Recommended Path to Adoption

Do not propose a replacement first. Propose an **authorized pilot**:

1. Obtain a written agreement with one departamento or carrera for one semester — real students, real grades, a signed data-processing annex, and named academic sponsors. This is an owner action; no agent can perform it.
2. Keep the "independent, non-official platform" disclaimer in the UI unchanged until that agreement exists. Presenting an unauthorized product as institutional is the fastest way to lose the bid.
3. Complete Phase 0 (section 5) before the pilot takes real grades — specifically the enrollment rules, the audit trail and the drilled restore.
4. Instrument the pilot for the evidence the proposal needs: uptime, adoption rate, teacher and student satisfaction, support volume and measured cost per student.
5. Deliver the section 7 dossier alongside the pilot report, and only then propose CEOUBB as an official service.

The pilot converts today's real exposure — an independent platform holding academic data with no authorization — into sanctioned work, and produces exactly the evidence an institutional decision requires.

## 9. Honest Assessment

Where CEOUBB already wins: grade projection (neither official platform offers it), offline study with real mathematical notation, native Android delivery, and interface quality against a PHP 5.6 incumbent.

Where it is not yet a candidate: it has no academic hierarchy, no enrollment, no institutional identity, no interoperability, no migration path, no audit trail, no backups and no cost model. Those are not polish items; each one is individually disqualifying in an institutional evaluation.

The gap is closable, and the order to close it in is section 5's Phase 0, then section 6, then section 7. What must not happen is proposing adoption before that work exists — a declined proposal is much harder to revive than a delayed one.

---

*Prepared for the CEOUBB development team. Original edition 2026. Status revision 2026-08-11 (second revision, adoption-oriented).*
