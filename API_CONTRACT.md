# API 契约

## 基础信息

- Base URL: `/api`
- Content-Type: `application/json`
- 所有写操作需要 `idempotency_key`

## 端点列表

### 运行管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/runs` | 创建新运行 |
| GET | `/api/runs/{run_id}` | 获取运行详情 |
| POST | `/api/runs/{run_id}/execute-next` | 执行下一个节点 |
| POST | `/api/runs/{run_id}/pause` | 暂停运行 |

### 任务管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tasks/{task_id}` | 获取任务详情 |
| POST | `/api/tasks/{task_id}/retry` | 重试任务 |

### 门禁查询

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/gates/{run_id}` | 获取运行门禁状态 |

### 审批管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/approvals` | 提交审批决定 |
| GET | `/api/approvals/{run_id}` | 获取运行审批列表 |

### 审计与系统

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/audit-events` | 获取审计日志 |
| GET | `/api/agents` | 获取 Agent 列表 |
| GET | `/api/health` | 健康检查 |
| POST | `/api/scenarios` | 运行模拟场景 |

## 请求/响应示例

### 创建运行

```json
POST /api/runs
{
  "created_by": "operator",
  "scenario_id": "scenario_a"
}

// Response
{
  "run_id": "run_xxx",
  "status": "PENDING",
  "created_at": "2024-01-01T00:00:00Z",
  "tasks": [...],
  "gates": {...}
}
```

### 提交审批

```json
POST /api/approvals
{
  "run_id": "run_xxx",
  "approval_id": "approval_xxx",
  "decision": "APPROVE",
  "approver": "operator",
  "comment": "数据质量合格，模型表现正常"
}
```

### 运行场景

```json
POST /api/scenarios
{
  "scenario_id": "scenario_b"
}

// Response
{
  "run_id": "run_xxx",
  "scenario": "scenario_b",
  "status": "BLOCKED",
  "block_reason": "数据质量门禁 BLOCK"
}
```
