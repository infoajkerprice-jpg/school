import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  GraduationCap,
  Image as ImageIcon,
  Languages,
  Link2,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  Play,
  Quote,
  Search,
  Sparkles,
  Star,
  Target,
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
  toBnDigits,
} from '../../i18n';
import { CAMPUS_IMAGES, type GalleryItem } from '../../types';
import {
  groupClassStages,
  resolveEducationMediums,
  resolveIslamicPrograms,
} from '../../lib/programDetails';
import { HomeSkeleton } from '../SkeletonLoader';

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
    return 'object-[center_65%]';
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
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : null;
}

const AnimatedCounter: React.FC<{ target: number; suffix?: string }> = ({ target, suffix = '' }) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const safeTarget = Math.max(0, Math.round(target));
    if (safeTarget === 0) {
      setValue(0);
      return;
    }
    let rafId = 0;
    const duration = 900;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(safeTarget * eased));
      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [target]);

  return (
    <span className="tabular-nums">
      {toBnDigits(value)}
      {suffix}
    </span>
  );
};

const FEATURE_ACCENTS = [
  {
    card: 'from-[#E9F7F1] via-white to-white border-[#CBE9DC] hover:border-[#087F5B]',
    icon: 'bg-[#087F5B] text-white shadow-[#087F5B]/25',
    title: 'text-[#123B67] group-hover:text-[#087F5B]',
  },
  {
    card: 'from-[#EAF2FA] via-white to-white border-[#CBDDF0] hover:border-[#123B67]',
    icon: 'bg-[#123B67] text-white shadow-[#123B67]/25',
    title: 'text-[#123B67]',
  },
  {
    card: 'from-[#FEF5E4] via-white to-white border-[#F9DFB0] hover:border-[#F4A62A]',
    icon: 'bg-[#F4A62A] text-[#123B67] shadow-[#F4A62A]/25',
    title: 'text-[#123B67] group-hover:text-[#B47009]',
  },
  {
    card: 'from-[#E7F7FC] via-white to-white border-[#C2E9F6] hover:border-[#21A9D6]',
    icon: 'bg-[#21A9D6] text-white shadow-[#21A9D6]/25',
    title: 'text-[#123B67] group-hover:text-[#0E7DA3]',
  },
  {
    card: 'from-[#F3EEFC] via-white to-white border-[#DDD0F7] hover:border-[#805AD5]',
    icon: 'bg-[#805AD5] text-white shadow-[#805AD5]/25',
    title: 'text-[#123B67] group-hover:text-[#805AD5]',
  },
  {
    card: 'from-[#E9F7F1] via-white to-white border-[#CBE9DC] hover:border-[#087F5B]',
    icon: 'bg-[#087F5B] text-[#F4A62A] shadow-[#087F5B]/25',
    title: 'text-[#123B67] group-hover:text-[#087F5B]',
  },
] as const;

const PROGRAM_CARD_THEMES = [
  {
    bg: 'bg-gradient-to-br from-[#EDF9F4] to-white border-[#C5E8D8] hover:border-[#087F5B]',
    icon: 'bg-[#087F5B] text-white',
    badge: 'text-[#087F5B]',
    arrow: 'text-[#087F5B]',
  },
  {
    bg: 'bg-gradient-to-br from-[#EDF4FB] to-white border-[#C8DDF2] hover:border-[#123B67]',
    icon: 'bg-[#123B67] text-white',
    badge: 'text-[#123B67]',
    arrow: 'text-[#123B67]',
  },
  {
    bg: 'bg-gradient-to-br from-[#FFF8EA] to-white border-[#F8DFAF] hover:border-[#F4A62A]',
    icon: 'bg-[#F4A62A] text-[#123B67]',
    badge: 'text-[#A66300]',
    arrow: 'text-[#C27803]',
  },
  {
    bg: 'bg-gradient-to-br from-[#EBF8FD] to-white border-[#BFE8F7] hover:border-[#21A9D6]',
    icon: 'bg-[#21A9D6] text-white',
    badge: 'text-[#0E7DA3]',
    arrow: 'text-[#0E7DA3]',
  },
  {
    bg: 'bg-gradient-to-br from-[#F4EFFC] to-white border-[#DDD0F7] hover:border-[#805AD5]',
    icon: 'bg-[#805AD5] text-white',
    badge: 'text-[#6B46C1]',
    arrow: 'text-[#805AD5]',
  },
] as const;

const PARENT_TESTIMONIALS = [
  {
    name: 'মোঃ আব্দুল করিম মিয়া',
    relation: 'অভিভাবক · পঞ্চম শ্রেণি',
    quote:
      'আধুনিক সাধারণ শিক্ষার পাশাপাশি সহিহ কুরআন ও ইসলামিক আদব-কায়দার সমন্বয়ে আমার সন্তানের আচরণ ও পড়াশোনায় অসাধারণ উন্নতি দেখছি।',
    accent: 'border-[#CBE9DC] bg-gradient-to-br from-[#EDF9F4] to-white',
    avatar: 'bg-[#087F5B] text-white',
  },
  {
    name: 'মোছাঃ রেহানা পারভীন',
    relation: 'অভিভাবক · তৃতীয় শ্রেণি',
    quote:
      'শিক্ষকমণ্ডলীর আন্তরিক তত্ত্বাবধান, নিরাপদ ক্যাম্পাস এবং নিয়মিত পরীক্ষার ফলাফল ও ডিজিটাল নোটিশ আমাদের ভীষণভাবে আশ্বস্ত করেছে।',
    accent: 'border-[#DDD0F7] bg-gradient-to-br from-[#F4EFFC] to-white',
    avatar: 'bg-[#805AD5] text-white',
  },
  {
    name: 'আলহাজ্ব মোঃ শফিকুল ইসলাম',
    relation: 'অভিভাবক · সপ্তম শ্রেণি',
    quote:
      'বাংলা, ইংরেজি ও আরবি—তিন ভাষার চমৎকার পাঠ্যক্রম ও শৃঙ্খলাপূর্ণ পরিবেশ গাইবান্ধায় সত্যিই অনন্য একটি শিক্ষাপ্রতিষ্ঠান তৈরি করেছে।',
    accent: 'border-[#C2E9F6] bg-gradient-to-br from-[#EBF8FD] to-white',
    avatar: 'bg-[#21A9D6] text-white',
  },
];

