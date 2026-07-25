import { NextRequest, NextResponse } from 'next/server';
import { getRun } from '@/lib/store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ task_id: string }> }
) {
  try {
    const { task_id } = await params;
    // Search across all runs
    const { getRuns } = await import('@/lib/store');
    const runs = getRuns();
    for (const run of Object.values(runs)) {
      const task = run.tasks[task_id];
      if (task) {
        const result = run.results[task_id] || null;
        return NextResponse.json({ success: true, data: { task, result } });
      }
    }
    return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to get task' }, { status: 500 });
  }
}
