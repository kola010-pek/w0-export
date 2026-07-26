import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const reportPath = path.join(process.cwd(), 'data', 'negative-test-report.json');
    
    if (!fs.existsSync(reportPath)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Test report not found',
          message: 'Run negative tests first to generate the report'
        },
        { status: 404 }
      );
    }

    const reportContent = fs.readFileSync(reportPath, 'utf-8');
    const report = JSON.parse(reportContent);

    return NextResponse.json({
      success: true,
      data: report,
      generated_at: new Date().toISOString(),
      report_path: 'data/negative-test-report.json'
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to read test report',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
