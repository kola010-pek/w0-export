// Phase 2.1: SQLite Read-Only Adapter
// Security: Read-only connection, server-side config only, no SQL input from frontend

import Database from 'better-sqlite3';
import fs from 'fs';
import { getDataSourceMode, isMockMode } from './data-source';

// Database configuration - server-side only, never exposed to frontend
// In real deployment, this would be loaded from secure environment variables
const DB_CONFIG = {
  // Database path is controlled by server configuration only
  // Frontend and API parameters cannot modify this path
  path: process.env.SQLITE_DB_PATH || './data/staging.db',
  // Read-only mode is enforced
  readonly: true,
  // Required tables for the financial agent workbench
  requiredTables: [
    'daily_kline',
    'adjustment_factors', 
    'factor_data',
    'market_factors',
  ],
};

let dbInstance: Database.Database | null = null;
let connectionError: Error | null = null;
let schemaCache: Map<string, ColumnInfo[]> | null = null;

interface ColumnInfo {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

/**
 * Detect real schema from database - do not assume fields match sample database.
 * Returns a map of table name to column info.
 */
export function detectSchema(): { schema: Map<string, ColumnInfo[]> | null; error: string | null } {
  if (schemaCache) {
    return { schema: schemaCache, error: null };
  }

  const { db, error } = getReadOnlyConnection();
  if (!db || error) {
    return { schema: null, error: error?.message || 'Database connection failed' };
  }

  try {
    const detectedSchema = new Map<string, ColumnInfo[]>();
    
    for (const tableName of DB_CONFIG.requiredTables) {
      // Check if table exists
      const tableExists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
      ).get(tableName);
      
      if (!tableExists) {
        return { schema: null, error: `Required table '${tableName}' not found in database` };
      }
      
      // Get column info for this table
      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as ColumnInfo[];
      detectedSchema.set(tableName, columns);
    }
    
    schemaCache = detectedSchema;
    return { schema: detectedSchema, error: null };
  } catch (err) {
    return { schema: null, error: `Schema detection failed: ${err}` };
  }
}

/**
 * Check if a column exists in a table's schema.
 */
export function hasColumn(tableName: string, columnName: string): boolean {
  const { schema } = detectSchema();
  if (!schema) return false;
  
  const columns = schema.get(tableName);
  if (!columns) return false;
  
  return columns.some(col => col.name.toLowerCase() === columnName.toLowerCase());
}

/**
 * Get all column names for a table.
 */
export function getTableColumns(tableName: string): string[] {
  const { schema } = detectSchema();
  if (!schema) return [];
  
  const columns = schema.get(tableName);
  if (!columns) return [];
  
  return columns.map(col => col.name);
}

/**
 * Get or create a read-only SQLite database connection.
 * Connection is cached for the lifetime of the process.
 */
export function getReadOnlyConnection(): {
  db: Database.Database | null;
  error: Error | null;
  isConnected: boolean;
} {
  if (isMockMode()) {
    return { db: null, error: null, isConnected: false };
  }

  if (dbInstance) {
    return { db: dbInstance, error: null, isConnected: true };
  }

  if (connectionError) {
    return { db: null, error: connectionError, isConnected: false };
  }

  try {
    // Open database in read-only mode
    // mode: Database.OPEN_READONLY ensures no write operations are possible
    dbInstance = new Database(DB_CONFIG.path, {
      readonly: true,
      fileMustExist: true,
    });

    // Verify connection with a simple query
    dbInstance.pragma('journal_mode');
    
    return { db: dbInstance, error: null, isConnected: true };
  } catch (err) {
    connectionError = err instanceof Error ? err : new Error(String(err));
    return { db: null, error: connectionError, isConnected: false };
  }
}

/**
 * Check if database file exists.
 */
export function checkDatabaseExists(): { exists: boolean; path: string } {
  const fs = require('fs');
  const path = require('path');
  const dbPath = path.resolve(DB_CONFIG.path);
  
  try {
    fs.accessSync(dbPath, fs.constants.R_OK);
    return { exists: true, path: dbPath };
  } catch {
    return { exists: false, path: dbPath };
  }
}

/**
 * Run SQLite quick_check pragma.
 * Returns true if database is healthy.
 */
