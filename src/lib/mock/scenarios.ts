// Scenario Runner - Pre-configured demo scenarios
import { createRun, executeNext } from '../dag';
import { setActiveScenario } from '../mock/tools';
import { getRun } from '../store';
import type { ScenarioId, Run } from '../types';

export interface ScenarioDef {
  id: ScenarioId;
  name: string;
  description: string;
  expected_flow: string[];
}

export const SCENARIOS: ScenarioDef[] = [
  {
    id: 'scenario_a',
    name: '\u573A\u666F A: \u5168\u90E8\u901A\u8FC7',
    description: '\u6570\u636E\u66F4\u65B0\u6210\u529F \u2192 \u8D28\u91CF\u95E8\u7981 PASS \u2192 \u5019\u9009\u4FE1\u53F7\u751F\u6210 \u2192 \u98CE\u63A7\u6279\u51C6 \u2192 \u4EBA\u5DE5\u6279\u51C6 \u2192 \u53D1\u5E03\u6210\u529F',
    expected_flow: [
      'daily_kline', 'adjustment_factors', 'factor_data', 'market_factors',
      'product_quality_gate', 'candidate_signal', 'risk_approval',
      'release', 'post_release_observation'
    ],
  },
  {
    id: 'scenario_b',
    name: '\u573A\u666F B: \u6838\u5FC3\u6570\u636E\u963B\u65AD',
    description: '\u590D\u6743\u56E0\u5B50\u7F3A\u53E3\u8D85\u8FC7\u9608\u503C \u2192 \u6570\u636E\u8D28\u91CF BLOCK \u2192 \u6A21\u578B\u751F\u4EA7\u53CA\u4E0B\u6E38\u5168\u90E8 SKIPPED_BY_GATE',
    expected_flow: [
      'daily_kline', 'adjustment_factors', 'factor_data', 'market_factors',
      'product_quality_gate(BLOCK)'
    ],
  },
  {
    id: 'scenario_c',
    name: '\u573A\u666F C: \u6A21\u578B\u8B66\u544A',
    description: '\u6570\u636E\u6838\u5FC3\u95E8\u7981 PASS \u2192 \u6A21\u578B\u95E8\u7981 WARN \u2192 \u6D41\u7A0B\u505C\u5728\u4EBA\u5DE5\u5BA1\u6279',
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
    const result = executeNext(run.run_id);

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
      // Mark remaining tasks as SKIPPED_BY_GATE
      for (const task of Object.values(currentRun.tasks)) {
        if (task.status === 'PENDING') {
          task.status = 'SKIPPED_BY_GATE';
        }
      }
      const { saveRun } = require('../store');
      saveRun(currentRun);
      steps.push({ node: 'pipeline', status: 'BLOCKED' });
      break;
    }

    if (currentRun.status === 'WAITING_APPROVAL') {
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
      }
    }
    const { saveRun } = require('../store');
    saveRun(run);
  }

  return {
    success: result.success,
    node: result.node,
    status: run.status,
    message: result.message,
  };
}
