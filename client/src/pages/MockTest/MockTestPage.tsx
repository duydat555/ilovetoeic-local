import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../../services/api';
import { MockTestItem } from '../../types';
import { ClipboardCheck, CheckCircle2, LayoutGrid, History } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SelectModeModal, SelectedParts, TestMode } from '../../components/mock-test/SelectModeModal';
import { TestCard } from '../../components/mock-test/TestCard';
import { DeleteWrongQuestionsModal } from '../../components/mock-test/DeleteTestHistoryModal';
import { MockTestHistoryView } from './components/MockTestHistoryView';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { TopToast } from '../../components/common/TopToast';
import { AnimatePresence } from 'framer-motion';
import { ALL_TEST_PARTS, serializeTestPartScope } from '../../utils/testScope';
import { backendService } from '../../services/backend';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../utils/storage';
import { countTestPracticeSessions, deleteTestPracticeSessions } from '../../utils/practiceSessions';
import { useLanguage } from '../../context/LanguageContext';

export const MockTestPage: React.FC = () => {
  const { language, t } = useLanguage();
  const [allTests, setAllTests] = useState<MockTestItem[]>([]);
  const [tests, setTests] = useState<MockTestItem[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State for Mode Selection
  const [modalTest, setModalTest] = useState<MockTestItem | null>(null);
  const [activeMode, setActiveMode] = useState<TestMode>('practice');
  const [selectedParts, setSelectedParts] = useState<SelectedParts>([]);
  const [wrongCounts, setWrongCounts] = useState<Record<string, number>>({});
  const [historyCounts, setHistoryCounts] = useState<Record<string, number>>({});
  const [deleteTest, setDeleteTest] = useState<MockTestItem | null>(null);
  const [deletingWrong, setDeletingWrong] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [currentTab, setCurrentTab] = useState<'library' | 'history'>(() => {
    return searchParams.get('tab') === 'history' ? 'history' : 'library';
  });
  const [historyFilteredTestId, setHistoryFilteredTestId] = useState<string | null>(() => {
    return searchParams.get('testId') || null;
  });
  const [historyFilteredTestYear, setHistoryFilteredTestYear] = useState<number | null>(() => {
    const yr = searchParams.get('year');
    return yr ? Number(yr) : null;
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'history') {
      setCurrentTab('history');
    } else if (tab === 'library') {
      setCurrentTab('library');
    }
    const tId = searchParams.get('testId');
    if (tId) {
      setHistoryFilteredTestId(tId);
    }
    const yStr = searchParams.get('year');
    if (yStr) {
      setHistoryFilteredTestYear(Number(yStr));
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'library' | 'history') => {
    setCurrentTab(tab);
    const nextParams = new URLSearchParams(searchParams);
    if (tab === 'history') {
      nextParams.set('tab', 'history');
    } else {
      nextParams.delete('tab');
      nextParams.delete('testId');
      nextParams.delete('year');
      setHistoryFilteredTestId(null);
      setHistoryFilteredTestYear(null);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const totalHistoryCount = useMemo(() => {
    return Object.values(historyCounts).reduce((sum, count) => sum + count, 0);
  }, [historyCounts]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const testList = await apiService.getTests();
      const latestYear = testList.reduce<number | null>((latest, test) => (
        Number.isFinite(test.year) && (latest === null || test.year > latest) ? test.year : latest
      ), null);

      setAllTests(testList);
      setSelectedYear(latestYear);
      setTests(latestYear === null ? [] : testList.filter((test) => test.year === latestYear));
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) {
      setWrongCounts({});
      return () => { active = false; };
    }
    const loadWrongCounts = () => {
      void backendService.getWrongQuestions('test').then((items) => {
        if (!active) return;
        const next: Record<string, number> = {};
        items.forEach((item) => {
          if (item.testId) next[item.testId] = (next[item.testId] || 0) + 1;
        });
        setWrongCounts(next);
      }).catch(() => {
        if (!active) return;
        setWrongCounts({});
      });
    };
    loadWrongCounts();
    window.addEventListener('wrong-questions-updated', loadWrongCounts);
    return () => {
      active = false;
      window.removeEventListener('wrong-questions-updated', loadWrongCounts);
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    let requestGeneration = 0;
    const loadHistoryCounts = () => {
      const generation = ++requestGeneration;
      const attemptIdsByTest = new Map<string, Set<string>>();
      const addAttempt = (testId: string, attemptId: string) => {
        if (!attemptIdsByTest.has(testId)) attemptIdsByTest.set(testId, new Set());
        attemptIdsByTest.get(testId)!.add(attemptId);
      };

      try {
        const localHistory = storage.getTestHistory();
        localHistory.forEach((item, index) => {
          if (item.testId) {
            const attemptId = String(item.attemptId || (item as any).id || `local:${item.testId}:${item.completedAt}:${index}`);
            addAttempt(String(item.testId), attemptId);
          }
        });
      } catch (err) {
        console.warn('[!] Lỗi đọc local test history:', err);
      }
      const toCounts = () => Object.fromEntries(
        Array.from(attemptIdsByTest, ([testId, ids]) => [testId, ids.size]),
      );

      if (!user) {
        setHistoryCounts(toCounts());
        return;
      }

      void backendService.getStudyHistory(user.id).then((attempts) => {
        if (!active || generation !== requestGeneration) return;
        if (attempts) {
          attempts.forEach((attempt) => {
            if (attempt.testId) addAttempt(String(attempt.testId), String(attempt.id));
          });
        }
        setHistoryCounts(toCounts());
      }).catch(() => {
        if (active && generation === requestGeneration) setHistoryCounts(toCounts());
      });
    };

    loadHistoryCounts();
    window.addEventListener('wrong-questions-updated', loadHistoryCounts);
    return () => {
      active = false;
      window.removeEventListener('wrong-questions-updated', loadHistoryCounts);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timeout = window.setTimeout(() => setToastMessage(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const yearOptions = useMemo(() => {
    const counts = new Map<number, number>();
    allTests.forEach((test) => {
      if (!Number.isFinite(test.year)) return;
      counts.set(test.year, (counts.get(test.year) || 0) + 1);
    });
    return Array.from(counts, ([year, count]) => ({ year, count }))
      .sort((a, b) => b.year - a.year);
  }, [allTests]);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setTests(allTests.filter((test) => test.year === year));
  };

  const openModeModal = (test: MockTestItem, defaultMode: TestMode) => {
    setModalTest(test);
    setActiveMode(defaultMode);
    setSelectedParts([]);
  };

  const handleStart = () => {
    if (!modalTest || selectedParts.length === 0) return;

    const partScope = serializeTestPartScope(selectedParts);

    if (activeMode === 'exam') {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        void document.documentElement.requestFullscreen().catch((error) => {
          console.warn('[!] Trình duyệt không cho phép mở toàn màn hình:', error);
        });
      }
      navigate(`/mock-test/exam/${modalTest.id}?parts=${encodeURIComponent(partScope)}`);
    } else {
      navigate(`/practice/runner/${partScope}?testId=${encodeURIComponent(modalTest.id)}`);
    }
  };

  const closeDeleteModal = () => {
    if (deletingWrong) return;
    setDeleteTest(null);
    setDeleteError('');
  };

  const handleDeleteHistory = async () => {
    if (!deleteTest || deletingWrong) return;
    setDeletingWrong(true);
    setDeleteError('');
    try {
      // Server is authoritative. Do not report success while remote history still exists,
      // otherwise the following refresh immediately restores the deleted count.
      const historyResult = user
        ? await backendService.deleteTestStudyHistory(deleteTest.id)
        : { deletedCount: 0 };
      const serverDeleted = historyResult?.deletedCount || 0;

      // Clear local mirrors only after the authenticated server transaction
      // succeeds. Guest history is local-only and requires no remote request.
      const localHistoryDeleted = storage.deleteTestHistory(deleteTest.id);
      storage.clearExamDraftsForTest(deleteTest.id);
      deleteTestPracticeSessions(deleteTest.id);

      // Cập nhật state UI và đóng modal
      setWrongCounts((current) => ({ ...current, [deleteTest.id]: 0 }));
      setHistoryCounts((current) => ({ ...current, [deleteTest.id]: 0 }));
      const totalDeleted = Math.max(serverDeleted, localHistoryDeleted);
      setToastMessage(
        totalDeleted > 0
          ? (language === 'en'
              ? `Deleted ${totalDeleted} attempt(s) and related data for ${deleteTest.title}.`
              : `Đã xoá ${totalDeleted} lượt làm và dữ liệu liên quan của ${deleteTest.title}.`)
          : (language === 'en'
              ? `Cleared test data for ${deleteTest.title}.`
              : `Đã dọn sạch dữ liệu bài làm của ${deleteTest.title}.`),
      );
      setDeleteTest(null);
      window.dispatchEvent(new CustomEvent('wrong-questions-updated'));
    } catch (requestError) {
      setDeleteError(requestError instanceof Error ? requestError.message : (language === 'en' ? 'Unable to delete practice history.' : 'Không thể xoá lịch sử làm bài.'));
    } finally {
      setDeletingWrong(false);
    }
  };
  const deleteTestHistoryCount = deleteTest
    ? Math.max(
        historyCounts[deleteTest.id] || 0,
        storage.getTestHistory().filter((h) => String(h.testId || '').trim().toLowerCase() === String(deleteTest.id).trim().toLowerCase()).length,
        countTestPracticeSessions(deleteTest.id),
        wrongCounts[deleteTest.id] || 0,
      )
    : 0;

  return (
    <div className="space-y-6 pb-12 text-content">
      {/* 1. Header & Quick Status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow mb-2">
            <ClipboardCheck className="size-3.5" /> {t('mockTest.simulationLab')}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-content sm:text-3xl">
            {currentTab === 'library' ? t('mockTest.libraryTitle') : t('mockTest.historyTitle')}
          </h1>
          <p className="mt-1 text-sm text-content-muted">
            {currentTab === 'library'
              ? t('mockTest.libraryDesc')
              : t('mockTest.historyDesc')}
          </p>
        </div>

        <div className="surface flex items-center gap-2.5 rounded-2xl border border-line px-3.5 py-2 text-xs font-semibold text-content-muted shrink-0">
          <CheckCircle2 className="size-4 text-emerald-500" />
          <span>{t('mockTest.autoSaved')}</span>
        </div>
      </div>

      {/* 2. Primary Tab Navigation (Kho đề thi vs Lịch sử làm bài - chuyển tức thì không hiệu ứng giật) */}
      <div id="tour-mt-tabs" className="flex items-center gap-1.5 rounded-2xl border border-line bg-surface p-1 shadow-xs w-fit">
        <button
          type="button"
          onClick={() => handleTabChange('library')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${
            currentTab === 'library'
              ? 'bg-accent text-brand-ink shadow-xs'
              : 'text-content-muted hover:bg-surface-hover hover:text-content'
          }`}
        >
          <LayoutGrid className="size-4" />
          <span>{t('mockTest.libraryTab')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('history')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${
            currentTab === 'history'
              ? 'bg-accent text-brand-ink shadow-xs'
              : 'text-content-muted hover:bg-surface-hover hover:text-content'
          }`}
        >
          <History className="size-4" />
          <span>{t('mockTest.historyTab')}</span>
          {totalHistoryCount > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                currentTab === 'history'
                  ? 'bg-brand-ink/20 text-brand-ink'
                  : 'bg-brand/15 text-brand-ink dark:text-brand-200'
              }`}
            >
              {totalHistoryCount}
            </span>
          )}
        </button>
      </div>

      {/* 3. Tab Content (Giữ sẵn DOM, chuyển tab tức thì 0ms, không nháy skeleton) */}
      <div className={currentTab === 'library' ? 'space-y-6' : 'hidden'}>
        {/* Top Filter Pill Bar */}
        <div id="tour-mt-years" className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar min-h-[44px]">
          {loading ? (
            [1, 2, 3, 4].map((id) => (
              <BoneyardSkeleton key={id} name={`year-skeleton-${id}`} variant="button" width={80} height={32} />
            ))
          ) : (
            yearOptions.map(({ year, count }) => (
              <button
                key={year}
                type="button"
                aria-pressed={selectedYear === year}
                onClick={() => handleYearChange(year)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 ${
                  selectedYear === year
                    ? 'bg-accent text-brand-ink shadow-xs'
                    : 'border border-line bg-surface text-content-muted hover:bg-surface-hover hover:text-content'
                }`}
              >
                {year} <span className="font-semibold opacity-75">({count})</span>
              </button>
            ))
          )}
        </div>

        {/* Modern Compact 4-Column Card Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <BoneyardSkeleton key={i} name={`test-card-${i}`} variant="card" height={190} />
            ))}
          </div>
        ) : tests.length > 0 ? (
          <div id="tour-mt-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tests.map((test) => (
              <TestCard
                key={test.id}
                test={test}
                onOpenMode={openModeModal}
                wrongCount={wrongCounts[test.id] || 0}
                historyCount={Math.max(
                  historyCounts[test.id] || 0,
                  storage.getTestHistory().filter((h) => String(h.testId) === String(test.id)).length,
                  countTestPracticeSessions(test.id),
                )}
                onViewHistory={(selectedTest) => {
                  setHistoryFilteredTestId(selectedTest.id);
                  setHistoryFilteredTestYear(selectedTest.year);
                  setCurrentTab('history');
                  const nextParams = new URLSearchParams(searchParams);
                  nextParams.set('tab', 'history');
                  nextParams.set('testId', selectedTest.id);
                  if (selectedTest.year) {
                    nextParams.set('year', String(selectedTest.year));
                  }
                  setSearchParams(nextParams, { replace: true });
                }}
                onRetryWrong={(selectedTest) => navigate(
                  `/practice/runner/all?testId=${encodeURIComponent(selectedTest.id)}&wrongSource=test`,
                )}
                onDeleteHistory={(selectedTest) => {
                  setDeleteError('');
                  setDeleteTest(selectedTest);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
            <ClipboardCheck className="mx-auto size-8 text-content-muted" aria-hidden="true" />
            <h2 className="mt-3 text-base font-extrabold text-content">{t('mockTest.noTests')}</h2>
            <p className="mt-1 text-sm text-content-muted">{t('mockTest.noTestsDesc')}</p>
          </div>
        )}
      </div>

      <div className={currentTab === 'history' ? 'space-y-6' : 'hidden'}>
        <MockTestHistoryView
          userId={user?.id}
          allTests={allTests}
          filteredTestId={historyFilteredTestId}
          filteredTestYear={historyFilteredTestYear}
          onClearTestFilter={() => {
            setHistoryFilteredTestId(null);
            setHistoryFilteredTestYear(null);
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('testId');
            nextParams.delete('year');
            setSearchParams(nextParams, { replace: true });
          }}
          onSwitchToLibrary={() => handleTabChange('library')}
          onRetakeTest={(testId) => {
            const target = allTests.find((t) => t.id === testId);
            if (target) {
              openModeModal(target, 'exam');
            } else {
              navigate(`/mock-test/exam/${testId}`);
            }
          }}
        />
      </div>

      <AnimatePresence initial={false}>
        {modalTest && (
          <SelectModeModal
            key={modalTest.id}
            testTitle={modalTest.title}
            activeMode={activeMode}
            selectedParts={selectedParts}
            onModeChange={setActiveMode}
            onPartsChange={setSelectedParts}
            onStart={handleStart}
            onClose={() => setModalTest(null)}
          />
        )}
        {deleteTest && (
          <DeleteWrongQuestionsModal
            key={`delete-wrong-${deleteTest.id}`}
            scopeLabel={deleteTest.title}
            wrongCount={deleteTestHistoryCount}
            deleting={deletingWrong}
            error={deleteError}
            title={deleteTestHistoryCount > 0 ? 'Xoá lịch sử làm bài?' : 'Dọn sạch dữ liệu bài thi?'}
            description={
              deleteTestHistoryCount > 0 ? (
                <>Toàn bộ <strong className="text-content">{deleteTestHistoryCount} lượt làm bài, câu sai hoặc phiên làm dở</strong> của <strong className="text-content">{deleteTest.title}</strong> sẽ bị xoá khỏi database và trình duyệt. Thao tác này không thể hoàn tác.</>
              ) : (
                <>Đề thi <strong className="text-content">{deleteTest.title}</strong> hiện chưa có lượt hoàn thành nào trong danh sách. Thao tác này sẽ dọn sạch toàn bộ bài thi nháp, câu sai và dữ liệu tạm của đề này khỏi thiết bị và cơ sở dữ liệu.</>
              )
            }
            confirmLabel={deleteTestHistoryCount > 0 ? 'Xoá toàn bộ lịch sử' : 'Dọn sạch dữ liệu'}
            closeLabel="Đóng xác nhận xoá lịch sử làm bài"
            onConfirm={() => void handleDeleteHistory()}
            onClose={closeDeleteModal}
          />
        )}
        {toastMessage && <TopToast key={toastMessage} message={toastMessage} />}
      </AnimatePresence>
    </div>
  );
};
