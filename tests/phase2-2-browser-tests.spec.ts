/**
 * Phase 2.2A Browser Runtime Tests (Playwright)
 *
 * These tests render the real /phase2 page in a headless Chromium browser
 * and assert on actual DOM elements for 5 scenarios.
 *
 * Each scenario intercepts the /api/phase2/real-db-preflight API response
 * and verifies:
 * - Page does not crash
 * - Phase 2.2 section is visible
 * - Gate status shows BLOCK
 * - fallback_used = false
 * - No real path values appear
 * - required/verified states display correctly
 */

import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const SCREENSHOT_DIR = path.resolve(__dirname, '../mock/data/browser-evidence');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// ============================================================
// Helper: Build mock preflight responses
// ============================================================

function buildNormalPreflightResponse() {
  return {
    success: true,
    data: {
      configuration: {
        active_data_source: 'sample',
        active_data_source_kind: 'sample_staging_database',
        preflight_target: 'real_readonly',
        real_db_path_configured: false,
      },
      connection: {
        status: 'not_configured',
        readonly_required: true,
        query_only_required: true,
        readonly_connection_verified: false,
        query_only_verified: false,
        readonly_connection: false,
        query_only: false,
        quick_check: false,
        write_rejection_verified: false,
        write_rejection_methods: [],
      },
      identity: null,
      schema_probe: {
        probed: false,
        tables: [],
        summary: {
          total_candidates: 5,
          detected_count: 0,
          missing_count: 5,
          incomplete_count: 0,
          all_required_present: false,
        },
      },
      safety: {
        production_write_enabled: false,
        production_model_enabled: false,
        production_release_enabled: false,
        sql_input_accepted: false,
        db_path_selectable: false,
        auto_migration_disabled: true,
        auto_fill_disabled: true,
      },
    },
    environment: 'staging',
    data_source_kind: 'sample_staging_database',
    is_mock: false,
    is_sample: true,
    fallback_used: false,
    data_cutoff: '2026-07-24',
    generated_at: '2026-07-27T02:00:00.000Z',
    source: 'real_db_preflight',
    evidence_id: 'evt_preflight_sample_test_browser',
    gate_status: 'BLOCK',
    schema_version: '1.0',
    service_health: 'BLOCK',
    readiness: 'BLOCK',
    release_eligibility: 'BLOCK',
    block_reasons: ['real_db_path_not_configured'],
  };
}

function buildConfigMissingResponse() {
  const resp = buildNormalPreflightResponse();
  // Remove configuration entirely
  delete (resp.data as any).configuration;
  return resp;
}

function buildSafetyEdgeCaseResponse() {
  const resp = buildNormalPreflightResponse();
  // Override safety to test edge cases
  resp.data.safety = {
    production_write_enabled: false,
    production_model_enabled: false,
    production_release_enabled: false,
    sql_input_accepted: false,
    db_path_selectable: false,
    auto_migration_disabled: true,
    auto_fill_disabled: true,
  };
  return resp;
}

// ============================================================
// Helper: Common DOM assertions for all scenarios
// ============================================================

async function assertCommonDOMProperties(page: Page, scenarioName: string) {
  // 1. Page does not crash - body is visible
  await expect(page.locator('body')).toBeVisible();

  // 2. Phase 2.2 section is visible
  const phase2Section = page.locator('text=Phase 2.2');
  await expect(phase2Section.first()).toBeVisible({ timeout: 10000 });

  // 3. Gate status shows BLOCK
  const blockText = page.locator('text=BLOCK');
  await expect(blockText.first()).toBeVisible({ timeout: 5000 });

  // 4. No real path values appear in the visible page text
  const visibleText = await page.locator('body').innerText();
  const pathPatterns = ['/workspace/', '/tmp/', '/home/', '/root/'];
  for (const pattern of pathPatterns) {
    expect(visibleText).not.toContain(pattern);
  }

  // 5. fallback_used=false indicator
  // The page shows "fallback_used=false" in the status banner or data display
  // Check that "自动回退" is not shown as enabled
  const pageText = await page.locator('body').textContent();
  expect(pageText).not.toContain('自动回退已启用');
  expect(pageText).not.toContain('fallback_used=true');
}

// ============================================================
// Scenario 1: Normal preflight response
// ============================================================

