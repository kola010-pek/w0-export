// Phase 2: /api/health - Read-only health check endpoint
// No write operations, no SQL, no model startup, no signal release

import { NextResponse } from 'next/server';
import {
  buildPhase2Response,
  isMockMode,
  getEnvironment,
  getDataCutoff,
} from '@/lib/data-source';

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime_seconds: number;
  services: {
    database: 'connected' | 'disconnected' | 'mock';
    cache: 'connected' | 'disconnected' | 'mock';
    model_service: 'disabled' | 'connected' | 'mock';
  };
  safety_flags: {
    production_write_enabled: false;
    production_model_enabled: false;
    production_release_enabled: false;
    sql_input_accepted: false;
    db_path_selectable: false;
  };
}

// Mock health data
function getMockHealthData(): HealthData {
  return {
    status: 'healthy',
    version: '1.0.0',
    uptime_seconds: Math.floor((Date.now() - Date.now() + 3600000) / 1000),
    services: {
      database: 'mock',
      cache: 'mock',
      model_service: 'disabled',
    },
    safety_flags: {
      production_write_enabled: false,
      production_model_enabled: false,
      production_release_enabled: false,
      sql_input_accepted: false,
      db_path_selectable: false,
    },
  };
}

// Real health data (read-only, no write operations)
async function getRealHealthData(): Promise<HealthData> {
  // In real mode, this would connect to actual backend services
  // For Phase 2, we still return mock data but mark it differently
  // Real implementation would check actual service connectivity
  return {
    status: 'healthy',
    version: '1.0.0',
    uptime_seconds: Math.floor(process.uptime()),
    services: {
      database: 'mock', // Would be 'connected' or 'disconnected' in real mode
      cache: 'mock',
      model_service: 'disabled', // Always disabled per safety requirement
    },
    safety_flags: {
      production_write_enabled: false,
      production_model_enabled: false,
      production_release_enabled: false,
      sql_input_accepted: false,
      db_path_selectable: false,
    },
  };
}

export async function GET() {
  try {
    const isMock = isMockMode();
    const data = isMock ? getMockHealthData() : await getRealHealthData();

    // Evaluate overall gate status
    let gateStatus: 'PASS' | 'WARN' | 'BLOCK' = 'PASS';
    const warnings: string[] = [];

    // Check if any service is disconnected
    if (data.services.database === 'disconnected') {
      gateStatus = 'BLOCK';
    } else if (data.services.database === 'mock' && !isMock) {
      warnings.push('database_using_mock_in_real_mode');
      if (gateStatus === 'PASS') gateStatus = 'WARN';
    }

    if (data.services.cache === 'disconnected') {
      warnings.push('cache_disconnected');
      if (gateStatus === 'PASS') gateStatus = 'WARN';
    }

    // Model service must always be disabled
    if (data.services.model_service !== 'disabled') {
      gateStatus = 'BLOCK';
      warnings.push('model_service_should_be_disabled');
    }

    // Safety flags must all be false
    const safetyFlags = Object.values(data.safety_flags);
    if (safetyFlags.some((flag) => flag !== false)) {
      gateStatus = 'BLOCK';
      warnings.push('safety_flag_violation');
    }

    const source = isMock ? 'mock_health_service' : 'real_health_service';

    return NextResponse.json(
      buildPhase2Response({
        data,
        source,
        evidencePrefix: 'health',
        gateStatus,
        warnings: warnings.length > 0 ? warnings : undefined,
      })
    );
  } catch (error) {
    // Interface unreachable or format abnormal - must BLOCK, never degrade to PASS
    return NextResponse.json(
      buildPhase2Response({
        data: null,
        source: 'health_service',
        evidencePrefix: 'health',
        gateStatus: 'BLOCK',
        error: error instanceof Error ? error.message : 'Health check failed',
        success: false,
      }),
      { status: 500 }
    );
  }
}
