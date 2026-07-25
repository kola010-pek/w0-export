import { NextRequest, NextResponse } from 'next/server';
import { getAgentConfigs } from '@/lib/config-loader';

export async function GET() {
  try {
    const configs = getAgentConfigs();
    const agents = Object.values(configs).map(a => ({
      agent_id: a.agent_id,
      display_name: a.display_name,
      domain: a.domain,
      role: a.role,
      goal: a.goal,
      allowed_tools: a.allowed_tools,
      forbidden_actions: a.forbidden_actions,
      status: 'IDLE',
    }));
    return NextResponse.json({ success: true, data: agents });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to load agents' },
      { status: 500 }
    );
  }
}
