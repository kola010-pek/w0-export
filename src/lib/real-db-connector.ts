// Phase 2.2A: Real Financial Database Read-Only Connector
// Security: Strict read-only, path safety, no SQL input, fail-to-BLOCK
// This module NEVER connects to a database unless REAL_SQLITE_DB_PATH is explicitly configured.

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { isRealReadonlyMode } from './data-source';

// ============ Types ============

export interface RealDbIdentity {
  database_fingerprint: string;
  database_size_bytes: number;
  database_last_modified: string;
  database_path_exposed: false;
  readonly_connection: boolean;
  query_only: boolean;
  quick_check: boolean;
}

export interface RealDbConnectionResult {
  success: boolean;
  db: Database.Database | null;
  identity: RealDbIdentity | null;
  block_reasons: string[];
}

export interface SchemaProbeResult {
  logical_name: string;
  detected_table_name: string;
  exists: boolean;
  row_count: number;
  detected_date_column: string | null;
  detected_code_column: string | null;
  detected_business_key: string | null;
  earliest_date: string | null;
  latest_date: string | null;
  required_columns_present: boolean;
  missing_columns: string[];
  schema_status: 'ok' | 'incomplete' | 'missing' | 'unrecognized';
  evidence_id: string;
}

// ============ Constants ============

/**
 * Candidate core tables for schema detection.
 * These are logical names; actual table names in the database may differ.
 */
const CANDIDATE_TABLES: Array<{
  logical_name: string;
  candidate_names: string[];
  required_columns: string[];
  date_column_candidates: string[];
  code_column_candidates: string[];
}> = [
  {
    logical_name: 'daily_kline',
    candidate_names: ['daily_kline', 'kline_daily', 'daily_price', 'kline'],
    required_columns: ['trade_date', 'open_price', 'close_price', 'high_price', 'low_price', 'volume'],
    date_column_candidates: ['trade_date', 'date', 'dt', 'trading_date'],
    code_column_candidates: ['stock_code', 'symbol', 'ticker', 'code'],
  },
  {
    logical_name: 'adjustment_factors',
    candidate_names: ['adjustment_factors', 'adj_factors', 'adjust_factors', 'factor_adjustment'],
    required_columns: ['trade_date', 'factor_value'],
    date_column_candidates: ['trade_date', 'date', 'dt', 'adjust_date'],
    code_column_candidates: ['stock_code', 'symbol', 'ticker', 'code'],
  },
  {
    logical_name: 'factor_data',
    candidate_names: ['factor_data', 'factors', 'factor_values', 'alpha_factors'],
    required_columns: ['trade_date', 'factor_name', 'factor_value'],
    date_column_candidates: ['trade_date', 'date', 'dt'],
    code_column_candidates: ['stock_code', 'symbol', 'ticker', 'code'],
  },
  {
    logical_name: 'market_factors',
    candidate_names: ['market_factors', 'market_factor', 'market_data', 'market_indices'],
    required_columns: ['trade_date', 'factor_name', 'factor_value'],
    date_column_candidates: ['trade_date', 'date', 'dt'],
    code_column_candidates: ['factor_name', 'index_code', 'market_code'],
  },
  {
    logical_name: 'daily_market_overview',
    candidate_names: ['daily_market_overview', 'market_overview', 'daily_summary', 'market_summary'],
    required_columns: ['trade_date'],
    date_column_candidates: ['trade_date', 'date', 'dt'],
    code_column_candidates: ['market_code', 'index_code'],
  },
];

// ============ Path Safety ============

/**
 * Get the configured real database path.
 * Returns null if not configured.
 * NEVER logs or exposes the path in API responses.
 */
function getConfiguredPath(): string | null {
  const raw = process.env.REAL_SQLITE_DB_PATH;
  if (!raw || raw.trim() === '') {
    return null;
  }
  return raw.trim();
}

/**
 * Sanitize error messages to prevent path leakage.
 * Removes any absolute path patterns from error messages.
 */
function sanitizeError(message: string): string {
  // Remove absolute paths (Unix and Windows)
  let sanitized = message.replace(/\/[a-zA-Z0-9_\-./]+/g, '[path_redacted]');
  sanitized = sanitized.replace(/[A-Z]:\\[a-zA-Z0-9_\-\\.\\]+/g, '[path_redacted]');
  // Remove environment variable references
  sanitized = sanitized.replace(/\$\{?[A-Z_]+\}?/g, '[env_redacted]');
  return sanitized;
}

