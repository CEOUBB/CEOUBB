# Rule: Spec-Driven Development (SDD) Invariant

1. **Spec Prerequisite**: For any non-trivial feature, architectural change, data model migration, or cross-cutting remediation, a formal specification file (`docs/specs/<track>-<feature>.md`) MUST be created and approved before writing application code.
2. **Living Specification Lifecycle**: If code requirements or domain logic evolve during implementation, the specification in `docs/specs/` MUST be updated in the same commit/PR.
3. **Test Assertion Protection**: Agents are strictly forbidden from deleting or weakening test assertions to bypass failures. If a test fails, the agent must fix the code to meet the spec, or explicitly propose a spec amendment if the contract itself was flawed.
4. **Traceability**: All commit messages and PR descriptions must cite the corresponding specification ID.
