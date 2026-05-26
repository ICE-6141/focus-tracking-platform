import { NextResponse } from 'next/server';
import { getRankingSessionEntries, type RankingSessionEntry } from '@/lib/redisStream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RANKING_TIME_ZONE = process.env.RANKING_TIME_ZONE || 'Asia/Seoul';

interface RankingBoardEntry {
  rank: number;
  jobId: string;
  sessionId: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  page: 'solo' | 'room';
  completedAt: string;
  durationSeconds: number;
  validMinutes: number;
  avgBpm?: number;
  focusRatio: number;
  rankingScore: number;
  highFocusSeconds: number;
  highFocusMinutes: number;
}

function dateParts(value: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: RANKING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';

  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
  };
}

function formatDateKey(value: Date) {
  const parts = dateParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatMonthKey(value: Date) {
  const parts = dateParts(value);
  return `${parts.year}-${parts.month}`;
}

function normalizedDateKey(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : formatDateKey(new Date());
}

function normalizedMonthKey(value: string | null, dateKey: string) {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : dateKey.slice(0, 7);
}

function isFiniteRankingNumber(value: number) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isEligible(entry: RankingSessionEntry) {
  return entry.rankingEligible
    && entry.validMinutes >= 10
    && isFiniteRankingNumber(entry.rankingScore)
    && isFiniteRankingNumber(entry.highFocusSeconds);
}

function compareRankingEntry(a: RankingSessionEntry, b: RankingSessionEntry) {
  if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
  if (b.highFocusSeconds !== a.highFocusSeconds) return b.highFocusSeconds - a.highFocusSeconds;
  if (b.validMinutes !== a.validMinutes) return b.validMinutes - a.validMinutes;
  return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
}

function bestEntryByUser(entries: RankingSessionEntry[]) {
  const bestByUser = new Map<string, RankingSessionEntry>();

  entries.forEach((entry) => {
    const current = bestByUser.get(entry.userId);
    if (!current || compareRankingEntry(entry, current) < 0) {
      bestByUser.set(entry.userId, entry);
    }
  });

  return [...bestByUser.values()].sort(compareRankingEntry);
}

function boardEntry(entry: RankingSessionEntry, index: number): RankingBoardEntry {
  return {
    rank: index + 1,
    jobId: entry.jobId,
    sessionId: entry.sessionId,
    userId: entry.userId,
    userName: entry.userName,
    userAvatarUrl: entry.userAvatarUrl,
    page: entry.page,
    completedAt: entry.completedAt,
    durationSeconds: entry.durationSeconds,
    validMinutes: entry.validMinutes,
    avgBpm: entry.avgBpm,
    focusRatio: entry.focusRatio,
    rankingScore: entry.rankingScore,
    highFocusSeconds: entry.highFocusSeconds,
    highFocusMinutes: Number((entry.highFocusSeconds / 60).toFixed(1)),
  };
}

function buildBoard(entries: RankingSessionEntry[], key: string, period: 'daily' | 'monthly') {
  const scopedEntries = entries.filter((entry) => {
    const completedAt = new Date(entry.completedAt);
    if (Number.isNaN(completedAt.getTime())) return false;

    const entryKey = period === 'daily'
      ? formatDateKey(completedAt)
      : formatMonthKey(completedAt);

    return entryKey === key;
  });
  const rankedEntries = bestEntryByUser(scopedEntries).map(boardEntry);

  return {
    period,
    key,
    count: rankedEntries.length,
    entries: rankedEntries,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dateKey = normalizedDateKey(url.searchParams.get('date'));
    const monthKey = normalizedMonthKey(url.searchParams.get('month'), dateKey);
    const entries = (await getRankingSessionEntries()).filter(isEligible);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      timeZone: RANKING_TIME_ZONE,
      daily: buildBoard(entries, dateKey, 'daily'),
      monthly: buildBoard(entries, monthKey, 'monthly'),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ranking lookup failed';
    console.error('[Ranking] lookup failed:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
