/**
 * W0 配置校验单元测试
 * 
 * 测试目标：验证四种环境配置的正确性和安全性
 */

import { 
  loadEnvironmentConfig, 
  validateEnvironmentConfig,
  getFlatEnvironmentConfig,
} from '../../src/lib/config-validator';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.log(`  ✗ ${message}`);
    failed++;
  }
}

console.log('=== W0 Environment Configuration Tests ===\n');

// Test 1: simulation environment
console.log('--- simulation environment ---');
const simConfig = loadEnvironmentConfig('simulation');
assert(simConfig !== null, 'should load simulation config');
assert(simConfig?.environment.name === 'simulation', 'environment name should be simulation');

const simValidation = validateEnvironmentConfig(simConfig!);
assert(simValidation.success === true, 'should pass validation');
assert(simValidation.status === 'PASS', 'status should be PASS');

const simFlat = getFlatEnvironmentConfig('simulation');
assert(simFlat?.data_source === 'mock', 'data_source should be mock');
assert(simFlat?.is_mock === true, 'is_mock should be true');
assert(simFlat?.is_sample === false, 'is_sample should be false');
assert(simFlat?.production_write_enabled === false, 'production_write_enabled should be false');
assert(simFlat?.production_model_enabled === false, 'production_model_enabled should be false');
assert(simFlat?.production_release_enabled === false, 'production_release_enabled should be false');

// Test 2: sample_staging environment
console.log('\n--- sample_staging environment ---');
const sampleConfig = loadEnvironmentConfig('sample_staging');
assert(sampleConfig !== null, 'should load sample_staging config');
assert(sampleConfig?.environment.name === 'sample_staging', 'environment name should be sample_staging');

const sampleValidation = validateEnvironmentConfig(sampleConfig!);
assert(sampleValidation.success === true, 'should pass validation');
assert(sampleValidation.status === 'PASS', 'status should be PASS');

const sampleFlat = getFlatEnvironmentConfig('sample_staging');
assert(sampleFlat?.data_source === 'sample', 'data_source should be sample');
assert(sampleFlat?.is_mock === false, 'is_mock should be false');
assert(sampleFlat?.is_sample === true, 'is_sample should be true');
assert(sampleFlat?.production_write_enabled === false, 'production_write_enabled should be false');
assert(sampleFlat?.production_model_enabled === false, 'production_model_enabled should be false');
assert(sampleFlat?.production_release_enabled === false, 'production_release_enabled should be false');

// Test 3: real_readonly environment
console.log('\n--- real_readonly environment ---');
const realConfig = loadEnvironmentConfig('real_readonly');
assert(realConfig !== null, 'should load real_readonly config');
assert(realConfig?.environment.name === 'real_readonly', 'environment name should be real_readonly');

const realValidation = validateEnvironmentConfig(realConfig!);
assert(realValidation.success === false, 'should be BLOCKED by default');
assert(realValidation.status === 'BLOCK', 'status should be BLOCK');

const realFlat = getFlatEnvironmentConfig('real_readonly');
assert(realFlat?.readonly_required === true, 'readonly_required should be true');
assert(realFlat?.query_only_required === true, 'query_only_required should be true');
assert(realFlat?.real_db_path_configured === false, 'real_db_path_configured should be false');
assert(realFlat?.production_write_enabled === false, 'production_write_enabled should be false');
assert(realFlat?.production_model_enabled === false, 'production_model_enabled should be false');
assert(realFlat?.production_release_enabled === false, 'production_release_enabled should be false');

// Test 4: production_guarded environment
console.log('\n--- production_guarded environment ---');
const prodConfig = loadEnvironmentConfig('production_guarded');
assert(prodConfig !== null, 'should load production_guarded config');
assert(prodConfig?.environment.name === 'production_guarded', 'environment name should be production_guarded');

const prodValidation = validateEnvironmentConfig(prodConfig!);
assert(prodValidation.success === false, 'should be BLOCKED by default');
assert(prodValidation.status === 'BLOCK', 'status should be BLOCK');

const prodFlat = getFlatEnvironmentConfig('production_guarded');
assert(prodFlat?.human_approval_required === true, 'human_approval_required should be true');
assert(prodFlat?.production_write_enabled === false, 'production_write_enabled should be false');
assert(prodFlat?.production_model_enabled === false, 'production_model_enabled should be false');
assert(prodFlat?.production_release_enabled === false, 'production_release_enabled should be false');

// Test 5: invalid environment
console.log('\n--- invalid environment ---');
const invalidConfig = loadEnvironmentConfig('non_existent');
assert(invalidConfig === null, 'should return null for non-existent environment');

// Test 6: security constraints
console.log('\n--- security constraints ---');
const environments = ['simulation', 'sample_staging', 'real_readonly', 'production_guarded'] as const;
for (const env of environments) {
  const config = loadEnvironmentConfig(env);
  assert(config?.safety.sql_input_accepted === false, `${env}: sql_input_accepted should be false`);
  assert(config?.safety.db_path_selectable === false, `${env}: db_path_selectable should be false`);
  assert(config?.safety.fallback_used === false, `${env}: fallback_used should be false`);
}

// Summary
console.log('\n=== Summary ===');
console.log(`Total: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
