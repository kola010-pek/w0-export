'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AuditEvent {
  event_id: string;
  timestamp: string;
  actor: string;
  action: string;
  run_id: string | null;
  task_id: string | null;
  input_summary: Record<string, unknown>;
  output_summary: Record<string, unknown>;
  status_before: string | null;
  status_after: string | null;
  details: string;
}

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch('/api/audit-events')
      .then(r => r.json())
      .then(data => {
        if (data.success) setEvents(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredEvents = filter
    ? events.filter(e =>
        e.actor.toLowerCase().includes(filter.toLowerCase()) ||
        e.action.toLowerCase().includes(filter.toLowerCase()) ||
        e.details.toLowerCase().includes(filter.toLowerCase()) ||
        (e.run_id && e.run_id.includes(filter))
      )
    : events;

  const ACTION_COLORS: Record<string, string> = {
    create_run: 'bg-blue-100 text-blue-800',
    execute_task: 'bg-yellow-100 text-yellow-800',
    task_completed: 'bg-green-100 text-green-800',
    pause_run: 'bg-gray-100 text-gray-800',
    retry_task: 'bg-orange-100 text-orange-800',
    submit_approval: 'bg-purple-100 text-purple-800',
  };

  if (loading) {
    return <div className="p-6"><div className="animate-pulse h-64 bg-gray-200 rounded" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">审计日志</h1>
        <p className="text-sm text-gray-500 mt-1">完整记录所有运行、审批、失败、重试和发布动作。审计日志不可被 Agent 修改或删除。</p>
      </div>

      <div className="flex gap-2 items-center">
        <Input
          placeholder="搜索 actor、action、run_id..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" size="sm" onClick={() => setFilter('')}>清除</Button>
        <span className="text-sm text-gray-500 ml-auto">共 {filteredEvents.length} 条记录</span>
      </div>

      <Card>
        <CardContent className="pt-4">
          {filteredEvents.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">暂无审计记录</p>
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
                    <TableCell className="font-medium text-sm">{event.actor}</TableCell>
                    <TableCell>
                      <Badge className={ACTION_COLORS[event.action] || 'bg-gray-100 text-gray-800'}>
                        {event.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {event.run_id ? event.run_id.slice(0, 16) : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {event.task_id ? event.task_id.slice(0, 20) : '-'}
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
                    <TableCell className="text-xs text-gray-500 max-w-64 truncate">
                      {event.details}
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
