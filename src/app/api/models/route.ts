import { NextResponse } from 'next/server';
import { getRuns } from '@/lib/store';

// Models API - Returns mock model version data
export async function GET() {
  try {
    const runsRecord = getRuns();
    const runs = Object.values(runsRecord);

    // Generate mock model versions from runs
    const models = runs
      .filter(run => run.scenario === 'scenario_a' || run.scenario === 'scenario_c')
      .map((run, index) => ({
        version_id: `model_v1.0.${run.run_id.slice(-8)}`,
        model_type: 'alpha_factor_model',
        created_at: run.created_at,
        performance_metrics: {
          sharpe_ratio: 1.85 + index * 0.1,
          max_drawdown: -0.12 - index * 0.02,
          win_rate: 0.58 + index * 0.02,
          information_ratio: 1.2 + index * 0.05,
        },
        training_data_range: {
          start: '2023-01-01',
          end: run.data_cutoff,
        },
        status: run.status === 'COMPLETED' ? 'production_ready' : 'pending_review',
        risk_assessment: {
          max_drawdown: -0.12 - index * 0.02,
          sharpe_ratio: 1.85 + index * 0.1,
          win_rate: 0.58 + index * 0.02,
        },
        run_id: run.run_id,
        mock: true,
      }));

    // Add a default mock model if no runs exist
    if (models.length === 0) {
      models.push({
        version_id: 'model_v1.0.default',
        model_type: 'alpha_factor_model',
        created_at: new Date().toISOString(),
        performance_metrics: {
          sharpe_ratio: 1.85,
          max_drawdown: -0.12,
          win_rate: 0.58,
          information_ratio: 1.2,
        },
        training_data_range: {
          start: '2023-01-01',
          end: new Date().toISOString().split('T')[0],
        },
        status: 'pending_review',
        risk_assessment: {
          max_drawdown: -0.12,
          sharpe_ratio: 1.85,
          win_rate: 0.58,
        },
        run_id: '',
        mock: true,
      });
    }

    return NextResponse.json({
      success: true,
      data: models,
      mock: true,
      message: '当前为模拟环境，模型数据为 Mock 生成',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: '获取模型数据失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
