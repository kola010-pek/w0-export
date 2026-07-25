import { NextRequest, NextResponse } from 'next/server';
import { retryTask } from '@/lib/dag';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ task_id: string }> }
) {
  try {
    const { task_id } = await params;
    const result = retryTask(task_id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: { task: result.task, message: result.message } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to retry task' }, { status: 500 });
  }
}
