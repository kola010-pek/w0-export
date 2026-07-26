// Phase 2.1: /api/data/watermarks - Read-only data watermark with real SQLite support
// Security: Read-only, no SQL input, no write operations

import { NextRequest, NextResponse } from 'next/server';
import {
  buildPhase2Response,
  isMockMode,
} from '@/lib/data-source';
import {
  getReadOnlyConnection,
  getWatermark,
} from '@/lib/sqlite-adapter';

interface Watermark {
  dataset: string;
  latest_date: string | null;
  record_count: number;
  last_updated: string | null;
  status: 'fresh' | 'stale' | 'expired' | 'missing';
  source_table: string;
  schema_version: string;
  error?: string;
}

interface WatermarksData {
  watermarks: Watermark[];
  summary: {
    total_datasets: number;
    fresh_count: number;
    stale_count: number;
    expired_count: number;
    missing_count: number;
  };
}

// Required datasets
const REQUIRED_DATASETS = ['daily_kline', 'adjustment_factors', 'factor_data', 'market_factors'];

// Evaluate freshness status based on last_updated time
function evaluateFreshnessStatus(lastUpdated: string | null): 'fresh' | 'stale' | 'expired' | 'missing' {
  if (!lastUpdated) return 'missing';
  
  const lastUpdatedDate = new Date(lastUpdated);
  const now = new Date();
  const ageHours = (now.getTime() - lastUpdatedDate.getTime()) / (1000 * 60 * 60);

  if (ageHours > 48) return 'expired';
  if (ageHours > 24) return 'stale';
  return 'fresh';
}

// Mock watermark data
function getMockWatermarksData(): WatermarksData {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const watermarks: Watermark[] = REQUIRED_DATASETS.map((dataset, index) => ({
    dataset,
    latest_date: yesterday,
    record_count: 1000 + index * 500,
    last_updated: new Date(now.getTime() - (index + 1) * 60 * 60 * 1000).toISOString(),
    status: 'fresh' as const,
    source_table: `mock_${dataset}`,
    schema_version: 'v1.0',
  }));

  return {
    watermarks,
    summary: {
      total_datasets: watermarks.length,
      fresh_count: watermarks.filter((w) => w.status === 'fresh').length,
      stale_count: watermarks.filter((w) => w.status === 'stale').length,
      expired_count: watermarks.filter((w) => w.status === 'expired').length,
      missing_count: watermarks.filter((w) => w.status === 'missing').length,
    },
  };
}

