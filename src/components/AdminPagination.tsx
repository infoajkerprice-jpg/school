import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toBnDigits } from '../i18n';

interface AdminPaginationProps {
  totalItems: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export const AdminPagination: React.FC<AdminPaginationProps> = ({
  totalItems,
  pageSize,
  currentPage,
  onPageChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;

  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(totalItems, safePage * pageSize);

  const pageNumbers: number[] = [];
  const windowSize = 5;
  let start = Math.max(1, safePage - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  for (let p = start; p <= end; p++) {
    pageNumbers.push(p);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E3EFE8] bg-[#F8FBF9] px-4 py-3 text-xs dark:border-slate-800 dark:bg-slate-900/60">
      <p className="font-medium text-[#4D6674] tabular-nums dark:text-slate-400">
        দেখানো হচ্ছে{' '}
        <strong className="font-bold text-[#123B67] dark:text-slate-100">
          {toBnDigits(startIdx)}–{toBnDigits(endIdx)}
        </strong>{' '}
        (মোট{' '}
        <strong className="font-bold text-[#087F5B] dark:text-emerald-400">
          {toBnDigits(totalItems)}
        </strong>{' '}
        টি)
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-[#D4E6DD] bg-white px-2.5 py-1.5 font-bold text-[#123B67] transition hover:bg-[#F2F8F5] disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">পূর্ববর্তী</span>
        </button>

        {pageNumbers.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`min-w-8 rounded-lg px-2.5 py-1.5 font-bold tabular-nums transition ${
              page === safePage
                ? 'bg-[#087F5B] text-white shadow-xs'
                : 'border border-[#D4E6DD] bg-white text-[#263B35] hover:bg-[#F2F8F5] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {toBnDigits(page)}
          </button>
        ))}

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-[#D4E6DD] bg-white px-2.5 py-1.5 font-bold text-[#123B67] transition hover:bg-[#F2F8F5] disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <span className="hidden sm:inline">পরবর্তী</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

interface AdminModuleHeaderProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: 'emerald' | 'navy' | 'orange' | 'sky' | 'purple';
  actions?: React.ReactNode;
}

const ICON_BG: Record<NonNullable<AdminModuleHeaderProps['accent']>, string> = {
  emerald: 'bg-[#087F5B]/12 text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300',
  navy: 'bg-[#123B67]/12 text-[#123B67] dark:bg-sky-500/20 dark:text-sky-300',
  orange: 'bg-[#F4A62A]/18 text-[#B47009] dark:bg-amber-500/20 dark:text-amber-300',
  sky: 'bg-[#21A9D6]/15 text-[#0E7DA3] dark:bg-cyan-500/20 dark:text-cyan-300',
  purple: 'bg-[#805AD5]/15 text-[#805AD5] dark:bg-purple-500/20 dark:text-purple-300',
};

export const AdminModuleHeader: React.FC<AdminModuleHeaderProps> = ({
  title,
  subtitle,
  icon,
  accent = 'emerald',
  actions,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#DCE8E1] bg-white px-5 py-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
    <div className="flex min-w-0 items-center gap-3.5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ICON_BG[accent]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="truncate text-lg font-extrabold text-[#123B67] sm:text-xl dark:text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-[#526B78] dark:text-slate-400">{subtitle}</p>
        )}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
