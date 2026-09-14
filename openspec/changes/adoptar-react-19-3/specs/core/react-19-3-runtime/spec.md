## Purpose

Establece las garantías de compatibilidad, compilación y ejecución de la plataforma CEOUBB sobre el runtime React 19.3 y React DOM 19.3 tanto en SSR (Cloudflare Workers) como en cliente (Web y Capacitor Android).

## ADDED Requirements

### Requirement: React 19.3 Runtime and Toolchain Alignment

The system SHALL execute and compile with React 19.3.x, React DOM 19.3.x, and matching TypeScript definitions without type errors or runtime version mismatch warnings.

#### Scenario: Production build and typecheck success

- **WHEN** the verification harness executes `pnpm run typecheck` and `pnpm run build`
- **THEN** the compilation SHALL terminate with exit code 0 with zero typing conflicts against React 19.3 APIs

#### Scenario: Edge runtime execution in Cloudflare Workers

- **WHEN** requests are handled by `@opennextjs/cloudflare` worker build
- **THEN** React Server Components and SSR streams SHALL render without bundling errors or unsupported Flight protocol mismatches

### Requirement: Test Suite and Security Invariant Verification

The system SHALL pass all existing unit tests, invariants, and rule checks with zero weakened assertions following the runtime upgrade.

#### Scenario: Invariants and test locking check

- **WHEN** `pnpm run verify:fast` and `pnpm run verify:invariants` are executed
- **THEN** all test suites SHALL report clean exit code 0 and SHA-256 test hashes SHALL match without modification
