# ADR 0001: Data Persistence Decoupling (Turso libSQL vs Cloud Firestore)

- **Status:** Accepted
- **Date:** 2026-08-14
- **Decision Makers:** CEOUBB Architecture & Engineering Team
- **Related Specs:** `docs/specs/p1-academic-model.md`, `AGENTS.md`

---

## Context & Problem Statement

The CEOUBB platform manages two fundamentally distinct categories of data with diverging scale, consistency, and latency requirements:

1. **Canonical Academic Relational Model:** Strict hierarchy comprising faculties, departments, degree programs, subjects, academic periods, course sections, and official student enrollments. This demands strict relational referential integrity, foreign key cascades, ACID transactions, and reproducible SQL schema migrations.
2. **Real-Time Interactive Classroom:** Dynamic classroom post feeds, large file attachments, read receipt tracking, instant push notifications, and fine-grained document-level access control.

Attempting to model everything inside Cloud Firestore led to data duplication, expensive global queries, and lack of relational schema guarantees. Conversely, using a traditional SQL database for real-time post streams required complex, cost-heavy WebSocket infrastructure on serverless edge runtimes.

---

## Decision

Implement a **specialized dual-store architecture**:

1. **Turso / libSQL as the System of Record (SoR):** Stores relational academic data (`facultades`, `carreras`, `secciones`, `inscripciones`, `usuarios`) managed through Drizzle ORM.
2. **Cloud Firestore as the Real-Time Operational Projection:** Stores interactive feeds, comments, and a one-way lightweight membership projection (`courses/{courseId}/members/{userId}`) enabling $O(1)$ security checks in `firestore.rules`.

---

## Consequences

### Positive:

- Strong ACID relational consistency for university enrollments and student records.
- Rich real-time frontend experience powered by Firestore `onSnapshot` listeners.
- Predictable infrastructure costs: relational read queries run on fixed compute, while Firestore reads scale only with active real-time engagement.

### Negative / Mitigations:

- Dual-store mutation overhead on user role changes or enrollments.
  - _Mitigation:_ Centralized in transactional API routes (`app/api/admin/`) with concurrent projections and automated verification in test suites (`tests/admin-api.test.ts`).