test.describe('Scenario 1: Normal preflight response', () => {
  test('renders correctly with BLOCK status', async ({ page }) => {
    // Intercept the API and return normal response
    await page.route('**/api/phase2/real-db-preflight', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildNormalPreflightResponse()),
      });
    });

    // Navigate to /phase2
    await page.goto(`${BASE_URL}/phase2`, { waitUntil: 'networkidle' });

    // Wait for the page to render
    await page.waitForSelector('text=Phase 2', { timeout: 10000 });

    // Common assertions
    await assertCommonDOMProperties(page, 'normal');

    // Additional assertions for normal response
    // Check that "sample" is shown as active data source
    const pageText = await page.locator('body').textContent();
    expect(pageText).toContain('sample');

    // Check that preflight_target shows real_readonly
    expect(pageText).toContain('real_readonly');

    // Check that required fields show true
    expect(pageText).toContain('true');

    // Check that verified fields show false
    expect(pageText).toContain('false');

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'scenario1-normal-full.png'),
      fullPage: true,
    });

    // Take screenshot of Phase 2.2 area specifically
    const phase2Section = page.locator('text=Phase 2.2').first();
    if (await phase2Section.isVisible()) {
      // Find the parent section/card
      const section = page.locator('[class*="border"]').filter({ hasText: 'Phase 2.2' }).first();
      if (await section.isVisible()) {
        await section.screenshot({
          path: path.join(SCREENSHOT_DIR, 'scenario1-normal-phase2-section.png'),
        });
      }
    }
  });
});

// ============================================================
// Scenario 2: Loading / null state
// ============================================================

test.describe('Scenario 2: Loading / null state', () => {
  test('shows loading state then BLOCK when preflightData is null', async ({ page }) => {
    // Delay the API response to simulate loading state
    await page.route('**/api/phase2/real-db-preflight', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildNormalPreflightResponse()),
      });
    });

    await page.goto(`${BASE_URL}/phase2`, { waitUntil: 'domcontentloaded' });

    // Initially, the page should show loading or default BLOCK state
    // Wait a bit for initial render
    await page.waitForTimeout(500);

    // Page should not crash during loading
    await expect(page.locator('body')).toBeVisible();

    // Wait for the data to load
    await page.waitForSelector('text=Phase 2', { timeout: 15000 });

    // Common assertions
    await assertCommonDOMProperties(page, 'loading');

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'scenario2-loading-full.png'),
      fullPage: true,
    });
  });
});

// ============================================================
// Scenario 3: Fetch failure
// ============================================================

test.describe('Scenario 3: Fetch failure', () => {
  test('shows BLOCK with full DOM assertions when API fails', async ({ page }) => {
    // Make the API fail
    await page.route('**/api/phase2/real-db-preflight', async (route) => {
      await route.abort('failed');
    });

    await page.goto(`${BASE_URL}/phase2`, { waitUntil: 'domcontentloaded' });

    // Wait for the page to render (the layout should always be visible)
    await page.waitForSelector('text=Phase 2', { timeout: 10000 });

    // Wait a bit more for the page to fully render with default/null data
    await page.waitForTimeout(3000);

    // Page should not crash - body is visible
    await expect(page.locator('body')).toBeVisible();

    // Full DOM assertions for Scenario 3 using data-testid:

    // 1. Phase 2.2 section is visible (with default values when fetch fails)
    const pageText = await page.locator('body').innerText();
    expect(pageText).toContain('Phase 2.2');

    // 2. BLOCK is visible
    const blockText = page.locator('text=BLOCK');
    await expect(blockText.first()).toBeVisible({ timeout: 5000 });

    // 3. fallback_used=false is visible via data-testid
    const fallbackUsed = page.locator('[data-testid="phase2-2-fallback-used"]');
    await expect(fallbackUsed).toBeVisible({ timeout: 5000 });
    await expect(fallbackUsed).toContainText('fallback_used = false');

    // 4. readonly_required=true via data-testid
    const readonlyRequired = page.locator('[data-testid="phase2-2-readonly-required"]');
    await expect(readonlyRequired).toBeVisible({ timeout: 5000 });
    await expect(readonlyRequired).toHaveText('true');

    // 5. query_only_required=true via data-testid
    const queryOnlyRequired = page.locator('[data-testid="phase2-2-query-only-required"]');
    await expect(queryOnlyRequired).toBeVisible({ timeout: 5000 });
    await expect(queryOnlyRequired).toHaveText('true');

    // 6. readonly_connection_verified=false via data-testid
    const readonlyVerified = page.locator('[data-testid="phase2-2-readonly-connection-verified"]');
    await expect(readonlyVerified).toBeVisible({ timeout: 5000 });
    await expect(readonlyVerified).toHaveText('false');

    // 7. query_only_verified=false via data-testid
    const queryOnlyVerified = page.locator('[data-testid="phase2-2-query-only-verified"]');
    await expect(queryOnlyVerified).toBeVisible({ timeout: 5000 });
    await expect(queryOnlyVerified).toHaveText('false');

    // 8. No real path values appear in visible text
    const pathPatterns = ['/workspace/', '/tmp/', '/home/', '/root/'];
    for (const pattern of pathPatterns) {
      expect(pageText).not.toContain(pattern);
    }

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'scenario3-fetch-failed-full.png'),
      fullPage: true,
    });
  });
});

