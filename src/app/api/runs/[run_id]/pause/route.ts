import { NextRequest, NextResponse } from 'next/server';
import { pauseRun } from '@/lib/dag';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ run_id: string }> }
) {
  try {
    const { run_id } = await params;
    const run = pauseRun(run_id);
    if (!run) {
      return NextResponse.json({ success: false, error: 'Run not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { run_id: run.run_id, status: run.status } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to pause run' }, { status: 500 });
  }
}
