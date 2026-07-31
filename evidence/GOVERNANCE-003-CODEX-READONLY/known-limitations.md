# Known Limitations - GOVERNANCE-003-CODEX-READONLY

## KL-01: 宿主层只读权限未在本次施工中配置

**Description**: 本次施工仅在仓库治理层面（GOVERNANCE.md）明确了 Codex 的只读角色。Codex Desktop 宿主层的文件系统只读权限需要在 Codex Desktop 自身的配置中独立设置，不在本施工范围内。

**Impact**: 仓库规则声明与宿主层权限是互补关系（见 GOVERNANCE.md Section 14.3），任一层缺失都不应被视为"已实现只读"。

**Mitigation**: Section 14 已明确说明此限制，平台负责人需在宿主层独立配置。

## KL-02: 角色切换令牌机制为治理层面约束

**Description**: ROLE_SWITCH_CODEX_TO_BUILDER 令牌机制是治理层面的规范，不是技术层面的强制控制。实际的角色切换执行依赖于参与者（人和AI）遵守规则。

**Impact**: 如果参与者不遵守令牌机制，治理层面的约束无法在技术上阻止违规。

**Mitigation**: 需要与宿主层权限控制配合使用，形成双层防护。

## KL-03: 规则变更未追溯适用于进行中任务

**Description**: 根据 GOVERNANCE.md Section 11，进行中的任务默认继续使用其任务单锁定的版本（1.0.0）。

**Impact**: 已锁定 1.0.0 的任务不受 1.1.0 约束，直到任务完成或平台负责人明确追溯。

**Mitigation**: 这是预期行为，符合规则变更管理规范。

## KL-04: 任务文件 GOVERNANCE-003-CODEX-READONLY.yaml 为施工时创建

**Description**: 原始指令中引用的 tasks/GOVERNANCE-003-CODEX-READONLY.yaml 在施工前不存在于仓库中。本施工根据平台负责人的书面指令创建了该文件。

**Impact**: 任务文件内容基于平台负责人指令中的参数，但未经过独立的开工条件审查（因为 Codex 独立审查应在施工前进行）。

**Mitigation**: 建议 Codex 在独立验收时审查该任务文件的完整性和合规性。

## KL-05: 自然语言禁止列表非穷举

**Description**: Section 12.1 和 15.3 列出了常见的禁止自然语言触发词，但无法穷举所有可能的近义表述。

**Impact**: 新的、未列出的近义表述可能被误认为合法。

**Mitigation**: 规则采用"包括但不限于"的表述方式，且明确"只有 ROLE_SWITCH_CODEX_TO_BUILDER 令牌才能切换角色，无其他途径"。
