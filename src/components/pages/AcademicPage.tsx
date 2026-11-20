import React, { useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  GraduationCap,
  Languages,
  Search,
} from 'lucide-react';
import { usePublicData } from '../../context/PublicDataContext';
import { labelClass, labelDay, labelSection, RESOURCE_TYPE_BN, toBnDigits } from '../../i18n';
import { groupClassStages, resolveIslamicPrograms } from '../../lib/programDetails';
import { BD_CLASSES, BD_SECTIONS } from '../../types';
import { EmptyState, PageHeader, PageSkeleton } from '../PageHeader';

interface AcademicPageProps {
  section?: 'class_routine' | 'exam_routine' | 'syllabus' | 'calendar';
}

const SECTION_META: Record<
  NonNullable<AcademicPageProps['section']>,
  { label: string; desc: string }
> = {
  class_routine: {
    label: 'সাপ্তাহিক ক্লাস রুটিন',
    desc: 'শ্রেণি ও শাখাভিত্তিক নিয়মিত ক্লাস সময়সূচি ও দায়িত্বপ্রাপ্ত শিক্ষক তালিকা।',
  },
  exam_routine: {
    label: 'পরীক্ষার রুটিন',
    desc: 'অর্ধ-বার্ষিক, বার্ষিক ও মডেল টেস্ট পরীক্ষার তারিখ ও সময়সূচি।',
  },
  syllabus: {
    label: 'সিলেবাস ও পাঠ্যবই',
    desc: 'ডিজিটাল সিলেবাস, লেকচার নোট ও সহায়ক পাঠ্যসামগ্রী ডাউনলোড করুন।',
  },
  calendar: {
    label: 'ক্যালেন্ডার ও ছুটির তালিকা',
    desc: 'বার্ষিক একাডেমিক কার্যক্রম ও সরকারি ছুটির পূর্ণাঙ্গ নির্দেশিকা।',
  },
};

const RESOURCE_BADGE_COLORS = [
  'bg-[#EDF9F4] text-[#087F5B]',
  'bg-[#EDF4FB] text-[#123B67]',
  'bg-[#FFF8EA] text-[#A66300]',
  'bg-[#EBF8FD] text-[#0E7DA3]',
  'bg-[#F5F0FF] text-[#805AD5]',
];

