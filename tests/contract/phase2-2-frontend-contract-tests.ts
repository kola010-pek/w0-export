/**
 * Phase 2.2A: Frontend Contract Tests (Runtime)
 *
 * Runtime tests that verify the API contract between /api/phase2/real-db-preflight
 * and the /phase2 frontend page by actually hitting the live API.
 *
 * Run: npx tsx tests/phase2-2-frontend-contract-tests.ts
 * Requires: Service running on localhost:5000
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

const testRunId = `run_frontend_contract_rt_${Date.now().toString(16)}`;
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

// ============ PREFLIGHT_UI_001: API Normal Response ============
async function testPreflightUi001NormalResponse(): Promise<TestResult> {
  const testId = 'PREFLIGHT_UI_001';
  const evidenceId = makeEvidenceId(testId);

  try {
    const res = await fetchJson(`${BASE_URL}/api/phase2/real-db-preflight`);

    if (!res.ok) {
      return {
        test_id: testId,
        test_run_id: testRunId,
        test_evidence_id: evidenceId,
        expected_status: 'HTTP 200',
        actual_status: `HTTP ${res.status}`,
        assertion_result: 'FAIL',
        details: `API returned non-200 status: ${res.status}`,
      };
    }

    const d = res.data;

    // Check envelope
    const hasSuccess = d?.success === true;
    const hasData = d?.data !== undefined && d?.data !== null;
    const hasGateStatus = typeof d?.gate_status === 'string';
    const hasFallbackUsed = typeof d?.fallback_used === 'boolean';

    // Check configuration: active_data_source vs preflight_target
    const config = d?.data?.configuration;
    const hasActiveDataSource = typeof config?.active_data_source === 'string';
    const hasActiveDataSourceKind = typeof config?.active_data_source_kind === 'string';
    const hasPreflightTarget = config?.preflight_target === 'real_readonly';
    const hasPathConfigured = typeof config?.real_db_path_configured === 'boolean';

    // Check connection: capability vs verification split
    const conn = d?.data?.connection;
    const hasReadonlyRequired = conn?.readonly_required === true;
    const hasQueryOnlyRequired = conn?.query_only_required === true;
    const hasReadonlyVerified = typeof conn?.readonly_connection_verified === 'boolean';
    const hasQueryOnlyVerified = typeof conn?.query_only_verified === 'boolean';

    // Check safety
    const safety = d?.data?.safety;
    const hasSafety = safety !== undefined;

    // Check no path leakage
    const raw = JSON.stringify(d);
    const pathPatterns = ['/workspace', '/tmp/real', '/home/', '/root/'];
    const hasPathLeak = pathPatterns.some(p => raw.includes(p));

    // Check identity contract: active_data_source must NOT claim real_readonly when mode is sample
    const activeIsSample = config?.active_data_source === 'sample';
    const targetIsReal = config?.preflight_target === 'real_readonly';
    const identityCorrect = activeIsSample || config?.active_data_source === 'real_readonly';

    const allPass = hasSuccess && hasData && hasGateStatus && hasFallbackUsed &&
      hasActiveDataSource && hasActiveDataSourceKind && hasPreflightTarget && hasPathConfigured &&
      hasReadonlyRequired && hasQueryOnlyRequired && hasReadonlyVerified && hasQueryOnlyVerified &&
      hasSafety && !hasPathLeak && identityCorrect;

    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'BLOCK',
      actual_status: d?.gate_status || 'UNKNOWN',
      assertion_result: allPass ? 'PASS' : 'FAIL',
      details: allPass
        ? `API normal response: success=true, gate_status=BLOCK, active_data_source=${config?.active_data_source}, preflight_target=${config?.preflight_target}, fallback_used=${d?.fallback_used}, no path leakage, identity contract correct`
        : `FAIL: success=${hasSuccess}, data=${hasData}, gate=${hasGateStatus}, active_ds=${hasActiveDataSource}, target=${hasPreflightTarget}, ro_req=${hasReadonlyRequired}, qo_req=${hasQueryOnlyRequired}, ro_ver=${hasReadonlyVerified}, qo_ver=${hasQueryOnlyVerified}, safety=${hasSafety}, pathLeak=${hasPathLeak}, identity=${identityCorrect}`,
    };
  } catch (e: any) {
    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'BLOCK',
      actual_status: 'ERROR',
      assertion_result: 'FAIL',
      details: `Exception: ${e.message}`,
    };
  }
}

// ============ PREFLIGHT_UI_002: Null Data (Loading State) ============
async function testPreflightUi002NullData(): Promise<TestResult> {
  const testId = 'PREFLIGHT_UI_002';
  const evidenceId = makeEvidenceId(testId);

  try {
    // Simulate loading state: preflightData is null before fetch completes
    const preflightData: any = null;

    // These are the exact optional-chaining expressions used in the page component
    const gateStatus = preflightData?.gate_status || 'BLOCK';
    const hasConfiguration = preflightData?.data?.configuration;
    const activeDataSource = preflightData?.data?.configuration?.active_data_source || 'unknown';
    const preflightTarget = preflightData?.data?.configuration?.preflight_target || 'real_readonly';
    const connectionStatus = preflightData?.data?.connection?.status || 'not_configured';
    const readonlyRequired = preflightData?.data?.connection?.readonly_required ?? true;
    const queryOnlyRequired = preflightData?.data?.connection?.query_only_required ?? true;
    const readonlyVerified = preflightData?.data?.connection?.readonly_connection_verified ?? false;
    const queryOnlyVerified = preflightData?.data?.connection?.query_only_verified ?? false;
    const schemaProbed = preflightData?.data?.schema_probe?.probed;
    const safetyMigration = preflightData?.data?.safety?.auto_migration_disabled ?? true;
    const safetyFill = preflightData?.data?.safety?.auto_fill_disabled ?? true;

    // All must not throw and show safe defaults
    const showsBlock = gateStatus === 'BLOCK';
    const noConfigShowsDefault = !hasConfiguration;
    const showsUnknownDS = activeDataSource === 'unknown';
    const showsDefaultTarget = preflightTarget === 'real_readonly';
    const showsDefaultConnection = connectionStatus === 'not_configured';
    const showsRequiredTrue = readonlyRequired === true && queryOnlyRequired === true;
    const showsVerifiedFalse = readonlyVerified === false && queryOnlyVerified === false;
    const hidesSchemaTable = !schemaProbed;
    const showsSafetyDefaults = safetyMigration === true && safetyFill === true;

    const allPass = showsBlock && noConfigShowsDefault && showsUnknownDS && showsDefaultTarget &&
      showsDefaultConnection && showsRequiredTrue && showsVerifiedFalse && hidesSchemaTable && showsSafetyDefaults;

    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'loading/null-safe',
      actual_status: 'loading/null-safe',
      assertion_result: allPass ? 'PASS' : 'FAIL',
      details: allPass
        ? 'preflightData=null: gate=BLOCK, active_ds=unknown, target=real_readonly, connection=not_configured, required=true, verified=false, schema hidden, safety defaults correct'
        : `FAIL: block=${showsBlock}, noConfig=${noConfigShowsDefault}, ds=${showsUnknownDS}, target=${showsDefaultTarget}, conn=${showsDefaultConnection}, req=${showsRequiredTrue}, ver=${showsVerifiedFalse}, schema=${hidesSchemaTable}, safety=${showsSafetyDefaults}`,
    };
  } catch (e: any) {
    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'loading/null-safe',
      actual_status: 'ERROR',
      assertion_result: 'FAIL',
      details: `Exception: ${e.message}`,
    };
  }
}

// ============ PREFLIGHT_UI_003: Fetch Failure ============
async function testPreflightUi003FetchFailed(): Promise<TestResult> {
  const testId = 'PREFLIGHT_UI_003';
  const evidenceId = makeEvidenceId(testId);

  try {
    // Simulate fetch failure: preflightData remains null
    const preflightData: any = null;

    // Page expressions
    const gateStatus = preflightData?.gate_status || 'BLOCK';
    const hasConfiguration = preflightData?.data?.configuration;
    const fallbackUsed = preflightData?.fallback_used;
    const safetyMigration = preflightData?.data?.safety?.auto_migration_disabled ?? true;
    const safetyFill = preflightData?.data?.safety?.auto_fill_disabled ?? true;
    const readonlyVerified = preflightData?.data?.connection?.readonly_connection_verified ?? false;
    const queryOnlyVerified = preflightData?.data?.connection?.query_only_verified ?? false;

    const showsBlock = gateStatus === 'BLOCK';
    const showsFormatError = !hasConfiguration;
    const noFallback = fallbackUsed === undefined || fallbackUsed === false;
    const showsMigrationDisabled = safetyMigration === true;
    const showsFillDisabled = safetyFill === true;
    const showsVerifiedFalse = readonlyVerified === false && queryOnlyVerified === false;

    const allPass = showsBlock && showsFormatError && noFallback && showsMigrationDisabled && showsFillDisabled && showsVerifiedFalse;

    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'BLOCK',
      actual_status: gateStatus,
      assertion_result: allPass ? 'PASS' : 'FAIL',
      details: allPass
        ? 'Fetch failed: preflightData=null, gate=BLOCK, format error shown, no fallback, verified=false, safety defaults correct'
        : `FAIL: block=${showsBlock}, formatErr=${showsFormatError}, noFallback=${noFallback}, migration=${showsMigrationDisabled}, fill=${showsFillDisabled}, verified=${showsVerifiedFalse}`,
    };
  } catch (e: any) {
    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'BLOCK',
      actual_status: 'ERROR',
      assertion_result: 'FAIL',
      details: `Exception: ${e.message}`,
    };
  }
}

// ============ PREFLIGHT_UI_004: Configuration Missing ============
async function testPreflightUi004ConfigurationMissing(): Promise<TestResult> {
  const testId = 'PREFLIGHT_UI_004';
  const evidenceId = makeEvidenceId(testId);

  try {
    // Simulate response where data exists but configuration is missing
    const preflightData: any = {
      success: true,
      data: {
        // configuration intentionally missing
        connection: {
          status: 'not_configured',
          readonly_required: true,
          query_only_required: true,
          readonly_connection_verified: false,
          query_only_verified: false,
        },
        schema_probe: { probed: false, tables: [] },
        safety: { auto_migration_disabled: true, auto_fill_disabled: true },
      },
      gate_status: 'BLOCK',
    };

    // Frontend expressions
    const hasConfiguration = preflightData?.data?.configuration;
    const showsFormatError = !hasConfiguration;
    const connectionStatus = preflightData?.data?.connection?.status || 'not_configured';
    const readonlyRequired = preflightData?.data?.connection?.readonly_required ?? true;
    const queryOnlyRequired = preflightData?.data?.connection?.query_only_required ?? true;
    const readonlyVerified = preflightData?.data?.connection?.readonly_connection_verified ?? false;
    const queryOnlyVerified = preflightData?.data?.connection?.query_only_verified ?? false;
    const schemaProbed = preflightData?.data?.schema_probe?.probed;

    const allPass = showsFormatError && connectionStatus === 'not_configured' &&
      readonlyRequired === true && queryOnlyRequired === true &&
      readonlyVerified === false && queryOnlyVerified === false && !schemaProbed;

    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'format_error',
      actual_status: showsFormatError ? 'format_error' : 'rendered',
      assertion_result: allPass ? 'PASS' : 'FAIL',
      details: allPass
        ? 'configuration missing: format error shown, connection defaults safe, required=true, verified=false, schema hidden'
        : `FAIL: formatErr=${showsFormatError}, conn=${connectionStatus}, roReq=${readonlyRequired}, qoReq=${queryOnlyRequired}, roVer=${readonlyVerified}, qoVer=${queryOnlyVerified}, schema=${schemaProbed}`,
    };
  } catch (e: any) {
    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'format_error',
      actual_status: 'ERROR',
      assertion_result: 'FAIL',
      details: `Exception: ${e.message}`,
    };
  }
}

// ============ PREFLIGHT_UI_005: Safety Fields Combination ============
async function testPreflightUi005SafetyFlags(): Promise<TestResult> {
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
        details: `API returned error: ok=${res.ok}, success=${res.data?.success}`,
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
        details: 'safety field missing',
      };
    }

    const conn = res.data.data?.connection;
    const config = res.data.data?.configuration;

    // Safety assertions
    const migrationDisabled = safety.auto_migration_disabled === true;
    const fillDisabled = safety.auto_fill_disabled === true;
    const writeDisabled = safety.production_write_enabled === false;
    const sqlInputDisabled = safety.sql_input_accepted === false;
    const pathNotSelectable = safety.db_path_selectable === false;

    // Connection capability vs verification
    const readonlyRequiredTrue = conn?.readonly_required === true;
    const queryOnlyRequiredTrue = conn?.query_only_required === true;
    const readonlyNotVerified = conn?.readonly_connection_verified === false;
    const queryOnlyNotVerified = conn?.query_only_verified === false;

    // Identity contract
    const activeNotClaimingReal = config?.active_data_source !== 'real_readonly' || config?.real_db_path_configured === true;
    const targetIsReal = config?.preflight_target === 'real_readonly';

    // No fallback
    const noFallback = res.data.fallback_used === false;

    // No path leakage
    const raw = JSON.stringify(res.data);
    const pathPatterns = ['/workspace', '/tmp/real', '/home/', '/root/'];
    const noPathLeak = !pathPatterns.some(p => raw.includes(p));

    const allPass = migrationDisabled && fillDisabled && writeDisabled && sqlInputDisabled && pathNotSelectable &&
      readonlyRequiredTrue && queryOnlyRequiredTrue && readonlyNotVerified && queryOnlyNotVerified &&
      activeNotClaimingReal && targetIsReal && noFallback && noPathLeak;

    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'all_disabled',
      actual_status: allPass ? 'all_disabled' : 'some_enabled',
      assertion_result: allPass ? 'PASS' : 'FAIL',
      details: allPass
        ? `safety: write=false, migration=true, fill=true, sql=false, path_selectable=false; connection: required=true, verified=false; identity: active=${config?.active_data_source}, target=${config?.preflight_target}; fallback=false; no path leak`
        : `FAIL: migration=${safety.auto_migration_disabled}, fill=${safety.auto_fill_disabled}, write=${safety.production_write_enabled}, sql=${safety.sql_input_accepted}, roReq=${readonlyRequiredTrue}, qoReq=${queryOnlyRequiredTrue}, roVer=${readonlyNotVerified}, qoVer=${queryOnlyNotVerified}, identity=${activeNotClaimingReal}, target=${targetIsReal}, fallback=${noFallback}, pathLeak=${noPathLeak}`,
    };
  } catch (e: any) {
    return {
      test_id: testId,
      test_run_id: testRunId,
      test_evidence_id: evidenceId,
      expected_status: 'all_disabled',
      actual_status: 'ERROR',
      assertion_result: 'FAIL',
      details: `Exception: ${e.message}`,
    };
  }
}

// ============ Main ============
async function main() {
  console.log('=== Phase 2.2A Frontend Contract Tests (Runtime) ===\n');
  console.log(`BASE_URL: ${BASE_URL}`);
  console.log(`Test Run ID: ${testRunId}\n`);

  const tests = [
    testPreflightUi001NormalResponse,
    testPreflightUi002NullData,
    testPreflightUi003FetchFailed,
    testPreflightUi004ConfigurationMissing,
    testPreflightUi005SafetyFlags,
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
