'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RunData {
  run_id: string;
  tasks: Record<string, { task_id: string; dag_node: string; status: string }>;
  results: Record<string, {
    task_id: string;
    status: string;
    gate_status: string;
    input_versions: Record<string, string>;
    output_versions: Record<string, string>;
    evidence: Array<{ evidence_id: string; type: string; data: Record<string, unknown> }>;
    mock: boolean;
  }>;
}

const SIGNAL_STAGES = [
  { key: 'research_candidate', label: '研究候选', color: 'bg-purple-100 text-purple-800' },
  { key: 'registered_candidate', label: '已登记候选', color: 'bg-blue-100 text-blue-800' },
  { key: 'production_candidate', label: '生产候选', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'approved', label: '已审批', color: 'bg-green-100 text-green-800' },
  { key: 'released', label: '已发布', color: 'bg-emerald-100 text-emerald-800' },
];

export default function ModelsPage() {
  const [runs, setRuns] = useState<Array<{ run_id: string; status: string }>>([]);
  const [selectedRun, setSelectedRun] = useState<string>('');
  const [runData, setRunData] = useState<RunData | null>(null);

  const fetchRuns = useCallback(async () => {
    const res = await fetch('/api/runs');
    const data = await res.json();
    if (data.success) {
      setRuns(data.data);
      if (data.data.length > 0 && !selectedRun) {
        setSelectedRun(data.data[0].run_id);
      }
    }
  }, [selectedRun]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  useEffect(() => {
    if (!selectedRun) return;
    fetch(`/api/runs/${selectedRun}`)
      .then(r => r.json())
      .then(data => { if (data.success) setRunData(data.data); })
      .catch(console.error);
  }, [selectedRun]);

  // Extract signal-related info from results
  const modelResults = runData ? Object.entries(runData.results).filter(([_, r]) =>
    r.input_versions?.model || r.output_versions?.candidate_signal || r.output_versions?.release
  ) : [];

  const candidateSignalTask = runData ? Object.entries(runData.tasks).find(([_, t]) => t.dag_node === 'candidate_signal') : null;
  const releaseTask = runData ? Object.entries(runData.tasks).find(([_, t]) => t.dag_node === 'release') : null;

  // Determine signal stage
  const getSignalStage = () => {
    if (!runData) return null;
    if (releaseTask && releaseTask[1].status === 'SUCCEEDED') return 'released';
    if (candidateSignalTask && candidateSignalTask[1].status === 'SUCCEEDED') {
      const approvalTask = Object.values(runData.tasks).find(t => t.dag_node === 'risk_approval');
      if (approvalTask?.status === 'SUCCEEDED') return 'approved';
      return 'production_candidate';
    }
    return null;
  };

  const currentStage = getSignalStage();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">模型与信号</h1>
          <p className="text-sm text-gray-500 mt-1">严格区分研究候选、生产候选、已审批和已发布信号</p>
        </div>
        <Select value={selectedRun} onValueChange={setSelectedRun}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="选择运行" />
          </SelectTrigger>
          <SelectContent>
            {runs.map(r => (
              <SelectItem key={r.run_id} value={r.run_id}>{r.run_id.slice(0, 16)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Signal Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>信号生命周期</CardTitle>
          <CardDescription>从研究候选到正式发布的严格流程</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {SIGNAL_STAGES.map((stage, idx) => (
              <div key={stage.key} className="flex items-center">
                <div className={`px-4 py-2 rounded border-2 text-sm font-medium ${
                  currentStage === stage.key
                    ? `${stage.color} border-current`
                    : 'bg-gray-50 text-gray-400 border-gray-200'
                }`}>
                  {stage.label}
                </div>
                {idx < SIGNAL_STAGES.length - 1 && (
                  <div className="text-gray-300 mx-1">→</div>
                )}
              </div>
            ))}
          </div>
          {currentStage && (
            <p className="text-sm text-gray-500 mt-3">
              当前信号状态: <Badge className={SIGNAL_STAGES.find(s => s.key === currentStage)?.color}>{currentStage}</Badge>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Model Results */}
      <Card>
        <CardHeader>
          <CardTitle>模型运行结果</CardTitle>
        </CardHeader>
        <CardContent>
          {modelResults.length === 0 ? (
            <p className="text-sm text-gray-500">暂无模型运行结果。请先运行场景。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>任务</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>模型版本</TableHead>
                  <TableHead>输入快照</TableHead>
                  <TableHead>输出版本</TableHead>
                  <TableHead>证据</TableHead>
                  <TableHead>Mock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelResults.map(([taskId, result]) => {
                  const task = runData?.tasks[taskId];
                  return (
                    <TableRow key={taskId}>
                      <TableCell className="font-medium">{task?.dag_node || taskId}</TableCell>
                      <TableCell><Badge className={result.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{result.status}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{result.input_versions?.model || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{result.input_versions?.data_snapshot || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{result.output_versions?.candidate_signal || result.output_versions?.release || '-'}</TableCell>
                      <TableCell>{result.evidence?.length || 0} 条</TableCell>
                      <TableCell>{result.mock ? '✓' : '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Evidence Details */}
      {modelResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>证据详情</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {modelResults.map(([taskId, result]) => (
                result.evidence?.map((ev, idx) => (
                  <div key={`${taskId}-${idx}`} className="border rounded p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{ev.type}</span>
                      <span className="text-xs font-mono text-gray-400">{ev.evidence_id}</span>
                    </div>
                    <pre className="text-xs text-gray-600 overflow-x-auto">
                      {JSON.stringify(ev.data, null, 2)}
                    </pre>
                  </div>
                ))
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
