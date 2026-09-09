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

export const MockTestPage: React.FC = () => {
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
    const loadHistoryCounts = () => {
      const next: Record<string, number> = {};

      try {
        const localHistory = storage.getTestHistory();
        localHistory.forEach((item) => {
          if (item.testId) {
            next[item.testId] = (next[item.testId] || 0) + 1;
          }
        });
      } catch (err) {
        console.warn('[!] Lỗi đọc local test history:', err);
      }

      if (!user) {
        setHistoryCounts(next);
        return;
      }

      void backendService.getStudyHistory(user.id).then((attempts) => {
        if (!active || !attempts) {
          setHistoryCounts(next);
          return;
        }
        const merged: Record<string, number> = { ...next };
        attempts.forEach((attempt) => {
          if (attempt.testId) {
            merged[attempt.testId] = (merged[attempt.testId] || 0) + 1;
          }
        });
        setHistoryCounts(merged);
      }).catch(() => {
        if (active) setHistoryCounts(next);
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
      // 1. Luôn xoá sạch dữ liệu local trước để người dùng thấy kết quả ngay lập tức
      const localHistoryDeleted = storage.deleteTestHistory(deleteTest.id);
      storage.clearExamDraft(deleteTest.id);
      deleteTestPracticeSessions(deleteTest.id);

      // 2. Đồng bộ xoá trên cơ sở dữ liệu (resilient: không làm gián đoạn UI nếu mạng lag/offline)
      let serverDeleted = 0;
      let wrongDeleted = 0;

      try {
        const historyResult = await backendService.deleteTestStudyHistory(deleteTest.id);
        serverDeleted = historyResult?.deletedCount || 0;
      } catch (err) {
        console.warn('[!] Không thể xoá lịch sử đề từ server:', err);
      }

      try {
        const wrongResult = await backendService.deleteWrongQuestions('test', { testId: deleteTest.id });
        wrongDeleted = wrongResult?.deletedCount || 0;
      } catch (err) {
        console.warn('[!] Không thể xoá câu sai từ server:', err);
      }

      try {
        await backendService.deletePracticeSessionsForTest(deleteTest.id);
      } catch (err) {
        console.warn('[!] Không thể xoá phiên làm bài từ server:', err);
      }

      // 3. Cập nhật state UI và đóng modal
      setWrongCounts((current) => ({ ...current, [deleteTest.id]: 0 }));
      setHistoryCounts((current) => ({ ...current, [deleteTest.id]: 0 }));
      const totalDeleted = Math.max(serverDeleted, localHistoryDeleted);
      setToastMessage(
        totalDeleted > 0 || wrongDeleted > 0
          ? `Đã xoá ${totalDeleted} lượt làm và ${wrongDeleted} câu sai của ${deleteTest.title}.`
          : `Đã dọn sạch dữ liệu bài làm của ${deleteTest.title}.`,
      );
      setDeleteTest(null);
      window.dispatchEvent(new CustomEvent('wrong-questions-updated'));
    } catch (requestError) {
      setDeleteError(requestError instanceof Error ? requestError.message : 'Không thể xoá lịch sử làm bài.');
    } finally {
      setDeletingWrong(false);
    }
  };
  const deleteTestHistoryCount = deleteTest
    ? Math.max(
        historyCounts[deleteTest.id] || 0,
        storage.getTestHistory().filter((h) => String(h.testId) === String(deleteTest.id)).length,
        countTestPracticeSessions(deleteTest.id),
      )
    : 0;

  return (
    <div className="space-y-6 pb-12 text-content">
      {/* 1. Header & Quick Status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow mb-2">
            <ClipboardCheck className="size-3.5" /> Phòng thi mô phỏng
          </div>
          <h1 className="text-2xl font-black tracking-tight text-content sm:text-3xl">
            {currentTab === 'library' ? 'Kho đề thi TOEIC' : 'Lịch sử & Kết quả làm bài'}
          </h1>
          <p className="mt-1 text-sm text-content-muted">
            {currentTab === 'library'
              ? 'Luyện theo từng Part hoặc mô phỏng trọn vẹn kỳ thi TOEIC 120 phút với bảng điểm quy đổi chuẩn.'
              : 'Theo dõi tiến trình rèn luyện, xem lại bài thi chi tiết và phân tích điểm số từng phần.'}
          </p>
        </div>

        <div className="surface flex items-center gap-2.5 rounded-2xl border border-line px-3.5 py-2 text-xs font-semibold text-content-muted shrink-0">
          <CheckCircle2 className="size-4 text-emerald-500" />
          <span>Tiến độ được tự động lưu vào database</span>
        </div>
      </div>

      {/* 2. Primary Tab Navigation (Kho đề thi vs Lịch sử làm bài - chuyển tức thì không hiệu ứng giật) */}
      <div className="flex items-center gap-1.5 rounded-2xl border border-line bg-surface p-1 shadow-xs w-fit">
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
          <span>Kho đề thi</span>
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
          <span>Lịch sử làm bài</span>
          {totalHistoryCount > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                currentTab === 'history'
                  ? 'bg-brand-ink/20 text-brand-ink'
                  : 'bg-accent/15 text-accent-dark'
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
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar min-h-[44px]">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <h2 className="mt-3 text-base font-extrabold text-content">Chưa có đề thi thật</h2>
            <p className="mt-1 text-sm text-content-muted">Kho đề sẽ hiển thị khi máy chủ có dữ liệu phù hợp.</p>
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
            title="Xoá lịch sử làm bài?"
            description={<>Toàn bộ <strong className="text-content">{deleteTestHistoryCount} lượt hoặc phiên làm bài đã lưu</strong>, gồm kết quả câu đúng và câu sai của <strong className="text-content">{deleteTest.title}</strong>, sẽ bị xoá khỏi database và trình duyệt. Thao tác này không thể hoàn tác.</>}
            confirmLabel="Xoá toàn bộ lịch sử"
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
