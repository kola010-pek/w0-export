# W0 版本锚定整改证据

## 整改时间
2026-08-06

## 整改内容

### 1. 仓库可见性
- **整改前**: 私有仓库
- **整改后**: 公开仓库
- **验证**: https://github.com/kola010-pek/w0-export (可公开访问)

### 2. 外部链接修复
所有 5 个交付物链接现已返回 HTTP 200：

| 文件 | 链接 | 状态 |
|---|---|---|
| 归档包 | https://be7a1965-2e46-466f-8463-44567a96aa37.dev.coze.site/W0_WORKSPACE_EXPORT_w0-20260730-0cb21090.tar.gz | 200 |
| SHA-256 | https://be7a1965-2e46-466f-8463-44567a96aa37.dev.coze.site/W0_WORKSPACE_EXPORT_w0-20260730-0cb21090.tar.gz.sha256 | 200 |
| 来源清单 | https://be7a1965-2e46-466f-8463-44567a96aa37.dev.coze.site/W0_EXPORT_SOURCE_INVENTORY.txt | 200 |
| 证据文件 | https://be7a1965-2e46-466f-8463-44567a96aa37.dev.coze.site/W0_VERSION_ANCHORING_EVIDENCE.txt | 200 |
| 任务单 | https://be7a1965-2e46-466f-8463-44567a96aa37.dev.coze.site/tasks/W0-VERSION-ANCHORING-READONLY.yaml | 200 |

### 3. GitHub API 响应证据

#### 3.1 仓库 API 响应
```json
{
  "full_name": "kola010-pek/w0-export",
  "private": false,
  "visibility": "public",
  "html_url": "https://github.com/kola010-pek/w0-export"
}
```

#### 3.2 Commit API 响应
```json
{
  "sha": "0cb21090e6e52b1514bfd5776d409a8c448c7983",
  "commit": {
    "author": {
      "name": "user5914024953",
      "email": "3190103035872681-user5914024953@noreply.coze.cn",
      "date": "2026-07-30T04:52:24Z"
    },
    "message": "feat: W0 工程底座 - 补齐 API 端点和测试"
  },
  "html_url": "https://github.com/kola010-pek/w0-export/commit/0cb21090e6e52b1514bfd5776d409a8c448c7983"
}
```

#### 3.3 Tag Ref API 响应
```json
{
  "ref": "refs/tags/w0-20260730-0cb21090",
  "object": {
    "sha": "0cb21090e6e52b1514bfd5776d409a8c448c7983",
    "type": "commit",
    "url": "https://api.github.com/repos/kola010-pek/w0-export/git/commits/0cb21090e6e52b1514bfd5776d409a8c448c7983"
  }
}
```

#### 3.4 Tag 指向 Commit 证据
- Tag ref `w0-20260730-0cb21090` 的 object.sha = `0cb21090e6e52b1514bfd5776d409a8c448c7983`
- Commit API 返回的 sha = `0cb21090e6e52b1514bfd5776d409a8c448c7983`
- **两者一致** ✓

### 4. 归档包独立验证

#### 4.1 下载并重新计算 SHA-256
```bash
# 下载
curl -s -o w0-test.tar.gz https://be7a1965-2e46-466f-8463-44567a96aa37.dev.coze.site/W0_WORKSPACE_EXPORT_w0-20260730-0cb21090.tar.gz

# 重新计算 SHA-256
sha256sum w0-test.tar.gz
# 输出: b60182bbc0b5ae57138a8249b1a240b1a975f00a7980d0cffbdc54bb8a61bacb

# 声明的 SHA-256
cat W0_WORKSPACE_EXPORT_w0-20260730-0cb21090.tar.gz.sha256
# 输出: b60182bbc0b5ae57138a8249b1a240b1a975f00a7980d0cffbdc54bb8a61bacb

# 验证结果: 一致 ✓
```

#### 4.2 归档包内容验证
```bash
tar -tzf W0_WORKSPACE_EXPORT_w0-20260730-0cb21090.tar.gz | wc -l
# 输出: 316 项
```

### 5. 四份交付物的仓库路径

| 文件 | 仓库路径 | 内容链接 |
|---|---|---|
| 归档包 | `/W0_WORKSPACE_EXPORT_w0-20260730-0cb21090.tar.gz` | https://github.com/kola010-pek/w0-export/blob/main/W0_WORKSPACE_EXPORT_w0-20260730-0cb21090.tar.gz |
| SHA-256 | `/W0_WORKSPACE_EXPORT_w0-20260730-0cb21090.tar.gz.sha256` | https://github.com/kola010-pek/w0-export/blob/main/W0_WORKSPACE_EXPORT_w0-20260730-0cb21090.tar.gz.sha256 |
| 来源清单 | `/W0_EXPORT_SOURCE_INVENTORY.txt` | https://github.com/kola010-pek/w0-export/blob/main/W0_EXPORT_SOURCE_INVENTORY.txt |
| 证据文件 | `/W0_VERSION_ANCHORING_EVIDENCE.txt` | https://github.com/kola010-pek/w0-export/blob/main/W0_VERSION_ANCHORING_EVIDENCE.txt |
| 任务单 | `/tasks/W0-VERSION-ANCHORING-READONLY.yaml` | https://github.com/kola010-pek/w0-export/blob/main/tasks/W0-VERSION-ANCHORING-READONLY.yaml |

---

## 状态
**可访问证据已恢复，申请 Codex 重新独立复验。**

**注意**: 本整改报告不声明 W0 已通过验收，也不进入 H0、LE0、D1 或生产阶段。
