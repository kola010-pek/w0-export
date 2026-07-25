// Scenario Runner - Pre-configured demo scenarios
import { createRun, executeNext } from '../dag';
import { setActiveScenario } from '../mock/tools';
import { getRun, saveRun, addAuditEvent } from '../store';
import type { ScenarioId, Run } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface ScenarioDef {
  id: ScenarioId;
  name: string;
  description: string;
  expected_flow: string[];
}

export const SCENARIOS: ScenarioDef[] = [
  {
    id: 'scenario_a',
    name: '场景 A: 全部通过',
    description: '数据更新成功 → 质量门禁 PASS → 候选信号生成 → 风控批准 → 人工批准 → 发布成功',
    expected_flow: [
      'daily_kline', 'adjustment_factors', 'factor_data', 'market_factors',
      'product_quality_gate', 'candidate_signal', 'risk_approval',
      'release', 'post_release_observation'
    ],
  },
  {
    id: 'scenario_b',
    name: '场景 B: 核心数据阻断',
    description: '复权因子缺口超过阈值 → 数据质量 BLOCK → 模型生产及下游全部 SKIPPED_BY_GATE',
    expected_flow: [
      'daily_kline', 'adjustment_factors', 'factor_data', 'market_factors',
      'product_quality_gate(BLOCK)'
    ],
  },
  {
    id: 'scenario_c',
    name: '场景 C: 模型警告',
    description: '数据核心门禁 PASS → 模型门禁 WARN → 流程停在人工审批',
    expected_flow: [
      'daily_kline', 'adjustment_factors', 'factor_data', 'market_factors',
      'product_quality_gate(PASS)', 'candidate_signal(WARN)', 'WAITING_APPROVAL'
    ],
  },
];

