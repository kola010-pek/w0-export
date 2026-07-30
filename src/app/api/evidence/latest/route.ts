import { NextResponse } from 'next/server';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const evidenceDir = join(process.cwd(), 'evidence');
    
    // List evidence directories
    const entries = readdirSync(evidenceDir).filter(entry => {
      const fullPath = join(evidenceDir, entry);
      return statSync(fullPath).isDirectory() && entry.startsWith('w0-');
    });
    
    // Sort by name (which includes timestamp)
    entries.sort().reverse();
    
    const latestEvidence = entries[0] || null;
    
    return NextResponse.json({
      success: true,
      data: {
        latest_evidence_id: latestEvidence,
        evidence_count: entries.length,
        evidence_list: entries.slice(0, 5), // Return top 5
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to read evidence directory',
      data: {
        latest_evidence_id: null,
        evidence_count: 0,
        evidence_list: []
      }
    });
  }
}
