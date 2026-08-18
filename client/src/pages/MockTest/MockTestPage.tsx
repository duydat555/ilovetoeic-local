import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../../services/api';
import { MockTestItem } from '../../types';
import { ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SelectModeModal, SelectedParts, TestMode } from '../../components/mock-test/SelectModeModal';
import { TestCard } from '../../components/mock-test/TestCard';
import { DeleteWrongQuestionsModal } from '../../components/mock-test/DeleteTestHistoryModal';
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
  const { user } = useAuth();

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
    if (!user) {
      setHistoryCounts({});
      return () => { active = false; };
    }
    const loadHistoryCounts = () => {
      void backendService.getStudyHistory(user.id).then((attempts) => {
        if (!active || !attempts) return;
        const next: Record<string, number> = {};
        attempts.forEach((attempt) => {
          if (attempt.testId) next[attempt.testId] = (next[attempt.testId] || 0) + 1;
        });
        setHistoryCounts(next);
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
      const historyResult = await backendService.deleteTestStudyHistory(deleteTest.id);
      const wrongResult = await backendService.deleteWrongQuestions('test', { testId: deleteTest.id });
      await backendService.deletePracticeSessionsForTest(deleteTest.id);
      const localHistoryDeleted = storage.deleteTestHistory(deleteTest.id);
      storage.clearExamDraft(deleteTest.id);
      deleteTestPracticeSessions(deleteTest.id);
      setWrongCounts((current) => ({ ...current, [deleteTest.id]: 0 }));
      setHistoryCounts((current) => ({ ...current, [deleteTest.id]: 0 }));
      setToastMessage(`Đã xoá ${historyResult.deletedCount + localHistoryDeleted} lượt làm và ${wrongResult.deletedCount} câu sai của ${deleteTest.title}.`);
      setDeleteTest(null);
    } catch (requestError) {
      setDeleteError(requestError instanceof Error ? requestError.message : 'Không thể xoá lịch sử làm bài.');
    } finally {
      setDeletingWrong(false);
    }
  };

  const deleteTestHistoryCount = deleteTest
    ? Math.max(historyCounts[deleteTest.id] || 0, countTestPracticeSessions(deleteTest.id))
    : 0;

  return (
    <div className="space-y-6 pb-12 text-content transition-colors duration-300">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow mb-3"><ClipboardCheck className="size-3.5" /> Phòng thi mô phỏng</div>
          <h1 className="text-2xl font-extrabold tracking-tight text-content sm:text-3xl">Kho đề thi TOEIC</h1>
          <p className="mt-1 text-sm text-content-muted">Luyện theo từng part hoặc mô phỏng trọn vẹn kỳ thi 120 phút.</p>
        </div>
        <div className="surface flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-semibold text-content-muted">
          <CheckCircle2 className="size-4 text-positive" /> Tiến độ được tự động lưu
        </div>
      </div>
      {/* Top Filter Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 no-scrollbar min-h-[44px]">
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
              className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                selectedYear === year
                    ? 'bg-accent text-brand-ink shadow-md shadow-brand-500/20'
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
              historyCount={Math.max(historyCounts[test.id] || 0, countTestPracticeSessions(test.id))}
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
