/**
 * W0 Smoke Tests
 * Quick verification that core functionality works
 */

import { loadEnvironmentConfig, validateEnvironmentConfig } from '../../src/lib/config-validator';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${e.message}`);
    failed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

console.log('=== W0 Smoke Tests ===\n');

// Test 1: All environments load
console.log('Environment Loading:');

test('simulation loads', () => {
  const config = loadEnvironmentConfig('simulation');
  assert(config !== null, 'config should not be null');
});

test('sample_staging loads', () => {
  const config = loadEnvironmentConfig('sample_staging');
  assert(config !== null, 'config should not be null');
});

test('real_readonly loads', () => {
  const config = loadEnvironmentConfig('real_readonly');
  assert(config !== null, 'config should not be null');
});

test('production_guarded loads', () => {
  const config = loadEnvironmentConfig('production_guarded');
  assert(config !== null, 'config should not be null');
});

// Test 2: All environments validate
console.log('\nEnvironment Validation:');

test('simulation validates', () => {
  const config = loadEnvironmentConfig('simulation');
  const result = validateEnvironmentConfig(config);
  assert(result.success, 'simulation should validate');
});

test('sample_staging validates', () => {
  const config = loadEnvironmentConfig('sample_staging');
  const result = validateEnvironmentConfig(config);
  assert(result.success, 'sample_staging should validate');
});

test('real_readonly validates (config structure valid)', () => {
  const config = loadEnvironmentConfig('real_readonly');
  const result = validateEnvironmentConfig(config);
  // real_readonly config structure is valid, but status should be BLOCK due to missing path
  assert(result.status === 'BLOCK', 'real_readonly should have BLOCK status');
  assert(result.block_reasons.includes('real_db_path_not_configured'), 'should have path not configured reason');
});

test('production_guarded validates (config structure valid)', () => {
  const config = loadEnvironmentConfig('production_guarded');
  const result = validateEnvironmentConfig(config);
  // production_guarded config structure is valid, but status should be BLOCK by default
  assert(result.status === 'BLOCK', 'production_guarded should have BLOCK status');
});

// Test 3: Safety checks
console.log('\nSafety Checks:');

test('simulation has no production capabilities', () => {
  const config = loadEnvironmentConfig('simulation');
  assert(!config.capabilities.production_write_enabled, 'production_write should be false');
  assert(!config.capabilities.production_model_enabled, 'production_model should be false');
  assert(!config.capabilities.production_release_enabled, 'production_release should be false');
});

test('sample_staging has no production capabilities', () => {
  const config = loadEnvironmentConfig('sample_staging');
  assert(!config.capabilities.production_write_enabled, 'production_write should be false');
  assert(!config.capabilities.production_model_enabled, 'production_model should be false');
  assert(!config.capabilities.production_release_enabled, 'production_release should be false');
});

test('real_readonly has no production capabilities', () => {
  const config = loadEnvironmentConfig('real_readonly');
  assert(!config.capabilities.production_write_enabled, 'production_write should be false');
  assert(!config.capabilities.production_model_enabled, 'production_model should be false');
  assert(!config.capabilities.production_release_enabled, 'production_release should be false');
});

test('production_guarded has no production capabilities', () => {
  const config = loadEnvironmentConfig('production_guarded');
  assert(!config.capabilities.production_write_enabled, 'production_write should be false');
  assert(!config.capabilities.production_model_enabled, 'production_model should be false');
  assert(!config.capabilities.production_release_enabled, 'production_release should be false');
});

// Summary
console.log('\n=== Summary ===');
console.log(`Total: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
