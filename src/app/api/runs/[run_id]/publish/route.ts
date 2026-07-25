import { NextRequest, NextResponse } from 'next/server';
import { getRun, saveRun, addAuditEvent } from '@/lib/store';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ run_id: string }> }
) {
  try {
    const { run_id } = await params;
    const run = getRun(run_id);

    if (!run) {
      return NextResponse.json(
        { success: false, error_code: 'RUN_NOT_FOUND', error: 'Run not found' },
        { status: 404 }
      );
    }

    // Check 1: Run must be in a state that allows publishing (not waiting for approval)
    if (run.status === 'WAITING_APPROVAL') {
      addAuditEvent({
        event_id: `evt_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
        timestamp: new Date().toISOString(),
        actor: 'system',
        action: 'publish_rejected',
        run_id,
        task_id: null,
        input_summary: { reason: 'run_waiting_approval', run_status: run.status },
        output_summary: { error_code: 'APPROVAL_PENDING' },
        status_before: run.status,
        status_after: run.status,
        gate_changes: [],
        details: `Publish rejected for run ${run_id}: run is still waiting for approval`,
      });
      return NextResponse.json(
        {
          success: false,
          error_code: 'APPROVAL_PENDING',
          error: 'Cannot publish: run is still waiting for approval. Please approve first.',
          run_status: run.status,
        },
        { status: 403 }
      );
    }

    // Check 2: All approvals must be APPROVED
    const pendingApprovals = Object.values(run.approvals).filter(a => a.status === 'PENDING');
    if (pendingApprovals.length > 0) {
      addAuditEvent({
        event_id: `evt_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
        timestamp: new Date().toISOString(),
        actor: 'system',
        action: 'publish_rejected',
        run_id,
        task_id: null,
        input_summary: { reason: 'pending_approvals', count: pendingApprovals.length },
        output_summary: { error_code: 'APPROVAL_PENDING' },
        status_before: run.status,
        status_after: run.status,
        gate_changes: [],
        details: `Publish rejected for run ${run_id}: ${pendingApprovals.length} approval(s) still pending`,
      });
      return NextResponse.json(
        {
          success: false,
          error_code: 'APPROVAL_PENDING',
          error: `Cannot publish: ${pendingApprovals.length} approval(s) still pending`,
          pending_approvals: pendingApprovals.map(a => a.approval_id),
        },
        { status: 403 }
      );
    }

    // Check 3: No approvals at all means not ready
    const approvedCount = Object.values(run.approvals).filter(a => a.status === 'APPROVED').length;
    if (approvedCount === 0 && Object.keys(run.approvals).length === 0) {
      addAuditEvent({
        event_id: `evt_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
        timestamp: new Date().toISOString(),
        actor: 'system',
        action: 'publish_rejected',
        run_id,
        task_id: null,
        input_summary: { reason: 'no_approvals' },
        output_summary: { error_code: 'NO_APPROVAL_RECORD' },
        status_before: run.status,
        status_after: run.status,
        gate_changes: [],
        details: `Publish rejected for run ${run_id}: no approval records exist`,
      });
      return NextResponse.json(
        {
          success: false,
          error_code: 'NO_APPROVAL_RECORD',
          error: 'Cannot publish: no approval records exist for this run',
        },
        { status: 403 }
      );
    }

    // Check 4: Production release must be disabled in simulation
    const envConfig = (await import('@/lib/config-loader')).getEnvironmentConfig();
    if (!envConfig.production_release_enabled) {
      addAuditEvent({
        event_id: `evt_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
        timestamp: new Date().toISOString(),
        actor: 'system',
        action: 'publish_rejected',
        run_id,
        task_id: null,
        input_summary: { reason: 'production_release_disabled', approvals_approved: approvedCount },
        output_summary: { error_code: 'PRODUCTION_RELEASE_DISABLED' },
        status_before: run.status,
        status_after: run.status,
        gate_changes: [],
        details: `Publish rejected for run ${run_id}: production release is disabled in simulation mode`,
      });
      return NextResponse.json(
        {
          success: false,
          error_code: 'PRODUCTION_RELEASE_DISABLED',
          error: 'Production release is disabled in current environment (simulation). Approvals are valid but actual release is blocked.',
          approvals_approved: approvedCount,
        },
        { status: 403 }
      );
    }

    // Check 5: Run must be COMPLETED
    if (run.status !== 'COMPLETED') {
      return NextResponse.json(
        {
          success: false,
          error_code: 'RUN_NOT_READY',
          error: `Cannot publish: run status is ${run.status}, expected COMPLETED`,
        },
        { status: 400 }
      );
    }

    // All checks passed - in simulation, this won't be reached
    saveRun({ ...run, status: 'COMPLETED' });

    addAuditEvent({
      event_id: `evt_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      timestamp: new Date().toISOString(),
      actor: 'system',
      action: 'publish_executed',
      run_id,
      task_id: null,
      input_summary: { approvals_approved: approvedCount },
      output_summary: { status: 'PUBLISHED' },
      status_before: run.status,
      status_after: 'COMPLETED',
      gate_changes: [],
      details: `Run ${run_id} published successfully`,
    });

    return NextResponse.json({
      success: true,
      data: {
        run_id,
        status: 'PUBLISHED',
        message: 'Run published successfully',
      },
    });
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
