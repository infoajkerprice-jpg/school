import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
  Home,
  Phone,
  Sparkles,
  Sun,
  Sunset,
} from 'lucide-react';
import { usePublicData } from '../../context/PublicDataContext';
import {
  groupClassStages,
  resolveEducationMediums,
  resolveIslamicPrograms,
} from '../../lib/programDetails';
import { toBnDigits } from '../../i18n';
import { CAMPUS_IMAGES } from '../../types';
import { MobileCardSlider } from '../MobileCardSlider';

function sanitizeTel(phone?: string): string {
  return (phone || '+8801711759705').replace(/[^\d+]/g, '');
}

const MEDIUM_ACCENTS = [
  {
    badge: 'bg-[#087F5B]/12 text-[#087F5B]',
    border: 'border-t-4 border-t-[#087F5B]',
    subtitle: 'text-[#087F5B]',
    check: 'text-[#087F5B]',
  },
  {
    badge: 'bg-[#123B67]/12 text-[#123B67]',
    border: 'border-t-4 border-t-[#123B67]',
    subtitle: 'text-[#123B67]',
    check: 'text-[#21A9D6]',
  },
  {
    badge: 'bg-[#805AD5]/12 text-[#805AD5]',
    border: 'border-t-4 border-t-[#805AD5]',
    subtitle: 'text-[#805AD5]',
    check: 'text-[#805AD5]',
  },
];

const STAGE_ACCENTS = [
  { top: 'border-t-4 border-t-[#087F5B]', tag: 'bg-[#EDF9F4] text-[#087F5B]' },
  { top: 'border-t-4 border-t-[#21A9D6]', tag: 'bg-[#EBF8FD] text-[#0E7DA3]' },
  { top: 'border-t-4 border-t-[#805AD5]', tag: 'bg-[#F5F0FF] text-[#805AD5]' },
];

