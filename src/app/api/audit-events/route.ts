import { NextResponse } from 'next/server';
import { getAuditEvents } from '@/lib/store';

export async function GET() {
  try {
    const events = getAuditEvents();
    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return NextResponse.json({ success: true, data: events.slice(0, 200) });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to get audit events' }, { status: 500 });
  }
}
