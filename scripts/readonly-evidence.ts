/**
 * Phase 2.2A: Read-Only Connection Evidence Script
 * 
 * This script demonstrates and verifies:
 * 1. SQLite driver and version
 * 2. readonly: true connection code
 * 3. PRAGMA query_only read-back value
 * 4. CREATE/INSERT/UPDATE/DELETE/DDL write rejection
 * 5. Actual error messages for each rejection
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';

const pkg = require('better-sqlite3/package.json');

console.log('=== Phase 2.2A Read-Only Connection Evidence ===\n');

// ============ 1. Driver Info ============
console.log('--- 1. SQLite Driver & Version ---');
console.log(`Driver: better-sqlite3`);
console.log(`Version: ${pkg.version}`);
console.log(`SQLite engine version: ${Database().pragma('sqlite_version', { simple: true }) || 'N/A'}`);
console.log('');

// ============ 2. Create test database ============
const tmpDir = os.tmpdir();
const testDbPath = path.join(tmpDir, 'readonly_evidence_test.db');

// Clean up if exists
try { fs.unlinkSync(testDbPath); } catch {}

// Create a test database with some data
const setupDb = new Database(testDbPath);
setupDb.exec(`
  CREATE TABLE test_data (
    id INTEGER PRIMARY KEY,
    name TEXT,
    value REAL,
    created_at TEXT
  );
  INSERT INTO test_data (name, value, created_at) VALUES ('alpha', 1.1, '2026-01-01');
  INSERT INTO test_data (name, value, created_at) VALUES ('beta', 2.2, '2026-01-02');
  INSERT INTO test_data (name, value, created_at) VALUES ('gamma', 3.3, '2026-01-03');
`);
setupDb.close();

console.log(`Test database created at: ${testDbPath}`);
console.log(`File size: ${fs.statSync(testDbPath).size} bytes`);
console.log('');

// ============ 3. Open with readonly: true ============
console.log('--- 2. Read-Only Connection Code ---');
console.log('Code:');
console.log('  const db = new Database(resolvedPath, {');
console.log('    readonly: true,');
console.log('    fileMustExist: true,');
console.log('  });');
console.log('');

let db: Database.Database;
try {
  db = new Database(testDbPath, {
    readonly: true,
    fileMustExist: true,
  });
  console.log('Connection result: SUCCESS');
  console.log('');
} catch (err) {
  console.log(`Connection result: FAILED - ${err}`);
  process.exit(1);
}

// ============ 4. PRAGMA query_only ============
console.log('--- 3. PRAGMA query_only ---');
try {
  db.pragma('query_only = ON');
  const queryOnlyValue = db.pragma('query_only', { simple: true });
  console.log(`PRAGMA query_only = ON executed: YES`);
  console.log(`PRAGMA query_only read-back value: ${queryOnlyValue} (type: ${typeof queryOnlyValue})`);
  console.log(`Verification: ${queryOnlyValue === 1 || queryOnlyValue === '1' || queryOnlyValue === true ? 'PASS (query_only is enabled)' : 'FAIL'}`);
} catch (err) {
  console.log(`PRAGMA query_only error: ${err}`);
}
console.log('');

// ============ 5. PRAGMA quick_check ============
console.log('--- 4. PRAGMA quick_check ---');
try {
  const checkResult = db.pragma('quick_check', { simple: true });
  console.log(`PRAGMA quick_check result: ${checkResult}`);
} catch (err) {
  console.log(`PRAGMA quick_check error: ${err}`);
}
console.log('');

// ============ 6. Read verification ============
console.log('--- 5. Read Operations (should succeed) ---');
try {
  const rows = db.prepare('SELECT * FROM test_data').all();
  console.log(`SELECT * FROM test_data: SUCCESS (${rows.length} rows)`);
  rows.forEach((row: any) => {
    console.log(`  id=${row.id}, name=${row.name}, value=${row.value}, created_at=${row.created_at}`);
  });
} catch (err) {
  console.log(`SELECT failed: ${err}`);
}
console.log('');

// ============ 7. Write rejection tests ============
console.log('--- 6. Write Rejection Tests ---');

// Test CREATE TABLE
console.log('\n[TEST] CREATE TABLE (DDL):');
try {
  db.exec('CREATE TABLE should_fail (id INTEGER PRIMARY KEY)');
  console.log('  Result: UNEXPECTED SUCCESS (write was NOT rejected!)');
} catch (err) {
  console.log(`  Result: REJECTED`);
  console.log(`  Error: ${(err as Error).message}`);
}

// Test INSERT
console.log('\n[TEST] INSERT:');
try {
  db.prepare("INSERT INTO test_data (name, value, created_at) VALUES ('delta', 4.4, '2026-01-04')").run();
  console.log('  Result: UNEXPECTED SUCCESS (write was NOT rejected!)');
} catch (err) {
  console.log(`  Result: REJECTED`);
  console.log(`  Error: ${(err as Error).message}`);
}

// Test UPDATE
console.log('\n[TEST] UPDATE:');
try {
  db.prepare("UPDATE test_data SET value = 999 WHERE id = 1").run();
  console.log('  Result: UNEXPECTED SUCCESS (write was NOT rejected!)');
} catch (err) {
  console.log(`  Result: REJECTED`);
  console.log(`  Error: ${(err as Error).message}`);
}

// Test DELETE
console.log('\n[TEST] DELETE:');
try {
  db.prepare("DELETE FROM test_data WHERE id = 1").run();
  console.log('  Result: UNEXPECTED SUCCESS (write was NOT rejected!)');
} catch (err) {
  console.log(`  Result: REJECTED`);
  console.log(`  Error: ${(err as Error).message}`);
}

// Test DROP TABLE (DDL)
console.log('\n[TEST] DROP TABLE (DDL):');
try {
  db.exec('DROP TABLE test_data');
  console.log('  Result: UNEXPECTED SUCCESS (write was NOT rejected!)');
} catch (err) {
  console.log(`  Result: REJECTED`);
  console.log(`  Error: ${(err as Error).message}`);
}

// Test ALTER TABLE (DDL)
console.log('\n[TEST] ALTER TABLE (DDL):');
try {
  db.exec('ALTER TABLE test_data ADD COLUMN extra TEXT');
  console.log('  Result: UNEXPECTED SUCCESS (write was NOT rejected!)');
} catch (err) {
  console.log(`  Result: REJECTED`);
  console.log(`  Error: ${(err as Error).message}`);
}

console.log('');

// ============ 8. Summary ============
console.log('--- 7. Read-Only Guarantee Summary ---');
console.log('Guarantee mechanisms:');
console.log('  1. better-sqlite3 connection option: readonly: true');
console.log('     - Opens the file with O_RDONLY at the OS level');
console.log('     - SQLite internally rejects all write operations');
console.log('  2. PRAGMA query_only = ON');
console.log('     - SQLite-level enforcement: all write statements fail');
console.log('     - Defense-in-depth: even if readonly flag is somehow bypassed, query_only blocks writes');
console.log('');
console.log('Limitations:');
console.log('  - readonly:true prevents file-level writes (OS permission)');
console.log('  - query_only prevents SQL-level writes (SQLite engine)');
console.log('  - These two mechanisms together provide defense-in-depth');
console.log('  - Does NOT protect against: file deletion at OS level, file permission changes');
console.log('  - Does NOT protect against: concurrent readers seeing stale data');
console.log('  - WAL journal mode is not available in readonly mode');
console.log('');

// Cleanup
db.close();
try { fs.unlinkSync(testDbPath); } catch {}
console.log('Test database cleaned up.');
console.log('\n=== Evidence Complete ===');
