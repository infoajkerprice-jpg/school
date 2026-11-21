import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Copy,
  FileCheck2,
  GraduationCap,
  Image as ImageIcon,
  MapPin,
  Newspaper,
  Phone,
  Play,
  Quote,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  Video,
  X,
} from 'lucide-react';
import { usePublicData } from '../../context/PublicDataContext';
import {
  GALLERY_CATEGORY_BN,
  isRecentDate,
  labelClass,
  NEWS_CATEGORY_BN,
  NOTICE_CATEGORY_BN,
  toBnDigits,
} from '../../i18n';
import { CAMPUS_IMAGES, type GalleryItem } from '../../types';
import {
  groupClassStages,
  resolveEducationMediums,
  resolveIslamicPrograms,
} from '../../lib/programDetails';
import { MobileCardSlider } from '../MobileCardSlider';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`;
  return (name.trim().slice(0, 2) || 'শি').toUpperCase();
}

function getHeroObjectPosition(imageUrl?: string): string {
  if (!imageUrl) return 'object-[center_40%]';
  if (imageUrl.includes('hero_sisc_gate_hd') || imageUrl.includes('image_f81b0478')) {
    return 'object-[center_42%]';
  }
  if (imageUrl.includes('hero_sisc_assembly_one_hd') || imageUrl.includes('image_700ee452')) {
    return 'object-[center_62%]';
  }
  if (imageUrl.includes('hero_sisc_campus_event_hd') || imageUrl.includes('image_38773109')) {
    return 'object-[center_42%]';
  }
  if (imageUrl.includes('hero_sisc_courtyard_hd') || imageUrl.includes('image_3200ce6a')) {
    return 'object-[center_46%]';
  }
  return 'object-center';
}

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : null;
}

function sanitizeTel(phone?: string): string {
  return (phone || '+8801711759705').replace(/[^\d+]/g, '');
}

const PARENT_TESTIMONIALS = [
  {
    name: 'মোঃ আব্দুল করিম মিয়া',
    relation: 'অভিভাবক · পঞ্চম শ্রেণি',
    quote:
      'আধুনিক সাধারণ শিক্ষার পাশাপাশি সহিহ কুরআন ও ইসলামিক আদব-কায়দার সমন্বয়ে আমার সন্তানের আচরণ ও পড়াশোনায় অসাধারণ উন্নতি দেখছি।',
    avatar: 'bg-[#087F5B] text-white',
  },
  {
    name: 'মোছাঃ রেহানা পারভীন',
    relation: 'অভিভাবক · তৃতীয় শ্রেণি',
    quote:
      'শিক্ষকমণ্ডলীর আন্তরিক তত্ত্বাবধান, নিরাপদ ক্যাম্পাস এবং নিয়মিত পরীক্ষার ফলাফল ও ডিজিটাল নোটিশ আমাদের ভীষণভাবে আশ্বস্ত করেছে।',
    avatar: 'bg-[#123B67] text-white',
  },
  {
    name: 'আলহাজ্ব মোঃ শফিকুল ইসলাম',
    relation: 'অভিভাবক · সপ্তম শ্রেণি',
    quote:
      'বাংলা, ইংরেজি ও আরবি—তিন ভাষার চমৎকার পাঠ্যক্রম ও শৃঙ্খলাপূর্ণ পরিবেশ গাইবান্ধায় সত্যিই অনন্য একটি শিক্ষাপ্রতিষ্ঠান তৈরি করেছে।',
    avatar: 'bg-[#21A9D6] text-white',
  },
];

const ADMISSION_STEPS = [
  {
    step: 'ধাপ ০১',
    title: 'অনলাইনে ভর্তি ফর্ম পূরণ',
    description:
      'শিক্ষার্থীর নাম, জন্ম তারিখ, কাঙ্ক্ষিত শ্রেণি, শিফট ও অভিভাবকের মোবাইল নম্বর সঠিকভাবে পূরণ করে আবেদন জমা দিন।',
    accentBorder: 'border-[#BFE3D2]',
    accentBar: 'bg-[#087F5B]',
    iconBg: 'bg-[#087F5B] text-white',
    icon: UserPlus,
  },
  {
    step: 'ধাপ ০২',
    title: 'তাৎক্ষণিক প্রবেশপত্র ডাউনলোড',
    description:
      'আবেদন জমা দেওয়ার সাথে সাথেই ইউনিক আবেদন নম্বরসহ ভর্তি পরীক্ষার প্রবেশপত্র পিডিএফ ডাউনলোড করে প্রিন্ট নিন।',
    accentBorder: 'border-[#C5DAF0]',
    accentBar: 'bg-[#123B67]',
    iconBg: 'bg-[#123B67] text-white',
    icon: FileCheck2,
  },
  {
    step: 'ধাপ ০৩',
    title: 'সাক্ষাৎকার ও ভর্তি নিশ্চিতকরণ',
    description:
      'নির্ধারিত তারিখে মূল্যায়ন ও সাক্ষাৎকারে অংশ নিয়ে নির্বাচিত হলে প্রয়োজনীয় কাগজপত্রসহ ভর্তি কার্যক্রম সম্পন্ন করুন।',
    accentBorder: 'border-[#F5D89F]',
    accentBar: 'bg-[#F4A62A]',
    iconBg: 'bg-[#F4A62A] text-[#123B67]',
    icon: ClipboardCheck,
  },
];

const NOTICE_FILTERS = [
  { key: 'All', label: 'সকল' },
  { key: 'Urgent', label: 'জরুরি' },
  { key: 'Admission', label: 'ভর্তি' },
  { key: 'Exam', label: 'পরীক্ষা' },
];

export const MobileHomeView: React.FC = () => {
  const {
    settings,
    slides,
    notices,
    news,
    faculty,
    achievements,
    publishedResults,
    gallery,
  } = usePublicData();

  const [noticeCategory, setNoticeCategory] = useState<string>('All');
  const [programTab, setProgramTab] = useState<'islamic' | 'mediums' | 'classes'>('islamic');
  const [principalExpanded, setPrincipalExpanded] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [lightboxState, setLightboxState] = useState<{
    items: GalleryItem[];
    index: number;
  } | null>(null);

  const lightboxTouchX = useRef<number | null>(null);

  const heroSlides = useMemo(() => {
    if (slides.length > 0) return slides;
    return [
      {
        id: 'default-hero',
        title: settings.schoolNameBn,
        subtitle: 'আধুনিক সাধারণ শিক্ষা ও ইসলামিক নৈতিক শিক্ষার অনন্য সমন্বয়',
        imageUrl: CAMPUS_IMAGES.hero,
        orderIndex: 0,
        isActive: true,
        authorUid: 'system',
      },
    ];
  }, [slides, settings.schoolNameBn]);

  const photoGallery = useMemo(
    () =>
      gallery
        .filter((g) => g.mediaType !== 'video' && !g.videoUrl)
        .slice(0, 8),
    [gallery]
  );

  const videoGallery = useMemo(
    () =>
      gallery
        .filter((g) => g.mediaType === 'video' || Boolean(g.videoUrl))
        .slice(0, 8),
    [gallery]
  );

  const activeLightboxItem: GalleryItem | null =
    lightboxState !== null ? lightboxState.items[lightboxState.index] ?? null : null;

  const filteredNotices = useMemo(
    () =>
      notices
        .filter((n) => noticeCategory === 'All' || n.category === noticeCategory)
        .slice(0, 6),
    [notices, noticeCategory]
  );

  const educationMediums = settings.educationMediums?.length
    ? settings.educationMediums
    : ['বাংলা ভার্সন', 'ইংরেজি ভার্সন', 'আরবি ভাষার সমন্বয়ে ট্রিলিংগুয়াল কারিকুলাম'];

  const specialPrograms = settings.specialPrograms?.length
    ? settings.specialPrograms
    : [
        'সহিহ কুরআন শিক্ষা',
        'হিফজুল কুরআন বিভাগ',
        'মাসনুন দোয়া শিক্ষা',
        'ইসলামিক আদব-কায়দা',
        'আরবি ভাষা শিক্ষা',
        'নৈতিক ও ধর্মীয় শিক্ষা',
      ];

  const shifts = settings.shifts?.length ? settings.shifts : ['মর্নিং শিফট', 'ডে শিফট'];
  const classList = settings.classList?.length
    ? settings.classList
    : [
        'প্লে গ্রুপ',
        'নার্সারি',
        'প্রথম শ্রেণি',
        'দ্বিতীয় শ্রেণি',
        'তৃতীয় শ্রেণি',
        'চতুর্থ শ্রেণি',
        'পঞ্চম শ্রেণি',
        'ষষ্ঠ শ্রেণি',
        'সপ্তম শ্রেণি',
        'অষ্টম শ্রেণি',
      ];

  const resolvedMediums = useMemo(
    () => resolveEducationMediums(educationMediums),
    [educationMediums]
  );
  const resolvedPrograms = useMemo(
    () => resolveIslamicPrograms(specialPrograms),
    [specialPrograms]
  );
  const resolvedClassStages = useMemo(() => groupClassStages(classList), [classList]);

  const quickAccessCards = [
    {
      to: '/admission',
      title: 'অনলাইন ভর্তি',
      sub: `প্লে – ${settings.highestClass || 'অষ্টম শ্রেণি'}`,
      icon: UserPlus,
      iconBg: 'bg-[#087F5B] text-white',
      cardBg: 'bg-gradient-to-br from-[#ECF9F3] to-white border-[#CBE9DC]',
    },
    {
      to: '/results',
      title: 'পরীক্ষার ফলাফল',
      sub: 'মার্কশিট ডাউনলোড',
      icon: Award,
      iconBg: 'bg-[#F4A62A] text-[#123B67]',
      cardBg: 'bg-gradient-to-br from-[#FFF8EA] to-white border-[#F8DFAF]',
    },
    {
      to: '/notices',
      title: 'নোটিশ বোর্ড',
      sub: `${toBnDigits(notices.length)}টি বিজ্ঞপ্তি`,
      icon: Bell,
      iconBg: 'bg-[#123B67] text-white',
      cardBg: 'bg-gradient-to-br from-[#EEF4FB] to-white border-[#CBDDF0]',
    },
    {
      to: '/faculty',
      title: 'শিক্ষক পরিচিতি',
      sub: `${toBnDigits(faculty.length || 12)}+ শিক্ষক`,
      icon: Users,
      iconBg: 'bg-[#21A9D6] text-white',
      cardBg: 'bg-gradient-to-br from-[#EAF8FD] to-white border-[#C0E7F5]',
    },
    {
      to: '/academic',
      title: 'একাডেমিক তথ্য',
      sub: 'রুটিন ও সিলেবাস',
      icon: BookOpen,
      iconBg: 'bg-[#087F5B] text-[#F4A62A]',
      cardBg: 'bg-gradient-to-br from-[#F0F9F5] to-white border-[#D0E8DC]',
    },
    {
      to: '/students',
      title: 'শিক্ষার্থী তথ্য',
      sub: 'কৃতি শিক্ষার্থী',
      icon: GraduationCap,
      iconBg: 'bg-[#123B67] text-[#21A9D6]',
      cardBg: 'bg-gradient-to-br from-[#F1F5FA] to-white border-[#D2DFEE]',
    },
  ];

  const statsTiles = [
    {
      value: `${toBnDigits(settings.totalClassesCount || classList.length || 10)}টি`,
      label: 'শ্রেণি কার্যক্রম',
      accent: 'text-[#087F5B]',
      bg: 'bg-[#ECF9F3]',
    },
    {
      value: `${toBnDigits(faculty.length || 12)}+`,
      label: 'অভিজ্ঞ শিক্ষক',
      accent: 'text-[#123B67]',
      bg: 'bg-[#EEF4FB]',
    },
    {
      value: `${toBnDigits(settings.passRatePercent || 100)}%`,
      label: 'পাসের হার',
      accent: 'text-[#B47009]',
      bg: 'bg-[#FFF8EA]',
    },
    {
      value: `${toBnDigits(publishedResults.length)}+`,
      label: 'অনলাইন ফলাফল',
      accent: 'text-[#0E7DA3]',
      bg: 'bg-[#EAF8FD]',
    },
  ];

  const telHref = `tel:${sanitizeTel(settings.phone)}`;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    settings.googleMapQuery || 'তুলসীঘাট, গাইবান্ধা সদর, গাইবান্ধা-৫৭০০'
  )}`;

  const handleCopyPhone = async () => {
    const phone = settings.phone || '+880 1711-759705';
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(true);
      window.setTimeout(() => setCopiedPhone(false), 2000);
    } catch {
      setCopiedPhone(false);
    }
  };

  const onLightboxTouchStart = (e: React.TouchEvent) => {
    lightboxTouchX.current = e.touches[0]?.clientX ?? null;
  };

  const onLightboxTouchEnd = (e: React.TouchEvent) => {
    if (lightboxTouchX.current === null || !lightboxState || lightboxState.items.length <= 1) {
      return;
    }
    const endX = e.changedTouches[0]?.clientX ?? lightboxTouchX.current;
    const delta = endX - lightboxTouchX.current;
    if (Math.abs(delta) > 40) {
      setLightboxState((cur) => {
        if (!cur) return null;
        const len = cur.items.length;
        const nextIdx = delta < 0 ? (cur.index + 1) % len : (cur.index - 1 + len) % len;
        return { ...cur, index: nextIdx };
      });
    }
    lightboxTouchX.current = null;
  };

  return (
    <div className="space-y-5">
      {/* ==================== 1. MOBILE HERO SINGLE-CARD AUTO SLIDER ==================== */}
      <section className="overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-[0_8px_28px_rgba(18,59,103,0.09)]">
        <div className="bg-[#123B67]">
          <MobileCardSlider
            items={heroSlides}
            getKey={(s) => s.id}
            ariaLabel="প্রতিষ্ঠানের প্রধান ব্যানার স্লাইডার"
            intervalMs={3000}
            transitionMs={500}
            showArrows={false}
            showDots={heroSlides.length > 1}
            showCounter={heroSlides.length > 1}
            dotTheme="light"
            controlsClassName="mt-0 bg-[#102E4F] px-3.5 py-2 border-t border-white/10"
            renderItem={(slide) => (
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#123B67]">
                <img
                  src={slide.imageUrl || CAMPUS_IMAGES.hero}
                  alt={slide.title || settings.schoolNameBn}
                  referrerPolicy="no-referrer"
                  className={`h-full w-full object-cover ${getHeroObjectPosition(slide.imageUrl)}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D2B4C]/92 via-[#123B67]/30 to-transparent" />

                {/* Top Admission Highlight */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#087F5B]/92 px-2.5 py-1 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
                    <Sparkles className="h-3 w-3 shrink-0 text-[#F4A62A]" />
                    <span className="truncate">
                      ভর্তি চলছে · স্থাপিত {toBnDigits(settings.establishedYear || '২০১৯')} খ্রি.
                    </span>
                  </span>
                </div>

                {/* Bottom Overlay Title */}
                <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
                  <h1 className="text-lg font-extrabold leading-snug tracking-tight text-white drop-shadow-xs sm:text-xl">
                    {settings.schoolNameBn}
                  </h1>
                  <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-[#F4A62A]">
                    {slide.subtitle || '“এসো শিখি দুনিয়া ও আখিরাতের কল্যাণে”'}
                  </p>
                </div>
              </div>
            )}
          />
        </div>

        {/* Highlight Info & Large Touch CTA Bar */}
        <div className="space-y-3 bg-white p-3.5">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-[#F5F9F7] px-3 py-2 text-[11px]">
            <div className="flex min-w-0 items-center gap-1.5 font-semibold text-[#123B67]">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#087F5B]" />
              <span className="truncate">
                প্লে গ্রুপ – {settings.highestClass || 'অষ্টম শ্রেণি'} · {shifts.join(' ও ')}
              </span>
            </div>
            <span className="shrink-0 rounded-md bg-[#F4A62A]/20 px-2 py-0.5 text-[10px] font-extrabold text-[#9A5B00]">
              নতুন সেশন
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Link
              to="/admission"
              className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl bg-[#087F5B] px-3 text-xs font-extrabold text-white shadow-sm transition active:scale-[0.98]"
            >
              <UserPlus className="h-4 w-4 shrink-0 text-[#F4A62A]" />
              <span>ভর্তি আবেদন</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
            <Link
              to="/results"
              className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl border border-[#123B67]/20 bg-[#EEF4FB] px-3 text-xs font-extrabold text-[#123B67] transition active:scale-[0.98]"
            >
              <Award className="h-4 w-4 shrink-0 text-[#21A9D6]" />
              <span>ফলাফল যাচাই</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== 2. গুরুত্বপূর্ণ ডিজিটাল সেবা (QUICK ACCESS GRID) ==================== */}
      <section aria-label="দ্রুত ডিজিটাল সেবা">
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <h2 className="text-[15px] font-extrabold text-[#123B67]">গুরুত্বপূর্ণ সেবা</h2>
          <span className="text-[11px] font-semibold text-[#087F5B]">সকল প্রয়োজনীয় মেনু</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {quickAccessCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.to}
                to={card.to}
                className={`flex min-h-[80px] items-center gap-2.5 rounded-2xl border p-3 shadow-[0_3px_12px_rgba(18,59,103,0.05)] transition active:scale-[0.98] ${card.cardBg}`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs ${card.iconBg}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-extrabold leading-tight text-[#123B67]">
                    {card.title}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] font-semibold text-[#526B78]">
                    {card.sub}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ==================== 3. গুরুত্বপূর্ণ নোটিশ (SINGLE CARD AUTO SLIDER) ==================== */}
      <section className="rounded-2xl border border-[#D8E7DF] bg-white p-3.5 shadow-[0_4px_16px_rgba(18,59,103,0.05)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#087F5B]/12 text-[#087F5B]">
              <Bell className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[15px] font-extrabold text-[#123B67]">গুরুত্বপূর্ণ নোটিশ</h2>
              <p className="text-[10.5px] font-semibold text-[#5A7380]">সর্বশেষ একাডেমিক বিজ্ঞপ্তি</p>
            </div>
          </div>
          <Link
            to="/notices"
            className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-[#F5F9F7] px-2.5 py-1.5 text-[11px] font-bold text-[#087F5B]"
          >
            সব দেখুন <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* 4-column balanced filter bar — zero overflow on 320px */}
        <div className="mt-3 grid grid-cols-4 gap-1.5 rounded-xl bg-[#F5F9F7] p-1">
          {NOTICE_FILTERS.map((f) => {
            const active = noticeCategory === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setNoticeCategory(f.key)}
                className={`min-h-[34px] rounded-lg px-1.5 text-[11px] font-extrabold transition ${
                  active
                    ? 'bg-[#087F5B] text-white shadow-2xs'
                    : 'text-[#45606E]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          {filteredNotices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D8E7DF] bg-[#F8FBF9] px-4 py-6 text-center text-xs font-medium text-[#617884]">
              এই বিভাগে কোনো নোটিশ পাওয়া যায়নি।
            </div>
          ) : (
            <MobileCardSlider
              items={filteredNotices}
              getKey={(n) => n.id}
              ariaLabel="গুরুত্বপূর্ণ নোটিশ স্লাইডার"
              intervalMs={3000}
              transitionMs={500}
              dotTheme="green"
              showCounter
              renderItem={(notice) => {
                const urgent = notice.category === 'Urgent';
                const recent = isRecentDate(notice.publishedDate);
                const previewText = notice.contentBn || notice.content || '';
                return (
                  <Link
                    to={`/notices/${notice.id}`}
                    className={`flex h-full min-h-[162px] flex-col justify-between rounded-2xl border p-4 transition active:scale-[0.99] ${
                      urgent
                        ? 'border-[#F5D89F] bg-gradient-to-br from-[#FFFDF7] to-white'
                        : 'border-[#DCEAE2] bg-[#FAFDFB]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                              urgent
                                ? 'bg-[#F4A62A]/25 text-[#9A5B00]'
                                : 'bg-[#087F5B]/12 text-[#087F5B]'
                            }`}
                          >
                            {urgent ? (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            ) : (
                              <Bell className="h-3.5 w-3.5" />
                            )}
                          </span>
                          <span
                            className={`truncate ${
                              urgent ? 'text-[#9A5B00]' : 'text-[#087F5B]'
                            }`}
                          >
                            {NOTICE_CATEGORY_BN[notice.category] || notice.category}
                          </span>
                          {recent && (
                            <span className="shrink-0 text-[10px] font-extrabold text-[#087F5B]">
                              · নতুন
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 text-[10.5px] font-semibold text-[#5A7380] tabular-nums">
                          {toBnDigits(notice.publishedDate)}
                        </span>
                      </div>

                      <h3 className="mt-2.5 line-clamp-2 text-[14.5px] font-extrabold leading-snug text-[#123B67]">
                        {notice.titleBn || notice.title}
                      </h3>
                      {previewText && (
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#4C6573]">
                          {previewText}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-[#E6F0EA] pt-2.5 text-xs font-extrabold text-[#087F5B]">
                      <span>সম্পূর্ণ নোটিশ পড়ুন</span>
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </div>
                  </Link>
                );
              }}
            />
          )}
        </div>
      </section>

      {/* ==================== 4. ভর্তি আবেদন প্রক্রিয়া (SINGLE CARD STEP SLIDER) ==================== */}
      <section aria-label="ভর্তি আবেদন প্রক্রিয়া">
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <div>
            <p className="text-[10px] font-extrabold text-[#087F5B]">অনলাইন ভর্তি গাইডলাইন</p>
            <h2 className="text-[15px] font-extrabold text-[#123B67]">ভর্তি আবেদন প্রক্রিয়া</h2>
          </div>
          <Link to="/admission" className="text-[11px] font-extrabold text-[#087F5B]">
            আবেদন করুন →
          </Link>
        </div>

        <MobileCardSlider
          items={ADMISSION_STEPS}
          getKey={(s) => s.step}
          ariaLabel="ভর্তি আবেদন প্রক্রিয়া স্লাইডার"
          intervalMs={3000}
          transitionMs={500}
          dotTheme="navy"
          renderItem={(step) => {
            const StepIcon = step.icon;
            return (
              <div
                className={`flex h-full min-h-[168px] flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-[0_4px_16px_rgba(18,59,103,0.06)] ${step.accentBorder}`}
              >
                <div className={`h-1.5 w-full ${step.accentBar}`} />
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs ${step.iconBg}`}
                      >
                        <StepIcon className="h-5 w-5" />
                      </span>
                      <span className="font-mono text-xs font-extrabold tracking-wide text-[#123B67]/75">
                        {step.step} / ০৩
                      </span>
                    </div>
                    <h3 className="mt-3 text-[15px] font-extrabold text-[#123B67]">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#46606E]">
                      {step.description}
                    </p>
                  </div>

                  <Link
                    to="/admission"
                    className="mt-3.5 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#F5F9F7] text-xs font-extrabold text-[#087F5B] ring-1 ring-[#087F5B]/20 transition active:scale-[0.98]"
                  >
                    <span>অনলাইন ভর্তি ফর্মে যান</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          }}
        />
      </section>

      {/* ==================== 5. প্রতিষ্ঠানের পরিচিতি ==================== */}
      <section className="overflow-hidden rounded-2xl border border-[#D8E7DF] bg-white shadow-[0_4px_16px_rgba(18,59,103,0.05)]">
        <div className="relative h-36 w-full overflow-hidden bg-[#123B67]">
          <img
            src={settings.aboutImageUrl || CAMPUS_IMAGES.courtyard}
            alt={settings.schoolNameBn}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#123B67]/88 via-[#123B67]/25 to-transparent" />
          <div className="absolute inset-x-3 bottom-2.5 flex items-end justify-between text-white">
            <div>
              <p className="text-[10px] font-bold text-[#F4A62A]">প্রতিষ্ঠানের পরিচিতি</p>
              <h2 className="text-[15px] font-extrabold leading-tight">
                {settings.aboutTitle || 'প্রতিষ্ঠান সম্পর্কে'}
              </h2>
            </div>
            <span className="rounded-lg bg-white/15 px-2 py-1 text-[10px] font-bold backdrop-blur-xs tabular-nums">
              স্থাপিত {toBnDigits(settings.establishedYear || '২০১৯')}
            </span>
          </div>
        </div>

        <div className="p-3.5">
          <p className="line-clamp-3 text-xs leading-relaxed text-[#3D5562]">
            {settings.aboutText}
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-[#F5F9F7] p-2.5 text-center">
            <div>
              <p className="text-xs font-extrabold text-[#087F5B] tabular-nums">
                {toBnDigits(settings.establishedYear || '২০১৯')}
              </p>
              <p className="text-[10px] font-semibold text-[#5A7380]">প্রতিষ্ঠাকাল</p>
            </div>
            <div className="border-x border-[#DCE8E1]">
              <p className="truncate text-xs font-extrabold text-[#123B67]">
                {settings.highestClass || 'অষ্টম শ্রেণি'}
              </p>
              <p className="text-[10px] font-semibold text-[#5A7380]">সর্বোচ্চ শ্রেণি</p>
            </div>
            <div>
              <p className="text-xs font-extrabold text-[#0E7DA3]">২ শিফট</p>
              <p className="text-[10px] font-semibold text-[#5A7380]">মর্নিং ও ডে</p>
            </div>
          </div>

          <Link
            to="/about"
            className="mt-3 flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#F5F9F7] text-xs font-extrabold text-[#087F5B] ring-1 ring-[#087F5B]/20 transition active:scale-[0.98]"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>প্রতিষ্ঠানের বিস্তারিত পড়ুন</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* ==================== 6. অধ্যক্ষের বাণী ==================== */}
      {settings.principalMessage?.trim() && (
        <section className="rounded-2xl border border-[#D8E7DF] bg-white p-3.5 shadow-[0_4px_16px_rgba(18,59,103,0.05)]">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              {settings.principalPhotoUrl?.trim() ? (
                <img
                  src={settings.principalPhotoUrl}
                  alt={settings.principalName || 'অধ্যক্ষ'}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 shrink-0 rounded-xl border border-[#087F5B]/25 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#087F5B] text-sm font-bold text-white">
                  {getInitials(settings.principalName || 'অধ্যক্ষ')}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold text-[#087F5B]">অধ্যক্ষের বাণী</p>
                <h2 className="truncate text-[14px] font-extrabold text-[#123B67]">
                  {settings.principalName || 'প্রতিষ্ঠান প্রধান'}
                </h2>
                <p className="truncate text-[10px] font-semibold text-[#5A7380]">
                  {settings.principalDesignation || 'অধ্যক্ষ'}
                </p>
              </div>
            </div>
            <Quote className="h-6 w-6 shrink-0 text-[#F4A62A]/60" />
          </div>

          <p
            className={`mt-2.5 rounded-xl bg-[#F5F9F7] p-3 text-xs leading-relaxed text-[#354E5A] ${
              principalExpanded ? '' : 'line-clamp-3'
            }`}
          >
            “{settings.principalMessage}”
          </p>

          <div className="mt-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPrincipalExpanded((v) => !v)}
              className="text-[11px] font-extrabold text-[#087F5B]"
            >
              {principalExpanded ? 'সংক্ষিপ্ত করুন' : 'সম্পূর্ণ বাণী পড়ুন'}
            </button>
            <Link to="/governing-body" className="text-[11px] font-bold text-[#123B67]">
              পরিচালনা পর্ষদ →
            </Link>
          </div>
        </section>
      )}

      {/* ==================== 7. প্রতিষ্ঠানের অর্জন ও শিক্ষার্থী পরিচিতি (SINGLE CARD SLIDER) ==================== */}
      <section aria-label="প্রতিষ্ঠানের অর্জন ও কৃতি শিক্ষার্থী">
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-[#F4A62A]" />
            <h2 className="text-[15px] font-extrabold text-[#123B67]">অর্জন ও কৃতি শিক্ষার্থী</h2>
          </div>
          <Link to="/students" className="text-[11px] font-extrabold text-[#087F5B]">
            সব দেখুন →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {statsTiles.map((s) => (
            <div
              key={s.label}
              className={`rounded-2xl border border-[#DDEBE3] p-3 text-center shadow-2xs ${s.bg}`}
            >
              <p className={`text-lg font-extrabold leading-none tabular-nums ${s.accent}`}>
                {s.value}
              </p>
              <p className="mt-1 text-[11px] font-bold text-[#38515E]">{s.label}</p>
            </div>
          ))}
        </div>

        {achievements.length > 0 && (
          <div className="mt-3">
            <MobileCardSlider
              items={achievements.slice(0, 8)}
              getKey={(item) => item.id}
              ariaLabel="কৃতি শিক্ষার্থী স্লাইডার"
              intervalMs={3000}
              transitionMs={500}
              dotTheme="orange"
              showCounter
              renderItem={(item) => (
                <Link
                  to={`/students/${item.id}`}
                  className="flex h-full min-h-[172px] flex-col justify-between rounded-2xl border border-[#D8E7DF] bg-white p-4 shadow-[0_4px_16px_rgba(18,59,103,0.06)] transition active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3.5">
                    {item.photoUrl ? (
                      <img
                        src={item.photoUrl}
                        alt={item.studentName}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-[#F4A62A]/45"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#087F5B]/12 text-lg font-extrabold text-[#087F5B] ring-2 ring-[#087F5B]/20">
                        {getInitials(item.studentName)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[15px] font-extrabold text-[#123B67]">
                        {item.studentName}
                      </h3>
                      <p className="mt-0.5 text-[11px] font-semibold text-[#526B78] tabular-nums">
                        {labelClass(item.className)} · রোল {toBnDigits(item.rollNumber)}
                        {item.academicYear ? ` · ${toBnDigits(item.academicYear)}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#F6DFB0] bg-[#FFF9EC] px-3 py-2.5 text-xs font-extrabold text-[#8A5100]">
                    <Award className="mt-0.5 h-4 w-4 shrink-0 text-[#D9880B]" />
                    <span className="line-clamp-2 leading-snug">{item.achievementTitle}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs font-extrabold text-[#087F5B]">
                    <span>বিস্তারিত সাফল্য দেখুন</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              )}
            />
          </div>
        )}
      </section>

      {/* ==================== 8. একাডেমিক কার্যক্রম (SINGLE CARD SLIDER PER TAB) ==================== */}
      <section className="rounded-2xl border border-[#D8E7DF] bg-white p-3.5 shadow-[0_4px_16px_rgba(18,59,103,0.05)]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-extrabold text-[#0E7DA3]">সমন্বিত পাঠ্যক্রম</p>
            <h2 className="text-[15px] font-extrabold text-[#123B67]">একাডেমিক কার্যক্রম</h2>
          </div>
          <Link
            to="/programs"
            className="shrink-0 rounded-lg bg-[#123B67] px-2.5 py-1.5 text-[11px] font-bold text-white"
          >
            বিস্তারিত →
          </Link>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-[#F5F9F7] p-1">
          {(
            [
              { id: 'islamic', label: 'ইসলামিক' },
              { id: 'mediums', label: 'শিক্ষা মাধ্যম' },
              { id: 'classes', label: 'শ্রেণি ও শিফট' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setProgramTab(t.id)}
              className={`min-h-[36px] rounded-lg px-1.5 text-[11px] font-extrabold transition ${
                programTab === t.id
                  ? 'bg-[#087F5B] text-white shadow-2xs'
                  : 'text-[#445F6D]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-3">
          {programTab === 'islamic' && (
            <MobileCardSlider
              items={resolvedPrograms}
              getKey={(prog) => prog.slug}
              ariaLabel="ইসলামিক শিক্ষা কার্যক্রম স্লাইডার"
              intervalMs={3000}
              transitionMs={500}
              dotTheme="green"
              renderItem={(prog, idx) => {
                const Icon = prog.icon;
                return (
                  <Link
                    to={`/programs?focus=${prog.slug}`}
                    className="flex h-full min-h-[178px] flex-col justify-between rounded-2xl border border-[#DCEAE2] bg-[#FAFDFB] p-4 transition active:scale-[0.99]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#087F5B] text-white shadow-xs">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="font-mono text-xs font-extrabold text-[#087F5B] tabular-nums">
                          কার্যক্রম {toBnDigits(String(idx + 1).padStart(2, '0'))}
                        </span>
                      </div>
                      <h3 className="mt-3 text-[15px] font-extrabold text-[#123B67]">
                        {prog.title}
                      </h3>
                      <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[#4C6573]">
                        {prog.shortDesc}
                      </p>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-[#E6F0EA] pt-2.5 text-xs font-extrabold text-[#087F5B]">
                      <span>পাঠ্যক্রম ও লক্ষ্য দেখুন</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                );
              }}
            />
          )}

          {programTab === 'mediums' && (
            <MobileCardSlider
              items={resolvedMediums}
              getKey={(m) => m.title}
              ariaLabel="শিক্ষার মাধ্যম স্লাইডার"
              intervalMs={3000}
              transitionMs={500}
              dotTheme="sky"
              renderItem={(m) => (
                <div className="flex h-full min-h-[192px] flex-col justify-between rounded-2xl border border-[#D4E6DD] bg-[#FAFDFB] p-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold text-[#087F5B]">
                        {m.subtitle}
                      </span>
                      <span className="font-mono text-xs font-extrabold text-[#123B67]/70 tabular-nums">
                        {m.indexBn}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-[15px] font-extrabold text-[#123B67]">{m.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#4C6573]">
                      {m.description}
                    </p>
                  </div>
                  {m.focusPoints.length > 0 && (
                    <ul className="mt-3 space-y-1.5 border-t border-[#E6F0EA] pt-2.5 text-[11.5px] font-semibold text-[#2E4954]">
                      {m.focusPoints.slice(0, 2).map((pt) => (
                        <li key={pt} className="flex items-start gap-1.5">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#087F5B]" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            />
          )}

          {programTab === 'classes' && (
            <div className="space-y-2.5">
              <MobileCardSlider
                items={resolvedClassStages}
                getKey={(s) => s.stage}
                ariaLabel="শ্রেণি ও স্তর স্লাইডার"
                intervalMs={3000}
                transitionMs={500}
                dotTheme="navy"
                renderItem={(stage) => (
                  <div className="flex h-full min-h-[146px] flex-col justify-between rounded-2xl border border-[#DCEAE2] bg-[#FAFDFB] p-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-[15px] font-extrabold text-[#123B67]">{stage.stage}</h3>
                        <span className="rounded-lg bg-[#087F5B]/12 px-2.5 py-0.5 text-[11px] font-extrabold text-[#087F5B]">
                          {stage.rangeLabel}
                        </span>
                      </div>
                      <p className="mt-2.5 text-xs font-bold leading-relaxed text-[#35515E]">
                        {stage.classes.join(' · ')}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 border-t border-[#E6F0EA] pt-2.5 text-[11px] font-bold text-[#123B67]">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-[#087F5B]" />
                      <span>শিফট: {shifts.join(' ও ')}</span>
                    </div>
                  </div>
                )}
              />
            </div>
          )}
        </div>
      </section>

      {/* ==================== 9. শিক্ষক পরিচিতি (SINGLE CARD PROFILE SLIDER) ==================== */}
      {faculty.length > 0 && (
        <section aria-label="শিক্ষক পরিচিতি">
          <div className="mb-2.5 flex items-center justify-between px-0.5">
            <div>
              <h2 className="text-[15px] font-extrabold text-[#123B67]">অভিজ্ঞ শিক্ষকমণ্ডলী</h2>
              <p className="text-[10.5px] font-semibold text-[#5A7380]">
                দক্ষ ও নিষ্ঠাবান শিক্ষকদের পরিচিতি
              </p>
            </div>
            <Link to="/faculty" className="text-[11px] font-extrabold text-[#087F5B]">
              সব দেখুন →
            </Link>
          </div>

          <MobileCardSlider
            items={faculty.slice(0, 10)}
            getKey={(t) => t.id}
            ariaLabel="শিক্ষক পরিচিতি স্লাইডার"
            intervalMs={3000}
            transitionMs={500}
            dotTheme="sky"
            showCounter
            renderItem={(teacher) => (
              <Link
                to={`/faculty/${teacher.id}`}
                className="flex h-full min-h-[178px] flex-col justify-between rounded-2xl border border-[#D8E7DF] bg-white p-4 shadow-[0_4px_16px_rgba(18,59,103,0.06)] transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5">
                  {teacher.photoUrl ? (
                    <img
                      src={teacher.photoUrl}
                      alt={teacher.nameBn || teacher.name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-[72px] w-[72px] shrink-0 rounded-2xl border-2 border-[#087F5B]/25 object-cover"
                    />
                  ) : (
                    <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-[#123B67] text-lg font-extrabold text-white">
                      {getInitials(teacher.nameBn || teacher.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-extrabold text-[#123B67]">
                      {teacher.nameBn || teacher.name}
                    </h3>
                    <p className="mt-0.5 truncate text-xs font-bold text-[#087F5B]">
                      {teacher.designation}
                    </p>
                    <p className="mt-1 truncate text-[11px] font-semibold text-[#526B78]">
                      {[teacher.department, teacher.subject].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>

                {(teacher.qualification || teacher.experienceYears) && (
                  <div className="mt-3 rounded-xl bg-[#F5F9F7] px-3 py-2 text-[11px] font-semibold text-[#3C5663]">
                    <span className="line-clamp-1">
                      {teacher.qualification ||
                        `অভিজ্ঞতা: ${toBnDigits(teacher.experienceYears)} বছর`}
                    </span>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-[#EDF4F0] pt-2.5 text-xs font-extrabold text-[#123B67]">
                  <span>পূর্ণাঙ্গ প্রোফাইল দেখুন</span>
                  <ArrowRight className="h-4 w-4 text-[#087F5B]" />
                </div>
              </Link>
            )}
          />
        </section>
      )}

      {/* ==================== 10. ইভেন্ট ও ক্যালেন্ডার (SINGLE CARD NEWS SLIDER) ==================== */}
      <section aria-label="ইভেন্ট ও ক্যালেন্ডার" className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <Newspaper className="h-4 w-4 text-[#21A9D6]" />
            <h2 className="text-[15px] font-extrabold text-[#123B67]">ইভেন্ট ও ক্যালেন্ডার</h2>
          </div>
          <Link to="/news" className="text-[11px] font-extrabold text-[#087F5B]">
            সব সংবাদ →
          </Link>
        </div>

        {/* Academic Calendar & Routine Shortcut Banner */}
        <Link
          to="/academic/calendar"
          className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#123B67] to-[#087F5B] p-3.5 text-white shadow-sm transition active:scale-[0.98]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4A62A] text-[#123B67]">
              <Calendar className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-extrabold">একাডেমিক ক্যালেন্ডার ও রুটিন</p>
              <p className="truncate text-[10.5px] text-sky-100/90">
                ক্লাস রুটিন, পরীক্ষার তারিখ ও সরকারি ছুটি
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-[#F4A62A]" />
        </Link>

        {news.length > 0 && (
          <MobileCardSlider
            items={news.slice(0, 6)}
            getKey={(item) => item.id}
            ariaLabel="ইভেন্ট ও সংবাদ স্লাইডার"
            intervalMs={3000}
            transitionMs={500}
            dotTheme="navy"
            renderItem={(item) => (
              <Link
                to={`/news/${item.id}`}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#D8E7DF] bg-white shadow-[0_4px_16px_rgba(18,59,103,0.06)] transition active:scale-[0.99]"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#EEF4FB]">
                  <img
                    src={item.imageUrl || CAMPUS_IMAGES.event}
                    alt={item.titleBn || item.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D2744]/75 via-transparent to-transparent" />
                  <div className="absolute inset-x-3 bottom-2.5 flex items-center justify-between gap-2 text-[11px] font-bold text-white">
                    <span className="rounded-md bg-[#123B67]/85 px-2 py-0.5 backdrop-blur-xs">
                      {NEWS_CATEGORY_BN[item.category] || item.category}
                    </span>
                    <span className="tabular-nums text-[#F4A62A]">
                      {toBnDigits(item.eventDate)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <h3 className="line-clamp-2 text-[14.5px] font-extrabold leading-snug text-[#123B67]">
                      {item.titleBn || item.title}
                    </h3>
                    {(item.summaryBn || item.summary) && (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#4C6573]">
                        {item.summaryBn || item.summary}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-[#EDF4F0] pt-2.5 text-xs font-extrabold text-[#087F5B]">
                    <span>বিস্তারিত সংবাদ পড়ুন</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            )}
          />
        )}
      </section>

      {/* ==================== 11. ফটো গ্যালারি (SINGLE LARGE PHOTO SLIDER) ==================== */}
      {photoGallery.length > 0 && (
        <section aria-label="ফটো গ্যালারি">
          <div className="mb-2.5 flex items-center justify-between px-0.5">
            <div className="flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-[#087F5B]" />
              <h2 className="text-[15px] font-extrabold text-[#123B67]">ফটো গ্যালারি</h2>
            </div>
            <Link to="/gallery" className="text-[11px] font-extrabold text-[#087F5B]">
              সব ছবি →
            </Link>
          </div>

          <MobileCardSlider
            items={photoGallery}
            getKey={(item) => item.id}
            ariaLabel="ফটো গ্যালারি স্লাইডার"
            intervalMs={3000}
            transitionMs={500}
            dotTheme="green"
            showCounter
            renderItem={(item, idx) => (
              <button
                type="button"
                onClick={() => setLightboxState({ items: photoGallery, index: idx })}
                className="group block w-full overflow-hidden rounded-2xl border border-[#D8E7DF] bg-white text-left shadow-[0_4px_16px_rgba(18,59,103,0.06)] transition active:scale-[0.99]"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#123B67]">
                  <img
                    src={item.imageUrl}
                    alt={item.titleBn || item.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#091E36]/85 via-[#091E36]/15 to-transparent" />
                  <div className="absolute inset-x-3.5 bottom-3 text-white">
                    <p className="text-[10.5px] font-bold text-[#F4A62A]">
                      {GALLERY_CATEGORY_BN[item.category] || item.category}
                      {item.eventDate ? ` · ${toBnDigits(item.eventDate)}` : ''}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm font-extrabold leading-snug text-white">
                      {item.titleBn || item.title}
                    </p>
                  </div>
                </div>
              </button>
            )}
          />
        </section>
      )}

      {/* ==================== 12. ভিডিও গ্যালারি (DEDICATED VIDEO CARD SLIDER) ==================== */}
      {videoGallery.length > 0 && (
        <section aria-label="ভিডিও গ্যালারি">
          <div className="mb-2.5 flex items-center justify-between px-0.5">
            <div className="flex items-center gap-1.5">
              <Video className="h-4 w-4 text-[#123B67]" />
              <h2 className="text-[15px] font-extrabold text-[#123B67]">ভিডিও গ্যালারি</h2>
            </div>
            <Link to="/gallery" className="text-[11px] font-extrabold text-[#087F5B]">
              সব ভিডিও →
            </Link>
          </div>

          <MobileCardSlider
            items={videoGallery}
            getKey={(item) => item.id}
            ariaLabel="ভিডিও গ্যালারি স্লাইডার"
            intervalMs={3000}
            transitionMs={500}
            dotTheme="orange"
            showCounter
            renderItem={(item, idx) => (
              <button
                type="button"
                onClick={() => setLightboxState({ items: videoGallery, index: idx })}
                className="group block w-full overflow-hidden rounded-2xl border border-[#D8E7DF] bg-white text-left shadow-[0_4px_16px_rgba(18,59,103,0.06)] transition active:scale-[0.99]"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-[#123B67]">
                  <img
                    src={item.imageUrl}
                    alt={item.titleBn || item.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[#091E36]/40" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F4A62A] text-[#123B67] shadow-lg ring-4 ring-white/30">
                      <Play className="ml-0.5 h-6 w-6 fill-current" />
                    </span>
                  </span>
                </div>
                <div className="p-3.5">
                  <p className="text-[10.5px] font-bold text-[#087F5B]">
                    ভিডিও · {GALLERY_CATEGORY_BN[item.category] || item.category}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm font-extrabold text-[#123B67]">
                    {item.titleBn || item.title}
                  </p>
                </div>
              </button>
            )}
          />
        </section>
      )}

      {/* ==================== 13. অভিভাবকদের মতামত (SINGLE CARD REVIEW SLIDER) ==================== */}
      <section aria-label="অভিভাবকদের মতামত">
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <h2 className="text-[15px] font-extrabold text-[#123B67]">অভিভাবকদের মতামত</h2>
          <span className="text-[10.5px] font-semibold text-[#5A7380]">আস্থা ও ভালোবাসা</span>
        </div>

        <MobileCardSlider
          items={PARENT_TESTIMONIALS}
          getKey={(t) => t.name}
          ariaLabel="অভিভাবকদের মতামত স্লাইডার"
          intervalMs={3000}
          transitionMs={500}
          dotTheme="green"
          renderItem={(t) => (
            <div className="flex h-full min-h-[188px] flex-col justify-between rounded-2xl border border-[#D8E7DF] bg-white p-4 shadow-[0_4px_16px_rgba(18,59,103,0.06)]">
              <div>
                <Quote className="h-6 w-6 text-[#F4A62A]" />
                <p className="mt-2 text-[13px] leading-relaxed text-[#2D4652]">“{t.quote}”</p>
              </div>
              <div className="mt-3.5 flex items-center gap-3 border-t border-[#EFF5F1] pt-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${t.avatar}`}
                >
                  {getInitials(t.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-extrabold text-[#123B67]">{t.name}</p>
                  <p className="truncate text-[11px] font-semibold text-[#5A7380]">{t.relation}</p>
                </div>
              </div>
            </div>
          )}
        />
      </section>

      {/* ==================== 14. যোগাযোগ (ONE-TAP ACTION CARD) ==================== */}
      <section className="rounded-2xl border border-[#D8E7DF] bg-white p-4 shadow-[0_4px_16px_rgba(18,59,103,0.06)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-[#087F5B]">ক্যাম্পাস যোগাযোগ</p>
            <h2 className="text-[15px] font-extrabold text-[#123B67]">
              সহযোগিতার জন্য যোগাযোগ করুন
            </h2>
          </div>
          <Link to="/contact" className="text-[11px] font-extrabold text-[#21A9D6]">
            বিস্তারিত →
          </Link>
        </div>

        <div className="mt-3 space-y-2 rounded-xl bg-[#F5F9F7] p-3 text-xs text-[#364F5C]">
          {settings.address && (
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#087F5B]" />
              <span className="font-semibold">{settings.address}</span>
            </p>
          )}
          {settings.phone && (
            <p className="flex items-center gap-2 font-extrabold text-[#123B67]">
              <Phone className="h-4 w-4 shrink-0 text-[#21A9D6]" />
              <span>{settings.phone}</span>
            </p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <a
            href={telHref}
            className="flex min-h-[44px] items-center justify-center gap-1 rounded-xl bg-[#087F5B] px-2 text-xs font-extrabold text-white shadow-xs transition active:scale-[0.98]"
          >
            <Phone className="h-3.5 w-3.5" />
            <span>কল করুন</span>
          </a>
          <button
            type="button"
            onClick={handleCopyPhone}
            className="flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-[#D8E7DF] bg-[#F5F9F7] px-2 text-xs font-extrabold text-[#123B67] transition active:scale-[0.98]"
          >
            {copiedPhone ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#087F5B]" />
                <span className="text-[#087F5B]">কপি হয়েছে</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[#21A9D6]" />
                <span>নম্বর কপি</span>
              </>
            )}
          </button>
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[44px] items-center justify-center gap-1 rounded-xl bg-[#123B67] px-2 text-xs font-extrabold text-white shadow-xs transition active:scale-[0.98]"
          >
            <MapPin className="h-3.5 w-3.5 text-[#F4A62A]" />
            <span>ম্যাপ</span>
          </a>
        </div>
      </section>

      {/* ==================== SWIPEABLE MOBILE GALLERY LIGHTBOX ==================== */}
      {activeLightboxItem && lightboxState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#091826]/92 p-3 backdrop-blur-xs"
          onClick={() => setLightboxState(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onLightboxTouchStart}
            onTouchEnd={onLightboxTouchEnd}
          >
            <div className="flex items-center justify-between border-b border-[#E5EFE9] px-3.5 py-2.5">
              <div className="min-w-0 pr-2">
                <p className="truncate text-xs font-extrabold text-[#123B67]">
                  {activeLightboxItem.titleBn || activeLightboxItem.title}
                </p>
                <p className="text-[10px] font-semibold text-[#5A7380]">
                  {GALLERY_CATEGORY_BN[activeLightboxItem.category] || activeLightboxItem.category}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxState(null)}
                aria-label="বন্ধ করুন"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F5F9F7] text-[#123B67]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative bg-black">
              {(activeLightboxItem.mediaType === 'video' || Boolean(activeLightboxItem.videoUrl)) &&
              getYouTubeEmbedUrl(activeLightboxItem.videoUrl) ? (
                <div className="aspect-video w-full">
                  <iframe
                    src={getYouTubeEmbedUrl(activeLightboxItem.videoUrl) ?? ''}
                    title={activeLightboxItem.titleBn || activeLightboxItem.title}
                    className="h-full w-full"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                  />
                </div>
              ) : (
                <img
                  src={activeLightboxItem.imageUrl}
                  alt={activeLightboxItem.titleBn || activeLightboxItem.title}
                  referrerPolicy="no-referrer"
                  className="max-h-[65vh] w-full object-contain"
                />
              )}

              {lightboxState.items.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxState((cur) => {
                        if (!cur) return null;
                        const len = cur.items.length;
                        return { ...cur, index: (cur.index - 1 + len) % len };
                      })
                    }
                    aria-label="পূর্ববর্তী"
                    className="absolute top-1/2 left-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxState((cur) => {
                        if (!cur) return null;
                        const len = cur.items.length;
                        return { ...cur, index: (cur.index + 1) % len };
                      })
                    }
                    aria-label="পরবর্তী"
                    className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center justify-between bg-white px-3.5 py-2.5 text-xs">
              <span className="truncate text-[#496270]">
                {activeLightboxItem.caption || 'বাম/ডানে স্লাইড করুন'}
              </span>
              <Link
                to="/gallery"
                onClick={() => setLightboxState(null)}
                className="ml-2 shrink-0 font-extrabold text-[#087F5B]"
              >
                গ্যালারি →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
