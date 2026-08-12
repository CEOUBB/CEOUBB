# P0 — Pilot safety (production reliability and compliance)

What protects the students using CEOUBB today. Deployment- and correctness-blocking. Companion track: [`p0b-adoption.md`](p0b-adoption.md).

## P0.1 End-to-end authentication matrix

Test on `ceoubb.com` and a physical Android device:

1. Owner account gets owner access.
2. Collaborator account gets owner access.
3. `@ubiobio.cl` gets teacher access.
4. `@alumnos.ubiobio.cl` gets student access.
5. Personal Gmail and another university domain rejected with the institutional-only message.
6. Sign-out clears both web session and Firebase state.

Acceptance: no redirect loop, no unauthorized role, no stale session, no console/API 401 after login.

## P0.2 Storage and classroom permission test

1. Teacher uploads PDF, PPTX, DOCX, image, text.
2. Student views/downloads but cannot edit, delete or upload teacher material.
3. Teacher edits/deletes own post, not another teacher's.
4. Owner administers all posts.
5. Student updates only own progress.
6. Files over 50 MiB rejected; boundary-size file handled correctly.

Acceptance: rules enforce the same result when requests bypass the UI.

## P0.3 Notification test

1. Clean debug/release build on a physical Android device.
2. Sign in as student, grant notification permission.
3. Publish a new Estática post as teacher.
4. Confirm receipt foregrounded, backgrounded, closed.
5. Tapping the notification opens the intended course.

Acceptance: one readable notification per post, correct Spanish accents, no duplicate delivery.

## P0.4 Billing safeguards

- Cloud Billing budget alerts at owner-approved CLP/USD thresholds.
- Notifications at 50%, 80%, 100% minimum.
- Record recipients and escalation outside the public repository.
- Confirm trial status and what happens when trial/credit ends.

Acceptance: owner has a confirmed budget notification path and understands budgets alert, not hard-cap.

## P0.5 App Check rollout

- Register web and Android apps with suitable providers.
- Start in monitoring mode.
- Verify legitimate web, Android, Functions, Firestore, Storage traffic.
- Enforce incrementally, only after confirming no supported client is blocked.

Acceptance: unauthorized clients rejected after enforcement; production clients keep working.

## P0.6 Account deletion and privacy compliance

- Review current Google Play and Apple deletion requirements.
- Restore or implement a compliant public information URL plus authenticated deletion entry point.
- Test `deleteMyAccount` against Auth, Firestore user/progress/posts, Storage objects.
- Decide retention for teacher-created content before deletion.
- Update `/privacidad`, Data safety, future App Privacy answers.

Acceptance: a user can discover and complete deletion with no developer intervention, while course records follow the documented retention policy.

Context: the callable Function and Android invocation exist, but `/eliminar-cuenta` was intentionally removed from the web UI. Store policy may require an accessible deletion flow and public instructions.

## P0.7 Capacity and cost targets

No capacity target is stated anywhere in the repository, so "production-ready" is untestable and no scale item has an acceptance criterion. Fill in with owner-approved numbers, then treat as acceptance criteria for the scale work in [`p1-academic-model.md`](p1-academic-model.md).

| Target | Value | Notes |
|---|---|---|
| Concurrent students at peak (exam week) | *to define* | Drives read/write budget |
| Active course-sections per period | *to define* | Drives the sweep fixes |
| Total enrolled students | *to define* | Drives Turso sizing and import design |
| Firestore reads per portal load | *to define* | Today unbounded; grows with total courses in the DB |
| Storage GB stored and GB downloaded per month | *to define* | Dominated by "Mi Bodega" if ever built |
| **Cost per student per year** | *to define* | The number an institutional decision turns on; benchmark against what Moodle UBB costs UBB today |
| Uptime target, RPO and RTO | *to define* | Required for any service agreement |

Acceptance: numbers exist, owner-approved, and a load check has run against the two highest-risk ones (concurrent students, reads per portal load).

## P0.8 Backups and a drilled restore

- Schedule Firestore exports to a separate bucket with its own retention.
- Turso backup routine, verified to produce a usable dump.
- Write the restore procedure, then **perform it** into the P0.11 staging project.
- Record measured RPO/RTO in P0.7.

Acceptance: a restore has actually been performed and the recovered data verified — not a documented intention.

Risk today: no scheduled export, no Turso backup, no restore ever performed. A bad write, bad rules deploy or account problem loses grades and course material with no recovery path. Sharpest single risk in the repository.

## P0.9 Grade audit trail

- Append-only history for `courses/{courseId}/meta/gradebook` and `courses/{courseId}/grades/{uid}`: author UID, timestamp, previous value, new value.
- Written by rules or a Function in a path clients cannot bypass or edit.
- Surfaced to teachers and owners; a student sees the history of their own grades.

Acceptance: changing a score leaves an immutable record; deleting that record is impossible from any client.

Risk today: `grades/{uid}` is overwritten in place. Acceptable under the "convenience copy, not the institutional record" disclaimer in a pilot; disqualifying for an official gradebook, where the first disputed grade has no evidence behind it.

## P0.10 Continuous integration and rules tests

- GitHub Actions running `pnpm run lint`, `pnpm test`, the production build, and the Functions `pnpm run check`.
- Firebase Emulator Suite tests for the Firestore and Storage role matrices, including enrollment checks once they exist, in the same workflow.
- Both required to merge.

Acceptance: a pull request that breaks a role boundary or the build fails automatically, with no human noticing.

Risk today: two maintainers with two different assistants can merge a rules change that nothing verifies until it is live in production.

## P0.11 Staging environment

- Second Firebase project for staging in `southamerica-west1`, own rules deploys, seeded emulator dataset.
- Vercel preview environment pointed at a staging Turso database.
- Production deploys only after the same change ran in staging.

Acceptance: no rules or schema change reaches production without having run somewhere else first.
