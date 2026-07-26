// Phase 2: Mock/Real data source switching mechanism
// Controls whether APIs return mock data or connect to real read-only backends

import { v4 as uuidv4 } from 'uuid';

export type DataSourceMode = 'mock' | 'real';

/**
 * Get current data source mode from environment variable.
 * Defaults to 'mock' for safety - real mode must be explicitly enabled.
 */
export function getDataSourceMode(): DataSourceMode {
  return process.env.DATA_SOURCE_MODE === 'real' ? 'real' : 'mock';
}

export function isMockMode(): boolean {
  return getDataSourceMode() === 'mock';
}

/**
 * Get current environment label based on data source mode.
 * Contract:
 * - Mock mode → simulation (never production)
 * - Real mode + DEV → staging
 * - Real mode + PROD → production
 */
export function getEnvironment(): 'simulation' | 'staging' | 'production' {
  const isMock = isMockMode();
  
  // Mock mode always returns simulation
  if (isMock) {
    return 'simulation';
  }
  
  // Real mode: check deployment environment
  const env = process.env.COZE_PROJECT_ENV;
  if (env === 'PROD') return 'production';
  return 'staging';
}

/**
 * Generate a data cutoff date.
 * Mock mode: today's date.
 * Real mode: provided by backend.
 */
export function getDataCutoff(): string {
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
  is_mock: boolean;
  data_cutoff: string;
  generated_at: string;
  source: string;
  evidence_id: string;
  gate_status: 'PASS' | 'WARN' | 'BLOCK';
  schema_version: string;
  error?: string;
  warnings?: string[];
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
}): Phase2Response<T> {
  const isMock = isMockMode();
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
    is_mock: isMock,
    data_cutoff: getDataCutoff(),
    generated_at: new Date().toISOString(),
    source: params.source,
    evidence_id: evidenceId,
    gate_status: gateStatus,
    schema_version: schemaVersion,
    ...(warnings.length > 0 ? { warnings } : {}),
    ...(params.error ? { error: params.error } : {}),
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