export const HomePage: React.FC = () => {
  const {
    settings,
    slides,
    notices,
    news,
    faculty,
    governingBody,
    importantLinks,
    achievements,
    publishedResults,
    gallery,
    isLoading,
  } = usePublicData();

  const [slideIndex, setSlideIndex] = useState(0);
  const [noticeCategory, setNoticeCategory] = useState<string>('All');
  const [programTab, setProgramTab] = useState<'islamic' | 'mediums' | 'classes'>('islamic');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const homeGallery = useMemo(() => gallery.slice(0, 6), [gallery]);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowRight') {
        setLightboxIdx((cur) => (cur === null ? null : (cur + 1) % homeGallery.length));
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIdx((cur) =>
          cur === null ? null : (cur - 1 + homeGallery.length) % homeGallery.length
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, homeGallery.length]);

  const currentSlide = slides[slideIndex % slides.length] ?? slides[0];

  const filteredSidebarNotices = useMemo(
    () => notices.filter((n) => noticeCategory === 'All' || n.category === noticeCategory),
    [notices, noticeCategory]
  );

  const directorsWithSpeech = useMemo(
    () => governingBody.filter((m) => m.speech && m.speech.trim().length > 0),
    [governingBody]
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

  const resolvedMediums = useMemo(() => resolveEducationMediums(educationMediums), [educationMediums]);
  const resolvedPrograms = useMemo(() => resolveIslamicPrograms(specialPrograms), [specialPrograms]);
  const resolvedClassStages = useMemo(() => groupClassStages(classList), [classList]);

  const animatedStats = useMemo(
    () => [
      {
        label: 'মোট শ্রেণি কার্যক্রম',
        value: settings.totalClassesCount || classList.length || 10,
        suffix: 'টি',
        sub: `প্লে গ্রুপ – ${settings.highestClass || 'অষ্টম শ্রেণি'}`,
        icon: GraduationCap,
        color: 'from-[#087F5B] to-[#0A9D71]',
        bg: 'border-[#CBE9DC] bg-white',
      },
      {
        label: 'অভিজ্ঞ শিক্ষকমণ্ডলী',
        value: faculty.length || 12,
        suffix: '+',
        sub: 'বিষয়ভিত্তিক ও হিফজ শিক্ষক',
        icon: Users,
        color: 'from-[#123B67] to-[#1D528C]',
        bg: 'border-[#CBDDF0] bg-white',
      },
      {
        label: 'পাসের হার ও সাফল্য',
        value: settings.passRatePercent || 100,
        suffix: '%',
        sub: 'মানসম্মত একাডেমিক ফলাফল',
        icon: Trophy,
        color: 'from-[#F4A62A] to-[#E08B0E]',
        bg: 'border-[#F9DFB0] bg-white',
      },
      {
        label: 'প্রকাশিত ফলাফল',
        value: publishedResults.length,
        suffix: '+',
        sub: 'অনলাইন মার্কশিট সিস্টেম',
        icon: Award,
        color: 'from-[#21A9D6] to-[#0E7DA3]',
        bg: 'border-[#C2E9F6] bg-white',
      },
      {
        label: 'বিশেষ ইসলামিক বিভাগ',
        value: resolvedPrograms.length,
        suffix: 'টি',
        sub: 'কুরআন, হিফজ ও নৈতিক শিক্ষা',
        icon: Sparkles,
        color: 'from-[#805AD5] to-[#6B46C1]',
        bg: 'border-[#DDD0F7] bg-white',
      },
    ],
    [
      settings.totalClassesCount,
      settings.highestClass,
      settings.passRatePercent,
      classList.length,
      faculty.length,
      publishedResults.length,
      resolvedPrograms.length,
    ]
  );

  const quickFeatureCards = [
    {
      to: '/admission',
      title: 'অনলাইন ভর্তি আবেদন',
      desc: `প্লে গ্রুপ – ${settings.highestClass || 'অষ্টম শ্রেণি'}`,
      icon: UserPlus,
    },
    {
      to: '/programs',
      title: 'আধুনিক ও ইসলামিক শিক্ষা',
      desc: 'ট্রিলিংগুয়াল ও হিফজ বিভাগ',
      icon: BookOpen,
    },
    {
      to: '/results',
      title: 'পরীক্ষার ফলাফল যাচাই',
      desc: 'মার্কশিট পিডিএফ ডাউনলোড',
      icon: Search,
    },
    {
      to: '/academic/class-routine',
      title: 'ক্লাস ও পরীক্ষার রুটিন',
      desc: 'সিলেবাস ও ক্যালেন্ডার',
      icon: Calendar,
    },
    {
      to: '/faculty',
      title: 'শিক্ষকমণ্ডলী পরিচিতি',
      desc: 'অভিজ্ঞ শিক্ষক ও বিভাগ',
      icon: Users,
    },
    {
      to: '/students',
      title: 'শিক্ষার্থী ও অর্জন',
      desc: 'কৃতি শিক্ষার্থী ও সাফল্য',
      icon: Award,
    },
  ];

  const activeLightboxItem: GalleryItem | null =
    lightboxIdx !== null ? homeGallery[lightboxIdx] ?? null : null;

  const mapQuery = encodeURIComponent(
    settings.googleMapQuery || 'তুলসীঘাট, গাইবান্ধা সদর, গাইবান্ধা-৫৭০০'
  );

  if (isLoading) {
    return <HomeSkeleton />;
  }

  return (
    <div className="space-y-7 sm:space-y-8">
      {/* ==================== 1. MODERN PREMIUM HERO SLIDER ==================== */}
      <section className="relative overflow-hidden rounded-2xl border border-[#CBE0D6] bg-[#123B67] shadow-md">
        <div className="relative h-[300px] w-full sm:h-[385px] lg:h-[460px]">
          <img
            src={currentSlide?.imageUrl || CAMPUS_IMAGES.hero}
            alt={currentSlide?.title || settings.schoolNameBn}
            referrerPolicy="no-referrer"
            className={`h-full w-full object-cover ${getHeroObjectPosition(currentSlide?.imageUrl)} transition-all duration-700`}
          />

          {/* Balanced Contrast Scrim for Crisp Headline & CTA Legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B233E]/92 via-[#123B67]/45 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B233E]/85 via-[#0B233E]/35 to-transparent" />

          {/* Hero Institution Lockup, Slogan & Admission CTA */}
          <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 lg:p-11">
            <div className="max-w-2xl">
              <div className="inline-flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#F4A62A] sm:text-xs">
                <span className="inline-flex items-center gap-1 rounded-md bg-white/12 px-2.5 py-1 text-white backdrop-blur-xs">
                  <MapPin className="h-3.5 w-3.5 text-[#F4A62A]" />
                  তুলসীঘাট, গাইবান্ধা সদর
                </span>
                <span className="rounded-md bg-[#087F5B]/85 px-2.5 py-1 text-white backdrop-blur-xs">
                  স্থাপিত: {toBnDigits(settings.establishedYear || '২০১৯')} খ্রি.
                </span>
              </div>

              <h1 className="mt-2.5 text-2xl font-extrabold leading-tight tracking-tight text-white drop-shadow-xs sm:text-4xl lg:text-[42px] [text-wrap:balance]">
                {settings.schoolNameBn}
              </h1>

              <p className="mt-1.5 text-sm font-semibold text-[#F4A62A] sm:text-base lg:text-lg">
                “এসো শিখি দুনিয়া ও আখিরাতের কল্যাণে”
              </p>

              <p className="mt-1.5 hidden max-w-xl text-xs leading-relaxed text-sky-100/95 sm:block sm:text-sm">
                {currentSlide?.subtitle || settings.schoolSubtitleBn}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:mt-5 sm:gap-3">
                <Link
                  to="/admission"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#F4A62A] px-5 py-2.5 text-xs font-extrabold text-[#123B67] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#f7b547] sm:px-6 sm:text-sm"
                >
                  <UserPlus className="h-4 w-4 shrink-0" />
                  <span>ভর্তি আবেদন করুন</span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>

                <Link
                  to="/about"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/35 bg-white/12 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-xs transition hover:bg-white/22 sm:px-5 sm:text-sm"
                >
                  <span>প্রতিষ্ঠান পরিচিতি</span>
                </Link>

                <Link
                  to="/results"
                  className="hidden min-h-[44px] items-center gap-1.5 rounded-xl border border-[#21A9D6]/50 bg-[#21A9D6]/20 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-xs transition hover:bg-[#21A9D6]/35 sm:inline-flex sm:text-sm"
                >
                  <Search className="h-4 w-4 shrink-0 text-[#21A9D6]" />
                  <span>ফলাফল যাচাই</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Slider Arrows & Dots */}
          {slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setSlideIndex((prev) => (prev - 1 + slides.length) % slides.length)}
                aria-label="পূর্ববর্তী ছবি"
                className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#123B67]/55 text-white backdrop-blur-xs transition hover:bg-[#087F5B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-4 sm:h-10 sm:w-10"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setSlideIndex((prev) => (prev + 1) % slides.length)}
                aria-label="পরবর্তী ছবি"
                className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#123B67]/55 text-white backdrop-blur-xs transition hover:bg-[#087F5B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-4 sm:h-10 sm:w-10"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="absolute right-5 bottom-4 flex items-center gap-1.5 sm:right-8 sm:bottom-6">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSlideIndex(idx)}
                    aria-label={`স্লাইড ${toBnDigits(idx + 1)}`}
                    className={`h-2 rounded-full shadow-xs transition-all ${
                      idx === slideIndex % slides.length
                        ? 'w-7 bg-[#F4A62A]'
                        : 'w-2 bg-white/55 hover:bg-white/90'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ==================== 2. ANIMATED STATISTICS COUNTER ==================== */}
      <section aria-label="প্রতিষ্ঠানের পরিসংখ্যান">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {animatedStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`group flex items-center gap-3 rounded-2xl border p-4 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${stat.bg}`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${stat.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-extrabold leading-none text-[#123B67] sm:text-2xl">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="mt-1 truncate text-xs font-bold text-[#263B35]">{stat.label}</p>
                  <p className="truncate text-[10px] font-medium text-[#5A7380]">{stat.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ==================== 3. COLORFUL QUICK FEATURE CARDS ==================== */}
      <section aria-label="দ্রুত সেবা">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quickFeatureCards.map((card, idx) => {
            const Icon = card.icon;
            const theme = FEATURE_ACCENTS[idx % FEATURE_ACCENTS.length];
            return (
              <Link
                key={card.to}
                to={card.to}
                className={`group flex flex-col justify-between rounded-2xl border bg-gradient-to-b p-4 shadow-xs transition duration-200 hover:-translate-y-1 hover:shadow-md ${theme.card}`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105 ${theme.icon}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-3">
                  <h2 className={`text-xs font-bold leading-snug sm:text-[13px] ${theme.title}`}>
                    {card.title}
                  </h2>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#536B78]">{card.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ==================== 4. MAIN 2-COLUMN EDITORIAL GRID ==================== */}
      <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-12">
        {/* LEFT COLUMN (8 cols) */}
        <div className="space-y-8 lg:col-span-8">
          {/* 4A. প্রতিষ্ঠান পরিচিতি */}
          <section className="overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-xs">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#087F5B] via-[#21A9D6] via-[#805AD5] to-[#F4A62A]" />
            <div className="grid grid-cols-1 items-center gap-6 p-5 sm:p-7 md:grid-cols-12">
              <div className="md:col-span-5">
                <div className="group relative overflow-hidden rounded-xl border border-[#DCE8E1] shadow-sm">
                  <img
                    src={settings.aboutImageUrl || CAMPUS_IMAGES.courtyard}
                    alt={settings.schoolNameBn}
                    className="h-60 w-full object-cover transition duration-500 group-hover:scale-105 md:h-72"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#123B67]/90 to-transparent p-3.5 text-white">
                    <p className="text-[11px] font-semibold text-[#F4A62A]">মনোরম ক্যাম্পাস পরিবেশ</p>
                    <p className="text-xs font-bold">{settings.schoolNameBn}</p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-7">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#087F5B]">
                  <GraduationCap className="h-4 w-4 text-[#F4A62A]" />
                  <span>{settings.schoolNameEn || 'Shah Islamic School And College'}</span>
                </div>
                <h2 className="mt-1 text-xl font-extrabold text-[#123B67] sm:text-2xl">
                  {settings.aboutTitle || 'প্রতিষ্ঠান সম্পর্কে'}
                </h2>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="h-1 w-12 rounded-full bg-[#087F5B]" />
                  <span className="h-1 w-4 rounded-full bg-[#F4A62A]" />
                  <span className="h-1 w-3 rounded-full bg-[#21A9D6]" />
                  <span className="h-1 w-2 rounded-full bg-[#805AD5]" />
                </div>

                <p className="mt-4 text-sm leading-relaxed text-[#38515E]">
                  {settings.aboutText}
                </p>

                <div className="mt-5 grid grid-cols-3 gap-2.5 border-y border-[#E7F1EC] py-3.5 text-center">
                  <div>
                    <p className="text-base font-extrabold text-[#087F5B] tabular-nums">
                      {toBnDigits(settings.establishedYear || '২০১৯')}
                    </p>
                    <p className="text-[11px] font-medium text-[#546E7A]">প্রতিষ্ঠাকাল</p>
                  </div>
                  <div className="border-x border-[#E7F1EC]">
                    <p className="text-sm font-extrabold text-[#123B67] sm:text-base">
                      {settings.highestClass || 'অষ্টম শ্রেণি'}
                    </p>
                    <p className="text-[11px] font-medium text-[#546E7A]">সর্বোচ্চ শ্রেণি</p>
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-[#805AD5] sm:text-base">২ শিফট</p>
                    <p className="text-[11px] font-medium text-[#546E7A]">মর্নিং ও ডে</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  <Link
                    to="/about"
                    className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-[#087F5B] px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] sm:text-sm"
                  >
                    <span>বিস্তারিত পড়ুন</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/admission"
                    className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-[#123B67]/20 bg-[#F2F8F5] px-4 py-2 text-xs font-bold text-[#123B67] transition hover:bg-[#123B67] hover:text-white sm:text-sm"
                  >
                    <span>ভর্তি তথ্য জানুন</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* 4B. আধুনিক ও ইসলামিক শিক্ষা কার্যক্রম */}
          <section className="overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-xs">
            <div className="border-b border-[#E8F1EC] bg-gradient-to-r from-[#F2F8F5] via-white to-[#F4EFFC] p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0E7DA3]">
                    <Sparkles className="h-3.5 w-3.5 text-[#F4A62A]" />
                    <span>সমন্বিত পাঠ্যক্রম · প্লে গ্রুপ থেকে {settings.highestClass || 'অষ্টম শ্রেণি'}</span>
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-[#123B67] sm:text-2xl">
                    আধুনিক ও ইসলামিক শিক্ষা কার্যক্রম
                  </h2>
                </div>
                <Link
                  to="/programs"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#123B67] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#087F5B] whitespace-nowrap shrink-0"
                >
                  বিস্তারিত পেজ দেখুন
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div
                role="tablist"
                aria-label="শিক্ষা কার্যক্রম বিভাগ"
                className="mt-5 inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-xl border border-[#DCE8E1] bg-white p-1 shadow-2xs"
              >
                {(
                  [
                    { id: 'islamic', label: `ইসলামিক কার্যক্রম (${toBnDigits(resolvedPrograms.length)})` },
                    { id: 'mediums', label: 'শিক্ষার মাধ্যম' },
                    { id: 'classes', label: 'শ্রেণি ও শিফট' },
                  ] as const
                ).map((tab) => {
                  const active = programTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setProgramTab(tab.id)}
                      className={`rounded-lg px-3.5 py-2 text-xs font-bold transition duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F5B] ${
                        active
                          ? 'bg-[#087F5B] text-white shadow-xs'
                          : 'text-[#395260] hover:bg-[#F2F8F5] hover:text-[#123B67]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {programTab === 'islamic' && (
              <div role="tabpanel" className="grid grid-cols-1 gap-3.5 p-5 sm:grid-cols-2 sm:p-6">
                {resolvedPrograms.map((prog, idx) => {
                  const Icon = prog.icon;
                  const theme = PROGRAM_CARD_THEMES[idx % PROGRAM_CARD_THEMES.length];
                  return (
                    <Link
                      key={prog.slug}
                      to={`/programs?focus=${prog.slug}`}
                      className={`group flex items-start gap-3.5 rounded-xl border p-4 shadow-2xs transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${theme.bg}`}
                    >
                      <span
                        className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform duration-200 group-hover:scale-105 ${theme.icon}`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-mono text-[11px] font-bold tabular-nums ${theme.badge}`}>
                            বিষয় {toBnDigits(String(idx + 1).padStart(2, '0'))}
                          </span>
                          <ArrowRight
                            className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 ${theme.arrow}`}
                          />
                        </div>
                        <h3 className="mt-0.5 text-sm font-bold text-[#123B67]">{prog.title}</h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#47606D]">
                          {prog.shortDesc}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {programTab === 'mediums' && (
              <div role="tabpanel" className="grid grid-cols-1 gap-4 p-5 sm:p-6 md:grid-cols-3">
                {resolvedMediums.map((m, idx) => {
                  const theme = PROGRAM_CARD_THEMES[idx % PROGRAM_CARD_THEMES.length];
                  return (
                    <div
                      key={m.title}
                      className={`flex flex-col justify-between rounded-xl border p-5 shadow-2xs ${theme.bg}`}
                    >
                      <div>
                        <span className={`font-mono text-xs font-extrabold tabular-nums ${theme.badge}`}>
                          {m.indexBn}
                        </span>
                        <h3 className="mt-1.5 text-base font-bold text-[#123B67]">{m.title}</h3>
                        <p className={`mt-0.5 text-xs font-semibold ${theme.badge}`}>{m.subtitle}</p>
                        <p className="mt-2.5 text-xs leading-relaxed text-[#425B69]">
                          {m.description}
                        </p>
                      </div>
                      <ul className="mt-4 space-y-1.5 border-t border-black/5 pt-3 text-xs font-medium text-[#1E3645]">
                        {m.focusPoints.map((pt) => (
                          <li key={pt} className="flex items-start gap-1.5">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#087F5B]" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}

            {programTab === 'classes' && (
              <div role="tabpanel" className="p-5 sm:p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {resolvedClassStages.map((stage, idx) => {
                    const theme = PROGRAM_CARD_THEMES[idx % PROGRAM_CARD_THEMES.length];
                    return (
                      <div
                        key={stage.stage}
                        className={`flex flex-col justify-between rounded-xl border p-4 shadow-2xs ${theme.bg}`}
                      >
                        <div>
                          <p className={`text-[11px] font-bold ${theme.badge}`}>
                            স্তর ০{toBnDigits(idx + 1)} · {stage.rangeLabel}
                          </p>
                          <h3 className="mt-1 text-base font-bold text-[#123B67]">{stage.stage}</h3>
                          <p className="mt-1.5 text-xs leading-relaxed text-[#47606D]">
                            {stage.summary}
                          </p>
                        </div>
                        <p className="mt-3 border-t border-black/5 pt-2.5 text-xs font-bold leading-relaxed text-[#123B67]">
                          {stage.classes.join(' · ')}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F2F8F5] px-4 py-3 text-xs text-[#2B4350]">
                  <span className="inline-flex items-center gap-1.5 font-bold text-[#087F5B]">
                    <Clock className="h-4 w-4 shrink-0 text-[#F4A62A]" />
                    পরিচালিত শিফট: {shifts.join(' ও ')}
                  </span>
                  <span className="font-semibold text-[#123B67]">
                    সর্বোচ্চ শ্রেণি: {settings.highestClass || 'অষ্টম শ্রেণি'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8F1EC] bg-[#F8FBF9] px-5 py-3.5 sm:px-6">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-[#3B5563]">
                <Languages className="h-3.5 w-3.5 text-[#087F5B]" />
                <span>বাংলা · ইংরেজি · আরবি ট্রিলিংগুয়াল কারিকুলাম</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <Link
                  to="/programs"
                  className="text-[#123B67] transition hover:text-[#087F5B] hover:underline whitespace-nowrap shrink-0"
                >
                  সম্পূর্ণ পাঠ্যক্রম
                </Link>
                <Link
                  to="/admission"
                  className="text-[#087F5B] transition hover:underline whitespace-nowrap shrink-0"
                >
                  অনলাইন ভর্তি আবেদন →
                </Link>
              </div>
            </div>
          </section>

          {/* 4C. লক্ষ্য ও উদ্দেশ্য এবং প্রতিষ্ঠান প্রধানের বক্তব্য */}
          <section className="space-y-5">
            {settings.missionText && (
              <div className="overflow-hidden rounded-2xl border border-[#CBE0D6] bg-gradient-to-br from-[#123B67] via-[#123B67] to-[#087F5B] p-6 text-white shadow-md sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F4A62A] text-[#123B67] shadow-sm">
                      <Target className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#F4A62A]">
                        আমাদের ভিশন ও মিশন
                      </p>
                      <h2 className="text-xl font-extrabold text-white">লক্ষ্য ও উদ্দেশ্য</h2>
                    </div>
                  </div>
                  <Link
                    to="/about"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-xs font-bold text-white backdrop-blur-xs transition hover:bg-[#F4A62A] hover:text-[#123B67]"
                  >
                    ইতিহাস ও পরিচিতি <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-sky-50/95 sm:text-[15px]">
                  {settings.missionText}
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { title: 'নৈতিক চরিত্র গঠন', desc: 'কুরআন ও সুন্নাহর আলোকে আদর্শ জীবনবোধ', dot: 'bg-[#F4A62A]' },
                    { title: 'আধুনিক জ্ঞানার্জন', desc: 'বিজ্ঞান, প্রযুক্তি ও ভাষাগত দক্ষতা উন্নয়ন', dot: 'bg-[#21A9D6]' },
                    { title: 'নিরাপদ ক্যাম্পাস', desc: 'শৃঙ্খলাপূর্ণ ও শিক্ষার্থী-বান্ধব পরিবেশ', dot: 'bg-[#A78BFA]' },
                  ].map((pillar) => (
                    <div
                      key={pillar.title}
                      className="rounded-xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${pillar.dot}`} />
                        <h3 className="text-xs font-bold text-white">{pillar.title}</h3>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-sky-100/85">
                        {pillar.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {settings.principalMessage?.trim() && (
              <div className="rounded-2xl border border-[#D4E6DD] bg-white p-6 shadow-xs">
                <div className="mb-4 flex items-center justify-between border-b border-[#EDF3EF] pb-3">
                  <div>
                    <p className="text-xs font-bold text-[#087F5B]">অধ্যক্ষের বাণী</p>
                    <h2 className="text-xl font-extrabold text-[#123B67]">প্রতিষ্ঠান প্রধানের বক্তব্য</h2>
                  </div>
                  <Quote className="h-8 w-8 text-[#F4A62A]/60" />
                </div>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  {settings.principalPhotoUrl?.trim() && (
                    <img
                      src={settings.principalPhotoUrl}
                      alt={settings.principalName || 'অধ্যক্ষ'}
                      className="h-28 w-28 shrink-0 rounded-2xl border-2 border-[#087F5B]/25 object-cover shadow-xs"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed text-[#354E5A]">
                      “{settings.principalMessage}”
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        {settings.principalName && (
                          <h3 className="text-base font-bold text-[#087F5B]">
                            {settings.principalName}
                          </h3>
                        )}
                        <p className="text-xs font-medium text-[#526B78]">
                          {settings.principalDesignation}
                        </p>
                      </div>
                      <Link
                        to="/about"
                        className="text-xs font-bold text-[#123B67] hover:text-[#087F5B] hover:underline"
                      >
                        প্রতিষ্ঠানের বিস্তারিত →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {directorsWithSpeech.length > 0 && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-[#123B67]">পরিচালনা পর্ষদের বাণী</h2>
                    <div className="mt-1 h-1 w-14 rounded-full bg-[#F4A62A]" />
                  </div>
                  <Link
                    to="/governing-body"
                    className="inline-flex items-center gap-1 rounded-xl bg-[#EAF2FA] px-3.5 py-2 text-xs font-bold text-[#123B67] transition hover:bg-[#123B67] hover:text-white"
                  >
                    পরিচালনা পর্ষদ <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {directorsWithSpeech.slice(0, 2).map((dir) => (
                    <div
                      key={dir.id}
                      className="rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {dir.photoUrl ? (
                            <img
                              src={dir.photoUrl}
                              alt={dir.name}
                              className="h-14 w-14 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#E9F7F1] text-base font-bold text-[#087F5B]">
                              {getInitials(dir.name)}
                            </div>
                          )}
                          <div>
                            <h3 className="text-sm font-bold text-[#123B67]">{dir.name}</h3>
                            <p className="text-xs font-semibold text-[#087F5B]">{dir.designation}</p>
                          </div>
                        </div>
                        <Quote className="h-6 w-6 shrink-0 text-[#21A9D6]/60" />
                      </div>
                      <p className="line-clamp-4 text-sm leading-relaxed text-[#3B5360]">
                        {dir.speech}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 4D. শিক্ষক পরিচিতি (Teachers Preview) */}
          <section className="rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#805AD5]">দক্ষ ও নিবেদিত শিক্ষকমণ্ডলী</p>
                <h2 className="text-xl font-extrabold text-[#123B67]">শিক্ষক পরিচিতি</h2>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="h-1 w-12 rounded-full bg-[#805AD5]" />
                  <span className="h-1 w-4 rounded-full bg-[#087F5B]" />
                </div>
              </div>
              <Link
                to="/faculty"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#F4EFFC] px-4 py-2 text-xs font-bold text-[#6B46C1] transition hover:bg-[#805AD5] hover:text-white"
              >
                সকল শিক্ষক ({toBnDigits(faculty.length)}) →
              </Link>
            </div>

            {faculty.length === 0 ? (
              <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-dashed border-[#DDD0F7] bg-[#FAF8FE] p-5 text-center sm:flex-row sm:text-left">
                <div>
                  <p className="text-sm font-bold text-[#123B67]">অভিজ্ঞ ও যত্নশীল শিক্ষকমণ্ডলী</p>
                  <p className="mt-0.5 text-xs text-[#546B78]">
                    আধুনিক ও ইসলামিক শিক্ষায় দক্ষ শিক্ষকদের তালিকা ও বিভাগীয় তথ্য দেখুন।
                  </p>
                </div>
                <Link
                  to="/faculty"
                  className="shrink-0 rounded-xl bg-[#805AD5] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#6B46C1]"
                >
                  শিক্ষক তালিকা দেখুন
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {faculty.slice(0, 4).map((t, idx) => {
                  const badgeColors = [
                    'bg-[#E9F7F1] text-[#087F5B]',
                    'bg-[#EAF2FA] text-[#123B67]',
                    'bg-[#F4EFFC] text-[#6B46C1]',
                    'bg-[#E7F7FC] text-[#0E7DA3]',
                  ];
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-3.5 rounded-xl border border-[#E2EFE8] bg-[#FAFCFB] p-3.5 transition hover:-translate-y-0.5 hover:border-[#805AD5]/50 hover:shadow-sm"
                    >
                      {t.photoUrl ? (
                        <img
                          src={t.photoUrl}
                          alt={t.nameBn || t.name}
                          className="h-14 w-14 shrink-0 rounded-xl object-cover ring-2 ring-[#DDD0F7]"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#123B67] to-[#805AD5] text-sm font-extrabold text-white">
                          {getInitials(t.nameBn || t.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-[#123B67]">
                          {t.nameBn || t.name}
                        </h3>
                        <p className="truncate text-xs font-semibold text-[#087F5B]">
                          {t.designation}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${badgeColors[idx % badgeColors.length]}`}
                          >
                            {t.subject}
                          </span>
                          <span className="text-[10px] font-medium text-[#5A727E]">
                            {t.department}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 4E. শিক্ষার্থী ও অর্জন + পরীক্ষার ফলাফল Showcase */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Students & Achievements */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#DDD0F7] bg-gradient-to-br from-[#F7F3FD] via-white to-white p-5 shadow-xs">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#805AD5] text-white shadow-sm">
                    <Trophy className="h-5 w-5" />
                  </span>
                  <span className="rounded-lg bg-[#F4EFFC] px-2.5 py-1 text-[11px] font-extrabold text-[#6B46C1] tabular-nums">
                    {toBnDigits(achievements.length)}টি স্বীকৃতি
                  </span>
                </div>
                <h2 className="mt-3.5 text-lg font-extrabold text-[#123B67]">শিক্ষার্থী ও অর্জন</h2>
                <p className="mt-1 text-xs leading-relaxed text-[#4C6370]">
                  বৃত্তি, কিরাত, হিফজ প্রতিযোগিতা ও শ্রেণিভিত্তিক মেধাতালিকায় আমাদের কৃতি শিক্ষার্থীদের সাফল্য।
                </p>

                {achievements.length > 0 && (
                  <div className="mt-3.5 space-y-2">
                    {achievements.slice(0, 2).map((ach) => (
                      <div
                        key={ach.id}
                        className="rounded-xl border border-[#E7DDF9] bg-white px-3 py-2.5 text-xs"
                      >
                        <p className="font-bold text-[#123B67]">{ach.achievementTitle}</p>
                        <p className="mt-0.5 text-[11px] text-[#6B46C1]">
                          {ach.studentName} · {labelClass(ach.className)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Link
                to="/students"
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#805AD5] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#6B46C1]"
              >
                <span>কৃতি শিক্ষার্থী ও অর্জন দেখুন</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Exam Results Portal */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#BFE8F7] bg-gradient-to-br from-[#ECF9FE] via-white to-white p-5 shadow-xs">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#21A9D6] text-white shadow-sm">
                    <Award className="h-5 w-5" />
                  </span>
                  <span className="rounded-lg bg-[#E7F7FC] px-2.5 py-1 text-[11px] font-extrabold text-[#0E7DA3] tabular-nums">
                    {toBnDigits(publishedResults.length)}টি ফলাফল
                  </span>
                </div>
                <h2 className="mt-3.5 text-lg font-extrabold text-[#123B67]">পরীক্ষার ফলাফল ও মার্কশিট</h2>
                <p className="mt-1 text-xs leading-relaxed text-[#4C6370]">
                  শ্রেণি ও রোল নম্বর দিয়ে মুহূর্তেই পরীক্ষার ফলাফল যাচাই করুন এবং অফিশিয়াল বাংলা মার্কশিট পিডিএফ ডাউনলোড করুন।
                </p>

                <div className="mt-3.5 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl border border-[#D4EEF8] bg-white p-2.5">
                    <p className="text-base font-extrabold text-[#0E7DA3] tabular-nums">
                      {toBnDigits(settings.passRatePercent || 100)}%
                    </p>
                    <p className="text-[10px] font-semibold text-[#546B78]">উত্তীর্ণের হার</p>
                  </div>
                  <div className="rounded-xl border border-[#D4EEF8] bg-white p-2.5">
                    <p className="text-base font-extrabold text-[#087F5B]">PDF</p>
                    <p className="text-[10px] font-semibold text-[#546B78]">অফিশিয়াল মার্কশিট</p>
                  </div>
                </div>
              </div>

              <Link
                to="/results"
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#21A9D6] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#0E7DA3]"
              >
                <Search className="h-3.5 w-3.5" />
                <span>ফলাফল যাচাই ও ডাউনলোড</span>
              </Link>
            </div>
          </section>

          {/* 4F. ভর্তি কার্যক্রম এবং ইভেন্ট ও একাডেমিক ক্যালেন্ডার */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Admission CTA Card */}
            <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#F8DFAF] bg-gradient-to-br from-[#FFF8EA] via-white to-white p-5 shadow-xs">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#F4A62A]/20 px-2.5 py-1 text-[11px] font-extrabold text-[#9A5B00]">
                  <UserPlus className="h-3.5 w-3.5" />
                  ভর্তি কার্যক্রম চলমান
                </div>
                <h2 className="mt-3 text-lg font-extrabold text-[#123B67]">
                  নতুন শিক্ষাবর্ষে ভর্তি আবেদন
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-[#4C6370]">
                  প্লে গ্রুপ থেকে {settings.highestClass || 'অষ্টম শ্রেণি'} পর্যন্ত মর্নিং ও ডে শিফটে বাংলা, ইংরেজি ও আরবি সমন্বিত কারিকুলামে অনলাইনে আবেদন করুন।
                </p>
                <ul className="mt-3 space-y-1.5 text-xs font-medium text-[#263B35]">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#087F5B]" />
                    তাৎক্ষণিক অনলাইন আবেদন ও ট্র্যাকিং নম্বর
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#087F5B]" />
                    হিফজুল কুরআন ও নূরানী বিভাগের বিশেষ তত্ত্বাবধান
                  </li>
                </ul>
              </div>
              <Link
                to="/admission"
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#F4A62A] px-4 py-2.5 text-xs font-extrabold text-[#123B67] shadow-xs transition hover:bg-[#e8981a]"
              >
                <span>অনলাইন ভর্তি ফরম পূরণ করুন</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Events & Academic Calendar */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#CBE9DC] bg-gradient-to-br from-[#EDF9F4] via-white to-white p-5 shadow-xs">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#087F5B]/12 px-2.5 py-1 text-[11px] font-extrabold text-[#087F5B]">
                  <Calendar className="h-3.5 w-3.5" />
                  ইভেন্ট ও একাডেমিক ক্যালেন্ডার
                </div>
                <h2 className="mt-3 text-lg font-extrabold text-[#123B67]">
                  বার্ষিক শিক্ষাপঞ্জি ও সময়সূচি
                </h2>
                <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[#4C6370]">
                  {settings.academicCalendarNote ||
                    'বার্ষিক ক্লাস রুটিন, অর্ধবার্ষিক ও বার্ষিক পরীক্ষার সময়সূচি, ইসলামিক সাংস্কৃতিক অনুষ্ঠান এবং সরকারি ছুটির তালিকা এক জায়গায় দেখুন।'}
                </p>
                <div className="mt-3 rounded-xl border border-[#D4E6DD] bg-white p-3 text-[11px] text-[#3B5563]">
                  <span className="font-bold text-[#123B67]">অফিস সময়: </span>
                  {settings.officeHours || 'শনি – বৃহস্পতি: সকাল ৮:০০ – বিকাল ৪:০০'}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/academic/calendar"
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-[#087F5B] px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-[#06684A]"
                >
                  ক্যালেন্ডার দেখুন
                </Link>
                <Link
                  to="/academic/exam-routine"
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-[#123B67]/20 bg-white px-3.5 py-2.5 text-xs font-bold text-[#123B67] transition hover:bg-[#123B67] hover:text-white"
                >
                  পরীক্ষার রুটিন
                </Link>
              </div>
            </div>
          </section>

          {/* 4G. আধুনিক ছবি এবং ভিডিও গ্যালারি */}
          <section className="rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#21A9D6]">ক্যাম্পাস স্থিরচিত্র ও আয়োজন</p>
                <h2 className="text-xl font-extrabold text-[#123B67]">ছবি এবং ভিডিও গ্যালারি</h2>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="h-1 w-12 rounded-full bg-[#21A9D6]" />
                  <span className="h-1 w-4 rounded-full bg-[#087F5B]" />
                </div>
              </div>
              <Link
                to="/gallery"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#E7F7FC] px-4 py-2 text-xs font-bold text-[#0E7DA3] transition hover:bg-[#21A9D6] hover:text-white"
              >
                সম্পূর্ণ গ্যালারি ({toBnDigits(gallery.length)}) →
              </Link>
            </div>

            {homeGallery.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#CBE0D4] py-8 text-center text-sm text-[#587064]">
                গ্যালারিতে এখনো কোনো ছবি বা ভিডিও যুক্ত করা হয়নি।
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3">
                {homeGallery.map((item, idx) => {
                  const isVideo = item.mediaType === 'video' || Boolean(item.videoUrl);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLightboxIdx(idx)}
                      className={`group relative overflow-hidden rounded-xl border border-[#DCE8E1] bg-[#123B67] text-left shadow-xs transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                        idx === 0 ? 'aspect-[16/10] sm:col-span-2 md:col-span-2 md:aspect-[16/9]' : 'aspect-[4/3]'
                      }`}
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.titleBn || item.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-108"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#091E36]/90 via-[#091E36]/20 to-transparent" />
                      <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-[#123B67]/85 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-xs">
                        {isVideo ? (
                          <Video className="h-3 w-3 text-[#F4A62A]" />
                        ) : (
                          <ImageIcon className="h-3 w-3 text-[#21A9D6]" />
                        )}
                        {GALLERY_CATEGORY_BN[item.category] || item.category}
                      </span>
                      {isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F4A62A] text-[#123B67] shadow-lg transition group-hover:scale-110">
                            <Play className="ml-0.5 h-5 w-5 fill-[#123B67]" />
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-3.5">
                        <p className="line-clamp-2 text-xs font-bold text-white sm:text-sm">
                          {item.titleBn || item.title}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* 4H. সংবাদ ও সাম্প্রতিক কার্যক্রম */}
          {news.length > 0 && (
            <section className="rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[#F4A62A]">ক্যাম্পাস সংবাদ</p>
                  <h2 className="text-xl font-extrabold text-[#123B67]">সংবাদ ও সাম্প্রতিক কার্যক্রম</h2>
                </div>
                <Link
                  to="/news"
                  className="inline-flex items-center gap-1 rounded-xl bg-[#FEF5E4] px-4 py-2 text-xs font-bold text-[#A66300] transition hover:bg-[#F4A62A] hover:text-[#123B67]"
                >
                  সকল সংবাদ →
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {news.slice(0, 2).map((article) => (
                  <Link
                    key={article.id}
                    to={`/news/${article.id}`}
                    className="group overflow-hidden rounded-xl border border-[#DCE8E1] bg-[#F8FBF9] transition duration-200 hover:-translate-y-0.5 hover:border-[#087F5B] hover:shadow-md"
                  >
                    {article.imageUrl && (
                      <div className="overflow-hidden">
                        <img
                          src={article.imageUrl}
                          alt={article.titleBn || article.title}
                          className="h-44 w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-[#087F5B]">
                          {NEWS_CATEGORY_BN[article.category] || article.category}
                        </span>
                        <span className="text-[#5B727E]">{toBnDigits(article.eventDate)}</span>
                      </div>
                      <h3 className="mt-1.5 line-clamp-2 text-sm font-bold text-[#123B67] group-hover:text-[#087F5B]">
                        {article.titleBn || article.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-[#4C6370]">
                        {article.summaryBn || article.summary}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ==================== RIGHT STICKY SIDEBAR (4 cols) ==================== */}
        <aside className="space-y-6 lg:sticky lg:top-20 lg:col-span-4">
          {/* নোটিশ বোর্ড কার্ড */}
          <div className="overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-sm">
            <div className="flex items-center justify-between bg-gradient-to-r from-[#123B67] to-[#087F5B] px-5 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F4A62A] text-[#123B67] shadow-xs">
                  <Megaphone className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold leading-tight">নোটিশ বোর্ড</h2>
                  <p className="text-[11px] text-sky-100/90">সর্বশেষ জরুরি ও একাডেমিক বিজ্ঞপ্তি</p>
                </div>
              </div>
              <span className="rounded-lg bg-white/15 px-2 py-1 font-mono text-xs font-bold tabular-nums">
                {toBnDigits(notices.length)}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 border-b border-[#E8F1EC] bg-[#F8FBF9] px-3.5 py-2.5">
              {(
                [
                  { id: 'All', label: 'সকল' },
                  { id: 'Urgent', label: 'জরুরি' },
                  { id: 'Admission', label: 'ভর্তি' },
                  { id: 'Exam', label: 'রুটিন' },
                  { id: 'Holiday', label: 'ছুটি' },
                  { id: 'Result', label: 'ফলাফল' },
                ] as const
              ).map((cat) => {
                const active = noticeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setNoticeCategory(cat.id)}
                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                      active
                        ? cat.id === 'Urgent'
                          ? 'bg-[#F4A62A] text-[#123B67] shadow-2xs'
                          : 'bg-[#087F5B] text-white shadow-2xs'
                        : 'bg-white text-[#395260] ring-1 ring-[#DCE8E1] hover:bg-[#E9F7F1] hover:text-[#087F5B]'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 p-3.5">
              {filteredSidebarNotices.length === 0 ? (
                <p className="py-8 text-center text-xs text-[#607680]">
                  এই বিভাগে কোনো নোটিশ পাওয়া যায়নি।
                </p>
              ) : (
                filteredSidebarNotices.slice(0, 6).map((notice) => {
                  const isUrgent = notice.category === 'Urgent' || notice.isPinned;
                  const recent = isRecentDate(notice.publishedDate);
                  return (
                    <div
                      key={notice.id}
                      className={`rounded-xl border p-3 transition duration-150 ${
                        isUrgent
                          ? 'border-[#F4A62A]/60 bg-[#FFF9EC] hover:border-[#F4A62A]'
                          : 'border-[#E6F0EA] bg-white hover:border-[#087F5B]/40 hover:bg-[#F7FBF9]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <span
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${
                              isUrgent
                                ? 'bg-[#F4A62A] text-[#123B67]'
                                : 'bg-[#087F5B]/12 text-[#087F5B]'
                            }`}
                          >
                            {isUrgent ? <AlertTriangle className="h-3.5 w-3.5" /> : '!'}
                          </span>
                          <div className="min-w-0">
                            <Link
                              to={`/notices/${notice.id}`}
                              className="line-clamp-2 text-xs font-bold leading-snug text-[#123B67] hover:text-[#087F5B]"
                            >
                              {notice.titleBn || notice.title}
                            </Link>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                              <span className="text-[#566F7C]">{toBnDigits(notice.publishedDate)}</span>
                              {isUrgent && (
                                <span className="rounded bg-[#F4A62A]/25 px-1.5 py-0.5 font-extrabold text-[#9A5B00]">
                                  জরুরি
                                </span>
                              )}
                              {recent && (
                                <span className="rounded bg-[#E11D48] px-1.5 py-0.5 font-bold text-white">
                                  নতুন
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <Link
                          to={`/notices/${notice.id}`}
                          className="shrink-0 rounded-lg bg-[#E9F7F1] px-2.5 py-1.5 text-[11px] font-bold text-[#087F5B] transition hover:bg-[#087F5B] hover:text-white"
                        >
                          দেখুন
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3.5 pt-0">
              <Link
                to="/notices"
                className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#087F5B] py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A]"
              >
                <span>সকল নোটিশ দেখুন</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* গুরুত্বপূর্ণ লিংক সমূহ কার্ড */}
          <div className="overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-[#E8F1EC] bg-gradient-to-r from-[#E7F7FC] to-white px-5 py-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#21A9D6] text-white shadow-2xs">
                <Link2 className="h-4 w-4" />
              </span>
              <h2 className="text-base font-extrabold text-[#123B67]">গুরুত্বপূর্ণ লিংক সমূহ</h2>
            </div>
            <div className="divide-y divide-[#EDF4F0] px-4">
              {importantLinks.map((lnk) => (
                <div key={lnk.id} className="flex items-center justify-between gap-2 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#21A9D6]" />
                    <span
                      className="truncate text-xs font-semibold text-[#1E3645]"
                      title={lnk.title}
                    >
                      {lnk.title}
                    </span>
                  </div>
                  <a
                    href={lnk.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg bg-[#EAF2FA] px-3 py-1.5 text-[11px] font-bold text-[#123B67] transition hover:bg-[#123B67] hover:text-white"
                  >
                    ভিজিট
                  </a>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ==================== 5. অভিভাবকদের মতামত (PARENT TESTIMONIALS) ==================== */}
      <section className="rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs sm:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[#805AD5]">আস্থা ও সন্তুষ্টি</p>
            <h2 className="mt-0.5 text-xl font-extrabold text-[#123B67] sm:text-2xl">
              অভিভাবকদের মতামত
            </h2>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="h-1 w-12 rounded-full bg-[#805AD5]" />
              <span className="h-1 w-4 rounded-full bg-[#F4A62A]" />
              <span className="h-1 w-2 rounded-full bg-[#087F5B]" />
            </div>
          </div>
          <Link
            to="/contact"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4E6DD] bg-[#F2F8F5] px-4 py-2 text-xs font-bold text-[#123B67] transition hover:bg-[#087F5B] hover:text-white"
          >
            আপনার মতামত জানান <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PARENT_TESTIMONIALS.map((item) => (
            <div
              key={item.name}
              className={`flex flex-col justify-between rounded-2xl border p-5 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md ${item.accent}`}
            >
              <div>
                <div className="flex items-center gap-0.5 text-[#F4A62A]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-[#F4A62A]" />
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[#354E5A] sm:text-[13px]">
                  “{item.quote}”
                </p>
              </div>
              <div className="mt-4 flex items-center gap-3 border-t border-black/5 pt-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${item.avatar}`}
                >
                  {getInitials(item.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[#123B67]">{item.name}</p>
                  <p className="truncate text-[11px] font-medium text-[#566F7C]">{item.relation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== 6. যোগাযোগ ও GOOGLE MAP ==================== */}
      <section className="overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="flex flex-col justify-between bg-gradient-to-br from-[#123B67] to-[#087F5B] p-6 text-white sm:p-8 lg:col-span-5">
            <div>
              <p className="text-xs font-bold text-[#F4A62A]">সরাসরি যোগাযোগ ও অবস্থান</p>
              <h2 className="mt-1 text-2xl font-extrabold">ক্যাম্পাস পরিদর্শন করুন</h2>
              <p className="mt-2 text-xs leading-relaxed text-sky-100/90 sm:text-sm">
                ভর্তি সংক্রান্ত যেকোনো তথ্য, পরামর্শ বা ক্যাম্পাস পরিদর্শনের জন্য আমাদের অফিসে যোগাযোগ করুন।
              </p>

              <div className="mt-5 space-y-3 text-xs sm:text-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[#F4A62A]">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold text-sky-200">ঠিকানা</p>
                    <p className="font-bold text-white">
                      {settings.address || 'তুলসীঘাট, গাইবান্ধা সদর, গাইবান্ধা-৫৭০০'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[#21A9D6]">
                    <Phone className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold text-sky-200">ফোন নম্বর</p>
                    <p className="font-bold text-white tabular-nums">
                      {toBnDigits(settings.phone || '+880 1711-759705')}
                    </p>
                  </div>
                </div>

                {settings.email && (
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[#A78BFA]">
                      <Mail className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold text-sky-200">ইমেইল</p>
                      <p className="font-bold text-white">{settings.email}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[#34D399]">
                    <Clock className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold text-sky-200">অফিস সময়</p>
                    <p className="font-bold text-white">
                      {settings.officeHours || 'শনি – বৃহস্পতি: সকাল ৮:০০ – বিকাল ৪:০০'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                to="/contact"
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-[#F4A62A] px-5 py-2 text-xs font-extrabold text-[#123B67] transition hover:bg-[#f7b547]"
              >
                <span>যোগাযোগ পেজ</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/admission"
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-white/30 bg-white/12 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/20"
              >
                ভর্তি আবেদন
              </Link>
            </div>
          </div>

          <div className="min-h-[290px] bg-[#EAF2FA] lg:col-span-7">
            <iframe
              title={`${settings.schoolNameBn} মানচিত্র`}
              src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
              className="h-full min-h-[290px] w-full border-0 lg:min-h-[360px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* ==================== HOMEPAGE GALLERY LIGHTBOX MODAL ==================== */}
      {activeLightboxItem && lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#071729]/88 p-3 backdrop-blur-xs sm:p-6"
          onClick={() => setLightboxIdx(null)}
        >
          <div
            className="sheet-enter relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-[#123B67] to-[#087F5B] px-5 py-3.5 text-white">
              <div className="min-w-0 pr-3">
                <p className="text-[11px] font-semibold text-[#F4A62A]">
                  {GALLERY_CATEGORY_BN[activeLightboxItem.category] || activeLightboxItem.category} ·{' '}
                  {toBnDigits(lightboxIdx + 1)} / {toBnDigits(homeGallery.length)}
                </p>
                <h3 className="truncate text-sm font-bold sm:text-base">
                  {activeLightboxItem.titleBn || activeLightboxItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLightboxIdx(null)}
                aria-label="লাইটবক্স বন্ধ করুন"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/25"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative bg-[#07131E]">
              {activeLightboxItem.mediaType === 'video' || activeLightboxItem.videoUrl ? (
                getYouTubeEmbedUrl(activeLightboxItem.videoUrl) ? (
                  <iframe
                    src={getYouTubeEmbedUrl(activeLightboxItem.videoUrl)!}
                    title={activeLightboxItem.title}
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : activeLightboxItem.videoUrl ? (
                  <video
                    src={activeLightboxItem.videoUrl}
                    controls
                    autoPlay
                    className="max-h-[68vh] w-full"
                  />
                ) : (
                  <img
                    src={activeLightboxItem.imageUrl}
                    alt={activeLightboxItem.title}
                    className="max-h-[68vh] w-full object-contain"
                  />
                )
              ) : (
                <img
                  src={activeLightboxItem.imageUrl}
                  alt={activeLightboxItem.titleBn || activeLightboxItem.title}
                  className="max-h-[68vh] w-full object-contain"
                />
              )}

              {homeGallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxIdx((cur) =>
                        cur === null ? 0 : (cur - 1 + homeGallery.length) % homeGallery.length
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
                      setLightboxIdx((cur) => (cur === null ? 0 : (cur + 1) % homeGallery.length))
                    }
                    aria-label="পরবর্তী ছবি"
                    className="absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs transition hover:bg-[#087F5B]"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {activeLightboxItem.caption && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3.5 text-xs text-[#38515E] sm:text-sm">
                <p>{activeLightboxItem.caption}</p>
                <Link
                  to="/gallery"
                  onClick={() => setLightboxIdx(null)}
                  className="shrink-0 font-bold text-[#087F5B] hover:underline"
                >
                  সব ছবি দেখুন →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
