import { test, expect } from '@playwright/test';

/**
 * PILOT-001: Governance Card Contract Assertions
 *
 * Contract: tasks/PILOT-001.yaml
 *
 * Verifies the 6 mandatory data-testid selectors and exact fixed text.
 * Rejects production / real_readonly as acceptable values.
 *
 * Test environment contract:
 *   environment=sample_staging
 *   data_source=sample
 *   real_db_path_configured=false
 *   DATA_SOURCE_MODE != real
 */

const PAGE_URL = '/phase2';

const FORBIDDEN_VALUES = ['production', 'real_readonly', 'real', 'prod'];

test.describe('PILOT-001 Governance Card Contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('1. governance card root is visible', async ({ page }) => {
    const card = page.locator('[data-testid="pilot-001-governance-card"]');
    await expect(card).toBeVisible();
  });

  test('2. policy version is exactly 1.0.0', async ({ page }) => {
    const el = page.locator('[data-testid="pilot-001-policy-version"]');
    await expect(el).toBeVisible();
    await expect(el).toHaveText('1.0.0');

    // Reject forbidden values
    const text = await el.textContent();
    for (const forbidden of FORBIDDEN_VALUES) {
      expect(text?.toLowerCase()).not.toContain(forbidden);
    }
  });

  test('3. role separation is exactly 扣子施工 / Codex监理 / 负责人批准', async ({ page }) => {
    const el = page.locator('[data-testid="pilot-001-role-separation"]');
    await expect(el).toBeVisible();
    await expect(el).toHaveText('扣子施工 / Codex监理 / 负责人批准');
  });

  test('4. environment scope is exactly Sample Staging / 非生产', async ({ page }) => {
    const el = page.locator('[data-testid="pilot-001-environment-scope"]');
    await expect(el).toBeVisible();
    await expect(el).toHaveText('Sample Staging / 非生产');

    // Reject production values
    const text = await el.textContent();
    for (const forbidden of FORBIDDEN_VALUES) {
      expect(text?.toLowerCase()).not.toContain(forbidden);
    }
  });

  test('5. real db status is exactly 未授权 / 未连接', async ({ page }) => {
    const el = page.locator('[data-testid="pilot-001-real-db-status"]');
    await expect(el).toBeVisible();
    await expect(el).toHaveText('未授权 / 未连接');

    // Reject real_readonly and real as pass values
    const text = await el.textContent();
    for (const forbidden of FORBIDDEN_VALUES) {
      expect(text?.toLowerCase()).not.toContain(forbidden);
    }
  });

  test('6. release status is exactly BLOCK', async ({ page }) => {
    const el = page.locator('[data-testid="pilot-001-release-status"]');
    await expect(el).toBeVisible();
    await expect(el).toHaveText('BLOCK');
  });

  test('7. no unauthorized extended content: 6 agents', async ({ page }) => {
    const card = page.locator('[data-testid="pilot-001-governance-card"]');

    // Must NOT contain agent role testids from the old version
    const agentIds = [
      'orchestrator-agent',
      'data-ops-agent',
      'data-quality-agent',
      'model-production-agent',
      'model-risk-agent',
      'release-observer-agent',
    ];
    for (const id of agentIds) {
      const agent = card.locator(`[data-testid="governance-role-${id}"]`);
      await expect(agent).not.toBeVisible();
    }
  });

  test('8. no dynamic environment or gate values', async ({ page }) => {
    const card = page.locator('[data-testid="pilot-001-governance-card"]');

    // Must NOT contain dynamic environment testids
    const dynamicIds = [
      'governance-environment',
      'governance-prod-write',
      'governance-prod-model',
      'governance-prod-release',
      'governance-data-source',
      'governance-real-db-configured',
      'governance-db-connection',
      'governance-total-gates',
      'governance-pass-gates',
      'governance-warn-gates',
      'governance-block-gates',
    ];
    for (const id of dynamicIds) {
      const el = card.locator(`[data-testid="${id}"]`);
      await expect(el).not.toBeVisible();
    }
  });
});
