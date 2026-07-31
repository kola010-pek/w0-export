# Forbidden Files Proof - GOVERNANCE-003-CODEX-READONLY (Remediation)

## 实际命令输出

```bash
$ git diff --name-only HEAD
AGENTS.md
GOVERNANCE.md
assets/AGENTS.md
assets/GOVERNANCE-003-CODEX-READONLY.yaml
assets/GOVERNANCE.md
assets/TASK_TEMPLATE.yaml
evidence/GOVERNANCE-003-CODEX-READONLY/*
tasks/GOVERNANCE-003-CODEX-READONLY.yaml
tasks/TASK_TEMPLATE.yaml
```

### 禁止文件检查结果

| Category | Command | Output | Modified? |
|----------|---------|--------|-----------|
| src/** | `git diff --name-only HEAD -- src/` | (empty) | NO |
| tests/** | `git diff --name-only HEAD -- tests/` | (empty) | NO |
| config/** | `git diff --name-only HEAD -- config/` | (empty) | NO |
| runtime/** | `git diff --name-only HEAD -- runtime/` | (empty) | NO |
| adapters/** | `git diff --name-only HEAD -- adapters/` | (empty) | NO |
| database/** | `git diff --name-only HEAD -- database/` | (empty) | NO |
| package.json | `git diff --name-only HEAD -- package.json` | (empty) | NO |
| pnpm-lock.yaml | `git diff --name-only HEAD -- pnpm-lock.yaml` | (empty) | NO |

### tasks/GOVERNANCE-003-CODEX-READONLY.yaml 状态

该文件在 git diff 中显示为 modified，是因为 git HEAD 中存储的是上一轮施工的错误版本。
当前工作区中的文件已恢复为平台负责人提供的正确基线：

```
SHA-256: 382114bee5b81d953384a69747a6b036f4efebd37088d51515bcd713d2d8988e
期望值: 382114bee5b81d953384a69747a6b036f4efebd37088d51515bcd713d2d8988e
匹配: YES
```

该文件作为只读合同输入，本次整改未对其内容进行任何修改。

### assets/ 目录说明

`assets/` 目录中的文件是从平台负责人提供的 URL 下载的基线文件副本，
不是项目源码的一部分，不包含在交付 ZIP 中。
