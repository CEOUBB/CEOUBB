# P1 — Academic data model (canonical spec)

Canonical description of the courses/enrollments migration. Supersedes the former "P1 — Multi-course collaboration" and "P1 — Backend consolidation" sections of `PLAN.md`, and section 6 of `docs/institutional/moodle-adecca-comparison.md` wherever they disagree.

## Entities (Turso, via Drizzle)

- `facultades`, `departamentos`, `carreras`, `planes_de_estudio`
- `asignaturas` — catalogue entry: código, nombre, créditos SCT, departamento, resultados de aprendizaje
- `periodos` — e.g. `2026-2`, start/end dates, state (abierto, cerrado, archivado)
- `secciones` — _asignatura × periodo × sección_. **The unit the classroom is keyed on**, not the asignatura.
- `enrollments` — `userId`, `seccionId`, `role` (docente, ayudante, estudiante, coordinador), `state`

## Course identity

`courseId` becomes a section identifier. Today `courses/estatica/...` is one global bucket shared by every paralelo and every year. Must change before a second cohort exists — not a migration that gets easier with data in it. Keep the new identifier format matching the existing rules pattern `^[a-z][a-z0-9-]{1,30}$`, or update the pattern deliberately in both rules files and in `tests/rendered-html.test.mjs`.

## Storage split — settled, do not relitigate

- **Turso is the system of record** for every entity above. Sits with the existing user directory, relational, queried by imports and reports.
- **Firestore holds a narrow one-way projection** — marker docs such as `enrollments/{uid}/courses/{seccionId}` carrying membership and role only — so rules can answer "is this user enrolled here?" with `exists()`.
- Projection has **exactly one writer** (enrollment service, or a Function reacting to enrollment changes), never authored by a client, repaired by re-projecting from Turso. Earlier revisions called a split "the option that will hurt"; at university scale it is the standard pattern and that statement is corrected.

## Work items

1. Schema and migrations (`db/schema.ts`, `drizzle/`), applied to Turso before the matching deploy.
2. Replace `const courses = COURSES` in `app/Portal.tsx` with the signed-in user's enrolled sections. No view component imports the catalogue.
3. Enrollment projection into Firestore, single writer.
4. Enrollment-gated Firestore and Storage rules, with Emulator Suite tests (P0.10) in the same change. **Release-blocking**: today any signed-in UBB account reads every course.
5. Replace `watchCourseActivity` and `watchGradebooks` — both sweep the whole database — with enrollment-filtered queries or per-user aggregates, plus the composite indexes they need.
6. Pagination for posts, files, roster and grade matrix; chunk `saveStudentScores` under the 500-operation Firestore batch limit.
7. Per-section notification topics replacing `course_estatica_students`; update `ClassroomService.java`, still pinning `COURSE_ID = "estatica"`.
8. Migrate existing Estática pilot data to the new identifier without losing posts, progress or files. Back it up first.
9. Bulk enrollment import with dry-run mode (P0B.2).
10. Period rollover and archival: past sections read-only; a retaken asignatura is a new enrollment in a new section.
11. Teacher course-management and student enrollment UX.
12. Update `AGENTS.md`, `PLAN.md`, the comparison document; retire `lib/courses.ts` or reduce it to seed data.

## Backend consolidation — remainder

D1/R2 classroom routes and their tables were deleted during the Vercel migration; Firebase is the only classroom backend. Remaining: `posts`, `files`, `progress` tables still physically exist in the imported Turso copy, unreferenced. Confirm the rows are not needed, then emit and apply the drop migration with `pnpm run db:generate`.

## Why this is the blocking debt

- Catalogue is a static TypeScript module (`lib/courses.ts`). No `courses` table, no academic hierarchy, no enrollment.
- Course identity is wrong for a university: two paralelos, or the same asignatura in 2027-1, write into the same `courses/estatica/posts`.
- Roles are global and derived from the email domain. A university needs per-enrollment roles, including one person teaching one course and studying another.
- No bulk enrollment path. Nobody hand-enrolls thousands of students per semester.

Risk: every day the pilot runs with real posts raises the cost of fixing course identity.
