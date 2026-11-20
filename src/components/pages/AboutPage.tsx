import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Languages,
  MapPin,
  Quote,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { usePublicData } from '../../context/PublicDataContext';
import { toBnDigits } from '../../i18n';
import { groupClassStages, resolveIslamicPrograms } from '../../lib/programDetails';
import { CAMPUS_IMAGES } from '../../types';
import { PageHeader, PageSkeleton } from '../PageHeader';

const PROGRAM_CARD_STYLES = [
  'border-[#C5E8D8] bg-[#EDF9F4] hover:border-[#087F5B]',
  'border-[#C8DDF2] bg-[#EDF4FB] hover:border-[#123B67]',
  'border-[#F8DFAF] bg-[#FFF8EA] hover:border-[#F4A62A]',
  'border-[#BFE8F7] bg-[#EBF8FD] hover:border-[#21A9D6]',
  'border-[#DDD1F5] bg-[#F5F0FF] hover:border-[#805AD5]',
  'border-[#C5E8D8] bg-[#EDF9F4] hover:border-[#087F5B]',
];

export const AboutPage: React.FC = () => {
  const { settings, faculty, isLoading } = usePublicData();

  const educationMediums = settings.educationMediums?.length
    ? settings.educationMediums
    : ['বাংলা ভার্সন', 'ইংরেজি ভার্সন', 'আরবি ভাষার সমন্বয়ে ট্রিলিংগুয়াল কারিকুলাম'];

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

  const shifts = settings.shifts?.length ? settings.shifts : ['মর্নিং শিফট', 'ডে শিফট'];

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

  const hasOfficialCodes = Boolean(
    settings.eiin?.trim() || settings.schoolCode?.trim() || settings.regNo?.trim()
  );

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[{ label: 'প্রতিষ্ঠান পরিচিতি' }]}
        badge={`স্থাপিত: ${toBnDigits(settings.establishedYear || '২০১৯')} খ্রি. · আধুনিক ও ইসলামিক শিক্ষাপ্রতিষ্ঠান`}
        icon={<Building2 className="h-3.5 w-3.5" />}
        title={settings.schoolNameBn}
        subtitle={
          settings.schoolSubtitleBn ||
          'বাংলা, ইংরেজি ও আরবি ভাষার সমন্বয়ে ট্রিলিংগুয়াল আধুনিক ও ইসলামিক শিক্ষা কার্যক্রম।'
        }
        accent="emerald"
        rightSlot={
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/admission"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#F4A62A] px-4 py-2.5 text-xs font-extrabold text-[#123B67] shadow-sm transition hover:bg-[#f7b547] sm:text-sm"
            >
              অনলাইন ভর্তি আবেদন
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/programs"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-xs transition hover:bg-white/20 sm:text-sm"
            >
              শিক্ষা কার্যক্রম
            </Link>
          </div>
        }
      />

      {isLoading ? (
        <PageSkeleton variant="cards" count={4} />
      ) : (
        <>
          {/* Verified Key Institutional Facts Bar (5 Harmonious Color Accents) */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-2xl border border-[#C5E8D8] bg-gradient-to-b from-[#EDF9F4] to-white p-4 text-center shadow-xs transition hover:-translate-y-0.5">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#087F5B] text-white shadow-xs">
                <Calendar className="h-5 w-5" />
              </div>
              <p className="mt-2.5 text-xs font-semibold text-[#526B78]">প্রতিষ্ঠার সাল</p>
              <p className="mt-0.5 text-lg font-extrabold text-[#087F5B] tabular-nums">
                {toBnDigits(settings.establishedYear || '২০১৯')} খ্রি.
              </p>
            </div>

            <div className="rounded-2xl border border-[#C8DDF2] bg-gradient-to-b from-[#EDF4FB] to-white p-4 text-center shadow-xs transition hover:-translate-y-0.5">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#123B67] text-white shadow-xs">
                <GraduationCap className="h-5 w-5" />
              </div>
              <p className="mt-2.5 text-xs font-semibold text-[#526B78]">সর্বোচ্চ শ্রেণি</p>
              <p className="mt-0.5 text-lg font-extrabold text-[#123B67]">
                {settings.highestClass || 'অষ্টম শ্রেণি'}
              </p>
            </div>

            <div className="rounded-2xl border border-[#F8DFAF] bg-gradient-to-b from-[#FFF8EA] to-white p-4 text-center shadow-xs transition hover:-translate-y-0.5">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#F4A62A] text-[#123B67] shadow-xs">
                <Clock className="h-5 w-5" />
              </div>
              <p className="mt-2.5 text-xs font-semibold text-[#526B78]">পাঠদান শিফট</p>
              <p className="mt-0.5 text-sm font-extrabold text-[#A66300] sm:text-base">
                {shifts.join(' ও ')}
              </p>
            </div>

            <div className="rounded-2xl border border-[#BFE8F7] bg-gradient-to-b from-[#EBF8FD] to-white p-4 text-center shadow-xs transition hover:-translate-y-0.5">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#21A9D6] text-white shadow-xs">
                <MapPin className="h-5 w-5" />
              </div>
              <p className="mt-2.5 text-xs font-semibold text-[#526B78]">অবস্থান</p>
              <p className="mt-0.5 text-sm font-extrabold text-[#0E7DA3]">তুলসীঘাট, গাইবান্ধা</p>
            </div>

            <div className="col-span-2 rounded-2xl border border-[#DDD1F5] bg-gradient-to-b from-[#F5F0FF] to-white p-4 text-center shadow-xs transition hover:-translate-y-0.5 sm:col-span-1">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#805AD5] text-white shadow-xs">
                <Users className="h-5 w-5" />
              </div>
              <p className="mt-2.5 text-xs font-semibold text-[#526B78]">অভিজ্ঞ শিক্ষকমণ্ডলী</p>
              <p className="mt-0.5 text-lg font-extrabold text-[#805AD5] tabular-nums">
                {toBnDigits(Math.max(faculty.length, 12))}+ জন
              </p>
            </div>
          </div>

          {/* Optional Official Codes */}
          {hasOfficialCodes && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {settings.eiin?.trim() && (
                <div className="flex items-center gap-3.5 rounded-2xl border border-[#D4E6DD] bg-white p-4 shadow-xs">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#087F5B]/10 text-[#087F5B]">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-[#526B78]">EIIN নম্বর</p>
                    <p className="text-lg font-extrabold text-[#123B67] tabular-nums">
                      {toBnDigits(settings.eiin)}
                    </p>
                  </div>
                </div>
              )}
              {settings.schoolCode?.trim() && (
                <div className="flex items-center gap-3.5 rounded-2xl border border-[#D4E6DD] bg-white p-4 shadow-xs">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#805AD5]/12 text-[#805AD5]">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-[#526B78]">প্রতিষ্ঠান কোড</p>
                    <p className="text-lg font-extrabold text-[#123B67] tabular-nums">
                      {toBnDigits(settings.schoolCode)}
                    </p>
                  </div>
                </div>
              )}
              {settings.regNo?.trim() && (
                <div className="flex items-center gap-3.5 rounded-2xl border border-[#D4E6DD] bg-white p-4 shadow-xs">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#21A9D6]/12 text-[#0E7DA3]">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-[#526B78]">রেজিস্ট্রেশন নম্বর</p>
                    <p className="text-lg font-extrabold text-[#123B67] tabular-nums">
                      {toBnDigits(settings.regNo)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main Overview + History */}
          <div className="grid grid-cols-1 gap-7 rounded-2xl border border-[#D4E6DD] bg-white p-6 shadow-xs sm:p-7 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="overflow-hidden rounded-2xl border border-[#DCE8E1] shadow-sm">
                <img
                  src={settings.aboutImageUrl || CAMPUS_IMAGES.courtyard}
                  alt={settings.schoolNameBn}
                  referrerPolicy="no-referrer"
                  className="h-72 w-full object-cover sm:h-80 lg:h-[380px]"
                />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-[#F2F8F5] px-4 py-2.5 text-xs">
                <span className="font-bold text-[#123B67]">{settings.schoolNameEn || 'Shah Islamic School And College'}</span>
                <span className="font-semibold text-[#087F5B]">তুলসীঘাট ক্যাম্পাস</span>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-7">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#087F5B]">
                  <Sparkles className="h-3.5 w-3.5 text-[#F4A62A]" />
                  প্রতিষ্ঠানের সারসংক্ষেপ
                </span>
                <h2 className="mt-1 text-xl font-extrabold text-[#123B67] sm:text-2xl">আমাদের পরিচিতি</h2>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="h-1 w-12 rounded-full bg-[#087F5B]" />
                  <span className="h-1 w-4 rounded-full bg-[#F4A62A]" />
                </div>
                <p className="mt-3.5 whitespace-pre-line text-sm leading-relaxed text-[#263B35] sm:text-[15px]">
                  {settings.aboutText}
                </p>
              </div>

              {settings.historyText && (
                <div className="border-t border-[#E8F1EC] pt-5">
                  <h2 className="text-xl font-extrabold text-[#123B67]">প্রতিষ্ঠানের ইতিহাস</h2>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="h-1 w-12 rounded-full bg-[#21A9D6]" />
                    <span className="h-1 w-4 rounded-full bg-[#805AD5]" />
                  </div>
                  <p className="mt-3.5 whitespace-pre-line text-sm leading-relaxed text-[#263B35] sm:text-[15px]">
                    {settings.historyText}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Mission & Vision */}
          {settings.missionText && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#123B67] via-[#174A6B] to-[#087F5B] p-6 text-white shadow-md sm:p-8">
              <div className="pointer-events-none absolute -top-16 -right-16 h-52 w-52 rounded-full bg-[#F4A62A]/20 blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-3.5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4A62A] text-[#123B67] shadow-sm">
                    <Target className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-xs font-bold tracking-wide text-[#F4A62A]">ভিশন ও মিশন</p>
                    <h2 className="text-xl font-extrabold sm:text-2xl">আমাদের লক্ষ্য ও উদ্দেশ্য</h2>
                  </div>
                </div>
                <p className="mt-4 max-w-4xl whitespace-pre-line text-sm leading-relaxed text-sky-50 sm:text-[15px]">
                  {settings.missionText}
                </p>
              </div>
            </div>
          )}

          {/* Academic Mediums, Classes, and Islamic Special Programs */}
          <section className="overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8F1EC] bg-[#F8FBF9] px-6 py-5">
              <div>
                <p className="text-xs font-bold text-[#087F5B]">
                  সমন্বিত শিক্ষা কাঠামো · {shifts.join(' ও ')}
                </p>
                <h2 className="mt-0.5 text-xl font-extrabold text-[#123B67]">
                  আধুনিক ও ইসলামিক শিক্ষা কার্যক্রম
                </h2>
              </div>
              <Link
                to="/programs"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#087F5B] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#06684A] whitespace-nowrap"
              >
                বিস্তারিত পেজ দেখুন
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 divide-y divide-[#EDF4F0] lg:grid-cols-12 lg:divide-x lg:divide-y-0">
              <div className="space-y-5 p-6 lg:col-span-5">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#123B67]">
                    <Languages className="h-4 w-4 text-[#21A9D6]" />
                    <span>শিক্ষার মাধ্যম</span>
                  </div>
                  <ul className="mt-3 space-y-2.5 text-sm text-[#263B35]">
                    {educationMediums.map((m) => (
                      <li key={m} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#087F5B]" />
                        <span className="font-medium">{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-[#EDF4F0] pt-4">
                  <p className="text-xs font-bold text-[#805AD5]">
                    পরিচালিত শ্রেণিসমূহ (সর্বোচ্চ: {settings.highestClass || 'অষ্টম শ্রেণি'})
                  </p>
                  <div className="mt-3 space-y-2.5">
                    {groupClassStages(classList).map((stg) => (
                      <div key={stg.stage} className="rounded-xl bg-[#F8FBF9] p-3">
                        <p className="text-xs font-bold text-[#123B67]">{stg.stage}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[#4C6470]">
                          {stg.classes.join(' · ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 lg:col-span-7">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#123B67]">
                    <BookOpen className="h-4 w-4 text-[#F4A62A]" />
                    <span>বিশেষ ইসলামিক শিক্ষা কার্যক্রম</span>
                  </div>
                  <span className="text-xs font-medium text-[#546E7A]">বিস্তারিত জানতে ক্লিক করুন</span>
                </div>
                <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {resolveIslamicPrograms(specialPrograms).map((prog, idx) => (
                    <Link
                      key={prog.slug}
                      to={`/programs?focus=${prog.slug}`}
                      className={`group flex items-start justify-between gap-3 rounded-xl border p-3.5 transition duration-150 hover:-translate-y-0.5 hover:shadow-xs ${
                        PROGRAM_CARD_STYLES[idx % PROGRAM_CARD_STYLES.length]
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#123B67] group-hover:text-[#087F5B]">
                          {toBnDigits(String(idx + 1).padStart(2, '0'))}. {prog.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#4E6774]">
                          {prog.shortDesc}
                        </p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#087F5B] transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Principal's Full Message */}
          {settings.principalMessage?.trim() && (
            <div className="rounded-2xl border border-[#D4E6DD] bg-white p-6 shadow-xs sm:p-7">
              <div className="mb-5 flex items-center justify-between border-b border-[#EDF3EF] pb-3.5">
                <div>
                  <p className="text-xs font-bold text-[#087F5B]">অধ্যক্ষের বাণী</p>
                  <h2 className="mt-0.5 text-xl font-extrabold text-[#123B67]">প্রতিষ্ঠান প্রধানের বক্তব্য</h2>
                  <div className="mt-1.5 h-1 w-14 rounded-full bg-[#F4A62A]" />
                </div>
                <Quote className="h-9 w-9 text-[#805AD5]/30" />
              </div>
              <div className="flex flex-col gap-6 md:flex-row md:items-start">
                {settings.principalPhotoUrl?.trim() && (
                  <img
                    src={settings.principalPhotoUrl}
                    alt={settings.principalName || 'অধ্যক্ষ'}
                    referrerPolicy="no-referrer"
                    className="h-36 w-36 shrink-0 rounded-2xl border-2 border-[#087F5B]/25 object-cover shadow-xs"
                  />
                )}
                <div>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-[#263B35] sm:text-[15px]">
                    “{settings.principalMessage}”
                  </p>
                  <div className="mt-4 inline-flex flex-col rounded-xl bg-[#F2F8F5] px-4 py-2.5">
                    {settings.principalName && (
                      <h3 className="text-base font-extrabold text-[#087F5B]">{settings.principalName}</h3>
                    )}
                    <p className="text-xs font-semibold text-[#58707C]">{settings.principalDesignation}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Related Pages Links */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#CFE2D7] bg-white p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#805AD5]/12 text-[#805AD5]">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-[#123B67]">
                  প্রতিষ্ঠানের একাডেমিক, পরিচালনা পর্ষদ ও শিক্ষকমণ্ডলী
                </h3>
                <p className="text-xs text-[#526B78]">
                  একাডেমিক কার্যক্রম, পরিচালনা কমিটি এবং শিক্ষকমণ্ডলী সম্পর্কে বিস্তারিত জানুন।
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/academic"
                className="rounded-xl bg-[#087F5B] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#06684A]"
              >
                একাডেমিক কার্যক্রম
              </Link>
              <Link
                to="/governing-body"
                className="rounded-xl bg-[#EAF2FA] px-4 py-2.5 text-xs font-bold text-[#123B67] transition hover:bg-[#123B67] hover:text-white"
              >
                পরিচালনা পর্ষদ
              </Link>
              <Link
                to="/faculty"
                className="rounded-xl bg-[#FEF5E4] px-4 py-2.5 text-xs font-bold text-[#A66300] transition hover:bg-[#F4A62A] hover:text-[#123B67]"
              >
                শিক্ষকমণ্ডলী পরিচিতি
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
