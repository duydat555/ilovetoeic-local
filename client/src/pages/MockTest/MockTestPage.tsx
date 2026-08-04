import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../../services/api';
import { MockTestItem } from '../../types';
import { ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SelectModeModal, SelectedParts, TestMode } from '../../components/mock-test/SelectModeModal';
import { TestCard } from '../../components/mock-test/TestCard';
import { AnimatePresence } from 'framer-motion';
import { ALL_TEST_PARTS, serializeTestPartScope } from '../../utils/testScope';

export const MockTestPage: React.FC = () => {
  const [allTests, setAllTests] = useState<MockTestItem[]>([]);
  const [tests, setTests] = useState<MockTestItem[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State for Mode Selection
  const [modalTest, setModalTest] = useState<MockTestItem | null>(null);
  const [activeMode, setActiveMode] = useState<TestMode>('practice');
  const [selectedParts, setSelectedParts] = useState<SelectedParts>([...ALL_TEST_PARTS]);

  const navigate = useNavigate();

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
    setSelectedParts([...ALL_TEST_PARTS]);
  };

  const handleStart = () => {
    if (!modalTest || selectedParts.length === 0) return;

    const partScope = serializeTestPartScope(selectedParts);

    if (activeMode === 'exam') {
      navigate(`/mock-test/exam/${modalTest.id}?parts=${encodeURIComponent(partScope)}`);
    } else {
      navigate(`/practice/runner/${partScope}?testId=${encodeURIComponent(modalTest.id)}`);
    }
  };

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
      <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 no-scrollbar">
        {yearOptions.map(({ year, count }) => (
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
        ))}
      </div>


      {/* Modern Compact 4-Column Card Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-line bg-surface-elevated" />
          ))}
        </div>
      ) : tests.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tests.map((test) => (
            <TestCard
              key={test.id}
              test={test}
              onOpenMode={openModeModal}
              onViewHistory={(testId) => navigate(`/history?testId=${testId}`)}
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
      </AnimatePresence>
    </div>
  );
};
