# Phase 2 只读联调接口契约

## 设计原则

1. **只读优先**：所有接口仅支持 GET 请求，不执行任何写库操作
2. **安全边界**：不接收 SQL、不允许前端选择数据库路径、不启动正式模型、不发布信号
3. **状态透明**：每个响应必须包含完整的环境和证据信息
4. **降级策略**：接口不可达、证据缺失、数据过期或格式异常时显示 WARN/BLOCK，不降级为 PASS

## 通用响应结构

所有接口响应必须包含以下字段：

```typescript
interface BaseResponse {
  success: boolean;
  data: T;
  // 元数据（必须）
  environment: 'simulation' | 'staging' | 'production';
  is_mock: boolean;
  data_cutoff: string; // ISO 8601 日期
  generated_at: string; // ISO 8601 时间戳
  source: string; // 数据来源标识
  evidence_id: string; // 证据链 ID
  gate_status: 'PASS' | 'WARN' | 'BLOCK';
  schema_version: string; // 接口版本
  // 错误信息（可选）
  error?: string;
  warnings?: string[];
}
```

## 接口定义

### 1. GET /api/health

**用途**：系统健康检查，验证后端服务可用性

**请求参数**：无

**响应示例（Mock 模式）**：
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime_seconds": 3600,
    "services": {
      "database": "connected",
      "cache": "connected",
      "model_service": "disabled"
    }
  },
  "environment": "simulation",
  "is_mock": true,
  "data_cutoff": "2026-07-26",
  "generated_at": "2026-07-26T03:45:00.000Z",
  "source": "mock_health_service",
  "evidence_id": "evt_health_xxx",
  "gate_status": "PASS",
  "schema_version": "1.0"
}
```

**响应示例（真实模式）**：
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime_seconds": 86400,
    "services": {
      "database": "connected",
      "cache": "connected",
      "model_service": "disabled"
    }
  },
  "environment": "staging",
  "is_mock": false,
  "data_cutoff": "2026-07-26",
  "generated_at": "2026-07-26T03:45:00.000Z",
  "source": "real_health_service",
  "evidence_id": "evt_health_real_xxx",
  "gate_status": "PASS",
  "schema_version": "1.0"
}
```

**错误场景**：
- 服务不可用：`gate_status: "BLOCK"`, `success: false`
- 部分服务异常：`gate_status: "WARN"`, `success: true`, `warnings: [...]`

---

### 2. GET /api/data/watermarks

**用途**：获取数据水位标记，验证数据新鲜度和完整性

**请求参数**：
- `dataset` (可选): 数据集名称，如 `daily_kline`, `factor_data`

**响应示例（Mock 模式）**：
```json
{
  "success": true,
  "data": {
    "watermarks": [
      {
        "dataset": "daily_kline",
        "latest_date": "2026-07-25",
        "record_count": 5000,
        "last_updated": "2026-07-26T02:00:00.000Z",
        "status": "fresh"
      },
      {
        "dataset": "factor_data",
        "latest_date": "2026-07-25",
        "record_count": 1200,
        "last_updated": "2026-07-26T02:30:00.000Z",
        "status": "fresh"
      }
    ]
  },
  "environment": "simulation",
  "is_mock": true,
  "data_cutoff": "2026-07-26",
  "generated_at": "2026-07-26T03:45:00.000Z",
  "source": "mock_watermark_service",
  "evidence_id": "evt_watermark_xxx",
  "gate_status": "PASS",
  "schema_version": "1.0"
}
```

**响应示例（真实模式）**：
```json
{
  "success": true,
  "data": {
    "watermarks": [
      {
        "dataset": "daily_kline",
        "latest_date": "2026-07-25",
        "record_count": 5234,
        "last_updated": "2026-07-26T02:15:00.000Z",
        "status": "fresh"
      }
    ]
  },
  "environment": "staging",
  "is_mock": false,
  "data_cutoff": "2026-07-26",
  "generated_at": "2026-07-26T03:45:00.000Z",
  "source": "real_watermark_service",
  "evidence_id": "evt_watermark_real_xxx",
  "gate_status": "PASS",
  "schema_version": "1.0"
}
```

**错误场景**：
- 数据过期（超过 2 天）：`gate_status: "WARN"`
- 数据缺失：`gate_status: "BLOCK"`
- 接口不可达：`success: false`, `gate_status: "BLOCK"`

---

### 3. GET /api/quality/gates

**用途**：获取质量门禁状态，验证数据质量是否满足要求

**请求参数**：
- `run_id` (可选): 运行 ID，获取特定运行的门禁状态

