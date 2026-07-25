// DAG State Machine - Deterministic task execution with dependency tracking
// Enforces: upstream BLOCK → downstream SKIPPED_BY_GATE

import { v4 as uuidv4 } from 'uuid';
import { getDagConfig, getDagNodeOrder, getEnvironmentConfig } from '../config-loader';
import {
  getRun,
  saveRun,
  saveGate,
  saveApproval,
  addAuditEvent,
  checkIdempotency,
  saveIdempotency,
} from '../store';
import { executeMockTool } from '../mock/tools';
import { validateToolCall, recordAgentAudit } from '../agent-engine';
import type {
  Run,
  Task,
  TaskResult,
  GateResult,
  GateStatus,
  Approval,
  RunStatus,
  TaskStatus,
  AgentId,
  AuditEvent,
  Evidence,
} from '../types';

// ============ Run Creation ============
export function createRun(
  createdBy: string,
  scenario: string | null = null,
  dataCutoff?: string
): Run {
  const runId = `run_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const now = new Date().toISOString();
  const dag = getDagConfig();
  const nodeOrder = getDagNodeOrder();

  const tasks: Record<string, Task> = {};
  for (const nodeId of nodeOrder) {
    const node = dag.nodes[nodeId];
    const taskId = `task_${nodeId}_${runId.slice(-6)}`;
    tasks[taskId] = {
      task_id: taskId,
      run_id: runId,
      task_type: node.task_type,
      assigned_agent: node.agent,
      status: 'PENDING',
      parameters: { dag_node: nodeId, data_object: node.data_object || null },
      input_refs: [],
      required_gates: node.required_gates,
      created_at: now,
      created_by: createdBy,
      idempotency_key: `${runId}_${nodeId}_v1`,
      dag_node: nodeId,
      attempt: 1,
    };
  }

  const run: Run = {
    run_id: runId,
    status: 'CREATED',
    scenario,
    created_at: now,
    created_by: createdBy,
    updated_at: now,
    data_cutoff: dataCutoff || new Date().toISOString().split('T')[0],
    tasks,
    results: {},
    gates: {},
    approvals: {},
    current_node: null,
    block_reason: null,
  };

  saveRun(run);

  const auditEvent: AuditEvent = {
    event_id: `evt_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
    timestamp: now,
    actor: createdBy,
    action: 'create_run',
    run_id: runId,
    task_id: null,
    input_summary: { scenario, data_cutoff: run.data_cutoff },
    output_summary: { run_id: runId, task_count: Object.keys(tasks).length },
    status_before: null,
    status_after: 'CREATED',
    gate_changes: [],
    details: `Run ${runId} created by ${createdBy}${scenario ? ` with scenario ${scenario}` : ''}`,
  };
  addAuditEvent(auditEvent);

  return run;
}

