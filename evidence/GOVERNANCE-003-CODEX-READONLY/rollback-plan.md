# Rollback Plan - GOVERNANCE-003-CODEX-READONLY

## Rollback Procedure

### Step 1: Restore GOVERNANCE.md
```bash
git checkout HEAD -- GOVERNANCE.md
```
This restores GOVERNANCE.md to version 1.0.0.

### Step 2: Restore AGENTS.md
```bash
git checkout HEAD -- AGENTS.md
```
This restores AGENTS.md to its pre-construction state.

### Step 3: Remove new task files
```bash
rm tasks/GOVERNANCE-003-CODEX-READONLY.yaml
rm tasks/TASK_TEMPLATE.yaml
```

### Step 4: Remove evidence directory
```bash
rm -rf evidence/GOVERNANCE-003-CODEX-READONLY/
```

### Step 5: Verify rollback
```bash
# Verify GOVERNANCE.md is back to 1.0.0
grep "policy_version" GOVERNANCE.md
# Expected: policy_version: 1.0.0

# Verify no new files remain
ls tasks/GOVERNANCE-003-CODEX-READONLY.yaml 2>&1
# Expected: No such file or directory

ls tasks/TASK_TEMPLATE.yaml 2>&1
# Expected: No such file or directory

ls evidence/GOVERNANCE-003-CODEX-READONLY/ 2>&1
# Expected: No such file or directory
```

## Rollback Impact

- All governance rule changes from 1.1.0 will be reverted to 1.0.0
- The "除非任务单明确授权修复" exception will be restored
- Codex role hardening rules will be removed
- No business code, tests, configs, or dependencies are affected
- No data loss risk (only governance documentation files)

## Rollback Authorization

Rollback can be performed by:
- Platform owner (平台负责人) direct instruction
- Builder (扣子编程) with task authorization
- Any party with git write access to the repository

## Pre-Construction Snapshots

Pre-construction snapshots are saved at:
- `/tmp/GOVERNANCE.md.before` (GOVERNANCE.md v1.0.0)
- `/tmp/AGENTS.md.before` (AGENTS.md pre-construction)
