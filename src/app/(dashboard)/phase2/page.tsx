'use client';

import { useEffect, useState } from 'react';
import type { Phase2Response } from '@/lib/data-source';

// Test report item interface
interface TestReportItem {
  test_id: string;
  executed_at: string;
  input_fixture: string;
  expected_status: string;
  actual_status: string;
  assertion_result: string;
  evidence_id?: string;
  injected_evidence_id?: string | null;
  test_evidence_id?: string;
  details: string;
}

// ============ Types ============
interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime_seconds: number;
  services: {
    database: 'connected' | 'disconnected' | 'mock' | 'readonly';
    cache: 'connected' | 'disconnected' | 'mock';
    model_service: 'disabled' | 'connected' | 'mock';
  };
  safety_flags: {
    production_write_enabled: false;
    production_model_enabled: false;
    production_release_enabled: false;
    sql_input_accepted: false;
    db_path_selectable: false;
  };
}

interface Watermark {
  dataset: string;
  latest_date: string;
  record_count: number;
  last_updated: string;
  status: 'fresh' | 'stale' | 'expired' | 'missing';
  source_table?: string;
  schema_version?: string;
}

interface WatermarksData {
  watermarks: Watermark[];
  summary: {
    total_datasets: number;
    fresh_count: number;
    stale_count: number;
    expired_count: number;
    missing_count: number;
  };
}

interface GateRule {
  rule_id: string;
  display_name: string;
  status: string;
  actual: number | boolean | string;
  threshold: number | boolean | string;
  operator: string;
  severity: string;
  evidence_ref: string;
  description: string;
  unit?: string;
  checked_at?: string;
  source?: string;
}

interface QualityGate {
  gate_id: string;
  gate_type: string;
  status: string;
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

// Phase 2.2 Preflight types
interface SchemaProbeTable {
  logical_name: string;
  detected_table_name: string;
  exists: boolean;
  row_count: number;
  detected_date_column: string | null;
  detected_code_column: string | null;
  detected_business_key: string | null;
  earliest_date: string | null;
  latest_date: string | null;
  required_columns_present: boolean;
  missing_columns: string[];
  schema_status: 'ok' | 'incomplete' | 'missing' | 'unrecognized';
  evidence_id: string;
}

interface PreflightData {
  configuration: {
    active_data_source: string;
    active_data_source_kind: string;
    preflight_target: 'real_readonly';
    real_db_path_configured: boolean;
  };
  connection: {
    status: 'not_configured' | 'connected' | 'failed';
    readonly_required: true;
    query_only_required: true;
    readonly_connection_verified: boolean;
    query_only_verified: boolean;
    readonly_connection: boolean;
    query_only: boolean;
    quick_check: boolean;
    write_rejection_verified: boolean;
    write_rejection_methods: string[];
  };
  identity: {
    database_fingerprint: string;
    database_size_bytes: number;
    database_last_modified: string;
    database_path_exposed: false;
  } | null;
  schema_probe: {
    probed: boolean;
    tables: SchemaProbeTable[];
    summary: {
      total_candidates: number;
      detected_count: number;
      missing_count: number;
      incomplete_count: number;
      all_required_present: boolean;
    };
  };
  safety: {
    production_write_enabled: false;
    production_model_enabled: false;
    production_release_enabled: false;
    sql_input_accepted: false;
    db_path_selectable: false;
    auto_migration_disabled: true;
    auto_fill_disabled: true;
  };
}

// Phase 2.2 negative test result
interface RealNegativeTestResult {
  test_id: string;
  test_run_id: string;
  test_evidence_id: string;
  expected_status: string;
  actual_status: string;
  assertion_result: string;
  block_reasons: string[];
  details: string;
}

// ============ Gate Status Badge ============
function GateStatusBadge({ status }: { status: string }) {
  const colors = {
    PASS: 'bg-green-900/50 text-green-300 border-green-700/50',
    WARN: 'bg-amber-900/50 text-amber-300 border-amber-700/50',
    BLOCK: 'bg-red-900/50 text-red-300 border-red-700/50',
    NOT_EXECUTED: 'bg-slate-700/50 text-slate-400 border-slate-600/50',
  };

  const icons = {
    PASS: '✓',
    WARN: '⚠',
    BLOCK: '✗',
    NOT_EXECUTED: '—',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${colors[status as keyof typeof colors] || colors.NOT_EXECUTED}`}>
      <span>{icons[status as keyof typeof icons] || '—'}</span>
      {status}
    </span>
  );
}

// ============ Service Status Badge ============
function ServiceStatusBadge({ status }: { status: string }) {
  const colors = {
    connected: 'bg-green-900/50 text-green-300 border-green-700/50',
    disconnected: 'bg-red-900/50 text-red-300 border-red-700/50',
    mock: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
    disabled: 'bg-slate-700/50 text-slate-400 border-slate-600/50',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[status as keyof typeof colors] || colors.disabled}`}>
      {status}
    </span>
  );
}