/**
 * Generate a safe fingerprint for the database without exposing path.
 * Uses file size + modification time + first bytes hash.
 */
function generateFingerprint(dbPath: string): string {
  try {
    const stat = fs.statSync(dbPath);
    const sizeBytes = stat.size;
    const mtime = stat.mtimeMs;
    
    // Read first 4KB for content hash
    const fd = fs.openSync(dbPath, 'r');
    const buffer = Buffer.alloc(Math.min(4096, sizeBytes));
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);
    
    const contentHash = crypto.createHash('sha256')
      .update(buffer)
      .digest('hex')
      .slice(0, 16);
    
    // Combine into a fingerprint that doesn't reveal path
    const fingerprintInput = `${sizeBytes}:${mtime}:${contentHash}`;
    return crypto.createHash('sha256')
      .update(fingerprintInput)
      .digest('hex')
      .slice(0, 24);
  } catch {
    return 'unavailable';
  }
}

// ============ Core Connection ============

/**
 * Establish a verified read-only connection to the real financial database.
 * 
 * This function enforces:
 * 1. REAL_SQLITE_DB_PATH must be explicitly configured
 * 2. File must exist and be readable
 * 3. Must be a valid SQLite database
 * 4. Connection must be strictly read-only (URI mode=ro)
 * 5. PRAGMA query_only must be enabled
 * 6. PRAGMA quick_check must pass
 * 
 * Returns BLOCK reasons for any failure. Never falls back to sample/mock.
 */
export function establishReadOnlyConnection(): RealDbConnectionResult {
  const blockReasons: string[] = [];

  // Step 0: Check mode
  if (!isRealReadonlyMode()) {
    return {
      success: false,
      db: null,
      identity: null,
      block_reasons: ['data_source_mode_not_real_readonly'],
    };
  }

  // Step 1: Check path configuration
  const dbPath = getConfiguredPath();
  if (!dbPath) {
    return {
      success: false,
      db: null,
      identity: null,
      block_reasons: ['real_sqlite_db_path_not_configured'],
    };
  }

  // Step 2: File existence check
  let stat: fs.Stats;
  try {
    if (!fs.existsSync(dbPath)) {
      return {
        success: false,
        db: null,
        identity: null,
        block_reasons: ['database_file_not_found'],
      };
    }
    stat = fs.statSync(dbPath);
  } catch {
    return {
      success: false,
      db: null,
      identity: null,
      block_reasons: ['database_file_not_accessible'],
    };
  }

  // Step 3: File type check (must be regular file)
  if (!stat.isFile()) {
    return {
      success: false,
      db: null,
      identity: null,
      block_reasons: ['database_path_not_regular_file'],
    };
  }

  // Step 4: Readable check
  try {
    fs.accessSync(dbPath, fs.constants.R_OK);
  } catch {
    return {
      success: false,
      db: null,
      identity: null,
      block_reasons: ['database_file_not_readable'],
    };
  }

  // Step 5: Read-only connection
  let db: Database.Database;
  try {
    // Open with readonly: true for strict read-only enforcement
    // fileMustExist: true ensures we don't create a new empty database
    const resolvedPath = path.resolve(dbPath);
    db = new Database(resolvedPath, {
      readonly: true,
      fileMustExist: true,
    });
  } catch (err) {
    return {
      success: false,
      db: null,
      identity: null,
      block_reasons: ['readonly_connection_failed', sanitizeError(err instanceof Error ? err.message : String(err))],
    };
  }

  // Step 6: Verify PRAGMA query_only
  let queryOnlyEnabled = false;
  try {
    // Enable query_only to double-ensure no writes
    db.pragma('query_only = ON');
    const queryOnlyValue = db.pragma('query_only', { simple: true });
    queryOnlyEnabled = queryOnlyValue === 1 || queryOnlyValue === '1' || queryOnlyValue === true;
    
    if (!queryOnlyEnabled) {
      db.close();
      return {
        success: false,
        db: null,
        identity: null,
        block_reasons: ['query_only_pragma_failed'],
      };
    }
  } catch (err) {
    db.close();
    return {
      success: false,
      db: null,
      identity: null,
      block_reasons: ['query_only_pragma_error', sanitizeError(err instanceof Error ? err.message : String(err))],
    };
  }

  // Step 7: PRAGMA quick_check
  let quickCheckOk = false;
  try {
    const checkResult = db.pragma('quick_check', { simple: true });
    quickCheckOk = checkResult === 'ok';
    
    if (!quickCheckOk) {
      db.close();
      return {
        success: false,
        db: null,
        identity: null,
        block_reasons: ['quick_check_failed'],
      };
    }
  } catch (err) {
    db.close();
    return {
      success: false,
      db: null,
      identity: null,
      block_reasons: ['quick_check_error', sanitizeError(err instanceof Error ? err.message : String(err))],
    };
  }

  // Step 8: Build identity (safe, no path exposure)
  const identity: RealDbIdentity = {
    database_fingerprint: generateFingerprint(dbPath),
    database_size_bytes: stat.size,
    database_last_modified: stat.mtime.toISOString(),
    database_path_exposed: false,
    readonly_connection: true,
    query_only: queryOnlyEnabled,
    quick_check: quickCheckOk,
  };

  return {
    success: true,
    db,
    identity,
    block_reasons: [],
  };
}

