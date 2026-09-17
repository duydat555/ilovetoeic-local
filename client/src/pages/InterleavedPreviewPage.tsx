import React, { useState } from 'react';
import { InterleavedPassage } from '../components/common/InterleavedPassage';
import { StructuredSentencePair } from '../types';
import rawTestCases from './10_cases.json';

interface TestCase {
  id: string;
  label: string;
  title: string;
  part: number;
  en: string;
  passageSentencePairs: StructuredSentencePair[];
}

const TEST_CASES: TestCase[] = rawTestCases as TestCase[];

export const InterleavedPreviewPage: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showTranslation, setShowTranslation] = useState(true);

  const currentTest = TEST_CASES[selectedIdx] || TEST_CASES[0];

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-canvas">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-line dark:bg-surface sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-content">
              TOEIC Reading Interleaved Bilingual Preview
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-content-muted">
              Hiển thị song ngữ xen kẽ câu chuẩn (Pre-aligned Sentence Pairs) cho 10 đề thi mẫu thực tế.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={showTranslation}
                onChange={(e) => setShowTranslation(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-brand peer-focus:outline-hidden dark:bg-surface-elevated">
                <div
                  className={`dot absolute top-0.5 left-[2px] h-5 w-5 rounded-full bg-white transition ${
                    showTranslation ? 'translate-x-5' : ''
                  }`}
                />
              </div>
              <span className="ml-2.5 text-xs font-bold text-slate-700 dark:text-content">
                {showTranslation ? 'Bản dịch: BẬT' : 'Bản dịch: TẮT'}
              </span>
            </label>
          </div>
        </div>

        {/* Test Case Selection Tabs */}
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs dark:border-line dark:bg-surface">
          {TEST_CASES.map((tc, idx) => (
            <button
              key={tc.id}
              onClick={() => setSelectedIdx(idx)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                selectedIdx === idx
                  ? 'bg-brand text-brand-ink shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-content-muted dark:hover:bg-surface-elevated'
              }`}
            >
              {tc.label}
            </button>
          ))}
        </div>

        {/* Current Case Info */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-line dark:bg-surface">
          <div className="mb-4 border-b border-slate-100 pb-3 dark:border-line">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Part {currentTest.part} • Đề bài mẫu: {currentTest.label}
              </span>
              <span className="font-mono text-xs text-slate-400">ID: {currentTest.id.slice(0, 8)}...</span>
            </div>
            <h2 className="mt-1 text-base font-bold text-slate-900 dark:text-content">{currentTest.title}</h2>
          </div>

          {/* Render Interleaved Passage Component */}
          <div id="test-passage-container" className="rounded-xl border border-slate-100 bg-slate-50/50 p-6 dark:border-line dark:bg-canvas/50">
            <InterleavedPassage
              key={`${currentTest.id}-${showTranslation}`}
              passageId={currentTest.id}
              passageText={currentTest.en}
              passageSentencePairs={currentTest.passageSentencePairs}
              showTranslation={showTranslation}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterleavedPreviewPage;