export function runScenario(scenarioId: ScenarioId): {
  success: boolean;
  run: Run | null;
  message: string;
  steps: Array<{ node: string; status: string }>;
} {
  const scenario = SCENARIOS.find(s => s.id === scenarioId);
  if (!scenario) {
    return { success: false, run: null, message: `Scenario ${scenarioId} not found`, steps: [] };
  }

  // Set active scenario for mock tools
  setActiveScenario(scenarioId);

  // Create run
  const run = createRun('system', scenarioId);
  const steps: Array<{ node: string; status: string }> = [];

  // Execute nodes one by one
  let maxIterations = 20;
  while (maxIterations > 0) {
    maxIterations--;
    let result = executeNext(run.run_id);

    if (result.node) {
      steps.push({
        node: result.node,
        status: result.result?.status || 'UNKNOWN',
      });
    }

    // Check if we need to stop
    const currentRun = getRun(run.run_id);
    if (!currentRun) break;

    if (currentRun.status === 'BLOCKED') {
      // Mark remaining tasks as SKIPPED_BY_GATE and record audit events
      for (const task of Object.values(currentRun.tasks)) {
        if (task.status === 'PENDING') {
          task.status = 'SKIPPED_BY_GATE';
          addAuditEvent({
            event_id: `evt_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
            timestamp: new Date().toISOString(),
            actor: 'system',
            action: 'skip_by_gate',
            run_id: currentRun.run_id,
            task_id: task.task_id,
            input_summary: { dag_node: task.dag_node, reason: 'pipeline_blocked' },
            output_summary: { task_status: 'SKIPPED_BY_GATE' },
            status_before: 'PENDING',
            status_after: 'SKIPPED_BY_GATE',
            gate_changes: [],
            details: `Task ${task.task_id} (node ${task.dag_node}) skipped due to pipeline BLOCK: ${currentRun.block_reason}`,
          });
        }
      }
      saveRun(currentRun);
      steps.push({ node: 'pipeline', status: 'BLOCKED' });
      break;
    }

    if (currentRun.status === 'WAITING_APPROVAL') {
      // For scenario_a, auto-approve to demonstrate full COMPLETED flow
      if (scenarioId === 'scenario_a') {
        const pendingApprovals = Object.values(currentRun.approvals).filter(a => a.status === 'PENDING');
        for (const appr of pendingApprovals) {
          appr.status = 'APPROVED';
          appr.approver = 'auto-risk-reviewer';
          appr.decided_at = new Date().toISOString();
          appr.opinion = 'Scenario A auto-approval: all metrics within acceptable range';

          // Update corresponding task
          const task = currentRun.tasks[appr.task_id];
          if (task) {
            task.status = 'SUCCEEDED';
          }

          // Create approval gate
          currentRun.gates['gate_approval'] = {
            gate_id: 'gate_approval',
            run_id: currentRun.run_id,
            scope: 'approval',
            status: 'PASS',
            checked_at: new Date().toISOString(),
            data_cutoff: currentRun.data_cutoff,
            rules: [{
              rule_id: 'approval_check',
              display_name: '人工审批检查',
              status: 'PASS' as const,
              actual: 'approved',
              threshold: 'approved',
              operator: 'eq',
              severity: 'BLOCK' as const,
              evidence_ref: appr.approval_id,
              description: 'Auto-approved by auto-risk-reviewer for scenario_a',
            }],
            block_reasons: [],
            warnings: [],
          };

          addAuditEvent({
            event_id: `evt_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
            timestamp: new Date().toISOString(),
            actor: 'auto-risk-reviewer',
            action: 'submit_approval',
            run_id: currentRun.run_id,
            task_id: appr.task_id,
            input_summary: { approval_id: appr.approval_id, decision: 'APPROVED', auto: true },
            output_summary: { opinion: appr.opinion },
            status_before: 'PENDING',
            status_after: 'APPROVED',
            gate_changes: [],
            details: `Auto-approval for scenario_a: ${appr.approval_id}`,
          });
        }
        currentRun.status = 'CREATED';
        saveRun(currentRun);
        steps.push({ node: 'pipeline', status: 'AUTO_APPROVED' });
        // Reset result to allow loop to continue executing remaining nodes
        result = { success: true, node: null, result: null, gate: null, message: 'Continuing after auto-approval' };
        continue;
      }
      steps.push({ node: 'pipeline', status: 'WAITING_APPROVAL' });
      break;
    }

    if (currentRun.status === 'COMPLETED') {
      steps.push({ node: 'pipeline', status: 'COMPLETED' });
      break;
    }

    if (!result.success && result.message !== 'No executable node found') {
      break;
    }

    if (result.message === 'All tasks completed') {
      steps.push({ node: 'pipeline', status: 'COMPLETED' });
      break;
    }
  }

  const finalRun = getRun(run.run_id);
  return {
    success: true,
    run: finalRun,
    message: `Scenario ${scenarioId} executed`,
    steps,
  };
}

// Execute a run step by step (for manual execution)
export function executeRunStepByStep(runId: string): {
  success: boolean;
  node: string | null;
  status: string;
  message: string;
} {
  const result = executeNext(runId);
  const run = getRun(runId);

  if (!run) {
    return { success: false, node: null, status: 'ERROR', message: 'Run not found' };
  }

  // After executing, check if downstream should be skipped
  if (run.status === 'BLOCKED') {
    for (const task of Object.values(run.tasks)) {
      if (task.status === 'PENDING') {
        task.status = 'SKIPPED_BY_GATE';
        addAuditEvent({
          event_id: `evt_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
          timestamp: new Date().toISOString(),
          actor: 'system',
          action: 'skip_by_gate',
          run_id: run.run_id,
          task_id: task.task_id,
          input_summary: { dag_node: task.dag_node, reason: 'pipeline_blocked' },
          output_summary: { task_status: 'SKIPPED_BY_GATE' },
          status_before: 'PENDING',
          status_after: 'SKIPPED_BY_GATE',
          gate_changes: [],
          details: `Task ${task.task_id} (node ${task.dag_node}) skipped due to pipeline BLOCK`,
        });
      }
    }
    saveRun(run);
  }

  return {
    success: result.success,
    node: result.node,
    status: run.status,
    message: result.message,
  };
}
