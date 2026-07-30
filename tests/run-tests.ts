#!/usr/bin/env tsx
/**
 * W0 Test Runner - Runs specific test suite
 * Usage: npx tsx tests/run-tests.ts <suite>
 * Suites: unit, integration, contract, negative, smoke
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const suite = process.argv[2];

if (!suite) {
  console.error('Usage: npx tsx tests/run-tests.ts <suite>');
  console.error('Suites: unit, integration, contract, negative, smoke');
  process.exit(1);
}

const TEST_FILES: Record<string, string[]> = {
  unit: [
    'tests/unit/config-validation.test.ts',
  ],
  integration: [
    'tests/integration/w0-integration.test.ts',
  ],
  contract: [
    'tests/phase2-2-frontend-contract-tests.ts',
  ],
  negative: [
    'tests/phase2-negative-tests.ts',
    'tests/phase2-2-negative-tests.ts',
  ],
  smoke: [
    'tests/smoke/w0-smoke.test.ts',
    'tests/core.test.ts',
  ],
};

function runTest(file: string): boolean {
  console.log(`\n=== Running: ${path.basename(file)} ===`);
  try {
    execSync(`npx tsx ${file}`, { stdio: 'inherit', cwd: process.cwd() });
    console.log(`✓ ${path.basename(file)} PASSED`);
    return true;
  } catch (error) {
    console.error(`✗ ${path.basename(file)} FAILED`);
    return false;
  }
}

function main() {
  const files = TEST_FILES[suite];
  
  if (!files) {
    console.error(`Unknown suite: ${suite}`);
    console.error('Available suites: unit, integration, contract, negative, smoke');
    process.exit(1);
  }
  
  if (files.length === 0) {
    console.log(`No tests found for suite: ${suite}`);
    process.exit(0);
  }
  
  console.log(`=== W0 Test Runner: ${suite} ===\n`);
  
  const results: { name: string; passed: boolean }[] = [];
  
  for (const file of files) {
    if (fs.existsSync(file)) {
      const passed = runTest(file);
      results.push({ name: path.basename(file), passed });
    } else {
      console.log(`Skipping ${file} (not found)`);
    }
  }
  
  console.log('\n=== Summary ===');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`);
  
  process.exit(failed > 0 ? 1 : 0);
}

main();
