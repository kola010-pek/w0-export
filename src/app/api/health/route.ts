// Phase 2.1: /api/health - Read-only health check with real SQLite support
// Security: Read-only, no SQL input, no write operations

import { NextResponse } from 'next/server';
import {
  buildPhase2Response,
  isMockMode,
  isRealReadonlyMode,
} from '@/lib/data-source';
import {
  getReadOnlyConnection,
  checkDatabaseExists,
  runQuickCheck,
  checkRequiredTables,
} from '@/lib/sqlite-adapter';

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime_seconds: number;
  services: {
    database: 'connected' | 'disconnected' | 'mock' | 'readonly';
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
  database_check?: {
    file_exists: boolean;
    readonly_connection: boolean;
    quick_check: boolean;
    required_tables: boolean;
    table_details?: Array<{ name: string; exists: boolean }>;
  };
}

// Mock health data
function getMockHealthData(): HealthData {
  return {
    status: 'healthy',
    version: '1.0.0',
    uptime_seconds: 3600,
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

// Real health data with SQLite checks
async function getRealHealthData(): Promise<{ data: HealthData; warnings: string[]; gateStatus: 'PASS' | 'WARN' | 'BLOCK' }> {
  const warnings: string[] = [];
  let gateStatus: 'PASS' | 'WARN' | 'BLOCK' = 'PASS';

  // Check database file exists
  const dbExists = checkDatabaseExists();
  
  // Check read-only connection
  const { db, error: connError, isConnected } = getReadOnlyConnection();
  
  // Run quick_check
  const quickCheck = runQuickCheck();
  
  // Check required tables
  const tableCheck = checkRequiredTables();

  const databaseCheck = {
    file_exists: dbExists.exists,
    readonly_connection: isConnected,
    quick_check: quickCheck.ok,
    required_tables: tableCheck.allExist,
    table_details: tableCheck.tables,
  };

  // Evaluate status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  let dbServiceStatus: 'connected' | 'disconnected' | 'readonly' = 'readonly';

  if (!dbExists.exists) {
    status = 'unhealthy';
    dbServiceStatus = 'disconnected';
    gateStatus = 'BLOCK';
    warnings.push('database_file_missing');
  } else if (!isConnected) {
    status = 'unhealthy';
    dbServiceStatus = 'disconnected';
    gateStatus = 'BLOCK';
    warnings.push('database_connection_failed');
  } else if (!quickCheck.ok) {
    status = 'degraded';
    gateStatus = 'WARN';
    warnings.push('database_quick_check_failed');
  } else if (!tableCheck.allExist) {
    status = 'degraded';
    gateStatus = 'BLOCK';
    warnings.push('required_tables_missing');
  }

  const data: HealthData = {
    status,
    version: '1.0.0',
    uptime_seconds: Math.floor(process.uptime()),
    services: {
      database: dbServiceStatus,
      cache: 'mock', // Cache not implemented in Phase 2.1
      model_service: 'disabled', // Always disabled per security requirement
    },
    safety_flags: {
      production_write_enabled: false,
      production_model_enabled: false,
      production_release_enabled: false,
      sql_input_accepted: false,
      db_path_selectable: false,
    },
    database_check: databaseCheck,
  };

  return { data, warnings, gateStatus };
}

export async function GET() {
  try {
    const isMock = isMockMode();
    
    let data: HealthData;
    let warnings: string[] = [];
    let gateStatus: 'PASS' | 'WARN' | 'BLOCK' = 'PASS';

    if (isMock) {
      data = getMockHealthData();
    } else {
      const result = await getRealHealthData();
      data = result.data;
      warnings = result.warnings;
      gateStatus = result.gateStatus;
    }

    // Additional safety checks
    if (data.services.model_service !== 'disabled') {
      gateStatus = 'BLOCK';
      warnings.push('model_service_should_be_disabled');
    }

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
