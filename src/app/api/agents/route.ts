import { NextResponse } from 'next/server';
import { getAgentConfigs } from '@/lib/config-loader';
import { checkToolPermission, checkForbiddenAction, checkProductionAccess } from '@/lib/agent-engine';

interface PermissionTest {
  test_name: string;
  agent_id: string;
  tool_or_action: string;
  expected: 'ALLOWED' | 'DENIED';
  actual: 'ALLOWED' | 'DENIED';
  passed: boolean;
  reason: string;
}

export async function GET() {
  try {
    const configs = getAgentConfigs();
    const agents = Object.values(configs).map(a => {
      // Run permission tests for each agent
      const tests: PermissionTest[] = [];

      // Test 1: Each allowed tool should be ALLOWED
      for (const tool of a.allowed_tools) {
        const result = checkToolPermission(a.agent_id, tool);
        tests.push({
          test_name: `allowed_tool_${tool}`,
          agent_id: a.agent_id,
          tool_or_action: tool,
          expected: 'ALLOWED',
          actual: result.allowed ? 'ALLOWED' : 'DENIED',
          passed: result.allowed === true,
          reason: result.reason,
        });
      }

      // Test 2: Each forbidden action should be DENIED
      for (const action of a.forbidden_actions) {
        const result = checkForbiddenAction(a.agent_id, action);
        tests.push({
          test_name: `forbidden_action_${action}`,
          agent_id: a.agent_id,
          tool_or_action: action,
          expected: 'DENIED',
          actual: result.allowed ? 'ALLOWED' : 'DENIED',
          passed: result.allowed === false,
          reason: result.reason,
        });
      }

      // Test 3: Cross-domain tool access should be DENIED
      const otherAgentTools = Object.values(configs)
        .filter(other => other.agent_id !== a.agent_id)
        .flatMap(other => other.allowed_tools);
      const uniqueOtherTools = [...new Set(otherAgentTools)];
      const crossDomainTests = uniqueOtherTools
        .filter(tool => !a.allowed_tools.includes(tool))
        .slice(0, 3); // Test up to 3 cross-domain tools
      for (const tool of crossDomainTests) {
        const result = checkToolPermission(a.agent_id, tool);
        tests.push({
          test_name: `cross_domain_${tool}`,
          agent_id: a.agent_id,
          tool_or_action: tool,
          expected: 'DENIED',
          actual: result.allowed ? 'ALLOWED' : 'DENIED',
          passed: result.allowed === false,
          reason: result.reason,
        });
      }

      const passCount = tests.filter(t => t.passed).length;

      return {
        agent_id: a.agent_id,
        display_name: a.display_name,
        domain: a.domain,
        role: a.role,
        goal: a.goal,
        allowed_tools: a.allowed_tools,
        forbidden_actions: a.forbidden_actions,
        handoff_to: a.handoff_to,
        approval_required: a.approval_required,
        status: 'IDLE',
        permission_tests: tests,
        test_summary: {
          total: tests.length,
          passed: passCount,
          failed: tests.length - passCount,
          pass_rate: tests.length > 0 ? `${Math.round((passCount / tests.length) * 100)}%` : 'N/A',
        },
      };
    });

    // Also test production access controls
    const prodTests = [
      { op: 'write' as const, ...checkProductionAccess('write') },
      { op: 'model' as const, ...checkProductionAccess('model') },
      { op: 'release' as const, ...checkProductionAccess('release') },
    ];

    return NextResponse.json({
      success: true,
      data: agents,
      production_controls: prodTests.map(t => ({
        operation: t.op,
        allowed: t.allowed,
        reason: t.reason,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to load agents' },
      { status: 500 }
    );
  }
}
