import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Clock,
  GraduationCap,
  Quote,
  Search,
  Share2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { usePublicData } from '../../context/PublicDataContext';
import { SHIFT_BN, toBnDigits } from '../../i18n';
import { EmptyState, PageHeader, PageSkeleton } from '../PageHeader';
import { useUIFeedback } from '../ToastContext';

interface ProfileModalData {
  name: string;
  designation: string;
  photoUrl?: string;
  qualification?: string;
  responsibility?: string;
  extra?: string;
  bio?: string;
  speech?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`;
  return (name.trim().slice(0, 2) || 'শি').toUpperCase();
}

const AVATAR_THEMES = [
  'bg-[#EDF9F4] text-[#087F5B] ring-[#087F5B]/25',
  'bg-[#EDF4FB] text-[#123B67] ring-[#123B67]/25',
  'bg-[#F5F0FF] text-[#805AD5] ring-[#805AD5]/25',
  'bg-[#EBF8FD] text-[#0E7DA3] ring-[#21A9D6]/30',
  'bg-[#FFF8EA] text-[#A66300] ring-[#F4A62A]/35',
];

const DEPT_BADGE_THEMES = [
  'bg-[#EDF9F4] text-[#087F5B]',
  'bg-[#EDF4FB] text-[#123B67]',
  'bg-[#F5F0FF] text-[#805AD5]',
  'bg-[#EBF8FD] text-[#0E7DA3]',
  'bg-[#FFF8EA] text-[#A66300]',
];

const ProfileModal: React.FC<{ profile: ProfileModalData | null; onClose: () => void }> = ({
  profile,
  onClose,
}) => {
  if (!profile) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#091C2B]/65 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="sheet-enter max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-[#123B67] to-[#087F5B] px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#F4A62A]" />
            <h3 className="text-base font-bold">বিস্তারিত পরিচিতি</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="rounded-xl p-1.5 transition hover:bg-white/15"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 text-center">
          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt={profile.name}
              referrerPolicy="no-referrer"
              className="mx-auto h-24 w-24 rounded-full object-cover ring-4 ring-[#087F5B]/20"
            />
          ) : (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#EDF9F4] text-2xl font-extrabold text-[#087F5B] ring-4 ring-[#087F5B]/15">
              {getInitials(profile.name)}
            </div>
          )}
          <h4 className="mt-3 text-lg font-extrabold text-[#123B67]">{profile.name}</h4>
          <p className="text-sm font-bold text-[#087F5B]">{profile.designation}</p>
          {profile.qualification && (
            <p className="mt-1.5 text-xs font-medium text-[#526B78]">
              শিক্ষাগত যোগ্যতা: {profile.qualification}
            </p>
          )}
          {profile.responsibility && (
            <p className="mt-1 text-xs font-semibold text-[#263B35]">
              দায়িত্ব: {profile.responsibility}
            </p>
          )}
          {profile.extra && <p className="mt-1 text-xs text-[#647E8B]">{profile.extra}</p>}
          {profile.bio && (
            <p className="mt-4 rounded-xl border border-[#DCE8E1] bg-[#F2F8F5] p-3.5 text-left text-xs leading-relaxed text-[#263B35]">
              {profile.bio}
            </p>
          )}
          {profile.speech && (
            <div className="mt-3 rounded-xl border border-[#C8DDF2] bg-[#EDF4FB] p-4 text-left">
              <Quote className="mb-1.5 h-4 w-4 text-[#21A9D6]" />
              <p className="text-xs italic leading-relaxed text-[#123B67]">“{profile.speech}”</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const FacultyPage: React.FC = () => {
  const { faculty, isLoading } = usePublicData();
  const [facultyDept, setFacultyDept] = useState<string>('সকল');
  const [search, setSearch] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<ProfileModalData | null>(null);

  const departments = useMemo(() => {
    const set = new Set<string>(['সকল']);
    faculty.forEach((f) => set.add(f.department));
    return Array.from(set);
  }, [faculty]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return faculty.filter((f) => {
      const deptOk = facultyDept === 'সকল' || f.department === facultyDept;
      const qOk =
        !q ||
        (f.nameBn || f.name).toLowerCase().includes(q) ||
        f.designation.toLowerCase().includes(q) ||
        f.subject.toLowerCase().includes(q) ||
        f.department.toLowerCase().includes(q);
      return deptOk && qOk;
    });
  }, [faculty, facultyDept, search]);

  return (
    <div className="space-y-4 sm:space-y-7">
      <PageHeader
        breadcrumbs={[{ label: 'শিক্ষকমণ্ডলী পরিচিতি' }]}
        badge={`মোট শিক্ষক: ${toBnDigits(faculty.length)} জন`}
        icon={<Users className="h-3.5 w-3.5" />}
        title="শিক্ষকমণ্ডলী পরিচিতি"
        subtitle="অভিজ্ঞ, নিষ্ঠাবান ও মেধাবী শিক্ষকমণ্ডলীর বিভাগভিত্তিক তালিকা ও পূর্ণাঙ্গ প্রোফাইল।"
        accent="sky"
        rightSlot={
          <Link
            to="/governing-body"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#F4A62A] px-4 py-2.5 text-xs font-extrabold text-[#123B67] shadow-sm transition hover:bg-[#f7b547] sm:text-sm"
          >
            পরিচালনা পর্ষদ দেখুন
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      {/* Search + Department Filter Bar */}
      <div className="space-y-3 rounded-2xl border border-[#D4E6DD] bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-0 flex-1 sm:min-w-[230px]">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#647E8B]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="শিক্ষকের নাম, বিষয় বা পদবি দিয়ে খুঁজুন..."
              className="w-full rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] py-2.5 pr-3.5 pl-10 text-sm text-[#263B35] focus:border-[#087F5B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087F5B]/20"
            />
          </div>
          <span className="rounded-xl bg-[#F2F8F5] px-3.5 py-2 text-xs font-bold text-[#123B67] tabular-nums">
            প্রদর্শিত: {toBnDigits(filtered.length)} জন
          </span>
        </div>

        {departments.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto border-t border-[#EDF4F0] pt-3 no-scrollbar sm:flex-wrap sm:gap-2">
            {departments.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setFacultyDept(dept)}
                className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  facultyDept === dept
                    ? 'bg-[#087F5B] text-white shadow-xs'
                    : 'bg-[#F2F8F5] text-[#123B67] hover:bg-[#E1F2E8]'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <PageSkeleton variant="cards" count={8} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7 text-[#087F5B]" />}
          title="কোনো শিক্ষকের তথ্য পাওয়া যায়নি"
          description="অনুসন্ধান শব্দ বা বিভাগ পরিবর্তন করে আবার চেষ্টা করুন।"
          action={
            (search || facultyDept !== 'সকল') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setFacultyDept('সকল');
                }}
                className="rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#06684A]"
              >
                সব শিক্ষক দেখুন
              </button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((teacher, idx) => (
            <article
              key={teacher.id}
              className="group flex flex-col justify-between rounded-2xl border border-[#DCE8E1] bg-white p-5 text-center shadow-xs transition duration-200 hover:-translate-y-1 hover:border-[#087F5B]/45 hover:shadow-md"
            >
              <div className="flex flex-col items-center">
                {teacher.photoUrl ? (
                  <img
                    src={teacher.photoUrl}
                    alt={teacher.nameBn || teacher.name}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="h-24 w-24 rounded-full object-cover ring-4 ring-[#087F5B]/15 transition group-hover:ring-[#087F5B]/40"
                  />
                ) : (
                  <div
                    className={`flex h-24 w-24 items-center justify-center rounded-full text-xl font-extrabold ring-4 ${
                      AVATAR_THEMES[idx % AVATAR_THEMES.length]
                    }`}
                  >
                    {getInitials(teacher.nameBn || teacher.name)}
                  </div>
                )}

                <span
                  className={`mt-3 rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${
                    DEPT_BADGE_THEMES[idx % DEPT_BADGE_THEMES.length]
                  }`}
                >
                  {teacher.department}
                </span>

                <Link
                  to={`/faculty/${teacher.id}`}
                  className="mt-2 text-base font-extrabold text-[#123B67] transition hover:text-[#087F5B]"
                >
                  {teacher.nameBn || teacher.name}
                </Link>
                <p className="text-xs font-bold text-[#087F5B]">{teacher.designation}</p>
                <p className="mt-1.5 text-xs font-medium text-[#4A6470]">
                  বিষয়: <strong className="text-[#263B35]">{teacher.subject}</strong>
                </p>
                {teacher.qualification && (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-[#647E8B]">
                    {teacher.qualification}
                  </p>
                )}
                <p className="mt-1 text-[11px] font-medium text-[#647E8B] tabular-nums">
                  {SHIFT_BN[teacher.shift] || teacher.shift}
                  {teacher.experienceYears !== undefined
                    ? ` · অভিজ্ঞতা ${toBnDigits(teacher.experienceYears)} বছর`
                    : ''}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#EDF4F0] pt-3.5">
                <Link
                  to={`/faculty/${teacher.id}`}
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#087F5B] px-2.5 py-2 text-xs font-bold text-white transition hover:bg-[#06684A]"
                >
                  প্রোফাইল
                  <ArrowRight className="h-3 w-3" />
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedProfile({
                      name: teacher.nameBn || teacher.name,
                      designation: `${teacher.designation} (${teacher.department})`,
                      photoUrl: teacher.photoUrl,
                      qualification: teacher.qualification,
                      responsibility: teacher.responsibility || `পাঠদানের বিষয়: ${teacher.subject}`,
                      extra: `${SHIFT_BN[teacher.shift] || teacher.shift}${
                        teacher.experienceYears !== undefined
                          ? ` · শিক্ষকতার অভিজ্ঞতা: ${toBnDigits(teacher.experienceYears)} বছর`
                          : ''
                      }`,
                      bio: teacher.bio,
                    })
                  }
                  className="rounded-xl bg-[#F2F8F5] px-2.5 py-2 text-xs font-bold text-[#123B67] transition hover:bg-[#123B67] hover:text-white"
                >
                  সংক্ষিপ্ত
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <ProfileModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />
    </div>
  );
};

export const TeacherDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { faculty, settings, isLoading } = usePublicData();
  const { notify } = useUIFeedback();

  const teacher = faculty.find((f) => f.id === id);

  const relatedTeachers = useMemo(() => {
    if (!teacher) return [];
    const sameDept = faculty.filter((f) => f.id !== teacher.id && f.department === teacher.department);
    const others = faculty.filter((f) => f.id !== teacher.id && f.department !== teacher.department);
    return [...sameDept, ...others].slice(0, 4);
  }, [faculty, teacher]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify('শিক্ষকের প্রোফাইল লিংক কপি করা হয়েছে।', 'success');
    } catch {
      notify('লিংক কপি করা যায়নি।', 'warning');
    }
  };

  if (isLoading) {
    return <PageSkeleton variant="detail" />;
  }

  if (!teacher) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: 'শিক্ষকমণ্ডলী', to: '/faculty' },
            { label: 'তথ্য পাওয়া যায়নি' },
          ]}
          title="শিক্ষকের প্রোফাইল পাওয়া যায়নি"
          accent="sky"
        />
        <EmptyState
          icon={<Users className="h-7 w-7 text-[#087F5B]" />}
          title="অনুরোধকৃত শিক্ষকের তথ্য খুঁজে পাওয়া যায়নি"
          description="হয়তো লিংকটি পরিবর্তিত হয়েছে অথবা শিক্ষক তালিকা হালনাগাদ করা হয়েছে।"
          action={
            <Link
              to="/faculty"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#06684A]"
            >
              <ArrowLeft className="h-4 w-4" />
              সকল শিক্ষকের তালিকায় ফিরুন
            </Link>
          }
        />
      </div>
    );
  }

  const displayName = teacher.nameBn || teacher.name;

  return (
    <div className="space-y-4 sm:space-y-7">
      <PageHeader
        breadcrumbs={[
          { label: 'শিক্ষকমণ্ডলী', to: '/faculty' },
          { label: displayName },
        ]}
        badge={`${teacher.department} বিভাগ`}
        icon={<GraduationCap className="h-3.5 w-3.5" />}
        title={displayName}
        subtitle={`${teacher.designation} · ${settings.schoolNameBn}`}
        accent="sky"
        rightSlot={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/15 px-4 py-2 text-xs font-bold text-white backdrop-blur-xs transition hover:bg-white/25"
            >
              <Share2 className="h-3.5 w-3.5" />
              প্রোফাইল শেয়ার
            </button>
            <Link
              to="/faculty"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#F4A62A] px-4 py-2 text-xs font-extrabold text-[#123B67] transition hover:bg-[#f7b547]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              শিক্ষক তালিকা
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
        {/* Main Profile Column */}
        <div className="space-y-6 lg:col-span-8">
          <div className="rounded-2xl border border-[#D4E6DD] bg-white p-6 shadow-xs sm:p-7">
            <div className="flex flex-col items-center gap-6 border-b border-[#E8F1EC] pb-6 sm:flex-row sm:items-start">
              {teacher.photoUrl ? (
                <img
                  src={teacher.photoUrl}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="h-32 w-32 shrink-0 rounded-2xl object-cover shadow-sm ring-4 ring-[#087F5B]/15"
                />
              ) : (
                <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#087F5B] to-[#123B67] text-3xl font-extrabold text-white shadow-sm">
                  {getInitials(displayName)}
                </div>
              )}

              <div className="text-center sm:text-left">
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#EDF9F4] px-2.5 py-1 text-xs font-bold text-[#087F5B]">
                  <BookOpen className="h-3.5 w-3.5" />
                  {teacher.department} বিভাগ
                </span>
                <h2 className="mt-2 text-2xl font-extrabold text-[#123B67]">{displayName}</h2>
                <p className="mt-0.5 text-sm font-bold text-[#087F5B]">{teacher.designation}</p>
                {teacher.name && teacher.nameBn && teacher.name !== teacher.nameBn && (
                  <p className="mt-0.5 text-xs font-medium text-[#526B78]">{teacher.name}</p>
                )}
              </div>
            </div>

            {/* 4 Colorful Metadata Cards */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-3.5">
              <div className="flex items-start gap-3 rounded-2xl border border-[#C5E8D8] bg-[#EDF9F4] p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#087F5B] text-white">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold text-[#087F5B]">পাঠদানের বিষয়</p>
                  <p className="mt-0.5 text-sm font-extrabold text-[#123B67]">{teacher.subject}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-[#C8DDF2] bg-[#EDF4FB] p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#123B67] text-white">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold text-[#123B67]">শিক্ষাগত যোগ্যতা</p>
                  <p className="mt-0.5 text-sm font-extrabold text-[#123B67]">
                    {teacher.qualification || 'স্নাতক / স্নাতকোত্তর'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-[#F8DFAF] bg-[#FFF8EA] p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4A62A] text-[#123B67]">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold text-[#A66300]">কর্মরত শিফট ও অভিজ্ঞতা</p>
                  <p className="mt-0.5 text-sm font-extrabold text-[#123B67] tabular-nums">
                    {SHIFT_BN[teacher.shift] || teacher.shift}
                    {teacher.experienceYears !== undefined
                      ? ` · ${toBnDigits(teacher.experienceYears)} বছর`
                      : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-[#DDD1F5] bg-[#F5F0FF] p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#805AD5] text-white">
                  <Briefcase className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold text-[#805AD5]">বিশেষ দায়িত্ব</p>
                  <p className="mt-0.5 text-sm font-extrabold text-[#123B67]">
                    {teacher.responsibility || `${teacher.subject} বিষয়ক শ্রেণি পাঠদান`}
                  </p>
                </div>
              </div>
            </div>

            {/* Bio / Statement */}
            <div className="mt-6 rounded-2xl border border-[#E2EDE7] bg-[#F8FBF9] p-5">
              <h3 className="text-sm font-extrabold text-[#123B67]">সংক্ষিপ্ত পরিচিতি ও অভিজ্ঞতা</h3>
              <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-[#263B35]">
                {teacher.bio?.trim()
                  ? teacher.bio
                  : `${displayName} ${settings.schoolNameBn}-এর ${teacher.department} বিভাগের একজন নিবেদিতপ্রাণ ${teacher.designation}। তিনি শিক্ষার্থীদের নৈতিক মানোন্নয়ন, শৃঙ্খলা এবং ${teacher.subject} বিষয়ে দক্ষতা অর্জনে নিয়মিত পাঠদান ও দিকনির্দেশনা প্রদান করে আসছেন।`}
              </p>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Related Teachers + Quick Links */}
        <aside className="space-y-5 lg:col-span-4">
          <div className="rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs">
            <h3 className="text-base font-extrabold text-[#123B67]">অন্যান্য শিক্ষকমণ্ডলী</h3>
            <div className="mt-1.5 h-1 w-10 rounded-full bg-[#21A9D6]" />
            <div className="mt-4 space-y-3">
              {relatedTeachers.map((rel, i) => (
                <Link
                  key={rel.id}
                  to={`/faculty/${rel.id}`}
                  className="flex items-center gap-3 rounded-xl border border-[#E8F1EC] bg-[#FAFDFB] p-3 transition hover:border-[#087F5B] hover:bg-[#EDF9F4]"
                >
                  {rel.photoUrl ? (
                    <img
                      src={rel.photoUrl}
                      alt={rel.nameBn || rel.name}
                      referrerPolicy="no-referrer"
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                        AVATAR_THEMES[i % AVATAR_THEMES.length]
                      }`}
                    >
                      {getInitials(rel.nameBn || rel.name)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#123B67]">
                      {rel.nameBn || rel.name}
                    </p>
                    <p className="truncate text-xs text-[#087F5B]">
                      {rel.designation} · {rel.subject}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-[#123B67] to-[#087F5B] p-5 text-white shadow-sm">
            <Award className="h-7 w-7 text-[#F4A62A]" />
            <h3 className="mt-2 text-base font-extrabold">একাডেমিক ও ভর্তি তথ্য</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-sky-100">
              সাপ্তাহিক ক্লাস রুটিন দেখতে বা অনলাইন ভর্তি আবেদন করতে নিচের লিংক ব্যবহার করুন।
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                to="/academic/class-routine"
                className="rounded-xl bg-white/15 px-3.5 py-2 text-center text-xs font-bold text-white transition hover:bg-white/25"
              >
                সাপ্তাহিক ক্লাস রুটিন দেখুন
              </Link>
              <Link
                to="/admission"
                className="rounded-xl bg-[#F4A62A] px-3.5 py-2 text-center text-xs font-extrabold text-[#123B67] transition hover:bg-[#f7b547]"
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

export const GoverningBodyPage: React.FC = () => {
  const { governingBody, isLoading } = usePublicData();
  const [selectedProfile, setSelectedProfile] = useState<ProfileModalData | null>(null);

  return (
    <div className="space-y-7">
      <PageHeader
        breadcrumbs={[{ label: 'পরিচালনা পর্ষদ' }]}
        badge={`সম্মানিত সদস্য: ${toBnDigits(governingBody.length)} জন`}
        icon={<ShieldCheck className="h-3.5 w-3.5" />}
        title="প্রতিষ্ঠান পরিচালনা পর্ষদ"
        subtitle="সভাপতি, সহ-সভাপতি, সম্পাদক ও পরিচালনা পর্ষদের সম্মানিত সদস্যদের পরিচিতি ও বাণী।"
        accent="purple"
        rightSlot={
          <Link
            to="/faculty"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#F4A62A] px-4 py-2.5 text-xs font-extrabold text-[#123B67] shadow-sm transition hover:bg-[#f7b547] sm:text-sm"
          >
            শিক্ষকমণ্ডলী দেখুন
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      {isLoading ? (
        <PageSkeleton variant="cards" count={6} />
      ) : governingBody.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-7 w-7 text-[#805AD5]" />}
          title="পরিচালনা পর্ষদের তথ্য এখনো যুক্ত করা হয়নি"
          description="অ্যাডমিন প্যানেল থেকে পরিচালনা পর্ষদের সদস্য যুক্ত করলে এখানে প্রদর্শিত হবে।"
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {governingBody.map((member, idx) => (
            <article
              key={member.id}
              className="flex flex-col justify-between rounded-2xl border border-[#DCE8E1] bg-white p-6 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-[#805AD5]/45 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="h-18 w-18 shrink-0 rounded-2xl object-cover ring-2 ring-[#805AD5]/25"
                      />
                    ) : (
                      <div
                        className={`flex h-18 w-18 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold ring-2 ${
                          AVATAR_THEMES[idx % AVATAR_THEMES.length]
                        }`}
                      >
                        {getInitials(member.name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="text-base font-extrabold text-[#123B67]">{member.name}</h2>
                      <p className="text-xs font-bold text-[#805AD5]">{member.designation}</p>
                      {member.qualification && (
                        <p className="mt-0.5 text-[11px] text-[#526B78]">{member.qualification}</p>
                      )}
                    </div>
                  </div>
                  {member.speech && <Quote className="h-6 w-6 shrink-0 text-[#F4A62A]/60" />}
                </div>

                {member.speech && (
                  <p className="mt-4 rounded-xl border border-[#E6F0EA] bg-[#F8FBF9] p-3.5 text-xs leading-relaxed text-[#263B35]">
                    “{member.speech}”
                  </p>
                )}

                {(member.joinedDate || member.termEndDate) && (
                  <div className="mt-3 text-[11px] font-medium text-[#647E8B] tabular-nums">
                    {member.joinedDate && <span>যোগদান: {toBnDigits(member.joinedDate)}</span>}
                    {member.joinedDate && member.termEndDate && <span> · </span>}
                    {member.termEndDate && <span>মেয়াদকাল: {toBnDigits(member.termEndDate)}</span>}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedProfile({
                    name: member.name,
                    designation: member.designation,
                    photoUrl: member.photoUrl,
                    qualification: member.qualification,
                    responsibility: member.responsibility,
                    extra: member.joinedDate
                      ? `যোগদান: ${toBnDigits(member.joinedDate)}${
                          member.termEndDate ? ` · মেয়াদকাল: ${toBnDigits(member.termEndDate)}` : ''
                        }`
                      : undefined,
                    bio: member.bio,
                    speech: member.speech,
                  })
                }
                className="mt-5 w-full rounded-xl bg-[#F5F0FF] py-2.5 text-xs font-bold text-[#805AD5] transition hover:bg-[#805AD5] hover:text-white"
              >
                বিস্তারিত পরিচিতি দেখুন
              </button>
            </article>
          ))}
        </div>
      )}

      <ProfileModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />
    </div>
  );
};
