import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe, Target, Trophy, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { backendService, LeaderboardMember, LeaderboardResponse } from '../../services/backend';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { RankingCohortSidebar } from './components/RankingCohortSidebar';
import { RankingHeader } from './components/RankingHeader';
import { RankingListRow } from './components/RankingListRow';
import { RankingPageSkeleton } from './components/RankingPageSkeleton';
import { RankingPodium } from './components/RankingPodium';
import { RankingScopeSelector } from './components/RankingScopeSelector';
import { RankingStreakBanner } from './components/RankingStreakBanner';
import { RankingWeeklyGoalCard } from './components/RankingWeeklyGoalCard';
import { RankingScope, sortRankingMembers } from './components/rankingUi';

const MINIMUM_SKELETON_TIME_MS = 350;

export const RankingPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
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
      setError(
        loadError instanceof Error
          ? loadError.message
          : (language === 'en' ? 'Unable to load leaderboard.' : 'Không thể tải bảng xếp hạng.')
      );
    } finally {
      const remainingSkeletonTime = MINIMUM_SKELETON_TIME_MS - (Date.now() - loadingStartedAt);
      if (remainingSkeletonTime > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingSkeletonTime));
      }
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const currentMember = useMemo(() => {
    if (currentUserRankIndex === -1) return null;
    return sortedMembers[currentUserRankIndex];
  }, [currentUserRankIndex, sortedMembers]);

  const currentUserOutsideTopTen = currentUserRankIndex >= 10 ? sortedMembers[currentUserRankIndex] : null;

  // Calculate XP needed to reach top 10
  const tenthMemberXp = sortedMembers[9]?.xp || 0;
  const xpToTopTen = currentUserRankIndex >= 10 && currentMember
    ? Math.max(0, tenthMemberXp - (currentMember.xp || 0) + 10)
    : 0;

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 pb-16">

      {/* KHỐI 1: HEADER & SCOPE SWITCHER & USER STICKY KPI CARD (BENTO ARENA) */}
      <div className="space-y-4">
        <RankingHeader updatedAt={rankingData?.updatedAt} loading={loading} onRefresh={() => void load()} />

        <div id="tour-rank-scope" className="flex flex-col gap-4">
          <RankingScopeSelector
            scope={scope}
            currentCohort={currentCohort}
            memberCount={sortedMembers.length}
            onChange={setScope}
          />

          <RankingStreakBanner
            streakDays={user?.streakDays || 0}
            xp={currentMember?.xp ?? user?.xp}
            level={currentMember?.level ?? user?.level}
            currentRank={currentUserRankIndex !== -1 ? currentUserRankIndex + 1 : undefined}
            totalMembers={sortedMembers.length}
            currentMember={currentMember}
            xpToTopTen={xpToTopTen}
            userAvatar={user?.avatar || currentMember?.avatar}
            userName={user?.name || currentMember?.name}
          />
        </div>
      </div>

      <BoneyardSkeleton
        name="ranking-page-body"
        loading={loading}
        fallback={<RankingPageSkeleton />}
      >
        {/* KHỐI 2: PODIUM VINH DANH TOP 3 (BẬC THANG QUÁN QUÂN - Á QUÂN) */}
        <div id="tour-rank-podium">
          <RankingPodium
            members={topThree}
            title={
              scope === 'cohort'
                ? (language === 'en' ? `Top 3 Class ${currentCohort || ''}` : `Top 3 lớp ${currentCohort || ''}`)
                : (language === 'en' ? 'Top 3 Course Champions' : 'Top 3 Quán Quân Toàn Khóa')
            }
            currentUserId={currentUserId}
          />
        </div>

        {/* KHỐI 3 & 4 & 5: BẢNG DANH SÁCH TOP 10 + SIDEBAR XẾP HẠNG GIỮA CÁC LỚP */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* CỘT CHÍNH (2/3): DANH SÁCH TOP 10 HỌC VIÊN */}
          <section id="tour-rank-list" className="rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs lg:col-span-2">
            <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-content sm:text-lg">
                    {sortedMembers.length <= 3
                      ? (language === 'en' ? 'Detailed Performance Ledger' : 'Bảng Điểm Hiệu Suất Chi Tiết')
                      : (language === 'en' ? 'Learner Rankings' : 'Danh Sách Học Viên Xuất Sắc')}
                  </h2>
                  <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-black text-accent-strong uppercase tracking-wider">
                    {sortedMembers.length > 10 ? 'Top 10' : `Top ${sortedMembers.length || 0}`}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-semibold text-content-muted">
                  {sortedMembers.length <= 3
                    ? (language === 'en'
                      ? `In-depth accuracy and solved question metrics for the top ${sortedMembers.length} learners.`
                      : `Thống kê chi tiết số câu giải, độ chính xác và điểm số của ${sortedMembers.length} học viên trên bục vinh danh.`)
                    : scope === 'course'
                    ? (language === 'en'
                      ? sortedMembers.length > 10
                        ? `Top 10 leading learners across the entire course (out of ${sortedMembers.length} learners)`
                        : `Learner standings across the entire course (${sortedMembers.length} learners)`
                      : sortedMembers.length > 10
                        ? `Top 10 học viên có thành tích xuất sắc nhất toàn khoá (trên tổng số ${sortedMembers.length} học viên)`
                        : `Bảng xếp hạng ${sortedMembers.length} học viên tham gia học toàn khoá`)
                    : (language === 'en'
                      ? sortedMembers.length > 10
                        ? `Top 10 learners in class ${currentCohort || ''} (out of ${sortedMembers.length} learners)`
                        : `Learner standings in class ${currentCohort || ''} (${sortedMembers.length} learners)`
                      : sortedMembers.length > 10
                        ? `Top 10 học viên xuất sắc nhất lớp ${currentCohort || ''} (trên tổng số ${sortedMembers.length} học viên)`
                        : `Bảng xếp hạng ${sortedMembers.length} học viên lớp ${currentCohort || ''}`)}
                </p>
              </div>
            </div>

            {error ? (
              <div role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                {error}
              </div>
            ) : sortedMembers.length === 0 ? (
              <div className="mt-4 grid min-h-64 place-items-center rounded-2xl border border-dashed border-line bg-canvas p-6 text-center">
                <div>
                  <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-500">
                    {scope === 'cohort' && !currentCohort ? (
                      <Users className="size-6 text-accent" />
                    ) : (
                      <Trophy className="size-6" />
                    )}
                  </span>
                  <p className="mt-3 font-black text-content">
                    {scope === 'cohort' && !currentCohort
                      ? (language === 'en' ? 'You have not been assigned to a class yet' : 'Bạn chưa được xếp vào lớp học nào')
                      : (language === 'en' ? 'No leaderboard data available' : 'Chưa có dữ liệu xếp hạng')}
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-content-muted">
                    {scope === 'cohort' && !currentCohort
                      ? (language === 'en'
                          ? 'Please switch to "Entire Course" to follow the general rankings, or contact your teacher to be enrolled in your class.'
                          : 'Vui lòng chọn tab "Toàn khoá" để theo dõi bảng xếp hạng chung, hoặc liên hệ giáo viên để được xếp lớp.')
                      : (language === 'en'
                          ? 'Complete practice questions to appear on the leaderboard.'
                          : 'Hãy hoàn thành các câu hỏi để xuất hiện trong bảng xếp hạng.')}
                  </p>
                  {scope === 'cohort' && !currentCohort && (
                    <button
                      type="button"
                      onClick={() => setScope('course')}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-contrast shadow-sm transition hover:opacity-90 active:scale-95"
                    >
                      <Globe className="size-3.5" />
                      <span>{language === 'en' ? 'View Entire Course' : 'Xem toàn khoá'}</span>
                    </button>
                  )}
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

                {/* KHỐI 4: THẺ GHIM VỊ TRÍ CỦA BẠN (NẾU NGOÀI TOP 10) */}
                {currentUserOutsideTopTen && (
                  <div className="mt-5 border-t border-dashed border-line pt-4">
                    <div className="mb-2 flex items-center justify-between px-1 text-xs font-bold text-content-muted">
                      <span className="flex items-center gap-1.5 text-accent-strong">
                        <Target className="size-3.5" />
                        {language === 'en' ? 'Your Current Position' : 'Vị trí hiện tại của bạn'}
                      </span>
                      <span className="font-extrabold text-content">
                        {language === 'en'
                          ? `Rank #${currentUserRankIndex + 1} / ${sortedMembers.length}`
                          : `Hạng #${currentUserRankIndex + 1} / ${sortedMembers.length}`}
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
                    {language === 'en'
                      ? 'Leaderboard displays the Top 10 leading learners. Keep practicing to climb higher!'
                      : 'Bảng xếp hạng hiển thị Top 10 học viên dẫn đầu. Tiếp tục luyện tập để chinh phục thứ hạng cao hơn!'}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* CỘT PHỤ (1/3): XẾP HẠNG GIỮA CÁC LỚP + MỤC TIÊU THI ĐUA TUẦN */}
          <div className="space-y-6 lg:col-span-1">
            <RankingCohortSidebar
              members={rankingData?.members || []}
              userCohortCode={currentCohort}
            />

            <RankingWeeklyGoalCard
              userQuestions={currentMember?.totalQuestions || 0}
              streakDays={user?.streakDays || currentMember?.streakDays || 0}
              xp={currentMember?.xp ?? user?.xp ?? 0}
            />
          </div>

        </div>
      </BoneyardSkeleton>
    </section>
  );
};