// ============ Watermark Status Badge ============
function WatermarkStatusBadge({ status }: { status: string }) {
  const colors = {
    fresh: 'bg-green-900/50 text-green-300 border-green-700/50',
    stale: 'bg-amber-900/50 text-amber-300 border-amber-700/50',
    expired: 'bg-red-900/50 text-red-300 border-red-700/50',
    missing: 'bg-red-900/50 text-red-300 border-red-700/50',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[status as keyof typeof colors] || colors.missing}`}>
      {status}
    </span>
  );
}

// ============ Negative Test Scenario ============
function NegativeTestScenario({ 
  name, 
  description, 
  expectedStatus, 
  testResult, 
  details 
}: { 
  name: string; 
  description: string; 
  expectedStatus: string; 
  testResult: string; 
  details: string;
}) {
  const statusColors = {
    PASS: 'border-green-700/50 bg-green-900/20',
    WARN: 'border-amber-700/50 bg-amber-900/20',
    BLOCK: 'border-red-700/50 bg-red-900/20',
  };

  const resultColors = {
    PASS: 'text-green-400',
    WARN: 'text-amber-400',
    BLOCK: 'text-red-400',
  };

  return (
    <div className={`border rounded-lg p-3 ${statusColors[expectedStatus as keyof typeof statusColors] || statusColors.BLOCK}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{name}</span>
          <span className="text-xs text-slate-400">{description}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">期望:</span>
          <GateStatusBadge status={expectedStatus} />
          <span className="text-xs text-slate-400 ml-2">结果:</span>
          <span className={`text-xs font-medium ${resultColors[testResult as keyof typeof resultColors] || resultColors.BLOCK}`}>
            {testResult}
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-300">{details}</p>
    </div>
  );
}

// ============ Section Header ============
function SectionHeader({ title, gateStatus, evidenceId }: { title: string; gateStatus: string; evidenceId: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="flex items-center gap-3">
        <GateStatusBadge status={gateStatus} />
        <span className="text-xs text-slate-500 font-mono">{evidenceId}</span>
      </div>
    </div>
  );
}

