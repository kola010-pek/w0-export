'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ApprovalItem {
  approval_id: string;
  run_id: string;
  task_id: string;
  approval_type: string;
  status: string;
  model_version: string;
  input_snapshot_id: string;
  data_cutoff: string;
  candidate_signal_version: string;
  approver: string;
  decided_at: string | null;
  opinion: string;
  risk_level: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-orange-100 text-orange-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  NEEDS_REVIEW: 'bg-yellow-100 text-yellow-800',
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [approver, setApprover] = useState('');
  const [opinion, setOpinion] = useState('');

  const fetchApprovals = useCallback(async () => {
    const res = await fetch('/api/approvals');
    const data = await res.json();
    if (data.success) setApprovals(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedApproval || !approver) return;
    const res = await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        run_id: selectedApproval.run_id,
        approval_id: selectedApproval.approval_id,
        approver,
        decision,
        opinion,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setDialogOpen(false);
      setSelectedApproval(null);
      setApprover('');
      setOpinion('');
      await fetchApprovals();
    }
  };

  const pendingCount = approvals.filter(a => a.status === 'PENDING').length;

  if (loading) {
    return <div className="p-6"><div className="animate-pulse h-64 bg-gray-200 rounded" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">审批中心</h1>
        <p className="text-sm text-gray-500 mt-1">审批记录绑定 run_id、task_id、模型版本、输入快照、数据截止日和候选信号版本</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            <p className="text-sm text-gray-500">待审批</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{approvals.filter(a => a.status === 'APPROVED').length}</div>
            <p className="text-sm text-gray-500">已批准</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{approvals.filter(a => a.status === 'REJECTED').length}</div>
            <p className="text-sm text-gray-500">已拒绝</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>审批记录</CardTitle>
        </CardHeader>
        <CardContent>
          {approvals.length === 0 ? (
            <p className="text-sm text-gray-500">暂无审批记录。请先运行场景。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>审批 ID</TableHead>
                  <TableHead>运行</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>风险</TableHead>
                  <TableHead>模型版本</TableHead>
                  <TableHead>数据截止</TableHead>
                  <TableHead>审批人</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals.map(a => (
                  <TableRow key={a.approval_id}>
                    <TableCell className="font-mono text-xs">{a.approval_id}</TableCell>
                    <TableCell className="font-mono text-xs">{a.run_id.slice(0, 16)}</TableCell>
                    <TableCell className="text-xs">{a.approval_type}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[a.status]}>{a.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.risk_level === 'high' || a.risk_level === 'critical' ? 'destructive' : 'secondary'}>
                        {a.risk_level}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{a.model_version || '-'}</TableCell>
                    <TableCell className="text-xs">{a.data_cutoff}</TableCell>
                    <TableCell>{a.approver || '-'}</TableCell>
                    <TableCell>
                      {a.status === 'PENDING' && (
                        <Dialog open={dialogOpen && selectedApproval?.approval_id === a.approval_id} onOpenChange={(open) => {
                          setDialogOpen(open);
                          if (!open) setSelectedApproval(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => setSelectedApproval(a)}>
                              审批
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>审批确认</DialogTitle>
                              <DialogDescription>
                                审批 ID: {a.approval_id} | 运行: {a.run_id}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="text-gray-500">类型:</span> {a.approval_type}</div>
                                <div><span className="text-gray-500">风险:</span> {a.risk_level}</div>
                                <div><span className="text-gray-500">模型:</span> {a.model_version || '-'}</div>
                                <div><span className="text-gray-500">截止日:</span> {a.data_cutoff}</div>
                                <div><span className="text-gray-500">信号版本:</span> {a.candidate_signal_version || '-'}</div>
                                <div><span className="text-gray-500">快照:</span> {a.input_snapshot_id || '-'}</div>
                              </div>
                              <div>
                                <Label>审批人</Label>
                                <Input value={approver} onChange={e => setApprover(e.target.value)} placeholder="输入审批人姓名" />
                              </div>
                              <div>
                                <Label>审批意见</Label>
                                <Textarea value={opinion} onChange={e => setOpinion(e.target.value)} placeholder="输入审批意见" />
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={() => handleDecision('APPROVED')} disabled={!approver} className="bg-green-600 hover:bg-green-700">
                                  批准
                                </Button>
                                <Button onClick={() => handleDecision('REJECTED')} disabled={!approver} variant="destructive">
                                  拒绝
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      {a.status !== 'PENDING' && (
                        <span className="text-xs text-gray-400">
                          {a.decided_at ? new Date(a.decided_at).toLocaleString('zh-CN') : '-'}
                        </span>
                      )}
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
