// Mock Tool Layer - Simulates tool execution for Phase 1
// All mock results clearly marked with mock: true

import { v4 as uuidv4 } from 'uuid';
import type {
  AgentId,
  TaskType,
  TaskResult,
  GateResult,
  GateRule,
  Evidence,
} from '../types';

interface MockToolInput {
  run_id: string;
  task_id: string;
  dag_node: string;
  data_object?: string;
  scope?: string;
  data_cutoff: string;
  attempt: number;
}

interface MockToolOutput {
  success: boolean;
  gate_status?: 'PASS' | 'WARN' | 'BLOCK' | 'NOT_EXECUTED';
  gate_result?: GateResult;
  input_versions?: Record<string, string>;
  output_versions?: Record<string, string>;
  metrics?: { inserted: number; updated: number; skipped: number; failed: number };
  watermarks?: Record<string, string>;
  evidence?: Evidence[];
  warnings?: string[];
  errors?: string[];
  next_action?: string;
  approval_required?: boolean;
  approval_type?: 'risk_review' | 'human_release' | 'human_review';
  model_version?: string;
  input_snapshot_id?: string;
  candidate_signal_version?: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
}

// Scenario profiles that affect mock behavior
let _activeScenario: string | null = null;

export function setActiveScenario(scenario: string | null): void {
  _activeScenario = scenario;
}

export function getActiveScenario(): string | null {
  return _activeScenario;
}

export function executeMockTool(
  agentId: AgentId,
  taskType: TaskType,
  input: MockToolInput
): MockToolOutput {
  const scenario = _activeScenario;

  switch (taskType) {
    case 'data_update':
      return executeDataUpdateMock(agentId, input, scenario);
    case 'quality_check':
      return executeQualityCheckMock(agentId, input, scenario);
    case 'model_run':
      return executeModelRunMock(agentId, input, scenario);
    case 'risk_review':
      return executeRiskReviewMock(agentId, input, scenario);
    case 'release':
      return executeReleaseMock(agentId, input, scenario);
    case 'observation':
      return executeObservationMock(agentId, input, scenario);
    default:
      return {
        success: false,
        errors: [`Unknown task type: ${taskType}`],
      };
  }
}

