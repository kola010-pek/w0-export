# AC-01 至 AC-08 逐项映射 - GOVERNANCE-003-CODEX-READONLY (Remediation 02)

## AC-01: AGENTS.md和GOVERNANCE.md不再包含任务单授权Codex修复的例外
- **验证方法**: `grep "除非任务单明确授权修复\|只有任务单明确授权修复" GOVERNANCE.md AGENTS.md`
- **实际输出**: 未找到任何匹配 (exit code 1)
- **结果**: PASS
- **证据**: diff-GOVERNANCE.md.txt, diff-AGENTS.md.txt

## AC-02: 普通自然语言不得触发角色切换
- **验证方法**: GOVERNANCE.md Section 2.4 明确写入"普通自然语言指令（包括但不限于'执行'、'继续'、'修复'、'落实'、'应用'、'请修改'、'请施工'等）不得触发 Codex 角色切换"
- **实际输出**: grep "不得触发 Codex 角色切换" GOVERNANCE.md → 找到
- **结果**: PASS

## AC-03: 专用角色切换令牌必须包含三个必要字段
- **验证方法**: GOVERNANCE.md Section 2.4 和 AGENTS.md 角色切换规则均明确列出三个必要字段：task_id、authorized_files、independent_inspector
- **实际输出**: grep "task_id\|authorized_files\|independent_inspector" GOVERNANCE.md → 找到全部三个字段
- **结果**: PASS

## AC-04: builder等于inspector时门禁输出BLOCK—ROLE_CONFLICT
- **验证方法**: GOVERNANCE.md Section 2.4 写入"builder 不得等于 inspector。当 builder == inspector 时，必须输出 BLOCK—ROLE_CONFLICT"；AGENTS.md 角色切换规则写入相同内容
- **实际输出**: grep "BLOCK—ROLE_CONFLICT" GOVERNANCE.md AGENTS.md → 找到
- **结果**: PASS

## AC-05: 同一主体自检不能标为独立验收
- **验证方法**: GOVERNANCE.md Section 2.4 写入"同一主体的自检不得称为独立验收"；AGENTS.md 监理边界写入相同内容
- **实际输出**: grep "同一主体的自检不得称为独立验收" GOVERNANCE.md AGENTS.md → 找到
- **结果**: PASS

## AC-06: TASK_TEMPLATE默认Codex只读且write_allowed=false
- **验证方法**: tasks/TASK_TEMPLATE.yaml 新增字段 role: inspector, mode: read_only, write_allowed: false, builder_must_not_equal_inspector: true, role_conflict_status: BLOCK—ROLE_CONFLICT
- **实际输出**: grep "role:\|mode:\|write_allowed:\|builder_must_not\|role_conflict" tasks/TASK_TEMPLATE.yaml → 找到全部5个字段
- **结果**: PASS

## AC-07: 本任务没有修改三个授权规则文件与证据目录之外的文件
- **验证方法**: git diff --name-only HEAD 检查所有变更文件
- **实际输出**: 仅 GOVERNANCE.md, AGENTS.md, tasks/TASK_TEMPLATE.yaml, evidence/GOVERNANCE-003-CODEX-READONLY/** 在变更列表中
- **禁止文件验证**: src/**, tests/**, config/**, runtime/**, adapters/**, database/**, package.json, pnpm-lock.yaml, tasks/GOVERNANCE-003-CODEX-READONLY.yaml 均未修改
- **结果**: PASS
- **证据**: raw-command-output.txt, forbidden-files-proof.md

## AC-08: 文档明确仓库规则不能替代宿主文件系统只读权限
- **验证方法**: GOVERNANCE.md Section 2.5 "宿主层权限声明" 明确写入"仓库内的 Markdown/YAML 规则文件仅形成治理门禁，不能替代 Codex Desktop 宿主层授予的文件系统权限"
- **实际输出**: grep "宿主层权限\|不能替代.*宿主层" GOVERNANCE.md → 找到
- **结果**: PASS