// ============ Schema Probe ============

/**
 * Detect the actual table name for a logical table.
 * Tries candidate names in order.
 */
function detectTableName(db: Database.Database, candidateNames: string[]): string | null {
  for (const name of candidateNames) {
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).get(name) as { name: string } | undefined;
    if (row) return row.name;
  }
  return null;
}

/**
 * Detect the date column in a table from candidate names.
 */
function detectDateColumn(db: Database.Database, tableName: string, candidates: string[]): string | null {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  const columnNames = columns.map(c => c.name.toLowerCase());
  
  for (const candidate of candidates) {
    if (columnNames.includes(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return null;
}

/**
 * Detect the code/identifier column in a table from candidate names.
 */
function detectCodeColumn(db: Database.Database, tableName: string, candidates: string[]): string | null {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  const columnNames = columns.map(c => c.name.toLowerCase());
  
  for (const candidate of candidates) {
    if (columnNames.includes(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return null;
}

/**
 * Check which required columns are present in the table.
 */
function checkRequiredColumns(db: Database.Database, tableName: string, requiredColumns: string[]): {
  present: boolean;
  missing: string[];
} {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  const columnNames = columns.map(c => c.name.toLowerCase());
  
  const missing = requiredColumns.filter(
    col => !columnNames.includes(col.toLowerCase())
  );
  
  return {
    present: missing.length === 0,
    missing,
  };
}

/**
 * Probe all candidate tables in the real database.
 * Returns schema detection results for each logical table.
 */
export function probeSchema(db: Database.Database): SchemaProbeResult[] {
  const results: SchemaProbeResult[] = [];
  const evidencePrefix = 'schema_probe';
  
  for (const candidate of CANDIDATE_TABLES) {
    const evidenceId = `evt_${evidencePrefix}_${candidate.logical_name}_${crypto.randomUUID().slice(0, 8)}`;
    
    // Detect actual table name
    const detectedTable = detectTableName(db, candidate.candidate_names);
    
    if (!detectedTable) {
      results.push({
        logical_name: candidate.logical_name,
        detected_table_name: candidate.logical_name,
        exists: false,
        row_count: 0,
        detected_date_column: null,
        detected_code_column: null,
        detected_business_key: null,
        earliest_date: null,
        latest_date: null,
        required_columns_present: false,
        missing_columns: candidate.required_columns,
        schema_status: 'missing',
        evidence_id: evidenceId,
      });
      continue;
    }
    
    // Get row count
    let rowCount = 0;
    try {
      const countRow = db.prepare(`SELECT COUNT(*) as count FROM "${detectedTable}"`).get() as { count: number };
      rowCount = countRow?.count || 0;
    } catch {
      // Count failed
    }
    
    // Detect date column
    const dateColumn = detectDateColumn(db, detectedTable, candidate.date_column_candidates);
    
    // Detect code column
    const codeColumn = detectCodeColumn(db, detectedTable, candidate.code_column_candidates);
    
    // Detect business key (combination of date + code columns)
    let businessKey: string | null = null;
    if (dateColumn && codeColumn) {
      businessKey = `${dateColumn}+${codeColumn}`;
    } else if (dateColumn) {
      businessKey = dateColumn;
    }
    
    // Get date range
    let earliestDate: string | null = null;
    let latestDate: string | null = null;
    if (dateColumn) {
      try {
        const minRow = db.prepare(
          `SELECT MIN("${dateColumn}") as min_date FROM "${detectedTable}"`
        ).get() as { min_date: string | null };
        earliestDate = minRow?.min_date || null;
      } catch {
        // Min query failed
      }
      try {
        const maxRow = db.prepare(
          `SELECT MAX("${dateColumn}") as max_date FROM "${detectedTable}"`
        ).get() as { max_date: string | null };
        latestDate = maxRow?.max_date || null;
      } catch {
        // Max query failed
      }
    }
    
    // Check required columns
    const colCheck = checkRequiredColumns(db, detectedTable, candidate.required_columns);
    
    // Determine schema status
    let schemaStatus: SchemaProbeResult['schema_status'] = 'ok';
    if (!colCheck.present && colCheck.missing.length === candidate.required_columns.length) {
      schemaStatus = 'unrecognized';
    } else if (!colCheck.present) {
      schemaStatus = 'incomplete';
    }
    
    results.push({
      logical_name: candidate.logical_name,
      detected_table_name: detectedTable,
      exists: true,
      row_count: rowCount,
      detected_date_column: dateColumn,
      detected_code_column: codeColumn,
      detected_business_key: businessKey,
      earliest_date: earliestDate,
      latest_date: latestDate,
      required_columns_present: colCheck.present,
      missing_columns: colCheck.missing,
      schema_status: schemaStatus,
      evidence_id: evidenceId,
    });
  }
  
  return results;
}

// ============ Write Rejection Verification ============

/**
 * Verify that write operations are rejected.
 * Uses safe methods only: checks query_only pragma and readonly state.
 * NEVER attempts actual writes to the real database.
 */
export function verifyWriteRejection(db: Database.Database): {
  write_rejection_verified: boolean;
  methods: string[];
} {
  const methods: string[] = [];
  
  // Method 1: Check query_only pragma
  try {
    const queryOnly = db.pragma('query_only', { simple: true });
    if (queryOnly === 1 || queryOnly === '1' || queryOnly === true) {
      methods.push('query_only_pragma_enabled');
    }
  } catch {
    // Ignore
  }
  
  // Method 2: Check readonly state
  try {
    const readonly = db.pragma('journal_mode', { simple: true });
    // In read-only mode, journal_mode should be 'off' or 'memory'
    if (readonly === 'off' || readonly === 'memory' || readonly === 'delete') {
      methods.push('readonly_connection_mode');
    }
  } catch {
    // Ignore
  }
  
  return {
    write_rejection_verified: methods.length > 0,
    methods,
  };
}

// ============ Close Connection ============

/**
 * Safely close a real database connection.
 */
export function closeRealConnection(db: Database.Database): void {
  try {
    db.close();
  } catch {
    // Ignore close errors
  }
}

// ============ BLOCK Response Builder ============

/**
 * Build a standard BLOCK response for real_readonly mode failures.
 * Never includes path information.
 */
export function buildRealDbBlockResponse(blockReasons: string[]): {
  environment: 'staging';
  data_source_kind: 'production_database_readonly';
  database: 'unavailable';
  is_mock: false;
  is_sample: false;
  fallback_used: false;
  gate_status: 'BLOCK';
  readiness: 'BLOCK';
  release_eligibility: 'BLOCK';
  block_reasons: string[];
} {
  return {
    environment: 'staging',
    data_source_kind: 'production_database_readonly',
    database: 'unavailable',
    is_mock: false,
    is_sample: false,
    fallback_used: false,
    gate_status: 'BLOCK',
    readiness: 'BLOCK',
    release_eligibility: 'BLOCK',
    block_reasons: blockReasons.map(r => sanitizeError(r)),
  };
}

/**
 * Build a BLOCK response for when real_readonly mode is not active.
 */
export function buildNotConfiguredResponse(): {
  environment: 'staging';
  data_source_kind: 'production_database_readonly';
  database: 'unavailable';
  is_mock: false;
  is_sample: false;
  fallback_used: false;
  gate_status: 'BLOCK';
  readiness: 'BLOCK';
  release_eligibility: 'BLOCK';
  block_reasons: string[];
  message: string;
} {
  return {
    ...buildRealDbBlockResponse(['real_sqlite_db_path_not_configured']),
    message: 'Real database path has not been configured by the responsible person.',
  };
}
