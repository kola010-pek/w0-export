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
        <h1 className="text-2xl font-bold">\u5BA1\u6279\u4E2D\u5FC3</h1>
        <p className="text-sm text-gray-500 mt-1">\u5BA1\u6279\u8BB0\u5F55\u7ED1\u5B9A run_id\u3001task_id\u3001\u6A21\u578B\u7248\u672C\u3001\u8F93\u5165\u5FEB\u7167\u3001\u6570\u636E\u622A\u6B62\u65E5\u548C\u5019\u9009\u4FE1\u53F7\u7248\u672C</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            <p className="text-sm text-gray-500">\u5F85\u5BA1\u6279</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{approvals.filter(a => a.status === 'APPROVED').length}</div>
            <p className="text-sm text-gray-500">\u5DF2\u6279\u51C6</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{approvals.filter(a => a.status === 'REJECTED').length}</div>
            <p className="text-sm text-gray-500">\u5DF2\u62D2\u7EDD</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>\u5BA1\u6279\u8BB0\u5F55</CardTitle>
        </CardHeader>
        <CardContent>
          {approvals.length === 0 ? (
            <p className="text-sm text-gray-500">\u6682\u65E0\u5BA1\u6279\u8BB0\u5F55\u3002\u8BF7\u5148\u8FD0\u884C\u573A\u666F\u3002</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>\u5BA1\u6279 ID</TableHead>
                  <TableHead>\u8FD0\u884C</TableHead>
                  <TableHead>\u7C7B\u578B</TableHead>
                  <TableHead>\u72B6\u6001</TableHead>
                  <TableHead>\u98CE\u9669</TableHead>
                  <TableHead>\u6A21\u578B\u7248\u672C</TableHead>
                  <TableHead>\u6570\u636E\u622A\u6B62</TableHead>
                  <TableHead>\u5BA1\u6279\u4EBA</TableHead>
                  <TableHead>\u64CD\u4F5C</TableHead>
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
                              \u5BA1\u6279
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>\u5BA1\u6279\u786E\u8BA4</DialogTitle>
                              <DialogDescription>
                                \u5BA1\u6279 ID: {a.approval_id} | \u8FD0\u884C: {a.run_id}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="text-gray-500">\u7C7B\u578B:</span> {a.approval_type}</div>
                                <div><span className="text-gray-500">\u98CE\u9669:</span> {a.risk_level}</div>
                                <div><span className="text-gray-500">\u6A21\u578B:</span> {a.model_version || '-'}</div>
                                <div><span className="text-gray-500">\u622A\u6B62\u65E5:</span> {a.data_cutoff}</div>
                                <div><span className="text-gray-500">\u4FE1\u53F7\u7248\u672C:</span> {a.candidate_signal_version || '-'}</div>
                                <div><span className="text-gray-500">\u5FEB\u7167:</span> {a.input_snapshot_id || '-'}</div>
                              </div>
                              <div>
                                <Label>\u5BA1\u6279\u4EBA</Label>
                                <Input value={approver} onChange={e => setApprover(e.target.value)} placeholder="\u8F93\u5165\u5BA1\u6279\u4EBA\u59D3\u540D" />
                              </div>
                              <div>
                                <Label>\u5BA1\u6279\u610F\u89C1</Label>
                                <Textarea value={opinion} onChange={e => setOpinion(e.target.value)} placeholder="\u8F93\u5165\u5BA1\u6279\u610F\u89C1" />
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={() => handleDecision('APPROVED')} disabled={!approver} className="bg-green-600 hover:bg-green-700">
                                  \u6279\u51C6
                                </Button>
                                <Button onClick={() => handleDecision('REJECTED')} disabled={!approver} variant="destructive">
                                  \u62D2\u7EDD
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
