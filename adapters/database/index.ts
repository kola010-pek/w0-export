/**
 * Database Adapter - 数据库适配器
 * 
 * 为现有数据库工具提供统一适配入口
 * 本阶段仅建立接口，不实现具体连接逻辑
 */

import { getDataSourceMode, isMockMode } from '../../src/lib/data-source';

/**
 * Database adapter interface
 */
export interface DatabaseAdapter {
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
  close(): Promise<void>;
}

/**
 * Get database adapter based on current environment
 */
export function getDatabaseAdapter(): DatabaseAdapter {
  const mode = getDataSourceMode();
  
  if (isMockMode()) {
    return new MockDatabaseAdapter();
  }
  
  if (mode === 'sample') {
    return new SampleDatabaseAdapter();
  }
  
  // real_readonly mode - not implemented in W0
  throw new Error('Real database connection not implemented in W0');
}

/**
 * Mock database adapter for simulation mode
 */
class MockDatabaseAdapter implements DatabaseAdapter {
  async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    console.log('[MockDB] Query:', sql, params);
    return [];
  }
  
  async close(): Promise<void> {
    console.log('[MockDB] Closed');
  }
}

/**
 * Sample database adapter for sample_staging mode
 */
class SampleDatabaseAdapter implements DatabaseAdapter {
  async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    console.log('[SampleDB] Query:', sql, params);
    return [];
  }
  
  async close(): Promise<void> {
    console.log('[SampleDB] Closed');
  }
}

/**
 * Check if database is available
 */
export function isDatabaseAvailable(): boolean {
  const mode = getDataSourceMode();
  return mode === 'mock' || mode === 'sample';
}
