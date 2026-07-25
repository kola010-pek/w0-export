import { NextRequest, NextResponse } from 'next/server';
import { getGates } from '@/lib/store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ run_id: string }> }
) {
  try {
    const { run_id } = await params;
    const gates = getGates(run_id);
    return NextResponse.json({ success: true, data: gates });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to get gates' }, { status: 500 });
  }
}