export const EducationProgramsPage: React.FC = () => {
  const { settings } = usePublicData();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawMediums = settings.educationMediums?.length
    ? settings.educationMediums
    : ['বাংলা ভার্সন', 'ইংরেজি ভার্সন', 'আরবি ভাষার সমন্বয়ে ট্রিলিংগুয়াল কারিকুলাম'];

  const rawClasses = settings.classList?.length
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

  const shifts = settings.shifts?.length ? settings.shifts : ['মর্নিং শিফট', 'ডে শিফট'];

  const rawPrograms = settings.specialPrograms?.length
    ? settings.specialPrograms
    : [
        'সহিহ কুরআন শিক্ষা',
        'হিফজুল কুরআন বিভাগ',
        'মাসনুন দোয়া শিক্ষা',
        'ইসলামিক আদব-কায়দা',
        'আরবি ভাষা শিক্ষা',
        'নৈতিক ও ধর্মীয় শিক্ষা',
      ];

  const mediums = useMemo(() => resolveEducationMediums(rawMediums), [rawMediums]);
  const programs = useMemo(() => resolveIslamicPrograms(rawPrograms), [rawPrograms]);
  const classStages = useMemo(() => groupClassStages(rawClasses), [rawClasses]);

  const initialFocus = searchParams.get('focus');
  const [selectedSlug, setSelectedSlug] = useState<string>(
    () => programs.find((p) => p.slug === initialFocus)?.slug || programs[0]?.slug || ''
  );

  useEffect(() => {
    const focusParam = searchParams.get('focus');
    if (focusParam && programs.some((p) => p.slug === focusParam)) {
      setSelectedSlug(focusParam);
      const el = document.getElementById('islamic-programs');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [searchParams, programs]);

  const activeProgram =
    programs.find((p) => p.slug === selectedSlug) || programs[0] || null;

  const handleSelectProgram = (slug: string) => {
    setSelectedSlug(slug);
    setSearchParams({ focus: slug }, { replace: true });
  };

  const telHref = `tel:${sanitizeTel(settings.phone)}`;

  return (
    <div className="space-y-8">
      {/* ==================== 1. EDITORIAL INSTITUTIONAL HERO ==================== */}
      <section className="overflow-hidden rounded-3xl border border-[#D4E6DD] bg-white shadow-sm">
        <div className="grid grid-cols-1 items-stretch lg:grid-cols-12">
          <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-7">
            <div>
              {/* Interactive Breadcrumb */}
              <nav aria-label="ব্রেডক্রাম্ব" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-[#526B78]">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1 font-medium transition hover:text-[#087F5B]"
                >
                  <Home className="h-3.5 w-3.5 text-[#087F5B]" />
                  মূলপাতা
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-[#9BB4A8]" />
                <Link to="/academic" className="font-medium transition hover:text-[#087F5B]">
                  একাডেমিক
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-[#9BB4A8]" />
                <span className="font-bold text-[#123B67]">আধুনিক ও ইসলামিক শিক্ষা কার্যক্রম</span>
              </nav>

              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#805AD5]/12 px-3 py-1 text-[11px] font-bold text-[#805AD5]">
                <Sparkles className="h-3.5 w-3.5" />
                ট্রিলিংগুয়াল ও দ্বীনি পাঠ্যক্রম
              </span>

              <h1 className="mt-3 max-w-xl text-2xl font-extrabold leading-snug text-[#123B67] sm:text-3xl [text-wrap:balance]">
                আধুনিক সাধারণ শিক্ষা ও ইসলামিক মূল্যবোধের সমন্বিত পাঠ্যক্রম
              </h1>
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-[#263B35] sm:text-[15px]">
                {settings.schoolNameBn}-এ প্লে গ্রুপ থেকে {settings.highestClass || 'অষ্টম শ্রেণি'} পর্যন্ত
                বাংলা, ইংরেজি ও আরবি ভাষার সমন্বয়ে ট্রিলিংগুয়াল আধুনিক শিক্ষার পাশাপাশি সহিহ কুরআন,
                হিফজ ও নৈতিক চরিত্র গঠনের সুসংগঠিত পাঠদান পরিচালিত হয়।
              </p>

              {/* Quiet Operational Metadata Ribbon */}
              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-y border-[#E6F0EA] py-3 text-xs font-bold text-[#123B67]">
                <span className="text-[#087F5B]">প্লে গ্রুপ – {settings.highestClass || 'অষ্টম শ্রেণি'}</span>
                <span aria-hidden="true" className="text-[#9AB5A7]">·</span>
                <span>{shifts.join(' ও ')}</span>
                <span aria-hidden="true" className="text-[#9AB5A7]">·</span>
                <span className="text-[#805AD5]">প্রতিষ্ঠাকাল {toBnDigits(settings.establishedYear || '২০১৯')} খ্রি.</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/admission"
                className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl bg-[#087F5B] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#06684A] whitespace-nowrap"
              >
                অনলাইন ভর্তি আবেদন
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/academic/class-routine"
                className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-[#C8DDF2] bg-[#EDF4FB] px-4 py-2.5 text-sm font-bold text-[#123B67] transition hover:bg-[#123B67] hover:text-white whitespace-nowrap"
              >
                <CalendarDays className="h-4 w-4" />
                ক্লাস রুটিন দেখুন
              </Link>
            </div>
          </div>

          <div className="relative min-h-[250px] bg-[#123B67] lg:col-span-5">
            <img
              src={CAMPUS_IMAGES.assembly1}
              alt={`${settings.schoolNameBn} প্রাত্যহিক সমাবেশ ও শিক্ষা কার্যক্রম`}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#123B67]/85 via-[#123B67]/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="text-xs font-bold text-[#F4A62A]">
                {settings.schoolNameEn || 'Shah Islamic School And College'}
              </p>
              <p className="mt-0.5 text-sm font-bold">
                প্রতিদিনের শৃঙ্খলাবদ্ধ সমাবেশ ও নৈতিক শিক্ষা অনুশীলন
              </p>
            </div>
          </div>
        </div>

        {/* Clean Single-Line Quick Section Anchors */}
        <nav
          aria-label="পাঠ্যক্রম বিভাগসমূহ"
          className="flex items-center gap-6 overflow-x-auto border-t border-[#E6F0EA] bg-[#F2F8F5] px-6 py-3.5 text-xs font-bold text-[#123B67] sm:px-8"
        >
          <a href="#mediums" className="shrink-0 whitespace-nowrap transition hover:text-[#087F5B]">
            ০১. শিক্ষার মাধ্যম
          </a>
          <a href="#islamic-programs" className="shrink-0 whitespace-nowrap transition hover:text-[#087F5B]">
            ০২. ইসলামিক শিক্ষা কার্যক্রম
          </a>
          <a href="#classes" className="shrink-0 whitespace-nowrap transition hover:text-[#087F5B]">
            ০৩. শ্রেণি ও শিফট বিন্যাস
          </a>
          <a href="#admission-help" className="shrink-0 whitespace-nowrap transition hover:text-[#087F5B]">
            ০৪. ভর্তি ও যোগাযোগ
          </a>
        </nav>
      </section>

      {/* ==================== 2. TRILINGUAL EDUCATION MEDIUMS ==================== */}
      <section
        id="mediums"
        className="scroll-mt-24 rounded-2xl border border-[#D4E6DD] bg-white p-6 shadow-xs sm:p-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E8F1EC] pb-5">
          <div>
            <p className="text-xs font-bold text-[#087F5B]">০১ · শিক্ষার মাধ্যম ও কারিকুলাম</p>
            <h2 className="mt-1 text-xl font-extrabold text-[#123B67] sm:text-2xl">
              বাংলা, ইংরেজি ও আরবি—সমন্বিত ট্রিলিংগুয়াল পাঠদান
            </h2>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-[#4C6574] sm:text-sm">
            আধুনিক যুগের চাহিদা ও দ্বীনি শিক্ষার মূল ভিত্তি—দুইয়ের ভারসাম্য নিশ্চিত করতে আমাদের তিন ভাষার পাঠ্যক্রম।
          </p>
        </div>

        {/* Mobile Single-Card Slider */}
        <div className="mt-5 md:hidden">
          <MobileCardSlider
            items={mediums}
            getKey={(item) => item.title}
            ariaLabel="শিক্ষার মাধ্যম স্লাইডার"
            intervalMs={3000}
            transitionMs={500}
            dotTheme="green"
            renderItem={(item, idx) => {
              const theme = MEDIUM_ACCENTS[idx % MEDIUM_ACCENTS.length];
              return (
                <div
                  className={`flex h-full flex-col justify-between rounded-2xl border border-[#E2EDE7] bg-[#FAFDFB] p-5 ${theme.border}`}
                >
                  <div>
                    <span
                      className={`inline-block rounded-lg px-2.5 py-1 font-mono text-xs font-extrabold tabular-nums ${theme.badge}`}
                    >
                      {item.indexBn}
                    </span>
                    <h3 className="mt-3 text-base font-extrabold text-[#123B67]">{item.title}</h3>
                    <p className={`mt-1 text-xs font-bold ${theme.subtitle}`}>{item.subtitle}</p>
                    <p className="mt-2.5 text-xs leading-relaxed text-[#263B35]">
                      {item.description}
                    </p>
                  </div>
                  <ul className="mt-4 space-y-2 border-t border-[#E6F0EA] pt-3.5 text-xs font-semibold text-[#263B35]">
                    {item.focusPoints.map((pt) => (
                      <li key={pt} className="flex items-start gap-2">
                        <CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${theme.check}`} />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }}
          />
        </div>

        {/* Desktop & Tablet 3-Column Grid */}
        <div className="mt-6 hidden gap-5 md:grid md:grid-cols-3">
          {mediums.map((item, idx) => {
            const theme = MEDIUM_ACCENTS[idx % MEDIUM_ACCENTS.length];
            return (
              <div
                key={item.title}
                className={`flex flex-col justify-between rounded-2xl border border-[#E2EDE7] bg-[#FAFDFB] p-5 transition hover:-translate-y-0.5 hover:shadow-sm ${theme.border}`}
              >
                <div>
                  <span
                    className={`inline-block rounded-lg px-2.5 py-1 font-mono text-xs font-extrabold tabular-nums ${theme.badge}`}
                  >
                    {item.indexBn}
                  </span>
                  <h3 className="mt-3 text-lg font-extrabold text-[#123B67]">{item.title}</h3>
                  <p className={`mt-1 text-xs font-bold ${theme.subtitle}`}>{item.subtitle}</p>
                  <p className="mt-3 text-sm leading-relaxed text-[#263B35]">{item.description}</p>
                </div>
                <ul className="mt-4 space-y-2 border-t border-[#E6F0EA] pt-3.5 text-xs font-semibold text-[#263B35]">
                  {item.focusPoints.map((pt) => (
                    <li key={pt} className="flex items-start gap-2">
                      <CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${theme.check}`} />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ==================== 3. INTERACTIVE ISLAMIC PROGRAMS EXPLORER ==================== */}
      <section
        id="islamic-programs"
        className="scroll-mt-24 overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-xs"
      >
        <div className="border-b border-[#E8F1EC] bg-[#F8FBF9] p-6 sm:px-8 sm:py-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[#805AD5]">
                ০২ · বিশেষ ইসলামিক শিক্ষা কার্যক্রম ({toBnDigits(programs.length)}টি বিভাগ)
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-[#123B67] sm:text-2xl">
                প্রতিটি কার্যক্রম সম্পর্কে বিস্তারিত জানুন
              </h2>
            </div>
            <p className="text-xs font-medium text-[#526B78]">
              যেকোনো কার্যক্রমে ক্লিক করে লক্ষ্য, পাঠদান পদ্ধতি ও বিবরণ দেখুন
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Interactive Program Selector List */}
          <div
            role="tablist"
            aria-label="ইসলামিক শিক্ষা কার্যক্রম তালিকা"
            className="divide-y divide-[#EDF4F0] border-b border-[#E8F1EC] bg-[#FAFDFB] lg:col-span-5 lg:border-r lg:border-b-0"
          >
            {programs.map((prog, idx) => {
              const Icon = prog.icon;
              const isSelected = activeProgram?.slug === prog.slug;
              return (
                <button
                  key={prog.slug}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleSelectProgram(prog.slug)}
                  className={`flex w-full items-start gap-3.5 px-5 py-4 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#087F5B] sm:px-6 ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#087F5B] to-[#123B67] text-white'
                      : 'text-[#123B67] hover:bg-[#EDF9F4]'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                      isSelected
                        ? 'bg-[#F4A62A] text-[#123B67]'
                        : 'bg-[#087F5B]/10 text-[#087F5B]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold leading-snug">
                        {toBnDigits(String(idx + 1).padStart(2, '0'))}. {prog.title}
                      </span>
                      <ArrowRight
                        className={`h-4 w-4 shrink-0 transition-transform ${
                          isSelected ? 'translate-x-0.5 text-[#F4A62A]' : 'text-[#89A598]'
                        }`}
                      />
                    </div>
                    <p
                      className={`mt-1 line-clamp-1 text-xs ${
                        isSelected ? 'text-sky-100' : 'text-[#526B78]'
                      }`}
                    >
                      {prog.shortDesc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Detailed Program View */}
          {activeProgram && (
            <div
              role="tabpanel"
              className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-7"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#EDF9F4] px-2.5 py-1 text-[#087F5B]">
                    <BookOpen className="h-3.5 w-3.5" />
                    বিশেষ ইসলামিক শিক্ষা
                  </span>
                  <span className="rounded-lg bg-[#EBF8FD] px-2.5 py-1 text-[#0E7DA3]">
                    {activeProgram.applicableFor}
                  </span>
                </div>

                <h3 className="mt-3 text-2xl font-extrabold text-[#123B67]">
                  {activeProgram.title}
                </h3>
                <div className="mt-2 h-1 w-14 rounded-full bg-[#F4A62A]" />

                <p className="mt-4 max-w-prose text-sm leading-relaxed text-[#263B35] sm:text-[15px]">
                  {activeProgram.fullDesc}
                </p>

                <div className="mt-6 rounded-2xl border border-[#E2EDE7] bg-[#F8FBF9] p-5">
                  <h4 className="text-xs font-extrabold text-[#123B67]">
                    এই কার্যক্রমের মূল শিক্ষণীয় দিকসমূহ
                  </h4>
                  <ul className="mt-3 space-y-2.5">
                    {activeProgram.highlights.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-sm text-[#263B35]"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#087F5B]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#E8F1EC] pt-5">
                <p className="text-xs font-medium text-[#526B78]">
                  ভর্তি ও পাঠ্যক্রম সম্পর্কে জানতে সরাসরি যোগাযোগ করুন।
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    to="/admission"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#087F5B] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#06684A] whitespace-nowrap"
                  >
                    ভর্তির জন্য আবেদন করুন
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <a
                    href={telHref}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#C8DDF2] bg-[#EDF4FB] px-4 py-2.5 text-xs font-bold text-[#123B67] transition hover:bg-[#123B67] hover:text-white whitespace-nowrap"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    কল করুন
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ==================== 4. CLASS PROGRESSION & SHIFTS ==================== */}
      <section
        id="classes"
        className="scroll-mt-24 rounded-2xl border border-[#D4E6DD] bg-white p-6 shadow-xs sm:p-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E8F1EC] pb-5">
          <div>
            <p className="text-xs font-bold text-[#21A9D6]">০৩ · শ্রেণি ও শিফট বিন্যাস</p>
            <h2 className="mt-1 text-xl font-extrabold text-[#123B67] sm:text-2xl">
              প্লে গ্রুপ থেকে {settings.highestClass || 'অষ্টম শ্রেণি'} পর্যন্ত ধারাবাহিক পাঠদান
            </h2>
          </div>
          <span className="rounded-xl bg-[#F2F8F5] px-3.5 py-1.5 text-xs font-bold text-[#123B67] tabular-nums">
            মোট শ্রেণি: {toBnDigits(rawClasses.length)}টি · সর্বোচ্চ: {settings.highestClass || 'অষ্টম শ্রেণি'}
          </span>
        </div>

        {/* 3-Stage Academic Ladder */}
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {classStages.map((group, idx) => {
            const stgTheme = STAGE_ACCENTS[idx % STAGE_ACCENTS.length];
            return (
              <div
                key={group.stage}
                className={`flex flex-col justify-between rounded-2xl border border-[#E2EDE7] bg-[#FAFDFB] p-5 ${stgTheme.top}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className={`rounded-lg px-2.5 py-1 font-bold ${stgTheme.tag}`}>
                      স্তর ০{toBnDigits(idx + 1)}
                    </span>
                    <span className="font-semibold text-[#526B78]">{group.rangeLabel}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-extrabold text-[#123B67]">{group.stage}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#47606D]">{group.summary}</p>
                </div>

                <div className="mt-4 border-t border-[#E6F0EA] pt-3">
                  <p className="text-[11px] font-semibold text-[#5C7680]">অন্তর্ভুক্ত শ্রেণিসমূহ:</p>
                  <p className="mt-1 text-sm font-bold leading-relaxed text-[#123B67]">
                    {group.classes.join(' · ')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Shift Structure + Authentic Campus Courtyard Photo */}
        <div className="mt-8 grid grid-cols-1 items-stretch gap-6 border-t border-[#E8F1EC] pt-7 lg:grid-cols-12">
          <div className="flex flex-col justify-between lg:col-span-7">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#087F5B]">
                <Clock className="h-4 w-4 text-[#F4A62A]" />
                <span>পরিচালিত শিফটসমূহ</span>
              </div>
              <h3 className="mt-1.5 text-lg font-extrabold text-[#123B67]">
                সুবিধাজনক সময়ে {shifts.join(' ও ')} পাঠদান
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#263B35]">
                অভিভাবক ও শিক্ষার্থীদের সুবিধার্থে নিয়মিত রুটিন অনুযায়ী দুটি সুশৃঙ্খল শিফটে শ্রেণি কার্যক্রম পরিচালিত হয়।
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {shifts.map((shiftName, index) => {
                  const isMorning = shiftName.includes('মর্নিং') || index === 0;
                  const ShiftIcon = isMorning ? Sun : Sunset;
                  return (
                    <div
                      key={shiftName}
                      className={`rounded-2xl border p-4 ${
                        isMorning
                          ? 'border-[#F8DFAF] bg-[#FFF8EA]'
                          : 'border-[#BFE8F7] bg-[#EBF8FD]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                            isMorning
                              ? 'bg-[#F4A62A] text-[#123B67]'
                              : 'bg-[#21A9D6] text-white'
                          }`}
                        >
                          <ShiftIcon className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-extrabold text-[#123B67]">{shiftName}</span>
                      </div>
                      <p className="mt-2.5 text-xs leading-relaxed text-[#3D5562]">
                        {isMorning
                          ? 'প্রাত্যহিক সমাবেশ, সহিহ কুরআন পাঠ ও মূল একাডেমিক শ্রেণি কার্যক্রম।'
                          : 'শৃঙ্খলাবদ্ধ শ্রেণি পাঠদান, ব্যবহারিক অনুশীলন ও নৈতিক শিক্ষা কার্যক্রম।'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {settings.officeHours && (
              <p className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#087F5B]">
                <Clock className="h-3.5 w-3.5" />
                কার্যদিবস: {settings.officeHours}
              </p>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#D4E6DD] bg-[#123B67] shadow-xs lg:col-span-5">
            <img
              src={CAMPUS_IMAGES.courtyard}
              alt={`${settings.schoolNameBn} ক্যাম্পাস ও শ্রেণিকক্ষ ভবন`}
              referrerPolicy="no-referrer"
              className="h-full min-h-[220px] w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ==================== 5. PARENT ACTION & ADMISSION CTA ==================== */}
      <section
        id="admission-help"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#123B67] via-[#1B4A73] to-[#087F5B] p-6 text-white shadow-md sm:p-8"
      >
        <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-[#F4A62A]/20 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-[#F4A62A]">
              <GraduationCap className="h-4 w-4" />
              <span>{settings.schoolNameBn}</span>
            </div>
            <h2 className="mt-1.5 text-xl font-extrabold sm:text-2xl">
              আপনার সন্তানের আধুনিক ও ইসলামিক শিক্ষার পথচলা শুরু হোক এখানেই
            </h2>
            <p className="mt-2 text-sm text-sky-100">
              {settings.address} · হেল্পলাইন: {settings.phone || '+880 1711-759705'}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <Link
              to="/admission"
              className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl bg-[#F4A62A] px-5 py-2.5 text-sm font-extrabold text-[#123B67] shadow-sm transition hover:bg-[#f7b547] whitespace-nowrap"
            >
              ভর্তি আবেদন করুন
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={telHref}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 whitespace-nowrap"
            >
              <Phone className="h-4 w-4" />
              কল করুন
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
