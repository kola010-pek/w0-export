#!/usr/bin/env tsx
/**
 * W0 Unified Test Runner
 * Runs all test suites in the correct order
 */

import { execSync } from 'child_process';
import * as path from 'path';

const TEST_SUITES = [
  { name: 'unit', pattern: 'tests/unit/**/*.ts' },
  { name: 'integration', pattern: 'tests/integration/**/*.ts' },
  { name: 'contract', pattern: 'tests/contract/**/*.ts' },
  { name: 'negative', pattern: 'tests/negative/**/*.ts' },
  { name: 'smoke', pattern: 'tests/smoke/**/*.ts' },
];

// Legacy test files that should be run
const LEGACY_TESTS = [
  'tests/core.test.ts',
  'tests/phase2-negative-tests.ts',
  'tests/phase2-2-negative-tests.ts',
  'tests/phase2-2-frontend-contract-tests.ts',
];

function runTest(name: string, file: string): boolean {
  console.log(`\n=== Running: ${name} ===`);
  try {
    execSync(`npx tsx ${file}`, { stdio: 'inherit', cwd: process.cwd() });
    console.log(`✓ ${name} PASSED`);
    return true;
  } catch (error) {
    console.error(`✗ ${name} FAILED`);
    return false;
  }
}

function main() {
  console.log('=== W0 Unified Test Runner ===\n');
  
  const results: { name: string; passed: boolean }[] = [];
  
  // Run legacy tests
  for (const testFile of LEGACY_TESTS) {
    const name = path.basename(testFile);
    const passed = runTest(name, testFile);
    results.push({ name, passed });
  }
  
  // Run config validation test
  const configTestPassed = runTest('config-validation', 'tests/unit/config-validation.test.ts');
  results.push({ name: 'config-validation', passed: configTestPassed });
  
  // Summary
  console.log('\n=== Test Summary ===');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  for (const result of results) {
    console.log(`${result.passed ? '✓' : '✗'} ${result.name}`);
  }
  
  console.log(`\nTotal: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('\n✓ All tests passed');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed');
    process.exit(1);
  }
}

main();
