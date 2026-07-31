# Acceptance Criteria Mapping - GOVERNANCE-003-CODEX-READONLY (Remediation)

严格按正式任务合同 AC-01 至 AC-08 逐项映射。

## AC-01: AGENTS.md和GOVERNANCE.md不再包含任务单授权Codex修复的例外
**Status: PASS**
- GOVERNANCE.md Section 2.3: 原文"默认只审查和报告；除非任务单明确授权修复，否则不得把验收任务扩展为施工任务"已删除
- GOVERNANCE.md Section 2.3: 新增"不存在任何例外：普通任务单授权、自然语言指令...均不得触发 Codex 从 inspector 切换为 builder"
- AGENTS.md: 原文"只有任务单明确授权修复时，才可以修改相应文件"已删除
- AGENTS.md: 新增"Codex 不得新增、修改或删除源码、测试、配置、依赖、部署产物或数据库状态"
- Diff evidence: diff-GOVERNANCE.md.txt, diff-AGENTS.md.txt

## AC-02: 普通自然语言不得触发角色切换
**Status: PASS**
- GOVERNANCE.md Section 2.3: "普通任务单授权、自然语言指令（包括但不限于'执行'、'继续'、'修复'、'落实'、'应用'、'处理'、'解决'）均不得触发 Codex 从 inspector 切换为 builder"
- GOVERNANCE.md Section 12.3: "普通自然语言和普通任务单授权均不得替代专用令牌"
- GOVERNANCE.md Section 15.3: 列出6种被禁止的近义后门表述

## AC-03: 专用角色切换令牌必须包含三个必要字段
**Status: PASS**
- GOVERNANCE.md Section 2.3: 角色切换必须同时满足：task_id、authorized_files、independent_inspector
- GOVERNANCE.md Section 12.3: 令牌格式定义包含全部三个必要字段
- 正式任务合同 role_switch_contract.required_fields 一致

## AC-04: builder等于inspector时门禁输出BLOCK—ROLE_CONFLICT
**Status: PASS**
- GOVERNANCE.md Section 2.3: "当 builder == inspector 时，必须输出 BLOCK—ROLE_CONFLICT"
- GOVERNANCE.md Section 12.1: separation_of_duties_gate 明确此规则
- AGENTS.md: 未修改此行为（继承GOVERNANCE.md）
- TASK_TEMPLATE.yaml: role_conflict_status: BLOCK—ROLE_CONFLICT

## AC-05: 同一主体自检不能标为独立验收
**Status: PASS**
- GOVERNANCE.md Section 2.3: "同一主体对自身工作的检查不得称为'独立验收'"
- GOVERNANCE.md Section 12.1: 重申此规则
- AGENTS.md Section 2.2 (GOVERNANCE.md): "只能声明'施工完成，申请验收'，不得判定自身成果已通过独立验收"

## AC-06: TASK_TEMPLATE默认Codex只读且write_allowed=false
**Status: PASS**
- tasks/TASK_TEMPLATE.yaml 新增字段：
  - role: inspector
  - mode: read_only
  - write_allowed: false
  - builder_must_not_equal_inspector: true
  - role_conflict_status: BLOCK—ROLE_CONFLICT
- 与正式任务合同 task_template_yaml required_changes 完全一致
- Diff evidence: diff-TASK_TEMPLATE.yaml.txt

## AC-07: 本任务没有修改三个授权规则文件与证据目录之外的文件
**Status: PASS**
- 仅修改了 GOVERNANCE.md、AGENTS.md、tasks/TASK_TEMPLATE.yaml
- 证据目录 evidence/GOVERNANCE-003-CODEX-READONLY/ 为新建
- tasks/GOVERNANCE-003-CODEX-READONLY.yaml 未修改（SHA-256 与基线一致）
- src/**、tests/**、config/**、runtime/**、adapters/**、database/**、package.json、pnpm-lock.yaml 均未修改
- Evidence: forbidden-files-proof.md (含实际 git diff 命令输出)

## AC-08: 文档明确仓库规则不能替代宿主文件系统只读权限
**Status: PASS**
- GOVERNANCE.md Section 14: 专门章节说明宿主层权限与仓库规则的关系
- Section 14.2: "仓库内的规则声明不能替代 Codex Desktop 宿主层的文件系统只读权限"
- Section 14.2: "若要技术上禁止 Codex 写 src/tests/config，平台负责人必须在 Codex 任务/沙箱配置中将这些目录设置为只读"
- 与正式任务合同 external_enforcement_requirement 一致
