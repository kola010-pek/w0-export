'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorState } from '@/components/dashboard/error-state';
import Link from 'next/link';

interface RunDetail {
  run_id: string;
  status: string;
  scenario: string | null;
  tasks: Record<string, TaskData>;
  results: Record<string, ResultData>;
  gates: Record<string, GateData>;
  block_reason: string | null;
  current_node: string | null;
  created_at: string;
  updated_at: string;
  mock_mode?: boolean;
}

interface TaskData {
  task_id: string;
  dag_node: string;
  status: string;
  assigned_agent: string;
  attempt: number;
  input_snapshot_id?: string;
}

interface ResultData {
  task_id: string;
  status: string;
  gate_status: string;
  evidence: Array<{ evidence_id: string; type: string; ref: string; summary?: string }>;
  warnings: string[];
  errors: string[];
  mock: boolean;
  output?: Record<string, unknown>;
}

interface GateData {
  gate_id: string;
  status: string;
  rules: Array<{
    rule_id: string;
    status: string;
    details?: string;
    metric?: string;
    actual_value?: number;
    threshold?: number;
    compare?: string;
    unit?: string;
    data_range?: { start: string; end: string };
    cutoff_date?: string;
    rule_version?: string;
    checked_at?: string;
    source?: string;
    evidence_id?: string;
  }>;
}

interface AuditEvent {
  event_id: string;
  timestamp: string;
  actor: string;
  action: string;
  run_id: string | null;
  task_id: string | null;
  status_before: string | null;
  status_after: string | null;
  details: string;
}

const NODE_LABELS: Record<string, string> = {
  daily_kline: '日线更新',
  adjustment_factors: '复权因子',
  factor_data: '基础因子',
  market_factors: '市场因子',
  product_quality_gate: '质量门禁',
  candidate_signal: '候选信号',
  risk_approval: '风控审批',
  release: '发布',
  post_release_observation: '发布观察',
};

const NODE_ORDER = ['daily_kline', 'adjustment_factors', 'factor_data', 'market_factors', 'product_quality_gate', 'candidate_signal', 'risk_approval', 'release', 'post_release_observation'];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-blue-50 text-blue-700 border-blue-200',
  RUNNING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  SUCCEEDED: 'bg-green-50 text-green-700 border-green-200',
  MOCK_SUCCEEDED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  BLOCKED: 'bg-red-100 text-red-800 border-red-300',
  SKIPPED_BY_GATE: 'bg-gray-100 text-gray-600 border-gray-200',
  WAITING_APPROVAL: 'bg-orange-50 text-orange-700 border-orange-200',
  PAUSED: 'bg-gray-50 text-gray-600 border-gray-200',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
};

// Helper to get display status - show MOCK_SUCCEEDED for mock runs
const getDisplayStatus = (status: string, mockMode: boolean): string => {
  if (status === 'SUCCEEDED' && mockMode) return 'MOCK_SUCCEEDED';
  return status;
};

const getDisplayStatusText = (status: string, mockMode: boolean): string => {
  if (status === 'SUCCEEDED' && mockMode) return '模拟执行成功';
  if (status === 'NOT_EXECUTED') return '生产门禁未执行';
  return status;
};

const GATE_COLORS: Record<string, string> = {
  PASSED: 'bg-green-100 text-green-800',
  BLOCKED: 'bg-red-100 text-red-800',
  NEEDS_REVIEW: 'bg-yellow-100 text-yellow-800',
  PENDING: 'bg-gray-100 text-gray-600',
};