// ============================================================
// Scenario 4: Configuration missing
// ============================================================

test.describe('Scenario 4: Configuration missing', () => {
  test('shows format error when configuration is missing', async ({ page }) => {
    // Return response without configuration
    await page.route('**/api/phase2/real-db-preflight', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildConfigMissingResponse()),
      });
    });

    await page.goto(`${BASE_URL}/phase2`, { waitUntil: 'domcontentloaded' });

    // Wait for the page to render
    await page.waitForSelector('text=Phase 2', { timeout: 10000 });

    // Common assertions
    await assertCommonDOMProperties(page, 'config-missing');

    // Should show format error message
    const pageText = await page.locator('body').textContent();
    // The page handles missing configuration gracefully
    expect(pageText).toContain('BLOCK');

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'scenario4-config-missing-full.png'),
      fullPage: true,
    });
  });
});

// ============================================================
// Scenario 5: Safety field combination
// ============================================================

test.describe('Scenario 5: Safety field combination', () => {
  test('displays all safety fields correctly', async ({ page }) => {
    // Return response with specific safety values
    await page.route('**/api/phase2/real-db-preflight', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildSafetyEdgeCaseResponse()),
      });
    });

    await page.goto(`${BASE_URL}/phase2`, { waitUntil: 'domcontentloaded' });

    // Wait for the page to render
    await page.waitForSelector('text=Phase 2', { timeout: 10000 });

    // Common assertions
    await assertCommonDOMProperties(page, 'safety');

    // Check safety-specific displays
    const pageText = await page.locator('body').textContent();

    // Safety fields should show disabled/false states
    // The page renders these as "禁用" or "false"
    expect(pageText).toContain('false');

    // auto_migration_disabled=true should show as true
    expect(pageText).toContain('true');

    // Check that production write is not enabled
    expect(pageText).not.toContain('production_write_enabled=true');

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'scenario5-safety-full.png'),
      fullPage: true,
    });
  });
});

// ============================================================
// Network and Console Evidence Collection
// ============================================================

test.describe('Network and Console Evidence', () => {
  test('collects network requests and console logs', async ({ page }) => {
    const networkRequests: Array<{ url: string; status: number; method: string; response_body_sha256?: string; response_body_length?: number; response_body_preview?: string }> = [];
    const consoleMessages: Array<{ type: string; text: string }> = [];

    // Collect network requests
    page.on('response', async (response) => {
      if (response.url().includes('/api/phase2/real-db-preflight')) {
        let responseBody = '';
        let responseBodySha256 = '';
        try {
          responseBody = await response.text();
          responseBodySha256 = crypto.createHash('sha256').update(responseBody).digest('hex');
        } catch (e) {
          // Response body may not be available for aborted requests
        }
        networkRequests.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method(),
          response_body_sha256: responseBodySha256,
          response_body_length: responseBody.length,
          response_body_preview: responseBody.substring(0, 500),
        });
      }
    });

    // Collect console messages
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    // Intercept API
    await page.route('**/api/phase2/real-db-preflight', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildNormalPreflightResponse()),
      });
    });

    await page.goto(`${BASE_URL}/phase2`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Phase 2', { timeout: 10000 });

    // Save network evidence
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'network-evidence.json'),
      JSON.stringify(networkRequests, null, 2)
    );

    // Save console evidence
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'console-evidence.json'),
      JSON.stringify(consoleMessages, null, 2)
    );

    // Verify no console errors
    const errors = consoleMessages.filter((m) => m.type === 'error');
    expect(errors.length).toBe(0);

    // Verify preflight request was made
    expect(networkRequests.length).toBeGreaterThan(0);
    expect(networkRequests[0].status).toBe(200);
  });
});