// Real watermark data from SQLite
async function getRealWatermarksData(): Promise<{ data: WatermarksData; warnings: string[]; gateStatus: 'PASS' | 'WARN' | 'BLOCK' }> {
  const warnings: string[] = [];
  let gateStatus: 'PASS' | 'WARN' | 'BLOCK' = 'PASS';

  const { db, error: connError, isConnected } = getReadOnlyConnection();
  
  if (!isConnected || !db) {
    // Database connection failed - BLOCK
    const watermarks: Watermark[] = REQUIRED_DATASETS.map(dataset => ({
      dataset,
      latest_date: null,
      record_count: 0,
      last_updated: null,
      status: 'missing' as const,
      source_table: dataset,
      schema_version: 'v1.0',
      error: connError?.message || 'Database connection failed',
    }));

    return {
      data: {
        watermarks,
        summary: {
          total_datasets: watermarks.length,
          fresh_count: 0,
          stale_count: 0,
          expired_count: 0,
          missing_count: watermarks.length,
        },
      },
      warnings: ['database_connection_failed'],
      gateStatus: 'BLOCK',
    };
  }

  // Get watermark for each dataset
  const watermarks: Watermark[] = [];
  
  for (const dataset of REQUIRED_DATASETS) {
    const result = getWatermark(dataset);
    
    if (result.error) {
      watermarks.push({
        dataset,
        latest_date: null,
        record_count: 0,
        last_updated: null,
        status: 'missing',
        source_table: dataset,
        schema_version: 'v1.0',
        error: result.error,
      });
      warnings.push(`${dataset}_error: ${result.error}`);
      gateStatus = 'BLOCK';
    } else {
      const status = evaluateFreshnessStatus(result.lastUpdated);
      
      watermarks.push({
        dataset,
        latest_date: result.latestDate,
        record_count: result.recordCount,
        last_updated: result.lastUpdated,
        status,
        source_table: dataset,
        schema_version: 'v1.0',
      });

      // Check for stale/expired data
      if (status === 'expired') {
        gateStatus = 'BLOCK';
        warnings.push(`${dataset}_expired`);
      } else if (status === 'stale') {
        if (gateStatus !== 'BLOCK') {
          gateStatus = 'WARN';
        }
        warnings.push(`${dataset}_stale`);
      }

      // Check for empty table
      if (result.recordCount === 0) {
        gateStatus = 'BLOCK';
        warnings.push(`${dataset}_empty`);
      }
    }
  }

  return {
    data: {
      watermarks,
      summary: {
        total_datasets: watermarks.length,
        fresh_count: watermarks.filter((w) => w.status === 'fresh').length,
        stale_count: watermarks.filter((w) => w.status === 'stale').length,
        expired_count: watermarks.filter((w) => w.status === 'expired').length,
        missing_count: watermarks.filter((w) => w.status === 'missing').length,
      },
    },
    warnings,
    gateStatus,
  };
}

export async function GET(request: NextRequest) {
  try {
    const isMock = isMockMode();
    const searchParams = request.nextUrl.searchParams;
    const datasetFilter = searchParams.get('dataset');

    let data: WatermarksData;
    let warnings: string[] = [];
    let gateStatus: 'PASS' | 'WARN' | 'BLOCK' = 'PASS';

    if (isMock) {
      data = getMockWatermarksData();
    } else {
      const result = await getRealWatermarksData();
      data = result.data;
      warnings = result.warnings;
      gateStatus = result.gateStatus;
    }

    // Filter by dataset if specified
    if (datasetFilter) {
      data = {
        ...data,
        watermarks: data.watermarks.filter((w) => w.dataset === datasetFilter),
      };
      data.summary = {
        total_datasets: data.watermarks.length,
        fresh_count: data.watermarks.filter((w) => w.status === 'fresh').length,
        stale_count: data.watermarks.filter((w) => w.status === 'stale').length,
        expired_count: data.watermarks.filter((w) => w.status === 'expired').length,
        missing_count: data.watermarks.filter((w) => w.status === 'missing').length,
      };
    }

    // Check for missing data
    if (data.summary.missing_count > 0) {
      gateStatus = 'BLOCK';
      if (!warnings.includes('missing_data')) {
        warnings.push(`missing_data: ${data.summary.missing_count} datasets`);
      }
    }

    // Evidence missing check
    const hasEvidence = data.watermarks.every((w) => w.source_table && w.schema_version);
    if (!hasEvidence) {
      if (gateStatus !== 'BLOCK') {
        gateStatus = 'WARN';
      }
      warnings.push('evidence_missing');
    }

    const source = isMock ? 'mock_watermark_service' : 'real_watermark_service';

    return NextResponse.json(
      buildPhase2Response({
        data,
        source,
        evidencePrefix: 'watermark',
        gateStatus,
        warnings: warnings.length > 0 ? warnings : undefined,
      })
    );
  } catch (error) {
    // Interface unreachable or format abnormal - must BLOCK, never degrade to PASS
    return NextResponse.json(
      buildPhase2Response({
        data: null,
        source: 'watermark_service',
        evidencePrefix: 'watermark',
        gateStatus: 'BLOCK',
        error: error instanceof Error ? error.message : 'Watermark check failed',
        success: false,
      }),
      { status: 500 }
    );
  }
}
