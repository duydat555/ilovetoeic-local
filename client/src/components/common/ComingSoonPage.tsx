import React from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

interface ComingSoonPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actionLabel?: string | null;
  actionPath?: string | null;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({
  title,
  description,
  icon: Icon,
  actionLabel,
  actionPath,
}) => (
  <section className="grid min-h-[calc(100dvh-8.5rem)] place-items-center px-1 py-8 sm:px-4" aria-labelledby="coming-soon-title">
    <div className="w-full max-w-2xl rounded-2xl border border-line bg-surface px-5 py-10 text-center shadow-sm dark:shadow-none sm:px-10 sm:py-14">
      <span className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[.12em] text-accent-strong dark:text-brand-300">
        Sắp ra mắt
      </span>
      <span className="mx-auto mt-6 grid size-20 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 sm:size-24">
        <Icon className="size-9 sm:size-11" strokeWidth={1.7} aria-hidden="true" />
      </span>
      <h1 id="coming-soon-title" className="mt-6 text-2xl font-extrabold tracking-tight text-content sm:text-3xl">
        Tính năng đang được phát triển
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-content-muted sm:text-base">
        {description || `${title} đang được hoàn thiện và sẽ sớm ra mắt.`}
      </p>
      {actionLabel && actionPath && (
        <Link to={actionPath} className="mt-7 inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl bg-accent px-5 text-sm font-extrabold text-accent-contrast transition hover:bg-brand-300 active:scale-[.98]">
          {actionLabel}
        </Link>
      )}
    </div>
  </section>
);
