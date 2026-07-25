'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorState } from '@/components/dashboard/error-state';
import { useRunContext } from '@/components/dashboard/run-context';

interface RunSummary {
  run_id: string;
  status: string;
  scenario: string | null;
  created_at: string;
  data_cutoff: string;
  current_node: string | null;
  block_reason: string | null;
  task_count: number;
  completed_count: number;
  failed_count: number;
  skipped_count: number;
}

interface HealthData {
  environment: string;
  mock_tools: boolean;
  production_write_enabled: boolean;
  production_model_enabled: boolean;
  production_release_enabled: boolean;
  message: string;
}

interface ApprovalItem {
  approval_id: string;
  run_id: string;
  task_id: string;
  approval_type: string;
  status: string;
  approver: string;
  risk_level: string;
  created_at: string;
  decided_at: string | null;
  opinion: string;
}

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-blue-100 text-blue-800',
  RUNNING: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  BLOCKED: 'bg-red-200 text-red-900',
  PAUSED: 'bg-gray-100 text-gray-800',
  WAITING_APPROVAL: 'bg-orange-100 text-orange-800',
  PASS: 'bg-green-100 text-green-800',
  WARN: 'bg-yellow-100 text-yellow-800',
  BLOCK: 'bg-red-100 text-red-800',
  NOT_EXECUTED: 'bg-gray-100 text-gray-500',
  PENDING: 'bg-blue-50 text-blue-700',
  SUCCEEDED: 'bg-green-100 text-green-800',
  SKIPPED_BY_GATE: 'bg-gray-200 text-gray-700',
};

