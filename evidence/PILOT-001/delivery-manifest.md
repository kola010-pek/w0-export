# PILOT-001 Delivery Manifest
# Generated: 2026-07-31
# Builder: coze-builder (扣子远程工作区)

## 1. ZIP Package

File: PILOT-001-delivery.zip
SHA-256: af3ca0c697b66b99fe4ea0970f438a2f37e9ee52051e558264b435a00e7a511f
Size: 22858 bytes

Note: This ZIP hash was computed after all evidence files were finalized.
Due to the self-referential nature of this manifest (it contains the ZIP hash,
but updating it changes the ZIP), the actual delivered ZIP hash may differ
by this one field. All OTHER file hashes in Section 2 are authoritative.
Verify individual file integrity via: sha256sum -c manifest-hashes.txt

## 2. Individual File SHA-256

```
e11fd2a4d0cb6809b82a5ccd9d10302998b5ad817083576505ac1f762c3f1f50  evidence/PILOT-001/README.md
81b002de0910acac082ff8abf550f9632d0217ecce851548134bd357c8d06fec  evidence/PILOT-001/changed-files.txt
28a2408fa8333e8df6b42b2bf26eb60573d10d10cc8bfb541cb4fe295145fae8  evidence/PILOT-001/eslint.txt
2dc97b21d9c38998b867288c170b1016cf1bfd445e757ca283acb6faf50c4e8d  evidence/PILOT-001/known-limitations.md
de2ba3d0cb1a99bafd06d01f8897601085a8fc8853ca180e1620d4d6d5a7c65b  evidence/PILOT-001/playwright.txt
fa780cd78bec7883153182126c2bdaeba2a297a3680df264d42e00b958594210  evidence/PILOT-001/rollback-plan.md
f33611d52680d3797f0729c9e25dff49d7c9397f7aa82a422f545ef867480196  evidence/PILOT-001/rule-acknowledgement.yaml
1972780b4f7d83a00786b7ea8f8d7bfa3983973d4ce2a5c7caef65a77487733a  evidence/PILOT-001/test-commands.txt
ee793bd06b3440e400b7c68af5ff72edd36ce52684a0527479b63ac565b92f0e  evidence/PILOT-001/ts-check.txt
f889f3e597a61a2b3d2b3d2c0bf061debcb1e215a0f7f84c964e453aee330984  src/app/(dashboard)/phase2/page.tsx
bbed0e81397fa74d56b1f134556f40f1873e8017a1180ec74e13f37d4d96675d  tests/pilot-001-governance-card.spec.ts
```

Note: delivery-manifest.md hash is self-referential (omitted to avoid infinite recursion).
Verify with: sha256sum evidence/PILOT-001/delivery-manifest.md

## 3. Test Commands and Exit Codes

### 3.1 TypeScript Check
```
Command: pnpm ts-check
Exit code: 1 (FAILURE)
Errors in authorized files: 0
Errors in pre-existing files: 33
AC-09 status: BLOCK
```

### 3.2 ESLint Check
```
Command: pnpm lint
Exit code: 1 (FAILURE)
Warnings/errors in authorized files: 0
Warnings/errors in pre-existing files: 62 errors, 86 warnings
```

### 3.3 Playwright Test
```
Command: npx playwright test --config=/tmp/pw-pilot001.config.ts --reporter=list
Exit code: 0 (SUCCESS)
Result: 8 passed, 0 failed (3.6s)
```

## 4. Temporary Playwright Config (/tmp/pw-pilot001.config.ts)

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

## 5. Playwright Run Environment

```
Working directory: /workspace/projects
Test directory: /workspace/projects/tests
Config file: /tmp/pw-pilot001.config.ts (outside project, not a project file)
Service address: http://localhost:5000
Browser: Chromium (headless)
Executable: /root/.cache/ms-playwright/chromium-1161/chrome-linux/chrome
Workers: 1
Retries: 0
```

### Non-sensitive Environment Variables
```
DEPLOY_RUN_PORT=5000
COZE_PROJECT_ENV=DEV
COZE_WORKSPACE_PATH=/workspace/projects
DATA_SOURCE_MODE=not set (shell); real (from .env.local sourced by dev.sh)
NODE_ENV=not set
BASE_URL=not set
HOSTNAME=vefaas-j5tcivm6-cgpdvtyff5-d9m6aag4s6v9b502u9f0-sandbox
```

## 6. AC-09 TypeScript Check: BLOCK

`pnpm ts-check` exits with code **1**.

- Total errors: 33
- Errors in PILOT-001 authorized files: **0**
- Errors in pre-existing files: **33** (tests/integration/w0-integration.test.ts, tests/smoke/w0-smoke.test.ts)
- Error types: TS2345 (null not assignable), TS18047 (possibly null)
- All pre-existing; none introduced by PILOT-001

**Declaration: AC-09 is BLOCK.**
PILOT-001施工未引入任何新的TypeScript错误，但全量 `pnpm ts-check` 退出码为1。
不得声明AC-09已通过。

**申请修改验收标准**：
- 方案A：将AC-09范围缩小为"PILOT-001授权文件无TypeScript错误"
- 方案B：授权PILOT-001修复预存错误（需扩大authorized_files范围）
