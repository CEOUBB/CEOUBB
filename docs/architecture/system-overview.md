# System Architecture Overview: Centro de Estudio UBB (CEOUBB)

## 1. Executive Summary & Mission

Centro de Estudio UBB is an institutional Learning Management System (LMS) designed for the students, faculty, and academic departments of Universidad del Bío-Bío (UBB). The platform is engineered to operate at full institutional scale (>5,000 students, thousands of course sections across multiple faculties in Concepción and Chillán).

---

## 2. System Topology & Persistence Decoupling

```
                  ┌──────────────────────────────────────────────┐
                  │          Client Runtimes / Consumers         │
                  │   - Desktop / Mobile Web (Next.js 16)        │
                  │   - Android Native Shell (Capacitor 7)       │
                  └──────────────┬───────────────────────────────┘
                                 │
                 HTTPS / REST    │     Real-Time Listeners (onSnapshot)
                                 ▼
      ┌──────────────────────────────────────┐       ┌──────────────────────────────┐
      │   Vercel Edge / Serverless API       │       │    Cloud Firestore Database  │
      │   - Next.js 16 App Router            │       │   - Live Posts & Feed        │
      │   - Session Auth (Cookie / JWT)      │       │   - Weekly Calendar Events   │
      │   - Administrative Mutations         │       │   - Student Grade Overviews  │
      └──────────────┬───────────────────────┘       │   - Membership Projections   │
                     │                               └──────────────┬───────────────┘
                     │ libSQL Driver                                │
                     ▼                                              │ Declarative Rules
      ┌──────────────────────────────────────┐                      ▼
      │   Turso / libSQL (Drizzle ORM)       │       ┌──────────────────────────────┐
      │   * SYSTEM OF RECORD (SoR) *         │       │   Firebase Security Rules    │
      │   - Faculties & Careers              │       │   - isTeacher() / isOwner()  │
      │   - Subjects & Course Sections       │       │   - Exists() Membership      │
      │   - Enrollments & User Directory     │       │   - Storage Security Rules   │
      └──────────────────────────────────────┘       └──────────────────────────────┘
```

---

## 3. Core Architectural Layers

1. **System of Record (SoR) — Turso / libSQL:**
   - Single source of truth for the canonical academic structure.
   - Versioned and managed via Drizzle ORM (`db/schema.ts`, `drizzle/`).
   - ACID transactions, strict foreign key constraints, and indexed bounded queries (`.limit()`).

2. **Operational Real-Time Projection — Cloud Firestore:**
   - Low-latency real-time collaboration layer.
   - Document-level security enforcement with rule predicates.
   - One-way lightweight membership projection from Turso.

3. **Authentication & Role Derivation — `lib/access-policy.ts`:**
   - Deterministic domain mapping: `@alumnos.ubiobio.cl` $\rightarrow$ `student`, `@ubiobio.cl` $\rightarrow$ `teacher`.
   - Synchronized across 4 architectural mirrors (TypeScript policy, Firestore rules, Storage rules, Native strings).

4. **Mobile Runtime — Capacitor 7:**
   - Remote-first WebView pointing to `https://ceoubb.com`.
   - Offline contingency document in `capacitor/www/`.
   - Dynamic safe-area inset management and native bridge abstractions (`lib/mobile-bridge.ts`).
