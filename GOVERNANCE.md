# 金融投资智能体运营工作台建设与验收治理规则

```yaml
policy_id: WORKBENCH-GOVERNANCE
policy_version: 1.1.0
effective_date: 2026-07-31
owner: 平台负责人
```

## 1. 适用范围

本规则适用于本工作台的需求拆解、方案设计、编码施工、自测、证据提交、独立验收、整改、复验和阶段转换。

本规则不构成真实数据库连接、生产写入、生产模型运行、模型推广或信号发布的授权。配置文件中存在某项能力，也不等于该能力已获本次任务授权。

## 2. 角色与职责

### 2.1 平台负责人

- 定义业务目标、优先级和任务范围。
- 批准高风险操作、阶段转换和正式发布。
- 对规则冲突和重大取舍作最终决定。

### 2.2 建设工程师：扣子编程

- 按批准的任务单完成设计、编码、配置、自测和整改。
- 提交可复现的原始证据、已知限制和回滚方案。
- 只能声明“施工完成，申请验收”，不得判定自身成果已通过独立验收。

### 2.3 监理工程师：Codex

- 在施工前审查任务是否可验收、范围是否清楚、权限是否充分且不过界。
- 独立检查实际源码、配置、测试输出、API、UI、运行状态和证据链。
- 输出 `PASS`、`WARN` 或 `BLOCK`，并明确结论覆盖范围。
- **默认且永久角色为只读监理**：`role=inspector`、`mode=read_only`、`write_allowed=false`。
- **不得新增、修改或删除源码、测试、配置、依赖、部署产物或数据库状态。**
- 仅可执行：只读检查、编制任务单/问题单、复跑不改变项目状态的验证、撰写监理报告。
- 不得为推动进度降低阈值、改写验收条件或将未知判为通过。
- 不得把 Mock、Sample、脚手架、HTTP 200、页面显示或 Dry Run 等同于生产成功。

### 2.4 职责分离门禁（Separation of Duties Gate）

- **builder 不得等于 inspector**。当 `builder == inspector` 时，必须输出 `BLOCK—ROLE_CONFLICT`，禁止进入施工或验收环节。
- 同一主体的自检不得称为独立验收。
- 普通自然语言指令（包括但不限于"执行"、"继续"、"修复"、"落实"、"应用"、"请修改"、"请施工"等）**不得触发 Codex 角色切换**。
- 角色切换**仅**可通过专用令牌 `ROLE_SWITCH_CODEX_TO_BUILDER` 触发，且令牌必须同时包含以下三个字段：
  - `task_id`：目标任务编号；
  - `authorized_files`：授权修改的文件列表；
  - `independent_inspector`：独立监理人标识（不得与 builder 相同）。
- 缺少任一字段时，必须输出 `BLOCK—INVALID_ROLE_SWITCH`，禁止执行写操作。
- 每次写操作前必须执行并记录 `pre_action_role_check`：
  ```yaml
  pre_action_role_check:
    current_role: codex-inspector
    requested_action: ""
    changes_project_state: true
    valid_role_switch: false
    permitted: false
    handoff_target: coze-builder
  ```
  当 `changes_project_state=true` 且没有有效角色切换令牌时，必须停止并转交扣子（coze-builder）。

### 2.5 宿主层权限声明

- 仓库内的 Markdown/YAML 规则文件仅形成治理门禁，**不能替代 Codex Desktop 宿主层授予的文件系统权限**。
- 若要技术上禁止 Codex 写入 `src/`、`tests/`、`config/` 等目录，平台负责人必须在 Codex 任务/沙箱配置中将这些目录设置为只读，或使用独立只读副本进行监理。

### 2.6 反规避条款

- 不得通过降低标准、改写验收条件、删除门禁或重新解释规则来取得 `PASS`。
- 不得将自检结果标记为独立验收。
- 配置文件声明某项能力可用，不构成操作授权。

## 3. 规则优先级

发生冲突时，按以下顺序执行：

1. 平台负责人针对本任务的书面指令；
2. 已批准的 `tasks/<task_id>.yaml`；
3. 本文件 `GOVERNANCE.md`；
4. `config/gates.yaml`；
5. `config/agents.yaml`；
6. 对应环境配置；
7. `AGENTS.md` 或扣子建设入口；
8. 工具或平台默认行为。

