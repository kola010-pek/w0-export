# Known Limitations - GOVERNANCE-003-CODEX-READONLY (Remediation)

## KL-01: 宿主层只读权限未在本次施工中配置

**Description**: 本次施工仅在仓库治理层面（GOVERNANCE.md Section 14）明确了 Codex 的只读角色。Codex Desktop 宿主层的文件系统只读权限需要在 Codex Desktop 自身的配置中独立设置。

**Impact**: 仓库规则声明与宿主层权限是互补关系（GOVERNANCE.md Section 14.3），任一层缺失都不应被视为"已实现只读"。

**Mitigation**: Section 14.2 已明确说明：平台负责人必须在 Codex 任务/沙箱配置中将 src/tests/config 等目录设置为只读。

## KL-02: 角色切换令牌机制为治理层面约束

**Description**: ROLE_SWITCH_CODEX_TO_BUILDER 令牌机制是治理层面的规范，不是技术层面的强制控制。

**Impact**: 如果参与者不遵守令牌机制，治理层面的约束无法在技术上阻止违规。

**Mitigation**: 需要与宿主层权限控制配合使用，形成双层防护（Section 14.3）。

## KL-03: 规则变更未追溯适用于进行中任务

**Description**: 根据 GOVERNANCE.md Section 11，进行中的任务默认继续使用其任务单锁定的版本（1.0.0）。

**Impact**: 已锁定 1.0.0 的任务不受 1.1.0 约束。

**Mitigation**: 这是预期行为，符合规则变更管理规范。

## KL-04: git 基线差异

**Description**: 当前工作区的 git HEAD 包含上一轮施工的错误版本。本次整改基于平台负责人提供的正确基线文件（通过 SHA-256 验证），但 git diff 会显示 tasks/GOVERNANCE-003-CODEX-READONLY.yaml 为 modified（因为 git HEAD 中是错误版本，当前文件已恢复为正确基线）。

**Impact**: git diff 输出中 tasks/GOVERNANCE-003-CODEX-READONLY.yaml 显示为 modified，但实际文件内容与基线完全一致（SHA-256 匹配）。

**Mitigation**: 已在 forbidden-files-proof.md 中说明此情况，并提供 SHA-256 验证证明文件未被修改。

## KL-05: 自然语言禁止列表非穷举

**Description**: GOVERNANCE.md Section 2.3 和 15.3 列出了常见的禁止自然语言触发词，但无法穷举所有可能的近义表述。

**Impact**: 新的、未列出的近义表述可能被误认为合法。

**Mitigation**: 规则采用"包括但不限于"的表述方式，且明确"只有 ROLE_SWITCH_CODEX_TO_BUILDER 令牌才能切换角色，无其他途径"。
