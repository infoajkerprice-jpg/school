import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Calendar,
  FileSearch,
  GraduationCap,
  Hash,
  Search,
  Share2,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { usePublicData } from '../../context/PublicDataContext';
import { labelClass, toBnDigits } from '../../i18n';
import { BD_CLASSES } from '../../types';
import { MobileCardSlider } from '../MobileCardSlider';
import { EmptyState, PageHeader, PageSkeleton } from '../PageHeader';
import { useUIFeedback } from '../ToastContext';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`;
  return (name.trim().slice(0, 2) || 'শি').toUpperCase();
}

const CARD_ACCENTS = [
  { badge: 'bg-[#EDF9F4] text-[#087F5B]', ring: 'ring-[#087F5B]/25', avatar: 'bg-[#EDF9F4] text-[#087F5B]' },
  { badge: 'bg-[#FFF8EA] text-[#A66300]', ring: 'ring-[#F4A62A]/35', avatar: 'bg-[#FFF8EA] text-[#A66300]' },
  { badge: 'bg-[#F5F0FF] text-[#805AD5]', ring: 'ring-[#805AD5]/25', avatar: 'bg-[#F5F0FF] text-[#805AD5]' },
  { badge: 'bg-[#EBF8FD] text-[#0E7DA3]', ring: 'ring-[#21A9D6]/30', avatar: 'bg-[#EBF8FD] text-[#0E7DA3]' },
];

export const StudentsAchievementsPage: React.FC = () => {
  const { achievements, isLoading } = usePublicData();
  const [classFilter, setClassFilter] = useState<string>('সকল');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return achievements.filter((item) => {
      const clsOk = classFilter === 'সকল' || item.className === classFilter;
      const qOk =
        !q ||
        item.studentName.toLowerCase().includes(q) ||
        item.achievementTitle.toLowerCase().includes(q) ||
        item.rollNumber.toLowerCase().includes(q);
      return clsOk && qOk;
    });
  }, [achievements, classFilter, search]);

  const representedClassesCount = useMemo(
    () => new Set(achievements.map((a) => a.className)).size,
    [achievements]
  );

  return (
    <div className="space-y-4 sm:space-y-7">
      <PageHeader
        breadcrumbs={[{ label: 'শিক্ষার্থী ও অর্জন' }]}
        badge={`কৃতি শিক্ষার্থী: ${toBnDigits(achievements.length)} জন`}
        icon={<Trophy className="h-3.5 w-3.5" />}
        title="মেধাবী শিক্ষার্থী ও বিশেষ অর্জন"
        subtitle="বোর্ড বৃত্তি, জিপিএ ৫.০০, কুরআন তেলাওয়াত, অলিম্পিয়াড এবং সহ-শিক্ষা প্রতিযোগিতায় আমাদের শিক্ষার্থীদের সাফল্য।"
        accent="orange"
        rightSlot={
          <Link
            to="/results"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#F4A62A] px-4 py-2.5 text-xs font-extrabold text-[#123B67] shadow-sm transition hover:bg-[#f7b547] sm:text-sm"
          >
            <FileSearch className="h-4 w-4" />
            ফলাফল যাচাই করুন
          </Link>
        }
      />

      {/* Quick Summary Stats: Single-Card Slider on Mobile, 3-Col Grid on Tablet/Desktop */}
      <div className="sm:hidden">
        <MobileCardSlider
          items={[
            {
              key: 'total',
              content: (
                <div className="flex items-center gap-3.5 rounded-2xl border border-[#F8DFAF] bg-gradient-to-r from-[#FFF8EA] to-white p-4 shadow-2xs">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F4A62A] text-[#123B67]">
                    <Trophy className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-[#526B78]">মোট তালিকাভুক্ত অর্জন</p>
                    <p className="text-xl font-extrabold text-[#123B67] tabular-nums">
                      {toBnDigits(achievements.length)} জন
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: 'classes',
              content: (
                <div className="flex items-center gap-3.5 rounded-2xl border border-[#C5E8D8] bg-gradient-to-r from-[#EDF9F4] to-white p-4 shadow-2xs">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#087F5B] text-white">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-[#526B78]">অংশগ্রহণকারী শ্রেণি</p>
                    <p className="text-xl font-extrabold text-[#087F5B] tabular-nums">
                      {toBnDigits(representedClassesCount)} টি শ্রেণি
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: 'categories',
              content: (
                <div className="flex items-center gap-3.5 rounded-2xl border border-[#DDD1F5] bg-gradient-to-r from-[#F5F0FF] to-white p-4 shadow-2xs">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#805AD5] text-white">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-[#526B78]">সম্মাননা ক্যাটাগরি</p>
                    <p className="text-base font-extrabold text-[#805AD5]">
                      মেধা, হিফজ ও সহ-শিক্ষা
                    </p>
                  </div>
                </div>
              ),
            },
          ]}
          getKey={(s) => s.key}
          ariaLabel="অর্জনের সারসংক্ষেপ স্লাইডার"
          intervalMs={3000}
          transitionMs={500}
          dotTheme="orange"
          renderItem={(s) => s.content}
        />
      </div>

      <div className="hidden gap-4 sm:grid sm:grid-cols-3">
        <div className="flex items-center gap-3.5 rounded-2xl border border-[#F8DFAF] bg-gradient-to-r from-[#FFF8EA] to-white p-4 shadow-2xs">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F4A62A] text-[#123B67]">
            <Trophy className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold text-[#526B78]">মোট তালিকাভুক্ত অর্জন</p>
            <p className="text-xl font-extrabold text-[#123B67] tabular-nums">
              {toBnDigits(achievements.length)} জন
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3.5 rounded-2xl border border-[#C5E8D8] bg-gradient-to-r from-[#EDF9F4] to-white p-4 shadow-2xs">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#087F5B] text-white">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold text-[#526B78]">অংশগ্রহণকারী শ্রেণি</p>
            <p className="text-xl font-extrabold text-[#087F5B] tabular-nums">
              {toBnDigits(representedClassesCount)} টি শ্রেণি
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3.5 rounded-2xl border border-[#DDD1F5] bg-gradient-to-r from-[#F5F0FF] to-white p-4 shadow-2xs">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#805AD5] text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold text-[#526B78]">সম্মাননা ক্যাটাগরি</p>
            <p className="text-base font-extrabold text-[#805AD5]">মেধা, হিফজ ও সহ-শিক্ষা</p>
          </div>
        </div>
      </div>

      {/* Search & Class Filter */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-[#D4E6DD] bg-white p-3.5 shadow-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:p-4">
        <div className="relative flex-1 sm:min-w-[220px]">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#647E8B]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="শিক্ষার্থীর নাম, রোল বা অর্জনের শিরোনাম খুঁজুন..."
            className="min-h-[44px] w-full rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] py-2.5 pr-3.5 pl-10 text-sm text-[#263B35] focus:border-[#087F5B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087F5B]/20"
          />
        </div>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="min-h-[44px] w-full rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] px-3.5 py-2.5 text-sm font-bold text-[#123B67] focus:border-[#087F5B] focus:outline-none sm:w-auto"
        >
          <option value="সকল">সকল শ্রেণি</option>
          {BD_CLASSES.map((c) => (
            <option key={c} value={c}>
              {labelClass(c)}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <PageSkeleton variant="cards" count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Award className="h-7 w-7 text-[#F4A62A]" />}
          title="কোনো কৃতি শিক্ষার্থীর তথ্য পাওয়া যায়নি"
          description="অন্য শ্রেণি নির্বাচন করুন অথবা অনুসন্ধান পরিবর্তন করে চেষ্টা করুন।"
          action={
            (search || classFilter !== 'সকল') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setClassFilter('সকল');
                }}
                className="rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#06684A]"
              >
                সব কৃতি শিক্ষার্থী দেখুন
              </button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, idx) => {
            const theme = CARD_ACCENTS[idx % CARD_ACCENTS.length];
            return (
              <Link
                key={item.id}
                to={`/students/${item.id}`}
                className="group flex flex-col items-center justify-between rounded-2xl border border-[#DCE8E1] bg-white p-6 text-center shadow-xs transition duration-200 hover:-translate-y-1 hover:border-[#087F5B]/45 hover:shadow-md"
              >
                <div className="flex w-full flex-col items-center">
                  {item.photoUrl ? (
                    <img
                      src={item.photoUrl}
                      alt={item.studentName}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className={`h-24 w-24 rounded-full object-cover ring-4 ${theme.ring}`}
                    />
                  ) : (
                    <div
                      className={`flex h-24 w-24 items-center justify-center rounded-full text-2xl font-extrabold ring-4 ${theme.avatar} ${theme.ring}`}
                    >
                      {getInitials(item.studentName)}
                    </div>
                  )}

                  <h2 className="mt-3.5 text-base font-extrabold text-[#123B67] transition group-hover:text-[#087F5B]">
                    {item.studentName}
                  </h2>
                  <p className="mt-0.5 text-xs font-semibold text-[#526B78] tabular-nums">
                    {labelClass(item.className)} · রোল নং: {toBnDigits(item.rollNumber)}
                    {item.academicYear ? ` · ${toBnDigits(item.academicYear)}` : ''}
                  </p>

                  <div
                    className={`mt-3.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-extrabold ${theme.badge}`}
                  >
                    <Award className="h-4 w-4 shrink-0" />
                    <span className="line-clamp-2">{item.achievementTitle}</span>
                  </div>

                  {item.description && (
                    <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-[#4C6470]">
                      {item.description}
                    </p>
                  )}
                </div>

                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#087F5B] transition group-hover:translate-x-0.5">
                  বিস্তারিত সাফল্য দেখুন
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const StudentAchievementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { achievements, settings, isLoading } = usePublicData();
  const { notify } = useUIFeedback();

  const item = achievements.find((a) => a.id === id);
  const related = useMemo(
    () => achievements.filter((a) => a.id !== id).slice(0, 4),
    [achievements, id]
  );

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify('কৃতি শিক্ষার্থীর প্রোফাইল লিংক কপি হয়েছে।', 'success');
    } catch {
      notify('লিংক কপি করা যায়নি।', 'warning');
    }
  };

  if (isLoading) return <PageSkeleton variant="detail" />;

  if (!item) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: 'শিক্ষার্থী ও অর্জন', to: '/students' },
            { label: 'পাওয়া যায়নি' },
          ]}
          title="কৃতি শিক্ষার্থীর তথ্য পাওয়া যায়নি"
          accent="orange"
        />
        <EmptyState
          icon={<Trophy className="h-7 w-7 text-[#F4A62A]" />}
          title="অনুরোধকৃত কৃতি শিক্ষার্থীর তথ্য খুঁজে পাওয়া যায়নি"
          action={
            <Link
              to="/students"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-5 py-2.5 text-xs font-bold text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              সকল অর্জনের তালিকায় ফিরুন
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-7">
      <PageHeader
        breadcrumbs={[
          { label: 'শিক্ষার্থী ও অর্জন', to: '/students' },
          { label: item.studentName },
        ]}
        badge={item.achievementTitle}
        icon={<Trophy className="h-3.5 w-3.5" />}
        title={item.studentName}
        subtitle={`${labelClass(item.className)} · রোল নং: ${toBnDigits(item.rollNumber)} · ${settings.schoolNameBn}`}
        accent="orange"
        rightSlot={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleShare()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/15 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/25"
            >
              <Share2 className="h-3.5 w-3.5" />
              শেয়ার করুন
            </button>
            <Link
              to="/students"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#F4A62A] px-4 py-2 text-xs font-extrabold text-[#123B67] transition hover:bg-[#f7b547]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              সকল অর্জন
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="rounded-2xl border border-[#D4E6DD] bg-white p-6 shadow-xs sm:p-7">
            <div className="flex flex-col items-center gap-6 border-b border-[#E8F1EC] pb-6 sm:flex-row">
              {item.photoUrl ? (
                <img
                  src={item.photoUrl}
                  alt={item.studentName}
                  referrerPolicy="no-referrer"
                  className="h-32 w-32 shrink-0 rounded-2xl object-cover shadow-sm ring-4 ring-[#F4A62A]/35"
                />
              ) : (
                <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F4A62A] to-[#087F5B] text-3xl font-extrabold text-white shadow-sm">
                  {getInitials(item.studentName)}
                </div>
              )}

              <div className="text-center sm:text-left">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFF8EA] px-3 py-1 text-xs font-extrabold text-[#A66300]">
                  <Award className="h-4 w-4 text-[#F4A62A]" />
                  {item.achievementTitle}
                </span>
                <h2 className="mt-2.5 text-2xl font-extrabold text-[#123B67]">{item.studentName}</h2>
                <p className="mt-1 text-xs font-semibold text-[#526B78]">
                  {settings.schoolNameBn}-এর গৌরবোজ্জ্বল শিক্ষার্থী
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-3.5">
              <div className="rounded-xl border border-[#C5E8D8] bg-[#EDF9F4] p-3 sm:rounded-2xl sm:p-4">
                <GraduationCap className="h-4 w-4 text-[#087F5B] sm:h-5 sm:w-5" />
                <p className="mt-1.5 text-[10px] font-bold text-[#087F5B] sm:mt-2 sm:text-[11px]">শ্রেণি</p>
                <p className="truncate text-xs font-extrabold text-[#123B67] sm:text-base">{labelClass(item.className)}</p>
              </div>
              <div className="rounded-xl border border-[#C8DDF2] bg-[#EDF4FB] p-3 sm:rounded-2xl sm:p-4">
                <Hash className="h-4 w-4 text-[#123B67] sm:h-5 sm:w-5" />
                <p className="mt-1.5 text-[10px] font-bold text-[#123B67] sm:mt-2 sm:text-[11px]">রোল নং</p>
                <p className="text-xs font-extrabold text-[#123B67] tabular-nums sm:text-base">
                  {toBnDigits(item.rollNumber)}
                </p>
              </div>
              <div className="rounded-xl border border-[#DDD1F5] bg-[#F5F0FF] p-3 sm:rounded-2xl sm:p-4">
                <Calendar className="h-4 w-4 text-[#805AD5] sm:h-5 sm:w-5" />
                <p className="mt-1.5 text-[10px] font-bold text-[#805AD5] sm:mt-2 sm:text-[11px]">শিক্ষাবর্ষ</p>
                <p className="text-xs font-extrabold text-[#123B67] tabular-nums sm:text-base">
                  {toBnDigits(item.academicYear || '২০২৫')}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[#E2EDE7] bg-[#F8FBF9] p-5">
              <h3 className="text-sm font-extrabold text-[#123B67]">অর্জনের বিবরণ</h3>
              <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-[#263B35]">
                {item.description?.trim()
                  ? item.description
                  : `${item.studentName} (${labelClass(item.className)}, রোল নং: ${toBnDigits(item.rollNumber)}) ${settings.schoolNameBn}-এর পক্ষ থেকে "${item.achievementTitle}" অর্জনের মাধ্যমে প্রতিষ্ঠানের সুনাম বৃদ্ধি করেছে। আমরা তার উজ্জ্বল ভবিষ্যৎ ও ধারাবাহিক সাফল্য কামনা করি।`}
              </p>
            </div>
          </div>
        </div>

        <aside className="space-y-5 lg:col-span-4">
          <div className="rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs">
            <h3 className="text-base font-extrabold text-[#123B67]">অন্যান্য কৃতি শিক্ষার্থী</h3>
            <div className="mt-1.5 h-1 w-10 rounded-full bg-[#F4A62A]" />
            <div className="mt-4 space-y-3">
              {related.map((rel, i) => (
                <Link
                  key={rel.id}
                  to={`/students/${rel.id}`}
                  className="flex items-center gap-3 rounded-xl border border-[#E8F1EC] bg-[#FAFDFB] p-3 transition hover:border-[#087F5B] hover:bg-[#EDF9F4]"
                >
                  {rel.photoUrl ? (
                    <img
                      src={rel.photoUrl}
                      alt={rel.studentName}
                      referrerPolicy="no-referrer"
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                        CARD_ACCENTS[i % CARD_ACCENTS.length].avatar
                      }`}
                    >
                      {getInitials(rel.studentName)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#123B67]">{rel.studentName}</p>
                    <p className="truncate text-xs font-medium text-[#087F5B]">
                      {rel.achievementTitle}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-[#123B67] to-[#087F5B] p-5 text-white shadow-sm">
            <FileSearch className="h-7 w-7 text-[#F4A62A]" />
            <h3 className="mt-2 text-base font-extrabold">অনলাইন ফলাফল ও মার্কশিট</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-sky-100">
              রোল নম্বর ও শ্রেণি দিয়ে পরীক্ষার ফলাফল যাচাই ও অফিসিয়াল মার্কশিট পিডিএফ ডাউনলোড করুন।
            </p>
            <Link
              to="/results"
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#F4A62A] px-4 py-2.5 text-xs font-extrabold text-[#123B67] transition hover:bg-[#f7b547]"
            >
              ফলাফল পাতায় যান
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
};
