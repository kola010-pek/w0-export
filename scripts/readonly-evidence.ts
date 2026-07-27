/**
 * Phase 2.2A: Read-Only Connection Isolated Evidence Script
 * 
 * Tests each defense layer independently and in combination:
 * Layer 1: readonly=true alone (without query_only)
 * Layer 2: query_only=ON alone (without readonly)
 * Layer 3: Both together (defense-in-depth)
 * 
 * This proves each layer works independently, not that all failures
 * are caused by only one mechanism.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';

const pkg = require('better-sqlite3/package.json');

console.log('=== Phase 2.2A Read-Only Isolated Evidence ===\n');

// ============ Driver Info ============
console.log('--- 0. SQLite Driver & Version ---');
console.log(`Driver: better-sqlite3`);
console.log(`npm package version: ${pkg.version}`);
// Get SQLite engine version via a temp db
const tmpVersionDb = new Database(':memory:');
const sqliteVersion = tmpVersionDb.prepare('SELECT sqlite_version() as v').get() as { v: string };
console.log(`SQLite engine version: ${sqliteVersion.v}`);
tmpVersionDb.close();
console.log('');

// ============ Setup test database ============
const tmpDir = os.tmpdir();
const testDbPath = path.join(tmpDir, 'readonly_isolated_test.db');
try { fs.unlinkSync(testDbPath); } catch {}

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
console.log(`Test database: ${testDbPath} (${fs.statSync(testDbPath).size} bytes)\n`);

// ============ Helper ============
interface WriteTestResult {
  operation: string;
  rejected: boolean;
  error_message: string;
}

function testWriteOperations(db: Database.Database, label: string): WriteTestResult[] {
  const results: WriteTestResult[] = [];

  const operations = [
    { name: 'INSERT', sql: "INSERT INTO test_data (name, value, created_at) VALUES ('delta', 4.4, '2026-01-04')" },
    { name: 'UPDATE', sql: "UPDATE test_data SET value = 999 WHERE id = 1" },
    { name: 'DELETE', sql: "DELETE FROM test_data WHERE id = 1" },
    { name: 'CREATE TABLE', sql: 'CREATE TABLE should_fail (id INTEGER PRIMARY KEY)', isExec: true },
    { name: 'DROP TABLE', sql: 'DROP TABLE test_data', isExec: true },
    { name: 'ALTER TABLE', sql: 'ALTER TABLE test_data ADD COLUMN extra TEXT', isExec: true },
  ];

  for (const op of operations) {
    try {
      if (op.isExec) {
        db.exec(op.sql);
      } else {
        db.prepare(op.sql).run();
      }
      results.push({ operation: op.name, rejected: false, error_message: 'NOT REJECTED (unexpected)' });
    } catch (err) {
      results.push({ operation: op.name, rejected: true, error_message: (err as Error).message });
    }
  }

  return results;
}

function printWriteResults(results: WriteTestResult[], label: string) {
  console.log(`  Write test results (${label}):`);
  for (const r of results) {
    const status = r.rejected ? 'REJECTED' : 'NOT REJECTED';
    console.log(`    [${status}] ${r.operation}: ${r.error_message}`);
  }
  const allRejected = results.every(r => r.rejected);
  console.log(`  Layer effective: ${allRejected ? 'YES' : 'NO — some writes succeeded!'}`);
  console.log('');
}

// ============ LAYER 1: readonly=true ONLY (no query_only) ============
console.log('--- Layer 1: readonly=true ONLY (no PRAGMA query_only) ---');
console.log('Purpose: Verify that readonly connection option alone prevents writes.');
console.log('');

let layer1Db: Database.Database;
try {
  layer1Db = new Database(testDbPath, { readonly: true, fileMustExist: true });
  console.log('  Connection with readonly=true: SUCCESS');
  
  // Check query_only status (should be OFF since we didn't set it)
  const qoValue = layer1Db.pragma('query_only', { simple: true });
  console.log(`  PRAGMA query_only value: ${qoValue} (expected: 0/OFF since we did not set it)`);
  
  // Test reads
  const rows = layer1Db.prepare('SELECT COUNT(*) as cnt FROM test_data').get() as { cnt: number };
  console.log(`  SELECT COUNT(*): SUCCESS (${rows.cnt} rows)`);
  
  // Test writes
  const layer1Results = testWriteOperations(layer1Db, 'readonly=true only');
  printWriteResults(layer1Results, 'readonly=true only');
  
  layer1Db.close();
} catch (err) {
  console.log(`  Connection failed: ${(err as Error).message}`);
  console.log('');
}

// ============ LAYER 2: query_only=ON ONLY (no readonly) ============
console.log('--- Layer 2: PRAGMA query_only=ON ONLY (no readonly flag) ---');
console.log('Purpose: Verify that query_only pragma alone prevents writes on a read-write connection.');
console.log('');

let layer2Db: Database.Database;
try {
  // Open WITHOUT readonly — this is a normal read-write connection
  layer2Db = new Database(testDbPath, { readonly: false, fileMustExist: true });
  console.log('  Connection with readonly=false (read-write): SUCCESS');
  
  // Enable query_only
  layer2Db.pragma('query_only = ON');
  const qoValue = layer2Db.pragma('query_only', { simple: true });
  console.log(`  PRAGMA query_only = ON executed: YES`);
  console.log(`  PRAGMA query_only read-back: ${qoValue} (type: ${typeof qoValue})`);
  
  // Test reads
  const rows = layer2Db.prepare('SELECT COUNT(*) as cnt FROM test_data').get() as { cnt: number };
  console.log(`  SELECT COUNT(*): SUCCESS (${rows.cnt} rows)`);
  
  // Test writes
  const layer2Results = testWriteOperations(layer2Db, 'query_only=ON only');
  printWriteResults(layer2Results, 'query_only=ON only');
  
  // Verify: disable query_only and confirm writes work again (proves query_only was the blocker)
  layer2Db.pragma('query_only = OFF');
  const qoOff = layer2Db.pragma('query_only', { simple: true });
  console.log(`  PRAGMA query_only = OFF, read-back: ${qoOff}`);
  try {
    layer2Db.prepare("INSERT INTO test_data (name, value, created_at) VALUES ('verify', 0, '2026-01-04')").run();
    console.log('  After query_only=OFF, INSERT: SUCCESS (confirms query_only was the blocking mechanism)');
    // Clean up the verification row
    layer2Db.prepare("DELETE FROM test_data WHERE name = 'verify'").run();
  } catch (err) {
    console.log(`  After query_only=OFF, INSERT: FAILED — ${(err as Error).message}`);
  }
  
  layer2Db.close();
} catch (err) {
  console.log(`  Connection failed: ${(err as Error).message}`);
  console.log('');
}

// ============ LAYER 3: BOTH readonly=true AND query_only=ON ============
console.log('--- Layer 3: readonly=true + PRAGMA query_only=ON (defense-in-depth) ---');
console.log('Purpose: Verify both layers active simultaneously.');
console.log('');

let layer3Db: Database.Database;
try {
  layer3Db = new Database(testDbPath, { readonly: true, fileMustExist: true });
  console.log('  Connection with readonly=true: SUCCESS');
  
  layer3Db.pragma('query_only = ON');
  const qoValue = layer3Db.pragma('query_only', { simple: true });
  console.log(`  PRAGMA query_only = ON, read-back: ${qoValue}`);
  
  // quick_check
  const qcResult = layer3Db.pragma('quick_check', { simple: true });
  console.log(`  PRAGMA quick_check: ${qcResult}`);
  
  // Test reads
  const rows = layer3Db.prepare('SELECT COUNT(*) as cnt FROM test_data').get() as { cnt: number };
  console.log(`  SELECT COUNT(*): SUCCESS (${rows.cnt} rows)`);
  
  // Test writes
  const layer3Results = testWriteOperations(layer3Db, 'readonly + query_only');
  printWriteResults(layer3Results, 'readonly + query_only');
  
  layer3Db.close();
} catch (err) {
  console.log(`  Connection failed: ${(err as Error).message}`);
  console.log('');
}

// ============ Summary ============
console.log('--- Summary ---');
console.log('Layer 1 (readonly=true only): Prevents writes via file descriptor and SQLite internal checks.');
console.log('  - better-sqlite3 passes readonly option to SQLite C API (sqlite3_open_v2 with SQLITE_OPEN_READONLY).');
console.log('  - SQLite rejects write operations with "attempt to write a readonly database".');
console.log('  - This is documented behavior of SQLite, not just OS-level O_RDONLY.');
console.log('');
console.log('Layer 2 (query_only=ON only): Prevents writes via SQLite engine pragma.');
console.log('  - Works on a normal read-write connection.');
console.log('  - Verified: writes fail with query_only=ON, succeed with query_only=OFF on same connection.');
console.log('  - This proves query_only is an independent defense layer.');
console.log('');
console.log('Layer 3 (both): Defense-in-depth. Both mechanisms active simultaneously.');
console.log('');
console.log('Limitations (accurate description):');
console.log('  - readonly:true prevents SQLite-level writes; the file is opened with SQLITE_OPEN_READONLY.');
console.log('  - query_only=ON prevents SQL-level writes at the SQLite engine level.');
console.log('  - Neither protects against OS-level file deletion or permission changes by other processes.');
console.log('  - WAL journal mode: SQLite opens with readonly cannot create WAL files; this is a');
console.log('    consequence of the readonly flag, not a separate limitation of query_only.');
console.log('  - These mechanisms protect against accidental writes through the application,');
console.log('    not against deliberate attacks with direct file system access.');
console.log('');

// Cleanup
try { fs.unlinkSync(testDbPath); } catch {}
console.log('Test database cleaned up.');
console.log('\n=== Isolated Evidence Complete ===');
