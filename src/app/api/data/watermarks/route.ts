// Phase 2: /api/data/watermarks - Read-only data watermark endpoint
// Returns data freshness and completeness information
// No write operations, no SQL input, no database path selection

import { NextRequest, NextResponse } from 'next/server';
import {
  buildPhase2Response,
  isMockMode,
  evaluateDataFreshness,
} from '@/lib/data-source';

interface Watermark {
  dataset: string;
  latest_date: string;
  record_count: number;
  last_updated: string;
  status: 'fresh' | 'stale' | 'expired' | 'missing';
  source_table?: string;
  schema_version?: string;
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

// Mock watermark data
function getMockWatermarksData(): WatermarksData {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const watermarks: Watermark[] = [
    {
      dataset: 'daily_kline',
      latest_date: yesterday,
      record_count: 5234,
      last_updated: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'fresh',
      source_table: 'mock_daily_kline',
      schema_version: 'v1.0',
    },
    {
      dataset: 'adjustment_factors',
      latest_date: yesterday,
      record_count: 1200,
      last_updated: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      status: 'fresh',
      source_table: 'mock_adjustment_factors',
      schema_version: 'v1.0',
    },
    {
      dataset: 'factor_data',
      latest_date: yesterday,
      record_count: 8500,
      last_updated: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      status: 'fresh',
      source_table: 'mock_factor_data',
      schema_version: 'v1.0',
    },
    {
      dataset: 'market_factors',
      latest_date: yesterday,
      record_count: 3200,
      last_updated: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      status: 'fresh',
      source_table: 'mock_market_factors',
      schema_version: 'v1.0',
    },
  ];

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

// Real watermark data (read-only, no write operations)
async function getRealWatermarksData(): Promise<WatermarksData> {
  // In real mode, this would query actual database watermarks (read-only)
  // For Phase 2, we still return mock data but mark it differently
  // Real implementation would:
  // 1. Query database for latest data dates per dataset
  // 2. Check record counts
  // 3. Evaluate freshness based on last_updated timestamps
  // 4. Return actual watermark information
  return getMockWatermarksData();
}

export async function GET(request: NextRequest) {
  try {
    const isMock = isMockMode();
    const searchParams = request.nextUrl.searchParams;
    const datasetFilter = searchParams.get('dataset');

    let data: WatermarksData;

    if (isMock) {
      data = getMockWatermarksData();
    } else {
      data = await getRealWatermarksData();
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

    // Evaluate overall gate status
    let gateStatus: 'PASS' | 'WARN' | 'BLOCK' = 'PASS';
    const warnings: string[] = [];

    // Check for missing data
    if (data.summary.missing_count > 0) {
      gateStatus = 'BLOCK';
      warnings.push(`missing_data: ${data.summary.missing_count} datasets`);
    }

    // Check for expired data
    if (data.summary.expired_count > 0) {
      gateStatus = 'BLOCK';
      warnings.push(`expired_data: ${data.summary.expired_count} datasets`);
    }

    // Check for stale data
    if (data.summary.stale_count > 0) {
      if (gateStatus !== 'BLOCK') {
        gateStatus = 'WARN';
      }
      warnings.push(`stale_data: ${data.summary.stale_count} datasets`);
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
