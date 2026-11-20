import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Newspaper,
  Search,
  Share2,
  Sparkles,
  Tag,
} from 'lucide-react';
import { usePublicData } from '../../context/PublicDataContext';
import { NEWS_CATEGORY_BN, toBnDigits } from '../../i18n';
import { EmptyState, PageHeader, PageSkeleton } from '../PageHeader';
import { useUIFeedback } from '../ToastContext';

const CATEGORY_COLORS = [
  'bg-[#EDF9F4] text-[#087F5B]',
  'bg-[#F5F0FF] text-[#805AD5]',
  'bg-[#EBF8FD] text-[#0E7DA3]',
  'bg-[#FFF8EA] text-[#A66300]',
];

export const NewsPage: React.FC = () => {
  const { news, isLoading } = usePublicData();
  const [category, setCategory] = useState<string>('All');
  const [search, setSearch] = useState('');

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    news.forEach((n) => set.add(n.category));
    return Array.from(set);
  }, [news]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return news.filter((a) => {
      const catOk = category === 'All' || a.category === category;
      const qOk =
        !q ||
        (a.titleBn || a.title).toLowerCase().includes(q) ||
        (a.summaryBn || a.summary).toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [news, category, search]);

  const leadArticle = !search && category === 'All' && filtered.length > 0 ? filtered[0] : null;
  const gridArticles = leadArticle ? filtered.slice(1) : filtered;

  return (
    <div className="space-y-7">
      <PageHeader
        breadcrumbs={[{ label: 'সংবাদ ও কার্যক্রম' }]}
        badge={`প্রকাশিত প্রতিবেদন: ${toBnDigits(news.length)} টি`}
        icon={<Newspaper className="h-3.5 w-3.5" />}
        title="সংবাদ ও সাম্প্রতিক কার্যক্রম"
        subtitle="প্রতিষ্ঠানের সাফল্য, বার্ষিক অনুষ্ঠান, ইসলামিক প্রতিযোগিতা, ক্রীড়া ও সাংস্কৃতিক আয়োজনের সর্বশেষ প্রতিবেদন।"
        accent="purple"
      />

      {/* Search + Category Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D4E6DD] bg-white p-4 shadow-xs">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#647E8B]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="সংবাদের শিরোনাম বা বিবরণ খুঁজুন..."
            className="w-full rounded-xl border border-[#CBE0D6] bg-[#F8FBF9] py-2.5 pr-3.5 pl-10 text-sm text-[#263B35] focus:border-[#805AD5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#805AD5]/20"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                category === cat
                  ? 'bg-[#805AD5] text-white shadow-xs'
                  : 'bg-[#F2F8F5] text-[#123B67] hover:bg-[#E1F2E8]'
              }`}
            >
              {cat === 'All' ? 'সকল সংবাদ' : NEWS_CATEGORY_BN[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <PageSkeleton variant="cards" count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Newspaper className="h-7 w-7 text-[#805AD5]" />}
          title="কোনো সংবাদ পাওয়া যায়নি"
          description="অনুসন্ধান পরিবর্তন করুন অথবা সকল সংবাদ দেখুন।"
          action={
            (search || category !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCategory('All');
                }}
                className="rounded-xl bg-[#805AD5] px-4 py-2 text-xs font-bold text-white"
              >
                সব সংবাদ দেখুন
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Featured Lead News Card */}
          {leadArticle && (
            <article className="group overflow-hidden rounded-3xl border border-[#D4E6DD] bg-white shadow-sm transition hover:shadow-md">
              <div className="grid grid-cols-1 lg:grid-cols-12">
                {leadArticle.imageUrl && (
                  <div className="relative min-h-[240px] overflow-hidden bg-[#123B67] lg:col-span-6">
                    <img
                      src={leadArticle.imageUrl}
                      alt={leadArticle.titleBn || leadArticle.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute top-4 left-4 inline-flex items-center gap-1 rounded-lg bg-[#F4A62A] px-3 py-1 text-xs font-extrabold text-[#123B67] shadow-sm">
                      <Sparkles className="h-3.5 w-3.5" />
                      সর্বশেষ বিশেষ সংবাদ
                    </span>
                  </div>
                )}
                <div
                  className={`flex flex-col justify-between p-6 sm:p-8 ${
                    leadArticle.imageUrl ? 'lg:col-span-6' : 'lg:col-span-12'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold">
                      <span className="rounded-lg bg-[#F5F0FF] px-2.5 py-1 text-[#805AD5]">
                        {NEWS_CATEGORY_BN[leadArticle.category] || leadArticle.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#526B78] tabular-nums">
                        <Calendar className="h-3.5 w-3.5 text-[#21A9D6]" />
                        {toBnDigits(leadArticle.eventDate)}
                      </span>
                    </div>
                    <Link
                      to={`/news/${leadArticle.id}`}
                      className="mt-3 block text-xl font-extrabold leading-snug text-[#123B67] transition hover:text-[#087F5B] sm:text-2xl"
                    >
                      {leadArticle.titleBn || leadArticle.title}
                    </Link>
                    <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-[#263B35]">
                      {leadArticle.summaryBn || leadArticle.summary}
                    </p>
                  </div>
                  <div className="mt-5">
                    <Link
                      to={`/news/${leadArticle.id}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#087F5B] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#06684A]"
                    >
                      সম্পূর্ণ প্রতিবেদন পড়ুন
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          )}

          {/* Regular News Grid */}
          {gridArticles.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {gridArticles.map((article, idx) => (
                <article
                  key={article.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#DCE8E1] bg-white shadow-xs transition duration-200 hover:-translate-y-1 hover:border-[#087F5B]/45 hover:shadow-md"
                >
                  {article.imageUrl && (
                    <Link to={`/news/${article.id}`} className="block overflow-hidden bg-[#123B67]">
                      <img
                        src={article.imageUrl}
                        alt={article.titleBn || article.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="h-48 w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    </Link>
                  )}
                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs font-bold">
                        <span
                          className={`rounded-lg px-2.5 py-0.5 ${
                            CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
                          }`}
                        >
                          {NEWS_CATEGORY_BN[article.category] || article.category}
                        </span>
                        <span className="text-[#647E8B] tabular-nums">
                          {toBnDigits(article.eventDate)}
                        </span>
                      </div>
                      <Link
                        to={`/news/${article.id}`}
                        className="mt-3 block text-base font-extrabold leading-snug text-[#123B67] transition hover:text-[#087F5B]"
                      >
                        {article.titleBn || article.title}
                      </Link>
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#4C6470]">
                        {article.summaryBn || article.summary}
                      </p>
                    </div>
                    <Link
                      to={`/news/${article.id}`}
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-[#087F5B] transition hover:translate-x-0.5"
                    >
                      বিস্তারিত পড়ুন
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const NewsDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { news, isLoading } = usePublicData();
  const { notify } = useUIFeedback();
  const article = news.find((n) => n.id === id);

  const relatedNews = useMemo(
    () => news.filter((n) => n.id !== id).slice(0, 4),
    [news, id]
  );

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify('সংবাদের লিংক কপি করা হয়েছে।', 'success');
    } catch {
      notify('লিংক কপি করা যায়নি।', 'warning');
    }
  };

  if (isLoading) return <PageSkeleton variant="detail" />;

  if (!article) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: 'সংবাদ ও কার্যক্রম', to: '/news' },
            { label: 'পাওয়া যায়নি' },
          ]}
          title="সংবাদটি খুঁজে পাওয়া যায়নি"
          accent="purple"
        />
        <EmptyState
          icon={<Newspaper className="h-7 w-7 text-[#805AD5]" />}
          title="সংবাদটি খুঁজে পাওয়া যায়নি"
          description="সম্ভবত প্রতিবেদনটি সরিয়ে নেওয়া হয়েছে বা ঠিকানাটি সঠিক নয়।"
          action={
            <Link
              to="/news"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-5 py-2.5 text-xs font-bold text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              সকল সংবাদে ফিরুন
            </Link>
          }
        />
      </div>
    );
  }

  const title = article.titleBn || article.title;

  return (
    <div className="space-y-7">
      <PageHeader
        breadcrumbs={[
          { label: 'সংবাদ ও কার্যক্রম', to: '/news' },
          { label: title },
        ]}
        badge={NEWS_CATEGORY_BN[article.category] || article.category}
        icon={<Tag className="h-3.5 w-3.5" />}
        title={title}
        subtitle={`তারিখ: ${toBnDigits(article.eventDate)}`}
        accent="purple"
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
              to="/news"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#F4A62A] px-4 py-2 text-xs font-extrabold text-[#123B67] transition hover:bg-[#f7b547]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              সব সংবাদ
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
        <article className="overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-xs lg:col-span-8">
          {article.imageUrl && (
            <img
              src={article.imageUrl}
              alt={title}
              referrerPolicy="no-referrer"
              className="max-h-[440px] w-full object-cover"
            />
          )}
          <div className="space-y-5 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold">
              <span className="rounded-lg bg-[#F5F0FF] px-3 py-1 text-[#805AD5]">
                {NEWS_CATEGORY_BN[article.category] || article.category}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#EBF8FD] px-3 py-1 text-[#0E7DA3] tabular-nums">
                <Calendar className="h-3.5 w-3.5" />
                {toBnDigits(article.eventDate)}
              </span>
            </div>

            <h2 className="text-xl font-extrabold leading-snug text-[#123B67] sm:text-2xl">
              {title}
            </h2>

            {(article.summaryBn || article.summary) && article.body && (
              <p className="rounded-2xl border border-[#E2EDE7] bg-[#F2F8F5] p-4 text-sm font-semibold leading-relaxed text-[#123B67]">
                {article.summaryBn || article.summary}
              </p>
            )}

            <div className="whitespace-pre-line text-sm leading-loose text-[#263B35] sm:text-base">
              {article.body || article.summaryBn || article.summary}
            </div>
          </div>
        </article>

        <aside className="space-y-5 lg:col-span-4">
          <div className="rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs">
            <h3 className="text-base font-extrabold text-[#123B67]">সাম্প্রতিক অন্যান্য সংবাদ</h3>
            <div className="mt-1.5 h-1 w-10 rounded-full bg-[#805AD5]" />
            <div className="mt-4 space-y-3">
              {relatedNews.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/news/${rel.id}`}
                  className="group flex items-start gap-3 rounded-xl border border-[#E8F1EC] bg-[#FAFDFB] p-3 transition hover:border-[#805AD5]/50 hover:bg-[#F5F0FF]/50"
                >
                  {rel.imageUrl && (
                    <img
                      src={rel.imageUrl}
                      alt={rel.titleBn || rel.title}
                      referrerPolicy="no-referrer"
                      className="h-14 w-16 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-xs font-bold text-[#123B67] group-hover:text-[#087F5B]">
                      {rel.titleBn || rel.title}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-[#647E8B] tabular-nums">
                      {toBnDigits(rel.eventDate)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-[#123B67] to-[#087F5B] p-5 text-white shadow-sm">
            <h3 className="text-base font-extrabold">ভর্তি ও ক্যাম্পাস গ্যালারি</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-sky-100">
              আমাদের ক্যাম্পাসের ছবি-ভিডিও দেখুন অথবা অনলাইন ভর্তি আবেদন করুন।
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                to="/gallery"
                className="rounded-xl bg-white/15 px-4 py-2 text-center text-xs font-bold text-white transition hover:bg-white/25"
              >
                ছবি ও ভিডিও গ্যালারি
              </Link>
              <Link
                to="/admission"
                className="rounded-xl bg-[#F4A62A] px-4 py-2 text-center text-xs font-extrabold text-[#123B67] transition hover:bg-[#f7b547]"
              >
                অনলাইন ভর্তি আবেদন
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
