import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Image as ImageIcon,
  Play,
  Share2,
  Tag,
  Video,
  X,
} from 'lucide-react';
import { usePublicData } from '../../context/PublicDataContext';
import { GALLERY_CATEGORY_BN, toBnDigits } from '../../i18n';
import { MobileCardSlider } from '../MobileCardSlider';
import { EmptyState, PageHeader, PageSkeleton } from '../PageHeader';
import { useUIFeedback } from '../ToastContext';

function getYouTubeEmbedUrl(url?: string, autoplay = true): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}${autoplay ? '?autoplay=1' : ''}` : null;
}

export const GalleryPage: React.FC = () => {
  const { gallery, isLoading } = usePublicData();
  const [category, setCategory] = useState<string>('All');
  const [mediaType, setMediaType] = useState<'all' | 'photo' | 'video'>('all');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const swipeStartX = useRef<number | null>(null);

  const filtered = useMemo(() => {
    return gallery.filter((g) => {
      const catOk = category === 'All' || g.category === category;
      const type = g.mediaType || (g.videoUrl ? 'video' : 'photo');
      const mediaOk = mediaType === 'all' || type === mediaType;
      return catOk && mediaOk;
    });
  }, [gallery, category, mediaType]);

  const selected = selectedIndex !== null ? filtered[selectedIndex] ?? null : null;

  useEffect(() => {
    if (selectedIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedIndex(null);
      if (e.key === 'ArrowRight') {
        setSelectedIndex((cur) => (cur === null ? null : (cur + 1) % filtered.length));
      }
      if (e.key === 'ArrowLeft') {
        setSelectedIndex((cur) =>
          cur === null ? null : (cur - 1 + filtered.length) % filtered.length
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIndex, filtered.length]);

  return (
    <div className="space-y-7">
      <PageHeader
        breadcrumbs={[{ label: 'ছবি ও ভিডিও গ্যালারি' }]}
        badge={`মোট মিডিয়া: ${toBnDigits(gallery.length)} টি`}
        icon={<ImageIcon className="h-3.5 w-3.5" />}
        title="ক্যাম্পাস ছবি ও ভিডিও গ্যালারি"
        subtitle="শাহ ইসলামিক স্কুল এন্ড কলেজের ক্যাম্পাস, প্রাত্যহিক সমাবেশ, একাডেমিক ভবন ও বিভিন্ন আয়োজনের বাস্তব স্থিরচিত্র ও ভিডিও।"
        accent="emerald"
      />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D4E6DD] bg-white p-4 shadow-xs">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: 'all', label: 'সব মিডিয়া', active: 'bg-[#087F5B] text-white' },
              { id: 'photo', label: 'ছবি', active: 'bg-[#123B67] text-white' },
              { id: 'video', label: 'ভিডিও', active: 'bg-[#805AD5] text-white' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMediaType(tab.id);
                setSelectedIndex(null);
              }}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                mediaType === tab.id
                  ? `${tab.active} shadow-xs`
                  : 'bg-[#F2F8F5] text-[#123B67] hover:bg-[#E1F2E8]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setSelectedIndex(null);
          }}
          className="min-h-[40px] w-full rounded-xl border border-[#CBE0D6] bg-[#F8FBF9] px-3.5 py-2 text-xs font-bold text-[#123B67] focus:border-[#087F5B] focus:outline-none sm:w-auto"
        >
          <option value="All">সকল বিভাগ</option>
          {Object.entries(GALLERY_CATEGORY_BN).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <PageSkeleton variant="cards" count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-7 w-7 text-[#087F5B]" />}
          title="এই বিভাগে কোনো ছবি বা ভিডিও পাওয়া যায়নি"
          description="অন্য বিভাগ বা সব মিডিয়া নির্বাচন করে দেখুন।"
          action={
            (category !== 'All' || mediaType !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setCategory('All');
                  setMediaType('all');
                }}
                className="rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white"
              >
                সব মিডিয়া দেখুন
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-5">
          {/* Mobile Featured Single-Card Auto Slider */}
          <div className="md:hidden">
            <MobileCardSlider
              items={filtered.slice(0, 10)}
              getKey={(item) => item.id}
              ariaLabel="গ্যালারি হাইলাইট স্লাইডার"
              intervalMs={3000}
              transitionMs={500}
              dotTheme="green"
              showCounter
              renderItem={(item, idx) => {
                const isVideo = item.mediaType === 'video' || Boolean(item.videoUrl);
                return (
                  <div className="overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-[0_4px_16px_rgba(18,59,103,0.07)]">
                    <button
                      type="button"
                      onClick={() => setSelectedIndex(idx)}
                      className="relative block aspect-[16/10] w-full overflow-hidden bg-[#123B67] text-left"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.titleBn || item.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#091E36]/88 via-[#091E36]/20 to-transparent" />
                      {isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F4A62A] text-[#123B67] shadow-lg ring-4 ring-white/30">
                            <Play className="ml-0.5 h-6 w-6 fill-[#123B67]" />
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
                        <p className="text-[10.5px] font-bold text-[#F4A62A] tabular-nums">
                          {GALLERY_CATEGORY_BN[item.category] || item.category}
                          {item.eventDate ? ` · ${toBnDigits(item.eventDate)}` : ''}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-sm font-extrabold leading-snug">
                          {item.titleBn || item.title}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center justify-between gap-2 bg-white px-4 py-2.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedIndex(idx)}
                        className="font-bold text-[#123B67]"
                      >
                        {isVideo ? 'ভিডিও দেখুন' : 'বড় করে দেখুন'}
                      </button>
                      <Link
                        to={`/gallery/${item.id}`}
                        className="inline-flex items-center gap-1 font-bold text-[#087F5B]"
                      >
                        বিস্তারিত
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3">
          {filtered.map((item, idx) => {
            const isVideo = item.mediaType === 'video' || Boolean(item.videoUrl);
            return (
              <div
                key={item.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-xs transition duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <button
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className="relative aspect-[4/3] w-full overflow-hidden bg-[#123B67] text-left"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.titleBn || item.title}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-108"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#091E36]/85 via-[#091E36]/15 to-transparent" />
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-lg bg-[#123B67]/85 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
                    {isVideo ? (
                      <Video className="h-3.5 w-3.5 text-[#F4A62A]" />
                    ) : (
                      <ImageIcon className="h-3.5 w-3.5 text-[#21A9D6]" />
                    )}
                    {GALLERY_CATEGORY_BN[item.category] || item.category}
                  </span>
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F4A62A] text-[#123B67] shadow-lg transition group-hover:scale-110">
                        <Play className="ml-0.5 h-6 w-6 fill-[#123B67]" />
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="line-clamp-2 text-sm font-bold text-white">
                      {item.titleBn || item.title}
                    </p>
                    {item.eventDate && (
                      <p className="mt-0.5 text-[11px] font-semibold text-[#F4A62A] tabular-nums">
                        {toBnDigits(item.eventDate)}
                      </p>
                    )}
                  </div>
                </button>
                <div className="flex items-center justify-between gap-2 bg-white px-4 py-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className="font-bold text-[#123B67] transition hover:text-[#087F5B]"
                  >
                    বড় করে দেখুন
                  </button>
                  <Link
                    to={`/gallery/${item.id}`}
                    className="inline-flex items-center gap-1 font-bold text-[#087F5B] hover:underline"
                  >
                    বিস্তারিত
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {selected && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#071729]/88 p-3 backdrop-blur-xs sm:p-6"
          onClick={() => setSelectedIndex(null)}
        >
          <div
            className="sheet-enter w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              swipeStartX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              if (swipeStartX.current === null || filtered.length <= 1) return;
              const endX = e.changedTouches[0]?.clientX ?? swipeStartX.current;
              const delta = endX - swipeStartX.current;
              if (Math.abs(delta) > 40) {
                setSelectedIndex((cur) => {
                  if (cur === null) return null;
                  return delta < 0
                    ? (cur + 1) % filtered.length
                    : (cur - 1 + filtered.length) % filtered.length;
                });
              }
              swipeStartX.current = null;
            }}
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-[#123B67] to-[#087F5B] px-5 py-3.5 text-white">
              <div className="min-w-0 pr-3">
                <p className="text-[11px] font-semibold text-[#F4A62A] tabular-nums">
                  {GALLERY_CATEGORY_BN[selected.category] || selected.category} ·{' '}
                  {toBnDigits(selectedIndex + 1)} / {toBnDigits(filtered.length)}
                </p>
                <h2 className="truncate text-sm font-bold sm:text-base">
                  {selected.titleBn || selected.title}
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  to={`/gallery/${selected.id}`}
                  onClick={() => setSelectedIndex(null)}
                  className="hidden items-center gap-1 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/25 sm:inline-flex"
                >
                  বিস্তারিত পেজ
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedIndex(null)}
                  aria-label="বন্ধ করুন"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="relative bg-[#07131E]">
              {selected.mediaType === 'video' || selected.videoUrl ? (
                getYouTubeEmbedUrl(selected.videoUrl, true) ? (
                  <iframe
                    src={getYouTubeEmbedUrl(selected.videoUrl, true)!}
                    title={selected.title}
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : selected.videoUrl ? (
                  <video src={selected.videoUrl} controls autoPlay className="max-h-[68vh] w-full" />
                ) : (
                  <img
                    src={selected.imageUrl}
                    alt={selected.title}
                    referrerPolicy="no-referrer"
                    className="max-h-[68vh] w-full object-contain"
                  />
                )
              ) : (
                <img
                  src={selected.imageUrl}
                  alt={selected.title}
                  referrerPolicy="no-referrer"
                  className="max-h-[70vh] w-full object-contain"
                />
              )}

              {filtered.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIndex((cur) =>
                        cur === null ? 0 : (cur - 1 + filtered.length) % filtered.length
                      )
                    }
                    aria-label="পূর্ববর্তী ছবি"
                    className="absolute top-1/2 left-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs transition hover:bg-[#087F5B]"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIndex((cur) => (cur === null ? 0 : (cur + 1) % filtered.length))
                    }
                    aria-label="পরবর্তী ছবি"
                    className="absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs transition hover:bg-[#087F5B]"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
            {selected.caption && (
              <div className="p-4 text-sm text-[#263B35]">{selected.caption}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const GalleryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { gallery, isLoading } = usePublicData();
  const { notify } = useUIFeedback();

  const item = gallery.find((g) => g.id === id);
  const related = useMemo(
    () => gallery.filter((g) => g.id !== id).slice(0, 4),
    [gallery, id]
  );

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify('গ্যালারি লিংক কপি করা হয়েছে।', 'success');
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
            { label: 'ছবি ও ভিডিও গ্যালারি', to: '/gallery' },
            { label: 'পাওয়া যায়নি' },
          ]}
          title="গ্যালারি মিডিয়া পাওয়া যায়নি"
          accent="emerald"
        />
        <EmptyState
          icon={<ImageIcon className="h-7 w-7 text-[#087F5B]" />}
          title="অনুরোধকৃত ছবি বা ভিডিও খুঁজে পাওয়া যায়নি"
          action={
            <Link
              to="/gallery"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-5 py-2.5 text-xs font-bold text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              গ্যালারিতে ফিরুন
            </Link>
          }
        />
      </div>
    );
  }

  const isVideo = item.mediaType === 'video' || Boolean(item.videoUrl);
  const title = item.titleBn || item.title;

  return (
    <div className="space-y-7">
      <PageHeader
        breadcrumbs={[
          { label: 'ছবি ও ভিডিও গ্যালারি', to: '/gallery' },
          { label: title },
        ]}
        badge={GALLERY_CATEGORY_BN[item.category] || item.category}
        icon={isVideo ? <Video className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
        title={title}
        subtitle={item.caption || 'শাহ ইসলামিক স্কুল এন্ড কলেজ ক্যাম্পাস আর্কাইভ'}
        accent="emerald"
        rightSlot={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/15 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/25"
            >
              <Share2 className="h-3.5 w-3.5" />
              শেয়ার করুন
            </button>
            <Link
              to="/gallery"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#F4A62A] px-4 py-2 text-xs font-extrabold text-[#123B67] transition hover:bg-[#f7b547]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              সব গ্যালারি
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <div className="overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-xs">
            <div className="bg-[#0B1E30]">
              {isVideo ? (
                getYouTubeEmbedUrl(item.videoUrl, false) ? (
                  <iframe
                    src={getYouTubeEmbedUrl(item.videoUrl, false)!}
                    title={title}
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : item.videoUrl ? (
                  <video src={item.videoUrl} controls className="max-h-[540px] w-full" />
                ) : (
                  <img
                    src={item.imageUrl}
                    alt={title}
                    referrerPolicy="no-referrer"
                    className="max-h-[540px] w-full object-contain"
                  />
                )
              ) : (
                <img
                  src={item.imageUrl}
                  alt={title}
                  referrerPolicy="no-referrer"
                  className="max-h-[560px] w-full object-contain"
                />
              )}
            </div>

            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#EDF9F4] px-3 py-1 font-bold text-[#087F5B]">
                  <Tag className="h-3.5 w-3.5" />
                  {GALLERY_CATEGORY_BN[item.category] || item.category}
                </span>
                {item.eventDate && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFF8EA] px-3 py-1 font-bold text-[#A66300] tabular-nums">
                    <Calendar className="h-3.5 w-3.5" />
                    {toBnDigits(item.eventDate)}
                  </span>
                )}
              </div>

              <h2 className="mt-3 text-xl font-extrabold text-[#123B67]">{title}</h2>
              {item.caption && (
                <p className="mt-2.5 text-sm leading-relaxed text-[#263B35]">{item.caption}</p>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-5 lg:col-span-4">
          <div className="rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs">
            <h3 className="text-base font-extrabold text-[#123B67]">আরও ছবি ও ভিডিও</h3>
            <div className="mt-1.5 h-1 w-10 rounded-full bg-[#087F5B]" />
            <div className="mt-4 space-y-3">
              {related.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/gallery/${rel.id}`}
                  className="group flex items-center gap-3 rounded-xl border border-[#E8F1EC] bg-[#FAFDFB] p-2.5 transition hover:border-[#087F5B] hover:bg-[#EDF9F4]"
                >
                  <img
                    src={rel.imageUrl}
                    alt={rel.titleBn || rel.title}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="h-14 w-18 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-xs font-bold text-[#123B67] group-hover:text-[#087F5B]">
                      {rel.titleBn || rel.title}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-[#526B78]">
                      {GALLERY_CATEGORY_BN[rel.category] || rel.category}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
