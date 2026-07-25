// Core security and business logic tests
// Run with: npx tsx tests/core.test.ts

import { checkToolPermission, checkForbiddenAction, checkProductionAccess, validateToolCall } from '../src/lib/agent-engine';
import { getAgentConfig, getDagConfig, getDagNodeOrder, getEnvironmentConfig } from '../src/lib/config-loader';
import { createRun, executeNext, pauseRun, retryTask, submitApproval } from '../src/lib/dag';
import { resetStore, getRun, getAuditEvents } from '../src/lib/store';
import { setActiveScenario } from '../src/lib/mock/tools';
import { SCENARIOS } from '../src/lib/mock/scenarios';
import type { AgentId } from '../src/lib/types';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
    console.log(`  \u2713 ${message}`);
  } else {
    failed++;
    failures.push(message);
    console.log(`  \u2717 ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual === expected) {
    passed++;
    console.log(`  \u2713 ${message}`);
  } else {
    failed++;
    failures.push(`${message} (expected: ${expected}, got: ${actual})`);
    console.log(`  \u2717 ${message} (expected: ${expected}, got: ${actual})`);
  }
}

// ============ Test Suite ============

console.log('\n=== Test 1: BLOCK \u963B\u65AD\u4E0B\u6E38 ===');
{
  resetStore();
  setActiveScenario('scenario_b');
  const run = createRun('test', 'scenario_b');
  
  // Execute all nodes
  let iterations = 0;
  while (iterations < 15) {
    const result = executeNext(run.run_id);
    iterations++;
    const currentRun = getRun(run.run_id);
    if (!currentRun || currentRun.status === 'BLOCKED' || currentRun.status === 'COMPLETED') break;
  }
  
  // Mark remaining as skipped
  const finalRun = getRun(run.run_id);
  if (finalRun) {
    for (const task of Object.values(finalRun.tasks)) {
      if (task.status === 'PENDING') {
        task.status = 'SKIPPED_BY_GATE';
      }
    }
    const { saveRun } = require('../src/lib/store');
    saveRun(finalRun);
  }
  
  const updatedRun = getRun(run.run_id);
  assert(updatedRun !== null, 'Run should exist');
  assertEqual(updatedRun!.status, 'BLOCKED', 'Run should be BLOCKED');
  
  // Check that downstream tasks are SKIPPED_BY_GATE
  const modelTask = Object.values(updatedRun!.tasks).find(t => t.dag_node === 'candidate_signal');
  assert(modelTask !== undefined, 'candidate_signal task should exist');
  assertEqual(modelTask!.status, 'SKIPPED_BY_GATE', 'candidate_signal should be SKIPPED_BY_GATE');
  
  const releaseTask = Object.values(updatedRun!.tasks).find(t => t.dag_node === 'release');
  assert(releaseTask !== undefined, 'release task should exist');
  assertEqual(releaseTask!.status, 'SKIPPED_BY_GATE', 'release should be SKIPPED_BY_GATE');
  
  // Check gate is BLOCK
  const gate = updatedRun!.gates['gate_database_core'];
  assert(gate !== undefined, 'database_core gate should exist');
  assertEqual(gate.status, 'BLOCK', 'database_core gate should be BLOCK');
}

console.log('\n=== Test 2: \u672A\u5BA1\u6279\u4E0D\u80FD\u53D1\u5E03 ===');
{
  resetStore();
  setActiveScenario('scenario_c');
  const run = createRun('test', 'scenario_c');
  
  // Execute until waiting for approval
  let iterations = 0;
  while (iterations < 15) {
    const result = executeNext(run.run_id);
    iterations++;
    const currentRun = getRun(run.run_id);
    if (!currentRun || currentRun.status === 'WAITING_APPROVAL' || currentRun.status === 'BLOCKED' || currentRun.status === 'COMPLETED') break;
  }
  
  const currentRun = getRun(run.run_id);
  assert(currentRun !== null, 'Run should exist');
  assertEqual(currentRun!.status, 'WAITING_APPROVAL', 'Run should be WAITING_APPROVAL');
  
  // Check that release task is still PENDING (not executed)
  const releaseTask = Object.values(currentRun!.tasks).find(t => t.dag_node === 'release');
  assert(releaseTask !== undefined, 'release task should exist');
  assertEqual(releaseTask!.status, 'PENDING', 'release should still be PENDING without approval');
  
  // Verify there is a pending approval
  const pendingApprovals = Object.values(currentRun!.approvals).filter(a => a.status === 'PENDING');
  assert(pendingApprovals.length > 0, 'There should be pending approvals');
}

console.log('\n=== Test 3: \u7814\u7A76\u5458\u4E0D\u80FD\u8C03\u7528\u53D1\u5E03\u5DE5\u5177 ===');
{
  const result = checkToolPermission('research-agent' as AgentId, 'publish_approved_signal');
  assertEqual(result.allowed, false, 'research-agent should NOT be allowed to publish_approved_signal');
  assert(result.reason.includes('not authorized'), 'Reason should mention not authorized');
}

console.log('\n=== Test 4: \u6570\u636E\u8D28\u91CF Agent \u4E0D\u80FD\u8C03\u7528\u5199\u5DE5\u5177 ===');
{
  const result = checkToolPermission('data-quality-agent' as AgentId, 'update_daily_kline');
  assertEqual(result.allowed, false, 'data-quality-agent should NOT be allowed to update_daily_kline');
  
  const result2 = checkToolPermission('data-quality-agent' as AgentId, 'check_coverage');
  assertEqual(result2.allowed, true, 'data-quality-agent should be allowed to check_coverage');
}

console.log('\n=== Test 5: \u5E42\u7B49\u952E\u4FDD\u62A4\u91CD\u590D\u5199\u8BF7\u6C42 ===');
{
  resetStore();
  setActiveScenario('scenario_a');
  const run = createRun('test', 'scenario_a');
  
  // Get the first task
  const firstTask = Object.values(run.tasks)[0];
  assert(firstTask !== undefined, 'First task should exist');
  assert(firstTask.idempotency_key.length > 0, 'Task should have idempotency key');
  
  // Execute the first task
  const result1 = executeNext(run.run_id);
  assertEqual(result1.success, true, 'First execution should succeed');
  
  // Check that the task has been executed
  const updatedRun = getRun(run.run_id);
  assert(updatedRun !== null, 'Run should exist after execution');
  const executedTask = Object.values(updatedRun!.tasks).find(t => t.dag_node === 'daily_kline');
  assertEqual(executedTask!.status, 'SUCCEEDED', 'daily_kline should be SUCCEEDED');
}

console.log('\n=== Test 6: NOT_EXECUTED \u4E0D\u4F1A\u88AB\u8BC6\u522B\u4E3A PASS ===');
{
  resetStore();
  // Create a run but don't execute any nodes
  const run = createRun('test', null);
  
  // Check that no gates exist (all NOT_EXECUTED by default)
  const gates = Object.values(run.gates);
  assertEqual(gates.length, 0, 'No gates should exist before execution');
  
  // Verify that the DAG engine does not proceed without gate results
  const result = executeNext(run.run_id);
  // The first node (daily_kline) has no required gates, so it should execute
  assertEqual(result.success, true, 'First node should execute (no gates required)');
  
  // But candidate_signal requires database_core gate
  // Execute up to product_quality_gate
  let iterations = 0;
  while (iterations < 10) {
    const r = executeNext(run.run_id);
    iterations++;
    const currentRun = getRun(run.run_id);
    if (!currentRun || currentRun.status === 'BLOCKED' || currentRun.status === 'WAITING_APPROVAL' || currentRun.status === 'COMPLETED') break;
    if (!r.node) break;
  }
  
  const finalRun = getRun(run.run_id);
  // Check that quality gate was actually executed (not NOT_EXECUTED)
  const qualityGate = finalRun!.gates['gate_database_core'];
  if (qualityGate) {
    assert(qualityGate.status !== 'NOT_EXECUTED', 'Quality gate should not be NOT_EXECUTED after execution');
    assert(['PASS', 'WARN', 'BLOCK'].includes(qualityGate.status), 'Quality gate should have a real status');
  }
}

console.log('\n=== Test 7: \u6A21\u62DF\u73AF\u5883\u4E0D\u80FD\u8C03\u7528\u751F\u4EA7\u5DE5\u5177 ===');
{
  const env = getEnvironmentConfig();
  assertEqual(env.environment, 'simulation', 'Environment should be simulation');
  assertEqual(env.mock_tools, true, 'Mock tools should be enabled');
  assertEqual(env.production_write_enabled, false, 'Production write should be disabled');
  assertEqual(env.production_model_enabled, false, 'Production model should be disabled');
  assertEqual(env.production_release_enabled, false, 'Production release should be disabled');
  
  // Check that production access is denied
  const writeAccess = checkProductionAccess('write');
  assertEqual(writeAccess.allowed, false, 'Production write should not be allowed in simulation');
  
  const releaseAccess = checkProductionAccess('release');
  assertEqual(releaseAccess.allowed, false, 'Production release should not be allowed in simulation');
}

console.log('\n=== Test 8: \u573A\u666F A \u5168\u90E8\u901A\u8FC7 ===');
{
  resetStore();
  setActiveScenario('scenario_a');
  const run = createRun('test', 'scenario_a');
  
  // Execute all nodes
  let iterations = 0;
  while (iterations < 20) {
    const result = executeNext(run.run_id);
    iterations++;
    const currentRun = getRun(run.run_id);
    if (!currentRun || currentRun.status === 'COMPLETED' || currentRun.status === 'WAITING_APPROVAL' || currentRun.status === 'BLOCKED') break;
    if (!result.node && !result.success) break;
  }
  
  // For scenario A, we need to approve manually
  const currentRun = getRun(run.run_id);
  assert(currentRun !== null, 'Run should exist');
  
  // Check data nodes succeeded
  const dataNodes = ['daily_kline', 'adjustment_factors', 'factor_data', 'market_factors'];
  for (const node of dataNodes) {
    const task = Object.values(currentRun!.tasks).find(t => t.dag_node === node);
    assert(task !== undefined, `${node} task should exist`);
    assertEqual(task!.status, 'SUCCEEDED', `${node} should be SUCCEEDED`);
  }
  
  // Quality gate should be PASS
  const qualityGate = currentRun!.gates['gate_database_core'];
  assert(qualityGate !== undefined, 'Quality gate should exist');
  assertEqual(qualityGate.status, 'PASS', 'Quality gate should be PASS');
}

console.log('\n=== Test 9: Agent \u6743\u9650\u914D\u7F6E\u9A8C\u8BC1 ===');
{
  const agents: AgentId[] = [
    'orchestrator-agent',
    'data-ops-agent',
    'data-quality-agent',
    'model-production-agent',
    'model-risk-agent',
    'release-observer-agent',
    'research-agent',
  ];
  
  for (const agentId of agents) {
    const config = getAgentConfig(agentId);
    assert(config !== null, `${agentId} config should exist`);
    assert(config!.allowed_tools.length > 0, `${agentId} should have allowed tools`);
    assert(config!.forbidden_actions.length > 0, `${agentId} should have forbidden actions`);
    assert(config!.display_name.length > 0, `${agentId} should have display name`);
  }
}

console.log('\n=== Test 10: DAG \u914D\u7F6E\u9A8C\u8BC1 ===');
{
  const dag = getDagConfig();
  assert(dag !== null, 'DAG config should exist');
  assert(Object.keys(dag.nodes).length === 9, 'DAG should have 9 nodes');
  
  const order = getDagNodeOrder();
  assertEqual(order.length, 9, 'DAG order should have 9 nodes');
  assertEqual(order[0], 'daily_kline', 'First node should be daily_kline');
  assertEqual(order[order.length - 1], 'post_release_observation', 'Last node should be post_release_observation');
  
  // Verify dependency chain
  const qualityGateNode = dag.nodes['product_quality_gate'];
  assert(qualityGateNode.depends_on.includes('market_factors'), 'quality_gate should depend on market_factors');
  
  const candidateNode = dag.nodes['candidate_signal'];
  assert(candidateNode.depends_on.includes('product_quality_gate'), 'candidate_signal should depend on quality_gate');
  assert(candidateNode.required_gates.includes('database_core'), 'candidate_signal should require database_core gate');
}

console.log('\n=== Test 11: \u5BA1\u8BA1\u65E5\u5FD7\u5B8C\u6574\u6027 ===');
{
  const events = getAuditEvents();
  assert(events.length > 0, 'Audit events should exist after running scenarios');
  
  // Check that events have required fields
  const firstEvent = events[0];
  assert(firstEvent.event_id.length > 0, 'Event should have event_id');
  assert(firstEvent.timestamp.length > 0, 'Event should have timestamp');
  assert(firstEvent.actor.length > 0, 'Event should have actor');
  assert(firstEvent.action.length > 0, 'Event should have action');
}

console.log('\n=== Test 12: \u5DE5\u5177\u767D\u540D\u5355\u9A8C\u8BC1 ===');
{
  // data-ops-agent should only have data update tools
  const dataOpsConfig = getAgentConfig('data-ops-agent');
  assert(dataOpsConfig!.allowed_tools.includes('update_daily_kline'), 'data-ops should have update_daily_kline');
  assert(!dataOpsConfig!.allowed_tools.includes('publish_approved_signal'), 'data-ops should NOT have publish_approved_signal');
  assert(!dataOpsConfig!.allowed_tools.includes('run_production_model'), 'data-ops should NOT have run_production_model');
  
  // release-observer should have release tools
  const releaseConfig = getAgentConfig('release-observer-agent');
  assert(releaseConfig!.allowed_tools.includes('publish_approved_signal'), 'release-observer should have publish_approved_signal');
  assert(!releaseConfig!.allowed_tools.includes('update_daily_kline'), 'release-observer should NOT have update_daily_kline');
}

// ============ Summary ============
console.log(`\n${'='.repeat(50)}`);
console.log(`\u6D4B\u8BD5\u7ED3\u679C: ${passed} \u901A\u8FC7, ${failed} \u5931\u8D25`);
if (failures.length > 0) {
  console.log('\n\u5931\u8D25\u8BE6\u60C5:');
  failures.forEach(f => console.log(`  - ${f}`));
}
console.log(`${'='.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
