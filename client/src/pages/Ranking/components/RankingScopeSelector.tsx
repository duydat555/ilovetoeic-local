import React from 'react';
import { Globe, Users, GraduationCap } from 'lucide-react';
import type { RankingScope } from './rankingUi';
import { useLanguage } from '../../../context/LanguageContext';

interface RankingScopeSelectorProps {
  scope: RankingScope;
  currentCohort: string | null;
  memberCount: number;
  onChange: (scope: RankingScope) => void;
}

export const RankingScopeSelector: React.FC<RankingScopeSelectorProps> = ({
  scope,
  currentCohort,
  memberCount,
  onChange,
}) => {
  const { language } = useLanguage();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-line bg-surface p-2 shadow-xs">
      {/* Segmented Tabs */}
      <div className="inline-flex rounded-xl bg-surface-elevated p-1 text-xs font-bold w-full sm:w-auto">
        <button
          type="button"
          onClick={() => onChange('course')}
          className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 transition active:scale-98 ${
            scope === 'course'
              ? 'bg-surface text-content shadow-xs font-black'
              : 'text-content-muted hover:text-content'
          }`}
        >
          <Globe className="size-3.5" />
          <span>{language === 'en' ? 'Entire Course' : 'Toàn khoá'}</span>
        </button>

        <button
          type="button"
          onClick={() => onChange('cohort')}
          className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 transition active:scale-98 ${
            scope === 'cohort'
              ? 'bg-surface text-content shadow-xs font-black'
              : 'text-content-muted hover:text-content'
          }`}
          title={!currentCohort ? (language === 'en' ? 'You are not enrolled in any class' : 'Bạn chưa được xếp vào lớp nào') : undefined}
        >
          <Users className="size-3.5" />
          <span>
            {currentCohort
              ? (language === 'en' ? `Class ${currentCohort}` : `Khoá ${currentCohort}`)
              : (language === 'en' ? 'My Class' : 'Khoá của tôi')}
          </span>
          {!currentCohort && (
            <span className="rounded bg-line/80 px-1.5 py-0.2 text-[9px] font-bold text-content-muted">
              {language === 'en' ? 'Not enrolled' : 'Chưa xếp lớp'}
            </span>
          )}
        </button>
      </div>

      {/* Member count pill */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-content-muted justify-end sm:justify-start">
        <GraduationCap className="size-4 text-accent" />
        <span>
          <strong className="font-bold text-content">
            {memberCount.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')}
          </strong>{' '}
          {language === 'en' ? 'learners' : 'học viên'}
        </span>
      </div>
    </div>
  );
};
