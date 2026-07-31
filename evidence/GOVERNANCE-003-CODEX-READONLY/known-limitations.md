# Known Limitations - GOVERNANCE-003-CODEX-READONLY (Remediation 02)

1. **宿主层只读权限需独立配置**: GOVERNANCE.md Section 2.5 明确说明仓库规则不能替代 Codex Desktop 宿主层文件系统权限。若要技术上禁止 Codex 写入 src/tests/config 等目录，需在 Codex 任务/沙箱配置中单独设置。

2. **角色切换令牌为治理层约束**: ROLE_SWITCH_CODEX_TO_BUILDER 令牌机制是治理规则层面的约束，需要与宿主层权限配置配合才能形成完整的双层防护。

3. **进行中的 1.0.0 任务不受追溯**: 根据 GOVERNANCE.md Section 11，进行中的任务默认继续使用其任务单锁定的 1.0.0 版本，1.1.0 规则不追溯适用于已开工任务。

4. **Git HEAD 基线差异**: 当前 Git HEAD 中 tasks/GOVERNANCE-003-CODEX-READONLY.yaml 为上一轮 Remediation 01 的错误版本（被越权修改），施工前已用平台负责人提供的正确基线覆盖。git diff 中该文件显示为未修改（与 HEAD 中的错误版本相比实际已恢复为正确基线）。

5. **证据目录不在 Git 跟踪中**: evidence/ 目录下的文件为本次施工新生成，尚未纳入 Git 版本管理。