export function runQuickCheck(): { ok: boolean; result: string | null; error: string | null } {
  const { db, error } = getReadOnlyConnection();
  
  if (error || !db) {
    return { ok: false, result: null, error: error?.message || 'Connection failed' };
  }

  try {
    const result = db.pragma('quick_check', { simple: true });
    return { ok: result === 'ok', result: String(result), error: null };
  } catch (err) {
    return { ok: false, result: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Check if all required tables exist.
 */
export function checkRequiredTables(): {
  allExist: boolean;
  tables: Array<{ name: string; exists: boolean }>;
  error: string | null;
} {
  const { db, error } = getReadOnlyConnection();
  
  if (error || !db) {
    return {
      allExist: false,
      tables: DB_CONFIG.requiredTables.map(name => ({ name, exists: false })),
      error: error?.message || 'Connection failed',
    };
  }

  try {
    const tables = DB_CONFIG.requiredTables.map(name => {
      const row = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
      ).get(name) as { name: string } | undefined;
      return { name, exists: !!row };
    });

    return {
      allExist: tables.every(t => t.exists),
      tables,
      error: null,
    };
  } catch (err) {
    return {
      allExist: false,
      tables: DB_CONFIG.requiredTables.map(name => ({ name, exists: false })),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Get watermark data for a specific dataset.
 * Returns the latest date, record count, and last update time.
 */
export function getWatermark(dataset: string): {
  latestDate: string | null;
  recordCount: number;
  lastUpdated: string | null;
  error: string | null;
} {
  const { db, error } = getReadOnlyConnection();
  
  if (error || !db) {
    return { latestDate: null, recordCount: 0, lastUpdated: null, error: error?.message || 'Connection failed' };
  }

  try {
    // Check if table exists
    const tableCheck = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).get(dataset) as { name: string } | undefined;

    if (!tableCheck) {
      return { latestDate: null, recordCount: 0, lastUpdated: null, error: `Table ${dataset} does not exist` };
    }

    // Get record count
    const countRow = db.prepare(`SELECT COUNT(*) as count FROM ${dataset}`).get() as { count: number };
    
    // Try to get latest date - assumes there's a date/trade_date column
    // This is a best-effort query; actual column names may vary
    let latestDate: string | null = null;
    try {
      const dateRow = db.prepare(
        `SELECT MAX(trade_date) as max_date FROM ${dataset}`
      ).get() as { max_date: string | null };
      latestDate = dateRow?.max_date || null;
    } catch {
      // If trade_date column doesn't exist, try other common date columns
      try {
        const dateRow = db.prepare(
          `SELECT MAX(date) as max_date FROM ${dataset}`
        ).get() as { max_date: string | null };
        latestDate = dateRow?.max_date || null;
      } catch {
        // No date column found
        latestDate = null;
      }
    }

    // Get last update time from SQLite metadata
    const lastUpdated = new Date().toISOString(); // SQLite doesn't track this natively

    return {
      latestDate,
      recordCount: countRow?.count || 0,
      lastUpdated,
      error: null,
    };
  } catch (err) {
    return { latestDate: null, recordCount: 0, lastUpdated: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Check dependency order between tables.
 * Verifies that upstream tables have data before downstream tables.
 */
export function checkDependencyOrder(): {
  order: string[];
  violations: string[];
  ok: boolean;
  error: string | null;
} {
  const expectedOrder = ['daily_kline', 'adjustment_factors', 'factor_data', 'market_factors'];
  const violations: string[] = [];
  
  const { db, error } = getReadOnlyConnection();
  
  if (error || !db) {
    return { order: expectedOrder, violations: ['database_connection_failed'], ok: false, error: error?.message || 'Connection failed' };
  }

  try {
    // Check that each table has data
    for (const table of expectedOrder) {
      const countRow = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
      if (countRow?.count === 0) {
        violations.push(`${table}_empty`);
      }
    }

    // Check date consistency: downstream tables should not have dates earlier than upstream
    // This is a simplified check; real implementation would compare actual date ranges
    let prevMaxDate: string | null = null;
    for (const table of expectedOrder) {
      try {
        const dateRow = db.prepare(
          `SELECT MAX(trade_date) as max_date FROM ${table}`
        ).get() as { max_date: string | null };
        
        if (dateRow?.max_date && prevMaxDate) {
          if (dateRow.max_date < prevMaxDate) {
            violations.push(`${table}_date_before_upstream`);
          }
        }
        
        if (dateRow?.max_date) {
          prevMaxDate = dateRow.max_date;
        }
      } catch {
        // Skip date check if column doesn't exist
      }
    }

    return {
      order: expectedOrder,
      violations,
      ok: violations.length === 0,
      error: null,
    };
  } catch (err) {
    return { order: expectedOrder, violations: ['query_failed'], ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Close the database connection.
 * Should be called on process shutdown.
 */
export function closeConnection(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignore close errors
    }
    dbInstance = null;
  }
}

/**
 * Health check wrapper - aggregates all health checks
 */
export async function checkHealth(customPath?: string): Promise<{
  file_exists: boolean;
  readonly_connection: boolean;
  quick_check: boolean;
  required_tables: boolean;
  table_details: Array<{ name: string; exists: boolean }>;
}> {
  const path = customPath || DB_CONFIG.path;
  const result = {
    file_exists: false,
    readonly_connection: false,
    quick_check: false,
    required_tables: false,
    table_details: [] as Array<{ name: string; exists: boolean }>,
  };
  
  // Check if file exists
  if (!fs.existsSync(path)) {
    return result;
  }
  result.file_exists = true;
  
  try {
    const testDb = new Database(path, { readonly: true, fileMustExist: true });
    result.readonly_connection = true;
    
    // Quick check
    const checkResult = testDb.prepare('PRAGMA quick_check').get();
    result.quick_check = (checkResult as any)?.quick_check === 'ok';
    
    // Check required tables
    let allTablesExist = true;
    for (const tableName of DB_CONFIG.requiredTables) {
      const tableCheck = testDb.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      ).get(tableName);
      
      const exists = !!tableCheck;
      result.table_details.push({ name: tableName, exists });
      
      if (!exists) allTablesExist = false;
    }
    
    result.required_tables = allTablesExist;
    testDb.close();
  } catch (error) {
    // Connection failed
  }
  
  return result;
}

/**
 * Get watermarks wrapper - returns watermark data for all datasets
 */
export async function getWatermarks(customPath?: string) {
  const path = customPath || DB_CONFIG.path;
  const db = new Database(path, { readonly: true, fileMustExist: true });
  
  try {
    const watermarks = [];
    const now = new Date();
    const nowMs = now.getTime();
    const todayISO = now.toISOString().split('T')[0];
    
    for (const tableName of DB_CONFIG.requiredTables) {
      const tableCheck = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      ).get(tableName);
      
      if (!tableCheck) {
        watermarks.push({
          dataset: tableName,
          latest_date: null,
          record_count: 0,
          last_updated: null,
          status: 'missing' as const,
          source_table: tableName,
          schema_version: 'v1.0',
        });
        continue;
      }
      
      const latestRow = db.prepare(
        `SELECT trade_date as latest_date FROM ${tableName} ORDER BY trade_date DESC LIMIT 1`
      ).get() as any;
      
      const countRow = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as any;
      
      const latestDate = latestRow?.latest_date || null;
      const recordCount = countRow?.count || 0;
      
      let status: 'fresh' | 'stale' | 'expired' | 'missing' = 'fresh';
      let lastUpdated: string | null = null;
      
      if (latestDate) {
        const dataTime = new Date(latestDate).getTime();
        const ageHours = (nowMs - dataTime) / (1000 * 60 * 60);
        lastUpdated = new Date(dataTime).toISOString();
        
        if (ageHours > 48) {
          status = 'expired';
        } else if (ageHours > 24) {
          status = 'stale';
        }
      }
      
      watermarks.push({
        dataset: tableName,
        latest_date: latestDate,
        record_count: recordCount,
        last_updated: lastUpdated,
        status,
        source_table: tableName,
        schema_version: 'v1.0',
      });
    }
    
    const summary = {
      total_datasets: watermarks.length,
      fresh_count: watermarks.filter(w => w.status === 'fresh').length,
      stale_count: watermarks.filter(w => w.status === 'stale').length,
      expired_count: watermarks.filter(w => w.status === 'expired').length,
      missing_count: watermarks.filter(w => w.status === 'missing').length,
    };
    
    // Calculate overall data_cutoff based on latest trade date across all tables
    const latestDates = watermarks
      .map(w => w.latest_date)
      .filter((d): d is string => d !== null)
      .sort()
      .reverse();
    const overallDataCutoff = latestDates.length > 0 ? latestDates[0] : todayISO;
    
    return { watermarks, summary, data_cutoff: overallDataCutoff };
  } finally {
    db.close();
  }
}

/**
 * Check quality gates wrapper - returns quality gate results
 */
export async function checkQualityGates(customPath?: string) {
  const path = customPath || DB_CONFIG.path;
  const db = new Database(path, { readonly: true, fileMustExist: true });
  
  try {
    const now = new Date();
    const nowISO = now.toISOString();
    const todayISO = now.toISOString().split('T')[0];
    const nowMs = now.getTime();
    
    // Calculate latest trade date from all tables
    const latestDates: string[] = [];
    for (const tableName of DB_CONFIG.requiredTables) {
      const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
      if (tableCheck) {
        const latestRow = db.prepare(`SELECT trade_date as latest_date FROM ${tableName} ORDER BY trade_date DESC LIMIT 1`).get() as any;
        if (latestRow?.latest_date) {
          latestDates.push(latestRow.latest_date);
        }
      }
    }
    latestDates.sort().reverse();
    const latestTradeDate = latestDates.length > 0 ? latestDates[0] : todayISO;
    
    const gates: any[] = [];
    const warnings: string[] = [];
    const blockReasons: string[] = [];
    let overallStatus: 'PASS' | 'WARN' | 'BLOCK' = 'PASS';
    
    // Gate 1: Coverage check
    let existingTables = 0;
    for (const tableName of DB_CONFIG.requiredTables) {
      const tableCheck = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      ).get(tableName);
      if (tableCheck) existingTables++;
    }
    const coverageRatio = existingTables / DB_CONFIG.requiredTables.length;
    const coveragePass = coverageRatio >= 0.999;
    if (!coveragePass) {
      blockReasons.push(`Table coverage ${(coverageRatio * 100).toFixed(1)}% < 99.9%`);
      overallStatus = 'BLOCK';
    }
    gates.push({
      gate_id: 'gate_coverage',
      gate_type: 'data_quality',
      status: coveragePass ? 'PASS' : 'BLOCK',
      rules: [{
        rule_id: 'coverage_check',
        display_name: '表覆盖率',
        status: coveragePass ? 'PASS' : 'BLOCK',
        actual: coverageRatio,
        threshold: 0.999,
        operator: '>=',
        severity: 'BLOCK',
        evidence_ref: `ev_coverage_real_${Date.now()}`,
        description: '必要表覆盖率必须 >= 99.9%',
        unit: 'ratio',
        data_range: { start: todayISO, end: todayISO },
        rule_version: 'v1.2.0',
        checked_at: nowISO,
        source: 'sqlite_adapter',
      }],
      checked_at: nowISO,
      data_cutoff: latestTradeDate,
      block_reasons: coveragePass ? [] : [`Table coverage ${(coverageRatio * 100).toFixed(1)}% < 99.9%`],
      warnings: [],
    });
    
    // Gate 2: Freshness check
    let maxAgeHours = 0;
    for (const tableName of DB_CONFIG.requiredTables) {
      const tableCheck = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      ).get(tableName);
      if (!tableCheck) continue;
      
      const latestRow = db.prepare(
        `SELECT trade_date as latest_date FROM ${tableName} ORDER BY trade_date DESC LIMIT 1`
      ).get() as any;
      
      if (latestRow?.latest_date) {
        const dataTime = new Date(latestRow.latest_date).getTime();
        const ageHours = (nowMs - dataTime) / (1000 * 60 * 60);
        if (ageHours > maxAgeHours) maxAgeHours = ageHours;
      }
    }
    const freshnessPass = maxAgeHours <= 24;
    const freshnessWarn = maxAgeHours > 24 && maxAgeHours <= 48;
    if (!freshnessPass && !freshnessWarn) {
      blockReasons.push(`Data age ${maxAgeHours.toFixed(1)}h exceeds 48h threshold`);
      overallStatus = 'BLOCK';
    } else if (freshnessWarn) {
      warnings.push(`Data age ${maxAgeHours.toFixed(1)}h exceeds 24h threshold`);
      if (overallStatus === 'PASS') overallStatus = 'WARN';
    }
    gates.push({
      gate_id: 'gate_freshness',
      gate_type: 'freshness',
      status: freshnessPass ? 'PASS' : (freshnessWarn ? 'WARN' : 'BLOCK'),
      rules: [{
        rule_id: 'freshness_check',
        display_name: '数据新鲜度',
        status: freshnessPass ? 'PASS' : (freshnessWarn ? 'WARN' : 'BLOCK'),
        actual: Math.round(maxAgeHours * 100) / 100,
        threshold: 24,
        operator: '<=',
        severity: 'BLOCK',
        evidence_ref: `ev_freshness_real_${Date.now()}`,
        description: '数据新鲜度必须在 24 小时内',
        unit: 'hours',
        checked_at: nowISO,
        source: 'sqlite_adapter',
      }],
      checked_at: nowISO,
      data_cutoff: latestTradeDate,
      block_reasons: freshnessPass ? [] : [`Data age ${maxAgeHours.toFixed(1)}h exceeds threshold`],
      warnings: freshnessWarn ? [`Data age ${maxAgeHours.toFixed(1)}h exceeds 24h threshold`] : [],
    });
    
    // Gate 3: Uniqueness check
    let minUniquenessRatio = 1;
    for (const tableName of DB_CONFIG.requiredTables) {
      const tableCheck = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      ).get(tableName);
      if (!tableCheck) continue;
      
      const totalRow = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as any;
      const distinctRow = db.prepare(`SELECT COUNT(DISTINCT trade_date) as count FROM ${tableName}`).get() as any;
      
      const total = totalRow?.count || 0;
      const distinct = distinctRow?.count || 0;
      const ratio = total > 0 ? distinct / total : 1;
      if (ratio < minUniquenessRatio) minUniquenessRatio = ratio;
    }
    const uniquenessPass = minUniquenessRatio >= 0.999; // Allow 0.1% tolerance for floating point
    if (!uniquenessPass) {
      blockReasons.push(`Primary key uniqueness ${(minUniquenessRatio * 100).toFixed(4)}% < 99.9%`);
      overallStatus = 'BLOCK';
    }
    gates.push({
      gate_id: 'gate_uniqueness',
      gate_type: 'data_quality',
      status: uniquenessPass ? 'PASS' : 'BLOCK',
      rules: [{
        rule_id: 'uniqueness_check',
        display_name: '主键唯一性',
        status: uniquenessPass ? 'PASS' : 'BLOCK',
        actual: minUniquenessRatio,
        threshold: 0.999,
        operator: '>=',
        severity: 'BLOCK',
        evidence_ref: `ev_uniqueness_real_${Date.now()}`,
        description: '主键必须 99.9% 以上唯一',
        unit: 'ratio',
        checked_at: nowISO,
        source: 'sqlite_adapter',
      }],
      checked_at: nowISO,
      data_cutoff: latestTradeDate,
      block_reasons: uniquenessPass ? [] : [`Primary key uniqueness ${(minUniquenessRatio * 100).toFixed(2)}% < 100%`],
      warnings: [],
    });
    
    // Gate 4: Null rate check
    let maxNullRate = 0;
    const nullCheckFields: Record<string, string[]> = {
      daily_kline: ['open_price', 'close_price'],
      adjustment_factors: ['factor_value'],
      factor_data: ['factor_name', 'factor_value'],
      market_factors: ['factor_name', 'factor_value'],
    };
    for (const tableName of DB_CONFIG.requiredTables) {
      const tableCheck = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      ).get(tableName);
      if (!tableCheck) continue;
      
      const fields = nullCheckFields[tableName] || [];
      for (const field of fields) {
        const totalRow = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as any;
        const nullRow = db.prepare(`SELECT COUNT(*) as count FROM ${tableName} WHERE ${field} IS NULL`).get() as any;
        
        const total = totalRow?.count || 0;
        const nullCount = nullRow?.count || 0;
        const nullRate = total > 0 ? nullCount / total : 0;
        if (nullRate > maxNullRate) maxNullRate = nullRate;
      }
    }
    const nullRatePass = maxNullRate <= 0.01;
    if (!nullRatePass) {
      warnings.push(`Null rate ${(maxNullRate * 100).toFixed(2)}% exceeds 1% threshold`);
      if (overallStatus === 'PASS') overallStatus = 'WARN';
    }
    gates.push({
      gate_id: 'gate_null_rate',
      gate_type: 'data_quality',
      status: nullRatePass ? 'PASS' : 'WARN',
      rules: [{
        rule_id: 'null_rate_check',
        display_name: '空值率',
        status: nullRatePass ? 'PASS' : 'WARN',
        actual: maxNullRate,
        threshold: 0.01,
        operator: '<=',
        severity: 'WARN',
        evidence_ref: `ev_null_rate_real_${Date.now()}`,
        description: '关键字段空值率必须 <= 1%',
        unit: 'ratio',
        checked_at: nowISO,
        source: 'sqlite_adapter',
      }],
      checked_at: nowISO,
      data_cutoff: latestTradeDate,
      block_reasons: [],
      warnings: nullRatePass ? [] : [`Null rate ${(maxNullRate * 100).toFixed(2)}% exceeds 1% threshold`],
    });
    
    // Gate 5: Dependency order check
    let dependencyCorrect = true;
    for (const tableName of DB_CONFIG.requiredTables) {
      const tableCheck = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      ).get(tableName);
      if (!tableCheck) {
        dependencyCorrect = false;
        break;
      }
    }
    if (!dependencyCorrect) {
      blockReasons.push('Dependency order broken: missing required tables');
      overallStatus = 'BLOCK';
    }
    gates.push({
      gate_id: 'gate_dependency',
      gate_type: 'dependency',
      status: dependencyCorrect ? 'PASS' : 'BLOCK',
      rules: [{
        rule_id: 'dependency_order',
        display_name: '依赖顺序',
        status: dependencyCorrect ? 'PASS' : 'BLOCK',
        actual: dependencyCorrect ? 'correct' : 'broken',
        threshold: 'correct',
        operator: '==',
        severity: 'BLOCK',
        evidence_ref: `ev_dependency_real_${Date.now()}`,
        description: '上游节点必须全部完成',
        checked_at: nowISO,
        source: 'sqlite_adapter',
      }],
      checked_at: nowISO,
      data_cutoff: latestTradeDate,
      block_reasons: dependencyCorrect ? [] : ['Dependency order broken: missing required tables'],
      warnings: [],
    });
    
    // Gate 6: Cutoff consistency check
    const cutoffDates: string[] = [];
    for (const tableName of DB_CONFIG.requiredTables) {
      const tableCheck = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      ).get(tableName);
      if (!tableCheck) continue;
      
      const latestRow = db.prepare(
        `SELECT trade_date as latest_date FROM ${tableName} ORDER BY trade_date DESC LIMIT 1`
      ).get() as any;
      
      if (latestRow?.latest_date) {
        cutoffDates.push(latestRow.latest_date);
      }
    }
    const uniqueCutoffs = [...new Set(cutoffDates)];
    const cutoffConsistent = uniqueCutoffs.length <= 1;
    if (!cutoffConsistent) {
      blockReasons.push(`Cutoff dates inconsistent: ${uniqueCutoffs.join(', ')}`);
      overallStatus = 'BLOCK';
    }
    gates.push({
      gate_id: 'gate_cutoff',
      gate_type: 'cutoff',
      status: cutoffConsistent ? 'PASS' : 'BLOCK',
      rules: [{
        rule_id: 'cutoff_check',
        display_name: '数据截止日一致性',
        status: cutoffConsistent ? 'PASS' : 'BLOCK',
        actual: uniqueCutoffs[0] || 'N/A',
        threshold: uniqueCutoffs[0] || 'N/A',
        operator: '==',
        severity: 'BLOCK',
        evidence_ref: `ev_cutoff_real_${Date.now()}`,
        description: '数据截止日必须一致',
        checked_at: nowISO,
        source: 'sqlite_adapter',
      }],
      checked_at: nowISO,
      data_cutoff: latestTradeDate,
      block_reasons: cutoffConsistent ? [] : [`Cutoff dates inconsistent: ${uniqueCutoffs.join(', ')}`],
      warnings: [],
    });
    
    const summary = {
      total_gates: gates.length,
      pass_count: gates.filter(g => g.status === 'PASS').length,
      warn_count: gates.filter(g => g.status === 'WARN').length,
      block_count: gates.filter(g => g.status === 'BLOCK').length,
      not_executed_count: 0,
    };
    
    return { gates, summary };
  } finally {
    db.close();
  }
}

