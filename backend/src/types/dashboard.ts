export interface StudySessionRecord {
  id: string;
  createdAt: number;
  durationSeconds: number;
  focusRatio: number;
  avgBpm: number;
  validMinutes?: number;
  rankingScore?: number;
  highFocusSeconds?: number;
  rankingEligible?: boolean;
}
