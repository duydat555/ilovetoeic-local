import type { LeaderboardCohort, LeaderboardMember } from '../../../services/backend';

export type RankingScope = 'course' | 'cohort';
export type RankingMetric = 'streakDays' | 'totalQuestions' | 'accuracyRate' | 'xp';
export type RankingRow = LeaderboardMember | LeaderboardCohort;

export const valueOf = (row: RankingRow, metric: RankingMetric): number => {
  if (metric === 'streakDays') return row.streakDays || 0;
  if (metric === 'totalQuestions') return row.totalQuestions || 0;
  if (metric === 'accuracyRate') return row.accuracyRate || 0;
  if (metric === 'xp') return (row as LeaderboardMember).xp || 0;
  return 0;
};

export const metricUnit = (metric: RankingMetric): string => {
  switch (metric) {
    case 'streakDays': return 'ngày';
    case 'totalQuestions': return 'câu';
    case 'accuracyRate': return '%';
    case 'xp': return 'XP';
    default: return '';
  }
};

export const formatRankingValue = (row: RankingRow, metric: RankingMetric): string => {
  const val = valueOf(row, metric);
  if (metric === 'accuracyRate') return `${val.toLocaleString('vi-VN')}%`;
  if (metric === 'xp') return `${val.toLocaleString('vi-VN')} XP`;
  return `${val.toLocaleString('vi-VN')} ${metricUnit(metric)}`;
};

export const studentFullName = (member: LeaderboardMember): string => (
  `${member.familyMiddleName ? `${member.familyMiddleName} ` : ''}${member.name.replace(/_K\d+$/i, '')}`.trim()
);

export const MIN_QUESTIONS_FOR_ACCURACY = 20;

export const effectiveAccuracyRate = (member: LeaderboardMember): number => (
  (member.totalQuestions || 0) >= MIN_QUESTIONS_FOR_ACCURACY ? (member.accuracyRate || 0) : 0
);

export const sortRankingMembers = (members: LeaderboardMember[]): LeaderboardMember[] => (
  [...members].sort((left, right) => (
    (right.xp || 0) - (left.xp || 0)
    || effectiveAccuracyRate(right) - effectiveAccuracyRate(left)
    || right.totalQuestions - left.totalQuestions
    || right.streakDays - left.streakDays
    || studentFullName(left).localeCompare(studentFullName(right), 'vi')
  ))
);
