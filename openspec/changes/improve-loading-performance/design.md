## Context

Use the existing authentication, sanitizer, Firestore authorization, and QA runtime. Keep the anonymous entry static. Cookie presence selects a private server route but never grants authorization. Session validation remains authoritative. The service worker must not store personalized HTML or RSC responses.

## Decisions

1. Extract a client leaf for the public access screen; preserve the existing sign-in exchange, native hooks, and in-place campus logout behavior.
2. Preserve CSS order while splitting shared/public and campus rules. Adapt protected test source locations only, keeping assertions intact.
3. Shared profile contracts contain no server imports. Existing server exports remain compatible with callers.
4. Activity projection is server owned, compact, idempotent, and reads current source inside a transaction. A deployment gate keeps full-document reads until trigger deployment and bounded backfill parity are verified.
5. Use existing Sharp for local brand resizing and compression; keep originals and image proportions. Never apply immutable caching to mutable HTML, APIs, or brand filenames.
6. Compiler, primary database migration, and full ISR infrastructure require demonstrated benefit. No invented speedup, production deployment, or private cache is acceptable.

## Validation and Rollout

Run formatting, lint, typecheck, protected test hashes, unit/invariant/build tests, affected QA and private cache isolation checks. Compare a local production baseline and candidate with the same network/CPU settings; deployed audit metrics are context, not an interchangeable before measurement. Document inaccessible authenticated staging and conditional experiments. Deploy rules/trigger, backfill and verify parity before enabling compact activity; do not activate the gate prematurely.
