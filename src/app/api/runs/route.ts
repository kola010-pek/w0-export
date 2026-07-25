import { NextRequest, NextResponse } from 'next/server';
import { createRun } from '@/lib/dag';
import { getRuns } from '@/lib/store';

export async function GET() {
  try {
    const runs = getRuns();
    const runList = Object.values(runs).map(r => ({
      run_id: r.run_id,
      status: r.status,
      scenario: r.scenario,
      created_at: r.created_at,
      created_by: r.created_by,
      data_cutoff: r.data_cutoff,
      current_node: r.current_node,
      block_reason: r.block_reason,
      task_count: Object.keys(r.tasks).length,
      completed_count: Object.values(r.tasks).filter(t => t.status === 'SUCCEEDED').length,
      failed_count: Object.values(r.tasks).filter(t => t.status === 'FAILED').length,
      skipped_count: Object.values(r.tasks).filter(t => t.status === 'SKIPPED_BY_GATE').length,
    }));
    runList.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return NextResponse.json({ success: true, data: runList });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to list runs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { created_by, scenario, data_cutoff } = body;

    const run = createRun(
      created_by || 'human-operator',
      scenario || null,
      data_cutoff || undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        run_id: run.run_id,
        status: run.status,
        scenario: run.scenario,
        created_at: run.created_at,
        data_cutoff: run.data_cutoff,
        task_count: Object.keys(run.tasks).length,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create run' }, { status: 500 });
  }
}
