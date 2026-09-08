import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Target, Trophy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { backendService, LeaderboardMember, LeaderboardResponse } from '../../services/backend';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { RankingCohortSidebar } from './components/RankingCohortSidebar';
import { RankingHeader } from './components/RankingHeader';
import { RankingListRow } from './components/RankingListRow';
import { RankingPageSkeleton } from './components/RankingPageSkeleton';
import { RankingPodium } from './components/RankingPodium';
import { RankingScopeSelector } from './components/RankingScopeSelector';
import { RankingStreakBanner } from './components/RankingStreakBanner';
import { RankingScope, sortRankingMembers } from './components/rankingUi';

const MINIMUM_SKELETON_TIME_MS = 350;

export const RankingPage: React.FC = () => {
  const { user } = useAuth();
  const [scope, setScope] = useState<RankingScope>('course');
  const [rankingData, setRankingData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const loadingStartedAt = Date.now();
    setLoading(true);
    setError('');
    try {
      const response = await backendService.getLeaderboard('course');
      setRankingData(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải bảng xếp hạng.');
    } finally {
      const remainingSkeletonTime = MINIMUM_SKELETON_TIME_MS - (Date.now() - loadingStartedAt);
      if (remainingSkeletonTime > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingSkeletonTime));
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const currentCohort = rankingData?.currentCohort || user?.cohortCode || null;

  const sortedMembers = useMemo<LeaderboardMember[]>(() => {
    const allMembers = rankingData?.members || [];
    const visibleMembers = scope === 'cohort'
      ? (currentCohort
        ? allMembers.filter((member) => member.cohortCode.toLowerCase() === currentCohort.toLowerCase())
        : [])
      : allMembers;
    return sortRankingMembers(visibleMembers);
  }, [currentCohort, rankingData?.members, scope]);

  const topThree = useMemo(() => sortedMembers.slice(0, 3), [sortedMembers]);
  const topTenMembers = useMemo(() => sortedMembers.slice(0, 10), [sortedMembers]);

  const currentUserId = rankingData?.currentMemberId || user?.id;
  const currentUserRankIndex = useMemo(() => {
    if (!currentUserId) return -1;
    return sortedMembers.findIndex((member) => member.id === currentUserId);
  }, [currentUserId, sortedMembers]);

  const currentUserOutsideTopTen = currentUserRankIndex >= 10 ? sortedMembers[currentUserRankIndex] : null;

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4 pb-12 sm:space-y-5">
      <RankingHeader updatedAt={rankingData?.updatedAt} loading={loading} onRefresh={() => void load()} />

      <RankingScopeSelector
        scope={scope}
        currentCohort={currentCohort}
        memberCount={sortedMembers.length}
        onChange={setScope}
      />

      <RankingStreakBanner streakDays={user?.streakDays || 0} />

      <BoneyardSkeleton
        name="ranking-page-body"
        loading={loading}
        fallback={<RankingPageSkeleton />}
      >
        <RankingPodium
          members={topThree}
          title={scope === 'cohort' ? `Top 3 lớp ${currentCohort || ''}` : 'Top 3 toàn khóa'}
          currentUserId={currentUserId}
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 sm:gap-6">
          <section className="rounded-3xl border border-line bg-surface p-4 shadow-sm lg:col-span-2 sm:p-6">
            <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-content sm:text-lg">Thứ hạng học viên</h2>
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-black text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 uppercase tracking-wider">
                    Top 10
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-semibold text-content-muted">
                  {scope === 'course'
                    ? `Top 10 học viên có thành tích xuất sắc nhất toàn khoá (trên tổng số ${sortedMembers.length} học viên)`
                    : `Top 10 học viên xuất sắc nhất lớp ${currentCohort || ''} (trên tổng số ${sortedMembers.length} học viên)`}
                </p>
              </div>
            </div>

            {error ? (
              <div role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>
            ) : sortedMembers.length === 0 ? (
              <div className="mt-4 grid min-h-64 place-items-center rounded-2xl border border-dashed border-line bg-canvas p-6 text-center">
                <div>
                  <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"><Trophy className="size-6" /></span>
                  <p className="mt-3 font-black text-content">Chưa có dữ liệu xếp hạng</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-content-muted">Hãy hoàn thành các câu hỏi để xuất hiện trong bảng xếp hạng.</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">
                {topTenMembers.map((member, index) => (
                  <RankingListRow
                    key={member.id}
                    member={member}
                    rank={index + 1}
                    isCurrent={member.id === currentUserId}
                  />
                ))}

                {/* Pinned user rank card if outside Top 10 */}
                {currentUserOutsideTopTen && (
                  <div className="mt-5 border-t border-dashed border-line pt-4">
                    <div className="mb-2 flex items-center justify-between px-1 text-xs font-bold text-content-muted">
                      <span className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400">
                        <Target className="size-3.5" />
                        Vị trí hiện tại của bạn
                      </span>
                      <span className="font-extrabold text-content">
                        Hạng #{currentUserRankIndex + 1} / {sortedMembers.length}
                      </span>
                    </div>
                    <RankingListRow
                      member={currentUserOutsideTopTen}
                      rank={currentUserRankIndex + 1}
                      isCurrent={true}
                    />
                  </div>
                )}

                {sortedMembers.length > 10 && (
                  <p className="mt-4 text-center text-xs font-semibold text-content-muted">
                    Bảng xếp hạng hiển thị Top 10 học viên dẫn đầu. Tiếp tục luyện tập để chinh phục thứ hạng cao hơn!
                  </p>
                )}
              </div>
            )}
          </section>

          <div className="lg:col-span-1">
            <RankingCohortSidebar
              members={rankingData?.members || []}
              userCohortCode={currentCohort}
            />
          </div>
        </div>
      </BoneyardSkeleton>
    </section>
  );
};
