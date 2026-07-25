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
  daily_kline: '\u65E5\u7EBF\u66F4\u65B0',
  adjustment_factors: '\u590D\u6743\u56E0\u5B50',
  factor_data: '\u57FA\u7840\u56E0\u5B50',
  market_factors: '\u5E02\u573A\u56E0\u5B50',
  product_quality_gate: '\u8D28\u91CF\u95E8\u7981',
  candidate_signal: '\u5019\u9009\u4FE1\u53F7',
  risk_approval: '\u98CE\u63A7\u5BA1\u6279',
  release: '\u53D1\u5E03',
  post_release_observation: '\u53D1\u5E03\u89C2\u5BDF',
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
          <h1 className="text-2xl font-bold">DAG \u8FD0\u884C</h1>
          <p className="text-sm text-gray-500 mt-1">\u786E\u5B9A\u6027\u4EFB\u52A1\u4F9D\u8D56\u94FE\u4E0E\u6267\u884C\u72B6\u6001</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectedRun} onValueChange={setSelectedRun}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="\u9009\u62E9\u8FD0\u884C" />
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
            \u6267\u884C\u4E0B\u4E00\u6B65
          </Button>
        </div>
      </div>

      {runData ? (
        <>
          {/* DAG Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>\u4EFB\u52A1\u4F9D\u8D56\u94FE</CardTitle>
              <CardDescription>
                \u8FD0\u884C: {runData.run_id} | \u72B6\u6001: <Badge className={STATUS_COLORS[runData.status]}>{runData.status}</Badge>
                {runData.block_reason && <span className="text-red-600 ml-2">\u963B\u65AD: {runData.block_reason}</span>}
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
                            \u91CD\u8BD5
                          </Button>
                        )}
                      </div>
                      {idx < Object.keys(runData.tasks).length - 1 && (
                        <div className="text-gray-300 mx-1 text-lg">\u2192</div>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Task Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>\u4EFB\u52A1\u8BE6\u60C5</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>\u8282\u70B9</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>\u72B6\u6001</TableHead>
                    <TableHead>\u95E8\u7981</TableHead>
                    <TableHead>\u5C1D\u8BD5</TableHead>
                    <TableHead>\u8BC1\u636E</TableHead>
                    <TableHead>\u8B66\u544A/\u9519\u8BEF</TableHead>
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
                          <TableCell>{result?.evidence?.length || 0} \u6761</TableCell>
                          <TableCell>
                            {result?.warnings?.length ? <span className="text-yellow-600 text-xs">{result.warnings.length}\u8B66\u544A</span> : ''}
                            {result?.errors?.length ? <span className="text-red-600 text-xs ml-1">{result.errors.length}\u9519\u8BEF</span> : ''}
                            {(!result?.warnings?.length && !result?.errors?.length) ? '-' : ''}
                          </TableCell>
                          <TableCell>{result?.mock ? '\u2713' : '-'}</TableCell>
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
            \u6682\u65E0\u8FD0\u884C\u8BB0\u5F55\u3002\u8BF7\u5148\u5728\u603B\u89C8\u9875\u8FD0\u884C\u6F14\u793A\u573A\u666F\u3002
          </CardContent>
        </Card>
      )}
    </div>
  );
}
