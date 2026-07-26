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
    database: 'connected' | 'disconnected' | 'mock';
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
  const [testReport, setTestReport] = useState<TestReportItem[]>([]);
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

        const [healthRes, watermarksRes, qualityRes, testReportRes] = await Promise.all([
          fetch('/api/health'),
          fetch('/api/data/watermarks'),
          fetch('/api/quality/gates'),
          fetch('/api/test-report'),
        ]);

        // Check if any response is not OK - must BLOCK, never degrade
        if (!healthRes.ok || !watermarksRes.ok || !qualityRes.ok) {
          setError('一个或多个接口不可达');
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

        // Parse test report (optional - don't fail if not available)
        if (testReportRes.ok) {
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

      {/* Footer Info */}
      <div className="text-xs text-slate-500 text-center pt-4">
        Phase 2 只读联调 · Schema v{healthData.schema_version} · 
        生成时间: {new Date(healthData.generated_at).toLocaleString()}
      </div>
    </div>
  );
}
