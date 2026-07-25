import { NextRequest, NextResponse } from 'next/server';
import { runScenario, SCENARIOS } from '@/lib/mock/scenarios';
import type { ScenarioId } from '@/lib/types';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: SCENARIOS.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
    })),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenario_id } = body;

    if (!scenario_id || !['scenario_a', 'scenario_b', 'scenario_c'].includes(scenario_id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid scenario_id. Must be scenario_a, scenario_b, or scenario_c' },
        { status: 400 }
      );
    }

    const result = runScenario(scenario_id as ScenarioId);
    return NextResponse.json({
      success: result.success,
      data: {
        run_id: result.run?.run_id,
        status: result.run?.status,
        scenario: scenario_id,
        steps: result.steps,
        message: result.message,
      },
      mock: true,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to run scenario' }, { status: 500 });
  }
}
