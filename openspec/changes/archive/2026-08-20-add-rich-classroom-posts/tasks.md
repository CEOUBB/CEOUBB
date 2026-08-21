## 1. Specification and locked acceptance tests

- [x] 1.1 Record CEO-55 as the approved `classroom/rich-posts` capability with EARS requirements and BDD scenarios. Verify: `pnpm exec openspec validate add-rich-classroom-posts --strict`
- [x] 1.2 Add RED tests for legacy text, the four required languages, formulas, unsafe HTML/URLs, writer limits, shared preview and Android remote parity. Verify: `pnpm exec node --experimental-strip-types --test tests/rich-text.test.ts`
- [x] 1.3 Register the approved test file in SHA-256 test-locking. Verify: `node scripts/verify-test-hashes.mjs --check`

## 2. Domain parser and security boundary

- [x] 2.1 Implement the bounded typed parser, code language normalization, tokenization and safe URL allowlist. Depends on: 1.2. Verify: `pnpm run typecheck`
- [x] 2.2 Enforce the 40,000-character authoring bound and safe external link at the Firebase write boundary. Depends on: 2.1. Verify: `pnpm run verify:fast`

## 3. Shared rendering and authoring UI

- [x] 3.1 Render the typed document as escaped React nodes and integrate vendored KaTeX with strict untrusted-input limits and a source fallback. Depends on: 2.1. Verify: `pnpm run typecheck`
- [x] 3.2 Build the controlled editor whose deferred live preview uses the published renderer. Depends on: 3.1. Verify: `pnpm run lint`
- [x] 3.3 Integrate creation, inline editing and feed rendering while preserving failed drafts. Depends on: 2.2, 3.2. Verify: `pnpm run verify:fast`
- [x] 3.4 Add responsive institutional styles for prose, code, formulas and editor surfaces. Depends on: 3.3. Verify: `pnpm run lint`

## 4. Verification and handoff

- [x] 4.1 Run `pnpm run verify:fast`, `pnpm run verify:invariants`, `pnpm run lint`, Prettier on every changed file and `pnpm test` with zero warnings or failures.
- [x] 4.2 Archive the verified OpenSpec change into `openspec/specs/classroom/rich-posts/spec.md` and revalidate the living specifications.
- [x] 4.3 Update `PLAN.md`, publish the feature branch and draft PR, link it to CEO-55 and move the Linear issue to review.
