import { NextRequest, NextResponse } from 'next/server';
import { getAuditEvents } from '@/lib/store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('run_id');
    const agentId = searchParams.get('agent_id');
    const taskId = searchParams.get('task_id');
    const action = searchParams.get('action');

    let events = getAuditEvents();

    // Apply filters
    if (runId) {
      events = events.filter(e => e.run_id === runId);
    }
    if (agentId) {
      events = events.filter(e => e.actor === agentId || e.details.includes(agentId));
    }
    if (taskId) {
      events = events.filter(e => e.task_id === taskId);
    }
    if (action) {
      events = events.filter(e => e.action === action);
    }

    // Sort by timestamp descending (newest first)
    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return NextResponse.json({
      success: true,
      data: events.slice(0, 500),
      total: events.length,
      filters: { run_id: runId, agent_id: agentId, task_id: taskId, action },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get audit events' },
      { status: 500 }
    );
  }
}
