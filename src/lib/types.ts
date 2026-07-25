// Core type definitions for the Financial Investment Agent Operations Workbench

// ============ Agent Types ============
export type AgentId =
  | 'orchestrator-agent'
  | 'data-ops-agent'
  | 'data-quality-agent'
  | 'model-production-agent'
  | 'model-risk-agent'
  | 'release-observer-agent'
  | 'research-agent';

export type AgentDomain =
  | 'production-dispatch'
  | 'data-operations'
  | 'quality-assurance'
  | 'model-production'
  | 'risk-control'
  | 'release-management'
  | 'research';

export interface AgentConfig {
  agent_id: AgentId;
  display_name: string;
  domain: AgentDomain;
  role: string;
  goal: string;
  allowed_inputs: string[];
  required_preconditions: string[];
  allowed_tools: string[];
  forbidden_actions: string[];
  output_schema: string;
  handoff_to: AgentId[];
  approval_required: boolean;
  audit_fields: string[];
}

// ============ Task Types ============
export type TaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'BLOCKED'
  | 'SKIPPED_BY_GATE'
  | 'WAITING_APPROVAL'
  | 'PAUSED';

export type TaskType =
  | 'data_update'
  | 'quality_check'
  | 'model_run'
  | 'risk_review'
  | 'release'
  | 'observation';

export interface Task {
  task_id: string;
  run_id: string;
  task_type: TaskType;
  assigned_agent: AgentId;
  status: TaskStatus;
  parameters: Record<string, unknown>;
  input_refs: string[];
  required_gates: string[];
  created_at: string;
  created_by: string;
  idempotency_key: string;
  dag_node: string;
  attempt: number;
}

// ============ Result Types ============
export type ResultStatus = 'SUCCEEDED' | 'FAILED' | 'PARTIAL';

export interface TaskResult {
  task_id: string;
  run_id: string;
  agent_id: AgentId;
  status: ResultStatus;
  gate_status: GateStatus | 'NOT_EXECUTED';
  started_at: string;
  finished_at: string;
  data_cutoff: string;
  input_versions: Record<string, string>;
  output_versions: Record<string, string>;
  metrics: {
    inserted: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  watermarks: Record<string, string>;
  evidence: Evidence[];
  warnings: string[];
  errors: string[];
  next_action: string;
  mock: boolean;
}

// ============ Gate Types ============
export type GateStatus = 'PASS' | 'WARN' | 'BLOCK' | 'NOT_EXECUTED';

export type RuleStatus = 'PASS' | 'WARN' | 'BLOCK' | 'NOT_EXECUTED';

export interface GateRule {
  rule_id: string;
  display_name: string;
  status: RuleStatus;
  actual: number | boolean | string;
  threshold: number | boolean | string;
  operator: string;
  severity: 'BLOCK' | 'WARN';
  evidence_ref: string;
  description: string;
}

export interface GateResult {
  gate_id: string;
  run_id: string;
  scope: string;
  status: GateStatus;
  checked_at: string;
  data_cutoff: string;
  rules: GateRule[];
  block_reasons: string[];
  warnings: string[];
}

// ============ Approval Types ============
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVIEW';

export type RiskReviewStatus = 'APPROVE' | 'REJECT' | 'NEEDS_REVIEW';

export interface Approval {
  approval_id: string;
  run_id: string;
  task_id: string;
  approval_type: 'risk_review' | 'human_release' | 'human_review';
  status: ApprovalStatus;
  model_version: string;
  input_snapshot_id: string;
  data_cutoff: string;
  candidate_signal_version: string;
  approver: string;
  decided_at: string | null;
  opinion: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

// ============ Audit Types ============
export interface AuditEvent {
  event_id: string;
  timestamp: string;
  actor: string;
  action: string;
  run_id: string | null;
  task_id: string | null;
  input_summary: Record<string, unknown>;
  output_summary: Record<string, unknown>;
  status_before: string | null;
  status_after: string | null;
  gate_changes: GateChange[];
  details: string;
}

export interface GateChange {
  gate_id: string;
  status_before: GateStatus;
  status_after: GateStatus;
  reason: string;
}

// ============ Evidence Types ============
export interface Evidence {
  evidence_id: string;
  type: string;
  source: string;
  data: Record<string, unknown>;
  created_at: string;
  hash: string;
}

// ============ Run Types ============
export type RunStatus =
  | 'CREATED'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED'
  | 'WAITING_APPROVAL';

export interface Run {
  run_id: string;
  status: RunStatus;
  scenario: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  data_cutoff: string;
  tasks: Record<string, Task>;
  results: Record<string, TaskResult>;
  gates: Record<string, GateResult>;
  approvals: Record<string, Approval>;
  current_node: string | null;
  block_reason: string | null;
}

// ============ DAG Types ============
export interface DagNode {
  display_name: string;
  agent: AgentId;
  task_type: TaskType;
  depends_on: string[];
  required_gates: string[];
  data_object?: string;
  scope?: string;
  description: string;
}

export interface DagConfig {
  name: string;
  description: string;
  nodes: Record<string, DagNode>;
}

// ============ Environment Types ============
export interface EnvironmentConfig {
  environment: string;
  mock_tools: boolean;
  production_write_enabled: boolean;
  production_model_enabled: boolean;
  production_release_enabled: boolean;
  database_core_gate_default: GateStatus;
  model_gate_default: GateStatus;
  description: string;
}

// ============ Scenario Types ============
export type ScenarioId = 'scenario_a' | 'scenario_b' | 'scenario_c';

export interface Scenario {
  id: ScenarioId;
  name: string;
  description: string;
  data_profile: Record<string, unknown>;
  expected_gates: Record<string, GateStatus>;
  expected_flow: string[];
}

// ============ API Response Types ============
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  mock?: boolean;
}

// ============ Watermark Types ============
export interface DataWatermark {
  data_object: string;
  latest_date: string;
  row_count: number;
  updated_at: string;
}

// ============ Signal Types ============
export type SignalStatus =
  | 'research_candidate'
  | 'registered_candidate'
  | 'production_candidate'
  | 'approved'
  | 'released';

export interface Signal {
  signal_id: string;
  run_id: string;
  status: SignalStatus;
  model_version: string;
  data_cutoff: string;
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
