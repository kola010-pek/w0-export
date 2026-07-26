// Phase 2.2A: GET /api/phase2/real-negative-test-report
// Returns the Phase 2.2 negative test report.
// If report doesn't exist, runs the tests and generates it.

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { runRealNegativeTests } from '@/../tests/phase2-2-negative-tests';

const REPORT_PATH = path.join(process.cwd(), 'data', 'real-negative-test-report.json');

export async function GET() {
  try {
    // Check if report already exists
    if (fs.existsSync(REPORT_PATH)) {
      const content = fs.readFileSync(REPORT_PATH, 'utf-8');
      const report = JSON.parse(content);
      
      return NextResponse.json({
        success: true,
        data: report,
        generated_at: report.executed_at,
        source: 'real_negative_test_report',
      });
    }

    // Run tests and generate report
    const report = await runRealNegativeTests();
    
    // Save report to file
    const reportDir = path.dirname(REPORT_PATH);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
    
    return NextResponse.json({
      success: true,
      data: report,
      generated_at: report.executed_at,
      source: 'real_negative_test_report',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run or read real negative tests',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
