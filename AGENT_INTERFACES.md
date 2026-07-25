# Agent 接口规范

## 统一契约

每个 Agent 配置包含以下字段：

```yaml
agent_id: string          # 唯一标识
display_name: string      # 显示名称
domain: string            # 所属域 (research/production/coordination)
role: string              # 角色描述
goal: string              # 目标描述
allowed_inputs: string[]  # 允许的输入类型
required_preconditions: string[]  # 前置条件
allowed_tools: string[]   # 允许的工具列表
forbidden_actions: string[]  # 禁止的动作列表
output_schema: object     # 输出结构定义
handoff_to: string[]      # 可交接的下游 Agent
approval_required: boolean  # 是否需要审批
audit_fields: string[]    # 审计字段列表
```

## Agent 列表

### 1. orchestrator-agent（总调度官）
- **域**: coordination
- **工具**: create_run, dispatch_task, pause_run, retry_task, get_run_status
- **禁止**: 直接读写数据库、绕过 BLOCK、修改阈值、发布信号

### 2. data-ops-agent（数据运维）
- **域**: production
- **工具**: update_daily_kline, update_adjustment_factors, update_factor_data, update_market_factors
- **禁止**: 执行任意 SQL、删除整表、猜填数据

### 3. data-quality-agent（数据质量）
- **域**: production
- **工具**: check_coverage, check_freshness, check_uniqueness, check_null_ratio, check_watermark
- **禁止**: 修改数据、自动修复、改变检查口径

### 4. model-production-agent（模型生产）
- **域**: production
- **工具**: run_production_model, generate_candidate_signal
- **禁止**: 使用未完成数据、修改模型参数、直接发布

### 5. model-risk-agent（模型风控）
- **域**: production
- **工具**: review_model_output, check_signal_quality, approve_or_reject
- **禁止**: 修改信号、修改模型参数、代替人工审批

### 6. release-observer-agent（发布观察）
- **域**: production
- **工具**: publish_approved_signal, monitor_release, request_rollback
- **禁止**: 发布未审批信号、修改信号内容、自行回滚

### 7. research-agent（量化研究员）
- **域**: research
- **工具**: analyze_data, run_backtest, generate_hypothesis, submit_candidate_model
- **禁止**: 写入生产库、修改生产模型、调用发布工具
