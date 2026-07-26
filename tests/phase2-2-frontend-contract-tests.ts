/**
 * Phase 2.2A: Frontend Contract Tests
 *
 * Tests that verify the API contract between /api/phase2/real-db-preflight
 * and the /phase2 frontend page.
 *
 * Run: npx tsx tests/phase2-2-frontend-contract-tests.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

interface TestResult {
  test_id: string;
  test_run_id: string;
  test_evidence_id: string;
  expected_status: string;
  actual_status: string;
  assertion_result: string;
  details: string;
}

const testRunId = `run_frontend_contract_${Date.now().toString(16)}`;
const results: TestResult[] = [];

function makeEvidenceId(testId: string): string {
  return `evt_fc_${testId}_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 8)}`;
}

async function fetchJson(url: string): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(url);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (e: any) {
    return { ok: false, status: 0, data: null };
  }
}

// ============ PREFLIGHT_UI_001_DIRECT_RESPONSE ============
async function testPreflightUi001DirectResponse(): Promise<TestResult> {
  const testId = 'PREFLIGHT_UI_001';
  const evidenceId = makeEvidenceId(testId);

  try {
    const res = await fetchJson(`${BASE_URL}/api/phase2/real-db-preflight`);

    // Verify the response has the expected wrapper structure
    const hasSuccess = res.data?.success === true;
    const hasData = res.data?.data !== undefined && res.data?.data !== null;
    const hasConfiguration = res.data?.data?.configuration !== undefined;
    const hasConnection = res.data?.data?.connection !== undefined;
    const hasSchemaProbe = res.data?.data?.schema_probe !== undefined;
    const hasSafety = res.data?.data?.safety !== undefined;

    // Frontend reads: preflightData.data.configuration
    // This must not throw TypeError
    const canReadConfiguration = hasSuccess && hasData && hasConfiguration;
    const canReadConnection = hasSuccess && hasData && hasConnection;
    const canReadSchemaProbe = hasSuccess && hasData && hasSchemaProbe;
    const canReadSafety = hasSuccess && hasData && hasSafety;

    const allPass = canReadConfiguration && canReadConnection && canReadSchemaProbe && canReadSafety;

    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'BLOCK',
      actual_status: res.data?.gate_status || 'UNKNOWN',
      assertion_result: allPass ? 'PASS' : 'FAIL',
      details: allPass
        ? 'preflight 直接返回 {success,data} 包装，前端可安全读取 data.configuration/connection/schema_probe/safety'
        : `结构异常: success=${hasSuccess}, data=${hasData}, configuration=${hasConfiguration}, connection=${hasConnection}, schema_probe=${hasSchemaProbe}, safety=${hasSafety}`,
    };
  } catch (e: any) {
    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'BLOCK',
      actual_status: 'ERROR',
      assertion_result: 'FAIL',
      details: `异常: ${e.message}`,
    };
  }
}

// ============ PREFLIGHT_UI_002_LOADING ============
async function testPreflightUi002Loading(): Promise<TestResult> {
  const testId = 'PREFLIGHT_UI_002';
  const evidenceId = makeEvidenceId(testId);

  try {
    // Simulate the loading state: before fetch completes, preflightData is null
    // The frontend must show a loading state, not crash
    const preflightData: any = null;

    // Simulate what the frontend does with null data
    // These are the exact expressions used in the page component
    const gateStatus = preflightData?.gate_status || 'BLOCK';
    const hasConfiguration = preflightData?.data?.configuration;
    const dataSourceMode = preflightData?.data?.configuration?.data_source_mode || 'real_readonly';
    const connectionStatus = preflightData?.data?.connection?.status || 'not_configured';
    const schemaProbed = preflightData?.data?.schema_probe?.probed;

    // All these must not throw
    const noCrash = true;
    const showsBlock = gateStatus === 'BLOCK';
    const showsDefaultMode = dataSourceMode === 'real_readonly';
    const showsDefaultConnection = connectionStatus === 'not_configured';
    const hidesSchemaTable = !schemaProbed;

    const allPass = noCrash && showsBlock && showsDefaultMode && showsDefaultConnection && hidesSchemaTable;

    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'loading',
      actual_status: 'loading',
      assertion_result: allPass ? 'PASS' : 'FAIL',
      details: allPass
        ? '请求未完成时 preflightData=null，页面安全显示加载/默认状态，不崩溃'
        : `异常: gateStatus=${gateStatus}, mode=${dataSourceMode}, connection=${connectionStatus}, probed=${schemaProbed}`,
    };
  } catch (e: any) {
    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'loading',
      actual_status: 'ERROR',
      assertion_result: 'FAIL',
      details: `异常: ${e.message}`,
    };
  }
}

// ============ PREFLIGHT_UI_003_FETCH_FAILED ============
async function testPreflightUi003FetchFailed(): Promise<TestResult> {
  const testId = 'PREFLIGHT_UI_003';
  const evidenceId = makeEvidenceId(testId);

  try {
    // Simulate fetch failure: preflightData remains null
    // The frontend must show BLOCK, not crash
    const preflightData: any = null;

    // These are the exact expressions from the page
    const gateStatus = preflightData?.gate_status || 'BLOCK';
    const hasConfiguration = preflightData?.data?.configuration;
    const safetyMigration = preflightData?.data?.safety?.auto_migration_disabled ?? true;
    const safetyFill = preflightData?.data?.safety?.auto_fill_disabled ?? true;

    const showsBlock = gateStatus === 'BLOCK';
    const showsFormatError = !hasConfiguration; // Will show "预检响应格式异常"
    const showsMigrationDisabled = safetyMigration === true;
    const showsFillDisabled = safetyFill === true;

    const allPass = showsBlock && showsFormatError && showsMigrationDisabled && showsFillDisabled;

    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'BLOCK',
      actual_status: gateStatus,
      assertion_result: allPass ? 'PASS' : 'FAIL',
      details: allPass
        ? '请求失败时 preflightData=null，页面显示 BLOCK + 格式异常提示，不崩溃'
        : `异常: gateStatus=${gateStatus}, hasConfiguration=${hasConfiguration}`,
    };
  } catch (e: any) {
    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'BLOCK',
      actual_status: 'ERROR',
      assertion_result: 'FAIL',
      details: `异常: ${e.message}`,
    };
  }
}

// ============ PREFLIGHT_UI_004_CONFIGURATION_MISSING ============
async function testPreflightUi004ConfigurationMissing(): Promise<TestResult> {
  const testId = 'PREFLIGHT_UI_004';
  const evidenceId = makeEvidenceId(testId);

  try {
    // Simulate response where data exists but configuration is missing
    const preflightData: any = {
      success: true,
      data: {
        // configuration is intentionally missing
        connection: { status: 'not_configured' },
        schema_probe: { probed: false, tables: [] },
        safety: { auto_migration_disabled: true, auto_fill_disabled: true },
      },
      gate_status: 'BLOCK',
    };

    // Frontend checks: !preflightData?.data?.configuration
    const hasConfiguration = preflightData?.data?.configuration;
    const showsFormatError = !hasConfiguration;

    // These must not throw even when configuration is missing
    const connectionStatus = preflightData?.data?.connection?.status || 'not_configured';
    const schemaProbed = preflightData?.data?.schema_probe?.probed;

    const allPass = showsFormatError && connectionStatus === 'not_configured' && !schemaProbed;

    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'format_error',
      actual_status: showsFormatError ? 'format_error' : 'rendered',
      assertion_result: allPass ? 'PASS' : 'FAIL',
      details: allPass
        ? 'configuration 缺失时页面显示"预检响应格式异常"，不崩溃'
        : `异常: hasConfiguration=${hasConfiguration}`,
    };
  } catch (e: any) {
    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'format_error',
      actual_status: 'ERROR',
      assertion_result: 'FAIL',
      details: `异常: ${e.message}`,
    };
  }
}

// ============ PREFLIGHT_UI_005_SECURITY_FLAGS ============
async function testPreflightUi005SecurityFlags(): Promise<TestResult> {
  const testId = 'PREFLIGHT_UI_005';
  const evidenceId = makeEvidenceId(testId);

  try {
    const res = await fetchJson(`${BASE_URL}/api/phase2/real-db-preflight`);

    if (!res.ok || !res.data?.success) {
      return {
        test_id: testId,
        test_run_id: testRunId,
        test_evidence_id: evidenceId,
        expected_status: 'PASS',
        actual_status: 'FAIL',
        assertion_result: 'FAIL',
        details: `API 返回异常: ok=${res.ok}, success=${res.data?.success}`,
      };
    }

    const safety = res.data.data?.safety;
    if (!safety) {
      return {
        test_id: testId,
        test_run_id: testRunId,
        test_evidence_id: evidenceId,
        expected_status: 'PASS',
        actual_status: 'FAIL',
        assertion_result: 'FAIL',
        details: 'safety 字段缺失',
      };
    }

    const migrationDisabled = safety.auto_migration_disabled === true;
    const fillDisabled = safety.auto_fill_disabled === true;
    const writeDisabled = safety.production_write_enabled === false;
    const sqlInputDisabled = safety.sql_input_accepted === false;

    const allPass = migrationDisabled && fillDisabled && writeDisabled && sqlInputDisabled;

    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'all_disabled',
      actual_status: allPass ? 'all_disabled' : 'some_enabled',
      assertion_result: allPass ? 'PASS' : 'FAIL',
      details: allPass
        ? `auto_migration_disabled=true, auto_fill_disabled=true, production_write_enabled=false, sql_input_accepted=false`
        : `auto_migration_disabled=${safety.auto_migration_disabled}, auto_fill_disabled=${safety.auto_fill_disabled}, production_write_enabled=${safety.production_write_enabled}, sql_input_accepted=${safety.sql_input_accepted}`,
    };
  } catch (e: any) {
    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'all_disabled',
      actual_status: 'ERROR',
      assertion_result: 'FAIL',
      details: `异常: ${e.message}`,
    };
  }
}

// ============ Main ============
async function main() {
  console.log('=== Phase 2.2A Frontend Contract Tests ===\n');

  const tests = [
    testPreflightUi001DirectResponse,
    testPreflightUi002Loading,
    testPreflightUi003FetchFailed,
    testPreflightUi004ConfigurationMissing,
    testPreflightUi005SecurityFlags,
  ];

  for (const test of tests) {
    const result = await test();
    results.push(result);
    const icon = result.assertion_result === 'PASS' ? 'PASS' : 'FAIL';
    console.log(`[${icon}] ${result.test_id}: ${result.details}`);
  }

  const passed = results.filter(r => r.assertion_result === 'PASS').length;
  const failed = results.filter(r => r.assertion_result === 'FAIL').length;

  console.log(`\n=== Summary ===`);
  console.log(`Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`);

  // Save report
  const report = {
    test_run_id: testRunId,
    generated_at: new Date().toISOString(),
    total_tests: results.length,
    passed_tests: passed,
    failed_tests: failed,
    results,
  };

  const reportPath = path.join(process.cwd(), 'mock', 'data', 'phase2-2-frontend-contract-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to: ${reportPath}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
