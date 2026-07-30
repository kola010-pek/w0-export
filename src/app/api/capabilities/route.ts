import { NextResponse } from 'next/server';
import { loadEnvironmentConfig, getFlatEnvironmentConfig } from '@/lib/config-validator';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const envName = process.env.ENVIRONMENT || 'sample_staging';
    const flatConfig = getFlatEnvironmentConfig(envName);
    
    if (!flatConfig) {
      return NextResponse.json({
        success: false,
        error: 'Failed to load environment config',
        environment: envName
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        environment: envName,
        capabilities: {
          production_write_enabled: flatConfig.production_write_enabled,
          production_model_enabled: flatConfig.production_model_enabled,
          production_release_enabled: flatConfig.production_release_enabled,
          human_approval_required: flatConfig.human_approval_required,
          real_db_path_configured: flatConfig.real_db_path_configured,
          readonly_required: flatConfig.readonly_required,
          query_only_required: flatConfig.query_only_required
        },
        safety: {
          fallback_used: flatConfig.fallback_used,
          gate_status: flatConfig.gate_status,
          release_eligibility: flatConfig.release_eligibility
        }
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to load capabilities'
    }, { status: 500 });
  }
}
