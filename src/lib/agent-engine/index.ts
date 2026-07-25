// Agent Engine - Permission validation and tool access control
// Enforces strict boundaries for each agent.

import { getAgentConfig } from '../config-loader';
import { getEnvironmentConfig } from '../config-loader';
import { addAuditEvent } from '../store';
import type { AgentId, AuditEvent } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface ToolCallRequest {
  agent_id: AgentId;
  tool_id: string;
  run_id: string;
  task_id: string;
  parameters: Record<string, unknown>;
  idempotency_key: string;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason: string;
}

// Check if an agent is allowed to call a specific tool
export function checkToolPermission(agentId: AgentId, toolId: string): PermissionCheckResult {
  const config = getAgentConfig(agentId);
  if (!config) {
    return { allowed: false, reason: `Agent ${agentId} not found` };
  }

  if (!config.allowed_tools.includes(toolId)) {
    return {
      allowed: false,
      reason: `Agent ${agentId} is not authorized to use tool ${toolId}. Allowed tools: ${config.allowed_tools.join(', ')}`,
    };
  }

  return { allowed: true, reason: 'OK' };
}

// Check if an action is forbidden for an agent
export function checkForbiddenAction(agentId: AgentId, action: string): PermissionCheckResult {
  const config = getAgentConfig(agentId);
  if (!config) {
    return { allowed: false, reason: `Agent ${agentId} not found` };
  }

  if (config.forbidden_actions.includes(action)) {
    return {
      allowed: false,
      reason: `Action ${action} is explicitly forbidden for agent ${agentId}`,
    };
  }

  return { allowed: true, reason: 'OK' };
}

// Check if the environment allows a production operation
export function checkProductionAccess(operation: 'write' | 'model' | 'release'): PermissionCheckResult {
  const env = getEnvironmentConfig();

  switch (operation) {
    case 'write':
      if (!env.production_write_enabled) {
        return { allowed: false, reason: 'Production write is disabled in current environment (simulation)' };
      }
      break;
    case 'model':
      if (!env.production_model_enabled) {
        return { allowed: false, reason: 'Production model is disabled in current environment (simulation)' };
      }
      break;
    case 'release':
      if (!env.production_release_enabled) {
        return { allowed: false, reason: 'Production release is disabled in current environment (simulation)' };
      }
      break;
  }

  return { allowed: true, reason: 'OK' };
}

// Validate a tool call request
export function validateToolCall(request: ToolCallRequest): PermissionCheckResult {
  // 1. Check agent exists and tool is allowed
  const toolPerm = checkToolPermission(request.agent_id, request.tool_id);
  if (!toolPerm.allowed) return toolPerm;

  // 2. Check forbidden actions
  const forbiddenTools: Record<string, string> = {
    update_daily_kline: 'execute_arbitrary_sql',
    update_adjustment_factors: 'execute_arbitrary_sql',
    update_factor_data: 'execute_arbitrary_sql',
    update_market_factors: 'execute_arbitrary_sql',
    publish_approved_signal: 'publish_unapproved_signal',
    run_production_model: 'modify_model_code',
  };

  const forbiddenAction = forbiddenTools[request.tool_id];
  if (forbiddenAction) {
    const actionPerm = checkForbiddenAction(request.agent_id, forbiddenAction);
    if (!actionPerm.allowed) return actionPerm;
  }

  // 3. Check production access for production tools
  const productionTools: Record<string, 'write' | 'model' | 'release'> = {
    update_daily_kline: 'write',
    update_adjustment_factors: 'write',
    update_factor_data: 'write',
    update_market_factors: 'write',
    run_production_model: 'model',
    publish_approved_signal: 'release',
  };

  const prodOp = productionTools[request.tool_id];
  if (prodOp) {
    const env = getEnvironmentConfig();
    if (env.mock_tools) {
      // In mock mode, production tools are simulated
      return { allowed: true, reason: 'OK (mock mode)' };
    }
    const prodPerm = checkProductionAccess(prodOp);
    if (!prodPerm.allowed) return prodPerm;
  }

  return { allowed: true, reason: 'OK' };
}

// Record an audit event for an agent action
export function recordAgentAudit(
  agentId: string,
  action: string,
  runId: string | null,
  taskId: string | null,
  inputSummary: Record<string, unknown>,
  outputSummary: Record<string, unknown>,
  statusBefore: string | null,
  statusAfter: string | null,
  details: string
): void {
  const event: AuditEvent = {
    event_id: `evt_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
    timestamp: new Date().toISOString(),
    actor: agentId,
    action,
    run_id: runId,
    task_id: taskId,
    input_summary: inputSummary,
    output_summary: outputSummary,
    status_before: statusBefore,
    status_after: statusAfter,
    gate_changes: [],
    details,
  };
  addAuditEvent(event);
}

// Verify agent preconditions for a task
export function verifyPreconditions(
  agentId: AgentId,
  preconditions: string[],
  context: Record<string, boolean>
): PermissionCheckResult {
  for (const pre of preconditions) {
    if (context[pre] === false) {
      return {
        allowed: false,
        reason: `Precondition ${pre} not met for agent ${agentId}`,
      };
    }
  }
  return { allowed: true, reason: 'OK' };
}
