// Phase 2: Mock/Sample/Real-Readonly data source switching mechanism
// Controls whether APIs return mock data, sample staging data, or real read-only database

import { v4 as uuidv4 } from 'uuid';

export type DataSourceMode = 'mock' | 'sample' | 'real_readonly';

/**
 * Get current data source mode from environment variable.
 * Supported values:
 * - 'mock': Mock data (simulation environment)
 * - 'sample': Sample Staging SQLite (Phase 2.1 baseline)
 * - 'real_readonly': Real financial database read-only (Phase 2.2A)
 *
 * 'real' is treated as alias for 'sample' for backward compatibility.
 * Defaults to 'mock' for safety.
 */
export function getDataSourceMode(): DataSourceMode {
  const raw = process.env.DATA_SOURCE_MODE;
  if (raw === 'real_readonly') return 'real_readonly';
  if (raw === 'sample' || raw === 'real') return 'sample';
  return 'mock';
}

export function isMockMode(): boolean {
  return getDataSourceMode() === 'mock';
}

/**
 * Check if the current data source is the real financial database (read-only).
 */
export function isRealReadonlyMode(): boolean {
  return getDataSourceMode() === 'real_readonly';
}

/**
 * Check if the current database is a real financial database.
 * Returns false for sample/staging databases.
 * This is determined by checking if the SQLITE_IS_REAL_FINANCIAL_DB env var is set to 'true'.
 */
export function isRealFinancialDatabase(): boolean {
  return process.env.SQLITE_IS_REAL_FINANCIAL_DB === 'true';
}

/**
 * Get current environment label based on data source mode.
 * Contract:
 * - Mock mode -> simulation (never production)
 * - Sample mode -> staging (Phase 2.1 baseline)
 * - Real Readonly mode -> staging (Phase 2.2A, production not allowed)
 *
 * Production environment is reserved for future phases with full safety controls.
 */
export function getEnvironment(): 'simulation' | 'staging' | 'production' {
  const mode = getDataSourceMode();
  
  // Mock mode always returns simulation
  if (mode === 'mock') {
    return 'simulation';
  }
  
  // Both sample and real_readonly return staging
  // Production is reserved for future phases
  return 'staging';
}

/**
 * Get the data_source_kind label for API responses.
 * - mock -> 'mock_data'
 * - sample -> 'sample_staging_database'
 * - real_readonly -> 'production_database_readonly'
 */
export function getDataSourceKind(): string {
  const mode = getDataSourceMode();
  switch (mode) {
    case 'mock': return 'mock_data';
    case 'sample': return 'sample_staging_database';
    case 'real_readonly': return 'production_database_readonly';
    default: return 'unknown';
  }
}

/**
 * Generate a data cutoff date.
 * Mock mode: today's date.
 * Sample mode: latest trade date from sample staging database.
 * Real Readonly mode: today's date (real DB preflight handles its own cutoff).
 */
export function getDataCutoff(): string {
  const mode = getDataSourceMode();
  
  if (mode === 'sample') {
    try {
      // Try to get the latest trade date from the sample staging database
      const Database = require('better-sqlite3');
      const dbPath = process.env.SQLITE_DB_PATH || './data/staging.db';
      const db = new Database(dbPath, { readonly: true, fileMustExist: true });
      
      const tables = ['daily_kline', 'adjustment_factors', 'factor_data', 'market_factors'];
      const latestDates: string[] = [];
      
      for (const table of tables) {
        const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
        if (tableCheck) {
          const latestRow = db.prepare(`SELECT trade_date as latest_date FROM ${table} ORDER BY trade_date DESC LIMIT 1`).get() as any;
          if (latestRow?.latest_date) {
            latestDates.push(latestRow.latest_date);
          }
        }
      }
      
      db.close();
      
      if (latestDates.length > 0) {
        latestDates.sort().reverse();
        return latestDates[0];
      }
    } catch (error) {
      // Fall back to system date if database is not accessible
    }
  }
  
  // For mock and real_readonly modes, return today's date
  // real_readonly mode's preflight API computes its own cutoff from the real DB
  return new Date().toISOString().split('T')[0];
}

/**
 * Generate a unique evidence ID.
 */
export function generateEvidenceId(prefix: string): string {
  const mode = getDataSourceMode();
  const suffix = uuidv4().replace(/-/g, '').slice(0, 12);
  return `evt_${prefix}_${mode}_${suffix}`;
}

/**
 * Standard Phase 2 response envelope.
 * All read-only APIs must wrap their data in this structure.
 */
