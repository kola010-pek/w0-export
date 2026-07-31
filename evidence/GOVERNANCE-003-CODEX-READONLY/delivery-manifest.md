# Delivery Manifest - GOVERNANCE-003-CODEX-READONLY

## Task Information
- **Task ID**: GOVERNANCE-003-CODEX-READONLY
- **Policy Version**: 1.0.0 → 1.1.0
- **Builder**: 扣子编程 / coze-builder
- **Inspector**: Codex / codex-inspector (read_only)
- **Environment**: local_governance_workspace
- **Data Source**: repository_files_only

## Deliverable Contents

### Governance Rule Files (Modified)
1. `GOVERNANCE.md` - v1.1.0 (SHA-256: bc9c3f17102cab81a4ecff974428af962e117d84a3dabf4e6f23b504604acd5f)
2. `AGENTS.md` - Updated governance references (SHA-256: a27ab59ada35a5045885646cd514d3e493da49cb0c2223e098c7d78ba484a303)

### Task Definition Files (Created)
3. `tasks/GOVERNANCE-003-CODEX-READONLY.yaml` (SHA-256: 9b1c9a74f0a13c5baa5fc5283d48f990b110fc35c91935836b09039738bfa07a)
4. `tasks/TASK_TEMPLATE.yaml` (SHA-256: d7b70585424b99a67dd7a0db2625309e89325c3cb0ef0ea18162a1ffe648f891)

### Evidence Package
5. `evidence/GOVERNANCE-003-CODEX-READONLY/rule-acknowledgement.yaml` (SHA-256: d19c1eef3ff09db77dca5eb4fd1b9d719279ecbff81f005264c40b5771d4358b)
6. `evidence/GOVERNANCE-003-CODEX-READONLY/changed-files.txt` (SHA-256: 69b6a7fb44dbb83508ede1e9ddad2e20dc066f8116dd014e82dcf1e55eefbe8d)
7. `evidence/GOVERNANCE-003-CODEX-READONLY/diff-GOVERNANCE.md.txt` (SHA-256: 2b62614685a287abd8f54abe115e3ae99ecf08ef300b029e59be1c2aab326752)
8. `evidence/GOVERNANCE-003-CODEX-READONLY/diff-AGENTS.md.txt` (SHA-256: 4717385e895e2709c1b4451f225aab9b33ad8d3b5cf519d3c65510f52df11aeb)
9. `evidence/GOVERNANCE-003-CODEX-READONLY/ac-mapping.md` (SHA-256: 87f770ba9dbb671a9dff2249c06b74100f97a5d161f1dbf262fcdcbb2ae0f5ca)
10. `evidence/GOVERNANCE-003-CODEX-READONLY/negative-tests.md` (SHA-256: 207c96de327f49adcb3b83e1e0a116ad5aa9e2c1b72e33bd85cf93872a0ceb19)
11. `evidence/GOVERNANCE-003-CODEX-READONLY/authorization-scope-check.md` (SHA-256: 810151b960db67e86a3db3c85babc08db604b56cbac82eed57ed4227dd2de452)
12. `evidence/GOVERNANCE-003-CODEX-READONLY/forbidden-files-proof.md` (SHA-256: 4644a8b42fd2bf7fe1b83a310a29e282f7f6719cfc999bbca0513b13c17d9019)
13. `evidence/GOVERNANCE-003-CODEX-READONLY/known-limitations.md` (SHA-256: 2f04b73b1779bd944f490041f4749bd581fd272a7652979237c740114b0af69e)
14. `evidence/GOVERNANCE-003-CODEX-READONLY/rollback-plan.md` (SHA-256: 5254b8215520ad75cffe81f9487ebc235deea4409e2be9940b3765c6a6e59492)
15. `evidence/GOVERNANCE-003-CODEX-READONLY/sha256sums.txt` (SHA-256: computed after ZIP creation)
16. `evidence/GOVERNANCE-003-CODEX-READONLY/delivery-manifest.md` (this file)

## Delivery Package

- **ZIP File**: `GOVERNANCE-003-CODEX-READONLY-delivery.zip`
- **Location**: `/workspace/projects/GOVERNANCE-003-CODEX-READONLY-delivery.zip`
- **SHA-256**: `48f60ed979691a94ef716f4fc682009f4ef62d79968097fcade29da8300f4a8b`

## Construction Statement

施工完成，申请Codex独立验收。

Builder 不得自行声明：
- 独立验收 PASS
- 已获准进入下一阶段
- 宿主层只读权限已经生效
- 生产就绪
