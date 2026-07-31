# Delivery Manifest - GOVERNANCE-003-CODEX-READONLY (Remediation 01)

## Task Information
- **Task ID**: GOVERNANCE-003-CODEX-READONLY
- **Policy Version**: 1.0.0 -> 1.1.0
- **Builder**: 扣子编程 / coze-builder
- **Inspector**: Codex / codex-inspector (read_only)
- **Environment**: local_governance_workspace
- **Data Source**: repository_files_only
- **Remediation Round**: 01

## Input Baseline Verification (4/4 PASS)

| File | Expected SHA-256 | Actual SHA-256 | Match |
|------|-----------------|----------------|-------|
| GOVERNANCE.md | 14ca0339...9acc6d | 14ca0339...9acc6d | YES |
| AGENTS.md | 7dedb415...ab2ca7 | 7dedb415...ab2ca7 | YES |
| tasks/TASK_TEMPLATE.yaml | d205e1c0...c366af | d205e1c0...c366af | YES |
| tasks/GOVERNANCE-003-CODEX-READONLY.yaml | 382114be...d8988e | 382114be...d8988e | YES (read-only) |

## Deliverable Contents

### Modified Files (3)
1. `GOVERNANCE.md` - v1.1.0 (SHA-256: 5f35f882ff4aede90004921567b69655498aaf2e5cc233b2abd4c624e1b26a37)
2. `AGENTS.md` - Updated (SHA-256: 5c1f5b59cd67fd35a31974ce7ed590727c584cd60affe94472b2e622d42044f3)
3. `tasks/TASK_TEMPLATE.yaml` - Updated (SHA-256: e1dce58a24576b52265ec774f2501de0a60b721cf1866b07bccf9a63201159e7)

### Evidence Package (12 files)
4-15. `evidence/GOVERNANCE-003-CODEX-READONLY/*`

## Acceptance Criteria Results (AC-01 to AC-08)

| AC | Assertion | Result |
|----|-----------|--------|
| AC-01 | AGENTS.md和GOVERNANCE.md不再包含任务单授权Codex修复的例外 | PASS |
| AC-02 | 普通自然语言不得触发角色切换 | PASS |
| AC-03 | 专用角色切换令牌必须包含三个必要字段 | PASS |
| AC-04 | builder等于inspector时门禁输出BLOCK—ROLE_CONFLICT | PASS |
| AC-05 | 同一主体自检不能标为独立验收 | PASS |
| AC-06 | TASK_TEMPLATE默认Codex只读且write_allowed=false | PASS |
| AC-07 | 本任务没有修改三个授权规则文件与证据目录之外的文件 | PASS |
| AC-08 | 文档明确仓库规则不能替代宿主文件系统只读权限 | PASS |

## Delivery Package

- **ZIP File**: `GOVERNANCE-003-CODEX-READONLY-remediation-01.zip`
- **SHA-256**: b4f7a6862c8bca1b98d0855f229762774c31a323d41a384dca90f0dcc01a417d
- **Contents**: GOVERNANCE.md, AGENTS.md, tasks/TASK_TEMPLATE.yaml, evidence/GOVERNANCE-003-CODEX-READONLY/**
- **Excluded**: tasks/GOVERNANCE-003-CODEX-READONLY.yaml (read-only contract, not a deliverable)

## Construction Statement

整改施工完成，申请Codex复验。

Builder 不得自行声明：
- 独立验收 PASS
- 已获准进入下一阶段
- 宿主层只读权限已经生效
- 生产就绪
