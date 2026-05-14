import { NextResponse } from 'next/server';
import { createTrackingAnalysisJob, type TrackingAnalysisJobRequest } from '@/lib/redisStream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isValidRequest(value: unknown): value is TrackingAnalysisJobRequest {
  if (!value || typeof value !== 'object') return false;

  const body = value as Partial<TrackingAnalysisJobRequest>;
  return typeof body.meetingId === 'string'
    && body.meetingId.length > 0
    && typeof body.userId === 'string'
    && body.userId.length > 0
    && (body.page === 'solo' || body.page === 'room')
    && (body.reason === 'finish' || body.reason === 'leave')
    && typeof body.requestedAt === 'string';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!isValidRequest(body)) {
      return NextResponse.json({ error: 'invalid tracking analysis job request' }, { status: 400 });
    }

    const result = await createTrackingAnalysisJob(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'tracking analysis job creation failed';
    console.error('[Tracking Analysis] job creation failed:', error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
