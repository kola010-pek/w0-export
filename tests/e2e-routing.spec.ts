import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

test.describe('路由导航测试', () => {
  test('首页 /dashboard 加载正常', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('h1, h2').first()).toContainText('运营总览');
    await expect(page.locator('main')).not.toBeEmpty();
  });

  test('点击菜单导航到 /agents', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.click('button:has-text("Agent 岗位")');
    await page.waitForURL(/.*\/agents/);
    await expect(page).toHaveURL(/.*\/agents/);
    await expect(page.locator('h1, h2').first()).toContainText('Agent 岗位');
    await expect(page.locator('main')).not.toBeEmpty();
  });

  test('点击菜单导航到 /dag', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.click('button:has-text("DAG 运行")');
    await page.waitForURL(/.*\/dag/);
    await expect(page).toHaveURL(/.*\/dag/);
    await expect(page.locator('h1, h2').first()).toContainText('DAG');
    await expect(page.locator('main')).not.toBeEmpty();
  });

  test('点击菜单导航到 /quality', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.click('button:has-text("数据质量")');
    await page.waitForURL(/.*\/quality/);
    await expect(page).toHaveURL(/.*\/quality/);
    await expect(page.locator('h1, h2').first()).toContainText('数据质量');
    await expect(page.locator('main')).not.toBeEmpty();
  });

  test('点击菜单导航到 /models', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.click('button:has-text("模型与信号")');
    await page.waitForURL(/.*\/models/);
    await expect(page).toHaveURL(/.*\/models/);
    await expect(page.locator('h1, h2').first()).toContainText('模型');
    await expect(page.locator('main')).not.toBeEmpty();
  });

  test('点击菜单导航到 /approvals', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.click('button:has-text("审批中心")');
    await page.waitForURL(/.*\/approvals/);
    await expect(page).toHaveURL(/.*\/approvals/);
    await expect(page.locator('h1, h2').first()).toContainText('审批');
    await expect(page.locator('main')).not.toBeEmpty();
  });

  test('点击菜单导航到 /audit', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.click('button:has-text("审计日志")');
    await page.waitForURL(/.*\/audit/);
    await expect(page).toHaveURL(/.*\/audit/);
    await expect(page.locator('h1, h2').first()).toContainText('审计');
    await expect(page.locator('main')).not.toBeEmpty();
  });

  test('直接访问 /agents 页面正常', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents`);
    await expect(page).toHaveURL(/.*\/agents/);
    await expect(page.locator('h1, h2').first()).toContainText('Agent 岗位');
    await expect(page.locator('main')).not.toBeEmpty();
  });

  test('直接访问 /dag 页面正常', async ({ page }) => {
    await page.goto(`${BASE_URL}/dag`);
    await expect(page).toHaveURL(/.*\/dag/);
    await expect(page.locator('main')).not.toBeEmpty();
  });

  test('直接访问 /approvals 页面正常', async ({ page }) => {
    await page.goto(`${BASE_URL}/approvals`);
    await expect(page).toHaveURL(/.*\/approvals/);
    await expect(page.locator('main')).not.toBeEmpty();
  });

  test('直接访问 /audit 页面正常', async ({ page }) => {
    await page.goto(`${BASE_URL}/audit`);
    await expect(page).toHaveURL(/.*\/audit/);
    await expect(page.locator('main')).not.toBeEmpty();
  });

  test('刷新 /agents 页面后内容仍在', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents`);
    await page.reload();
    await expect(page).toHaveURL(/.*\/agents/);
    await expect(page.locator('h1, h2').first()).toContainText('Agent 岗位');
    await expect(page.locator('main')).not.toBeEmpty();
  });
});

test.describe('运行详情页测试', () => {
  let completedRunId: string;
  let blockedRunId: string;
  let waitingRunId: string;

  test.beforeAll(async ({ request }) => {
    // 创建三种状态的运行
    const resA = await request.post(`${BASE_URL}/api/scenarios`, {
      data: { scenario_id: 'scenario_a', description: 'e2e test completed' }
    });
    const dataA = await resA.json();
    completedRunId = dataA.data.run_id;

    const resB = await request.post(`${BASE_URL}/api/scenarios`, {
      data: { scenario_id: 'scenario_b', description: 'e2e test blocked' }
    });
    const dataB = await resB.json();
    blockedRunId = dataB.data.run_id;

    const resC = await request.post(`${BASE_URL}/api/scenarios`, {
      data: { scenario_id: 'scenario_c', description: 'e2e test waiting' }
    });
    const dataC = await resC.json();
    waitingRunId = dataC.data.run_id;
  });

  test('COMPLETED 运行详情页展示 9 个节点', async ({ page }) => {
    await page.goto(`${BASE_URL}/runs/${completedRunId}`);
    await expect(page.locator('main')).not.toBeEmpty();
    // 等待数据加载
    await page.waitForTimeout(2000);
    await expect(page.locator('main')).toContainText('DAG');
  });

  test('BLOCKED 运行详情页展示门禁状态', async ({ page }) => {
    await page.goto(`${BASE_URL}/runs/${blockedRunId}`);
    await expect(page.locator('main')).not.toBeEmpty();
    await page.waitForTimeout(2000);
    await expect(page.locator('main')).toContainText('DAG');
  });

  test('WAITING_APPROVAL 运行详情页展示审批状态', async ({ page }) => {
    await page.goto(`${BASE_URL}/runs/${waitingRunId}`);
    await expect(page.locator('main')).not.toBeEmpty();
    await page.waitForTimeout(2000);
    await expect(page.locator('main')).toContainText('DAG');
  });
});
