import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      status: 'healthy',
      environment: 'simulation',
      mock_tools: true,
      production_write_enabled: false,
      production_model_enabled: false,
      production_release_enabled: false,
      timestamp: new Date().toISOString(),
      message: '当前为模拟环境。真实生产写入、正式模型运行和正式信号发布均未启用。',
    },
  });
}
