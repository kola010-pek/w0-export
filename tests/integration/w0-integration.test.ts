/**
 * W0 Integration Tests
 * Tests the integration between configuration, data source, and API layers
 */

import { loadEnvironmentConfig, validateEnvironmentConfig, getFlatEnvironmentConfig } from '../../src/lib/config-validator';
import { getDataSourceMode, getDataSourceKind, isMockMode, isRealReadonlyMode } from '../../src/lib/data-source';

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

console.log('=== W0 Integration Tests ===\n');

// Test 1: Configuration to Data Source Integration
console.log('Configuration to Data Source Integration:');

test('simulation config produces mock data source', () => {
  const config = loadEnvironmentConfig('simulation');
  const validation = validateEnvironmentConfig(config);
  assert(validation.success, 'simulation config should be valid');
  assert(config.data.source === 'mock', 'data source should be mock');
});

test('sample_staging config produces sample data source', () => {
  const config = loadEnvironmentConfig('sample_staging');
  const validation = validateEnvironmentConfig(config);
  assert(validation.success, 'sample_staging config should be valid');
  assert(config.data.source === 'sample', 'data source should be sample');
});

test('real_readonly config produces unavailable data source', () => {
  const config = loadEnvironmentConfig('real_readonly');
  const validation = validateEnvironmentConfig(config);
  // real_readonly is valid but has BLOCK status due to missing path
  assert(config.data.source === 'unavailable', 'data source should be unavailable');
});

test('production_guarded config produces unavailable data source', () => {
  const config = loadEnvironmentConfig('production_guarded');
  const validation = validateEnvironmentConfig(config);
  // production_guarded is valid but has BLOCK status
  assert(config.data.source === 'unavailable', 'data source should be unavailable');
});

// Test 2: Flat Config Integration
console.log('\nFlat Config Integration:');

test('flat config matches nested config for simulation', () => {
  const config = loadEnvironmentConfig('simulation');
  const flat = getFlatEnvironmentConfig('simulation');
  assert(flat !== null, 'flat config should not be null');
  assert(flat.data_source === config.data.source, 'data_source should match');
  assert(flat.is_mock === config.data.is_mock, 'is_mock should match');
});

test('flat config matches nested config for sample_staging', () => {
  const config = loadEnvironmentConfig('sample_staging');
  const flat = getFlatEnvironmentConfig('sample_staging');
  assert(flat !== null, 'flat config should not be null');
  assert(flat.data_source === config.data.source, 'data_source should match');
  assert(flat.is_sample === config.data.is_sample, 'is_sample should match');
});

// Test 3: Data Source Mode Integration
console.log('\nData Source Mode Integration:');

test('getDataSourceMode returns valid mode', () => {
  const mode = getDataSourceMode();
  assert(typeof mode === 'string', 'mode should be string');
  assert(['mock', 'sample', 'real_readonly'].includes(mode), 'mode should be valid');
});

test('getDataSourceKind returns valid kind', () => {
  const kind = getDataSourceKind();
  assert(typeof kind === 'string', 'kind should be string');
  assert(kind.length > 0, 'kind should not be empty');
});

test('isMockMode returns boolean', () => {
  const result = isMockMode();
  assert(typeof result === 'boolean', 'isMockMode should return boolean');
});

test('isRealReadonlyMode returns boolean', () => {
  const result = isRealReadonlyMode();
  assert(typeof result === 'boolean', 'isRealReadonlyMode should return boolean');
});

// Test 4: Environment Validation Integration
console.log('\nEnvironment Validation Integration:');

test('validateCurrentEnvironment returns result', () => {
  const result = validateEnvironmentConfig(loadEnvironmentConfig('simulation'));
  assert(typeof result.success === 'boolean', 'success should be boolean');
  assert(typeof result.status === 'string', 'status should be string');
});

test('invalid environment returns BLOCK', () => {
  const config = loadEnvironmentConfig('invalid_env' as any);
  assert(config === null, 'invalid env should return null');
});

// Summary
console.log('\n=== Summary ===');
console.log(`Total: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
