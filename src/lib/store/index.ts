// File-based persistent store using JSON
// All core state is persisted to disk, not just in memory.

import fs from 'fs';
import path from 'path';
import type {
  Run,
  Task,
  TaskResult,
  GateResult,
  Approval,
  AuditEvent,
  AgentConfig,
  DataWatermark,
  Signal,
} from '../types';

const STORE_DIR = path.join(process.cwd(), 'mock', 'data');

function ensureStoreDir(): void {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filename: string, defaultValue: T): T {
  ensureStoreDir();
  const filepath = path.join(STORE_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return defaultValue;
  }
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

function writeJsonFile<T>(filename: string, data: T): void {
  ensureStoreDir();
  const filepath = path.join(STORE_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

// ============ Run Store ============
export function getRuns(): Record<string, Run> {
  return readJsonFile<Record<string, Run>>('runs.json', {});
}

export function getRun(runId: string): Run | null {
  const runs = getRuns();
  return runs[runId] ?? null;
}

export function saveRun(run: Run): void {
  const runs = getRuns();
  runs[run.run_id] = run;
  writeJsonFile('runs.json', runs);
}

export function updateRun(runId: string, updater: (run: Run) => Run): Run | null {
  const run = getRun(runId);
  if (!run) return null;
  const updated = updater(run);
  saveRun(updated);
  return updated;
}

// ============ Task Store ============
export function getTask(runId: string, taskId: string): Task | null {
  const run = getRun(runId);
  if (!run) return null;
  return run.tasks[taskId] ?? null;
}

export function saveTask(runId: string, task: Task): void {
  const run = getRun(runId);
  if (!run) return;
  run.tasks[task.task_id] = task;
  saveRun(run);
}

// ============ Result Store ============
export function saveResult(runId: string, result: TaskResult): void {
  const run = getRun(runId);
  if (!run) return;
  run.results[result.task_id] = result;
  saveRun(run);
}

export function getResult(runId: string, taskId: string): TaskResult | null {
  const run = getRun(runId);
  if (!run) return null;
  return run.results[taskId] ?? null;
}

// ============ Gate Store ============
export function saveGate(runId: string, gate: GateResult): void {
  const run = getRun(runId);
  if (!run) return;
  run.gates[gate.gate_id] = gate;
  saveRun(run);
}

export function getGates(runId: string): Record<string, GateResult> {
  const run = getRun(runId);
  if (!run) return {};
  return run.gates;
}

export function getGate(runId: string, gateId: string): GateResult | null {
  const gates = getGates(runId);
  return gates[gateId] ?? null;
}

// ============ Approval Store ============
export function saveApproval(runId: string, approval: Approval): void {
  const run = getRun(runId);
  if (!run) return;
  run.approvals[approval.approval_id] = approval;
  saveRun(run);
}

export function getApprovals(runId: string): Record<string, Approval> {
  const run = getRun(runId);
  if (!run) return {};
  return run.approvals;
}

// ============ Audit Store ============
export function getAuditEvents(): AuditEvent[] {
  return readJsonFile<AuditEvent[]>('audit_events.json', []);
}

export function addAuditEvent(event: AuditEvent): void {
  const events = getAuditEvents();
  events.push(event);
  writeJsonFile('audit_events.json', events);
}

// ============ Agent Config Store ============
export function getAgentConfigs(): Record<string, AgentConfig> {
  return readJsonFile<Record<string, AgentConfig>>('agent_configs.json', {});
}

export function saveAgentConfigs(configs: Record<string, AgentConfig>): void {
  writeJsonFile('agent_configs.json', configs);
}

export function getAgentConfig(agentId: string): AgentConfig | null {
  const configs = getAgentConfigs();
  return configs[agentId] ?? null;
}

// ============ Watermark Store ============
export function getWatermarks(): Record<string, DataWatermark> {
  return readJsonFile<Record<string, DataWatermark>>('watermarks.json', {});
}

export function saveWatermark(watermark: DataWatermark): void {
  const watermarks = getWatermarks();
  watermarks[watermark.data_object] = watermark;
  writeJsonFile('watermarks.json', watermarks);
}

// ============ Signal Store ============
export function getSignals(): Record<string, Signal> {
  return readJsonFile<Record<string, Signal>>('signals.json', {});
}

export function saveSignal(signal: Signal): void {
  const signals = getSignals();
  signals[signal.signal_id] = signal;
  writeJsonFile('signals.json', signals);
}

// ============ Idempotency Store ============
export function checkIdempotency(key: string): TaskResult | null {
  const map = readJsonFile<Record<string, TaskResult>>('idempotency.json', {});
  return map[key] ?? null;
}

export function saveIdempotency(key: string, result: TaskResult): void {
  const map = readJsonFile<Record<string, TaskResult>>('idempotency.json', {});
  map[key] = result;
  writeJsonFile('idempotency.json', map);
}

// ============ Reset Store (for testing) ============
export function resetStore(): void {
  ensureStoreDir();
  const files = [
    'runs.json',
    'audit_events.json',
    'agent_configs.json',
    'watermarks.json',
    'signals.json',
    'idempotency.json',
  ];
  for (const file of files) {
    const filepath = path.join(STORE_DIR, file);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }
}