export default function DashboardPage() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningScenario, setRunningScenario] = useState<string | null>(null);
  const { setCurrentRunId } = useRunContext();

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [runsRes, healthRes, approvalsRes] = await Promise.all([
        fetch('/api/runs'),
        fetch('/api/health'),
        fetch('/api/approvals'),
      ]);
      const runsData = await runsRes.json();
      const healthData = await healthRes.json();
      const approvalsData = await approvalsRes.json();

      if (runsData.success) setRuns(runsData.data);
      else setError('加载运行记录失败');
      if (healthData.success) setHealth(healthData.data);
      if (approvalsData.success) setApprovals(approvalsData.data);
    } catch (err) {
      setError(`数据加载失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const runScenario = async (scenarioId: string) => {
    setRunningScenario(scenarioId);
    try {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
        if (data.data?.run_id) {
          setCurrentRunId(data.data.run_id);
        }
      }
    } catch (err) {
      console.error('Failed to run scenario:', err);
    } finally {
      setRunningScenario(null);
    }
  };

  const selectRun = (runId: string) => {
    setCurrentRunId(runId);
  };

  const latestRun = runs[0];
  const pendingApprovals = approvals.filter(a => a.status === 'PENDING');

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error && runs.length === 0) {
    return (
      <div className="p-6">
        <ErrorState title="数据加载失败" message={error} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">运营总览</h1>
          <p className="text-sm text-gray-500 mt-1">金融数据与量化模型运营工作台</p>
        </div>
        <div className="flex gap-2">
          {['scenario_a', 'scenario_b', 'scenario_c'].map(id => (
            <Button
              key={id}
              size="sm"
              variant="outline"
              disabled={runningScenario !== null}
              onClick={() => runScenario(id)}
            >
              {runningScenario === id ? '运行中...' : id === 'scenario_a' ? '场景 A' : id === 'scenario_b' ? '场景 B' : '场景 C'}
            </Button>
          ))}
        </div>
      </div>

      {/* Simulation Warning */}
      <Alert className="border-amber-300 bg-amber-50">
        <AlertDescription className="text-amber-800 text-sm">
          {health?.message || '当前为模拟环境。真实生产写入、正式模型运行和正式信号发布均未启用。'}
        </AlertDescription>
      </Alert>

      {/* Status Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>环境状态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health?.environment === 'simulation' ? '模拟' : health?.environment}</div>
            <p className="text-xs text-gray-500 mt-1">Mock: {health?.mock_tools ? '开启' : '关闭'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>最新运行</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-mono font-bold truncate">
              {latestRun ? latestRun.run_id.slice(0, 16) : '无'}
            </div>
            <Badge className={STATUS_COLORS[latestRun?.status || ''] || 'bg-gray-100'}>
              {latestRun?.status || '无运行'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>待审批</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingApprovals.length}</div>
            <p className="text-xs text-gray-500 mt-1">需要人工处理</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>生产能力</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>写入:</span>
                <Badge variant={health?.production_write_enabled ? 'default' : 'secondary'} className="text-xs">
                  {health?.production_write_enabled ? '启用' : '禁用'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>模型:</span>
                <Badge variant={health?.production_model_enabled ? 'default' : 'secondary'} className="text-xs">
                  {health?.production_model_enabled ? '启用' : '禁用'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>发布:</span>
                <Badge variant={health?.production_release_enabled ? 'default' : 'secondary'} className="text-xs">
                  {health?.production_release_enabled ? '启用' : '禁用'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for details */}
      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">运行记录</TabsTrigger>
          <TabsTrigger value="gates">门禁状态</TabsTrigger>
          <TabsTrigger value="approvals">审批事项</TabsTrigger>
          <TabsTrigger value="scenarios">演示场景</TabsTrigger>
        </TabsList>

        <TabsContent value="runs">
          <Card>
            <CardHeader>
              <CardTitle>运行历史</CardTitle>
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <p className="text-sm text-gray-500">暂无运行记录。请运行演示场景。</p>
              ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">运行编号</TableHead>
                      <TableHead className="w-[100px]">状态</TableHead>
                      <TableHead className="w-[80px]">场景</TableHead>
                      <TableHead className="w-[100px]">截止日</TableHead>
                      <TableHead className="w-[120px]">任务进度</TableHead>
                      <TableHead className="min-w-[150px] max-w-[250px]">阻断原因</TableHead>
                      <TableHead className="w-[160px]">创建时间</TableHead>
                      <TableHead className="w-[80px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map(run => (
                      <TableRow key={run.run_id}>
                        <TableCell className="font-mono text-xs">{run.run_id}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[run.status] || 'bg-gray-100'}>{run.status}</Badge>
                        </TableCell>
                        <TableCell>{run.scenario || '-'}</TableCell>
                        <TableCell>{run.data_cutoff}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="text-green-600">{run.completed_count}</span>
                          /{run.task_count}
                          {run.failed_count > 0 && <span className="text-red-600 ml-1">({run.failed_count} 失败)</span>}
                          {run.skipped_count > 0 && <span className="text-gray-500 ml-1">({run.skipped_count} 跳过)</span>}
                        </TableCell>
                        <TableCell className="text-red-600 text-xs max-w-[250px] truncate" title={run.block_reason || ''}>{run.block_reason || '-'}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(run.created_at).toLocaleString('zh-CN')}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => selectRun(run.run_id)}>
                            <Link href={`/runs/${run.run_id}`} className="text-blue-600 hover:underline text-xs">
                              详情
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gates">
          <Card>
            <CardHeader>
              <CardTitle>门禁状态</CardTitle>
              <CardDescription>最新运行的门禁检查结果</CardDescription>
            </CardHeader>
            <CardContent>
              {latestRun ? (
                <GateStatusView runId={latestRun.run_id} />
              ) : (
                <p className="text-sm text-gray-500">暂无门禁数据</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>审批事项</CardTitle>
            </CardHeader>
            <CardContent>
              {approvals.length === 0 ? (
                <p className="text-sm text-gray-500">暂无审批记录</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>审批 ID</TableHead>
                      <TableHead>运行</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>风险等级</TableHead>
                      <TableHead>审批人</TableHead>
                      <TableHead>意见</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvals.map(a => (
                      <TableRow key={a.approval_id}>
                        <TableCell className="font-mono text-xs">{a.approval_id}</TableCell>
                        <TableCell className="font-mono text-xs">{a.run_id.slice(0, 16)}</TableCell>
                        <TableCell>{a.approval_type}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[a.status] || 'bg-gray-100'}>{a.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={a.risk_level === 'high' ? 'destructive' : 'secondary'}>{a.risk_level}</Badge>
                        </TableCell>
                        <TableCell>{a.approver || '-'}</TableCell>
                        <TableCell className="max-w-48 truncate text-xs">{a.opinion || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios">
          <Card>
            <CardHeader>
              <CardTitle>演示场景</CardTitle>
              <CardDescription>点击运行场景查看结果。每次运行产生新的 run_id。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ScenarioCard
                  id="scenario_a"
                  name="场景 A: 全部通过"
                  description="数据更新成功 → 质量门禁 PASS → 候选信号 → 风控批准 → 人工批准(自动) → 发布 → 观察 → COMPLETED"
                  onRun={() => runScenario('scenario_a')}
                  disabled={runningScenario !== null}
                  running={runningScenario === 'scenario_a'}
                />
                <ScenarioCard
                  id="scenario_b"
                  name="场景 B: 核心数据阻断"
                  description="复权因子缺口超阈值 → 质量 BLOCK → 下游全部 SKIPPED_BY_GATE (含审计事件)"
                  onRun={() => runScenario('scenario_b')}
                  disabled={runningScenario !== null}
                  running={runningScenario === 'scenario_b'}
                />
                <ScenarioCard
                  id="scenario_c"
                  name="场景 C: 模型警告"
                  description="数据门禁 PASS → 模型门禁 WARN → 停在人工审批 (未审批发布返回403)"
                  onRun={() => runScenario('scenario_c')}
                  disabled={runningScenario !== null}
                  running={runningScenario === 'scenario_c'}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GateStatusView({ runId }: { runId: string }) {
  const [gates, setGates] = useState<Record<string, unknown>>({});

  useEffect(() => {
    fetch(`/api/gates/${runId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setGates(data.data);
      })
      .catch(console.error);
  }, [runId]);

  const gateList = Object.values(gates) as Array<{
    gate_id: string;
    scope: string;
    status: string;
    rules: Array<{ rule_id: string; display_name: string; status: string; actual: unknown; threshold: unknown }>;
    block_reasons: string[];
    warnings: string[];
  }>;

  if (gateList.length === 0) {
    return <p className="text-sm text-gray-500">暂无门禁数据</p>;
  }

  return (
    <div className="space-y-4">
      {gateList.map(gate => (
        <div key={gate.gate_id} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">{gate.gate_id}</h3>
            <Badge className={STATUS_COLORS[gate.status] || 'bg-gray-100'}>{gate.status}</Badge>
          </div>
          <div className="space-y-2">
            {gate.rules.map(rule => (
              <div key={rule.rule_id} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2">
                <span>{rule.display_name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    实际: {String(rule.actual)} / 阈值: {String(rule.threshold)}
                  </span>
                  <Badge className={STATUS_COLORS[rule.status] || 'bg-gray-100'}>{rule.status}</Badge>
                </div>
              </div>
            ))}
          </div>
          {gate.block_reasons.length > 0 && (
            <div className="mt-2 text-sm text-red-600">
              阻断原因: {gate.block_reasons.join('; ')}
            </div>
          )}
          {gate.warnings.length > 0 && (
            <div className="mt-2 text-sm text-yellow-600">
              警告: {gate.warnings.join('; ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ScenarioCard({
  id,
  name,
  description,
  onRun,
  disabled,
  running,
}: {
  id: string;
  name: string;
  description: string;
  onRun: () => void;
  disabled: boolean;
  running: boolean;
}) {
  return (
    <div className="border rounded-lg p-4 flex items-center justify-between">
      <div>
        <h3 className="font-medium">{name}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <Button
        size="sm"
        onClick={onRun}
        disabled={disabled}
      >
        {running ? '运行中...' : '运行'}
      </Button>
    </div>
  );
}
