import { NextResponse } from 'next/server';
import { getFlatEnvironmentConfig } from '@/lib/config-validator';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const flatConfig = getFlatEnvironmentConfig();
    
    if (!flatConfig) {
      return NextResponse.json({
        success: false,
        error: 'Environment config not found'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        gate_status: flatConfig.gate_status,
        release_eligibility: flatConfig.release_eligibility,
        block_reasons: [],
        fallback_used: flatConfig.fallback_used,
        environment: flatConfig.environment,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get gate status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
