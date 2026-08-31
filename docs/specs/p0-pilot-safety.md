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

Estado verificado el 2026-08-20 (CEO-10): presupuesto mensual de CLP 10.000 limitado a `centro-de-estudio-ubb`, con umbrales de gasto real al 50%, 80% y 100%. Las notificaciones llegan a los roles IAM de facturación y a los propietarios del proyecto; los destinatarios nominales y el saldo/plazo de la prueba permanecen en Linear. No hay límite automático de gasto. La cuenta continúa en prueba gratuita y los recursos se detendrán si esta vence sin activar una cuenta pagada. Runbook: [`google-cloud-budget-alerts.md`](../operations/google-cloud-budget-alerts.md).

## P0.5 App Check rollout

- Register web and Android apps with suitable providers.
- Start in monitoring mode.
- Verify legitimate web, Android, Functions, Firestore, Storage traffic.
- Enforce incrementally, only after confirming no supported client is blocked.

Acceptance: unauthorized clients rejected after enforcement; production clients keep working.

Estado de etapa 1 verificado el 2026-08-23 (CEO-47): las apps Web y Android están registradas con reCAPTCHA Enterprise y Play Integrity; Firestore, Storage y Authentication permanecen `UNENFORCED`, y las callable Functions declaran `enforceAppCheck: false`. El cliente y el runbook están listos para revisión. Tras merge y despliegue se deben completar 24 horas de tráfico representativo, incluida una app Android física, antes del enforcement gradual. Contrato y evidencia: [`p18-firebase-app-check-rollout.md`](p18-firebase-app-check-rollout.md); operación: [`firebase-app-check-rollout.md`](../operations/firebase-app-check-rollout.md).

## P0.6 Account deletion and privacy compliance

- Review current Google Play and Apple deletion requirements.
- Restore or implement a compliant public information URL plus authenticated deletion entry point.
- Test `deleteMyAccount` against Auth, Firestore user/progress/posts, Storage objects.
- Decide retention for teacher-created content before deletion.
- Update `/privacidad`, Data safety, future App Privacy answers.

Acceptance: a user can discover and complete deletion with no developer intervention, while course records follow the documented retention policy.

Context: the callable Function and Android invocation exist, but `/eliminar-cuenta` was intentionally removed from the web UI. Store policy may require an accessible deletion flow and public instructions.

## P0.7 Capacity and cost targets

CEO-9 fija la línea base. El detalle, las fórmulas, exclusiones, fuentes y protocolo de prueba viven en [`capacity-cost-baseline.md`](../operations/capacity-cost-baseline.md); el contrato canónico es `operations/capacity-cost` en OpenSpec.

Estado verificado el 2026-08-31 (CEO-71): la [evidencia aprobada](../operations/evidence/ceo-71-2026-08-31.md) sostuvo 3.000 sesiones autenticadas durante 1.860 segundos superpuestos, con HTTP p95 472 ms, cero 5xx y una proyección de CLP 425 por estudiante-año. El resultado corresponde a Staging y al commit probado; no demuestra disponibilidad mensual, producción ni RPO/RTO.

| Target                                          |                               Value | Notes                                                              |
| :---------------------------------------------- | ----------------------------------: | :----------------------------------------------------------------- |
| Concurrent students at peak (exam week)         |                               3.000 | PASS Staging: 3.000 autenticadas y meseta superpuesta de 1.860 s   |
| Active course-sections per period               |                               3.000 | 2.400 derivadas de matrículas más 25% de holgura                   |
| Active student-section enrollments              |                              72.000 | 12.000 estudiantes × 6 secciones                                   |
| Total active students                           |                              12.000 | Envolvente de 15.000 identidades al incluir docentes y personal    |
| Firestore reads per initial student portal load |                               ≤ 200 | PASS Staging: 22,41 lecturas por apertura simulada                 |
| Storage stored / downloaded per academic month  |               1.000 GiB / 2.000 GiB | “Mi Bodega” continúa excluida                                      |
| **Infrastructure cost per student per year**    | **CLP 450 base; CLP 1.000 ceiling** | PASS Staging: CLP 425 proyectados; no es costo total institucional |
| Product availability                            |                       99,9% mensual | Máximo 43 min 12 s de caída no planificada en 30 días              |
| RPO / RTO                                       |                           1 h / 4 h | Objetivo, pendiente de simulacro P0.8                              |

Requisitos operativos:

- **REQ-OPS-CAP-01 (Ubiquitous):** The system SHALL be designed and validated for 12,000 active students, 3,000 active section-periods and 72,000 active enrollments per semester.
- **REQ-OPS-CAP-02 (State-Driven):** WHILE validating exam-week capacity, the test harness SHALL sustain 3,000 simultaneous authenticated students for 30 minutes after a ramp of at most 10 minutes.
- **REQ-OPS-COST-01 (Unwanted Behavior):** IF the sustainable annualized infrastructure projection exceeds CLP 1,000 per active student-year, THEN institutional expansion SHALL stop until the cost is remediated and remeasured.
- **REQ-OPS-RES-02 (Unwanted Behavior):** IF a critical incident requires restoration, THEN critical academic service SHALL return within four hours with no more than one hour of academic data loss.

```gherkin
Scenario: La envolvente institucional se valida en staging
  Given 12.000 estudiantes, 3.000 secciones y 72.000 matrículas sintéticas
  When 3.000 sesiones se mantienen concurrentes durante 30 minutos
  Then p95 de HTML/API debe ser menor o igual a 2 segundos
  And HTTP 5xx debe permanecer bajo 0,1%
  And una apertura estudiantil de hasta 8 secciones no debe superar 200 lecturas Firestore

Scenario: La restauración demuestra continuidad
  Given un fallo controlado con registros académicos fechados
  When se ejecuta el runbook de recuperación en staging
  Then el servicio crítico debe volver dentro de 4 horas
  And el registro perdido más reciente no debe superar 1 hora
```

Acceptance: la capacidad y el costo P0.7 están demostrados en Staging por CEO-71 sin rebajar umbrales. El SLO mensual y la recuperación permanecen como objetivos hasta que sus mediciones y el simulacro P0.8 aprueben con los mismos umbrales.

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

Estado implementado en CEO-7 (2026-08-23): las notas y la configuración del libro se mutan mediante Functions autenticadas, y estado más evidencia se confirman en una transacción. `gradeAudit` registra autor confiable, reloj de servidor y valor anterior/nuevo; las reglas deniegan toda escritura cliente y aíslan la lectura estudiantil por UID. Pendiente operacional: desplegar Functions, índice y reglas en el orden documentado, ejecutar la matriz manual en staging/producción y construir la vista de consulta para completar el criterio de “surfaced”.

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
