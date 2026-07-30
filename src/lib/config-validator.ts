/**
 * W0 Configuration Validator
 * 
 * Validates environment configuration against the environment contract.
 * Returns BLOCK status if any validation fails.
 * Never silently falls back to another environment.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface EnvironmentConfig {
  environment: {
    name: string;
    description: string;
  };
  data: {
    source: string;
    is_mock?: boolean;
    is_sample?: boolean;
    real_db_path_configured: boolean;
    real_db_path?: string;
    preflight_target?: string;
    readonly?: {
      required: boolean;
      verified: boolean;
      mechanism?: string;
    };
    query_only?: {
      required: boolean;
      verified: boolean;
    };
    sample_data_path?: string;
  };
  capabilities: {
    production_write_enabled: boolean;
    production_model_enabled: boolean;
    production_release_enabled: boolean;
    human_approval_required: boolean;
  };
  gates: {
    default_status: string;
    block_reasons?: string[];
    quality_gate_enabled?: boolean;
    approval_gate_enabled?: boolean;
    quality_checks?: string[];
  };
  safety: {
    fallback_used: boolean;
    auto_migration_disabled: boolean;
    auto_fill_disabled: boolean;
    sql_input_accepted: boolean;
    db_path_selectable: boolean;
  };
  security?: {
    path_not_exposed?: boolean;
    write_rejection_verified?: boolean;
    quick_check_required?: boolean;
    audit_log_enabled?: boolean;
    rollback_required?: boolean;
  };
  approval?: {
    required_for?: string[];
    approvers?: string[];
  };
  notes?: string;
}

export interface ValidationResult {
  success: boolean;
  status: 'PASS' | 'BLOCK';
  error_code?: string;
  block_reasons: string[];
  fallback_used: boolean;
  environment: string;
  generated_at: string;
  config?: EnvironmentConfig;
}

const VALID_ENVIRONMENTS = ['simulation', 'sample_staging', 'real_readonly', 'production_guarded'];

const CONFIG_DIR = path.join(process.cwd(), 'config', 'environments');

/**
 * Load environment configuration from YAML file
 */
export function loadEnvironmentConfig(envName: string): EnvironmentConfig | null {
  const configPath = path.join(CONFIG_DIR, `${envName}.yaml`);
  
  if (!fs.existsSync(configPath)) {
    return null;
  }
  
  const content = fs.readFileSync(configPath, 'utf-8');
  return yaml.load(content) as EnvironmentConfig;
}

/**
 * Validate environment configuration against contract
 */
export function validateEnvironmentConfig(config: EnvironmentConfig): ValidationResult {
  const blockReasons: string[] = [];
  const envName = config.environment?.name;
  
  // Check environment name is valid
  if (!envName || !VALID_ENVIRONMENTS.includes(envName)) {
    blockReasons.push(`invalid_environment_name: ${envName || 'undefined'}`);
  }
  
  // Check required fields exist
  if (!config.data) {
    blockReasons.push('missing_data_configuration');
  }
  
  if (!config.capabilities) {
    blockReasons.push('missing_capabilities_configuration');
  }
  
  if (!config.safety) {
    blockReasons.push('missing_safety_configuration');
  }
  
  // If basic structure is missing, return early
  if (blockReasons.length > 0) {
    return {
      success: false,
      status: 'BLOCK',
      error_code: 'CONFIGURATION_BLOCK',
      block_reasons: blockReasons,
      fallback_used: false,
      environment: envName || '',
      generated_at: new Date().toISOString(),
    };
  }
  
  // Environment-specific validation
  switch (envName) {
    case 'simulation':
      validateSimulation(config, blockReasons);
      break;
    case 'sample_staging':
      validateSampleStaging(config, blockReasons);
      break;
    case 'real_readonly':
      validateRealReadonly(config, blockReasons);
      break;
    case 'production_guarded':
      validateProductionGuarded(config, blockReasons);
      break;
  }
  
  // Common safety checks
  validateCommonSafety(config, blockReasons);
  
  const isBlocked = blockReasons.length > 0;
  
  return {
    success: !isBlocked,
    status: isBlocked ? 'BLOCK' : 'PASS',
    error_code: isBlocked ? 'CONFIGURATION_BLOCK' : undefined,
    block_reasons: blockReasons,
    fallback_used: false,
    environment: envName,
    generated_at: new Date().toISOString(),
    config: config,
  };
}

function validateSimulation(config: EnvironmentConfig, blockReasons: string[]): void {
  // simulation must have is_mock=true
  if (config.data.is_mock !== true) {
    blockReasons.push('simulation_must_have_is_mock_true');
  }
  
  // simulation must NOT have production capabilities
  if (config.capabilities.production_write_enabled) {
    blockReasons.push('simulation_must_not_have_production_write');
  }
  if (config.capabilities.production_model_enabled) {
    blockReasons.push('simulation_must_not_have_production_model');
  }
  if (config.capabilities.production_release_enabled) {
    blockReasons.push('simulation_must_not_have_production_release');
  }
  
  // simulation must NOT have real database
  if (config.data.real_db_path_configured) {
    blockReasons.push('simulation_must_not_have_real_db');
  }
}

function validateSampleStaging(config: EnvironmentConfig, blockReasons: string[]): void {
  // sample_staging must have is_sample=true
  if (config.data.is_sample !== true) {
    blockReasons.push('sample_staging_must_have_is_sample_true');
  }
  
  // sample_staging must NOT have production capabilities
  if (config.capabilities.production_write_enabled) {
    blockReasons.push('sample_staging_must_not_have_production_write');
  }
  if (config.capabilities.production_model_enabled) {
    blockReasons.push('sample_staging_must_not_have_production_model');
  }
  if (config.capabilities.production_release_enabled) {
    blockReasons.push('sample_staging_must_not_have_production_release');
  }
  
  // sample_staging must NOT have real database
  if (config.data.real_db_path_configured) {
    blockReasons.push('sample_staging_must_not_have_real_db');
  }
}

