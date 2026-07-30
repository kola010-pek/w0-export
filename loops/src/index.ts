/**
 * LE0 Loop Control Plane - Placeholder Interfaces
 * 
 * These interfaces define the contract for the future Loop Control Plane implementation.
 * No functional implementation exists in this phase.
 */

/**
 * Loop execution request
 */
export interface LoopExecutionRequest {
  loop_id: string;
  iteration: number;
  max_iterations: number;
  parameters?: Record<string, unknown>;
}

/**
 * Loop execution result
 */
export interface LoopExecutionResult {
  loop_id: string;
  iteration: number;
  status: 'RUNNING' | 'COMPLETED' | 'STOPPED' | 'ESCALATED';
  stop_reason?: string;
  generated_at: string;
}

/**
 * Stop rule evaluation request
 */
export interface StopRuleEvaluationRequest {
  rule_id: string;
  iteration: number;
  metrics: Record<string, number>;
}

/**
 * Stop rule evaluation result
 */
export interface StopRuleEvaluationResult {
  rule_id: string;
  should_stop: boolean;
  reason?: string;
  evaluated_at: string;
}

/**
 * Loop Control Plane interface (placeholder)
 */
export interface ILoopControlPlane {
  execute(request: LoopExecutionRequest): Promise<LoopExecutionResult>;
  evaluateStopRule(request: StopRuleEvaluationRequest): Promise<StopRuleEvaluationResult>;
}

/**
 * Placeholder implementation - throws error if called
 */
export class LoopControlPlanePlaceholder implements ILoopControlPlane {
  async execute(_request: LoopExecutionRequest): Promise<LoopExecutionResult> {
    throw new Error('LE0 Loop Control Plane is not implemented. This is a placeholder.');
  }

  async evaluateStopRule(_request: StopRuleEvaluationRequest): Promise<StopRuleEvaluationResult> {
    throw new Error('LE0 Loop Control Plane is not implemented. This is a placeholder.');
  }
}
