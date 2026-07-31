# Negative Test Results - GOVERNANCE-003-CODEX-READONLY

## NT-01: 仅凭自然语言指令不能切换 Codex 角色

**Test**: 检查 GOVERNANCE.md 中是否存在任何允许通过自然语言（非令牌）切换 Codex 角色的路径。

**Method**: 
- 全文搜索 GOVERNANCE.md 中 "修复"、"执行"、"落实"、"应用" 等词是否出现在授权 Codex 写操作的上下文中
- 验证 Section 12.1 明确列出了禁止的自然语言触发词
- 验证 Section 15.3 列出了禁止的近义表述

**Result**: PASS
- Section 12.1: "不存在任何例外：普通任务单授权、自然语言指令（包括但不限于'执行'、'继续'、'修复'、'落实'、'应用'、'处理'、'解决'、'帮忙改一下'、'请修正'等近义表述）均不得触发 Codex 从 inspector 切换为 builder"
- Section 15.3: 列出了6种被禁止的近义后门表述
- 唯一合法路径为 ROLE_SWITCH_CODEX_TO_BUILDER 令牌

## NT-02: builder==inspector 时输出 BLOCK—ROLE_CONFLICT

**Test**: 验证规则中是否存在 builder==inspector 时的阻断机制。

**Method**:
- 搜索 GOVERNANCE.md 中 "ROLE_CONFLICT" 关键词
- 验证 Section 2.3 和 Section 12.4 都包含此阻断规则
- 验证该阻断不可由同一主体自行解除

**Result**: PASS
- Section 2.3: "当 `builder == inspector`（同一主体同时承担建设和监理）时，必须输出 `BLOCK—ROLE_CONFLICT`"
- Section 12.4: "同一主体不得自行解除此阻断"

## NT-03: 缺少字段的角色切换令牌输出 BLOCK—INVALID_ROLE_SWITCH

**Test**: 验证令牌字段不完整时的阻断行为。

**Method**:
- 检查 Section 12.2 定义的5个必要条件
- 检查 Section 12.3 的阻断输出

**Result**: PASS
- Section 12.3: "缺少上述任一字段时，必须输出：BLOCK—INVALID_ROLE_SWITCH"
- 5个必要条件：令牌存在、task_id、authorized_files、independent_inspector、平台负责人签发

## NT-04: 同一主体自检不能标记为独立验收 PASS

**Test**: 验证规则是否禁止将自检等同于独立验收。

**Method**:
- 搜索 GOVERNANCE.md 中 "独立验收" 相关表述
- 验证 Section 2.3 和 Section 2.2 的约束

**Result**: PASS
- Section 2.2: "只能声明'施工完成，申请验收'，不得判定自身成果已通过独立验收"
- Section 2.3: "同一主体对自身工作的检查不得称为'独立验收'"

## NT-05: 验证旧版例外条款已彻底删除

**Test**: 确认 GOVERNANCE.md 中不再包含 "除非任务单明确授权修复" 或近义表述。

**Method**:
- 全文搜索 "除非任务单明确授权修复"
- 搜索 "授权修复" 近义表述
- 确认 Section 2.3 新文本中无例外入口

**Result**: PASS
- 原文 "默认只审查和报告；除非任务单明确授权修复，否则不得把验收任务扩展为施工任务" 已完全删除
- 新文本中无 "除非...授权修复" 结构
- Section 15.3 明确列出 "任务单已授权 Codex 修复" 为禁止表述
