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
 * Get current environment label.
 */
export function getEnvironment(): 'simulation' | 'staging' | 'production' {
  const env = process.env.COZE_PROJECT_ENV;
  if (env === 'PROD') return 'production';
  if (env === 'STAGING') return 'staging';
  return 'simulation';
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
 * Build a standard Phase 2 response.
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
  const gateStatus = params.gateStatus || (params.error ? 'BLOCK' : 'PASS');

  return {
    success: params.success !== undefined ? params.success : !params.error,
    data: params.data,
    environment: getEnvironment(),
    is_mock: isMock,
    data_cutoff: getDataCutoff(),
    generated_at: new Date().toISOString(),
    source: params.source,
    evidence_id: generateEvidenceId(params.evidencePrefix),
    gate_status: gateStatus,
    schema_version: '1.0',
    ...(params.warnings ? { warnings: params.warnings } : {}),
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
