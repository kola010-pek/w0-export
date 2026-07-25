'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RunSummary {
  run_id: string;
  status: string;
  scenario: string | null;
  created_at: string;
  data_cutoff: string;
  current_node: string | null;
  block_reason: string | null;
  task_count: number;
  completed_count: number;
  failed_count: number;
  skipped_count: number;
}

interface HealthData {
  environment: string;
  mock_tools: boolean;
  production_write_enabled: boolean;
  production_model_enabled: boolean;
  production_release_enabled: boolean;
  message: string;
}

interface ApprovalItem {
  approval_id: string;
  run_id: string;
  task_id: string;
  approval_type: string;
  status: string;
  approver: string;
  risk_level: string;
  created_at: string;
  decided_at: string | null;
  opinion: string;
}

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-blue-100 text-blue-800',
  RUNNING: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  BLOCKED: 'bg-red-200 text-red-900',
  PAUSED: 'bg-gray-100 text-gray-800',
  WAITING_APPROVAL: 'bg-orange-100 text-orange-800',
  PASS: 'bg-green-100 text-green-800',
  WARN: 'bg-yellow-100 text-yellow-800',
  BLOCK: 'bg-red-100 text-red-800',
  NOT_EXECUTED: 'bg-gray-100 text-gray-500',
  PENDING: 'bg-blue-50 text-blue-700',
  SUCCEEDED: 'bg-green-100 text-green-800',
  SKIPPED_BY_GATE: 'bg-gray-200 text-gray-700',
};

