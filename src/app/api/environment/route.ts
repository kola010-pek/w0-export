import { NextResponse } from 'next/server';
import { loadEnvironmentConfig, getFlatEnvironmentConfig, validateEnvironmentConfig, EnvironmentConfig } from '@/lib/config-validator';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const envName = process.env.ENVIRONMENT || 'sample_staging';
    const config = loadEnvironmentConfig(envName);
    const flatConfig = getFlatEnvironmentConfig(envName);
    
    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Environment config not found',
        environment: envName
      }, { status: 404 });
    }
    
    // config is guaranteed to be non-null here due to the check above
    const validation = validateEnvironmentConfig(config as EnvironmentConfig);
    
    return NextResponse.json({
      success: true,
      data: {
        environment: envName,
        config: flatConfig,
        validation: {
          valid: validation.success,
          block_reasons: validation.block_reasons || []
        }
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to load environment config',
      environment: process.env.ENVIRONMENT || 'sample_staging'
    }, { status: 500 });
  }
}
