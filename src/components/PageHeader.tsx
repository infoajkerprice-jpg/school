import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export type HeaderAccent = 'emerald' | 'navy' | 'purple' | 'sky' | 'orange';

const ACCENT_THEMES: Record<
  HeaderAccent,
  {
    bg: string;
    orbA: string;
    orbB: string;
    badgeBg: string;
    badgeText: string;
    divider: string;
    mobileStrip: string;
  }
> = {
  emerald: {
    bg: 'bg-gradient-to-br from-[#065F46] via-[#087F5B] to-[#123B67]',
    orbA: 'bg-[#F4A62A]/25',
    orbB: 'bg-[#21A9D6]/20',
    badgeBg: 'bg-white/15 border border-white/25',
    badgeText: 'text-[#FDE68A]',
    divider: 'bg-[#F4A62A]',
    mobileStrip: 'from-[#087F5B] to-[#123B67]',
  },
  navy: {
    bg: 'bg-gradient-to-br from-[#0D2B4C] via-[#123B67] to-[#087F5B]',
    orbA: 'bg-[#21A9D6]/25',
    orbB: 'bg-[#805AD5]/25',
    badgeBg: 'bg-white/15 border border-white/25',
    badgeText: 'text-[#7DD3FC]',
    divider: 'bg-[#21A9D6]',
    mobileStrip: 'from-[#123B67] to-[#087F5B]',
  },
  purple: {
    bg: 'bg-gradient-to-br from-[#123B67] via-[#4C3593] to-[#805AD5]',
    orbA: 'bg-[#F4A62A]/20',
    orbB: 'bg-[#21A9D6]/25',
    badgeBg: 'bg-white/15 border border-white/25',
    badgeText: 'text-[#FDE68A]',
    divider: 'bg-[#F4A62A]',
    mobileStrip: 'from-[#123B67] to-[#5B42A6]',
  },
  sky: {
    bg: 'bg-gradient-to-br from-[#123B67] via-[#0F6996] to-[#21A9D6]',
    orbA: 'bg-[#F4A62A]/25',
    orbB: 'bg-[#087F5B]/30',
    badgeBg: 'bg-white/15 border border-white/25',
    badgeText: 'text-white',
    divider: 'bg-[#F4A62A]',
    mobileStrip: 'from-[#123B67] to-[#21A9D6]',
  },
  orange: {
    bg: 'bg-gradient-to-br from-[#123B67] via-[#1B4A6C] to-[#087F5B]',
    orbA: 'bg-[#F4A62A]/35',
    orbB: 'bg-[#805AD5]/20',
    badgeBg: 'bg-[#F4A62A]/20 border border-[#F4A62A]/40',
    badgeText: 'text-[#FDE68A]',
    divider: 'bg-[#F4A62A]',
    mobileStrip: 'from-[#123B67] to-[#087F5B]',
  },
};

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  subtitle?: string;
  badge?: string;
  accent?: HeaderAccent;
  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  breadcrumbs,
  title,
  subtitle,
  badge,
  accent = 'navy',
  icon,
  rightSlot,
}) => {
  const theme = ACCENT_THEMES[accent];
  const navigate = useNavigate();

  const parentCrumb =
    breadcrumbs.length > 1
      ? [...breadcrumbs].slice(0, -1).reverse().find((c) => Boolean(c.to))
      : undefined;

  const handleBack = () => {
    if (parentCrumb?.to) {
      navigate(parentCrumb.to);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <>
      {/* ==================== COMPACT MOBILE APP PAGE HEADER (< lg) ==================== */}
      <section className="overflow-hidden rounded-2xl border border-[#D8E7DF] bg-white shadow-[0_4px_18px_rgba(18,59,103,0.06)] lg:hidden">
        <div className={`bg-gradient-to-r ${theme.mobileStrip} px-3.5 py-3 text-white`}>
          <div className="flex items-start gap-2.5">
            <button
              type="button"
              onClick={handleBack}
              aria-label="পিছনে যান"
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-xs transition active:scale-95"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div className="min-w-0 flex-1">
              {badge && (
                <div className="mb-1 inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-bold text-[#FDE68A]">
                  {icon && <span className="shrink-0">{icon}</span>}
                  <span className="truncate">{badge}</span>
                </div>
              )}
              <h1 className="text-lg font-extrabold leading-snug tracking-tight text-white">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-sky-50/90">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Compact Breadcrumb / Action Strip */}
        {(breadcrumbs.length > 1 || rightSlot) && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F8FBF9] px-3.5 py-2.5">
            <nav
              aria-label="মোবাইল ব্রেডক্রাম্ব"
              className="flex min-w-0 items-center gap-1 overflow-x-auto text-[11px] font-semibold text-[#526B78] no-scrollbar"
            >
              <Link to="/" className="inline-flex shrink-0 items-center gap-1 text-[#087F5B]">
                <Home className="h-3 w-3" />
                <span>হোম</span>
              </Link>
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={`m-${crumb.label}-${idx}`}>
                    <ChevronRight className="h-3 w-3 shrink-0 text-[#9FB5AF]" />
                    {crumb.to && !isLast ? (
                      <Link to={crumb.to} className="shrink-0 text-[#123B67]">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="truncate font-bold text-[#123B67]">{crumb.label}</span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
            {rightSlot && (
              <div className="w-full pt-1 sm:w-auto sm:pt-0 [&>*]:w-full sm:[&>*]:w-auto">
                {rightSlot}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ==================== DESKTOP GRADIENT PAGE HEADER (lg+) ==================== */}
      <section
        className={`relative hidden overflow-hidden rounded-3xl lg:block ${theme.bg} px-5 py-7 text-white shadow-lg sm:px-8 sm:py-9`}
      >
        <div
          className={`pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full blur-3xl ${theme.orbA}`}
        />
        <div
          className={`pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full blur-3xl ${theme.orbB}`}
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            {/* Interactive Breadcrumb Navigation */}
            <nav aria-label="ব্রেডক্রাম্ব" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-sky-100/85">
              <Link
                to="/"
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium transition hover:bg-white/15 hover:text-white"
              >
                <Home className="h-3.5 w-3.5 text-[#F4A62A]" />
                <span>মূলপাতা</span>
              </Link>
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={`${crumb.label}-${idx}`}>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/45" />
                    {crumb.to && !isLast ? (
                      <Link
                        to={crumb.to}
                        className="rounded-md px-1.5 py-0.5 font-medium transition hover:bg-white/15 hover:text-white"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="truncate font-semibold text-white">{crumb.label}</span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>

            {badge && (
              <div
                className={`mb-2.5 inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-bold ${theme.badgeBg} ${theme.badgeText}`}
              >
                {icon && <span className="shrink-0">{icon}</span>}
                <span>{badge}</span>
              </div>
            )}

            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl lg:text-[34px]">
              {title}
            </h1>

            <div className={`mt-3 h-1 w-14 rounded-full ${theme.divider}`} />

            {subtitle && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-sky-50/90 sm:text-[15px]">
                {subtitle}
              </p>
            )}
          </div>

          {rightSlot && <div className="shrink-0">{rightSlot}</div>}
        </div>
      </section>
    </>
  );
};

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="rounded-2xl border border-dashed border-[#CBE0D5] bg-white px-6 py-12 text-center shadow-2xs">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F2F8F5] text-[#087F5B]">
      {icon}
    </div>
    <h3 className="mt-4 text-base font-bold text-[#123B67]">{title}</h3>
    {description && (
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-[#526B78] sm:text-sm">
        {description}
      </p>
    )}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);

interface PageSkeletonProps {
  variant?: 'cards' | 'list' | 'detail' | 'table';
  count?: number;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({ variant = 'cards', count = 6 }) => {
  if (variant === 'detail') {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12" aria-label="লোড হচ্ছে">
        <div className="space-y-4 rounded-2xl border border-[#DCE8E1] bg-white p-6 lg:col-span-8">
          <div className="skeleton-shimmer h-6 w-1/3 rounded-lg" />
          <div className="skeleton-shimmer h-8 w-3/4 rounded-lg" />
          <div className="skeleton-shimmer h-64 w-full rounded-2xl" />
          <div className="skeleton-shimmer h-4 w-full rounded" />
          <div className="skeleton-shimmer h-4 w-5/6 rounded" />
          <div className="skeleton-shimmer h-4 w-2/3 rounded" />
        </div>
        <div className="space-y-4 rounded-2xl border border-[#DCE8E1] bg-white p-5 lg:col-span-4">
          <div className="skeleton-shimmer h-6 w-1/2 rounded-lg" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'list' || variant === 'table') {
    return (
      <div className="space-y-3 rounded-2xl border border-[#DCE8E1] bg-white p-5" aria-label="লোড হচ্ছে">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="লোড হচ্ছে">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-[#DCE8E1] bg-white p-5">
          <div className="skeleton-shimmer h-40 w-full rounded-xl" />
          <div className="skeleton-shimmer mt-4 h-5 w-3/4 rounded" />
          <div className="skeleton-shimmer mt-2 h-3.5 w-full rounded" />
          <div className="skeleton-shimmer mt-1.5 h-3.5 w-2/3 rounded" />
        </div>
      ))}
    </div>
  );
};
