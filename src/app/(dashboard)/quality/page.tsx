'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ErrorState } from '@/components/dashboard/error-state';
import { useRunContext } from '@/components/dashboard/run-context';

interface SignalData {
  signal_id: string;
  run_id: string;
  task_id: string;
  version: string;
  signal_type: string;
  quality_score: number;
  data_freshness: string;
  risk_flags: string[];
  evidence_count: number;
  created_at: string;
}

export default function QualityPage() {
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<string>('all');
  const { currentRunId } = useRunContext();

  const fetchSignals = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/quality-signals');
      const data = await res.json();
      if (data.success) {
        setSignals(data.data);
      } else {
        setError(data.error || '加载质量信号失败');
      }
    } catch (err) {
      setError(`请求失败: ${err instanceof Error ? err.message : '网络错误'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSignals(); }, [fetchSignals]);

  // Sync with global run context
  useEffect(() => {
    if (currentRunId) {
      setSelectedRun(currentRunId);
    }
  }, [currentRunId]);

  const runIds = Array.from(new Set(signals.map(s => s.run_id)));
  const filteredSignals = selectedRun === 'all' ? signals : signals.filter(s => s.run_id === selectedRun);

  if (loading) {
    return <div className="p-6"><div className="animate-pulse h-64 bg-gray-200 rounded" /></div>;
  }

  if (error && signals.length === 0) {
    return (
      <div className="p-6">
        <ErrorState title="质量信号加载失败" message={error} onRetry={fetchSignals} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">数据质量</h1>
          <p className="text-sm text-gray-500 mt-1">质量信号绑定 run_id、task_id 和 evidence_id</p>
        </div>
        <Select value={selectedRun} onValueChange={setSelectedRun}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部运行</SelectItem>
            {runIds.map(id => (
              <SelectItem key={id} value={id}>{id.slice(0, 16)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>质量信号列表 ({filteredSignals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSignals.length === 0 ? (
            <p className="text-sm text-gray-500">暂无质量信号数据</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>信号 ID</TableHead>
                  <TableHead>运行</TableHead>
                  <TableHead>任务</TableHead>
                  <TableHead>版本</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>质量分</TableHead>
                  <TableHead>数据新鲜度</TableHead>
                  <TableHead>风险标记</TableHead>
                  <TableHead>证据数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSignals.map(signal => (
                  <TableRow key={signal.signal_id}>
                    <TableCell className="font-mono text-xs">{signal.signal_id}</TableCell>
                    <TableCell className="font-mono text-xs">{signal.run_id.slice(0, 16)}</TableCell>
                    <TableCell className="font-mono text-xs">{signal.task_id.slice(0, 16)}</TableCell>
                    <TableCell className="text-xs">{signal.version}</TableCell>
                    <TableCell className="text-xs">{signal.signal_type}</TableCell>
                    <TableCell>
                      <Badge className={signal.quality_score >= 80 ? 'bg-green-100 text-green-800' : signal.quality_score >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                        {signal.quality_score}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{signal.data_freshness}</TableCell>
                    <TableCell>
                      {signal.risk_flags.map((flag, i) => (
                        <Badge key={i} variant="destructive" className="mr-1 text-xs">{flag}</Badge>
                      ))}
                      {signal.risk_flags.length === 0 && <span className="text-green-600 text-xs">正常</span>}
                    </TableCell>
                    <TableCell>{signal.evidence_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
