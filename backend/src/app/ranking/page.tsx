'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface RankingEntry {
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

interface RankingBoard {
  period: 'daily' | 'monthly';
  key: string;
  count: number;
  mvp: RankingEntry | null;
  entries: RankingEntry[];
}

interface RankingResponse {
  generatedAt: string;
  timeZone: string;
  daily: RankingBoard;
  monthly: RankingBoard;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes}분` : `${minutes}분 ${rest}초`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || '--';
}

function MvpCard({
  entry,
  label,
  loading,
}: {
  entry?: RankingEntry | null;
  label: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
          <p className="mt-1 text-lg font-bold text-slate-100">MVP</p>
        </div>
        <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/20">
          TOP 1
        </span>
      </div>

      {entry ? (
        <div className="flex min-w-0 items-center gap-3">
          {entry.userAvatarUrl ? (
            <img
              src={entry.userAvatarUrl}
              alt=""
              className="h-11 w-11 rounded-md border border-slate-700 object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-800 text-sm font-bold text-slate-300">
              {initials(entry.userName)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white">{entry.userName}</p>
            <p className="mt-1 text-xs text-slate-500">
              {formatScore(entry.rankingScore)}점 · 집중 {entry.focusRatio}% · 고집중 {formatDuration(entry.highFocusSeconds)}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-11 items-center text-sm text-slate-500">
          {loading ? '선정 중입니다.' : 'MVP 대상 세션이 없습니다.'}
        </div>
      )}
    </div>
  );
}

function BoardTable({
  board,
  loading,
  title,
}: {
  board?: RankingBoard;
  loading: boolean;
  title: string;
}) {
  const entries = board?.entries ?? [];

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-emerald-300">{board?.key ?? '--'}</p>
          <h2 className="mt-1 text-xl font-bold">{title}</h2>
        </div>
        <p className="text-sm text-slate-500">{loading ? '불러오는 중' : `${entries.length}명`}</p>
      </div>

      {entries.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">순위</th>
                <th className="px-4 py-3">사용자</th>
                <th className="px-4 py-3">랭킹 점수</th>
                <th className="px-4 py-3">집중 비율</th>
                <th className="px-4 py-3">고집중 시간</th>
                <th className="px-4 py-3">유효 시간</th>
                <th className="px-4 py-3">완료 시각</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {entries.map((entry) => (
                <tr key={entry.jobId} className="bg-slate-900/60">
                  <td className="px-4 py-3">
                    <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-slate-950 px-2 font-bold text-cyan-200 ring-1 ring-slate-800">
                      {entry.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {entry.userAvatarUrl ? (
                        <img
                          src={entry.userAvatarUrl}
                          alt=""
                          className="h-9 w-9 rounded-md border border-slate-700 object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-800 text-xs font-bold text-slate-300">
                          {initials(entry.userName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-100">{entry.userName}</p>
                        <p className="text-xs text-slate-500">{entry.page === 'room' ? 'Focus Room' : 'Solo'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-lg font-bold text-emerald-300">{formatScore(entry.rankingScore)}</td>
                  <td className="px-4 py-3 font-semibold text-cyan-300">{entry.focusRatio}%</td>
                  <td className="px-4 py-3 text-slate-300">{formatDuration(entry.highFocusSeconds)}</td>
                  <td className="px-4 py-3 text-slate-300">{entry.validMinutes.toFixed(1)}분</td>
                  <td className="px-4 py-3 text-slate-400">{formatDateTime(entry.completedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950/40 px-4 text-center text-sm text-slate-500">
          {loading ? '랭킹 데이터를 불러오고 있습니다.' : '랭킹에 반영된 세션이 없습니다.'}
        </div>
      )}
    </section>
  );
}

export default function RankingPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(() => formatMonthKey(new Date()));
  const [ranking, setRanking] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bestDailyScore = useMemo(() => ranking?.daily.entries[0]?.rankingScore, [ranking]);
  const bestMonthlyScore = useMemo(() => ranking?.monthly.entries[0]?.rankingScore, [ranking]);

  useEffect(() => {
    const controller = new AbortController();

    const loadRanking = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          date: selectedDate,
          month: selectedMonth,
        });
        const response = await fetch(`/api/ranking?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null) as RankingResponse | { error?: string } | null;

        if (!response.ok || !payload || !('daily' in payload)) {
          const message = payload && 'error' in payload ? payload.error : undefined;
          throw new Error(message ?? '랭킹을 불러오지 못했습니다.');
        }

        setRanking(payload);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : '랭킹을 불러오지 못했습니다.');
        setRanking(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadRanking();
    return () => controller.abort();
  }, [selectedDate, selectedMonth]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-300">Ranking Board</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">집중 랭킹</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="h-10 rounded-md border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
            >
              대시보드
            </button>
            <button
              onClick={() => router.push('/')}
              className="h-10 rounded-md bg-cyan-600 px-4 text-sm font-semibold transition hover:bg-cyan-500"
            >
              측정 시작
            </button>
          </div>
        </header>

        <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_minmax(360px,520px)] lg:items-end">
          <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">일별 랭킹 날짜</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setSelectedMonth(event.target.value.slice(0, 7));
                }}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition [color-scheme:dark] hover:border-slate-500 focus:border-cyan-400"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">월별 랭킹 월</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition [color-scheme:dark] hover:border-slate-500 focus:border-cyan-400"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-500">일별 최고 점수</p>
              <p className="mt-2 text-2xl font-bold text-emerald-300">
                {typeof bestDailyScore === 'number' ? formatScore(bestDailyScore) : '--'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-500">월별 최고 점수</p>
              <p className="mt-2 text-2xl font-bold text-cyan-300">
                {typeof bestMonthlyScore === 'number' ? formatScore(bestMonthlyScore) : '--'}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2">
          <MvpCard entry={ranking?.daily.mvp} loading={loading} label="일별" />
          <MvpCard entry={ranking?.monthly.mvp} loading={loading} label="월별" />
        </section>

        {error && (
          <div className="mb-6 rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          <BoardTable board={ranking?.daily} loading={loading} title="일별 랭킹" />
          <BoardTable board={ranking?.monthly} loading={loading} title="월별 랭킹" />
        </div>
      </div>
    </main>
  );
}
