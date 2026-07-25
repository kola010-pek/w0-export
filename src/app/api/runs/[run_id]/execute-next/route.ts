import { NextRequest, NextResponse } from 'next/server';
import { executeNext } from '@/lib/dag';
import { executeRunStepByStep } from '@/lib/mock/scenarios';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ run_id: string }> }
) {
  try {
    const { run_id } = await params;
    const result = executeRunStepByStep(run_id);
    return NextResponse.json({
      success: result.success,
      data: {
        node: result.node,
        status: result.status,
        message: result.message,
      },
      mock: true,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to execute next' }, { status: 500 });
  }
}
