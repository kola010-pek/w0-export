/**
 * H0 Harness Core - Placeholder Interfaces
 * 
 * These interfaces define the contract for the future Harness Core implementation.
 * No functional implementation exists in this phase.
 */

/**
 * Harness execution request
 */
export interface HarnessExecutionRequest {
  dag_id: string;
  run_id: string;
  environment: string;
  parameters?: Record<string, unknown>;
}

/**
 * Harness execution result
 */
export interface HarnessExecutionResult {
  run_id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'BLOCKED';
  gate_status?: 'PASS' | 'BLOCK' | 'WARN';
  error?: string;
  generated_at: string;
}

/**
 * Gate evaluation request
 */
export interface GateEvaluationRequest {
  gate_id: string;
  run_id: string;
  task_results: Record<string, unknown>;
}

/**
 * Gate evaluation result
 */
export interface GateEvaluationResult {
  gate_id: string;
  status: 'PASS' | 'BLOCK' | 'WARN';
  reasons: string[];
  evaluated_at: string;
}

/**
 * Harness Core interface (placeholder)
 */
export interface IHarnessCore {
  execute(request: HarnessExecutionRequest): Promise<HarnessExecutionResult>;
  evaluateGate(request: GateEvaluationRequest): Promise<GateEvaluationResult>;
}

/**
 * Placeholder implementation - throws error if called
 */
export class HarnessCorePlaceholder implements IHarnessCore {
  async execute(_request: HarnessExecutionRequest): Promise<HarnessExecutionResult> {
    throw new Error('H0 Harness Core is not implemented. This is a placeholder.');
  }

  async evaluateGate(_request: GateEvaluationRequest): Promise<GateEvaluationResult> {
    throw new Error('H0 Harness Core is not implemented. This is a placeholder.');
  }
}
