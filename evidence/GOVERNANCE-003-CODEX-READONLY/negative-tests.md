# Negative Tests - GOVERNANCE-003-CODEX-READONLY (Remediation 02)

## NT-01: 普通自然语言不能触发Codex角色切换

- **测试目标**: 验证 GOVERNANCE.md 和 AGENTS.md 中明确禁止普通自然语言触发角色切换
- **实际执行命令**: `grep -n "不得触发 Codex 角色切换" GOVERNANCE.md AGENTS.md`
- **完整原始输出**:
  ```
  GOVERNANCE.md:47:- 普通自然语言指令（包括但不限于"执行"、"继续"、"修复"、"落实"、"应用"、"请修改"、"请施工"等）**不得触发 Codex 角色切换**。
  AGENTS.md:40:- 普通自然语言指令（包括但不限于"执行"、"继续"、"修复"、"落实"、"应用"、"请修改"、"请施工"等）**不得触发 Codex 角色切换**。
  ```
- **预期结果**: 两个文件中均存在明确的禁止条款
- **实际结果**: 两个文件中均找到禁止条款
- **结论**: PASS

## NT-02: 角色切换令牌缺少task_id时输出BLOCK—INVALID_ROLE_SWITCH

- **测试目标**: 验证 GOVERNANCE.md 中明确写入缺少字段时返回 BLOCK—INVALID_ROLE_SWITCH
- **实际执行命令**: `grep -n "BLOCK—INVALID_ROLE_SWITCH" GOVERNANCE.md AGENTS.md`
- **完整原始输出**:
  ```
  GOVERNANCE.md:54:- 缺少任一字段时，必须输出 `BLOCK—INVALID_ROLE_SWITCH`，禁止执行写操作。
  AGENTS.md:44:- 缺少任一字段时，必须输出 `BLOCK—INVALID_ROLE_SWITCH`。
  ```
- **预期结果**: 两个文件中均存在 BLOCK—INVALID_ROLE_SWITCH 定义
- **实际结果**: 两个文件中均找到
- **结论**: PASS

## NT-03: 角色切换令牌缺少authorized_files时输出BLOCK—INVALID_ROLE_SWITCH

- **测试目标**: 验证缺少 authorized_files 字段同样触发 BLOCK—INVALID_ROLE_SWITCH
- **实际执行命令**: `grep -n "authorized_files" GOVERNANCE.md AGENTS.md`
- **完整原始输出**:
  ```
  GOVERNANCE.md:52:  - `authorized_files`：授权修改的文件列表；
  AGENTS.md:42:  - `authorized_files`：授权修改的文件列表；
  ```
- **预期结果**: authorized_files 被列为三个必要字段之一，缺少时触发 BLOCK—INVALID_ROLE_SWITCH
- **实际结果**: 字段已列为必要字段，与 NT-02 共享同一阻断逻辑
- **结论**: PASS

## NT-04: 角色切换令牌缺少independent_inspector时输出BLOCK—INVALID_ROLE_SWITCH

- **测试目标**: 验证缺少 independent_inspector 字段同样触发 BLOCK—INVALID_ROLE_SWITCH
- **实际执行命令**: `grep -n "independent_inspector" GOVERNANCE.md AGENTS.md`
- **完整原始输出**:
  ```
  GOVERNANCE.md:53:  - `independent_inspector`：独立监理人标识（不得与 builder 相同）。
  AGENTS.md:43:  - `independent_inspector`：独立监理人标识（不得与 builder 相同）。
  ```
- **预期结果**: independent_inspector 被列为三个必要字段之一，缺少时触发 BLOCK—INVALID_ROLE_SWITCH
- **实际结果**: 字段已列为必要字段，与 NT-02 共享同一阻断逻辑
- **结论**: PASS

## NT-05: builder等于inspector时输出BLOCK—ROLE_CONFLICT

- **测试目标**: 验证 builder == inspector 时输出 BLOCK—ROLE_CONFLICT
- **实际执行命令**: `grep -n "BLOCK—ROLE_CONFLICT" GOVERNANCE.md AGENTS.md`
- **完整原始输出**:
  ```
  GOVERNANCE.md:44:- **builder 不得等于 inspector**。当 `builder == inspector` 时，必须输出 `BLOCK—ROLE_CONFLICT`，禁止进入施工或验收环节。
  AGENTS.md:46:- **builder 等于 inspector 时**，必须输出 `BLOCK—ROLE_CONFLICT`。
  ```
- **预期结果**: 两个文件中均存在 BLOCK—ROLE_CONFLICT 定义
- **实际结果**: 两个文件中均找到
- **结论**: PASS

## NT-06: 同一主体自检不能标记为独立验收

- **测试目标**: 验证同一主体的自检不得称为独立验收
- **实际执行命令**: `grep -n "同一主体的自检不得称为独立验收" GOVERNANCE.md AGENTS.md`
- **完整原始输出**:
  ```
  GOVERNANCE.md:45:- 同一主体的自检不得称为独立验收。
  AGENTS.md:35:- **同一主体的自检不得称为独立验收。**
  ```
- **预期结果**: 两个文件中均存在禁止条款
- **实际结果**: 两个文件中均找到
- **结论**: PASS

## NT-07: GOVERNANCE.md和AGENTS.md中不存在旧例外

- **测试目标**: 验证旧版例外条款已被彻底删除
- **实际执行命令**: `grep -n "除非任务单明确授权修复\|只有任务单明确授权修复" GOVERNANCE.md AGENTS.md`
- **完整原始输出**: (无输出，exit code 1)
- **预期结果**: 不应找到任何匹配
- **实际结果**: 未找到任何匹配 (exit code 1)
- **结论**: PASS
