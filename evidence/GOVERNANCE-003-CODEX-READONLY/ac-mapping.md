# Acceptance Criteria Mapping - GOVERNANCE-003-CODEX-READONLY

## AC-01: policy_version 从 1.0.0 提升到 1.1.0
**Status: PASS**
- Evidence: GOVERNANCE.md header now shows `policy_version: 1.1.0`
- Diff: `diff-GOVERNANCE.md.txt` line showing version change
- Changelog entry added documenting the change

## AC-02: 彻底删除"普通任务单授权后Codex可以修复或施工"的例外及近义表述
**Status: PASS**
- Evidence: Original text "默认只审查和报告；除非任务单明确授权修复，否则不得把验收任务扩展为施工任务。" has been removed
- New Section 2.3 explicitly states: "不存在任何例外：普通任务单授权、自然语言指令...均不得触发 Codex 从 inspector 切换为 builder"
- Section 15.3 lists specific prohibited synonymous expressions

## AC-03: 固化 Codex 默认角色：role=inspector, mode=read_only, write_allowed=false
**Status: PASS**
- Evidence: Section 2.3 first bullet: "默认角色固定为 `inspector`，运行模式固定为 `read_only`，写权限固定为 `write_allowed=false`"
- Also referenced in AGENTS.md governance section

## AC-04: builder==inspector 时必须输出 BLOCK—ROLE_CONFLICT
**Status: PASS**
- Evidence: Section 2.3: "当 `builder == inspector`（同一主体同时承担建设和监理）时，必须输出 `BLOCK—ROLE_CONFLICT`"
- Also in Section 12.4 with explicit prohibition on self-resolution

## AC-05: 普通自然语言不得触发 Codex 角色切换
**Status: PASS**
- Evidence: Section 12.1 explicitly lists prohibited natural language triggers: "执行"、"继续"、"修复"、"落实"、"应用"、"处理"、"解决"、"帮忙改一下"、"请修正"
- Section 15.3 provides additional examples of prohibited synonymous expressions

## AC-06: 角色切换只能使用专用令牌 ROLE_SWITCH_CODEX_TO_BUILDER
**Status: PASS**
- Evidence: Section 12.2: "只有当以下全部条件同时满足时，Codex 方可从 inspector 临时切换为 builder：1. 存在专用令牌 ROLE_SWITCH_CODEX_TO_BUILDER"
- Token format defined in YAML

## AC-07: 角色切换必须同时包含 task_id、authorized_files、independent_inspector
**Status: PASS**
- Evidence: Section 12.2 conditions 2-4 explicitly require all three fields
- Token format YAML shows all required fields

## AC-08: 缺少任一字段必须输出 BLOCK—INVALID_ROLE_SWITCH
**Status: PASS**
- Evidence: Section 12.3: "缺少上述任一字段时，必须输出：BLOCK—INVALID_ROLE_SWITCH"

## AC-09: 同一主体的自检不得称为独立验收
**Status: PASS**
- Evidence: Section 2.3 last bullet: "同一主体对自身工作的检查不得称为'独立验收'"

## AC-10: 每次写操作前必须执行并记录 pre_action_role_check
**Status: PASS**
- Evidence: Section 13 defines complete pre_action_role_check mechanism
- YAML schema for check record provided
- Section 13.4 requires recording in evidence package
- This construction's rule-acknowledgement.yaml includes pre_action_role_checks for all 4 file operations

## AC-11: 明确说明仓库 Markdown/YAML 规则不能替代 Codex Desktop 宿主层只读权限
**Status: PASS**
- Evidence: Section 14 dedicated entirely to this topic
- Section 14.2 explicitly states: "仓库内的规则声明不能替代 Codex Desktop 宿主层的文件系统只读权限"
- Section 14.3 defines dual-layer protection requirement

## AC-12: 不得通过降低标准、改写验收条件或删除门禁来取得 PASS
**Status: PASS**
- Evidence: Section 15 dedicated to anti-circumvention
- Section 15.1 lists specific prohibited methods
- Section 15.2 prohibits rule modification to remove BLOCKs without explicit authorization
- This construction did NOT lower any standards, rewrite ACs, or delete gates
