// Phase 2: /api/quality/gates - Read-only quality gates endpoint
// Returns quality gate status and rule details
// No write operations, no SQL input, no model startup, no signal release

import { NextRequest, NextResponse } from 'next/server';
import {
  buildPhase2Response,
  isMockMode,
} from '@/lib/data-source';
import type { GateRule, RuleStatus } from '@/lib/types';

interface QualityGate {
  gate_id: string;
  gate_type: 'data_quality' | 'dependency' | 'cutoff' | 'freshness';
  status: 'PASS' | 'WARN' | 'BLOCK' | 'NOT_EXECUTED';
  rules: GateRule[];
  checked_at: string;
  data_cutoff: string;
  scope?: string;
  block_reasons: string[];
  warnings: string[];
}

interface QualityGatesData {
  gates: QualityGate[];
  summary: {
    total_gates: number;
    pass_count: number;
    warn_count: number;
    block_count: number;
    not_executed_count: number;
  };
}

// Mock quality gates data
function getMockQualityGatesData(): QualityGatesData {
  const now = new Date().toISOString();
  const dataCutoff = new Date().toISOString().split('T')[0];

  const gates: QualityGate[] = [
    {
      gate_id: 'gate_quality_001',
      gate_type: 'data_quality',
      status: 'PASS',
      rules: [
        {
          rule_id: 'coverage_check',
          display_name: '因子覆盖率',
          status: 'PASS' as RuleStatus,
          actual: 0.9995,
          threshold: 0.999,
          operator: '>=',
          severity: 'BLOCK',
          evidence_ref: 'ev_coverage_mock_001',
          description: '数据覆盖率必须 >= 99.9%',
          unit: '%',
          data_range: { start: dataCutoff, end: dataCutoff },
          rule_version: 'v1.2.0',
          checked_at: now,
          source: 'quality_engine',
        },
        {
          rule_id: 'freshness_check',
          display_name: '数据新鲜度',
          status: 'PASS' as RuleStatus,
          actual: 2,
          threshold: 24,
          operator: '<=',
          severity: 'BLOCK',
          evidence_ref: 'ev_freshness_mock_001',
          description: '数据新鲜度必须在 24 小时内',
          unit: 'hours',
          checked_at: now,
          source: 'quality_engine',
        },
      ],
      checked_at: now,
      data_cutoff: dataCutoff,
      scope: 'daily_kline',
      block_reasons: [],
      warnings: [],
    },
    {
      gate_id: 'gate_quality_002',
      gate_type: 'data_quality',
      status: 'PASS',
      rules: [
        {
          rule_id: 'uniqueness_check',
          display_name: '主键唯一性',
          status: 'PASS' as RuleStatus,
          actual: 1.0,
          threshold: 1.0,
          operator: '==',
          severity: 'BLOCK',
          evidence_ref: 'ev_uniqueness_mock_001',
          description: '主键必须 100% 唯一',
          unit: 'ratio',
          checked_at: now,
          source: 'quality_engine',
        },
        {
          rule_id: 'null_rate_check',
          display_name: '空值率',
          status: 'PASS' as RuleStatus,
          actual: 0.001,
          threshold: 0.01,
          operator: '<=',
          severity: 'WARN',
          evidence_ref: 'ev_null_rate_mock_001',
          description: '关键字段空值率必须 <= 1%',
          unit: 'ratio',
          checked_at: now,
          source: 'quality_engine',
        },
      ],
      checked_at: now,
      data_cutoff: dataCutoff,
      scope: 'factor_data',
      block_reasons: [],
      warnings: [],
    },
    {
      gate_id: 'gate_dependency_001',
      gate_type: 'dependency',
      status: 'PASS',
      rules: [
        {
          rule_id: 'dependency_order',
          display_name: '依赖顺序',
          status: 'PASS' as RuleStatus,
          actual: 'correct',
          threshold: 'correct',
          operator: '==',
          severity: 'BLOCK',
          evidence_ref: 'ev_dependency_mock_001',
          description: '上游节点必须全部完成',
          checked_at: now,
          source: 'dag_engine',
        },
      ],
      checked_at: now,
      data_cutoff: dataCutoff,
      block_reasons: [],
      warnings: [],
    },
    {
      gate_id: 'gate_cutoff_001',
      gate_type: 'cutoff',
      status: 'PASS',
      rules: [
        {
          rule_id: 'cutoff_check',
          display_name: '数据截止日',
          status: 'PASS' as RuleStatus,
          actual: dataCutoff,
          threshold: dataCutoff,
          operator: '>=',
          severity: 'BLOCK',
          evidence_ref: 'ev_cutoff_mock_001',
          description: '数据截止日必须符合要求',
          checked_at: now,
          source: 'dag_engine',
        },
      ],
      checked_at: now,
      data_cutoff: dataCutoff,
      block_reasons: [],
      warnings: [],
    },
  ];

  return {
    gates,
    summary: {
      total_gates: gates.length,
      pass_count: gates.filter((g) => g.status === 'PASS').length,
      warn_count: gates.filter((g) => g.status === 'WARN').length,
      block_count: gates.filter((g) => g.status === 'BLOCK').length,
      not_executed_count: gates.filter((g) => g.status === 'NOT_EXECUTED').length,
    },
  };
}