function validateRealReadonly(config: EnvironmentConfig, blockReasons: string[]): void {
  // real_readonly must have readonly required
  if (!config.data.readonly?.required) {
    blockReasons.push('real_readonly_must_require_readonly');
  }
  
  // real_readonly must have query_only required
  if (!config.data.query_only?.required) {
    blockReasons.push('real_readonly_must_require_query_only');
  }
  
  // real_readonly must NOT have production capabilities
  if (config.capabilities.production_write_enabled) {
    blockReasons.push('real_readonly_must_not_have_production_write');
  }
  if (config.capabilities.production_model_enabled) {
    blockReasons.push('real_readonly_must_not_have_production_model');
  }
  if (config.capabilities.production_release_enabled) {
    blockReasons.push('real_readonly_must_not_have_production_release');
  }
  
  // real_readonly must NOT have fallback
  if (config.safety.fallback_used) {
    blockReasons.push('real_readonly_must_not_use_fallback');
  }
  
  // W0 Contract: real_readonly must be BLOCK when path is not configured
  if (!config.data.real_db_path_configured) {
    blockReasons.push('real_db_path_not_configured');
  }
}

function validateProductionGuarded(config: EnvironmentConfig, blockReasons: string[]): void {
  // production_guarded must have human approval required
  if (!config.capabilities.human_approval_required) {
    blockReasons.push('production_guarded_must_require_human_approval');
  }
  
  // production_guarded must NOT have production capabilities enabled by default
  if (config.capabilities.production_write_enabled) {
    blockReasons.push('production_guarded_must_not_have_production_write_enabled_by_default');
  }
  if (config.capabilities.production_model_enabled) {
    blockReasons.push('production_guarded_must_not_have_production_model_enabled_by_default');
  }
  if (config.capabilities.production_release_enabled) {
    blockReasons.push('production_guarded_must_not_have_production_release_enabled_by_default');
  }
  
  // W0 Contract: production_guarded must be BLOCK by default (production capabilities disabled)
  if (!config.capabilities.production_write_enabled && 
      !config.capabilities.production_model_enabled && 
      !config.capabilities.production_release_enabled) {
    blockReasons.push('production_capabilities_disabled_by_default');
  }
}

function validateCommonSafety(config: EnvironmentConfig, blockReasons: string[]): void {
  // All environments must have safety settings
  if (config.safety.sql_input_accepted) {
    blockReasons.push('sql_input_must_not_be_accepted');
  }
  
  if (config.safety.db_path_selectable) {
    blockReasons.push('db_path_must_not_be_selectable_from_frontend');
  }
  
  // Check for path leakage
  if (config.data.real_db_path && config.data.real_db_path.length > 0) {
    // Path should not be exposed in frontend
    if (!config.security?.path_not_exposed) {
      blockReasons.push('real_db_path_must_not_be_exposed');
    }
  }
  
  // Check for conflicting configurations
  if (config.data.is_mock && config.data.is_sample) {
    blockReasons.push('cannot_be_both_mock_and_sample');
  }
  
  if (config.data.is_mock && config.data.real_db_path_configured) {
    blockReasons.push('cannot_be_mock_and_have_real_db');
  }
}

/**
 * Get current environment from environment variable or default to simulation
 */
export function getCurrentEnvironment(): string {
  return process.env.ENVIRONMENT || process.env.DATA_SOURCE_MODE || 'simulation';
}

/**
 * Validate current environment configuration
 */
export function validateCurrentEnvironment(): ValidationResult {
  const envName = getCurrentEnvironment();
  const config = loadEnvironmentConfig(envName);
  
  if (!config) {
    return {
      success: false,
      status: 'BLOCK',
      error_code: 'CONFIGURATION_BLOCK',
      block_reasons: [`environment_config_not_found: ${envName}`],
      fallback_used: false,
      environment: envName,
      generated_at: new Date().toISOString(),
    };
  }
  
  return validateEnvironmentConfig(config);
}

/**
 * Flat environment config interface matching W0 contract
 */
export interface FlatEnvironmentConfig {
  data_source: string;
  is_mock: boolean;
  is_sample: boolean;
  real_db_path_configured: boolean;
  production_write_enabled: boolean;
  production_model_enabled: boolean;
  production_release_enabled: boolean;
  human_approval_required: boolean;
  readonly_required: boolean;
  query_only_required: boolean;
  fallback_used: boolean;
  gate_status: string;
  environment: string;
}

/**
 * Get flat environment config matching W0 contract
 */
export function getFlatEnvironmentConfig(envName?: string): FlatEnvironmentConfig | null {
  const config = loadEnvironmentConfig(envName || getCurrentEnvironment());
  if (!config) return null;
  
  return {
    data_source: config.data.source,
    is_mock: config.data.is_mock ?? false,
    is_sample: config.data.is_sample ?? false,
    real_db_path_configured: config.data.real_db_path_configured ?? false,
    production_write_enabled: config.capabilities.production_write_enabled ?? false,
    production_model_enabled: config.capabilities.production_model_enabled ?? false,
    production_release_enabled: config.capabilities.production_release_enabled ?? false,
    human_approval_required: config.capabilities.human_approval_required ?? false,
    readonly_required: config.data.readonly?.required || false,
    query_only_required: config.data.query_only?.required || false,
    fallback_used: config.safety.fallback_used ?? false,
    gate_status: config.gates.default_status || 'BLOCK',
    environment: config.environment.name,
  };
}