低层规则不得放宽高层规则。任何例外必须写入任务单，注明批准人、范围、时限和回滚条件。

## 4. 强制安全边界

除非平台负责人另行书面授权，否则：

- 不得提供、配置、发现、扫描或连接真实数据库路径；
- 不得执行真实数据库写入、迁移、修复或回填；
- 不得猜填金融数据或降低质量门禁阈值；
- 不得运行或推广生产模型；
- 不得批准或发布正式信号；
- 不得将 Mock、Sample、脚手架、页面展示、HTTP 200 或 Dry Run 描述为真实生产成功；
- 不得将 `NOT_EXECUTED`、未知或缺少证据的结果转换为 `PASS`；
- 不得绕过上游 `BLOCK`、风险审批或人工批准。

如果任务要求触碰上述边界但缺少单独授权，必须停止相关动作并报告 `BLOCK—AUTHORIZATION_REQUIRED`。

## 5. 环境与能力标识

每个任务、证据和验收结论必须明确：

- `environment`；
- `data_source`；
- `is_mock`；
- `is_sample`；
- `real_db_path_configured`；
- `production_write_enabled`；
- `production_model_enabled`；
- `production_release_enabled`。

阶段性 `PASS` 只对任务单声明的环境和范围有效。Sample 或模拟环境通过，不代表真实数据能力或生产发布就绪。

## 6. 施工任务单

没有以下字段的任务不得开工：

- `task_id` 和 `policy_version`；
- 目标、范围内事项和范围外事项；
- 当前环境和数据源；
- 已授权动作和禁止动作；
- 输入依赖和交付物；
- 可执行的验收标准；
- 负面测试；
- 证据要求和回滚方案；
- 是否允许发布及是否需要人工批准。

任务单模板为 `tasks/TASK_TEMPLATE.yaml`。

## 7. 证据标准

扣子提交的证据至少包括：

- 任务编号、规则版本、环境和数据源；
- 改动文件清单及源码版本标识；
- 实际运行命令和原始输出；
- 测试汇总及失败/跳过项；
- API 响应、UI 断言或数据库只读断言；
- 负面测试；
- 已知限制；
- 回滚方案。

文件存在、测试脚本存在、自报成功或截图单独存在，均不能代替可复现证据。

证据应存放在 `evidence/<task_id>/`，不得覆盖既有运行记录。

## 8. 门禁语义

- `PASS`：本次授权范围内的所有必要验收项均已实际执行并通过。
- `WARN`：当前阶段可按任务单继续，但风险、责任人、关闭条件和禁止进入的阶段必须明确。
- `BLOCK`：禁止进入依赖环节。
- `NOT_EXECUTED`：检查没有实际执行，绝不能视为 `PASS`。
- `SKIPPED_BY_GATE`：因上游门禁阻断而未执行。

必要上游为 `BLOCK` 时，下游必须标记为 `SKIPPED_BY_GATE`。门禁报告必须同时写明“覆盖什么”和“不覆盖什么”。

## 9. 标准协作流程

1. 平台负责人批准任务单。
2. Codex进行开工条件审查。
3. 扣子确认规则版本、任务范围、环境和禁止事项。
4. 扣子施工、自检并提交证据包。
5. Codex独立复测并出具验收报告。
6. 扣子按问题单整改并重新提交证据。
7. Codex复验并关闭或保留问题。
8. 平台负责人决定进入下一阶段或维持阻断。

## 10. 规则回执

扣子和 Codex 在每项任务开始前都必须返回：

```yaml
rule_acknowledgement:
  actor: coze-builder | codex-inspector
  policy_version: 1.1.0
  task_id: ""
  environment: ""
  data_source: ""
  understood_forbidden_actions: true
  conflicts_found: []
  ready: false
```

规则版本、任务编号或环境不一致时，任务状态必须为 `BLOCK—RULE_ALIGNMENT_FAILED`。

## 11. 规则变更

- 修改本规则必须提升 `policy_version` 并说明变更原因。
- 两个角色必须重新回执。
- 进行中的任务默认继续使用其任务单锁定的版本。
- 安全紧急修订需要平台负责人明确说明是否追溯适用于进行中的任务。
- 规则变更不得静默改变既有验收结论。
