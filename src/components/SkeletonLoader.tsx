import React from 'react';

export const HomeSkeleton: React.FC = () => {
  return (
    <div className="space-y-6" aria-label="তথ্য লোড হচ্ছে">
      {/* Hero Skeleton */}
      <div className="skeleton-shimmer h-[280px] w-full rounded-2xl sm:h-[360px] lg:h-[440px]" />

      {/* Feature Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#DCE8E1] bg-white p-4">
            <div className="skeleton-shimmer h-10 w-10 rounded-xl" />
            <div className="skeleton-shimmer mt-3 h-4 w-3/4 rounded" />
            <div className="skeleton-shimmer mt-2 h-3 w-full rounded" />
          </div>
        ))}
      </div>

      {/* Main Editorial Grid Skeleton */}
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="rounded-2xl border border-[#DCE8E1] bg-white p-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
              <div className="skeleton-shimmer h-56 rounded-xl md:col-span-5" />
              <div className="space-y-3 md:col-span-7">
                <div className="skeleton-shimmer h-4 w-1/3 rounded" />
                <div className="skeleton-shimmer h-6 w-2/3 rounded" />
                <div className="skeleton-shimmer h-4 w-full rounded" />
                <div className="skeleton-shimmer h-4 w-5/6 rounded" />
                <div className="skeleton-shimmer mt-4 h-10 w-40 rounded-xl" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[#DCE8E1] bg-white p-6">
            <div className="skeleton-shimmer h-6 w-1/2 rounded" />
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-shimmer h-28 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6 lg:col-span-4">
          <div className="rounded-2xl border border-[#DCE8E1] bg-white p-5">
            <div className="skeleton-shimmer h-6 w-1/2 rounded" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton-shimmer h-14 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
