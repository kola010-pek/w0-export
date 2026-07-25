import { NextRequest, NextResponse } from 'next/server';
import { getRun } from '@/lib/store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ run_id: string }> }
) {
  try {
    const { run_id } = await params;
    const run = getRun(run_id);
    if (!run) {
      return NextResponse.json({ success: false, error: 'Run not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: run });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to get run' }, { status: 500 });
  }
}