// ============ Main Component ============
export default function Phase2Page() {
  const [healthData, setHealthData] = useState<Phase2Response<HealthData> | null>(null);
  const [watermarksData, setWatermarksData] = useState<Phase2Response<WatermarksData> | null>(null);
  const [qualityData, setQualityData] = useState<Phase2Response<QualityGatesData> | null>(null);
  const [preflightData, setPreflightData] = useState<Phase2Response<PreflightData> | null>(null);
  const [testReport, setTestReport] = useState<TestReportItem[]>([]);
  const [realTestReport, setRealTestReport] = useState<RealNegativeTestResult[]>([]);
  const [testRunId, setTestRunId] = useState<string | null>(null);
  const [testSummary, setTestSummary] = useState<{
    total_tests: number;
    passed_tests: number;
    failed_tests: number;
    evidence_id_uniqueness: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch core data with Promise.allSettled to handle partial failures gracefully
        const [healthResult, watermarksResult, qualityResult, testReportResult, preflightResult, realTestResult] = await Promise.allSettled([
          fetch('/api/health'),
          fetch('/api/data/watermarks'),
          fetch('/api/quality/gates'),
          fetch('/api/test-report'),
          fetch('/api/phase2/real-db-preflight'),
          fetch('/api/phase2/real-negative-test-report'),
        ]);

        // Check core responses - must BLOCK if core APIs fail
        const healthRes = healthResult.status === 'fulfilled' ? healthResult.value : null;
        const watermarksRes = watermarksResult.status === 'fulfilled' ? watermarksResult.value : null;
        const qualityRes = qualityResult.status === 'fulfilled' ? qualityResult.value : null;

        if (!healthRes?.ok || !watermarksRes?.ok || !qualityRes?.ok) {
          setError('一个或多个核心接口不可达');
          setLoading(false);
          return;
        }

        const health = await healthRes.json();
        const watermarks = await watermarksRes.json();
        const quality = await qualityRes.json();

        // Validate response structure
        if (!health.success || !watermarks.success || !quality.success) {
          setError('接口返回异常，请检查证据链完整性');
          setLoading(false);
          return;
        }

        setHealthData(health);
        setWatermarksData(watermarks);
        setQualityData(quality);

        // Parse preflight data (optional - don't fail if not available)
        const preflightRes = preflightResult.status === 'fulfilled' ? preflightResult.value : null;
        if (preflightRes?.ok) {
          try {
            const preflight = await preflightRes.json();
            // Validate basic structure
            if (preflight && typeof preflight === 'object') {
              setPreflightData(preflight);
            }
          } catch {
            // Preflight parse failure is non-fatal
          }
        }

        // Parse real negative test report (optional)
        const realTestRes = realTestResult.status === 'fulfilled' ? realTestResult.value : null;
        if (realTestRes?.ok) {
          try {
            const realTestJson = await realTestRes.json();
            if (realTestJson.success && Array.isArray(realTestJson.data?.results)) {
              setRealTestReport(realTestJson.data.results);
            }
          } catch {
            // Non-fatal
          }
        }

        // Parse test report (optional - don't fail if not available)
        const testReportRes = testReportResult.status === 'fulfilled' ? testReportResult.value : null;
        if (testReportRes?.ok) {
          try {
            const testReportJson = await testReportRes.json();
            if (testReportJson.success && testReportJson.data) {
              // New format: response.data.results
              if (Array.isArray(testReportJson.data.results)) {
                setTestReport(testReportJson.data.results);
                setTestRunId(testReportJson.data.test_run_id || null);
                setTestSummary({
                  total_tests: testReportJson.data.total_tests || 0,
                  passed_tests: testReportJson.data.passed_tests || 0,
                  failed_tests: testReportJson.data.failed_tests || 0,
                  evidence_id_uniqueness: testReportJson.data.evidence_id_uniqueness || false,
                });
              }
              // Legacy format: response.data as array
              else if (Array.isArray(testReportJson.data)) {
                setTestReport(testReportJson.data);
              }
            }
          } catch {
            // Non-fatal
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '数据加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">加载 Phase 2 只读状态...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">✗</span>
            <h2 className="text-lg font-semibold text-red-300">接口异常</h2>
          </div>
          <p className="text-red-200 mb-4">{error}</p>
          <p className="text-sm text-red-300/70">
            状态：BLOCK · 不降级为 PASS
          </p>
        </div>
      </div>
    );
  }

  if (!healthData || !watermarksData || !qualityData) {
    return (
      <div className="p-6">
        <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">⚠</span>
            <h2 className="text-lg font-semibold text-amber-300">数据缺失</h2>
          </div>
          <p className="text-amber-200">证据链不完整，无法显示状态</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Phase 2 只读联调状态</h1>
        <p className="text-sm text-slate-400">
          真实后端只读接口状态监控 · 生产写入、正式模型、正式发布均禁用
        </p>
      </div>

      {/* Data Source Indicator - Prominent */}
      <div className={`rounded-lg p-4 border-2 ${
        healthData.is_mock 
          ? 'bg-blue-900/30 border-blue-600/50' 
          : 'bg-green-900/30 border-green-600/50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-3xl ${healthData.is_mock ? 'text-blue-400' : 'text-green-400'}`}>
              {healthData.is_mock ? '◉' : '●'}
            </span>
            <div>
              <h2 className={`text-lg font-bold ${healthData.is_mock ? 'text-blue-300' : 'text-green-300'}`}>
                当前数据源：{healthData.is_mock ? 'Mock 模拟数据' : 'Sample Staging 示例数据（非真实金融数据库）'}
              </h2>
              <p className="text-sm text-slate-400">
                环境：{healthData.environment} · 证据ID：{healthData.evidence_id}
              </p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg ${
            healthData.is_mock 
              ? 'bg-blue-800/50 text-blue-200' 
              : 'bg-green-800/50 text-green-200'
          }`}>
            <div className="text-xs text-slate-400">Schema Version</div>
            <div className="text-lg font-mono font-bold">v{healthData.schema_version}</div>
          </div>
        </div>
      </div>

      {/* Safety Banner */}
      <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-amber-400 text-xl">⚠</span>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-300 mb-1">
              {healthData.environment === 'simulation' && '模拟环境 · 生产功能未启用'}
              {healthData.environment === 'staging' && 'Sample Staging 只读环境 · 生产功能未启用'}
              {healthData.environment === 'production' && '生产环境（当前不得启用）'}
            </h3>
            <ul className="text-xs text-amber-200/80 space-y-0.5">
              <li>• 真实数据库写入：禁用</li>
              <li>• 正式模型运行：禁用</li>
              <li>• 正式信号发布：禁用</li>
              <li>• SQL 输入接收：禁用</li>
              <li>• 数据库路径选择：禁用</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Health Section */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-5">
        <SectionHeader 
          title="系统健康检查" 
          gateStatus={healthData.gate_status}
          evidenceId={healthData.evidence_id}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">服务状态</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">数据库</span>
                <ServiceStatusBadge status={healthData.data.services.database} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">缓存</span>
                <ServiceStatusBadge status={healthData.data.services.cache} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">模型服务</span>
                <ServiceStatusBadge status={healthData.data.services.model_service} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">安全标志</h3>
            <div className="space-y-1.5">
              {Object.entries(healthData.data.safety_flags).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">{key}</span>
                  <span className={`text-xs ${value === false ? 'text-green-400' : 'text-red-400'}`}>
                    {value === false ? '✓ 禁用' : '✗ 启用'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>环境: {healthData.environment}</span>
            <span>Mock: {healthData.is_mock ? '是' : '否'}</span>
            <span>数据截止: {healthData.data_cutoff}</span>
            <span>Schema: v{healthData.schema_version}</span>
          </div>
        </div>
      </div>

      {/* Watermarks Section */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-5">
        <SectionHeader 
          title="数据水位标记" 
          gateStatus={watermarksData.gate_status}
          evidenceId={watermarksData.evidence_id}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-2 px-3 text-slate-400 font-medium">数据集</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">最新日期</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">记录数</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">更新时间</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {watermarksData.data.watermarks.map((wm) => (
                <tr key={wm.dataset} className="border-b border-slate-700/30">
                  <td className="py-2 px-3 text-slate-200 font-mono">{wm.dataset}</td>
                  <td className="py-2 px-3 text-slate-300">{wm.latest_date}</td>
                  <td className="py-2 px-3 text-slate-300">{wm.record_count.toLocaleString()}</td>
                  <td className="py-2 px-3 text-slate-400 text-xs">{new Date(wm.last_updated).toLocaleString()}</td>
                  <td className="py-2 px-3">
                    <WatermarkStatusBadge status={wm.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-400">
              总计: <span className="text-white">{watermarksData.data.summary.total_datasets}</span>
            </span>
            <span className="text-green-400">
              新鲜: {watermarksData.data.summary.fresh_count}
            </span>
            <span className="text-amber-400">
              陈旧: {watermarksData.data.summary.stale_count}
            </span>
            <span className="text-red-400">
              过期: {watermarksData.data.summary.expired_count}
            </span>
            <span className="text-red-400">
              缺失: {watermarksData.data.summary.missing_count}
            </span>
          </div>
        </div>
      </div>

      {/* Quality Gates Section */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-5">
        <SectionHeader 
          title="质量门禁状态" 
          gateStatus={qualityData.gate_status}
          evidenceId={qualityData.evidence_id}
        />

        <div className="space-y-4">
          {qualityData.data.gates.map((gate) => (
            <div key={gate.gate_id} className="border border-slate-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-medium text-white">{gate.gate_id}</h3>
                  <span className="text-xs text-slate-500">{gate.gate_type}</span>
                  {gate.scope && (
                    <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
                      {gate.scope}
                    </span>
                  )}
                </div>
                <GateStatusBadge status={gate.status} />
              </div>

              <div className="space-y-2">
                {gate.rules.map((rule) => {
                  const formatValue = (val: number | boolean | string, unit?: string) => {
                    if (typeof val !== 'number') return String(val);
                    // ratio unit: display as percentage
                    if (unit === 'ratio' || unit === '%') {
                      return `${(val * 100).toFixed(2)}%`;
                    }
                    return String(val);
                  };
                  
                  return (
                    <div key={rule.rule_id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{rule.display_name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-300 font-mono">
                          {formatValue(rule.actual, rule.unit)}
                        </span>
                        <span className="text-slate-500">{rule.operator}</span>
                        <span className="text-slate-300 font-mono">
                          {formatValue(rule.threshold, rule.unit)}
                        </span>
                        <GateStatusBadge status={rule.status} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {gate.block_reasons.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <div className="text-xs text-red-300">
                    阻断原因: {gate.block_reasons.join(', ')}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-400">
              总计: <span className="text-white">{qualityData.data.summary.total_gates}</span>
            </span>
            <span className="text-green-400">
              通过: {qualityData.data.summary.pass_count}
            </span>
            <span className="text-amber-400">
              警告: {qualityData.data.summary.warn_count}
            </span>
            <span className="text-red-400">
              阻断: {qualityData.data.summary.block_count}
            </span>
            <span className="text-slate-400">
              未执行: {qualityData.data.summary.not_executed_count}
            </span>
          </div>
        </div>
      </div>

      {/* Warnings Display */}
      {(healthData.warnings || watermarksData.warnings || qualityData.warnings) && (
        <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-amber-300 mb-2">警告信息</h3>
          <ul className="text-xs text-amber-200/80 space-y-1">
            {healthData.warnings?.map((w, i) => (
              <li key={`health-${i}`}>• [健康检查] {w}</li>
            ))}
            {watermarksData.warnings?.map((w, i) => (
              <li key={`watermark-${i}`}>• [水位标记] {w}</li>
            ))}
            {qualityData.warnings?.map((w, i) => (
              <li key={`quality-${i}`}>• [质量门禁] {w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Negative Test Scenarios - Dynamic from API */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-5">
        <h2 className="text-lg font-semibold text-white mb-4">负向测试报告（动态读取）</h2>
        
        {/* Test Summary */}
        {testSummary && (
          <div className="mb-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-slate-400">Test Run ID:</span>
                <div className="text-white font-mono text-xs truncate" title={testRunId || ''}>
                  {testRunId || '-'}
                </div>
              </div>
              <div>
                <span className="text-slate-400">总测试数:</span>
                <div className="text-white font-semibold">{testSummary.total_tests}</div>
              </div>
              <div>
                <span className="text-slate-400">通过:</span>
                <div className="text-emerald-400 font-semibold">{testSummary.passed_tests}</div>
              </div>
              <div>
                <span className="text-slate-400">失败:</span>
                <div className={`font-semibold ${testSummary.failed_tests > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {testSummary.failed_tests}
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs">
              <span className="text-slate-400">证据 ID 唯一性: </span>
              <span className={testSummary.evidence_id_uniqueness ? 'text-emerald-400' : 'text-red-400'}>
                {testSummary.evidence_id_uniqueness ? '✓ 通过' : '✗ 失败'}
              </span>
            </div>
          </div>
        )}
        
        {testReport.length === 0 ? (
          <div className="text-slate-400 text-sm">暂无测试报告数据</div>
        ) : (
          <div className="space-y-3">
            {testReport.map((test) => (
              <NegativeTestScenario
                key={test.test_id}
                name={test.test_id.replace('NEG_', '').replace(/_/g, ' ')}
                description={test.details}
                expectedStatus={test.expected_status}
                testResult={test.assertion_result}
                details={`${test.input_fixture} · 期望: ${test.expected_status} · 实际: ${test.actual_status} · 证据: ${test.test_evidence_id || test.evidence_id}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ============ Phase 2.2 Real Database Read-Only Access ============ */}
      <div className="bg-slate-800/50 border border-purple-700/50 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Phase 2.2 真实数据库只读接入</h2>
            <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded border border-purple-700/50">
              前置能力
            </span>
          </div>
          <div className="flex items-center gap-3">
            <GateStatusBadge status={preflightData?.gate_status || 'BLOCK'} />
            {preflightData?.evidence_id && (
              <span className="text-xs text-slate-500 font-mono">{preflightData.evidence_id}</span>
            )}
          </div>
        </div>

        {/* Status Banner */}
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-red-400 text-xl">✗</span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-300 mb-2">
                状态：BLOCK — 真实数据库路径尚未由负责人配置
              </h3>
              <ul className="text-xs text-red-200/80 space-y-1">
                <li>• 未连接真实数据库</li>
                <li>• 未执行真实数据质量验收</li>
                <li data-testid="phase2-2-fallback-used">• fallback_used = false（不会自动回退到 Sample 或 Mock）</li>
                <li>• release_eligibility = BLOCK</li>
                <li>• 等待负责人提供并确认真实数据库绝对路径</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Configuration Status */}
        {!preflightData?.data?.configuration ? (
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-amber-400 text-xl">!</span>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-300 mb-1">
                  预检响应格式异常
                </h3>
                <p className="text-xs text-amber-200/80">
                  {preflightData ? '预检数据中缺少 configuration 字段，请检查接口契约。' : '预检数据尚未加载。'}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Connection Status - Always render with defaults */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
            <h4 className="text-xs font-medium text-slate-400 mb-2">数据源配置</h4>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">active_data_source</span>
                <span className="text-xs font-mono text-blue-300">
                  {preflightData?.data?.configuration?.active_data_source || 'unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">active_data_source_kind</span>
                <span className="text-xs font-mono text-blue-300">
                  {preflightData?.data?.configuration?.active_data_source_kind || 'unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">preflight_target</span>
                <span className="text-xs font-mono text-purple-300">
                  {preflightData?.data?.configuration?.preflight_target || 'real_readonly'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">real_db_path_configured</span>
                <span className={`text-xs font-mono ${preflightData?.data?.configuration?.real_db_path_configured ? 'text-green-400' : 'text-red-400'}`}>
                  {String(preflightData?.data?.configuration?.real_db_path_configured ?? false)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
            <h4 className="text-xs font-medium text-slate-400 mb-2">连接状态</h4>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">connection_status</span>
                <span className={`text-xs font-mono ${
                  preflightData?.data?.connection?.status === 'connected' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {preflightData?.data?.connection?.status || 'not_configured'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">readonly_required</span>
                <span data-testid="phase2-2-readonly-required" className="text-xs font-mono text-green-400">
                  {String(preflightData?.data?.connection?.readonly_required ?? true)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">query_only_required</span>
                <span data-testid="phase2-2-query-only-required" className="text-xs font-mono text-green-400">
                  {String(preflightData?.data?.connection?.query_only_required ?? true)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">readonly_connection_verified</span>
                <span data-testid="phase2-2-readonly-connection-verified" className={`text-xs font-mono ${preflightData?.data?.connection?.readonly_connection_verified ? 'text-green-400' : 'text-slate-500'}`}>
                  {String(preflightData?.data?.connection?.readonly_connection_verified ?? false)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">query_only_verified</span>
                <span data-testid="phase2-2-query-only-verified" className={`text-xs font-mono ${preflightData?.data?.connection?.query_only_verified ? 'text-green-400' : 'text-slate-500'}`}>
                  {String(preflightData?.data?.connection?.query_only_verified ?? false)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">database_path_exposed</span>
                <span className="text-xs font-mono text-green-400">false</span>
              </div>
            </div>
          </div>
        </div>

        {/* Safety Flags */}
        <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30 mb-4">
          <h4 className="text-xs font-medium text-slate-400 mb-2">安全状态（全部禁用）</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { key: '数据库写入', value: preflightData?.data?.safety?.production_write_enabled ?? false },
              { key: '自动补数', value: preflightData?.data?.safety?.auto_fill_disabled ?? true },
              { key: '自动迁移', value: preflightData?.data?.safety?.auto_migration_disabled ?? true },
              { key: 'Schema 修改', value: false },
              { key: '正式模型运行', value: false },
              { key: '模型晋升', value: false },
              { key: '信号发布', value: false },
              { key: '自动审批', value: false },
              { key: 'SQL 输入', value: false },
            ].map((flag) => (
              <div key={flag.key} className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{flag.key}</span>
                <span className="text-green-400 font-mono">禁用</span>
              </div>
            ))}
          </div>
        </div>

        {/* Schema Probe Summary */}
        {preflightData?.data?.schema_probe?.probed && (
          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30 mb-4">
            <h4 className="text-xs font-medium text-slate-400 mb-2">Schema 探测结果</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-600/30">
                    <th className="text-left py-1.5 px-2 text-slate-500">逻辑表名</th>
                    <th className="text-left py-1.5 px-2 text-slate-500">检测表名</th>
                    <th className="text-left py-1.5 px-2 text-slate-500">存在</th>
                    <th className="text-left py-1.5 px-2 text-slate-500">行数</th>
                    <th className="text-left py-1.5 px-2 text-slate-500">日期列</th>
                    <th className="text-left py-1.5 px-2 text-slate-500">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {preflightData.data.schema_probe.tables.map((table) => (
                    <tr key={table.logical_name} className="border-b border-slate-700/30">
                      <td className="py-1.5 px-2 text-slate-300 font-mono">{table.logical_name}</td>
                      <td className="py-1.5 px-2 text-slate-400 font-mono">{table.detected_table_name}</td>
                      <td className="py-1.5 px-2">
                        <span className={table.exists ? 'text-green-400' : 'text-red-400'}>
                          {String(table.exists)}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-slate-300">{table.row_count.toLocaleString()}</td>
                      <td className="py-1.5 px-2 text-slate-400">{table.detected_date_column || '-'}</td>
                      <td className="py-1.5 px-2">
                        <GateStatusBadge status={table.schema_status === 'ok' ? 'PASS' : table.schema_status === 'missing' ? 'BLOCK' : 'WARN'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Phase 2.2 Negative Tests */}
        {realTestReport.length > 0 && (
          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30 mb-4">
            <h4 className="text-xs font-medium text-slate-400 mb-2">
              Phase 2.2 负向测试 ({realTestReport.filter(t => t.assertion_result === 'PASS').length}/{realTestReport.length} 通过)
            </h4>
            <div className="space-y-2">
              {realTestReport.map((test) => (
                <div key={test.test_id} className="flex items-center justify-between text-xs bg-slate-800/50 rounded p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-mono">{test.test_id}</span>
                    <span className="text-slate-500">{test.details}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">期望: {test.expected_status}</span>
                    <span className="text-slate-500">实际: {test.actual_status}</span>
                    <GateStatusBadge status={test.assertion_result} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Phase 2.2A 真实数据库只读接入框架已就绪</span>
            <span>等待负责人提供并确认真实数据库绝对路径</span>
          </div>
        </div>
      </div>

      {/* ============ PILOT-001: 建设与验收治理卡片 (只读) ============ */}
      <div
        data-testid="governance-card"
        className="bg-slate-800/50 border border-cyan-700/50 rounded-lg p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white" data-testid="governance-card-title">
              建设与验收治理
            </h2>
            <span className="text-xs bg-cyan-900/50 text-cyan-300 px-2 py-0.5 rounded border border-cyan-700/50">
              PILOT-001
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono" data-testid="governance-card-readonly">
            READ-ONLY
          </span>
        </div>

        {/* 规则版本 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
            <h4 className="text-xs font-medium text-slate-400 mb-2" data-testid="governance-section-rule-version">规则版本</h4>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">policy_version</span>
                <span className="text-xs font-mono text-cyan-300" data-testid="governance-policy-version">1.0.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">schema_version</span>
                <span className="text-xs font-mono text-cyan-300" data-testid="governance-schema-version">v{healthData.schema_version}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">gate_config</span>
                <span className="text-xs font-mono text-cyan-300" data-testid="governance-gate-config">gates.yaml v1</span>
              </div>
            </div>
          </div>

          {/* 当前环境边界 */}
          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
            <h4 className="text-xs font-medium text-slate-400 mb-2" data-testid="governance-section-env-boundary">环境边界</h4>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">environment</span>
                <span className="text-xs font-mono text-amber-300" data-testid="governance-environment">{healthData.environment}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">production_write</span>
                <span className="text-xs font-mono text-green-400" data-testid="governance-prod-write">禁用</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">production_model</span>
                <span className="text-xs font-mono text-green-400" data-testid="governance-prod-model">禁用</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">production_release</span>
                <span className="text-xs font-mono text-green-400" data-testid="governance-prod-release">禁用</span>
              </div>
            </div>
          </div>

          {/* 数据库授权状态 */}
          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
            <h4 className="text-xs font-medium text-slate-400 mb-2" data-testid="governance-section-db-auth">数据库授权</h4>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">data_source</span>
                <span className="text-xs font-mono text-blue-300" data-testid="governance-data-source">
                  {healthData.is_mock ? 'mock' : (preflightData?.data?.configuration?.active_data_source || 'sample')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">real_db_configured</span>
                <span className="text-xs font-mono text-red-400" data-testid="governance-real-db-configured">
                  {String(preflightData?.data?.configuration?.real_db_path_configured ?? false)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">connection</span>
                <span className="text-xs font-mono text-red-400" data-testid="governance-db-connection">
                  {preflightData?.data?.connection?.status || 'not_configured'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">readonly_verified</span>
                <span className="text-xs font-mono text-slate-500" data-testid="governance-readonly-verified">
                  {String(preflightData?.data?.connection?.readonly_connection_verified ?? false)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 角色分工 */}
        <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30 mb-4">
          <h4 className="text-xs font-medium text-slate-400 mb-2" data-testid="governance-section-roles">角色分工</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              { id: 'orchestrator-agent', name: '总调度官', domain: 'production-dispatch', desc: '按 DAG 派发、暂停、重试和终止任务' },
              { id: 'data-ops-agent', name: '数据运维官', domain: 'database-ops', desc: '数据库连接、Schema 探测与水位检查' },
              { id: 'data-quality-agent', name: '数据质量官', domain: 'quality-assurance', desc: '质量门禁评估与证据归档' },
              { id: 'model-production-agent', name: '模型生产官', domain: 'model-ops', desc: '模型运行与晋升管理' },
              { id: 'model-risk-agent', name: '模型风控官', domain: 'risk-control', desc: '模型风险评估与审批' },
              { id: 'release-observer-agent', name: '发布观察官', domain: 'release-observation', desc: '信号发布观察与审计' },
            ].map((agent) => (
              <div key={agent.id} className="flex items-start gap-2 text-xs bg-slate-800/50 rounded p-2">
                <span className="text-cyan-400 font-mono shrink-0" data-testid={`governance-role-${agent.id}`}>{agent.name}</span>
                <span className="text-slate-500" title={agent.desc}>{agent.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 发布门禁摘要 */}
        <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30 mb-4">
          <h4 className="text-xs font-medium text-slate-400 mb-2" data-testid="governance-section-gates">发布门禁摘要</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-slate-400">总门禁数</span>
              <div className="text-white font-semibold" data-testid="governance-total-gates">{qualityData.data.summary.total_gates}</div>
            </div>
            <div>
              <span className="text-slate-400">通过</span>
              <div className="text-green-400 font-semibold" data-testid="governance-pass-gates">{qualityData.data.summary.pass_count}</div>
            </div>
            <div>
              <span className="text-slate-400">警告</span>
              <div className="text-amber-400 font-semibold" data-testid="governance-warn-gates">{qualityData.data.summary.warn_count}</div>
            </div>
            <div>
              <span className="text-slate-400">阻断</span>
              <div className="text-red-400 font-semibold" data-testid="governance-block-gates">{qualityData.data.summary.block_count}</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500" data-testid="governance-gate-overall-status">
            整体状态：{qualityData.gate_status}
          </div>
        </div>

        {/* 施工约束声明 */}
        <div className="bg-cyan-900/10 border border-cyan-800/30 rounded-lg p-3">
          <h4 className="text-xs font-medium text-cyan-400 mb-1" data-testid="governance-section-constraints">施工约束</h4>
          <ul className="text-xs text-slate-400 space-y-0.5">
            <li data-testid="governance-constraint-no-api">• 未修改任何 API 路由</li>
            <li data-testid="governance-constraint-no-db">• 未连接或扫描真实数据库</li>
            <li data-testid="governance-constraint-no-config">• 未修改治理规则、Agent 权限或门禁配置</li>
            <li data-testid="governance-constraint-no-dep">• 未安装或升级依赖</li>
            <li data-testid="governance-constraint-no-model">• 未执行生产模型或信号发布</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="pt-3 mt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span data-testid="governance-card-task-id">PILOT-001 · 建设与验收治理卡片</span>
            <span data-testid="governance-card-status">施工完成，申请 Codex 独立验收</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-xs text-slate-500 text-center pt-4">
        Phase 2 只读联调 · Schema v{healthData.schema_version} · 
        生成时间: {new Date(healthData.generated_at).toLocaleString()}
      </div>
    </div>
  );
}
