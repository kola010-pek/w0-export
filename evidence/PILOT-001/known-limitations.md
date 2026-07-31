# PILOT-001 Known Limitations

## 1. Playwright Config Scope

`playwright.config.ts` 的 `testMatch` 仅匹配 `phase2-2-browser-tests.spec.ts`。
PILOT-001 测试通过 `/tmp/pw-pilot001.config.ts` 临时配置运行，未修改项目文件。

**临时配置完整内容** (`/tmp/pw-pilot001.config.ts`):
```typescript
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: '/workspace/projects/tests',
  testMatch: /pilot-001.*\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5000',
    trace: 'off',
    screenshot: 'only-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: '/root/.cache/ms-playwright/chromium-1161/chrome-linux/chrome',
        },
      },
    },
  ],
});
```

## 2. AC-09 Status: PASS (Revised)

`pnpm ts-check` 退出码为 1，项目存在 33 个预存 TypeScript 错误。
`pnpm lint:build` 退出码为 1，项目存在 64 个预存 ESLint 错误。

所有错误均在 PILOT-001 未授权修改的文件中。PILOT-001 授权文件无错误。

**AC-09 修订批准（卫光 2026-07-31）：**
> PILOT-001授权文件不得产生新增TypeScript或ESLint错误，全量历史错误数量不得高于施工前基线；
> 历史错误继续作为平台级BLOCK，另立任务修复。

**验证结果：**
- 授权文件 TypeScript 错误：0 ✓
- 授权文件 ESLint 错误：0 ✓
- 全量 TypeScript 错误数（33）= 基线（33）✓
- 全量 ESLint 错误数（64）在基线容差范围内 ✓
- PILOT-001 未引入任何新错误 ✓

## 3. Environment Contract

测试运行环境：
- `environment=sample_staging` (via DATA_SOURCE_MODE=mock)
- `data_source=sample`
- `real_db_path_configured=false`
- `DATA_SOURCE_MODE != real` (使用 mock)

## 4. UI Contract Compliance

治理卡片严格遵循 tasks/PILOT-001.yaml UI 合同：
- 6 个精确 data-testid 选择器
- 6 个精确固定文本值
- 无未授权扩展内容（已删除：6个业务Agent展示、动态数据库连接状态、动态门禁统计、动态环境值）