export interface Phase2Response<T> {
  success: boolean;
  data: T;
  environment: 'simulation' | 'staging' | 'production';
  data_source_kind: string;
  is_mock: boolean;
  is_sample: boolean;
  fallback_used: boolean;
  data_cutoff: string;
  generated_at: string;
  source: string;
  evidence_id: string;
  gate_status: 'PASS' | 'WARN' | 'BLOCK';
  schema_version: string;
  error?: string;
  warnings?: string[];
  // Final status summary fields
  service_health?: 'PASS' | 'WARN' | 'BLOCK';
  quality_gate_status?: 'PASS' | 'WARN' | 'BLOCK';
  readiness?: 'PASS' | 'WARN' | 'BLOCK';
  release_eligibility?: 'PASS' | 'BLOCK';
}

/**
 * Build a standard Phase 2 response with metadata consistency validation.
 * Validates: environment/is_mock/source consistency, evidence completeness, schema version.
 */
export function buildPhase2Response<T>(params: {
  data: T;
  source: string;
  evidencePrefix: string;
  gateStatus?: 'PASS' | 'WARN' | 'BLOCK';
  warnings?: string[];
  error?: string;
  success?: boolean;
  extra?: {
    service_health?: 'PASS' | 'WARN' | 'BLOCK';
    quality_gate_status?: 'PASS' | 'WARN' | 'BLOCK';
    readiness?: 'PASS' | 'WARN' | 'BLOCK';
    release_eligibility?: 'PASS' | 'BLOCK';
  };
}): Phase2Response<T> {
  const isMock = isMockMode();
  const mode = getDataSourceMode();
  const environment = getEnvironment();
  const warnings = [...(params.warnings || [])];
  let gateStatus = params.gateStatus || (params.error ? 'BLOCK' : 'PASS');

  // ============ Metadata Consistency Gates ============
  
  // Gate 1: production + is_mock is invalid
  if (environment === 'production' && isMock) {
    gateStatus = 'BLOCK';
    warnings.push('metadata_conflict: production environment with mock data');
  }

  // Gate 2: mock source + non-simulation environment is invalid
  if (params.source.startsWith('mock_') && environment !== 'simulation') {
    if (gateStatus !== 'BLOCK') {
      gateStatus = 'WARN';
    }
    warnings.push('metadata_conflict: mock source in non-simulation environment');
  }

  // Gate 3: real source + simulation environment is suspicious
  if (params.source.startsWith('real_') && environment === 'simulation') {
    if (gateStatus !== 'BLOCK') {
      gateStatus = 'WARN';
    }
    warnings.push('metadata_conflict: real source in simulation environment');
  }

  // Gate 4: evidence_id format validation
  const evidenceId = generateEvidenceId(params.evidencePrefix);
  if (!evidenceId || !evidenceId.startsWith('evt_')) {
    gateStatus = 'BLOCK';
    warnings.push('evidence_missing: invalid evidence_id format');
  }

  // Gate 5: schema_version must be present and valid
  const schemaVersion = '1.0';
  if (!schemaVersion || !/^\d+\.\d+$/.test(schemaVersion)) {
    gateStatus = 'BLOCK';
    warnings.push('schema_mismatch: invalid schema_version');
  }

  return {
    success: params.success !== undefined ? params.success : !params.error,
    data: params.data,
    environment,
    data_source_kind: getDataSourceKind(),
    is_mock: isMock,
    is_sample: mode === 'sample',
    fallback_used: false,
    data_cutoff: getDataCutoff(),
    generated_at: new Date().toISOString(),
    source: params.source,
    evidence_id: evidenceId,
    gate_status: gateStatus,
    schema_version: schemaVersion,
    ...(warnings.length > 0 ? { warnings } : {}),
    ...(params.error ? { error: params.error } : {}),
    ...(params.extra?.service_health ? { service_health: params.extra.service_health } : {}),
    ...(params.extra?.quality_gate_status ? { quality_gate_status: params.extra.quality_gate_status } : {}),
    ...(params.extra?.readiness ? { readiness: params.extra.readiness } : {}),
    ...(params.extra?.release_eligibility ? { release_eligibility: params.extra.release_eligibility } : {}),
  };
}

/**
 * Evaluate gate status based on data freshness.
 * Returns BLOCK if data is older than maxAgeHours, WARN if older than warnAgeHours.
 */
export function evaluateDataFreshness(
  lastUpdated: string,
  warnAgeHours: number = 24,
  maxAgeHours: number = 48
): 'PASS' | 'WARN' | 'BLOCK' {
  const lastUpdatedDate = new Date(lastUpdated);
  const now = new Date();
  const ageHours = (now.getTime() - lastUpdatedDate.getTime()) / (1000 * 60 * 60);

  if (ageHours > maxAgeHours) return 'BLOCK';
  if (ageHours > warnAgeHours) return 'WARN';
  return 'PASS';
}