// ============ Execute Next Node ============
export function executeNext(runId: string): {
  success: boolean;
  node: string | null;
  result: TaskResult | null;
  gate: GateResult | null;
  message: string;
} {
  const run = getRun(runId);
  if (!run) {
    return { success: false, node: null, result: null, gate: null, message: 'Run not found' };
  }

  if (run.status === 'BLOCKED') {
    return { success: false, node: null, result: null, gate: null, message: `Run is BLOCKED: ${run.block_reason}` };
  }

  if (run.status === 'PAUSED') {
    return { success: false, node: null, result: null, gate: null, message: 'Run is PAUSED' };
  }

  const nodeOrder = getDagNodeOrder();
  const dag = getDagConfig();

  // Find next executable node
  let nextNodeId: string | null = null;
  for (const nodeId of nodeOrder) {
    const task = Object.values(run.tasks).find(t => t.dag_node === nodeId);
    if (!task) continue;

    if (task.status === 'WAITING_APPROVAL') {
      return { success: false, node: null, result: null, gate: null, message: 'Waiting for approval' };
    }

    if (task.status === 'PENDING') {
      // Check if all dependencies are satisfied
      const node = dag.nodes[nodeId];
      const depsReady = node.depends_on.every((depId: string) => {
        const depTask = Object.values(run.tasks).find(t => t.dag_node === depId);
        return depTask && (depTask.status === 'SUCCEEDED');
      });

      // Check if any dependency is BLOCKED or SKIPPED
      const anyDepBlocked = node.depends_on.some((depId: string) => {
        const depTask = Object.values(run.tasks).find(t => t.dag_node === depId);
        return depTask && (depTask.status === 'BLOCKED' || depTask.status === 'SKIPPED_BY_GATE');
      });

      if (anyDepBlocked) {
        task.status = 'SKIPPED_BY_GATE';
        addAuditEvent({
          event_id: `evt_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
          timestamp: new Date().toISOString(),
          actor: 'system',
          action: 'skip_by_gate',
          run_id: runId,
          task_id: task.task_id,
          input_summary: { dag_node: nextNodeId || nodeId, reason: 'upstream_dependency_blocked_or_skipped' },
          output_summary: { task_status: 'SKIPPED_BY_GATE' },
          status_before: 'PENDING',
          status_after: 'SKIPPED_BY_GATE',
          gate_changes: [],
          details: `Task ${task.task_id} (node ${nodeId}) skipped: upstream dependency is BLOCKED or SKIPPED_BY_GATE`,
        });
        saveRun(run);
        continue;
      }

      // Check required gates
      const gatesRequired = node.required_gates;
      const allGatesPassed = gatesRequired.every((gateScope: string) => {
        const gateKey = `gate_${gateScope}`;
        const gate = run.gates[gateKey];
        return gate && (gate.status === 'PASS' || gate.status === 'WARN');
      });

      const anyGateBlocked = gatesRequired.some((gateScope: string) => {
        const gateKey = `gate_${gateScope}`;
        const gate = run.gates[gateKey];
        return gate && gate.status === 'BLOCK';
      });

      if (anyGateBlocked) {
        task.status = 'SKIPPED_BY_GATE';
        addAuditEvent({
          event_id: `evt_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
          timestamp: new Date().toISOString(),
          actor: 'system',
          action: 'skip_by_gate',
          run_id: runId,
          task_id: task.task_id,
          input_summary: { dag_node: nodeId, reason: 'required_gate_blocked' },
          output_summary: { task_status: 'SKIPPED_BY_GATE' },
          status_before: 'PENDING',
          status_after: 'SKIPPED_BY_GATE',
          gate_changes: [],
          details: `Task ${task.task_id} (node ${nodeId}) skipped: required gate is BLOCK`,
        });
        saveRun(run);
        continue;
      }

      if (depsReady && allGatesPassed) {
        nextNodeId = nodeId;
        break;
      }
    }
  }

  if (!nextNodeId) {
    // Check if all tasks are done
    const allDone = Object.values(run.tasks).every(
      t => ['SUCCEEDED', 'SKIPPED_BY_GATE', 'FAILED'].includes(t.status)
    );
    if (allDone) {
      run.status = 'COMPLETED';
      run.updated_at = new Date().toISOString();
      saveRun(run);
      return { success: true, node: null, result: null, gate: null, message: 'All tasks completed' };
    }
    return { success: false, node: null, result: null, gate: null, message: 'No executable node found. Dependencies may not be satisfied.' };
  }

  // Execute the node
  const task = Object.values(run.tasks).find(t => t.dag_node === nextNodeId)!;
  const node = dag.nodes[nextNodeId];

  task.status = 'RUNNING';
  run.status = 'RUNNING';
  run.current_node = nextNodeId;
  run.updated_at = new Date().toISOString();
  saveRun(run);

  recordAgentAudit(
    node.agent,
    'execute_task',
    runId,
    task.task_id,
    { node: nextNodeId, tool: node.task_type },
    {},
    'PENDING',
    'RUNNING',
    `Executing node ${nextNodeId}`
  );

  // Execute mock tool
  const toolResult = executeMockTool(node.agent, node.task_type, {
    run_id: runId,
    task_id: task.task_id,
    dag_node: nextNodeId,
    data_object: node.data_object,
    scope: node.scope,
    data_cutoff: run.data_cutoff,
    attempt: task.attempt,
  });

  const now = new Date().toISOString();
  const result: TaskResult = {
    task_id: task.task_id,
    run_id: runId,
    agent_id: node.agent,
    status: toolResult.success ? 'SUCCEEDED' : 'FAILED',
    gate_status: toolResult.gate_status || 'NOT_EXECUTED',
    started_at: now,
    finished_at: now,
    data_cutoff: run.data_cutoff,
    input_versions: toolResult.input_versions || {},
    output_versions: toolResult.output_versions || {},
    metrics: toolResult.metrics || { inserted: 0, updated: 0, skipped: 0, failed: 0 },
    watermarks: toolResult.watermarks || {},
    evidence: toolResult.evidence || [],
    warnings: toolResult.warnings || [],
    errors: toolResult.errors || [],
    next_action: toolResult.next_action || '',
    mock: true,
  };

  run.results[task.task_id] = result;

  // Update task status
  if (toolResult.success) {
    task.status = 'SUCCEEDED';
  } else {
    task.status = 'FAILED';
  }

  // Handle gate results
  let gateResult: GateResult | null = null;
  if (toolResult.gate_result) {
    gateResult = toolResult.gate_result;
    gateResult.run_id = runId;
    run.gates[gateResult.gate_id] = gateResult;

    // If gate is BLOCK, mark current run as blocked
    if (gateResult.status === 'BLOCK') {
      run.status = 'BLOCKED';
      run.block_reason = gateResult.block_reasons.join('; ');

      // Mark all downstream tasks as SKIPPED_BY_GATE
      const nodeOrder = getDagNodeOrder();
      const currentNodeIdx = nodeOrder.indexOf(nextNodeId);
      for (let i = currentNodeIdx + 1; i < nodeOrder.length; i++) {
        const downstreamNodeId = nodeOrder[i];
        const downstreamTask = Object.values(run.tasks).find(t => t.dag_node === downstreamNodeId);
        if (downstreamTask && downstreamTask.status === 'PENDING') {
          const prevStatus = downstreamTask.status;
          downstreamTask.status = 'SKIPPED_BY_GATE';
          addAuditEvent({
            event_id: `evt_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
            timestamp: new Date().toISOString(),
            actor: 'system',
            action: 'skip_by_gate',
            run_id: runId,
            task_id: downstreamTask.task_id,
            input_summary: { dag_node: downstreamNodeId, reason: 'upstream_gate_blocked' },
            output_summary: { task_status: 'SKIPPED_BY_GATE' },
            status_before: prevStatus,
            status_after: 'SKIPPED_BY_GATE',
            gate_changes: [{ gate_id: gateResult.gate_id, status_before: 'PASS' as const, status_after: 'BLOCK' as const, reason: 'upstream gate blocked' }],
            details: `Node ${downstreamNodeId} skipped because upstream gate ${gateResult.gate_id} blocked`,
          });
        }
      }
    }
  }

  // Handle approval requirements
  if (toolResult.approval_required) {
    task.status = 'WAITING_APPROVAL';
    run.status = 'WAITING_APPROVAL';

    const approval: Approval = {
      approval_id: `appr_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      run_id: runId,
      task_id: task.task_id,
      approval_type: toolResult.approval_type || 'human_review',
      status: 'PENDING',
      model_version: toolResult.model_version || '',
      input_snapshot_id: toolResult.input_snapshot_id || '',
      data_cutoff: run.data_cutoff,
      candidate_signal_version: toolResult.candidate_signal_version || '',
      approver: '',
      decided_at: null,
      opinion: '',
      risk_level: toolResult.risk_level || 'medium',
      created_at: now,
    };
    run.approvals[approval.approval_id] = approval;
  }

  run.updated_at = new Date().toISOString();
  saveRun(run);

  recordAgentAudit(
    node.agent,
    'task_completed',
    runId,
    task.task_id,
    { node: nextNodeId },
    { status: task.status, gate_status: result.gate_status },
    'RUNNING',
    task.status,
    `Node ${nextNodeId} completed with status ${task.status}`
  );

  return {
    success: true,
    node: nextNodeId,
    result,
    gate: gateResult,
    message: `Node ${nextNodeId} executed successfully`,
  };
}

// ============ Pause Run ============
export function pauseRun(runId: string): Run | null {
  const run = getRun(runId);
  if (!run) return null;

  const prevStatus = run.status;
  run.status = 'PAUSED';
  run.updated_at = new Date().toISOString();
  saveRun(run);

  const auditEvent: AuditEvent = {
    event_id: `evt_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
    timestamp: new Date().toISOString(),
    actor: 'orchestrator-agent',
    action: 'pause_run',
    run_id: runId,
    task_id: null,
    input_summary: {},
    output_summary: {},
    status_before: prevStatus,
    status_after: 'PAUSED',
    gate_changes: [],
    details: `Run ${runId} paused`,
  };
  addAuditEvent(auditEvent);

  return run;
}

// ============ Retry Task ============
export function retryTask(taskId: string): { success: boolean; message: string; task: Task | null } {
  // Find the task across all runs
  const runs = Object.values(getAllRuns());
  let targetRun: Run | null = null;
  let targetTask: Task | null = null;

  for (const run of runs) {
    const task = run.tasks[taskId];
    if (task) {
      targetRun = run;
      targetTask = task;
      break;
    }
  }

  if (!targetRun || !targetTask) {
    return { success: false, message: 'Task not found', task: null };
  }

  if (targetTask.status !== 'FAILED' && targetTask.status !== 'BLOCKED') {
    return { success: false, message: `Task is ${targetTask.status}, cannot retry`, task: null };
  }

  targetTask.status = 'PENDING';
  targetTask.attempt += 1;
  targetTask.idempotency_key = `${targetRun.run_id}_${targetTask.dag_node}_v${targetTask.attempt}`;
  targetRun.updated_at = new Date().toISOString();

  // If run was blocked, check if we can unblock
  if (targetRun.status === 'BLOCKED') {
    targetRun.status = 'CREATED';
    targetRun.block_reason = null;
  }

  saveRun(targetRun);

  const auditEvent: AuditEvent = {
    event_id: `evt_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
    timestamp: new Date().toISOString(),
    actor: 'orchestrator-agent',
    action: 'retry_task',
    run_id: targetRun.run_id,
    task_id: taskId,
    input_summary: { attempt: targetTask.attempt },
    output_summary: {},
    status_before: 'FAILED',
    status_after: 'PENDING',
    gate_changes: [],
    details: `Task ${taskId} retry attempt ${targetTask.attempt}`,
  };
  addAuditEvent(auditEvent);

  return { success: true, message: `Task ${taskId} reset for retry (attempt ${targetTask.attempt})`, task: targetTask };
}

// ============ Submit Approval ============
export function submitApproval(
  runId: string,
  approvalId: string,
  approver: string,
  decision: 'APPROVED' | 'REJECTED',
  opinion: string
): { success: boolean; message: string; approval: Approval | null } {
  const run = getRun(runId);
  if (!run) {
    return { success: false, message: 'Run not found', approval: null };
  }

  const approval = run.approvals[approvalId];
  if (!approval) {
    return { success: false, message: 'Approval not found', approval: null };
  }

  if (approval.status !== 'PENDING') {
    return { success: false, message: `Approval already ${approval.status}`, approval: null };
  }

  approval.status = decision;
  approval.approver = approver;
  approval.decided_at = new Date().toISOString();
  approval.opinion = opinion;

  // Update task status
  const task = run.tasks[approval.task_id];
  if (task) {
    if (decision === 'APPROVED') {
      task.status = 'SUCCEEDED';
    } else {
      task.status = 'FAILED';
    }
  }

  // Create approval gate if decision is APPROVED
  if (decision === 'APPROVED') {
    run.gates['gate_approval'] = {
      gate_id: 'gate_approval',
      run_id: runId,
      scope: 'approval',
      status: 'PASS',
      checked_at: new Date().toISOString(),
      data_cutoff: run.data_cutoff,
      rules: [{
        rule_id: 'approval_check',
        display_name: '人工审批检查',
        status: 'PASS' as const,
        actual: 'approved',
        threshold: 'approved',
        operator: 'eq',
        severity: 'BLOCK' as const,
        evidence_ref: approval.approval_id,
        description: `Approved by ${approver}: ${opinion}`,
      }],
      block_reasons: [],
      warnings: [],
    };
  }

  // Update run status
  if (decision === 'APPROVED') {
    const hasPendingApprovals = Object.values(run.approvals).some(a => a.status === 'PENDING');
    if (!hasPendingApprovals) {
      run.status = 'CREATED'; // Resume execution
    }
  } else {
    run.status = 'FAILED';
  }

  run.updated_at = new Date().toISOString();
  saveRun(run);

  const auditEvent: AuditEvent = {
    event_id: `evt_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
    timestamp: new Date().toISOString(),
    actor: approver,
    action: 'submit_approval',
    run_id: runId,
    task_id: approval.task_id,
    input_summary: { approval_id: approvalId, decision },
    output_summary: { opinion },
    status_before: 'PENDING',
    status_after: decision,
    gate_changes: [],
    details: `${approver} ${decision} approval ${approvalId}: ${opinion}`,
  };
  addAuditEvent(auditEvent);

  return { success: true, message: `Approval ${decision}`, approval };
}

// ============ Get All Runs ============
function getAllRuns(): Record<string, Run> {
  const { getRuns } = require('../store');
  return getRuns();
}
// force rebuild Sat Jul 25 20:47:13 CST 2026
