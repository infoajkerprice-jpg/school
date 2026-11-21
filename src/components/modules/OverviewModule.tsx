import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  Bell,
  BookOpen,
  Briefcase,
  Bus,
  ClipboardCheck,
  Database,
  GraduationCap,
  IdCard,
  Image as ImageIcon,
  MessageSquare,
  Settings,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { initializeSchoolDatabase } from '../../lib/seedData';
import { useUIFeedback } from '../ToastContext';
import {
  ADMISSION_STATUS_BN,
  formatBdtBn,
  labelClass,
  NOTICE_CATEGORY_BN,
  toBnDigits,
} from '../../i18n';
import {
  BD_CLASSES,
  DEFAULT_SITE_SETTINGS,
  type AdmissionApplication,
  type AttendanceRecord,
  type ExamResult,
  type FacultyPublic,
  type FeeInvoice,
  type FinancialEntry,
  type NoticeItem,
  type SiteSettings,
  type StudentRecord,
  type UserAccount,
} from '../../types';

interface Props {
  currentUser: UserAccount;
  onNavigateTab?: (tabId: string) => void;
}

const CHART_COLORS = ['#087F5B', '#123B67', '#21A9D6', '#805AD5', '#F4A62A'];

const MONTH_BN = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];

export const OverviewModule: React.FC<Props> = ({ currentUser, onNavigateTab }) => {
  const { notify } = useUIFeedback();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [faculty, setFaculty] = useState<FacultyPublic[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionApplication[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [fees, setFees] = useState<FeeInvoice[]>([]);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const isAdmin = currentUser.role === 'admin';
  const isTeacher = currentUser.role === 'teacher';
  const isStudent = currentUser.role === 'student';
  const isParent = currentUser.role === 'parent';

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    const timer = window.setTimeout(() => setHydrated(true), 600);

    unsubs.push(
      onSnapshot(doc(db, 'site_settings', 'main'), (snap) => {
        if (snap.exists()) {
          const remote = snap.data() as SiteSettings;
          if ((remote.schoolNameBn || '').includes('ঢাকা হেরিটেজ')) {
            setSettings(DEFAULT_SITE_SETTINGS);
          } else {
            setSettings({ ...DEFAULT_SITE_SETTINGS, ...remote });
          }
        }
        setHydrated(true);
      })
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'faculty'),
        (s) => setFaculty(s.docs.map((d) => ({ id: d.id, ...d.data() } as FacultyPublic))),
        (e) => handleFirestoreError(e, OperationType.LIST, 'faculty')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'notices'),
        (s) =>
          setNotices(
            s.docs
              .map((d) => ({ id: d.id, ...d.data() } as NoticeItem))
              .sort((a, b) => b.publishedDate.localeCompare(a.publishedDate))
          ),
        (e) => handleFirestoreError(e, OperationType.LIST, 'notices')
      )
    );

    if (isAdmin || isTeacher) {
      unsubs.push(
        onSnapshot(
          collection(db, 'students'),
          (s) => setStudents(s.docs.map((d) => ({ id: d.id, ...d.data() } as StudentRecord))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'students')
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'attendance'),
          (s) => setAttendance(s.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'attendance')
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'published_results'),
          (s) => setResults(s.docs.map((d) => ({ id: d.id, ...d.data() } as ExamResult))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'published_results')
        )
      );
    } else {
      const uidField = isStudent ? 'studentUid' : 'parentUid';
      unsubs.push(
        onSnapshot(
          query(collection(db, 'students'), where(uidField, '==', currentUser.uid)),
          (s) => setStudents(s.docs.map((d) => ({ id: d.id, ...d.data() } as StudentRecord)))
        )
      );
      unsubs.push(
        onSnapshot(
          query(collection(db, 'attendance'), where(uidField, '==', currentUser.uid)),
          (s) => setAttendance(s.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord)))
        )
      );
      unsubs.push(
        onSnapshot(
          query(collection(db, 'published_results'), where(uidField, '==', currentUser.uid)),
          (s) => setResults(s.docs.map((d) => ({ id: d.id, ...d.data() } as ExamResult)))
        )
      );
      unsubs.push(
        onSnapshot(
          query(collection(db, 'fee_invoices'), where(uidField, '==', currentUser.uid)),
          (s) => setFees(s.docs.map((d) => ({ id: d.id, ...d.data() } as FeeInvoice)))
        )
      );
    }

    if (isAdmin) {
      unsubs.push(
        onSnapshot(
          collection(db, 'admissions'),
          (s) => setAdmissions(s.docs.map((d) => ({ id: d.id, ...d.data() } as AdmissionApplication))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'admissions')
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'fee_invoices'),
          (s) => setFees(s.docs.map((d) => ({ id: d.id, ...d.data() } as FeeInvoice))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'fee_invoices')
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'financial_entries'),
          (s) => setFinancialEntries(s.docs.map((d) => ({ id: d.id, ...d.data() } as FinancialEntry))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'financial_entries')
        )
      );
    }

    return () => {
      window.clearTimeout(timer);
      unsubs.forEach((u) => u());
    };
  }, [currentUser.uid, isAdmin, isTeacher, isStudent, isParent]);

  const latestDate = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (attendance.some((a) => a.date === today)) return today;
    const dates = Array.from(new Set(attendance.map((a) => a.date))).sort((a, b) => b.localeCompare(a));
    return dates[0] || today;
  }, [attendance]);

  const todayPresent = useMemo(
    () => attendance.filter((a) => a.date === latestDate && (a.status === 'Present' || a.status === 'Late')).length,
    [attendance, latestDate]
  );

  const todayAbsent = useMemo(
    () => attendance.filter((a) => a.date === latestDate && a.status === 'Absent').length,
    [attendance, latestDate]
  );

  const pendingAdmissions = useMemo(
    () => admissions.filter((a) => a.status === 'Pending' || a.status === 'UnderReview').length,
    [admissions]
  );

  const currentMonth = new Date().toISOString().slice(0, 7);
  const totalCollected = useMemo(() => fees.reduce((s, f) => s + f.paidAmountBdt, 0), [fees]);
  const totalDue = useMemo(() => fees.reduce((s, f) => s + Math.max(0, f.amountBdt - f.paidAmountBdt), 0), [fees]);
  const otherIncome = useMemo(
    () => financialEntries.filter((e) => e.entryType === 'Income').reduce((s, e) => s + e.amountBdt, 0),
    [financialEntries]
  );
  const totalExpenses = useMemo(
    () => financialEntries.filter((e) => e.entryType === 'Expense').reduce((s, e) => s + e.amountBdt, 0),
    [financialEntries]
  );
  const monthlyIncome = useMemo(() => {
    const feeM = fees.filter((f) => (f.paidDate || '').startsWith(currentMonth)).reduce((s, f) => s + f.paidAmountBdt, 0);
    const otherM = financialEntries
      .filter((e) => e.entryType === 'Income' && (e.date || '').startsWith(currentMonth))
      .reduce((s, e) => s + e.amountBdt, 0);
    return feeM + otherM;
  }, [fees, financialEntries, currentMonth]);
  const monthlyExpense = useMemo(
    () =>
      financialEntries
        .filter((e) => e.entryType === 'Expense' && (e.date || '').startsWith(currentMonth))
        .reduce((s, e) => s + e.amountBdt, 0),
    [financialEntries, currentMonth]
  );

  const classDistribution = useMemo(() => {
    const map = new Map<string, number>();
    students.forEach((s) => {
      map.set(s.className, (map.get(s.className) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        const ia = BD_CLASSES.indexOf(a as (typeof BD_CLASSES)[number]);
        const ib = BD_CLASSES.indexOf(b as (typeof BD_CLASSES)[number]);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      })
      .map(([cls, শিক্ষার্থী]) => ({ name: labelClass(cls), শিক্ষার্থী }));
  }, [students]);

  const monthlyActivitySeries = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; নোটিশ: number; ভর্তি: number }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        key,
        label: MONTH_BN[d.getMonth()] || key,
        নোটিশ: 0,
        ভর্তি: 0,
      });
    }
    const byKey = new Map(months.map((m) => [m.key, m]));
    notices.forEach((n) => {
      const ym = (n.publishedDate || '').slice(0, 7);
      const bucket = byKey.get(ym);
      if (bucket) bucket.নোটিশ += 1;
    });
    admissions.forEach((a) => {
      const ts = a.createdAt as { toDate?: () => Date } | undefined;
      const dt = ts && typeof ts.toDate === 'function' ? ts.toDate() : null;
      const ym = dt
        ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
        : currentMonth;
      const bucket = byKey.get(ym);
      if (bucket) bucket.ভর্তি += 1;
    });
    return months;
  }, [notices, admissions, currentMonth]);

  const handleInitDb = async () => {
    setInitializing(true);
    try {
      await initializeSchoolDatabase(currentUser.uid);
      notify(
        'শাহ ইসলামিক স্কুল এন্ড কলেজের মৌলিক তথ্য, স্লাইডার ও গুরুত্বপূর্ণ শিক্ষাপোর্টাল লিংক সফলভাবে ডাটাবেসে সংরক্ষিত হয়েছে।',
        'success'
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'ডাটাবেস সিঙ্ক করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setInitializing(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="space-y-6">
        <div className="skeleton-shimmer h-28 rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="skeleton-shimmer h-72 rounded-2xl" />
          <div className="skeleton-shimmer h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  const quickActions = isAdmin
    ? [
        { id: 'admissions', label: 'ভর্তি আবেদন', desc: `${toBnDigits(pendingAdmissions)}টি অপেক্ষমাণ`, icon: UserPlus, bg: 'from-[#FEF5E4] to-white border-[#F8DFAF] dark:from-amber-950/30 dark:to-slate-900 dark:border-amber-900/50', iconBg: 'bg-[#F4A62A] text-[#123B67]' },
        { id: 'students', label: 'শিক্ষার্থী ব্যবস্থাপনা', desc: `${toBnDigits(students.length)} জন নিবন্ধিত`, icon: GraduationCap, bg: 'from-[#E9F7F1] to-white border-[#CBE9DC] dark:from-emerald-950/30 dark:to-slate-900 dark:border-emerald-900/50', iconBg: 'bg-[#087F5B] text-white' },
        { id: 'results', label: 'পরীক্ষা ও ফলাফল', desc: `${toBnDigits(results.length)}টি মার্কশিট`, icon: Award, bg: 'from-[#F4EFFC] to-white border-[#DDD0F7] dark:from-purple-950/30 dark:to-slate-900 dark:border-purple-900/50', iconBg: 'bg-[#805AD5] text-white' },
        { id: 'notices', label: 'নোটিশ ও বিজ্ঞপ্তি', desc: `${toBnDigits(notices.length)}টি প্রকাশিত`, icon: Bell, bg: 'from-[#E7F7FC] to-white border-[#C2E9F6] dark:from-sky-950/30 dark:to-slate-900 dark:border-sky-900/50', iconBg: 'bg-[#21A9D6] text-white' },
        { id: 'fees', label: 'বেতন ও আয়-ব্যয়', desc: 'ফি ও হিসাবরক্ষণ', icon: Wallet, bg: 'from-[#EAF2FA] to-white border-[#CBDDF0] dark:from-blue-950/30 dark:to-slate-900 dark:border-blue-900/50', iconBg: 'bg-[#123B67] text-white' },
        { id: 'gallery', label: 'ছবি ও ভিডিও গ্যালারি', desc: 'ক্যাম্পাস মিডিয়া CMS', icon: ImageIcon, bg: 'from-[#F4EFFC] to-white border-[#DDD0F7] dark:from-purple-950/30 dark:to-slate-900 dark:border-purple-900/50', iconBg: 'bg-[#805AD5] text-white' },
        { id: 'certificates', label: 'প্রবেশপত্র ও আইডি কার্ড', desc: 'প্রবেশপত্র, ID ও TC', icon: IdCard, bg: 'from-[#E7F7FC] to-white border-[#C2E9F6] dark:from-sky-950/30 dark:to-slate-900 dark:border-sky-900/50', iconBg: 'bg-[#21A9D6] text-white' },
        { id: 'settings', label: 'ওয়েবসাইট ও স্লাইডার', desc: 'হোমপেজ ও সেটিংস', icon: Settings, bg: 'from-[#E9F7F1] to-white border-[#CBE9DC] dark:from-emerald-950/30 dark:to-slate-900 dark:border-emerald-900/50', iconBg: 'bg-[#087F5B] text-white' },
      ]
    : [
        { id: 'results', label: 'ফলাফল ও মার্কশিট', desc: 'পরীক্ষার রেজাল্ট', icon: Award, bg: 'from-[#F4EFFC] to-white border-[#DDD0F7] dark:from-purple-950/30 dark:to-slate-900 dark:border-purple-900/50', iconBg: 'bg-[#805AD5] text-white' },
        { id: 'library', label: 'লাইব্রেরি ও হোমওয়ার্ক', desc: 'পাঠ্যসামগ্রী ও ক্লাস', icon: BookOpen, bg: 'from-[#E9F7F1] to-white border-[#CBE9DC] dark:from-emerald-950/30 dark:to-slate-900 dark:border-emerald-900/50', iconBg: 'bg-[#087F5B] text-white' },
        { id: 'transport', label: 'স্কুল বাস ও রুট', desc: 'পরিবহন তথ্য', icon: Bus, bg: 'from-[#FEF5E4] to-white border-[#F8DFAF] dark:from-amber-950/30 dark:to-slate-900 dark:border-amber-900/50', iconBg: 'bg-[#F4A62A] text-[#123B67]' },
        { id: 'communication', label: 'যোগাযোগ ও মতামত', desc: 'শিক্ষক ও অফিস বার্তা', icon: MessageSquare, bg: 'from-[#E7F7FC] to-white border-[#C2E9F6] dark:from-sky-950/30 dark:to-slate-900 dark:border-sky-900/50', iconBg: 'bg-[#21A9D6] text-white' },
      ];

  return (
    <div className="space-y-6">
      {/* ==================== 1. SAAS WELCOME HEADER BANNER ==================== */}
      <div className="relative overflow-hidden rounded-2xl border border-[#CBE0D6] bg-gradient-to-r from-[#123B67] via-[#0F4964] to-[#087F5B] p-5 text-white shadow-md dark:border-slate-800 sm:p-6">
        <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-[#21A9D6]/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-[#805AD5]/20 blur-2xl" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[#F4A62A]">{settings.schoolNameBn}</p>
            <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">
              স্বাগতম, {currentUser.displayName}
            </h2>
            <p className="mt-1 text-xs text-sky-100/90">
              সর্বশেষ হাজিরার তারিখ: {toBnDigits(latestDate)} · মোট শ্রেণি: {toBnDigits(settings.totalClassesCount || 10)}টি · রিয়েল-টাইম ক্লাউড সিঙ্ক সক্রিয়
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isAdmin && (
              <button
                type="button"
                disabled={initializing}
                onClick={() => void handleInitDb()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F4A62A] px-4 py-2.5 text-xs font-extrabold text-[#123B67] shadow-sm transition hover:bg-[#f7b547] disabled:opacity-60"
              >
                <Database className="h-4 w-4" />
                {initializing ? 'সিঙ্ক হচ্ছে...' : 'প্রতিষ্ঠানের মৌলিক তথ্য সিঙ্ক করুন'}
              </button>
            )}
            {isAdmin && onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('hr_staff')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/12 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-xs transition hover:bg-white/20"
              >
                <Briefcase className="h-4 w-4 text-[#7DD3FC]" />
                HR ও ছুটি
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ==================== 2. COLORFUL KPI STATISTICS CARDS ==================== */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        {/* Card 1: Students (Green) */}
        <div className="rounded-2xl border border-[#CBE9DC] bg-white p-3 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md sm:p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] font-bold text-[#4C6572] sm:text-xs dark:text-slate-400">
              {isAdmin || isTeacher ? 'মোট শিক্ষার্থী' : 'সংযুক্ত শিক্ষার্থী'}
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#087F5B] text-white shadow-xs sm:h-10 sm:w-10">
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="mt-2 text-lg font-extrabold text-[#123B67] tabular-nums sm:mt-2.5 sm:text-2xl dark:text-white">
            {toBnDigits(students.length)}
          </p>
          <p className="mt-0.5 truncate text-[10px] font-medium text-[#087F5B] sm:mt-1 sm:text-[11px] dark:text-emerald-400">
            ডাটাবেসে সক্রিয় নিবন্ধিত
          </p>
        </div>

        {/* Card 2: Teachers (Navy) */}
        <div className="rounded-2xl border border-[#CBDDF0] bg-white p-3 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md sm:p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] font-bold text-[#4C6572] sm:text-xs dark:text-slate-400">মোট শিক্ষক</span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#123B67] text-white shadow-xs sm:h-10 sm:w-10">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="mt-2 text-lg font-extrabold text-[#123B67] tabular-nums sm:mt-2.5 sm:text-2xl dark:text-white">
            {toBnDigits(faculty.length)}
          </p>
          <p className="mt-0.5 truncate text-[10px] font-medium text-[#5A7380] sm:mt-1 sm:text-[11px] dark:text-slate-400">
            {settings.totalStaffCount && settings.totalStaffCount > 0
              ? `কর্মচারী: ${toBnDigits(settings.totalStaffCount)} জন`
              : 'নিবন্ধিত শিক্ষকবৃন্দ'}
          </p>
        </div>

        {/* Card 3: Attendance (Sky Blue) */}
        <div className="rounded-2xl border border-[#C2E9F6] bg-white p-3 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md sm:p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] font-bold text-[#4C6572] sm:text-xs dark:text-slate-400">আজকের উপস্থিতি</span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#21A9D6] text-white shadow-xs sm:h-10 sm:w-10">
              <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="mt-2 text-lg font-extrabold text-[#0E7DA3] tabular-nums sm:mt-2.5 sm:text-2xl dark:text-sky-300">
            {toBnDigits(todayPresent)}
          </p>
          <p className="mt-0.5 truncate text-[10px] font-medium text-[#5A7380] sm:mt-1 sm:text-[11px] dark:text-slate-400">
            অনুপস্থিত: {toBnDigits(todayAbsent)} · রেকর্ড: {toBnDigits(attendance.length)}
          </p>
        </div>

        {/* Card 4: Notices & Classes (Purple) */}
        <div className="rounded-2xl border border-[#DDD0F7] bg-white p-3 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md sm:p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] font-bold text-[#4C6572] sm:text-xs dark:text-slate-400">নোটিশ ও শ্রেণি</span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#805AD5] text-white shadow-xs sm:h-10 sm:w-10">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="mt-2 text-lg font-extrabold text-[#6B46C1] tabular-nums sm:mt-2.5 sm:text-2xl dark:text-purple-300">
            {toBnDigits(notices.length)}
          </p>
          <p className="mt-0.5 truncate text-[10px] font-medium text-[#5A7380] sm:mt-1 sm:text-[11px] dark:text-slate-400">
            শ্রেণি: {toBnDigits(settings.totalClassesCount || 10)}টি · ফলাফল: {toBnDigits(results.length)}
          </p>
        </div>

        {isAdmin && (
          <>
            {/* Card 5: Total Income (Green) */}
            <div className="rounded-2xl border border-[#CBE9DC] bg-white p-3 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md sm:p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-bold text-[#4C6572] sm:text-xs dark:text-slate-400">মোট আয়</span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#E9F7F1] text-[#087F5B] sm:h-10 sm:w-10 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <p className="mt-2 truncate text-base font-extrabold text-[#087F5B] tabular-nums sm:mt-2.5 sm:text-2xl dark:text-emerald-400">
                {formatBdtBn(totalCollected + otherIncome)}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-medium text-[#5A7380] sm:mt-1 sm:text-[11px] dark:text-slate-400">
                চলতি মাসে: {formatBdtBn(monthlyIncome)}
              </p>
            </div>

            {/* Card 6: Total Expenses (Rose) */}
            <div className="rounded-2xl border border-rose-200 bg-white p-3 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md sm:p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-bold text-[#4C6572] sm:text-xs dark:text-slate-400">মোট ব্যয়</span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 sm:h-10 sm:w-10 dark:bg-rose-950/60 dark:text-rose-300">
                  <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <p className="mt-2 truncate text-base font-extrabold text-rose-600 tabular-nums sm:mt-2.5 sm:text-2xl dark:text-rose-400">
                {formatBdtBn(totalExpenses)}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-medium text-[#5A7380] sm:mt-1 sm:text-[11px] dark:text-slate-400">
                চলতি মাসে: {formatBdtBn(monthlyExpense)}
              </p>
            </div>

            {/* Card 7: Total Due (Orange) */}
            <div className="rounded-2xl border border-[#F8DFAF] bg-white p-3 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md sm:p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-bold text-[#4C6572] sm:text-xs dark:text-slate-400">বকেয়া বেতন</span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FEF5E4] text-[#B47009] sm:h-10 sm:w-10 dark:bg-amber-950/60 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <p className="mt-2 truncate text-base font-extrabold text-[#B47009] tabular-nums sm:mt-2.5 sm:text-2xl dark:text-amber-300">
                {formatBdtBn(totalDue)}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-medium text-[#5A7380] sm:mt-1 sm:text-[11px] dark:text-slate-400">
                আদায়কৃত ফি: {formatBdtBn(totalCollected)}
              </p>
            </div>

            {/* Card 8: Admissions (Orange Accent) */}
            <div className="rounded-2xl border border-[#F8DFAF] bg-white p-3 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md sm:p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-bold text-[#4C6572] sm:text-xs dark:text-slate-400">ভর্তি আবেদন</span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F4A62A] text-[#123B67] shadow-xs sm:h-10 sm:w-10">
                  <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <p className="mt-2 text-lg font-extrabold text-[#123B67] tabular-nums sm:mt-2.5 sm:text-2xl dark:text-white">
                {toBnDigits(pendingAdmissions)}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-medium text-[#5A7380] sm:mt-1 sm:text-[11px] dark:text-slate-400">
                সর্বমোট আবেদন: {toBnDigits(admissions.length)}টি
              </p>
            </div>
          </>
        )}

        {(isStudent || isParent) && (
          <>
            <div className="rounded-2xl border border-[#CBE9DC] bg-white p-3 shadow-xs sm:p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-bold text-[#4C6572] sm:text-xs dark:text-slate-400">পরিশোধিত ফি</span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#087F5B] text-white sm:h-10 sm:w-10">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <p className="mt-2 truncate text-base font-extrabold text-[#087F5B] tabular-nums sm:mt-2.5 sm:text-2xl dark:text-emerald-400">
                {formatBdtBn(totalCollected)}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-medium text-[#5A7380] sm:mt-1 sm:text-[11px] dark:text-slate-400">
                বকেয়া: {formatBdtBn(totalDue)}
              </p>
            </div>

            <div className="rounded-2xl border border-[#DDD0F7] bg-white p-3 shadow-xs sm:p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-bold text-[#4C6572] sm:text-xs dark:text-slate-400">প্রকাশিত ফলাফল</span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#805AD5] text-white sm:h-10 sm:w-10">
                  <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <p className="mt-2 text-lg font-extrabold text-[#123B67] tabular-nums sm:mt-2.5 sm:text-2xl dark:text-white">
                {toBnDigits(results.length)}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-medium text-[#5A7380] sm:mt-1 sm:text-[11px] dark:text-slate-400">
                নোটিশ: {toBnDigits(notices.length)}টি
              </p>
            </div>
          </>
        )}
      </div>

      {/* ==================== 3. QUICK ACTION BUTTONS GRID ==================== */}
      {onNavigateTab && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#123B67] dark:text-white">দ্রুত অ্যাকশন</h3>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            {quickActions.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => onNavigateTab(act.id)}
                  className={`group flex items-center gap-2.5 rounded-2xl border bg-gradient-to-br p-3 text-left shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md sm:gap-3 sm:p-3.5 ${act.bg}`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform group-hover:scale-105 sm:h-10 sm:w-10 ${act.iconBg}`}
                  >
                    <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold text-[#123B67] dark:text-white">
                      {act.label}
                    </p>
                    <p className="truncate text-[10.5px] font-medium text-[#566F7C] sm:text-[11px] dark:text-slate-400">
                      {act.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ==================== 4. TWO INTERACTIVE CHARTS ==================== */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
        {/* Chart 1: Student Distribution by Class */}
        <div className="rounded-2xl border border-[#D4E6DD] bg-white p-3.5 shadow-xs sm:p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-extrabold text-[#123B67] dark:text-white">
                শ্রেণিভিত্তিক শিক্ষার্থী পরিসংখ্যান
              </h3>
              <p className="text-[11px] text-[#5B727E] dark:text-slate-400">
                প্রতিটি শ্রেণিতে বর্তমানে নিবন্ধিত শিক্ষার্থীর সংখ্যা
              </p>
            </div>
            {onNavigateTab && (isAdmin || isTeacher) && (
              <button
                type="button"
                onClick={() => onNavigateTab('students')}
                className="inline-flex items-center gap-1 rounded-lg bg-[#E9F7F1] px-3 py-1.5 text-xs font-bold text-[#087F5B] transition hover:bg-[#087F5B] hover:text-white dark:bg-emerald-950/60 dark:text-emerald-300"
              >
                বিস্তারিত <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {classDistribution.length === 0 ? (
            <div className="flex h-60 items-center justify-center rounded-xl border border-dashed border-[#CBE0D4] text-xs text-[#60766B] dark:border-slate-700 dark:text-slate-400">
              শিক্ষার্থীর তথ্য যুক্ত হলে এখানে শ্রেণিভিত্তিক বার চার্ট প্রদর্শিত হবে।
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2EFE8" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4B6370' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#4B6370' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #D4E6DD',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="শিক্ষার্থী" radius={[8, 8, 0, 0]} maxBarSize={42}>
                    {classDistribution.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Monthly Admissions & Notices Trend */}
        <div className="rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#805AD5]">
                <TrendingUp className="h-3.5 w-3.5" />
                গত ৬ মাসের কার্যক্রম
              </div>
              <h3 className="text-base font-extrabold text-[#123B67] dark:text-white">
                মাসিক ভর্তি ও নোটিশ প্রবণতা
              </h3>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyActivitySeries}>
                <defs>
                  <linearGradient id="gradNotice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#21A9D6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#21A9D6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradAdmission" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#805AD5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#805AD5" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2EFE8" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#4B6370' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#4B6370' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #D4E6DD',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="নোটিশ"
                  stroke="#21A9D6"
                  strokeWidth={2.5}
                  fill="url(#gradNotice)"
                />
                <Area
                  type="monotone"
                  dataKey="ভর্তি"
                  stroke="#805AD5"
                  strokeWidth={2.5}
                  fill="url(#gradAdmission)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ==================== 5. RECENT ADMISSIONS & LATEST NOTICES ==================== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Latest Notices */}
        <div className={`rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 ${isAdmin ? 'lg:col-span-6' : 'lg:col-span-12'}`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-extrabold text-[#123B67] dark:text-white">
              সর্বশেষ প্রকাশিত নোটিশ
            </h3>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('notices')}
                className="text-xs font-bold text-[#087F5B] hover:underline dark:text-emerald-400"
              >
                সব নোটিশ →
              </button>
            )}
          </div>
          <div className="space-y-2.5">
            {notices.slice(0, 5).map((n) => (
              <div
                key={n.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-[#E8F1EC] bg-[#F8FBF9] p-3 transition hover:border-[#087F5B]/40 dark:border-slate-800 dark:bg-slate-800/60"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded-md bg-[#E9F7F1] px-2 py-0.5 font-bold text-[#087F5B] dark:bg-emerald-950/60 dark:text-emerald-300">
                      {NOTICE_CATEGORY_BN[n.category] || n.category}
                    </span>
                    <span className="text-[#5C7582] dark:text-slate-400">
                      {toBnDigits(n.publishedDate)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs font-bold text-[#123B67] dark:text-slate-100">
                    {n.titleBn || n.title}
                  </p>
                </div>
              </div>
            ))}
            {notices.length === 0 && (
              <p className="py-8 text-center text-xs text-[#60766B] dark:text-slate-400">
                এখনো কোনো নোটিশ প্রকাশ করা হয়নি।
              </p>
            )}
          </div>
        </div>

        {/* Recent Admission Applications (Admin) */}
        {isAdmin && (
          <div className="rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#123B67] dark:text-white">
                সাম্প্রতিক ভর্তি আবেদনসমূহ
              </h3>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('admissions')}
                  className="text-xs font-bold text-[#F4A62A] hover:underline"
                >
                  সব আবেদন →
                </button>
              )}
            </div>
            <div className="space-y-2.5">
              {admissions.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#F8DFAF]/70 bg-[#FFFDF7] p-3 dark:border-amber-900/40 dark:bg-amber-950/20"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#123B67] dark:text-white">
                      {a.applicantName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#5B727E] dark:text-slate-400">
                      আবেদন নং: {a.applicationNo} · {labelClass(a.applyingClass)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                      a.status === 'Approved'
                        ? 'bg-[#E9F7F1] text-[#087F5B] dark:bg-emerald-950/60 dark:text-emerald-300'
                        : a.status === 'Rejected'
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-[#FEF5E4] text-[#9A5B00] dark:bg-amber-950/60 dark:text-amber-200'
                    }`}
                  >
                    {ADMISSION_STATUS_BN[a.status]}
                  </span>
                </div>
              ))}
              {admissions.length === 0 && (
                <p className="py-8 text-center text-xs text-[#60766B] dark:text-slate-400">
                  কোনো ভর্তি আবেদন এখনো জমা পড়েনি।
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
