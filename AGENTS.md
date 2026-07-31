# 项目上下文

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── config/                 # 配置文件
│   ├── agents.yaml         # Agent 定义与权限
│   ├── dag.yaml            # DAG 依赖定义
│   ├── gates.yaml          # 门禁规则
│   └── environments.yaml   # 环境配置
├── src/
│   ├── app/                # 页面路由与 API
│   │   ├── (dashboard)/    # 工作台页面 (7个)
│   │   └── api/            # API 路由
│   ├── components/ui/      # shadcn/ui 组件库
│   ├── lib/                # 核心库
│   │   ├── agent-engine/   # Agent 权限引擎
│   │   ├── dag/            # DAG 状态机
│   │   ├── mock/           # 模拟工具与场景
│   │   ├── store/          # 状态持久化 (JSON)
│   │   ├── config-loader.ts
│   │   └── types.ts
│   └── server.ts           # 自定义服务端入口
├── tests/                  # 测试文件
├── mock/data/              # 模拟数据
├── package.json
└── tsconfig.json
```

## 构建和测试命令

- 安装依赖: `pnpm install`
- 开发模式: `pnpm dev`
- 构建: `pnpm build`
- 启动: `pnpm start`
- 运行测试: `npx tsx tests/core.test.ts`

## 核心模块定位

- `src/lib/types.ts` - 所有类型定义
- `src/lib/store/index.ts` - 状态持久化 (runs, approvals, audit events)
- `src/lib/config-loader.ts` - YAML 配置加载
- `src/lib/agent-engine/index.ts` - Agent 权限校验
- `src/lib/dag/index.ts` - DAG 状态机 (创建运行、执行节点、门禁评估)
- `src/lib/mock/tools.ts` - 模拟工具执行
- `src/lib/mock/scenarios.ts` - 三个模拟场景定义

## API 路由定位

- `src/app/api/runs/route.ts` - POST 创建运行
- `src/app/api/runs/[run_id]/route.ts` - GET 运行详情
- `src/app/api/runs/[run_id]/execute-next/route.ts` - POST 执行下一节点
- `src/app/api/tasks/[task_id]/retry/route.ts` - POST 重试任务
- `src/app/api/approvals/route.ts` - POST 提交审批
- `src/app/api/scenarios/route.ts` - POST 运行场景

## 前端页面定位

- `src/app/(dashboard)/dashboard/page.tsx` - 总览
- `src/app/(dashboard)/agents/page.tsx` - Agent 岗位
- `src/app/(dashboard)/dag/page.tsx` - DAG 运行
- `src/app/(dashboard)/quality/page.tsx` - 数据质量
- `src/app/(dashboard)/models/page.tsx` - 模型与信号
- `src/app/(dashboard)/approvals/page.tsx` - 审批中心
- `src/app/(dashboard)/audit/page.tsx` - 审计日志

## 治理规则引用

本项目受 `GOVERNANCE.md` (当前版本 1.1.0) 约束。所有参与方必须遵守以下核心规则：

- **角色分离**：builder（扣子编程）负责施工，inspector（Codex）负责独立监理，两者不得为同一主体。
- **Codex 默认只读**：`role=inspector`, `mode=read_only`, `write_allowed=false`。不存在"任务单授权后 Codex 可修复"的例外。
- **角色切换令牌**：仅通过 `ROLE_SWITCH_CODEX_TO_BUILDER` 令牌切换，必须包含 `task_id`、`authorized_files`、`independent_inspector`。
- **pre_action_role_check**：每次写操作前必须执行并记录。
- **禁止文件**：`src/**`、`tests/**`、`config/**`、`runtime/**`、`adapters/**`、`database/**`、`package.json`、`pnpm-lock.yaml` 等不得由未授权角色修改。
- **宿主层权限**：仓库 Markdown/YAML 规则不能替代 Codex Desktop 宿主层文件系统只读权限。
- **反规避**：不得通过降低标准、改写验收条件或删除门禁来取得 PASS。

详见 `GOVERNANCE.md` 第 12-15 节。任务单模板见 `tasks/TASK_TEMPLATE.yaml`。
