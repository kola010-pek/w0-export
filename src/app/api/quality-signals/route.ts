import { NextResponse } from 'next/server';
import { getRuns, getAuditEvents } from '@/lib/store';

// Quality Signals API - Returns mock quality signal data bound to run_id, task_id, and evidence_id
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('run_id');

    const runsRecord = getRuns();
    const runs = Object.values(runsRecord);
    const events = getAuditEvents();

    // Generate quality signals from completed tasks
    const signals = runs.flatMap(run => {
      if (runId && run.run_id !== runId) return [];
      
      return Object.values(run.tasks)
        .filter(task => task.status === 'SUCCEEDED' || task.status === 'MOCK_SUCCEEDED')
        .map(task => {
          // Find related audit events for evidence
          const taskEvents = events.filter(e => e.task_id === task.task_id);
          const evidenceIds = taskEvents.map(e => e.event_id);

          return {
            signal_id: `sig_${task.task_id.replace('task_', '')}`,
            run_id: run.run_id,
            task_id: task.task_id,
            version: `v1.0.${run.run_id.slice(-6)}`,
            signal_type: task.dag_node === 'candidate_signal' ? 'candidate_signal' : 'quality_check',
            quality_score: task.status === 'SUCCEEDED' || task.status === 'MOCK_SUCCEEDED' ? 0.95 : 0.75,
            data_freshness: run.data_cutoff,
            risk_flags: [] as string[],
            evidence_count: evidenceIds.length,
            evidence_ids: evidenceIds,
            created_at: task.created_at || new Date().toISOString(),
            mock: true,
          };
        });
    });

    return NextResponse.json({
      success: true,
      data: signals,
      mock: true,
      message: '当前为模拟环境，质量信号数据为 Mock 生成',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: '获取质量信号失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
