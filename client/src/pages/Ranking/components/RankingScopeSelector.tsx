import React from 'react';
import { ChevronDown, GraduationCap } from 'lucide-react';
import type { RankingScope } from './rankingUi';
import { useLanguage } from '../../../context/LanguageContext';

interface RankingScopeSelectorProps {
  scope: RankingScope;
  currentCohort: string | null;
  memberCount: number;
  onChange: (scope: RankingScope) => void;
}

export const RankingScopeSelector: React.FC<RankingScopeSelectorProps> = ({ scope, currentCohort, memberCount, onChange }) => {
  const { language } = useLanguage();

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="ranking-scope-select" className="block text-xs font-bold text-content-muted">
            {language === 'en' ? 'Viewing cohort' : 'Khoá đang xem'}
          </label>
          <div className="relative mt-1.5">
            <select
              id="ranking-scope-select"
              value={scope}
              onChange={(event) => onChange(event.target.value as RankingScope)}
              className="min-h-11 w-full appearance-none rounded-xl border border-line bg-canvas px-4 pr-10 text-sm font-extrabold text-content outline-none transition-all hover:border-brand-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
            >
              <option value="course">{language === 'en' ? 'All Students (Entire Course)' : 'Tất cả học sinh (Toàn khoá)'}</option>
              <option value="cohort">
                {currentCohort
                  ? (language === 'en' ? `Class ${currentCohort} (My Class)` : `Khoá ${currentCohort} (Khoá của tôi)`)
                  : (language === 'en' ? 'Students in cohort' : 'Học sinh trong khoá')}
              </option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-content-muted" aria-hidden="true" />
          </div>
        </div>
        <div className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-line bg-canvas px-3 py-2 text-xs font-bold text-content-muted sm:w-auto sm:min-w-28">
          <GraduationCap className="size-4 text-brand-600 dark:text-brand-300" aria-hidden="true" />
          <span>{memberCount.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} {language === 'en' ? 'learners' : 'học viên'}</span>
        </div>
      </div>
    </section>
  );
};
