import { NextResponse } from 'next/server';
import { getTrackingAnalysisJobStatus } from '@/lib/redisStream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{
    jobId: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { jobId } = await context.params;
    const status = await getTrackingAnalysisJobStatus(jobId);

    if (!status) {
      return NextResponse.json({ error: 'job not found' }, { status: 404 });
    }

    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'tracking analysis job status failed';
    console.error('[Tracking Analysis] job status failed:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
