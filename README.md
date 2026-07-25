# 金融投资智能体运营工作台

基于 Next.js 16 + React 19 + TypeScript 构建的金融数据与量化模型运营工作台。由七个岗位 Agent、确定性任务 DAG、质量门禁、人工审批、受控工具接口和完整审计记录组成的运营系统。

## 快速开始

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务
pnpm start
```

## 运行模拟场景

通过工作台页面或 API 运行三个预设模拟场景：

```bash
# 场景 A: 全部通过
curl -X POST http://localhost:5000/api/scenarios \
  -H "Content-Type: application/json" \
  -d '{"scenario_id": "scenario_a"}'

# 场景 B: 核心数据阻断
curl -X POST http://localhost:5000/api/scenarios \
  -H "Content-Type: application/json" \
  -d '{"scenario_id": "scenario_b"}'

# 场景 C: 模型警告（需人工审批）
curl -X POST http://localhost:5000/api/scenarios \
  -H "Content-Type: application/json" \
  -d '{"scenario_id": "scenario_c"}'
```

## 运行测试

```bash
npx tsx tests/core.test.ts
```

测试覆盖：
- BLOCK 阻断下游
- 未审批不能发布
- 研究员不能调用发布工具
- 数据质量 Agent 不能调用写工具
- 重复写请求受幂等键保护
- NOT_EXECUTED 不会被识别为 PASS
- 模拟环境不能调用生产工具

## 当前功能状态

### 已实现（模拟模式）

| 功能 | 状态 |
|------|------|
| 七个 Agent 配置与权限校验 | 已实现 |
| 确定性 DAG 状态机 | 已实现 |
| 质量门禁系统 (PASS/WARN/BLOCK) | 已实现 |
| 人工审批流程 | 已实现 |
| 审计日志 | 已实现 |
| 三个模拟场景 | 已实现 |
| 工作台前端页面 | 已实现 |
| 受控工具接口 (Mock) | 已实现 |

### 未启用（默认关闭）

| 功能 | 状态 | 说明 |
|------|------|------|
| 真实数据库写入 | NOT_ENABLED | `production_write_enabled: false` |
| 正式模型运行 | NOT_ENABLED | `production_model_enabled: false` |
| 正式信号发布 | NOT_ENABLED | `production_release_enabled: false` |

## 接入真实生产 API

当前所有工具调用均为模拟实现。接入真实 API 时：

1. 修改 `config/environments.yaml`：
   ```yaml
   environment: production
   mock_tools: false
   production_write_enabled: true
   production_model_enabled: true
   production_release_enabled: true
   ```

2. 在 `src/lib/mock/tools.ts` 中替换模拟实现为真实 API 调用

3. 确保数据库路径仅通过服务端配置读取，不从前端或 Agent 传入

## 项目结构

```
├── config/                 # 配置文件
│   ├── agents.yaml         # Agent 定义与权限
│   ├── dag.yaml            # DAG 依赖定义
│   ├── gates.yaml          # 门禁规则
│   └── environments.yaml   # 环境配置
├── src/
│   ├── app/                # Next.js 页面与 API
│   │   ├── (dashboard)/    # 工作台页面
│   │   └── api/            # API 路由
│   ├── lib/                # 核心库
│   │   ├── agent-engine/   # Agent 权限引擎
│   │   ├── dag/            # DAG 状态机
│   │   ├── mock/           # 模拟工具与场景
│   │   ├── store/          # 状态持久化
│   │   ├── config-loader.ts
│   │   └── types.ts
│   └── components/         # UI 组件
├── tests/                  # 测试文件
└── mock/data/              # 模拟数据
```
