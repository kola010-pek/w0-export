'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/dashboard/error-state';

interface PermissionTest {
  test_name: string;
  agent_id: string;
  tool_or_action: string;
  expected: 'ALLOWED' | 'DENIED';
  actual: 'ALLOWED' | 'DENIED';
  passed: boolean;
  reason: string;
}

interface AgentInfo {
  agent_id: string;
  display_name: string;
  domain: string;
  role: string;
  goal: string;
  allowed_tools: string[];
  forbidden_actions: string[];
  handoff_to: string[];
  approval_required: boolean;
  status: string;
  permission_tests: PermissionTest[];
  test_summary: {
    total: number;
    passed: number;
    failed: number;
    pass_rate: string;
  };
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
  const [error, setError] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      if (data.success) {
        setAgents(data.data);
      } else {
        setError(data.error || '加载 Agent 数据失败');
      }
    } catch (err) {
      setError(`请求失败: ${err instanceof Error ? err.message : '网络错误'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  if (loading) {
    return <div className="p-6"><div className="animate-pulse h-64 bg-gray-200 rounded" /></div>;
  }

  if (error && agents.length === 0) {
    return (
      <div className="p-6">
        <ErrorState title="Agent 数据加载失败" message={error} onRetry={fetchAgents} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agent 岗位</h1>
        <p className="text-sm text-gray-500 mt-1">七个岗位 Agent 的身份、权限、后端权限测试结果</p>
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

              {/* Permission Test Summary */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-500 uppercase">后端权限测试</p>
                  <div className="flex items-center gap-2">
                    <Badge className={agent.test_summary.failed === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {agent.test_summary.passed}/{agent.test_summary.total} 通过
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-5"
                      onClick={() => setExpandedAgent(expandedAgent === agent.agent_id ? null : agent.agent_id)}
                    >
                      {expandedAgent === agent.agent_id ? '收起' : '详情'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Expanded Permission Tests */}
              {expandedAgent === agent.agent_id && agent.permission_tests.length > 0 && (
                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                  {agent.permission_tests.map(test => (
                    <div key={test.test_name} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                      <span className="font-mono truncate max-w-[180px]" title={test.tool_or_action}>{test.tool_or_action}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">期望:{test.expected}</span>
                        <Badge className={test.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {test.passed ? 'PASS' : 'FAIL'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>权限矩阵</CardTitle>
          <CardDescription>各 Agent 工具访问权限矩阵与后端测试结果</CardDescription>
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
                  <TableHead>测试通过率</TableHead>
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
                      <Badge variant={agent.approval_required ? 'default' : 'secondary'}>
                        {agent.approval_required ? '是' : '否'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={agent.test_summary.failed === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {agent.test_summary.pass_rate}
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
