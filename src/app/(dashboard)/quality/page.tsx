'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface GateData {
  gate_id: string;
  scope: string;
  status: string;
  checked_at: string;
  data_cutoff: string;
  rules: Array<{
    rule_id: string;
    display_name: string;
    status: string;
    actual: unknown;
    threshold: unknown;
    operator: string;
    severity: string;
    evidence_ref: string;
    description: string;
  }>;
  block_reasons: string[];
  warnings: string[];
}

const STATUS_COLORS: Record<string, string> = {
  PASS: 'bg-green-100 text-green-800',
  WARN: 'bg-yellow-100 text-yellow-800',
  BLOCK: 'bg-red-100 text-red-800',
  NOT_EXECUTED: 'bg-gray-100 text-gray-500',
};

export default function QualityPage() {
  const [runs, setRuns] = useState<Array<{ run_id: string; status: string }>>([]);
  const [selectedRun, setSelectedRun] = useState<string>('');
  const [gates, setGates] = useState<Record<string, GateData>>({});

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
    fetch(`/api/gates/${selectedRun}`)
      .then(r => r.json())
      .then(data => { if (data.success) setGates(data.data); })
      .catch(console.error);
  }, [selectedRun]);

  const downloadEvidence = () => {
    const evidenceData = JSON.stringify(gates, null, 2);
    const blob = new Blob([evidenceData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quality_evidence_${selectedRun}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">数据质量</h1>
          <p className="text-sm text-gray-500 mt-1">覆盖率、新鲜度、唯一性、空值、依赖顺序检查结果</p>
        </div>
        <div className="flex gap-2 items-center">
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
          <Button size="sm" variant="outline" onClick={downloadEvidence} disabled={Object.keys(gates).length === 0}>
            下载证据
          </Button>
        </div>
      </div>

      {Object.keys(gates).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            暂无质量检查数据。请先运行场景。
          </CardContent>
        </Card>
      ) : (
        Object.values(gates).map(gate => (
          <Card key={gate.gate_id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{gate.gate_id}</CardTitle>
                  <CardDescription>
                    检查时间: {gate.checked_at ? new Date(gate.checked_at).toLocaleString('zh-CN') : '-'} | 数据截止: {gate.data_cutoff}
                  </CardDescription>
                </div>
                <Badge className={`${STATUS_COLORS[gate.status]} text-sm px-3 py-1`}>{gate.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rules Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>规则</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>实际值</TableHead>
                    <TableHead>阈值</TableHead>
                    <TableHead>操作符</TableHead>
                    <TableHead>严重级</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gate.rules.map(rule => (
                    <TableRow key={rule.rule_id}>
                      <TableCell className="font-medium text-sm">{rule.display_name}</TableCell>
                      <TableCell className="text-xs text-gray-500">{rule.description}</TableCell>
                      <TableCell className="font-mono text-sm">{String(rule.actual)}</TableCell>
                      <TableCell className="font-mono text-sm">{String(rule.threshold)}</TableCell>
                      <TableCell className="font-mono text-sm">{rule.operator}</TableCell>
                      <TableCell>
                        <Badge variant={rule.severity === 'BLOCK' ? 'destructive' : 'secondary'} className="text-xs">
                          {rule.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_COLORS[rule.status]} text-xs`}>{rule.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Block Reasons */}
              {gate.block_reasons.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm font-medium text-red-800">阻断原因:</p>
                  <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                    {gate.block_reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {gate.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm font-medium text-yellow-800">警告:</p>
                  <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                    {gate.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              {/* NOT_EXECUTED Warning */}
              {gate.status === 'NOT_EXECUTED' && (
                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                  <p className="text-sm font-medium text-gray-700">
                    NOT_EXECUTED: 检查未实际执行，不能视为 PASS
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
