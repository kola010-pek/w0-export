// Phase 2.1: /api/quality/gates - Read-only quality gates with real SQLite support
// Security: Read-only, no SQL input, no write operations

import { NextRequest, NextResponse } from 'next/server';
import {
  buildPhase2Response,
  isMockMode,
} from '@/lib/data-source';
import type { GateRule, RuleStatus } from '@/lib/types';
import {
  getReadOnlyConnection,
  checkRequiredTables,
  checkDependencyOrder,
  getWatermark,
} from '@/lib/sqlite-adapter';

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
          unit: 'ratio',
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

// Real quality gates data from SQLite
async function getRealQualityGatesData(): Promise<{ data: QualityGatesData; warnings: string[]; gateStatus: 'PASS' | 'WARN' | 'BLOCK' }> {
  const now = new Date().toISOString();
  const warnings: string[] = [];
  let gateStatus: 'PASS' | 'WARN' | 'BLOCK' = 'PASS';

  const { db, error: connError, isConnected } = getReadOnlyConnection();
  
  if (!isConnected || !db) {
    // Database connection failed - all gates BLOCK
    const gates: QualityGate[] = [
      {
        gate_id: 'gate_connection',
        gate_type: 'data_quality',
        status: 'BLOCK',
        rules: [],
        checked_at: now,
        data_cutoff: '',
        block_reasons: ['database_connection_failed'],
        warnings: [connError?.message || 'Cannot connect to database'],
      },
    ];

    return {
      data: {
        gates,
        summary: { total_gates: 1, pass_count: 0, warn_count: 0, block_count: 1, not_executed_count: 0 },
      },
      warnings: ['database_connection_failed'],
      gateStatus: 'BLOCK',
    };
  }

  const gates: QualityGate[] = [];
  
  // Get real data_cutoff from the latest trade date in the database
  let dataCutoff = new Date().toISOString().split('T')[0];
  try {
    const Database = require('better-sqlite3');
    const dbPath = process.env.SQLITE_DB_PATH || './data/staging.db';
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    
    // Get the latest trade date across all required tables
    const tables = ['daily_kline', 'adjustment_factors', 'factor_data', 'market_factors'];
    const latestDates: string[] = [];
    
    for (const table of tables) {
      const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
      if (tableCheck) {
        const latestRow = db.prepare(`SELECT trade_date as latest_date FROM ${table} ORDER BY trade_date DESC LIMIT 1`).get() as any;
        if (latestRow?.latest_date) {
          latestDates.push(latestRow.latest_date);
        }
      }
    }
    
    db.close();
    
    if (latestDates.length > 0) {
      latestDates.sort().reverse();
      dataCutoff = latestDates[0];
    }
  } catch (error) {
    // Fall back to system date if database is not accessible
  }

  // 1. Coverage check - check if all required tables have data
  const tableCheck = checkRequiredTables();
  const totalRequired = 4;
  const existingTables = tableCheck.tables.filter(t => t.exists).length;
  const coverageRatio = existingTables / totalRequired;
  const coverageStatus = coverageRatio >= 0.999 ? 'PASS' : 'BLOCK';
  
  gates.push({
    gate_id: 'gate_coverage',
    gate_type: 'data_quality',
    status: coverageStatus as 'PASS' | 'BLOCK',
    rules: [{
      rule_id: 'coverage_check',
      display_name: '表覆盖率',
      status: coverageStatus as RuleStatus,
      actual: coverageRatio,
      threshold: 0.999,
      operator: '>=',
      severity: 'BLOCK',
      evidence_ref: `ev_coverage_real_${Date.now()}`,
      description: '必要表覆盖率必须 >= 99.9%',
      unit: 'ratio',
      data_range: { start: dataCutoff, end: dataCutoff },
      rule_version: 'v1.2.0',
      checked_at: now,
      source: 'sqlite_adapter',
    }],
    checked_at: now,
    data_cutoff: dataCutoff,
    block_reasons: coverageStatus === 'BLOCK' ? [`coverage ${coverageRatio} < 0.999`] : [],
    warnings: [],
  });

  if (coverageStatus === 'BLOCK') {
    gateStatus = 'BLOCK';
    warnings.push('coverage_check_failed');
  }

  // 2. Freshness check - check latest data date
  const klineWatermark = getWatermark('daily_kline');
  let freshnessHours = 999;
  let freshnessStatus: 'PASS' | 'WARN' | 'BLOCK' = 'BLOCK';
  
  if (klineWatermark.lastUpdated) {
    const lastUpdated = new Date(klineWatermark.lastUpdated);
    freshnessHours = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
    
    if (freshnessHours <= 24) {
      freshnessStatus = 'PASS';
    } else if (freshnessHours <= 48) {
      freshnessStatus = 'WARN';
      if (gateStatus !== 'BLOCK') gateStatus = 'WARN';
    } else {
      freshnessStatus = 'BLOCK';
      gateStatus = 'BLOCK';
    }
  }

  gates.push({
    gate_id: 'gate_freshness',
    gate_type: 'freshness',
    status: freshnessStatus,
    rules: [{
      rule_id: 'freshness_check',
      display_name: '数据新鲜度',
      status: freshnessStatus as RuleStatus,
      actual: freshnessHours,
      threshold: 24,
      operator: '<=',
      severity: 'BLOCK',
      evidence_ref: `ev_freshness_real_${Date.now()}`,
      description: '数据新鲜度必须在 24 小时内',
      unit: 'hours',
      checked_at: now,
      source: 'sqlite_adapter',
    }],
    checked_at: now,
    data_cutoff: klineWatermark.latestDate || dataCutoff,
    block_reasons: freshnessStatus === 'BLOCK' ? [`freshness ${freshnessHours}h > 48h`] : [],
    warnings: freshnessStatus === 'WARN' ? [`data_stale_${freshnessHours}h`] : [],
  });

  // 3. Uniqueness check - check primary key uniqueness
  let uniquenessRatio = 1.0;
  let uniquenessStatus: 'PASS' | 'BLOCK' = 'PASS';
  
  try {
    const totalRows = db.prepare('SELECT COUNT(*) as count FROM daily_kline').get() as { count: number };
    const distinctRows = db.prepare('SELECT COUNT(DISTINCT symbol || trade_date) as count FROM daily_kline').get() as { count: number };
    
    if (totalRows.count > 0) {
      uniquenessRatio = distinctRows.count / totalRows.count;
      if (uniquenessRatio < 1.0) {
        uniquenessStatus = 'BLOCK';
        gateStatus = 'BLOCK';
      }
    }
  } catch {
    uniquenessStatus = 'BLOCK';
    gateStatus = 'BLOCK';
  }

  gates.push({
    gate_id: 'gate_uniqueness',
    gate_type: 'data_quality',
    status: uniquenessStatus,
    rules: [{
      rule_id: 'uniqueness_check',
      display_name: '主键唯一性',
      status: uniquenessStatus as RuleStatus,
      actual: uniquenessRatio,
      threshold: 1.0,
      operator: '==',
      severity: 'BLOCK',
      evidence_ref: `ev_uniqueness_real_${Date.now()}`,
      description: '主键必须 100% 唯一',
      unit: 'ratio',
      checked_at: now,
      source: 'sqlite_adapter',
    }],
    checked_at: now,
    data_cutoff: dataCutoff,
    block_reasons: uniquenessStatus === 'BLOCK' ? [`uniqueness ${uniquenessRatio} < 1.0`] : [],
    warnings: [],
  });

  // 4. Null rate check
  let nullRate = 0;
  let nullRateStatus: 'PASS' | 'WARN' | 'BLOCK' = 'PASS';
  
  try {
    const totalRows = db.prepare('SELECT COUNT(*) as count FROM factor_data').get() as { count: number };
    const nullRows = db.prepare('SELECT COUNT(*) as count FROM factor_data WHERE factor_value IS NULL').get() as { count: number };
    
    if (totalRows.count > 0) {
      nullRate = nullRows.count / totalRows.count;
      if (nullRate > 0.01) {
        nullRateStatus = 'WARN';
        if (gateStatus !== 'BLOCK') gateStatus = 'WARN';
      }
    }
  } catch {
    nullRateStatus = 'BLOCK';
    gateStatus = 'BLOCK';
  }

  gates.push({
    gate_id: 'gate_null_rate',
    gate_type: 'data_quality',
    status: nullRateStatus,
    rules: [{
      rule_id: 'null_rate_check',
      display_name: '空值率',
      status: nullRateStatus as RuleStatus,
      actual: nullRate,
      threshold: 0.01,
      operator: '<=',
      severity: 'WARN',
      evidence_ref: `ev_null_rate_real_${Date.now()}`,
      description: '关键字段空值率必须 <= 1%',
      unit: 'ratio',
      checked_at: now,
      source: 'sqlite_adapter',
    }],
    checked_at: now,
    data_cutoff: dataCutoff,
    block_reasons: [],
    warnings: nullRateStatus === 'WARN' ? [`null_rate_${(nullRate * 100).toFixed(2)}%`] : [],
  });

  // 5. Dependency order check
  const depCheck = checkDependencyOrder();
  const depStatus = depCheck.ok ? 'PASS' : 'BLOCK';
  
  gates.push({
    gate_id: 'gate_dependency',
    gate_type: 'dependency',
    status: depStatus as 'PASS' | 'BLOCK',
    rules: [{
      rule_id: 'dependency_order',
      display_name: '依赖顺序',
      status: depStatus as RuleStatus,
      actual: depCheck.ok ? 'correct' : 'violated',
      threshold: 'correct',
      operator: '==',
      severity: 'BLOCK',
      evidence_ref: `ev_dependency_real_${Date.now()}`,
      description: '上游节点必须全部完成',
      checked_at: now,
      source: 'sqlite_adapter',
    }],
    checked_at: now,
    data_cutoff: dataCutoff,
    block_reasons: depStatus === 'BLOCK' ? depCheck.violations : [],
    warnings: [],
  });

  if (depStatus === 'BLOCK') {
    gateStatus = 'BLOCK';
    warnings.push('dependency_order_violated');
  }

  // 6. Cutoff consistency check
  let cutoffStatus: 'PASS' | 'BLOCK' = 'PASS';
  let cutoffActual = dataCutoff;
  
  // Check if all tables have consistent cutoff dates
  const dates = new Set<string>();
  for (const table of ['daily_kline', 'adjustment_factors', 'factor_data', 'market_factors']) {
    const wm = getWatermark(table);
    if (wm.latestDate) {
      dates.add(wm.latestDate);
    }
  }
  
  if (dates.size > 1) {
    cutoffStatus = 'BLOCK';
    gateStatus = 'BLOCK';
    cutoffActual = 'inconsistent';
  }

  gates.push({
    gate_id: 'gate_cutoff',
    gate_type: 'cutoff',
    status: cutoffStatus,
    rules: [{
      rule_id: 'cutoff_check',
      display_name: '数据截止日一致性',
      status: cutoffStatus as RuleStatus,
      actual: cutoffActual,
      threshold: dataCutoff,
      operator: '==',
      severity: 'BLOCK',
      evidence_ref: `ev_cutoff_real_${Date.now()}`,
      description: '数据截止日必须一致',
      checked_at: now,
      source: 'sqlite_adapter',
    }],
    checked_at: now,
    data_cutoff: dataCutoff,
    block_reasons: cutoffStatus === 'BLOCK' ? ['cutoff_inconsistent'] : [],
    warnings: [],
  });

  return {
    data: {
      gates,
      summary: {
        total_gates: gates.length,
        pass_count: gates.filter((g) => g.status === 'PASS').length,
        warn_count: gates.filter((g) => g.status === 'WARN').length,
        block_count: gates.filter((g) => g.status === 'BLOCK').length,
        not_executed_count: gates.filter((g) => g.status === 'NOT_EXECUTED').length,
      },
    },
    warnings,
    gateStatus,
  };
}

export async function GET(request: NextRequest) {
  try {
    const isMock = isMockMode();
    const searchParams = request.nextUrl.searchParams;
    const runId = searchParams.get('run_id');

    let data: QualityGatesData;
    let warnings: string[] = [];
    let gateStatus: 'PASS' | 'WARN' | 'BLOCK' = 'PASS';

    if (isMock) {
      data = getMockQualityGatesData();
    } else {
      const result = await getRealQualityGatesData();
      data = result.data;
      warnings = result.warnings;
      gateStatus = result.gateStatus;
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
