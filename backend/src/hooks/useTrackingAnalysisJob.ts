'use client';

import { useCallback } from 'react';

interface CreateTrackingAnalysisJobArgs {
  meetingId: string;
  userId: string;
  page: 'solo' | 'room';
  reason: 'finish' | 'leave';
}

export function useTrackingAnalysisJob() {
  return useCallback(async ({ meetingId, userId, page, reason }: CreateTrackingAnalysisJobArgs) => {
    const response = await fetch('/api/tracking/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meetingId,
        userId,
        page,
        reason,
        requestedAt: new Date().toISOString(),
      }),
    });

    const payload = await response.json().catch(() => null) as { jobId?: string; error?: string } | null;
    if (!response.ok || !payload?.jobId) {
      throw new Error(payload?.error ?? '분석 작업 등록에 실패했습니다.');
    }

    return payload.jobId;
  }, []);
}
