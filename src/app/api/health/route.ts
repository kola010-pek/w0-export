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
      message: '\u5F53\u524D\u4E3A\u6A21\u62DF\u73AF\u5883\u3002\u771F\u5B9E\u751F\u4EA7\u5199\u5165\u3001\u6B63\u5F0F\u6A21\u578B\u8FD0\u884C\u548C\u6B63\u5F0F\u4FE1\u53F7\u53D1\u5E03\u5747\u672A\u542F\u7528\u3002',
    },
  });
}