export default function RunDetailPage() {
  const params = useParams();
  const runId = params.run_id as string;
  const [run, setRun] = useState<RunDetail | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [runRes, auditRes] = await Promise.all([
        fetch(`/api/runs/${runId}`),
        fetch(`/api/audit-events?run_id=${runId}`),
      ]);
      const runJson = await runRes.json();
      const auditJson = await auditRes.json();

      if (runJson.success) {
        setRun(runJson.data);
      } else {
        setError('加载运行详情失败');
      }
      if (auditJson.success) {
        setAuditEvents(auditJson.data);
      }
    } catch (err) {
      setError(`请求失败: ${err instanceof Error ? err.message : '网络错误'}`);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="p-6"><div className="animate-pulse h-64 bg-gray-200 rounded" /></div>;
  }

  if (error || !run) {
    return (
      <div className="p-6">
        <ErrorState title="运行详情加载失败" message={error || '未找到运行记录'} onRetry={fetchData} />
      </div>
    );
  }

  const sortedTasks = Object.entries(run.tasks)
    .sort(([, a], [, b]) => NODE_ORDER.indexOf(a.dag_node) - NODE_ORDER.indexOf(b.dag_node));

  const skippedCount = sortedTasks.filter(([, t]) => t.status === 'SKIPPED_BY_GATE').length;
  const successCount = sortedTasks.filter(([, t]) => t.status === 'SUCCEEDED').length;
  const failedCount = sortedTasks.filter(([, t]) => t.status === 'FAILED').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/dag" className="text-sm text-blue-600 hover:underline">← DAG 运行</Link>
          </div>
          <h1 className="text-2xl font-bold mt-2">运行详情</h1>
          <p className="text-sm text-gray-500 mt-1 font-mono">{run.run_id}</p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge className={`text-lg px-3 py-1 ${STATUS_COLORS[run.status] || 'bg-gray-100'}`}>
            {run.status}
          </Badge>
          {run.scenario && <Badge variant="outline">{run.scenario}</Badge>}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{sortedTasks.length}</div>
            <p className="text-xs text-gray-500">总节点数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{successCount}</div>
            <p className="text-xs text-gray-500">成功</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
            <p className="text-xs text-gray-500">失败</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-500">{skippedCount}</div>
            <p className="text-xs text-gray-500">被门禁跳过</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{auditEvents.length}</div>
            <p className="text-xs text-gray-500">审计事件</p>
          </CardContent>
        </Card>
      </div>

      {run.block_reason && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-red-600">BLOCKED</Badge>
              <span className="font-medium text-red-800">{run.block_reason}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="nodes">
        <TabsList>
          <TabsTrigger value="nodes">9 个 DAG 节点</TabsTrigger>
          <TabsTrigger value="gates">门禁评估</TabsTrigger>
          <TabsTrigger value="audit">审计事件序列</TabsTrigger>
        </TabsList>

        {/* DAG Nodes Tab */}
        <TabsContent value="nodes" className="space-y-4">
          {/* DAG Flow Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>任务依赖链</CardTitle>
              <CardDescription>9 个 DAG 节点的执行流程与状态</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {sortedTasks.map(([taskId, task], idx) => {
                  const displayStatus = getDisplayStatus(task.status, run.mock_mode ?? false);
                  const displayText = getDisplayStatusText(task.status, run.mock_mode ?? false);
                  return (
                    <div key={taskId} className="flex items-center">
                      <div className={`border-2 rounded-lg p-3 min-w-28 text-center ${STATUS_COLORS[displayStatus] || STATUS_COLORS[task.status] || 'bg-gray-50'}`}>
                        <div className="text-xs font-medium">{NODE_LABELS[task.dag_node] || task.dag_node}</div>
                        <div className="text-xs mt-1 font-mono font-bold" title={task.status}>{displayText}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{task.assigned_agent.replace('-agent', '')}</div>
                      </div>
                      {idx < sortedTasks.length - 1 && (
                        <div className="text-gray-300 mx-1 text-lg">→</div>
                      )}
                    </div>
                  );
                })}
              </div>
              {run.mock_mode && (
                <p className="text-xs text-amber-600 mt-2">* 当前为模拟环境，所有任务均为 Mock 执行，非真实生产数据</p>
              )}
            </CardContent>
          </Card>

          {/* Detailed Node Table */}
          <Card>
            <CardHeader>
              <CardTitle>节点详细信息</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>序号</TableHead>
                    <TableHead>节点</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>门禁</TableHead>
                    <TableHead>尝试</TableHead>
                    <TableHead>证据</TableHead>
                    <TableHead>输出摘要</TableHead>
                    <TableHead>Mock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTasks.map(([taskId, task], idx) => {
                    const result = run.results[taskId];
                    return (
                      <TableRow key={taskId}>
                        <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{NODE_LABELS[task.dag_node] || task.dag_node}</TableCell>
                        <TableCell className="text-xs">{task.assigned_agent}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[task.status]}>{task.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {result ? <Badge className={GATE_COLORS[result.gate_status]}>{result.gate_status}</Badge> : '-'}
                        </TableCell>
                        <TableCell>{task.attempt}</TableCell>
                        <TableCell>
                          {result?.evidence?.length ? (
                            <div className="text-xs">
                              {result.evidence.map(e => (
                                <div key={e.evidence_id} className="font-mono">{e.evidence_id.slice(0, 16)} ({e.type})</div>
                              ))}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs max-w-48 truncate">
                          {result?.output ? JSON.stringify(result.output).slice(0, 80) : '-'}
                        </TableCell>
                        <TableCell>{result?.mock ? '✓' : '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gates Tab */}
        <TabsContent value="gates">
          <Card>
            <CardHeader>
              <CardTitle>门禁评估结果</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(run.gates).length === 0 ? (
                <p className="text-sm text-gray-500">暂无门禁评估记录</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(run.gates).map(([gateId, gate]) => (
                    <div key={gateId} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm">{gateId}</span>
                        <Badge className={GATE_COLORS[gate.status]}>{gate.status}</Badge>
                      </div>
                      <div className="space-y-3">
                        {gate.rules.map(rule => (
                          <div key={rule.rule_id} className="border-l-4 border-gray-200 pl-4 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm font-medium">{rule.metric || rule.rule_id}</span>
                              <Badge className={GATE_COLORS[rule.status]}>{rule.status}</Badge>
                              {rule.evidence_id && (
                                <span className="text-xs text-gray-400 font-mono">evidence: {rule.evidence_id}</span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              <div>
                                <span className="text-gray-500">实际值:</span>{' '}
                                <span className="font-mono">{rule.actual_value ?? '-'}</span>
                                {rule.unit && <span className="text-gray-400 ml-1">{rule.unit}</span>}
                              </div>
                              <div>
                                <span className="text-gray-500">阈值:</span>{' '}
                                <span className="font-mono">{rule.threshold ?? '-'}</span>
                                {rule.compare && <span className="text-gray-400 ml-1">({rule.compare})</span>}
                              </div>
                              <div>
                                <span className="text-gray-500">截止日:</span>{' '}
                                <span className="font-mono">{rule.cutoff_date || '-'}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">规则版本:</span>{' '}
                                <span className="font-mono">{rule.rule_version || '-'}</span>
                              </div>
                            </div>
                            {rule.data_range && (
                              <div className="text-xs text-gray-500 mt-1">
                                <span>数据范围:</span>{' '}
                                <span className="font-mono">{rule.data_range.start} ~ {rule.data_range.end}</span>
                              </div>
                            )}
                            {rule.checked_at && (
                              <div className="text-xs text-gray-400 mt-1">
                                检查时间: {new Date(rule.checked_at).toLocaleString('zh-CN')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Events Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>不可变审计事件序列 ({auditEvents.length})</CardTitle>
              <CardDescription>按时间顺序记录的所有操作，不可被修改或删除</CardDescription>
            </CardHeader>
            <CardContent>
              {auditEvents.length === 0 ? (
                <p className="text-sm text-gray-500">暂无审计事件</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>序号</TableHead>
                      <TableHead>时间</TableHead>
                      <TableHead>操作者</TableHead>
                      <TableHead>动作</TableHead>
                      <TableHead>任务</TableHead>
                      <TableHead>状态变化</TableHead>
                      <TableHead>详情</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditEvents.map((event, idx) => (
                      <TableRow key={event.event_id}>
                        <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(event.timestamp).toLocaleString('zh-CN')}
                        </TableCell>
                        <TableCell className="font-medium text-xs">{event.actor}</TableCell>
                        <TableCell>
                          <Badge className="bg-gray-100 text-gray-800">{event.action}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {event.task_id ? event.task_id.slice(0, 20) : '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {event.status_before && event.status_after ? (
                            <span>
                              {event.status_before} → {event.status_after}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500 max-w-64 truncate" title={event.details}>
                          {event.details}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
