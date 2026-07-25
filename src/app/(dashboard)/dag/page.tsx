'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RunData {
  run_id: string;
  status: string;
  scenario: string | null;
  tasks: Record<string, TaskData>;
  results: Record<string, ResultData>;
  gates: Record<string, GateData>;
  block_reason: string | null;
  current_node: string | null;
}

interface TaskData {
  task_id: string;
  dag_node: string;
  status: string;
  assigned_agent: string;
  attempt: number;
}

interface ResultData {
  task_id: string;
  status: string;
  gate_status: string;
  evidence: Array<{ evidence_id: string; type: string }>;
  warnings: string[];
  errors: string[];
  mock: boolean;
}

interface GateData {
  gate_id: string;
  status: string;
  rules: Array<{ rule_id: string; status: string }>;
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

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-blue-50 text-blue-700 border-blue-200',
  RUNNING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  SUCCEEDED: 'bg-green-50 text-green-700 border-green-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  BLOCKED: 'bg-red-100 text-red-800 border-red-300',
  SKIPPED_BY_GATE: 'bg-gray-100 text-gray-600 border-gray-200',
  WAITING_APPROVAL: 'bg-orange-50 text-orange-700 border-orange-200',
  PAUSED: 'bg-gray-50 text-gray-600 border-gray-200',
};

export default function DagPage() {
  const [runs, setRuns] = useState<Array<{ run_id: string; status: string; scenario: string | null }>>([]);
  const [selectedRun, setSelectedRun] = useState<string>('');
  const [runData, setRunData] = useState<RunData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRuns = useCallback(async () => {
    const res = await fetch('/api/runs');
    const data = await res.json();
    if (data.success) {
      setRuns(data.data);
      if (data.data.length > 0 && !selectedRun) {
        setSelectedRun(data.data[0].run_id);
      }
    }
    setLoading(false);
  }, [selectedRun]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    if (!selectedRun) return;
    fetch(`/api/runs/${selectedRun}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setRunData(data.data);
      })
      .catch(console.error);
  }, [selectedRun]);

  const executeNext = async () => {
    if (!selectedRun) return;
    const res = await fetch(`/api/runs/${selectedRun}/execute-next`, { method: 'POST' });
    const data = await res.json();
    // Refresh
    const runRes = await fetch(`/api/runs/${selectedRun}`);
    const runJson = await runRes.json();
    if (runJson.success) setRunData(runJson.data);
    await fetchRuns();
  };

  const retryTask = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}/retry`, { method: 'POST' });
    const runRes = await fetch(`/api/runs/${selectedRun}`);
    const runJson = await runRes.json();
    if (runJson.success) setRunData(runJson.data);
  };

  if (loading) {
    return <div className="p-6"><div className="animate-pulse h-64 bg-gray-200 rounded" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">DAG 运行</h1>
          <p className="text-sm text-gray-500 mt-1">确定性任务依赖链与执行状态</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectedRun} onValueChange={setSelectedRun}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="选择运行" />
            </SelectTrigger>
            <SelectContent>
              {runs.map(r => (
                <SelectItem key={r.run_id} value={r.run_id}>
                  {r.run_id.slice(0, 16)} ({r.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={executeNext} disabled={!selectedRun}>
            执行下一步
          </Button>
        </div>
      </div>

      {runData ? (
        <>
          {/* DAG Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>任务依赖链</CardTitle>
              <CardDescription>
                运行: {runData.run_id} | 状态: <Badge className={STATUS_COLORS[runData.status]}>{runData.status}</Badge>
                {runData.block_reason && <span className="text-red-600 ml-2">阻断: {runData.block_reason}</span>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {Object.entries(runData.tasks)
                  .sort(([, a], [, b]) => {
                    const order = ['daily_kline', 'adjustment_factors', 'factor_data', 'market_factors', 'product_quality_gate', 'candidate_signal', 'risk_approval', 'release', 'post_release_observation'];
                    return order.indexOf(a.dag_node) - order.indexOf(b.dag_node);
                  })
                  .map(([taskId, task], idx) => (
                    <div key={taskId} className="flex items-center">
                      <div className={`border-2 rounded-lg p-3 min-w-28 text-center ${STATUS_COLORS[task.status] || 'bg-gray-50'}`}>
                        <div className="text-xs font-medium">{NODE_LABELS[task.dag_node] || task.dag_node}</div>
                        <div className="text-xs mt-1 font-mono">{task.status}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{task.assigned_agent.replace('-agent', '')}</div>
                        {task.status === 'FAILED' && (
                          <Button size="sm" variant="outline" className="mt-1 text-xs h-5" onClick={() => retryTask(taskId)}>
                            重试
                          </Button>
                        )}
                      </div>
                      {idx < Object.keys(runData.tasks).length - 1 && (
                        <div className="text-gray-300 mx-1 text-lg">→</div>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Task Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>任务详情</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>节点</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>门禁</TableHead>
                    <TableHead>尝试</TableHead>
                    <TableHead>证据</TableHead>
                    <TableHead>警告/错误</TableHead>
                    <TableHead>Mock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(runData.tasks)
                    .sort(([, a], [, b]) => {
                      const order = ['daily_kline', 'adjustment_factors', 'factor_data', 'market_factors', 'product_quality_gate', 'candidate_signal', 'risk_approval', 'release', 'post_release_observation'];
                      return order.indexOf(a.dag_node) - order.indexOf(b.dag_node);
                    })
                    .map(([taskId, task]) => {
                      const result = runData.results[taskId];
                      return (
                        <TableRow key={taskId}>
                          <TableCell className="font-medium">{NODE_LABELS[task.dag_node] || task.dag_node}</TableCell>
                          <TableCell className="text-xs">{task.assigned_agent}</TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[task.status]}>{task.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {result ? <Badge className={STATUS_COLORS[result.gate_status]}>{result.gate_status}</Badge> : '-'}
                          </TableCell>
                          <TableCell>{task.attempt}</TableCell>
                          <TableCell>{result?.evidence?.length || 0} 条</TableCell>
                          <TableCell>
                            {result?.warnings?.length ? <span className="text-yellow-600 text-xs">{result.warnings.length}警告</span> : ''}
                            {result?.errors?.length ? <span className="text-red-600 text-xs ml-1">{result.errors.length}错误</span> : ''}
                            {(!result?.warnings?.length && !result?.errors?.length) ? '-' : ''}
                          </TableCell>
                          <TableCell>{result?.mock ? '✓' : '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            暂无运行记录。请先在总览页运行演示场景。
          </CardContent>
        </Card>
      )}
    </div>
  );
}
