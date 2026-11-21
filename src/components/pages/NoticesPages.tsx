import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Calendar,
  Download,
  FileText,
  Pin,
  Printer,
  Search,
  Share2,
  Tag,
  Users,
} from 'lucide-react';
import { usePublicData } from '../../context/PublicDataContext';
import { downloadNoticePdf } from '../../lib/reports';
import { AUDIENCE_BN, isRecentDate, NOTICE_CATEGORY_BN, toBnDigits } from '../../i18n';
import { EmptyState, PageHeader, PageSkeleton } from '../PageHeader';
import { useUIFeedback } from '../ToastContext';

export const NoticesPage: React.FC = () => {
  const { notices, isLoading } = usePublicData();
  const { notify } = useUIFeedback();
  const [category, setCategory] = useState<string>('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notices.filter((n) => {
      const catOk = category === 'All' || n.category === category;
      const qOk =
        !q ||
        n.title.toLowerCase().includes(q) ||
        (n.titleBn || '').toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [notices, category, search]);

  return (
    <div className="space-y-4 sm:space-y-7">
      <PageHeader
        breadcrumbs={[{ label: 'নোটিশ বোর্ড' }]}
        badge={`মোট বিজ্ঞপ্তি: ${toBnDigits(notices.length)} টি`}
        icon={<Bell className="h-3.5 w-3.5" />}
        title="অফিশিয়াল নোটিশ বোর্ড"
        subtitle="প্রতিষ্ঠানের জরুরি বিজ্ঞপ্তি, ভর্তি নোটিশ, পরীক্ষার রুটিন, ছুটি ও ফলাফল সংক্রান্ত সকল হালনাগাদ তথ্য।"
        accent="navy"
      />

      <div className="space-y-3 rounded-2xl border border-[#D4E6DD] bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#647E8B]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="নোটিশের শিরোনাম বা বিবরণ খুঁজুন..."
              className="w-full rounded-xl border border-[#CBE0D6] bg-[#F8FBF9] py-2.5 pr-3.5 pl-10 text-sm text-[#263B35] focus:border-[#087F5B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087F5B]/20"
            />
          </div>
          <span className="rounded-xl bg-[#F2F8F5] px-3.5 py-2 text-xs font-bold text-[#123B67] tabular-nums">
            পাওয়া গেছে: {toBnDigits(filtered.length)} টি
          </span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto border-t border-[#EDF4F0] pt-3 no-scrollbar sm:flex-wrap">
          {Object.entries(NOTICE_CATEGORY_BN).map(([k, v]) => {
            const active = category === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setCategory(k)}
                className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  active
                    ? k === 'Urgent'
                      ? 'bg-[#F4A62A] text-[#123B67] shadow-2xs'
                      : 'bg-[#087F5B] text-white shadow-2xs'
                    : 'bg-[#F2F8F5] text-[#123B67] hover:bg-[#E1F2E8]'
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <PageSkeleton variant="list" count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-7 w-7 text-[#087F5B]" />}
          title="কোনো নোটিশ পাওয়া যায়নি"
          description="অনুসন্ধান শব্দ বা ক্যাটাগরি পরিবর্তন করে পুনরায় চেষ্টা করুন।"
          action={
            (search || category !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCategory('All');
                }}
                className="rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white"
              >
                সব নোটিশ দেখুন
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-3.5">
          {filtered.map((n) => {
            const isUrgent = n.category === 'Urgent' || n.isPinned;
            const recent = isRecentDate(n.publishedDate);
            return (
              <article
                key={n.id}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  isUrgent
                    ? 'border-[#F4A62A]/70 bg-[#FFF9EC]'
                    : 'border-[#D4E6DD] bg-white hover:border-[#087F5B]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    {isUrgent && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[#F4A62A] px-2.5 py-0.5 text-[#123B67]">
                        {n.isPinned ? <Pin className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                        জরুরি
                      </span>
                    )}
                    <span className="rounded-lg bg-[#EDF9F4] px-2.5 py-0.5 text-[#087F5B]">
                      {NOTICE_CATEGORY_BN[n.category] || n.category}
                    </span>
                    <span className="text-[#526B78] tabular-nums">{toBnDigits(n.publishedDate)}</span>
                    {recent && (
                      <span className="rounded-md bg-[#E11D48] px-2 py-0.5 text-[11px] text-white">
                        নতুন
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/notices/${n.id}`}
                    className="mt-2 block text-base font-extrabold text-[#123B67] transition hover:text-[#087F5B]"
                  >
                    {n.titleBn || n.title}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#47606D]">
                    {n.contentBn || n.content}
                  </p>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center">
                  <Link
                    to={`/notices/${n.id}`}
                    className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-[#087F5B] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#06684A] sm:px-4 sm:py-2.5"
                  >
                    বিস্তারিত পড়ুন
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      downloadNoticePdf(n);
                      notify('নোটিশ পিডিএফ ডাউনলোড শুরু হয়েছে।', 'success');
                    }}
                    className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl border border-[#CBE0D6] bg-white px-3.5 py-2 text-xs font-bold text-[#123B67] transition hover:bg-[#EAF2FA] sm:py-2.5"
                  >
                    <Download className="h-3.5 w-3.5 text-[#087F5B]" />
                    পিডিএফ
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const NoticeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { notices, settings, isLoading } = usePublicData();
  const { notify } = useUIFeedback();
  const notice = notices.find((n) => n.id === id);

  const relatedNotices = useMemo(
    () => notices.filter((n) => n.id !== id).slice(0, 5),
    [notices, id]
  );

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify('নোটিশের লিংক কপি করা হয়েছে।', 'success');
    } catch {
      notify('লিংক কপি করা যায়নি।', 'warning');
    }
  };

  if (isLoading) return <PageSkeleton variant="detail" />;

  if (!notice) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: 'নোটিশ বোর্ড', to: '/notices' },
            { label: 'পাওয়া যায়নি' },
          ]}
          title="নোটিশটি খুঁজে পাওয়া যায়নি"
          accent="navy"
        />
        <EmptyState
          icon={<FileText className="h-7 w-7 text-[#087F5B]" />}
          title="নোটিশটি খুঁজে পাওয়া যায়নি"
          description="সম্ভবত নোটিশটি মুছে ফেলা হয়েছে বা লিংকটি সঠিক নয়।"
          action={
            <Link
              to="/notices"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-5 py-2.5 text-xs font-bold text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              সকল নোটিশে ফিরুন
            </Link>
          }
        />
      </div>
    );
  }

  const title = notice.titleBn || notice.title;

  return (
    <div className="space-y-4 sm:space-y-7">
      <PageHeader
        breadcrumbs={[
          { label: 'নোটিশ বোর্ড', to: '/notices' },
          { label: title },
        ]}
        badge={NOTICE_CATEGORY_BN[notice.category] || notice.category}
        icon={<Bell className="h-3.5 w-3.5" />}
        title={title}
        subtitle={`প্রকাশের তারিখ: ${toBnDigits(notice.publishedDate)} · প্রাপক: ${AUDIENCE_BN[notice.audience] || notice.audience}`}
        accent="navy"
        rightSlot={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/15 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/25"
            >
              <Share2 className="h-3.5 w-3.5" />
              লিংক কপি
            </button>
            <button
              type="button"
              onClick={() => {
                downloadNoticePdf(notice);
                notify('নোটিশ পিডিএফ ডাউনলোড হচ্ছে।', 'success');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#F4A62A] px-4 py-2 text-xs font-extrabold text-[#123B67] transition hover:bg-[#f7b547]"
            >
              <Download className="h-3.5 w-3.5" />
              পিডিএফ ডাউনলোড
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
        {/* Main Official Notice Document */}
        <article className="space-y-6 rounded-2xl border border-[#D4E6DD] bg-white p-6 shadow-xs sm:p-8 lg:col-span-8">
          {/* 3 Metadata Info Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-[#C5E8D8] bg-[#EDF9F4] p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#087F5B] text-white">
                <Tag className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#087F5B]">বিভাগ</p>
                <p className="truncate text-xs font-extrabold text-[#123B67]">
                  {NOTICE_CATEGORY_BN[notice.category] || notice.category}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[#F8DFAF] bg-[#FFF8EA] p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F4A62A] text-[#123B67]">
                <Calendar className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#A66300]">প্রকাশের তারিখ</p>
                <p className="truncate text-xs font-extrabold text-[#123B67] tabular-nums">
                  {toBnDigits(notice.publishedDate)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[#DDD1F5] bg-[#F5F0FF] p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#805AD5] text-white">
                <Users className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#805AD5]">প্রাপক</p>
                <p className="truncate text-xs font-extrabold text-[#123B67]">
                  {AUDIENCE_BN[notice.audience] || notice.audience}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E6F0EA] bg-[#FAFDFB] p-5 sm:p-6">
            <div className="whitespace-pre-line text-sm leading-loose text-[#263B35] sm:text-base">
              {notice.contentBn || notice.content}
            </div>
          </div>

          {/* Official Signature & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E6F0EA] pt-5">
            <div className="rounded-xl bg-[#F2F8F5] px-4 py-3 text-xs text-[#526B78]">
              <p className="font-extrabold text-[#123B67]">আদেশক্রমে,</p>
              <p className="mt-0.5 font-bold text-[#087F5B]">{settings.principalName || 'অধ্যক্ষ'}</p>
              <p>{settings.schoolNameBn}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#CBE0D6] bg-white px-4 py-2.5 text-xs font-bold text-[#123B67] transition hover:bg-[#F2F8F5]"
              >
                <Printer className="h-4 w-4 text-[#123B67]" />
                প্রিন্ট করুন
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadNoticePdf(notice);
                  notify('নোটিশ পিডিএফ ডাউনলোড হচ্ছে।', 'success');
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#087F5B] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#06684A]"
              >
                <Download className="h-4 w-4" />
                পিডিএফ ডাউনলোড
              </button>
            </div>
          </div>
        </article>

        {/* Right Sidebar: Related Notices + Back Link */}
        <aside className="space-y-5 lg:col-span-4">
          <div className="rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-[#123B67]">সাম্প্রতিক অন্যান্য নোটিশ</h2>
              <Link to="/notices" className="text-xs font-bold text-[#087F5B] hover:underline">
                সব দেখুন
              </Link>
            </div>
            <div className="mt-1.5 h-1 w-10 rounded-full bg-[#F4A62A]" />

            <div className="mt-4 space-y-2.5">
              {relatedNotices.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/notices/${rel.id}`}
                  className="block rounded-xl border border-[#E8F1EC] bg-[#FAFDFB] p-3.5 transition hover:border-[#087F5B] hover:bg-[#EDF9F4]"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold text-[#087F5B]">
                      {NOTICE_CATEGORY_BN[rel.category] || rel.category}
                    </span>
                    <span className="text-[#647E8B] tabular-nums">{toBnDigits(rel.publishedDate)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs font-bold text-[#123B67]">
                    {rel.titleBn || rel.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <Link
            to="/notices"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#CFE0D6] bg-white py-3 text-xs font-bold text-[#123B67] shadow-2xs transition hover:bg-[#123B67] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            সকল নোটিশ বোর্ডে ফিরে যান
          </Link>
        </aside>
      </div>
    </div>
  );
};
