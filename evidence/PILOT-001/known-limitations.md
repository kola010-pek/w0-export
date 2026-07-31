# PILOT-001 Known Limitations

## 1. Playwright Config Scope

The existing `playwright.config.ts` has `testMatch` restricted to
`**/phase2-2-browser-tests.spec.ts`. The new test file
`tests/pilot-001-governance-card.spec.ts` does not match this pattern.

**Workaround used**: A temporary config was created at `/tmp/pw-pilot001.config.ts`
to run the PILOT-001 tests. This file is outside the project directory and
does not modify any project file.

**Recommendation**: Update `playwright.config.ts` `testMatch` to include
`**/pilot-001-governance-card.spec.ts` or broaden to `**/*.spec.ts`
to allow the test to be discovered by the standard config. This change
requires authorization outside PILOT-001 scope.

## 2. AC-09 TypeScript Check: BLOCK

`pnpm ts-check` exits with code **1** (FAILURE). The project has **33** pre-existing
TypeScript errors in:
- `tests/integration/w0-integration.test.ts` (null safety: TS2345, TS18047)
- `tests/smoke/w0-smoke.test.ts` (null safety: TS2345, TS18047)

These are NOT introduced by PILOT-001 and are outside the authorized
modification scope.

**AC-09 cannot be claimed as PASS.** Status: **BLOCK**.
Requesting acceptance criteria modification: either scope AC-09 to
authorized files only, or authorize a separate fix for pre-existing errors.

## 3. Pre-existing ESLint Issues

62 errors and 86 warnings exist across pre-existing files.
None are introduced by PILOT-001 changes.

## 4. Governance Card Data Sources

The governance card displays data derived from already-fetched API responses
(health, preflight, quality gates). It does not introduce new API calls.
Role assignments are static (derived from `config/agents.yaml` structure
known at build time). If agent configuration changes, the card's role
section would need manual update.

## 5. Static Policy Version

The `policy_version` field is hardcoded to `1.0.0` in the governance card.
This matches the current `rule-acknowledgement.yaml` policy version.
If the policy version changes, this value should be updated accordingly.
