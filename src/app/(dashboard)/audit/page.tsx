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
        <h1 className="text-2xl font-bold">\u5BA1\u8BA1\u65E5\u5FD7</h1>
        <p className="text-sm text-gray-500 mt-1">\u5B8C\u6574\u8BB0\u5F55\u6240\u6709\u8FD0\u884C\u3001\u5BA1\u6279\u3001\u5931\u8D25\u3001\u91CD\u8BD5\u548C\u53D1\u5E03\u52A8\u4F5C\u3002\u5BA1\u8BA1\u65E5\u5FD7\u4E0D\u53EF\u88AB Agent \u4FEE\u6539\u6216\u5220\u9664\u3002</p>
      </div>

      <div className="flex gap-2 items-center">
        <Input
          placeholder="\u641C\u7D22 actor\u3001action\u3001run_id..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" size="sm" onClick={() => setFilter('')}>\u6E05\u9664</Button>
        <span className="text-sm text-gray-500 ml-auto">\u5171 {filteredEvents.length} \u6761\u8BB0\u5F55</span>
      </div>

      <Card>
        <CardContent className="pt-4">
          {filteredEvents.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">\u6682\u65E0\u5BA1\u8BA1\u8BB0\u5F55</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>\u65F6\u95F4</TableHead>
                  <TableHead>\u64CD\u4F5C\u8005</TableHead>
                  <TableHead>\u52A8\u4F5C</TableHead>
                  <TableHead>\u8FD0\u884C</TableHead>
                  <TableHead>\u4EFB\u52A1</TableHead>
                  <TableHead>\u72B6\u6001\u53D8\u5316</TableHead>
                  <TableHead>\u8BE6\u60C5</TableHead>
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
                          {' \u2192 '}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
