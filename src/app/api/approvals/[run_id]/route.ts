import { NextRequest, NextResponse } from 'next/server';
import { getApprovals } from '@/lib/store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ run_id: string }> }
) {
  try {
    const { run_id } = await params;
    const approvals = getApprovals(run_id);
    return NextResponse.json({ success: true, data: Object.values(approvals) });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to get approvals' }, { status: 500 });
  }
}
