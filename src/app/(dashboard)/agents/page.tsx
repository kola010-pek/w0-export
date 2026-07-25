'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AgentInfo {
  agent_id: string;
  display_name: string;
  domain: string;
  role: string;
  goal: string;
  allowed_tools: string[];
  forbidden_actions: string[];
  status: string;
}

const DOMAIN_LABELS: Record<string, string> = {
  'production-dispatch': '\u751F\u4EA7\u8C03\u5EA6\u57DF',
  'data-operations': '\u6570\u636E\u8FD0\u7EF4\u57DF',
  'quality-assurance': '\u8D28\u91CF\u4FDD\u969C\u57DF',
  'model-production': '\u6A21\u578B\u751F\u4EA7\u57DF',
  'risk-control': '\u98CE\u63A7\u57DF',
  'release-management': '\u53D1\u5E03\u7BA1\u7406\u57DF',
  'research': '\u7814\u7A76\u57DF',
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => {
        if (data.success) setAgents(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-6"><div className="animate-pulse h-64 bg-gray-200 rounded" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agent \u5C97\u4F4D</h1>
        <p className="text-sm text-gray-500 mt-1">\u4E03\u4E2A\u5C97\u4F4D Agent \u7684\u8EAB\u4EFD\u3001\u6743\u9650\u548C\u72B6\u6001</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {agents.map(agent => (
          <Card key={agent.agent_id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{agent.display_name}</CardTitle>
                <Badge variant="outline">{DOMAIN_LABELS[agent.domain] || agent.domain}</Badge>
              </div>
              <CardDescription className="font-mono text-xs">{agent.agent_id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">\u89D2\u8272</p>
                <p className="text-sm mt-0.5">{agent.role}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">\u76EE\u6807</p>
                <p className="text-sm mt-0.5">{agent.goal}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-green-600 uppercase mb-1">\u5141\u8BB8\u5DE5\u5177 ({agent.allowed_tools.length})</p>
                <div className="flex flex-wrap gap-1">
                  {agent.allowed_tools.map(tool => (
                    <Badge key={tool} variant="secondary" className="text-xs font-mono">{tool}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-red-600 uppercase mb-1">\u7981\u6B62\u52A8\u4F5C ({agent.forbidden_actions.length})</p>
                <div className="flex flex-wrap gap-1">
                  {agent.forbidden_actions.map(action => (
                    <Badge key={action} variant="destructive" className="text-xs font-mono opacity-75">{action}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t">
                <span className="text-xs text-gray-500">\u72B6\u6001:</span>
                <Badge className="bg-blue-100 text-blue-800">{agent.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>\u6743\u9650\u77E9\u9635</CardTitle>
          <CardDescription>\u5404 Agent \u5DE5\u5177\u8BBF\u95EE\u6743\u9650\u77E9\u9635\uFF08\u7EFF=\u5141\u8BB8\uFF0C\u7EA2=\u7981\u6B62\uFF09</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>\u5141\u8BB8\u5DE5\u5177\u6570</TableHead>
                  <TableHead>\u7981\u6B62\u52A8\u4F5C\u6570</TableHead>
                  <TableHead>\u6240\u5C5E\u57DF</TableHead>
                  <TableHead>\u9700\u5BA1\u6279</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map(agent => (
                  <TableRow key={agent.agent_id}>
                    <TableCell className="font-medium">{agent.display_name}</TableCell>
                    <TableCell><span className="text-green-600 font-bold">{agent.allowed_tools.length}</span></TableCell>
                    <TableCell><span className="text-red-600 font-bold">{agent.forbidden_actions.length}</span></TableCell>
                    <TableCell>{DOMAIN_LABELS[agent.domain] || agent.domain}</TableCell>
                    <TableCell>
                      <Badge variant={agent.agent_id === 'release-observer-agent' ? 'default' : 'secondary'}>
                        {agent.agent_id === 'release-observer-agent' ? '\u662F' : '\u5426'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
