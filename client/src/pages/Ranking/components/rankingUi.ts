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

export const rawAccuracyRatio = (member: LeaderboardMember): number => (
  (member.totalQuestions || 0) >= MIN_QUESTIONS_FOR_ACCURACY
    ? ((member.correctQuestions || 0) / (member.totalQuestions || 1))
    : -1.0
);

export const effectiveAccuracyRate = (member: LeaderboardMember): number => (
  (member.totalQuestions || 0) >= MIN_QUESTIONS_FOR_ACCURACY ? (member.accuracyRate || 0) : 0
);

export const RANKING_XP_CLUSTER_EPSILON = 200;

export const clusterByXp = <T extends { xp?: number }>(
  usersSortedByXpDesc: T[],
  epsilon = RANKING_XP_CLUSTER_EPSILON,
): T[][] => {
  const clusters: T[][] = [];
  let currentCluster: T[] = [];
  let clusterTopXp: number | null = null;

  for (const user of usersSortedByXpDesc) {
    const userXp = user.xp || 0;
    if (clusterTopXp === null || (clusterTopXp - userXp) <= epsilon) {
      if (clusterTopXp === null) {
        clusterTopXp = userXp;
      }
      currentCluster.push(user);
    } else {
      clusters.push(currentCluster);
      currentCluster = [user];
      clusterTopXp = userXp;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }
  return clusters;
};

export const sortClusterMembers = (members: LeaderboardMember[]): LeaderboardMember[] => (
  [...members].sort((left, right) => (
    rawAccuracyRatio(right) - rawAccuracyRatio(left)
    || (right.streakDays || 0) - (left.streakDays || 0)
    || studentFullName(left).localeCompare(studentFullName(right), 'vi')
  ))
);

export const sortRankingMembers = (
  members: LeaderboardMember[],
  epsilon = RANKING_XP_CLUSTER_EPSILON,
): LeaderboardMember[] => {
  if (!members.length) return [];
  const byXpDesc = [...members].sort((a, b) => ((b.xp || 0) - (a.xp || 0)) || a.id.localeCompare(b.id));
  const clusters = clusterByXp(byXpDesc, epsilon);
  return clusters.flatMap(sortClusterMembers);
};