function makeEvidence(type: string, data: Record<string, unknown>): Evidence {
  return {
    evidence_id: `ev_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
    type,
    source: 'mock_tool',
    data,
    created_at: new Date().toISOString(),
    hash: `hash_${uuidv4().replace(/-/g, '').slice(0, 8)}`,
  };
}

// ============ Data Update Mock ============
function executeDataUpdateMock(agentId: AgentId, input: MockToolInput, scenario: string | null): MockToolOutput {
  const scenario2 = scenario;
  let inserted = 250;
  let updated = 50;
  let skipped = 10;
  let failed = 0;

  // Scenario B: adjustment_factors has gap issues
  if (scenario2 === 'scenario_b' && input.dag_node === 'adjustment_factors') {
    inserted = 100;
    skipped = 80;
    failed = 20;
  }

  const evidence = makeEvidence('data_update_result', {
    data_object: input.data_object,
    inserted,
    updated,
    skipped,
    failed,
    data_cutoff: input.data_cutoff,
  });

  return {
    success: true,
    input_versions: { [input.data_object || 'data']: `v_${input.data_cutoff}` },
    output_versions: { [input.data_object || 'data']: `v_${input.data_cutoff}_updated` },
    metrics: { inserted, updated, skipped, failed },
    watermarks: { [input.data_object || 'data']: input.data_cutoff },
    evidence: [evidence],
    warnings: failed > 0 ? [`${failed} records failed to update`] : [],
    errors: [],
    next_action: 'quality_check',
  };
}

// ============ Quality Check Mock ============
function executeQualityCheckMock(agentId: AgentId, input: MockToolInput, scenario: string | null): MockToolOutput {
  const scenario2 = scenario;
  let overallStatus: 'PASS' | 'WARN' | 'BLOCK' = 'PASS';
  const rules: GateRule[] = [];
  const blockReasons: string[] = [];
  const warnings: string[] = [];

  // Coverage check
  let coverageActual = 0.9995;
  if (scenario2 === 'scenario_b') {
    coverageActual = 0.985; // Below threshold
  }
  const coverageStatus = coverageActual >= 0.999 ? 'PASS' as const : 'BLOCK' as const;
  rules.push({
    rule_id: 'coverage_check',
    display_name: '\u8986\u76D6\u7387\u68C0\u67E5',
    status: coverageStatus,
    actual: coverageActual,
    threshold: 0.999,
    operator: '>=',
    severity: 'BLOCK',
    evidence_ref: makeEvidence('coverage_check', { ratio: coverageActual }).evidence_id,
    description: '\u6570\u636E\u8986\u76D6\u7387\u5FC5\u987B >= 99.9%',
  });
  if (coverageStatus === 'BLOCK') {
    overallStatus = 'BLOCK';
    blockReasons.push(`\u8986\u76D6\u7387 ${coverageActual} \u4F4E\u4E8E\u9608\u503C 0.999`);
  }

  // Freshness check
  rules.push({
    rule_id: 'freshness_check',
    display_name: '\u65B0\u9C9C\u5EA6\u68C0\u67E5',
    status: 'PASS',
    actual: 2,
    threshold: 24,
    operator: '<=',
    severity: 'BLOCK',
    evidence_ref: makeEvidence('freshness_check', { hours: 2 }).evidence_id,
    description: '\u6570\u636E\u65B0\u9C9C\u5EA6\u5FC5\u987B\u5728 24 \u5C0F\u65F6\u5185',
  });

  // Uniqueness check
  rules.push({
    rule_id: 'uniqueness_check',
    display_name: '\u552F\u4E00\u6027\u68C0\u67E5',
    status: 'PASS',
    actual: 1.0,
    threshold: 1.0,
    operator: '>=',
    severity: 'BLOCK',
    evidence_ref: makeEvidence('uniqueness_check', { ratio: 1.0 }).evidence_id,
    description: '\u4E3B\u952E\u5FC5\u987B\u5B8C\u5168\u552F\u4E00',
  });

  // Null check
  let nullRatio = 0.0005;
  if (scenario2 === 'scenario_b') {
    nullRatio = 0.005; // Above WARN threshold
  }
  const nullStatus = nullRatio <= 0.001 ? 'PASS' as const : 'WARN' as const;
  rules.push({
    rule_id: 'null_check',
    display_name: '\u7A7A\u503C\u68C0\u67E5',
    status: nullStatus,
    actual: nullRatio,
    threshold: 0.001,
    operator: '<=',
    severity: 'WARN',
    evidence_ref: makeEvidence('null_check', { ratio: nullRatio }).evidence_id,
    description: '\u5173\u952E\u5B57\u6BB5\u7A7A\u503C\u7387\u5FC5\u987B <= 0.1%',
  });
  if (nullStatus === 'WARN') {
    if (overallStatus !== 'BLOCK') overallStatus = 'WARN';
    warnings.push(`\u7A7A\u503C\u7387 ${nullRatio} \u8D85\u8FC7\u9608\u503C 0.001`);
  }

  // Dependency order check
  rules.push({
    rule_id: 'dependency_order_check',
    display_name: '\u4F9D\u8D56\u987A\u5E8F\u68C0\u67E5',
    status: 'PASS',
    actual: 0,
    threshold: 0,
    operator: '==',
    severity: 'BLOCK',
    evidence_ref: makeEvidence('dep_order_check', { violations: 0 }).evidence_id,
    description: '\u6570\u636E\u4F9D\u8D56\u987A\u5E8F\u4E0D\u5141\u8BB8\u8FDD\u89C4',
  });

  // Cutoff check
  rules.push({
    rule_id: 'cutoff_check',
    display_name: '\u6570\u636E\u622A\u6B62\u65E5\u68C0\u67E5',
    status: 'PASS',
    actual: input.data_cutoff,
    threshold: true,
    operator: '==',
    severity: 'BLOCK',
    evidence_ref: makeEvidence('cutoff_check', { cutoff: input.data_cutoff, match: true }).evidence_id,
    description: '\u6570\u636E\u622A\u6B62\u65E5\u5FC5\u987B\u4E0E\u4EFB\u52A1\u53C2\u6570\u4E00\u81F4',
  });

  const gateResult: GateResult = {
    gate_id: 'gate_database_core',
    run_id: input.run_id,
    scope: 'database_core',
    status: overallStatus,
    checked_at: new Date().toISOString(),
    data_cutoff: input.data_cutoff,
    rules,
    block_reasons: blockReasons,
    warnings,
  };

  return {
    success: overallStatus !== 'BLOCK',
    gate_status: overallStatus,
    gate_result: gateResult,
    evidence: rules.map(r => makeEvidence('gate_rule', { rule_id: r.rule_id, status: r.status })),
    warnings,
    errors: blockReasons,
    next_action: overallStatus === 'BLOCK' ? 'STOP' : 'model_run',
  };
}

// ============ Model Run Mock ============
function executeModelRunMock(agentId: AgentId, input: MockToolInput, scenario: string | null): MockToolOutput {
  const modelVersion = 'model_v2.1.0';
  const inputSnapshotId = `snap_${uuidv4().replace(/-/g, '').slice(0, 8)}`;
  const candidateSignalVersion = `cs_${uuidv4().replace(/-/g, '').slice(0, 8)}`;

  // Model gate rules
  const rules: GateRule[] = [];
  let modelGateStatus: string = 'PASS';
  const warnings: string[] = [];

  // Model version check
  rules.push({
    rule_id: 'model_version_check',
    display_name: '\u6A21\u578B\u7248\u672C\u68C0\u67E5',
    status: 'PASS',
    actual: true,
    threshold: true,
    operator: '==',
    severity: 'BLOCK',
    evidence_ref: makeEvidence('model_version', { version: modelVersion, registered: true }).evidence_id,
    description: '\u6A21\u578B\u7248\u672C\u5FC5\u987B\u5DF2\u767B\u8BB0',
  });

  // Sharpe ratio check
  let sharpe = 1.5;
  if (scenario === 'scenario_c') {
    sharpe = 0.8; // Below WARN threshold
  }
  const sharpeStatus = sharpe >= 1.0 ? 'PASS' as const : 'WARN' as const;
  rules.push({
    rule_id: 'backtest_sharpe_check',
    display_name: '\u56DE\u6D4B\u590F\u666E\u6BD4\u68C0\u67E5',
    status: sharpeStatus,
    actual: sharpe,
    threshold: 1.0,
    operator: '>=',
    severity: 'WARN',
    evidence_ref: makeEvidence('sharpe_check', { sharpe }).evidence_id,
    description: '\u56DE\u6D4B\u590F\u666E\u6BD4\u5EFA\u8BAE >= 1.0',
  });
  if (sharpeStatus === 'WARN') {
    if (modelGateStatus !== 'BLOCK') modelGateStatus = 'WARN';
    warnings.push(`\u590F\u666E\u6BD4 ${sharpe} \u4F4E\u4E8E\u5EFA\u8BAE\u9608\u503C 1.0`);
  }

  // Max drawdown check
  rules.push({
    rule_id: 'backtest_max_drawdown_check',
    display_name: '\u56DE\u6D4B\u6700\u5927\u56DE\u64A4\u68C0\u67E5',
    status: 'PASS',
    actual: 0.12,
    threshold: 0.2,
    operator: '<=',
    severity: 'WARN',
    evidence_ref: makeEvidence('drawdown_check', { max_drawdown: 0.12 }).evidence_id,
    description: '\u56DE\u6D4B\u6700\u5927\u56DE\u64A4\u5EFA\u8BAE <= 20%',
  });

  // Anomaly check
  rules.push({
    rule_id: 'anomaly_check',
    display_name: '\u5F02\u5E38\u503C\u68C0\u67E5',
    status: 'PASS',
    actual: 2,
    threshold: 5,
    operator: '<=',
    severity: 'WARN',
    evidence_ref: makeEvidence('anomaly_check', { count: 2 }).evidence_id,
    description: '\u5F02\u5E38\u503C\u6570\u91CF\u5EFA\u8BAE <= 5',
  });

  // Evidence completeness
  rules.push({
    rule_id: 'evidence_completeness_check',
    display_name: '\u8BC1\u636E\u5B8C\u6574\u6027\u68C0\u67E5',
    status: 'PASS',
    actual: true,
    threshold: true,
    operator: '==',
    severity: 'BLOCK',
    evidence_ref: makeEvidence('evidence_completeness', { complete: true }).evidence_id,
    description: '\u6240\u6709\u8BC1\u636E\u5FC5\u987B\u5B8C\u6574',
  });

  const modelGate: GateResult = {
    gate_id: 'gate_model',
    run_id: input.run_id,
    scope: 'model',
    status: modelGateStatus as GateResult['status'],
    checked_at: new Date().toISOString(),
    data_cutoff: input.data_cutoff,
    rules,
    block_reasons: [],
    warnings,
  };

  return {
    success: true,
    gate_status: modelGateStatus as 'PASS' | 'WARN' | 'BLOCK' | 'NOT_EXECUTED',
    gate_result: modelGate,
    input_versions: { model: modelVersion, data_snapshot: inputSnapshotId },
    output_versions: { candidate_signal: candidateSignalVersion },
    metrics: { inserted: 0, updated: 0, skipped: 0, failed: 0 },
    watermarks: {},
    evidence: [
      makeEvidence('model_run', {
        model_version: modelVersion,
        input_snapshot: inputSnapshotId,
        candidate_signal: candidateSignalVersion,
        sharpe_ratio: sharpe,
      }),
    ],
    warnings,
    errors: [],
    next_action: modelGateStatus === 'WARN' ? 'human_review' : 'risk_review',
    approval_required: modelGateStatus === 'WARN',
    approval_type: 'human_review',
    model_version: modelVersion,
    input_snapshot_id: inputSnapshotId,
    candidate_signal_version: candidateSignalVersion,
    risk_level: modelGateStatus === 'WARN' ? 'high' : 'medium',
  };
}

// ============ Risk Review Mock ============
function executeRiskReviewMock(agentId: AgentId, input: MockToolInput, scenario: string | null): MockToolOutput {
  return {
    success: true,
    evidence: [
      makeEvidence('risk_review', {
        review_status: 'APPROVE',
        risk_level: 'medium',
        reasons: ['\u6A21\u578B\u7248\u672C\u5DF2\u767B\u8BB0', '\u8BC1\u636E\u5B8C\u6574', '\u6570\u636E\u622A\u6B62\u65E5\u4E00\u81F4'],
      }),
    ],
    warnings: [],
    errors: [],
    next_action: 'human_approval',
    approval_required: true,
    approval_type: 'human_release',
    risk_level: 'medium',
  };
}

// ============ Release Mock ============
function executeReleaseMock(agentId: AgentId, input: MockToolInput, scenario: string | null): MockToolOutput {
  return {
    success: true,
    output_versions: { release: `rel_${uuidv4().replace(/-/g, '').slice(0, 8)}` },
    evidence: [
      makeEvidence('release', {
        release_version: `v_${input.data_cutoff}`,
        published_at: new Date().toISOString(),
        target: 'mock_downstream',
      }),
    ],
    warnings: [],
    errors: [],
    next_action: 'observation',
  };
}

// ============ Observation Mock ============
function executeObservationMock(agentId: AgentId, input: MockToolInput, scenario: string | null): MockToolOutput {
  return {
    success: true,
    evidence: [
      makeEvidence('observation', {
        monitoring_status: 'healthy',
        alerts_triggered: 0,
        downstream_received: true,
      }),
    ],
    warnings: [],
    errors: [],
    next_action: 'complete',
  };
}