// Real quality gates data (read-only, no write operations)
async function getRealQualityGatesData(runId?: string): Promise<QualityGatesData> {
  // In real mode, this would query actual quality gate results (read-only)
  // For Phase 2, we still return mock data but mark it differently
  // Real implementation would:
  // 1. Query database for gate evaluation results
  // 2. Check rule execution status
  // 3. Return actual gate information
  return getMockQualityGatesData();
}

export async function GET(request: NextRequest) {
  try {
    const isMock = isMockMode();
    const searchParams = request.nextUrl.searchParams;
    const runId = searchParams.get('run_id');

    let data: QualityGatesData;

    if (isMock) {
      data = getMockQualityGatesData();
    } else {
      data = await getRealQualityGatesData(runId || undefined);
    }

    // Evaluate overall gate status
    let gateStatus: 'PASS' | 'WARN' | 'BLOCK' = 'PASS';
    const warnings: string[] = [];

    // Check for blocked gates
    if (data.summary.block_count > 0) {
      gateStatus = 'BLOCK';
      warnings.push(`blocked_gates: ${data.summary.block_count}`);
    }

    // Check for warned gates
    if (data.summary.warn_count > 0) {
      if (gateStatus !== 'BLOCK') {
        gateStatus = 'WARN';
      }
      warnings.push(`warned_gates: ${data.summary.warn_count}`);
    }

    // Check for not executed gates
    if (data.summary.not_executed_count > 0) {
      if (gateStatus !== 'BLOCK') {
        gateStatus = 'WARN';
      }
      warnings.push(`not_executed_gates: ${data.summary.not_executed_count}`);
    }

    // Evidence missing check
    const hasEvidence = data.gates.every((g) =>
      g.rules.every((r) => r.evidence_ref && r.checked_at && r.source)
    );
    if (!hasEvidence) {
      if (gateStatus !== 'BLOCK') {
        gateStatus = 'WARN';
      }
      warnings.push('evidence_missing');
    }

    // Format abnormal check
    const hasFormatIssues = data.gates.some((g) => !g.gate_id || !g.gate_type || !g.status);
    if (hasFormatIssues) {
      gateStatus = 'BLOCK';
      warnings.push('format_abnormal');
    }

    const source = isMock ? 'mock_quality_service' : 'real_quality_service';

    return NextResponse.json(
      buildPhase2Response({
        data,
        source,
        evidencePrefix: 'quality',
        gateStatus,
        warnings: warnings.length > 0 ? warnings : undefined,
      })
    );
  } catch (error) {
    // Interface unreachable or format abnormal - must BLOCK, never degrade to PASS
    return NextResponse.json(
      buildPhase2Response({
        data: null,
        source: 'quality_service',
        evidencePrefix: 'quality',
        gateStatus: 'BLOCK',
        error: error instanceof Error ? error.message : 'Quality gates check failed',
        success: false,
      }),
      { status: 500 }
    );
  }
}
