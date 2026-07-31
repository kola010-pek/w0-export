# Forbidden Files Proof - GOVERNANCE-003-CODEX-READONLY (Remediation 02)

## 实际命令输出

```bash
$ git diff --name-only HEAD
AGENTS.md
GOVERNANCE.md
evidence/GOVERNANCE-003-CODEX-READONLY/ac-mapping.md
evidence/GOVERNANCE-003-CODEX-READONLY/baseline-verification.txt
evidence/GOVERNANCE-003-CODEX-READONLY/changed-files.txt
evidence/GOVERNANCE-003-CODEX-READONLY/delivery-manifest.md
evidence/GOVERNANCE-003-CODEX-READONLY/diff-AGENTS.md.txt
evidence/GOVERNANCE-003-CODEX-READONLY/diff-GOVERNANCE.md.txt
evidence/GOVERNANCE-003-CODEX-READONLY/diff-TASK_TEMPLATE.yaml.txt
evidence/GOVERNANCE-003-CODEX-READONLY/forbidden-files-proof.md
evidence/GOVERNANCE-003-CODEX-READONLY/known-limitations.md
evidence/GOVERNANCE-003-CODEX-READONLY/negative-tests.md
evidence/GOVERNANCE-003-CODEX-READONLY/raw-command-output.txt
evidence/GOVERNANCE-003-CODEX-READONLY/rollback-plan.md
evidence/GOVERNANCE-003-CODEX-READONLY/rule-acknowledgement.yaml
evidence/GOVERNANCE-003-CODEX-READONLY/sha256sums.txt
tasks/TASK_TEMPLATE.yaml
```

## 禁止文件检查结果

| Category | Command | Output | Modified? |
|----------|---------|--------|-----------|
| src/** | `git diff --name-only HEAD -- src/` | (empty) | NO |
| tests/** | `git diff --name-only HEAD -- tests/` | (empty) | NO |
| config/** | `git diff --name-only HEAD -- config/` | (empty) | NO |
| runtime/** | `git diff --name-only HEAD -- runtime/` | (empty) | NO |
| adapters/** | `git diff --name-only HEAD -- adapters/` | (empty) | NO |
| database/** | `git diff --name-only HEAD -- database/` | (empty) | NO |
| package.json | `git diff --name-only HEAD -- package.json` | (empty) | NO |
| pnpm-lock.yaml | `git diff --name-only HEAD -- pnpm-lock.yaml` | (empty) | NO |
| tasks/GOVERNANCE-003-CODEX-READONLY.yaml | `git diff --name-only HEAD -- tasks/GOVERNANCE-003-CODEX-READONLY.yaml` | (empty) | NO |

## 结论

变更范围仅限于授权文件：
- GOVERNANCE.md ✓
- AGENTS.md ✓
- tasks/TASK_TEMPLATE.yaml ✓
- evidence/GOVERNANCE-003-CODEX-READONLY/** ✓

所有禁止文件均未修改。
