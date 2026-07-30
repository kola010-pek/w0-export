import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    
    return NextResponse.json({
      success: true,
      data: {
        name: packageJson.name || 'financial-agent-workbench',
        version: packageJson.version || '0.1.0',
        node_version: process.version,
        next_version: '16.1.1',
        build_time: new Date().toISOString(),
        environment: process.env.COZE_PROJECT_ENV || 'DEV'
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to read version info'
    }, { status: 500 });
  }
}
