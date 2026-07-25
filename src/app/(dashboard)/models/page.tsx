'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ErrorState } from '@/components/dashboard/error-state';

interface ModelVersion {
  version_id: string;
  model_type: string;
  created_at: string;
  performance_metrics: Record<string, number>;
  training_data_range: { start: string; end: string };
  status: string;
  risk_assessment: {
    max_drawdown: number;
    sharpe_ratio: number;
    win_rate: number;
  };
}

export default function ModelsPage() {
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (data.success) {
        setModels(data.data);
      } else {
        setError(data.error || '加载模型数据失败');
      }
    } catch (err) {
      setError(`请求失败: ${err instanceof Error ? err.message : '网络错误'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  if (loading) {
    return <div className="p-6"><div className="animate-pulse h-64 bg-gray-200 rounded" /></div>;
  }

  if (error && models.length === 0) {
    return (
      <div className="p-6">
        <ErrorState title="模型数据加载失败" message={error} onRetry={fetchModels} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">模型与信号</h1>
        <p className="text-sm text-gray-500 mt-1">模型版本与性能指标</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>模型版本列表 ({models.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {models.length === 0 ? (
            <p className="text-sm text-gray-500">暂无模型数据。请先运行场景生成模型版本。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>版本 ID</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>训练数据范围</TableHead>
                  <TableHead>最大回撤</TableHead>
                  <TableHead>夏普比率</TableHead>
                  <TableHead>胜率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map(model => (
                  <TableRow key={model.version_id}>
                    <TableCell className="font-mono text-xs">{model.version_id}</TableCell>
                    <TableCell className="text-xs">{model.model_type}</TableCell>
                    <TableCell>
                      <Badge className={model.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {model.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{new Date(model.created_at).toLocaleString('zh-CN')}</TableCell>
                    <TableCell className="text-xs">
                      {model.training_data_range.start} ~ {model.training_data_range.end}
                    </TableCell>
                    <TableCell>
                      <Badge className={Math.abs(model.risk_assessment.max_drawdown) > 0.2 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                        {(model.risk_assessment.max_drawdown * 100).toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>{model.risk_assessment.sharpe_ratio.toFixed(2)}</TableCell>
                    <TableCell>{(model.risk_assessment.win_rate * 100).toFixed(1)}%</TableCell>
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
