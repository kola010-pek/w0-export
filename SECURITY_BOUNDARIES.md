# 安全边界

## 核心原则

1. **最小权限**：每个 Agent 只能调用其白名单内的工具
2. **职责隔离**：研究域与生产域严格分离
3. **门禁强制**：BLOCK 状态自动阻断下游，不可绕过
4. **审批必需**：关键节点必须经过人工审批
5. **审计完整**：所有操作留痕，不可篡改

## Agent 权限矩阵

| Agent | 数据更新 | 质量检查 | 模型运行 | 风控审批 | 发布 | 研究 |
|-------|---------|---------|---------|---------|------|------|
| orchestrator | - | - | - | - | - | - |
| data-ops | YES | - | - | - | - | - |
| data-quality | - | YES | - | - | - | - |
| model-production | - | - | YES | - | - | - |
| model-risk | - | - | - | YES | - | - |
| release-observer | - | - | - | - | YES | - |
| research | - | - | - | - | - | YES |

## 禁止行为

### 所有 Agent
- 不得伪造工具执行结果
- 不得修改自己的权限配置
- 不得修改门禁阈值
- 不得修改审批结果

### 研究员 Agent
- 禁止写入生产数据库
- 禁止修改生产模型
- 禁止调用发布工具
- 禁止将研究结果标记为正式信号

### 数据质量 Agent
- 禁止修改业务数据
- 禁止自动修复数据
- 禁止调用写工具

### 总调度官
- 禁止直接读写数据库
- 禁止绕过 BLOCK
- 禁止代替风控审批
- 禁止发布正式信号

## 生产安全

当前环境为模拟模式，以下功能默认关闭：

```yaml
production_write_enabled: false
production_model_enabled: false
production_release_enabled: false
```

启用生产功能需要：
1. 修改 `config/environments.yaml`
2. 实现真实 API 调用
3. 确保数据库路径仅服务端配置
