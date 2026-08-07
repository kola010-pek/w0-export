# W0 版本锚定最终整改报告

## 整改完成声明

新的最终交付 commit 与新 tag 已创建，全部交付物位于该 tag 指向的 commit；两份任务 YAML 已同步至双方共享工作区，6 个交付链接已恢复，申请 W0 版本锚定复验。

## 版本信息

| 项目 | 值 |
|---|---|
| 新 tag | w0-20260807-delivery-v2 |
| 最终 delivery commit (完整 40 位 SHA) | eb3eaecda0d7501802b7bbddfd064d5fe52f7ac9 |
| source commit (完整 40 位 SHA) | 0cb21090e6e52b1514bfd5776d409a8c448c7983 |

## GitHub API 证据

### Tag Ref API
```json
{
  "ref": "refs/tags/w0-20260807-delivery-v2",
  "object": {
    "sha": "eb3eaecda0d7501802b7bbddfd064d5fe52f7ac9",
    "type": "commit"
  }
}
```

### Commit API
```json
{
  "sha": "eb3eaecda0d7501802b7bbddfd064d5fe52f7ac9",
  "commit": {
    "author": {
      "name": "user5914024953",
      "date": "2026-08-07T01:10:09Z"
    },
    "message": "fix(W0): 统一证据文件 - delivery_commit 和 delivery_tag 指向最终交付锚点"
  }
}
```

## 6 个交付 URL

| # | 文件 | URL | HTTP 状态 |
|---|---|---|---|
| 1 | 归档包 | https://be7a1965-2e46-466f-8463-44567a96aa37.dev.coze.site/W0_WORKSPACE_EXPORT_w0-20260730-0cb21090.tar.gz | 200 |
| 2 | SHA-256 文件 | https://be7a1965-2e46-466f-8463-44567a96aa37.dev.coze.site/W0_WORKSPACE_EXPORT_w0-20260730-0cb21090.tar.gz.sha256 | 200 |
| 3 | 来源清单 | https://be7a1965-2e46-466f-8463-44567a96aa37.dev.coze.site/W0_EXPORT_SOURCE_INVENTORY.txt | 200 |
| 4 | 版本锚定证据 | https://be7a1965-2e46-466f-8463-44567a96aa37.dev.coze.site/W0_VERSION_ANCHORING_EVIDENCE.txt | 200 |
| 5 | 版本锚定只读任务单 | https://be7a1965-2e46-466f-8463-44567a96aa37.dev.coze.site/tasks/W0-VERSION-ANCHORING-READONLY.yaml | 200 |
| 6 | 完整 W0 验收任务单 | https://be7a1965-2e46-466f-8463-44567a96aa37.dev.coze.site/tasks/W0-FULL-ACCEPTANCE.yaml | 200 |

## 共享工作区两份 YAML 的完整路径

- /workspace/projects/tasks/W0-VERSION-ANCHORING-READONLY.yaml
- /workspace/projects/tasks/W0-FULL-ACCEPTANCE.yaml

## 原始验证输出

```
$ git rev-parse w0-20260807-delivery-v2^{commit}
eb3eaecda0d7501802b7bbddfd064d5fe52f7ac9

$ git show --no-patch --format=fuller HEAD
commit eb3eaecda0d7501802b7bbddfd064d5fe52f7ac9
Author:     user5914024953 <3190103035872681-user5914024953@noreply.coze.cn>
AuthorDate: Fri Aug 7 09:10:09 2026 +0800
Commit:     user5914024953 <3190103035872681-user5914024953@noreply.coze.cn>
CommitDate: Fri Aug 7 09:10:09 2026 +0800

    fix(W0): 统一证据文件 - delivery_commit 和 delivery_tag 指向最终交付锚点

$ git status --short
(空，工作区干净)

$ sha256sum -c W0_WORKSPACE_EXPORT_w0-20260730-0cb21090.tar.gz.sha256
W0_WORKSPACE_EXPORT_w0-20260730-0cb21090.tar.gz: OK
```

## 停止点检查

- [x] 新 tag 指向最终交付 commit
- [x] 所有证据引用新交付 commit
- [x] 所有必需文件在最终 commit 树中
- [x] 本地共享工作区有两份任务 YAML
- [x] 所有 6 个交付 URL 返回 HTTP 200
- [x] 使用 Git tag 链接（非 Release 链接）
- [x] 自检 SHA-256 未写成 Codex 独立验证结果

## 注意

最终是否通过由 Codex 独立复验判定。