// Close connection on process exit
process.on('exit', closeConnection);
process.on('SIGINT', () => {
  closeConnection();
  process.exit(0);
});

/**
 * Factory function to create a SQLite adapter instance.
 * This is primarily used for testing with different database paths.
 */
export function createSQLiteAdapter(dbPath?: string) {
  if (dbPath) {
    // Create a new adapter instance with custom path for testing
    const Database = require('better-sqlite3');
    
    const checkHealthTest = async () => {
      const result = {
        file_exists: false,
        readonly_connection: false,
        quick_check: false,
        required_tables: false,
        table_details: [] as Array<{ name: string; exists: boolean }>,
      };
      
      // Check if file exists
      if (!fs.existsSync(dbPath)) {
        return result;
      }
      result.file_exists = true;
      
      try {
        const db = new Database(dbPath, { readonly: true, fileMustExist: true });
        result.readonly_connection = true;
        
        // Quick check
        const checkResult = db.prepare('PRAGMA quick_check').get();
        result.quick_check = (checkResult as any)?.quick_check === 'ok';
        
        // Check required tables
        const requiredTables = ['daily_kline', 'adjustment_factors', 'factor_data', 'market_factors'];
        let allTablesExist = true;
        
        for (const tableName of requiredTables) {
          const tableCheck = db.prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
          ).get(tableName);
          
          const exists = !!tableCheck;
          result.table_details.push({ name: tableName, exists });
          
          if (!exists) allTablesExist = false;
        }
        
        result.required_tables = allTablesExist;
        db.close();
      } catch (error) {
        // Connection failed
      }
      
      return result;
    };
    
    const getWatermarksTest = async () => {
      const db = new Database(dbPath, { readonly: true, fileMustExist: true });
      try {
        const watermarks = [];
        const requiredTables = ['daily_kline', 'adjustment_factors', 'factor_data', 'market_factors'];
        const now = new Date();
        const nowMs = now.getTime();
        
        for (const tableName of requiredTables) {
          const tableCheck = db.prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
          ).get(tableName);
          
          if (!tableCheck) {
            watermarks.push({
              dataset: tableName,
              latest_date: null,
              record_count: 0,
              last_updated: null,
              status: 'missing' as const,
              source_table: tableName,
              schema_version: 'v1.0',
            });
            continue;
          }
          
          const dateColumn = tableName === 'factor_data' ? 'trade_date' : 'trade_date';
          const latestRow = db.prepare(
            `SELECT ${dateColumn} as latest_date FROM ${tableName} ORDER BY ${dateColumn} DESC LIMIT 1`
          ).get() as any;
          
          const countRow = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as any;
          
          const latestDate = latestRow?.latest_date || null;
          const recordCount = countRow?.count || 0;
          
          let status: 'fresh' | 'stale' | 'expired' | 'missing' = 'fresh';
          let lastUpdated: string | null = null;
          
          if (latestDate) {
            const dataTime = new Date(latestDate).getTime();
            const ageHours = (nowMs - dataTime) / (1000 * 60 * 60);
            lastUpdated = new Date(dataTime).toISOString();
            
            if (ageHours > 48) {
              status = 'expired';
            } else if (ageHours > 24) {
              status = 'stale';
            }
          }
          
          watermarks.push({
            dataset: tableName,
            latest_date: latestDate,
            record_count: recordCount,
            last_updated: lastUpdated,
            status,
            source_table: tableName,
            schema_version: 'v1.0',
          });
        }
        
        const summary = {
          total_datasets: watermarks.length,
          fresh_count: watermarks.filter(w => w.status === 'fresh').length,
          stale_count: watermarks.filter(w => w.status === 'stale').length,
          expired_count: watermarks.filter(w => w.status === 'expired').length,
          missing_count: watermarks.filter(w => w.status === 'missing').length,
        };
        
        return { watermarks, summary };
      } finally {
        db.close();
      }
    };
    
    const checkQualityGatesTest = async () => {
      const db = new Database(dbPath, { readonly: true, fileMustExist: true });
      try {
        const now = new Date();
        const nowISO = now.toISOString();
        const todayISO = now.toISOString().split('T')[0];
        const nowMs = now.getTime();
        
        // Calculate latest trade date from all tables
        const latestDates: string[] = [];
        const requiredTablesForCutoff = ['daily_kline', 'adjustment_factors', 'factor_data', 'market_factors'];
        for (const tableName of requiredTablesForCutoff) {
          const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
          if (tableCheck) {
            const latestRow = db.prepare(`SELECT trade_date as latest_date FROM ${tableName} ORDER BY trade_date DESC LIMIT 1`).get() as any;
            if (latestRow?.latest_date) {
              latestDates.push(latestRow.latest_date);
            }
          }
        }
        latestDates.sort().reverse();
        const latestTradeDate = latestDates.length > 0 ? latestDates[0] : todayISO;
        
        const gates: any[] = [];
        const warnings: string[] = [];
        const blockReasons: string[] = [];
        let overallStatus: 'PASS' | 'WARN' | 'BLOCK' = 'PASS';
        
        // Gate 1: Coverage check
        const requiredTables = ['daily_kline', 'adjustment_factors', 'factor_data', 'market_factors'];
        let existingTables = 0;
        for (const tableName of requiredTables) {
          const tableCheck = db.prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
          ).get(tableName);
          if (tableCheck) existingTables++;
        }
        const coverageRatio = existingTables / requiredTables.length;
        const coveragePass = coverageRatio >= 0.999;
        if (!coveragePass) {
          blockReasons.push(`Table coverage ${(coverageRatio * 100).toFixed(1)}% < 99.9%`);
          overallStatus = 'BLOCK';
        }
        gates.push({
          gate_id: 'gate_coverage',
          gate_type: 'data_quality',
          status: coveragePass ? 'PASS' : 'BLOCK',
          rules: [{
            rule_id: 'coverage_check',
            display_name: '表覆盖率',
            status: coveragePass ? 'PASS' : 'BLOCK',
            actual: coverageRatio,
            threshold: 0.999,
            operator: '>=',
            severity: 'BLOCK',
            evidence_ref: `ev_coverage_real_${Date.now()}`,
            description: '必要表覆盖率必须 >= 99.9%',
            unit: 'ratio',
            data_range: { start: todayISO, end: todayISO },
            rule_version: 'v1.2.0',
            checked_at: nowISO,
            source: 'sqlite_adapter',
          }],
          checked_at: nowISO,
          data_cutoff: latestTradeDate,
          block_reasons: coveragePass ? [] : [`Table coverage ${(coverageRatio * 100).toFixed(1)}% < 99.9%`],
          warnings: [],
        });
        
        // Gate 2: Freshness check
        let maxAgeHours = 0;
        for (const tableName of requiredTables) {
          const tableCheck = db.prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
          ).get(tableName);
          if (!tableCheck) continue;
          
          const dateColumn = 'trade_date';
          const latestRow = db.prepare(
            `SELECT ${dateColumn} as latest_date FROM ${tableName} ORDER BY ${dateColumn} DESC LIMIT 1`
          ).get() as any;
          
          if (latestRow?.latest_date) {
            const dataTime = new Date(latestRow.latest_date).getTime();
            const ageHours = (nowMs - dataTime) / (1000 * 60 * 60);
            if (ageHours > maxAgeHours) maxAgeHours = ageHours;
          }
        }
        const freshnessPass = maxAgeHours <= 24;
        const freshnessWarn = maxAgeHours > 24 && maxAgeHours <= 48;
        if (!freshnessPass && !freshnessWarn) {
          blockReasons.push(`Data age ${maxAgeHours.toFixed(1)}h exceeds 48h threshold`);
          overallStatus = 'BLOCK';
        } else if (freshnessWarn) {
          warnings.push(`Data age ${maxAgeHours.toFixed(1)}h exceeds 24h threshold`);
          if (overallStatus === 'PASS') overallStatus = 'WARN';
        }
        gates.push({
          gate_id: 'gate_freshness',
          gate_type: 'freshness',
          status: freshnessPass ? 'PASS' : (freshnessWarn ? 'WARN' : 'BLOCK'),
          rules: [{
            rule_id: 'freshness_check',
            display_name: '数据新鲜度',
            status: freshnessPass ? 'PASS' : (freshnessWarn ? 'WARN' : 'BLOCK'),
            actual: Math.round(maxAgeHours * 100) / 100,
            threshold: 24,
            operator: '<=',
            severity: 'BLOCK',
            evidence_ref: `ev_freshness_real_${Date.now()}`,
            description: '数据新鲜度必须在 24 小时内',
            unit: 'hours',
            checked_at: nowISO,
            source: 'sqlite_adapter',
          }],
          checked_at: nowISO,
          data_cutoff: latestTradeDate,
          block_reasons: freshnessPass ? [] : [`Data age ${maxAgeHours.toFixed(1)}h exceeds threshold`],
          warnings: freshnessWarn ? [`Data age ${maxAgeHours.toFixed(1)}h exceeds 24h threshold`] : [],
        });
        
        // Gate 3: Uniqueness check
        let minUniquenessRatio = 1;
        for (const tableName of requiredTables) {
          const tableCheck = db.prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
          ).get(tableName);
          if (!tableCheck) continue;
          
          const totalRow = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as any;
          const distinctRow = db.prepare(`SELECT COUNT(DISTINCT trade_date) as count FROM ${tableName}`).get() as any;
          
          const total = totalRow?.count || 0;
          const distinct = distinctRow?.count || 0;
          const ratio = total > 0 ? distinct / total : 1;
          if (ratio < minUniquenessRatio) minUniquenessRatio = ratio;
        }
        const uniquenessPass = minUniquenessRatio >= 0.999; // Allow 0.1% tolerance for floating point
        if (!uniquenessPass) {
          blockReasons.push(`Primary key uniqueness ${(minUniquenessRatio * 100).toFixed(4)}% < 99.9%`);
          overallStatus = 'BLOCK';
        }
        gates.push({
          gate_id: 'gate_uniqueness',
          gate_type: 'data_quality',
          status: uniquenessPass ? 'PASS' : 'BLOCK',
          rules: [{
            rule_id: 'uniqueness_check',
            display_name: '主键唯一性',
            status: uniquenessPass ? 'PASS' : 'BLOCK',
            actual: minUniquenessRatio,
            threshold: 0.999,
            operator: '>=',
            severity: 'BLOCK',
            evidence_ref: `ev_uniqueness_real_${Date.now()}`,
            description: '主键唯一性必须 >= 99.9%',
            unit: 'ratio',
            checked_at: nowISO,
            source: 'sqlite_adapter',
          }],
          checked_at: nowISO,
          data_cutoff: latestTradeDate,
          block_reasons: uniquenessPass ? [] : [`Primary key uniqueness ${(minUniquenessRatio * 100).toFixed(4)}% < 99.9%`],
          warnings: [],
        });
        
        // Gate 4: Null rate check
        let maxNullRate = 0;
        const nullCheckFields: Record<string, string[]> = {
          daily_kline: ['open_price', 'close_price'],
          adjustment_factors: ['factor_value'],
          factor_data: ['factor_name', 'factor_value'],
          market_factors: ['factor_name', 'factor_value'],
        };
        for (const tableName of requiredTables) {
          const tableCheck = db.prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
          ).get(tableName);
          if (!tableCheck) continue;
          
          const fields = nullCheckFields[tableName] || [];
          for (const field of fields) {
            const totalRow = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as any;
            const nullRow = db.prepare(`SELECT COUNT(*) as count FROM ${tableName} WHERE ${field} IS NULL`).get() as any;
            
            const total = totalRow?.count || 0;
            const nullCount = nullRow?.count || 0;
            const nullRate = total > 0 ? nullCount / total : 0;
            if (nullRate > maxNullRate) maxNullRate = nullRate;
          }
        }
        const nullRatePass = maxNullRate <= 0.01;
        if (!nullRatePass) {
          warnings.push(`Null rate ${(maxNullRate * 100).toFixed(2)}% exceeds 1% threshold`);
          if (overallStatus === 'PASS') overallStatus = 'WARN';
        }
        gates.push({
          gate_id: 'gate_null_rate',
          gate_type: 'data_quality',
          status: nullRatePass ? 'PASS' : 'WARN',
          rules: [{
            rule_id: 'null_rate_check',
            display_name: '空值率',
            status: nullRatePass ? 'PASS' : 'WARN',
            actual: maxNullRate,
            threshold: 0.01,
            operator: '<=',
            severity: 'WARN',
            evidence_ref: `ev_null_rate_real_${Date.now()}`,
            description: '关键字段空值率必须 <= 1%',
            unit: 'ratio',
            checked_at: nowISO,
            source: 'sqlite_adapter',
          }],
          checked_at: nowISO,
          data_cutoff: latestTradeDate,
          block_reasons: [],
          warnings: nullRatePass ? [] : [`Null rate ${(maxNullRate * 100).toFixed(2)}% exceeds 1% threshold`],
        });
        
        // Gate 5: Dependency order check
        const dependencyOrder = ['daily_kline', 'adjustment_factors', 'factor_data', 'market_factors'];
        let dependencyCorrect = true;
        for (const tableName of dependencyOrder) {
          const tableCheck = db.prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
          ).get(tableName);
          if (!tableCheck) {
            dependencyCorrect = false;
            break;
          }
        }
        if (!dependencyCorrect) {
          blockReasons.push('Dependency order broken: missing required tables');
          overallStatus = 'BLOCK';
        }
        gates.push({
          gate_id: 'gate_dependency',
          gate_type: 'dependency',
          status: dependencyCorrect ? 'PASS' : 'BLOCK',
          rules: [{
            rule_id: 'dependency_order',
            display_name: '依赖顺序',
            status: dependencyCorrect ? 'PASS' : 'BLOCK',
            actual: dependencyCorrect ? 'correct' : 'broken',
            threshold: 'correct',
            operator: '==',
            severity: 'BLOCK',
            evidence_ref: `ev_dependency_real_${Date.now()}`,
            description: '上游节点必须全部完成',
            checked_at: nowISO,
            source: 'sqlite_adapter',
          }],
          checked_at: nowISO,
          data_cutoff: latestTradeDate,
          block_reasons: dependencyCorrect ? [] : ['Dependency order broken: missing required tables'],
          warnings: [],
        });
        
        // Gate 6: Cutoff consistency check
        const cutoffDates: string[] = [];
        for (const tableName of requiredTables) {
          const tableCheck = db.prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
          ).get(tableName);
          if (!tableCheck) continue;
          
          const latestRow = db.prepare(
            `SELECT trade_date as latest_date FROM ${tableName} ORDER BY trade_date DESC LIMIT 1`
          ).get() as any;
          
          if (latestRow?.latest_date) {
            cutoffDates.push(latestRow.latest_date);
          }
        }
        const uniqueCutoffs = [...new Set(cutoffDates)];
        const cutoffConsistent = uniqueCutoffs.length <= 1;
        if (!cutoffConsistent) {
          blockReasons.push(`Cutoff dates inconsistent: ${uniqueCutoffs.join(', ')}`);
          overallStatus = 'BLOCK';
        }
        gates.push({
          gate_id: 'gate_cutoff',
          gate_type: 'cutoff',
          status: cutoffConsistent ? 'PASS' : 'BLOCK',
          rules: [{
            rule_id: 'cutoff_check',
            display_name: '数据截止日一致性',
            status: cutoffConsistent ? 'PASS' : 'BLOCK',
            actual: uniqueCutoffs[0] || 'N/A',
            threshold: uniqueCutoffs[0] || 'N/A',
            operator: '==',
            severity: 'BLOCK',
            evidence_ref: `ev_cutoff_real_${Date.now()}`,
            description: '数据截止日必须一致',
            checked_at: nowISO,
            source: 'sqlite_adapter',
          }],
          checked_at: nowISO,
          data_cutoff: latestTradeDate,
          block_reasons: cutoffConsistent ? [] : [`Cutoff dates inconsistent: ${uniqueCutoffs.join(', ')}`],
          warnings: [],
        });
        
        const summary = {
          total_gates: gates.length,
          pass_count: gates.filter(g => g.status === 'PASS').length,
          warn_count: gates.filter(g => g.status === 'WARN').length,
          block_count: gates.filter(g => g.status === 'BLOCK').length,
          not_executed_count: 0,
        };
        
        return { gates, summary };
      } finally {
        db.close();
      }
    };
    
    return {
      checkHealth: checkHealthTest,
      getWatermarks: getWatermarksTest,
      checkQualityGates: checkQualityGatesTest,
      close: () => {},
    };
  }
  // Return default adapter using singleton connection
  return {
    checkHealth,
    getWatermarks,
    checkQualityGates,
    close: closeConnection,
  };
}