export const AcademicPage: React.FC<AcademicPageProps> = ({ section = 'class_routine' }) => {
  const { settings, routines, libraryItems, isLoading } = usePublicData();
  const [routineClass, setRoutineClass] = useState<string>('Class 6');
  const [routineSection, setRoutineSection] = useState<string>('Padma');
  const [syllabusClass, setSyllabusClass] = useState<string>('ALL');
  const [syllabusQuery, setSyllabusQuery] = useState<string>('');

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

  const visibleRoutines = useMemo(() => {
    const targetType = section === 'exam_routine' ? 'exam' : 'class';
    return routines.filter(
      (r) =>
        r.type === targetType &&
        r.className === routineClass &&
        (targetType === 'exam' || r.section === routineSection)
    );
  }, [routines, section, routineClass, routineSection]);

  const filteredSyllabus = useMemo(() => {
    const q = syllabusQuery.trim().toLowerCase();
    return libraryItems.filter((item) => {
      const matchClass = syllabusClass === 'ALL' || item.classLevel === syllabusClass;
      const matchQ =
        !q ||
        (item.titleBn || item.title).toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        (item.author || '').toLowerCase().includes(q);
      return matchClass && matchQ;
    });
  }, [libraryItems, syllabusClass, syllabusQuery]);

  const tabs = [
    {
      to: '/academic/class-routine',
      label: 'ক্লাস রুটিন',
      match: section === 'class_routine',
      icon: CalendarDays,
      activeBg: 'bg-[#087F5B] text-white shadow-sm',
    },
    {
      to: '/academic/exam-routine',
      label: 'পরীক্ষার রুটিন',
      match: section === 'exam_routine',
      icon: FileSpreadsheet,
      activeBg: 'bg-[#123B67] text-white shadow-sm',
    },
    {
      to: '/academic/syllabus',
      label: 'সিলেবাস ও পাঠ্যবই',
      match: section === 'syllabus',
      icon: BookOpen,
      activeBg: 'bg-[#805AD5] text-white shadow-sm',
    },
    {
      to: '/academic/calendar',
      label: 'ক্যালেন্ডার ও ছুটি',
      match: section === 'calendar',
      icon: Calendar,
      activeBg: 'bg-[#21A9D6] text-white shadow-sm',
    },
  ];

  const currentMeta = SECTION_META[section];

  return (
    <div className="space-y-7">
      <PageHeader
        breadcrumbs={[
          { label: 'একাডেমিক কার্যক্রম', to: '/academic' },
          { label: currentMeta.label },
        ]}
        badge={`একাডেমিক পোর্টাল · প্লে গ্রুপ – ${settings.highestClass || 'অষ্টম শ্রেণি'}`}
        icon={<GraduationCap className="h-3.5 w-3.5" />}
        title="একাডেমিক ও ইসলামিক শিক্ষা কার্যক্রম"
        subtitle={currentMeta.desc}
        accent="navy"
        rightSlot={
          <Link
            to="/programs"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#F4A62A] px-4 py-2.5 text-xs font-extrabold text-[#123B67] shadow-sm transition hover:bg-[#f7b547] sm:text-sm"
          >
            বিস্তারিত পাঠ্যক্রম
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      {/* URL-backed Colorful Sub-Navigation Tabs */}
      <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-[#D4E6DD] bg-white p-3 shadow-xs sm:grid-cols-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition sm:text-sm ${
                tab.match
                  ? tab.activeBg
                  : 'bg-[#F2F8F5] text-[#123B67] hover:bg-[#E3F3EA]'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Main Active Tab Workspace */}
      <div className="rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs sm:p-7">
        {isLoading ? (
          <PageSkeleton variant="table" count={5} />
        ) : (
          <>
            {(section === 'class_routine' || section === 'exam_routine') && (
              <div>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#E8F1EC] pb-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-[#123B67] sm:text-xl">
                      {section === 'exam_routine' ? 'পরীক্ষার সময়সূচি' : 'সাপ্তাহিক ক্লাস রুটিন'}
                    </h2>
                    <p className="mt-0.5 text-xs text-[#526B78]">
                      শ্রেণি ও শাখা নির্বাচন করে হালনাগাদ সময়সূচি দেখুন
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <select
                      value={routineClass}
                      onChange={(e) => setRoutineClass(e.target.value)}
                      className="rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] px-3.5 py-2.5 text-xs font-bold text-[#123B67] focus:border-[#087F5B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087F5B]/20"
                    >
                      {BD_CLASSES.map((c) => (
                        <option key={c} value={c}>
                          {labelClass(c)}
                        </option>
                      ))}
                    </select>
                    {section === 'class_routine' && (
                      <select
                        value={routineSection}
                        onChange={(e) => setRoutineSection(e.target.value)}
                        className="rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] px-3.5 py-2.5 text-xs font-bold text-[#123B67] focus:border-[#087F5B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087F5B]/20"
                      >
                        {BD_SECTIONS.map((sec) => (
                          <option key={sec} value={sec}>
                            শাখা: {labelSection(sec)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {visibleRoutines.length === 0 ? (
                  <EmptyState
                    icon={<CalendarDays className="h-7 w-7 text-[#087F5B]" />}
                    title="নির্বাচিত শ্রেণির জন্য কোনো রুটিন পাওয়া যায়নি"
                    description={`${labelClass(routineClass)}-এর জন্য এখনো রুটিন প্রকাশ করা হয়নি। অন্য শ্রেণি বা শাখা নির্বাচন করে দেখতে পারেন।`}
                  />
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-[#DCE8E1]">
                    <table className="w-full min-w-[580px] text-left text-xs sm:text-sm">
                      <thead className="bg-gradient-to-r from-[#123B67] to-[#087F5B] text-white">
                        <tr>
                          <th className="px-4 py-3.5 font-bold">
                            {section === 'exam_routine' ? 'তারিখ' : 'বার'}
                          </th>
                          <th className="px-4 py-3.5 font-bold">সময়</th>
                          <th className="px-4 py-3.5 font-bold">বিষয়</th>
                          <th className="px-4 py-3.5 font-bold">
                            {section === 'exam_routine' ? 'পরীক্ষার নাম' : 'শিক্ষক'}
                          </th>
                          <th className="px-4 py-3.5 font-bold">কক্ষ নং</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EAF2ED] bg-white">
                        {visibleRoutines.map((r) => (
                          <tr key={r.id} className="transition hover:bg-[#F2F8F5]">
                            <td className="px-4 py-3.5 font-bold text-[#123B67]">
                              {labelDay(r.dayOrDate)}
                            </td>
                            <td className="px-4 py-3.5 font-medium text-[#263B35] tabular-nums">
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#EBF8FD] px-2.5 py-1 text-xs font-bold text-[#0E7DA3]">
                                <Clock className="h-3.5 w-3.5" />
                                {toBnDigits(r.timeSlot)}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-extrabold text-[#087F5B]">{r.subject}</td>
                            <td className="px-4 py-3.5 font-medium text-[#263B35]">
                              {section === 'exam_routine' ? r.examName || '—' : r.teacherName || '—'}
                            </td>
                            <td className="px-4 py-3.5 font-bold text-[#805AD5] tabular-nums">
                              {toBnDigits(r.room || '—')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {section === 'syllabus' && (
              <div>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#E8F1EC] pb-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-[#123B67] sm:text-xl">
                      ডিজিটাল সিলেবাস, পাঠ্যবই ও লেকচার নোট
                    </h2>
                    <p className="mt-0.5 text-xs text-[#526B78] tabular-nums">
                      মোট {toBnDigits(filteredSyllabus.length)}টি শিক্ষাসামগ্রী পাওয়া গেছে
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#647E8B]" />
                      <input
                        value={syllabusQuery}
                        onChange={(e) => setSyllabusQuery(e.target.value)}
                        placeholder="বিষয় বা শিরোনাম খুঁজুন..."
                        className="w-52 rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] py-2 pr-3 pl-9 text-xs text-[#263B35] focus:border-[#805AD5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#805AD5]/20"
                      />
                    </div>
                    <select
                      value={syllabusClass}
                      onChange={(e) => setSyllabusClass(e.target.value)}
                      className="rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] px-3 py-2 text-xs font-bold text-[#123B67] focus:border-[#805AD5] focus:outline-none"
                    >
                      <option value="ALL">সকল শ্রেণি</option>
                      {BD_CLASSES.map((c) => (
                        <option key={c} value={c}>
                          {labelClass(c)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredSyllabus.length === 0 ? (
                  <EmptyState
                    icon={<BookOpen className="h-7 w-7 text-[#805AD5]" />}
                    title="কোনো সিলেবাস বা পাঠ্যসামগ্রী পাওয়া যায়নি"
                    description="অন্য শ্রেণি নির্বাচন করুন অথবা অনুসন্ধান শব্দ পরিবর্তন করে পুনরায় চেষ্টা করুন।"
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredSyllabus.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex flex-col justify-between rounded-2xl border border-[#DCE8E1] bg-[#FAFDFB] p-5 transition hover:-translate-y-0.5 hover:border-[#805AD5]/40 hover:shadow-sm"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                                RESOURCE_BADGE_COLORS[idx % RESOURCE_BADGE_COLORS.length]
                              }`}
                            >
                              {RESOURCE_TYPE_BN[item.resourceType] || item.resourceType}
                            </span>
                            <span className="text-[11px] font-bold text-[#526B78]">
                              {labelClass(item.classLevel)}
                            </span>
                          </div>
                          <h3 className="mt-3 text-sm font-extrabold text-[#123B67]">
                            {item.titleBn || item.title}
                          </h3>
                          <p className="mt-1 text-xs font-semibold text-[#087F5B]">
                            বিষয়: {item.subject} {item.author ? `· ${item.author}` : ''}
                          </p>
                          {item.description && (
                            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#4C6470]">
                              {item.description}
                            </p>
                          )}
                        </div>
                        {item.resourceUrl && (
                          <a
                            href={item.resourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#123B67] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#087F5B]"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            পড়ুন / ডাউনলোড করুন
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {section === 'calendar' && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-[#C5E8D8] bg-gradient-to-b from-[#EDF9F4] to-white p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#087F5B] text-white shadow-xs">
                      <Calendar className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold text-[#087F5B]">বার্ষিক শিক্ষা পরিকল্পনা</p>
                      <h2 className="text-lg font-extrabold text-[#123B67]">একাডেমিক ক্যালেন্ডার</h2>
                    </div>
                  </div>
                  <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[#263B35]">
                    {settings.academicCalendarNote}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#DDD1F5] bg-gradient-to-b from-[#F5F0FF] to-white p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#805AD5] text-white shadow-xs">
                      <Clock className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold text-[#805AD5]">সরকারি ও প্রতিষ্ঠানিক ছুটি</p>
                      <h2 className="text-lg font-extrabold text-[#123B67]">বার্ষিক ছুটির তালিকা</h2>
                    </div>
                  </div>
                  <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[#263B35]">
                    {settings.holidayListNote}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Institutional Academic & Islamic Education Overview */}
      <section className="overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8F1EC] bg-[#F8FBF9] px-6 py-4">
          <div>
            <p className="text-xs font-bold text-[#087F5B]">
              পাঠ্যক্রম কাঠামো · প্লে গ্রুপ – {settings.highestClass || 'অষ্টম শ্রেণি'}
            </p>
            <h2 className="mt-0.5 text-lg font-extrabold text-[#123B67]">
              আধুনিক ও ইসলামিক শিক্ষা কার্যক্রম
            </h2>
          </div>
          <Link
            to="/programs"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#06684A] whitespace-nowrap"
          >
            বিস্তারিত পাঠ্যক্রম পেজ
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 divide-y divide-[#EDF4F0] lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {/* শিক্ষার মাধ্যম ও শিফট */}
          <div className="p-6">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#087F5B]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EDF9F4]">
                <Languages className="h-4 w-4" />
              </span>
              <span>শিক্ষার মাধ্যম ও শিফট</span>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm text-[#263B35]">
              {educationMediums.map((m) => (
                <li key={m} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#087F5B]" />
                  <span className="font-medium">{m}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-xl bg-[#FFF8EA] px-3.5 py-2.5 text-xs font-bold text-[#123B67]">
              শিফটসমূহ: <span className="text-[#A66300]">{shifts.join(' ও ')}</span>
            </div>
          </div>

          {/* শ্রেণিভিত্তিক স্তর বিন্যাস */}
          <div className="p-6">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#123B67]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EDF4FB]">
                <GraduationCap className="h-4 w-4" />
              </span>
              <span>শ্রেণিভিত্তিক স্তর</span>
            </div>
            <div className="mt-4 space-y-3">
              {groupClassStages(classList).map((stg) => (
                <div
                  key={stg.stage}
                  className="rounded-xl border border-[#EBF2EE] bg-[#FAFDFB] p-3"
                >
                  <p className="text-xs font-extrabold text-[#123B67]">{stg.stage}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#4C6470]">
                    {stg.classes.join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ইসলামিক বিশেষ শিক্ষা কার্যক্রম */}
          <div className="p-6">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#805AD5]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F0FF]">
                <BookOpen className="h-4 w-4" />
              </span>
              <span>বিশেষ ইসলামিক শিক্ষা</span>
            </div>
            <div className="mt-4 divide-y divide-[#F0F6F3]">
              {resolveIslamicPrograms(specialPrograms).map((prog, idx) => (
                <Link
                  key={prog.slug}
                  to={`/programs?focus=${prog.slug}`}
                  className="group flex items-center justify-between gap-2 py-2.5 text-xs font-bold text-[#123B67] transition hover:text-[#087F5B]"
                >
                  <span>
                    {toBnDigits(String(idx + 1).padStart(2, '0'))}. {prog.title}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#89A598] transition-transform group-hover:translate-x-0.5 group-hover:text-[#087F5B]" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
