# Rollback Plan - GOVERNANCE-003-CODEX-READONLY (Remediation)

## 回滚基线（施工前版本 SHA-256）

| File | SHA-256 |
|------|---------|
| GOVERNANCE.md | 14ca03393a6ace37263c09e9627bb4e48c7b61daaf171959251e68b68d9acc6d |
| AGENTS.md | 7dedb415c10a2cd117e207b47f292ce4a1009539fca70da1378572fccaab2ca7 |
| tasks/TASK_TEMPLATE.yaml | d205e1c00918d389929ef065bd8e388b186c168cf3fdd8ff137816de39c366af |

## 回滚步骤

### Step 1: 恢复 GOVERNANCE.md 到 v1.0.0
```bash
# 使用平台负责人提供的基线文件恢复
cp /tmp/baseline_GOVERNANCE.md GOVERNANCE.md
# 验证 SHA-256
sha256sum GOVERNANCE.md
# 期望: 14ca03393a6ace37263c09e9627bb4e48c7b61daaf171959251e68b68d9acc6d
```

### Step 2: 恢复 AGENTS.md
```bash
cp /tmp/baseline_AGENTS.md AGENTS.md
sha256sum AGENTS.md
# 期望: 7dedb415c10a2cd117e207b47f292ce4a1009539fca70da1378572fccaab2ca7
```

### Step 3: 恢复 tasks/TASK_TEMPLATE.yaml
```bash
cp /tmp/baseline_TASK_TEMPLATE.yaml tasks/TASK_TEMPLATE.yaml
sha256sum tasks/TASK_TEMPLATE.yaml
# 期望: d205e1c00918d389929ef065bd8e388b186c168cf3fdd8ff137816de39c366af
```

### Step 4: 删除本次整改证据目录
```bash
rm -rf evidence/GOVERNANCE-003-CODEX-READONLY/
```

### Step 5: 验证回滚
```bash
sha256sum GOVERNANCE.md AGENTS.md tasks/TASK_TEMPLATE.yaml
# 三个文件的 SHA-256 必须与回滚基线完全一致
```

## 回滚约束

- **不得删除** tasks/GOVERNANCE-003-CODEX-READONLY.yaml（正式任务合同，只读输入）
- **不得依赖** /tmp 临时文件作为唯一回滚来源（平台负责人应保留基线文件副本）
- **回滚执行人**：仅限平台负责人或其书面授权的 builder
- **回滚授权条件**：平台负责人书面指令，或 Codex 验收 BLOCK 后平台负责人决定回滚
- **角色分离**：回滚操作不得由 inspector（Codex）执行

## 回滚影响

- 治理规则恢复到 v1.0.0
- "除非任务单明确授权修复"例外恢复
- Codex 角色硬化规则移除
- 无业务代码、测试、配置、依赖受影响
- 无数据丢失风险（仅治理文档文件）
