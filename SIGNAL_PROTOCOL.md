# 信号协议

## 信号生命周期

```
研究假设 → 候选模型 → 候选信号 → 风控审批 → 人工审批 → 正式发布
```

## 信号分类

### 1. 研究候选（Research Candidate）
- 来源: research-agent
- 状态: 实验性质，不可用于生产
- 存储: 研究域数据库

### 2. 已注册候选模型（Registered Candidate Model）
- 来源: 通过研究评审的模型
- 状态: 待生产验证
- 要求: 完整回测报告、版本号、输入快照

### 3. 生产模型（Production Model）
- 来源: 通过风控审批的模型
- 状态: 可用于生产信号生成
- 要求: 风控审批记录、数据截止日验证

### 4. 候选信号（Candidate Signal）
- 来源: model-production-agent
- 状态: 待审批
- 要求: 绑定 run_id、模型版本、数据截止日

### 5. 已审批信号（Approved Signal）
- 来源: 通过 model-risk-agent 和人工审批
- 状态: 可发布
- 要求: 完整审批链

### 6. 正式发布信号（Released Signal）
- 来源: release-observer-agent
- 状态: 已发布
- 要求: 发布清单、版本号、发布时间

## 信号版本控制

每个信号必须包含：
- `signal_version`: 语义化版本号
- `model_version`: 使用的模型版本
- `data_cutoff`: 数据截止日期
- `input_snapshot`: 输入数据快照引用
- `run_id`: 生成该信号的运行编号

## 审批要求

| 信号类型 | 风控审批 | 人工审批 |
|---------|---------|---------|
| 研究候选 | 不需要 | 不需要 |
| 候选信号 | 必须 | 必须 |
| 正式发布 | 已完成 | 已完成 |
