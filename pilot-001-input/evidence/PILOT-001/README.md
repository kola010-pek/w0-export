# PILOT-001 施工证据目录

本目录由扣子编程在施工过程中补充原始证据。证据不得覆盖既有文件；重复运行应使用带时间或运行编号的追加文件。

必须提交：

```text
rule-acknowledgement.yaml
changed-files.txt
test-commands.txt
ts-check.txt
eslint.txt
playwright.txt
known-limitations.md
rollback-plan.md
```

证据要求：

- `rule-acknowledgement.yaml` 必须在修改源码前产生；
- 测试输出必须来自实际执行，不得手工编造；
- `changed-files.txt` 必须列出所有施工改动；
- 没有执行的检查必须明确标记 `NOT_EXECUTED`；
- 不得在证据中写入数据库路径、凭据、令牌或其他秘密；
- 完工声明只能是“施工完成，申请 Codex 独立验收”。