**响应示例（Mock 模式）**：
```json
{
  "success": true,
  "data": {
    "gates": [
      {
        "gate_id": "gate_quality_001",
        "gate_type": "data_quality",
        "status": "PASS",
        "rules": [
          {
            "rule_id": "coverage_check",
            "display_name": "因子覆盖率",
            "actual": 0.985,
            "threshold": 0.9,
            "comparison": ">=",
            "unit": "ratio",
            "status": "PASS"
          }
        ],
        "checked_at": "2026-07-26T03:45:00.000Z"
      }
    ]
  },
  "environment": "simulation",
  "is_mock": true,
  "data_cutoff": "2026-07-26",
  "generated_at": "2026-07-26T03:45:00.000Z",
  "source": "mock_quality_service",
  "evidence_id": "evt_quality_xxx",
  "gate_status": "PASS",
  "schema_version": "1.0"
}
```

**响应示例（真实模式）**：
```json
{
  "success": true,
  "data": {
    "gates": [
      {
        "gate_id": "gate_quality_001",
        "gate_type": "data_quality",
        "status": "PASS",
        "rules": [...],
        "checked_at": "2026-07-26T03:45:00.000Z"
      }
    ]
  },
  "environment": "staging",
  "is_mock": false,
  "data_cutoff": "2026-07-26",
  "generated_at": "2026-07-26T03:45:00.000Z",
  "source": "real_quality_service",
  "evidence_id": "evt_quality_real_xxx",
  "gate_status": "PASS",
  "schema_version": "1.0"
}
```

**错误场景**：
- 门禁失败：`gate_status: "BLOCK"`
- 证据缺失：`gate_status: "WARN"`, `warnings: ["evidence_missing"]`
- 格式异常：`success: false`, `gate_status: "BLOCK"`

---

## Mock/真实数据切换方案

### 切换机制

通过环境变量 `DATA_SOURCE_MODE` 控制：

| 值 | 说明 |
|-----|------|
| `mock` | 使用 Mock 数据（默认） |
| `real` | 使用真实后端数据（只读） |

### 实现方式

```typescript
// src/lib/data-source.ts
export type DataSourceMode = 'mock' | 'real';

export function getDataSourceMode(): DataSourceMode {
  return process.env.DATA_SOURCE_MODE === 'real' ? 'real' : 'mock';
}

export function isMockMode(): boolean {
  return getDataSourceMode() === 'mock';
}
```

### 接口实现模式

```typescript
// 每个接口根据模式返回不同数据
export async function GET(request: Request) {
  const isMock = isMockMode();
  
  let data;
  let source;
  let evidenceId;
  
  if (isMock) {
    data = getMockData();
    source = 'mock_xxx_service';
    evidenceId = generateMockEvidenceId();
  } else {
    // 真实数据获取（只读）
    data = await fetchRealData();
    source = 'real_xxx_service';
    evidenceId = generateRealEvidenceId();
  }
  
  return NextResponse.json({
    success: true,
    data,
    environment: process.env.COZE_PROJECT_ENV || 'simulation',
    is_mock: isMock,
    data_cutoff: getDataCutoff(),
    generated_at: new Date().toISOString(),
    source,
    evidence_id: evidenceId,
    gate_status: evaluateGateStatus(data),
    schema_version: '1.0'
  });
}
```

### 安全约束

1. **真实模式限制**：
   - 只允许 GET 请求
   - 不接收任何写入参数
   - 不执行任何数据库写操作
   - 不启动模型服务
   - 不发布任何信号

2. **数据截止日**：
   - Mock 模式：使用当前日期
   - 真实模式：从后端获取实际数据截止日

3. **证据链**：
   - Mock 模式：生成 `evt_mock_xxx` 格式的证据 ID
   - 真实模式：从后端获取实际证据 ID

---

## 前端状态显示规则

| 场景 | gate_status | 显示状态 |
|------|-------------|----------|
| 接口正常，数据有效 | PASS | 绿色 ✓ |
| 数据过期（>2天） | WARN | 黄色 ⚠ |
| 证据缺失 | WARN | 黄色 ⚠ |
| 接口不可达 | BLOCK | 红色 ✗ |
| 数据缺失 | BLOCK | 红色 ✗ |
| 格式异常 | BLOCK | 红色 ✗ |
| 门禁失败 | BLOCK | 红色 ✗ |

**禁止降级**：任何异常情况下不得将 WARN/BLOCK 降级为 PASS 显示。

---

## 页面提示

所有页面必须保留以下提示：

```
⚠️ 模拟环境，生产功能未启用
真实数据库写入、正式模型运行、正式信号发布均未启用
```

---

## 测试验证

### Mock 模式测试
```bash
# 健康检查
curl http://localhost:5000/api/health
# 预期：is_mock: true, gate_status: PASS

# 数据水位
curl http://localhost:5000/api/data/watermarks
# 预期：is_mock: true, gate_status: PASS

# 质量门禁
curl http://localhost:5000/api/quality/gates
# 预期：is_mock: true, gate_status: PASS
```

### 真实模式测试（只读）
```bash
DATA_SOURCE_MODE=real curl http://localhost:5000/api/health
# 预期：is_mock: false, gate_status: PASS/WARN/BLOCK（取决于实际数据）
```
