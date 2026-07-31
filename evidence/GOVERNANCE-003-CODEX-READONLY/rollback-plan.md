# Rollback Plan - GOVERNANCE-003-CODEX-READONLY (Remediation 02)

## 回滚范围

仅回滚以下三个授权修改文件到施工前基线版本：

| File | 回滚目标 SHA-256 |
|------|-----------------|
| GOVERNANCE.md | 14ca03393a6ace37263c09e9627bb4e48c7b61daaf171959251e68b68d9acc6d |
| AGENTS.md | 7dedb415c10a2cd117e207b47f292ce4a1009539fca70da1378572fccaab2ca7 |
| tasks/TASK_TEMPLATE.yaml | d205e1c00918d389929ef065bd8e388b186c168cf3fdd8ff137816de39c366af |

## 回滚步骤

1. 使用平台负责人提供的基线文件覆盖上述三个文件：
   ```bash
   cp /tmp/baseline_GOVERNANCE.md GOVERNANCE.md
   cp /tmp/baseline_AGENTS.md AGENTS.md
   cp /tmp/baseline_TASK_TEMPLATE.yaml tasks/TASK_TEMPLATE.yaml
   ```

2. 删除本次新增的证据目录：
   ```bash
   rm -rf evidence/GOVERNANCE-003-CODEX-READONLY/
   ```

3. 回滚后重新计算 SHA-256 验证：
   ```bash
   sha256sum GOVERNANCE.md AGENTS.md tasks/TASK_TEMPLATE.yaml
   ```
   确认与上述回滚目标 SHA-256 一致。

## 约束

- **不删除或修改** tasks/GOVERNANCE-003-CODEX-READONLY.yaml（正式任务合同）
- **不依赖** /tmp 临时目录作为唯一回滚来源（基线文件由平台负责人提供并持久化存储）
- **回滚执行人**: 仅限平台负责人或其书面授权的 builder
- **回滚授权条件**: 需平台负责人书面批准
