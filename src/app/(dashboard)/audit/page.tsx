'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ErrorState } from '@/components/dashboard/error-state';
import { useRunContext } from '@/components/dashboard/run-context';
import { Copy } from 'lucide-react';

interface AuditEvent {
  event_id: string;
  timestamp: string;
  actor: string;
  action: string;
  run_id: string | null;
  task_id: string | null;
  approval_id?: string | null;
  evidence_id?: string | null;
  input_summary: Record<string, unknown>;
  output_summary: Record<string, unknown>;
  status_before: string | null;
  status_after: string | null;
  gate_changes?: Array<{ gate: string; from: string; to: string }>;
  details: string;
}

const ACTION_COLORS: Record<string, string> = {
  create_run: 'bg-blue-100 text-blue-800',
  execute_task: 'bg-yellow-100 text-yellow-800',
  task_completed: 'bg-green-100 text-green-800',
  skip_by_gate: 'bg-gray-200 text-gray-800',
  pause_run: 'bg-gray-100 text-gray-800',
  retry_task: 'bg-orange-100 text-orange-800',
  submit_approval: 'bg-purple-100 text-purple-800',
  publish_rejected: 'bg-red-100 text-red-800',
};

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRunId, setFilterRunId] = useState('');
  const [filterAgentId, setFilterAgentId] = useState('');
  const [filterTaskId, setFilterTaskId] = useState('');
  const [filterText, setFilterText] = useState('');
  const { currentRunId } = useRunContext();

  // Initialize filter with global run_id
  useEffect(() => {
    if (currentRunId && !filterRunId) {
      setFilterRunId(currentRunId);
    }
  }, [currentRunId, filterRunId]);

  const fetchEvents = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterRunId) params.set('run_id', filterRunId);
      if (filterAgentId) params.set('agent_id', filterAgentId);
      if (filterTaskId) params.set('task_id', filterTaskId);

      const url = params.toString() ? `/api/audit-events?${params}` : '/api/audit-events';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setEvents(data.data);
      } else {
        setError(data.error || '加载审计事件失败');
      }
    } catch (err) {
      setError(`请求失败: ${err instanceof Error ? err.message : '网络错误'}`);
    } finally {
      setLoading(false);
    }
  }, [filterRunId, filterAgentId, filterTaskId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Client-side text filter
  const filteredEvents = filterText
    ? events.filter(e =>
        e.actor.toLowerCase().includes(filterText.toLowerCase()) ||
        e.action.toLowerCase().includes(filterText.toLowerCase()) ||
        e.details.toLowerCase().includes(filterText.toLowerCase()) ||
        (e.run_id && e.run_id.includes(filterText)) ||
        (e.task_id && e.task_id.includes(filterText))
      )
    : events;

  const clearFilters = () => {
    setFilterRunId('');
    setFilterAgentId('');
    setFilterTaskId('');
    setFilterText('');
  };

  const hasActiveFilters = filterRunId || filterAgentId || filterTaskId || filterText;

  if (loading) {
    return <div className="p-6"><div className="animate-pulse h-64 bg-gray-200 rounded" /></div>;
  }

  if (error && events.length === 0) {
    return (
      <div className="p-6">
        <ErrorState title="审计日志加载失败" message={error} onRetry={fetchEvents} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">审计日志</h1>
        <p className="text-sm text-gray-500 mt-1">不可变事件序列 — 完整记录所有运行、审批、失败、重试和发布动作。审计日志不可被 Agent 修改或删除。</p>
      </div>

      {/* Structured Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">运行 ID</label>
              <Input
                placeholder="run_xxx..."
                value={filterRunId}
                onChange={e => setFilterRunId(e.target.value)}
                className="w-48 h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Agent ID</label>
              <Select value={filterAgentId} onValueChange={setFilterAgentId}>
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue placeholder="全部 Agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部 Agent</SelectItem>
                  <SelectItem value="orchestrator-agent">总调度官</SelectItem>
                  <SelectItem value="data-ops-agent">数据运维</SelectItem>
                  <SelectItem value="data-quality-agent">数据质量</SelectItem>
                  <SelectItem value="model-production-agent">模型生产</SelectItem>
                  <SelectItem value="model-risk-agent">模型风控</SelectItem>
                  <SelectItem value="release-observer-agent">发布观察</SelectItem>
                  <SelectItem value="research-agent">研究</SelectItem>
                  <SelectItem value="system">系统</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">任务 ID</label>
              <Input
                placeholder="task_xxx..."
                value={filterTaskId}
                onChange={e => setFilterTaskId(e.target.value)}
                className="w-48 h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">关键词搜索</label>
              <Input
                placeholder="搜索 action、details..."
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                className="w-48 h-8 text-xs"
              />
            </div>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>清除筛选</Button>
              )}
              <span className="text-sm text-gray-500 self-center ml-2">共 {filteredEvents.length} 条记录</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          {filteredEvents.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              {hasActiveFilters ? '没有匹配的审计记录' : '暂无审计记录'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px] whitespace-nowrap">时间</TableHead>
                    <TableHead className="w-[140px]">操作者</TableHead>
                    <TableHead className="w-[120px]">动作</TableHead>
                    <TableHead className="w-[130px]">运行</TableHead>
                    <TableHead className="w-[160px]">任务</TableHead>
                    <TableHead className="w-[140px]">状态变化</TableHead>
                    <TableHead className="min-w-[200px]">详情</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map(event => (
                    <TableRow key={event.event_id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(event.timestamp).toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell className="font-medium">{event.actor}</TableCell>
                      <TableCell>
                        <Badge className={ACTION_COLORS[event.action] || 'bg-gray-100 text-gray-800'}>
                          {event.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {event.run_id ? (
                          <div className="flex items-center gap-1 group">
                            <span className="truncate max-w-[120px]" title={event.run_id}>{event.run_id}</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(event.run_id!)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                              title="复制"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {event.task_id ? (
                          <div className="flex items-center gap-1 group">
                            <span className="truncate max-w-[140px]" title={event.task_id}>{event.task_id}</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(event.task_id!)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                              title="复制"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {event.status_before && event.status_after ? (
                          <span>
                            <Badge variant="outline" className="text-xs">{event.status_before}</Badge>
                            {' → '}
                            <Badge variant="outline" className="text-xs">{event.status_after}</Badge>
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500 max-w-64">
                        <div className="space-y-1">
                          <div className="truncate" title={event.details}>{event.details}</div>
                          {event.evidence_id && (
                            <div className="flex items-center gap-1 text-gray-400">
                              <span className="truncate">证据: {event.evidence_id}</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(event.evidence_id!)}
                                className="flex-shrink-0 hover:text-blue-600"
                                title="复制证据ID"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          {event.approval_id && (
                            <div className="flex items-center gap-1 text-gray-400">
                              <span className="truncate">审批: {event.approval_id}</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(event.approval_id!)}
                                className="flex-shrink-0 hover:text-blue-600"
                                title="复制审批ID"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
