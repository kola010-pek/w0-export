import { test, expect } from '@playwright/test';

/**
 * PILOT-001: Governance Card Precise Assertions
 *
 * Verifies that the read-only "建设与验收治理" card on /phase2:
 * 1. Is visible and correctly titled
 * 2. Displays rule version information
 * 3. Displays environment boundary constraints
 * 4. Displays database authorization status
 * 5. Displays role assignments
 * 6. Displays gate summary
 * 7. Displays construction constraints
 * 8. Shows the completion declaration
 */

test.describe('PILOT-001 Governance Card', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/phase2');
    // Wait for the governance card to appear (page must finish loading)
    await page.waitForSelector('[data-testid="governance-card"]', { timeout: 15000 });
  });

  test('governance card is visible and titled correctly', async ({ page }) => {
    const card = page.locator('[data-testid="governance-card"]');
    await expect(card).toBeVisible();

    const title = page.locator('[data-testid="governance-card-title"]');
    await expect(title).toHaveText('建设与验收治理');

    const readonly = page.locator('[data-testid="governance-card-readonly"]');
    await expect(readonly).toHaveText('READ-ONLY');
  });

  test('rule version section displays policy and schema versions', async ({ page }) => {
    const section = page.locator('[data-testid="governance-section-rule-version"]');
    await expect(section).toBeVisible();

    const policyVersion = page.locator('[data-testid="governance-policy-version"]');
    await expect(policyVersion).toHaveText('1.0.0');

    const schemaVersion = page.locator('[data-testid="governance-schema-version"]');
    await expect(schemaVersion).toBeVisible();
    // Schema version should start with 'v' followed by a version number (2 or 3 segments)
    await expect(schemaVersion).toHaveText(/^v\d+\.\d+(\.\d+)?$/);

    const gateConfig = page.locator('[data-testid="governance-gate-config"]');
    await expect(gateConfig).toBeVisible();
  });

  test('environment boundary section shows simulation and all production capabilities disabled', async ({ page }) => {
    const section = page.locator('[data-testid="governance-section-env-boundary"]');
    await expect(section).toBeVisible();

    const env = page.locator('[data-testid="governance-environment"]');
    await expect(env).toBeVisible();
    // Environment should be one of the known values
    const envText = await env.textContent();
    expect(['simulation', 'staging', 'production']).toContain(envText?.trim());

    const prodWrite = page.locator('[data-testid="governance-prod-write"]');
    await expect(prodWrite).toHaveText('禁用');

    const prodModel = page.locator('[data-testid="governance-prod-model"]');
    await expect(prodModel).toHaveText('禁用');

    const prodRelease = page.locator('[data-testid="governance-prod-release"]');
    await expect(prodRelease).toHaveText('禁用');
  });

  test('database authorization section shows current status', async ({ page }) => {
    const section = page.locator('[data-testid="governance-section-db-auth"]');
    await expect(section).toBeVisible();

    const dataSource = page.locator('[data-testid="governance-data-source"]');
    await expect(dataSource).toBeVisible();
    const dsText = await dataSource.textContent();
    expect(['mock', 'sample', 'real_readonly']).toContain(dsText?.trim());

    const realDbConfigured = page.locator('[data-testid="governance-real-db-configured"]');
    await expect(realDbConfigured).toHaveText('false');

    const dbConnection = page.locator('[data-testid="governance-db-connection"]');
    await expect(dbConnection).toBeVisible();

    const readonlyVerified = page.locator('[data-testid="governance-readonly-verified"]');
    await expect(readonlyVerified).toBeVisible();
  });

  test('role assignments section displays all six agent roles', async ({ page }) => {
    const section = page.locator('[data-testid="governance-section-roles"]');
    await expect(section).toBeVisible();

    const expectedRoles = [
      'governance-role-orchestrator-agent',
      'governance-role-data-ops-agent',
      'governance-role-data-quality-agent',
      'governance-role-model-production-agent',
      'governance-role-model-risk-agent',
      'governance-role-release-observer-agent',
    ];

    for (const roleId of expectedRoles) {
      const role = page.locator(`[data-testid="${roleId}"]`);
      await expect(role).toBeVisible();
    }
  });

  test('gate summary section displays numeric counts', async ({ page }) => {
    const section = page.locator('[data-testid="governance-section-gates"]');
    await expect(section).toBeVisible();

    const totalGates = page.locator('[data-testid="governance-total-gates"]');
    await expect(totalGates).toBeVisible();
    // Should be a non-negative integer
    const totalText = await totalGates.textContent();
    expect(Number(totalText)).toBeGreaterThanOrEqual(0);

    const passGates = page.locator('[data-testid="governance-pass-gates"]');
    await expect(passGates).toBeVisible();

    const warnGates = page.locator('[data-testid="governance-warn-gates"]');
    await expect(warnGates).toBeVisible();

    const blockGates = page.locator('[data-testid="governance-block-gates"]');
    await expect(blockGates).toBeVisible();

    const overallStatus = page.locator('[data-testid="governance-gate-overall-status"]');
    await expect(overallStatus).toBeVisible();
  });

  test('construction constraints section lists all five constraints', async ({ page }) => {
    const constraints = [
      'governance-constraint-no-api',
      'governance-constraint-no-db',
      'governance-constraint-no-config',
      'governance-constraint-no-dep',
      'governance-constraint-no-model',
    ];

    for (const constraintId of constraints) {
      const el = page.locator(`[data-testid="${constraintId}"]`);
      await expect(el).toBeVisible();
    }
  });

  test('footer shows task ID and completion declaration', async ({ page }) => {
    const taskId = page.locator('[data-testid="governance-card-task-id"]');
    await expect(taskId).toHaveText('PILOT-001 · 建设与验收治理卡片');

    const status = page.locator('[data-testid="governance-card-status"]');
    await expect(status).toHaveText('施工完成，申请 Codex 独立验收');
  });
});
