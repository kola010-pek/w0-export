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
  'production-dispatch': '生产调度域',
  'data-operations': '数据运维域',
  'quality-assurance': '质量保障域',
  'model-production': '模型生产域',
  'risk-control': '风控域',
  'release-management': '发布管理域',
  'research': '研究域',
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
        <h1 className="text-2xl font-bold">Agent 岗位</h1>
        <p className="text-sm text-gray-500 mt-1">七个岗位 Agent 的身份、权限和状态</p>
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
                <p className="text-xs font-medium text-gray-500 uppercase">角色</p>
                <p className="text-sm mt-0.5">{agent.role}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">目标</p>
                <p className="text-sm mt-0.5">{agent.goal}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-green-600 uppercase mb-1">允许工具 ({agent.allowed_tools.length})</p>
                <div className="flex flex-wrap gap-1">
                  {agent.allowed_tools.map(tool => (
                    <Badge key={tool} variant="secondary" className="text-xs font-mono">{tool}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-red-600 uppercase mb-1">禁止动作 ({agent.forbidden_actions.length})</p>
                <div className="flex flex-wrap gap-1">
                  {agent.forbidden_actions.map(action => (
                    <Badge key={action} variant="destructive" className="text-xs font-mono opacity-75">{action}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t">
                <span className="text-xs text-gray-500">状态:</span>
                <Badge className="bg-blue-100 text-blue-800">{agent.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>权限矩阵</CardTitle>
          <CardDescription>各 Agent 工具访问权限矩阵（绿=允许，红=禁止）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>允许工具数</TableHead>
                  <TableHead>禁止动作数</TableHead>
                  <TableHead>所属域</TableHead>
                  <TableHead>需审批</TableHead>
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
                        {agent.agent_id === 'release-observer-agent' ? '是' : '否'}
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