export default function DashboardPage() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningScenario, setRunningScenario] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [runsRes, healthRes, approvalsRes] = await Promise.all([
        fetch('/api/runs'),
        fetch('/api/health'),
        fetch('/api/approvals'),
      ]);
      const runsData = await runsRes.json();
      const healthData = await healthRes.json();
      const approvalsData = await approvalsRes.json();

      if (runsData.success) setRuns(runsData.data);
      if (healthData.success) setHealth(healthData.data);
      if (approvalsData.success) setApprovals(approvalsData.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const runScenario = async (scenarioId: string) => {
    setRunningScenario(scenarioId);
    try {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to run scenario:', err);
    } finally {
      setRunningScenario(null);
    }
  };

  const latestRun = runs[0];
  const pendingApprovals = approvals.filter(a => a.status === 'PENDING');

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">\u8FD0\u8425\u603B\u89C8</h1>
          <p className="text-sm text-gray-500 mt-1">\u91D1\u878D\u6570\u636E\u4E0E\u91CF\u5316\u6A21\u578B\u8FD0\u8425\u5DE5\u4F5C\u53F0</p>
        </div>
        <div className="flex gap-2">
          {['scenario_a', 'scenario_b', 'scenario_c'].map(id => (
            <Button
              key={id}
              size="sm"
              variant="outline"
              disabled={runningScenario !== null}
              onClick={() => runScenario(id)}
            >
              {runningScenario === id ? '\u8FD0\u884C\u4E2D...' : id === 'scenario_a' ? '\u573A\u666F A' : id === 'scenario_b' ? '\u573A\u666F B' : '\u573A\u666F C'}
            </Button>
          ))}
        </div>
      </div>

      {/* Simulation Warning */}
      <Alert className="border-amber-300 bg-amber-50">
        <AlertDescription className="text-amber-800 text-sm">
          {health?.message || '\u5F53\u524D\u4E3A\u6A21\u62DF\u73AF\u5883\u3002\u771F\u5B9E\u751F\u4EA7\u5199\u5165\u3001\u6B63\u5F0F\u6A21\u578B\u8FD0\u884C\u548C\u6B63\u5F0F\u4FE1\u53F7\u53D1\u5E03\u5747\u672A\u542F\u7528\u3002'}
        </AlertDescription>
      </Alert>

      {/* Status Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>\u73AF\u5883\u72B6\u6001</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health?.environment === 'simulation' ? '\u6A21\u62DF' : health?.environment}</div>
            <p className="text-xs text-gray-500 mt-1">Mock: {health?.mock_tools ? '\u5F00\u542F' : '\u5173\u95ED'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>\u6700\u65B0\u8FD0\u884C</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-mono font-bold truncate">
              {latestRun ? latestRun.run_id.slice(0, 16) : '\u65E0'}
            </div>
            <Badge className={STATUS_COLORS[latestRun?.status || ''] || 'bg-gray-100'}>
              {latestRun?.status || '\u65E0\u8FD0\u884C'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>\u5F85\u5BA1\u6279</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingApprovals.length}</div>
            <p className="text-xs text-gray-500 mt-1">\u9700\u8981\u4EBA\u5DE5\u5904\u7406</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>\u751F\u4EA7\u80FD\u529B</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>\u5199\u5165:</span>
                <Badge variant={health?.production_write_enabled ? 'default' : 'secondary'} className="text-xs">
                  {health?.production_write_enabled ? '\u542F\u7528' : '\u7981\u7528'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>\u6A21\u578B:</span>
                <Badge variant={health?.production_model_enabled ? 'default' : 'secondary'} className="text-xs">
                  {health?.production_model_enabled ? '\u542F\u7528' : '\u7981\u7528'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>\u53D1\u5E03:</span>
                <Badge variant={health?.production_release_enabled ? 'default' : 'secondary'} className="text-xs">
                  {health?.production_release_enabled ? '\u542F\u7528' : '\u7981\u7528'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for details */}
      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">\u8FD0\u884C\u8BB0\u5F55</TabsTrigger>
          <TabsTrigger value="gates">\u95E8\u7981\u72B6\u6001</TabsTrigger>
          <TabsTrigger value="approvals">\u5BA1\u6279\u4E8B\u9879</TabsTrigger>
          <TabsTrigger value="scenarios">\u6F14\u793A\u573A\u666F</TabsTrigger>
        </TabsList>

        <TabsContent value="runs">
          <Card>
            <CardHeader>
              <CardTitle>\u8FD0\u884C\u5386\u53F2</CardTitle>
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <p className="text-sm text-gray-500">\u6682\u65E0\u8FD0\u884C\u8BB0\u5F55\u3002\u8BF7\u8FD0\u884C\u6F14\u793A\u573A\u666F\u3002</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>\u8FD0\u884C\u7F16\u53F7</TableHead>
                      <TableHead>\u72B6\u6001</TableHead>
                      <TableHead>\u573A\u666F</TableHead>
                      <TableHead>\u622A\u6B62\u65E5</TableHead>
                      <TableHead>\u4EFB\u52A1\u8FDB\u5EA6</TableHead>
                      <TableHead>\u963B\u65AD\u539F\u56E0</TableHead>
                      <TableHead>\u521B\u5EFA\u65F6\u95F4</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map(run => (
                      <TableRow key={run.run_id}>
                        <TableCell className="font-mono text-xs">{run.run_id}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[run.status] || 'bg-gray-100'}>{run.status}</Badge>
                        </TableCell>
                        <TableCell>{run.scenario || '-'}</TableCell>
                        <TableCell>{run.data_cutoff}</TableCell>
                        <TableCell>
                          <span className="text-green-600">{run.completed_count}</span>
                          /{run.task_count}
                          {run.failed_count > 0 && <span className="text-red-600 ml-1">({run.failed_count} \u5931\u8D25)</span>}
                          {run.skipped_count > 0 && <span className="text-gray-500 ml-1">({run.skipped_count} \u8DF3\u8FC7)</span>}
                        </TableCell>
                        <TableCell className="text-red-600 text-xs max-w-48 truncate">{run.block_reason || '-'}</TableCell>
                        <TableCell className="text-xs">{new Date(run.created_at).toLocaleString('zh-CN')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gates">
          <Card>
            <CardHeader>
              <CardTitle>\u95E8\u7981\u72B6\u6001</CardTitle>
              <CardDescription>\u6700\u65B0\u8FD0\u884C\u7684\u95E8\u7981\u68C0\u67E5\u7ED3\u679C</CardDescription>
            </CardHeader>
            <CardContent>
              {latestRun ? (
                <GateStatusView runId={latestRun.run_id} />
              ) : (
                <p className="text-sm text-gray-500">\u6682\u65E0\u95E8\u7981\u6570\u636E</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>\u5BA1\u6279\u4E8B\u9879</CardTitle>
            </CardHeader>
            <CardContent>
              {approvals.length === 0 ? (
                <p className="text-sm text-gray-500">\u6682\u65E0\u5BA1\u6279\u8BB0\u5F55</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>\u5BA1\u6279 ID</TableHead>
                      <TableHead>\u8FD0\u884C</TableHead>
                      <TableHead>\u7C7B\u578B</TableHead>
                      <TableHead>\u72B6\u6001</TableHead>
                      <TableHead>\u98CE\u9669\u7B49\u7EA7</TableHead>
                      <TableHead>\u5BA1\u6279\u4EBA</TableHead>
                      <TableHead>\u610F\u89C1</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvals.map(a => (
                      <TableRow key={a.approval_id}>
                        <TableCell className="font-mono text-xs">{a.approval_id}</TableCell>
                        <TableCell className="font-mono text-xs">{a.run_id.slice(0, 16)}</TableCell>
                        <TableCell>{a.approval_type}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[a.status] || 'bg-gray-100'}>{a.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={a.risk_level === 'high' ? 'destructive' : 'secondary'}>{a.risk_level}</Badge>
                        </TableCell>
                        <TableCell>{a.approver || '-'}</TableCell>
                        <TableCell className="max-w-48 truncate text-xs">{a.opinion || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios">
          <Card>
            <CardHeader>
              <CardTitle>\u6F14\u793A\u573A\u666F</CardTitle>
              <CardDescription>\u70B9\u51FB\u8FD0\u884C\u573A\u666F\u67E5\u770B\u7ED3\u679C\u3002\u6BCF\u6B21\u8FD0\u884C\u4EA7\u751F\u65B0\u7684 run_id\u3002</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ScenarioCard
                  id="scenario_a"
                  name="\u573A\u666F A: \u5168\u90E8\u901A\u8FC7"
                  description="\u6570\u636E\u66F4\u65B0\u6210\u529F \u2192 \u8D28\u91CF\u95E8\u7981 PASS \u2192 \u5019\u9009\u4FE1\u53F7 \u2192 \u98CE\u63A7\u6279\u51C6 \u2192 \u4EBA\u5DE5\u6279\u51C6 \u2192 \u53D1\u5E03"
                  onRun={() => runScenario('scenario_a')}
                  disabled={runningScenario !== null}
                  running={runningScenario === 'scenario_a'}
                />
                <ScenarioCard
                  id="scenario_b"
                  name="\u573A\u666F B: \u6838\u5FC3\u6570\u636E\u963B\u65AD"
                  description="\u590D\u6743\u56E0\u5B50\u7F3A\u53E3\u8D85\u9608\u503C \u2192 \u8D28\u91CF BLOCK \u2192 \u4E0B\u6E38\u5168\u90E8 SKIPPED_BY_GATE"
                  onRun={() => runScenario('scenario_b')}
                  disabled={runningScenario !== null}
                  running={runningScenario === 'scenario_b'}
                />
                <ScenarioCard
                  id="scenario_c"
                  name="\u573A\u666F C: \u6A21\u578B\u8B66\u544A"
                  description="\u6570\u636E\u95E8\u7981 PASS \u2192 \u6A21\u578B\u95E8\u7981 WARN \u2192 \u505C\u5728\u4EBA\u5DE5\u5BA1\u6279"
                  onRun={() => runScenario('scenario_c')}
                  disabled={runningScenario !== null}
                  running={runningScenario === 'scenario_c'}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GateStatusView({ runId }: { runId: string }) {
  const [gates, setGates] = useState<Record<string, unknown>>({});

  useEffect(() => {
    fetch(`/api/gates/${runId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setGates(data.data);
      })
      .catch(console.error);
  }, [runId]);

  const gateList = Object.values(gates) as Array<{
    gate_id: string;
    scope: string;
    status: string;
    rules: Array<{ rule_id: string; display_name: string; status: string; actual: unknown; threshold: unknown }>;
    block_reasons: string[];
    warnings: string[];
  }>;

  if (gateList.length === 0) {
    return <p className="text-sm text-gray-500">\u6682\u65E0\u95E8\u7981\u6570\u636E</p>;
  }

  return (
    <div className="space-y-4">
      {gateList.map(gate => (
        <div key={gate.gate_id} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">{gate.gate_id}</h3>
            <Badge className={STATUS_COLORS[gate.status] || 'bg-gray-100'}>{gate.status}</Badge>
          </div>
          <div className="space-y-2">
            {gate.rules.map(rule => (
              <div key={rule.rule_id} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2">
                <span>{rule.display_name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    \u5B9E\u9645: {String(rule.actual)} / \u9608\u503C: {String(rule.threshold)}
                  </span>
                  <Badge className={STATUS_COLORS[rule.status] || 'bg-gray-100'}>{rule.status}</Badge>
                </div>
              </div>
            ))}
          </div>
          {gate.block_reasons.length > 0 && (
            <div className="mt-2 text-sm text-red-600">
              \u963B\u65AD\u539F\u56E0: {gate.block_reasons.join('; ')}
            </div>
          )}
          {gate.warnings.length > 0 && (
            <div className="mt-2 text-sm text-yellow-600">
              \u8B66\u544A: {gate.warnings.join('; ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ScenarioCard({
  id,
  name,
  description,
  onRun,
  disabled,
  running,
}: {
  id: string;
  name: string;
  description: string;
  onRun: () => void;
  disabled: boolean;
  running: boolean;
}) {
  return (
    <div className="border rounded-lg p-4 flex items-center justify-between">
      <div>
        <h3 className="font-medium">{name}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <Button
        size="sm"
        onClick={onRun}
        disabled={disabled}
      >
        {running ? '\u8FD0\u884C\u4E2D...' : '\u8FD0\u884C'}
      </Button>
    </div>
  );
}
