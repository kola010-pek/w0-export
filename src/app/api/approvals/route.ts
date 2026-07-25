import { NextRequest, NextResponse } from 'next/server';
import { submitApproval } from '@/lib/dag';
import { getRuns } from '@/lib/store';

export async function GET() {
  try {
    const runs = getRuns();
    const allApprovals: Array<Record<string, unknown>> = [];
    for (const run of Object.values(runs)) {
      for (const approval of Object.values(run.approvals)) {
        allApprovals.push({ ...approval, run_status: run.status });
      }
    }
    allApprovals.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return NextResponse.json({ success: true, data: allApprovals });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to list approvals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { run_id, approval_id, approver, decision, opinion } = body;

    if (!run_id || !approval_id || !approver || !decision) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: run_id, approval_id, approver, decision' },
        { status: 400 }
      );
    }

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return NextResponse.json(
        { success: false, error: 'Decision must be APPROVED or REJECTED' },
        { status: 400 }
      );
    }

    const result = submitApproval(run_id, approval_id, approver, decision, opinion || '');
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.approval });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to submit approval' }, { status: 500 });
  }
}
