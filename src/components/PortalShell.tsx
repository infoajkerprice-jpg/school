import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  Calendar,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  CreditCard,
  DatabaseBackup,
  FileBarChart2,
  Globe,
  GraduationCap,
  IdCard,
  Image as ImageIcon,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Sun,
  Trophy,
  UserCog,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PDF_ROSTER_SYNC_KEY, syncPdfStudentsToFirestore } from '../lib/pdfStudentsRoster';
import { PDF_TEACHERS_SYNC_KEY, syncPdfTeachersToFirestore } from '../lib/pdfTeachersRoster';
import { usePublicData } from '../context/PublicDataContext';
import { useUIFeedback } from './ToastContext';
import { ROLE_BN, toBnDigits } from '../i18n';
import type { AdmissionApplication, UserAccount, UserRole } from '../types';
import { OverviewModule } from './modules/OverviewModule';
import { StudentsModule } from './modules/StudentsModule';
import { TeachersModule } from './modules/TeachersModule';
import { AdmissionsModule } from './modules/AdmissionsModule';
import { GoverningBodyModule } from './modules/GoverningBodyModule';
import { AttendanceModule } from './modules/AttendanceModule';
import { ResultsModule } from './modules/ResultsModule';
import { RoutinesModule } from './modules/RoutinesModule';
import { NoticesNewsModule } from './modules/NoticesNewsModule';
import { ImportantLinksModule } from './modules/ImportantLinksModule';
import { AchievementsModule } from './modules/AchievementsModule';
import { FeesModule } from './modules/FeesModule';
import { ReportsCenterModule } from './modules/ReportsCenterModule';
import { UsersRolesModule } from './modules/UsersRolesModule';
import { WebsiteSettingsModule } from './modules/WebsiteSettingsModule';
import { InstitutionInfoModule } from './modules/InstitutionInfoModule';
import { LibraryLmsModule } from './modules/LibraryLmsModule';
import { TransportModule } from './modules/TransportModule';
import { HrStaffModule } from './modules/HrStaffModule';
import { CertificatesModule } from './modules/CertificatesModule';
import { CommunicationModule } from './modules/CommunicationModule';
import { SystemAdminModule } from './modules/SystemAdminModule';
import { ProfileSecurityModule } from './modules/ProfileSecurityModule';

interface PortalShellProps {
  currentUser: UserAccount;
  onLogout: () => Promise<void>;
}

type NavGroupId = 'core' | 'academic' | 'operations' | 'cms' | 'system';

interface NavItem {
  id: string;
  path: string;
  label: string;
  group: NavGroupId;
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  end?: boolean;
}

const GROUP_LABELS: Record<NavGroupId, string> = {
  core: 'মূল ড্যাশবোর্ড',
  academic: 'শিক্ষা ও শিক্ষার্থী',
  operations: 'আর্থিক ও সেবা',
  cms: 'ওয়েবসাইট CMS',
  system: 'প্রশাসন ও নিরাপত্তা',
};

const GROUP_ORDER: NavGroupId[] = ['core', 'academic', 'operations', 'cms', 'system'];

const PORTAL_NAV: NavItem[] = [
  { id: 'overview', path: '/dashboard', label: 'ড্যাশবোর্ড', group: 'core', accent: 'text-[#087F5B]', icon: LayoutDashboard, roles: ['admin', 'teacher', 'student', 'parent'], end: true },
  { id: 'students', path: '/dashboard/students', label: 'শিক্ষার্থী ব্যবস্থাপনা', group: 'academic', accent: 'text-[#087F5B]', icon: GraduationCap, roles: ['admin', 'teacher', 'student', 'parent'] },
  { id: 'teachers', path: '/dashboard/teachers', label: 'শিক্ষক ব্যবস্থাপনা', group: 'academic', accent: 'text-[#123B67]', icon: Users, roles: ['admin', 'teacher'] },
  { id: 'admissions', path: '/dashboard/admissions', label: 'ভর্তি ব্যবস্থাপনা', group: 'academic', accent: 'text-[#F4A62A]', icon: UserPlus, roles: ['admin'] },
  { id: 'attendance', path: '/dashboard/attendance', label: 'উপস্থিতি ব্যবস্থাপনা', group: 'academic', accent: 'text-[#21A9D6]', icon: ClipboardCheck, roles: ['admin', 'teacher', 'student', 'parent'] },
  { id: 'results', path: '/dashboard/results', label: 'পরীক্ষা ও ফলাফল', group: 'academic', accent: 'text-[#805AD5]', icon: Award, roles: ['admin', 'teacher', 'student', 'parent'] },
  { id: 'class_routine', path: '/dashboard/class-routine', label: 'ক্লাস রুটিন', group: 'academic', accent: 'text-[#087F5B]', icon: Calendar, roles: ['admin', 'teacher', 'student', 'parent'] },
  { id: 'exam_routine', path: '/dashboard/exam-routine', label: 'পরীক্ষার রুটিন', group: 'academic', accent: 'text-[#21A9D6]', icon: Clock, roles: ['admin', 'teacher', 'student', 'parent'] },
  { id: 'achievements', path: '/dashboard/achievements', label: 'শিক্ষার্থীদের অর্জন', group: 'academic', accent: 'text-[#F4A62A]', icon: Trophy, roles: ['admin', 'teacher'] },

  { id: 'fees', path: '/dashboard/fees', label: 'বেতন, ফি ও আয়-ব্যয়', group: 'operations', accent: 'text-[#087F5B]', icon: CreditCard, roles: ['admin', 'student', 'parent'] },
  { id: 'hr_staff', path: '/dashboard/hr-staff', label: 'কর্মচারী, হাজিরা ও ছুটি', group: 'operations', accent: 'text-[#123B67]', icon: Briefcase, roles: ['admin', 'teacher', 'student'] },
  { id: 'library', path: '/dashboard/library', label: 'লাইব্রেরি ও হোমওয়ার্ক', group: 'operations', accent: 'text-[#805AD5]', icon: BookOpen, roles: ['admin', 'teacher', 'student', 'parent'] },
  { id: 'transport', path: '/dashboard/transport', label: 'পরিবহন ব্যবস্থাপনা', group: 'operations', accent: 'text-[#F4A62A]', icon: Bus, roles: ['admin', 'teacher', 'student', 'parent'] },
  { id: 'certificates', path: '/dashboard/certificates', label: 'প্রবেশপত্র, আইডি কার্ড ও সনদ', group: 'operations', accent: 'text-[#21A9D6]', icon: IdCard, roles: ['admin', 'teacher'] },
  { id: 'communication', path: '/dashboard/communication', label: 'যোগাযোগ, SMS ও মতামত', group: 'operations', accent: 'text-[#087F5B]', icon: MessageSquare, roles: ['admin', 'teacher', 'student', 'parent'] },

  { id: 'notices', path: '/dashboard/notices', label: 'নোটিশ বোর্ড', group: 'cms', accent: 'text-[#F4A62A]', icon: Bell, roles: ['admin', 'teacher', 'student', 'parent'] },
  { id: 'news', path: '/dashboard/news', label: 'সংবাদ ও বিজ্ঞপ্তি', group: 'cms', accent: 'text-[#21A9D6]', icon: Newspaper, roles: ['admin'] },
  { id: 'gallery', path: '/dashboard/gallery', label: 'ছবি ও ভিডিও গ্যালারি', group: 'cms', accent: 'text-[#805AD5]', icon: ImageIcon, roles: ['admin'] },
  { id: 'governing_body', path: '/dashboard/governing-body', label: 'পরিচালনা পর্ষদ', group: 'cms', accent: 'text-[#123B67]', icon: Users, roles: ['admin'] },
  { id: 'important_links', path: '/dashboard/important-links', label: 'গুরুত্বপূর্ণ লিংক', group: 'cms', accent: 'text-[#21A9D6]', icon: Link2, roles: ['admin'] },
  { id: 'institution_info', path: '/dashboard/institution-info', label: 'প্রতিষ্ঠানের তথ্য', group: 'cms', accent: 'text-[#087F5B]', icon: Building2, roles: ['admin'] },
  { id: 'settings', path: '/dashboard/settings', label: 'ওয়েবসাইট ও স্লাইডার', group: 'cms', accent: 'text-[#805AD5]', icon: Settings, roles: ['admin'] },

  { id: 'reports', path: '/dashboard/reports', label: 'রিপোর্ট ও প্রতিবেদন', group: 'system', accent: 'text-[#21A9D6]', icon: FileBarChart2, roles: ['admin'] },
  { id: 'users', path: '/dashboard/users', label: 'ব্যবহারকারী ও রোল', group: 'system', accent: 'text-[#087F5B]', icon: ShieldCheck, roles: ['admin'] },
  { id: 'profile_security', path: '/dashboard/profile-security', label: 'প্রোফাইল ও নিরাপত্তা', group: 'system', accent: 'text-[#805AD5]', icon: UserCog, roles: ['admin', 'teacher', 'student', 'parent'] },
  { id: 'system_admin', path: '/dashboard/system-admin', label: 'ব্যাকআপ ও সিস্টেম লগ', group: 'system', accent: 'text-[#F4A62A]', icon: DatabaseBackup, roles: ['admin'] },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  return (name.trim().slice(0, 2) || 'অ্যা').toUpperCase();
}

export const PortalShell: React.FC<PortalShellProps> = ({ currentUser, onLogout }) => {
  const { settings, notices } = usePublicData();
  const { confirm, notify } = useUIFeedback();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingAdmissions, setPendingAdmissions] = useState<AdmissionApplication[]>([]);
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('sisc_admin_theme') === 'dark';
    } catch {
      return false;
    }
  });

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = currentUser.role === 'admin';

  // Sync dark mode class while inside dashboard, clean up on leave so public site stays bright
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      window.localStorage.setItem('sisc_admin_theme', isDark ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, [isDark]);

  // Listen for pending admissions for admin notification dropdown
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(
      collection(db, 'admissions'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as AdmissionApplication))
          .filter((a) => a.status === 'Pending' || a.status === 'UnderReview');
        setPendingAdmissions(list);
      },
      () => {
        // silent fallback if offline
      }
    );
    return () => unsub();
  }, [isAdmin]);

  // Automatically sync verified PDF student roster once for Admin if not yet synced
  useEffect(() => {
    if (!isAdmin) return;
    let alreadySynced = false;
    try {
      alreadySynced = window.localStorage.getItem(PDF_ROSTER_SYNC_KEY) === 'done';
    } catch {
      alreadySynced = false;
    }
    if (alreadySynced) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await syncPdfStudentsToFirestore();
        if (cancelled) return;
        try {
          window.localStorage.setItem(PDF_ROSTER_SYNC_KEY, 'done');
        } catch {
          // ignore storage errors
        }
        if (res.added > 0) {
          notify(
            `পিডিএফ তালিকা থেকে ${toBnDigits(res.added)} জন শিক্ষার্থী সফলভাবে ডাটাবেসে যুক্ত হয়েছে।`,
            'success'
          );
        }
      } catch {
        // Error surfaced via handleFirestoreError / manual button remains available
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, notify]);

  // Automatically sync verified PDF teachers roster once for Admin if not yet synced
  useEffect(() => {
    if (!isAdmin) return;
    let alreadySynced = false;
    try {
      alreadySynced = window.localStorage.getItem(PDF_TEACHERS_SYNC_KEY) === 'done';
    } catch {
      alreadySynced = false;
    }
    if (alreadySynced) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await syncPdfTeachersToFirestore();
        if (cancelled) return;
        try {
          window.localStorage.setItem(PDF_TEACHERS_SYNC_KEY, 'done');
        } catch {
          // ignore storage errors
        }
        if (res.added > 0) {
          notify(
            `পিডিএফ তালিকা থেকে ${toBnDigits(res.added)} জন শিক্ষক ও কর্মকর্তা সফলভাবে ডাটাবেসে যুক্ত হয়েছে।`,
            'success'
          );
        }
      } catch {
        // Error surfaced via handleFirestoreError / manual button remains available
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, notify]);

  // Close dropdowns on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const visibleNav = useMemo(
    () => PORTAL_NAV.filter((item) => item.roles.includes(currentUser.role)),
    [currentUser.role]
  );

  const groupedNav = useMemo(() => {
    return GROUP_ORDER.map((groupId) => ({
      id: groupId,
      label: GROUP_LABELS[groupId],
      items: visibleNav.filter((n) => n.group === groupId),
    })).filter((g) => g.items.length > 0);
  }, [visibleNav]);

  const activeItem =
    visibleNav.find((n) => (n.end ? location.pathname === n.path : location.pathname.startsWith(n.path))) ??
    visibleNav[0];

  useEffect(() => {
    document.title = `${activeItem?.label || 'ড্যাশবোর্ড'} | ${settings.schoolNameBn}`;
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    setNotifOpen(false);
    setProfileOpen(false);
  }, [location.pathname, activeItem?.label, settings.schoolNameBn]);

  const can = (id: string) => visibleNav.some((item) => item.id === id);

  const notificationCount = (isAdmin ? pendingAdmissions.length : 0) + Math.min(notices.length, 3);

  const handleToggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      notify(next ? 'ডার্ক মোড চালু করা হয়েছে।' : 'লাইট মোড চালু করা হয়েছে।', 'info');
      return next;
    });
  };

  const handleConfirmLogout = async () => {
    setProfileOpen(false);
    const ok = await confirm({
      title: 'লগআউট নিশ্চিত করুন',
      message: 'আপনি কি অ্যাডমিন পোর্টাল থেকে লগআউট করতে চান? পুনরায় প্রবেশ করতে আবার লগইন করতে হবে।',
      confirmLabel: 'হ্যাঁ, লগআউট করুন',
      cancelLabel: 'থাকুন',
      danger: true,
    });
    if (ok) {
      document.documentElement.classList.remove('dark');
      await onLogout();
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F2F8F5] text-[#263B35] transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#091C2B]/60 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ==================== MODERN COLLAPSIBLE SAAS SIDEBAR ==================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#D4E6DD] bg-white shadow-sm transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'w-[84vw] max-w-[300px] lg:w-[78px]' : 'w-[84vw] max-w-[300px] lg:w-72'}`}
      >
        {/* Sidebar Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 bg-gradient-to-r from-[#123B67] to-[#087F5B] px-3.5 text-white">
          <Link
            to="/dashboard"
            className={`flex min-w-0 items-center gap-2.5 ${sidebarCollapsed ? 'lg:justify-center lg:w-full' : ''}`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-0.5 shadow-xs ring-2 ring-[#F4A62A]/60">
              <img
                src={settings.logoUrl || '/school-logo.png'}
                alt={settings.schoolNameBn}
                className="h-full w-full object-contain"
              />
            </div>
            <div className={`min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-sm font-extrabold leading-tight">{settings.schoolNameBn}</p>
              <p className="truncate text-[11px] font-medium text-[#7DD3FC]">
                {ROLE_BN[currentUser.role] || currentUser.role} প্যানেল
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="সাইডবার বন্ধ করুন"
            className="rounded-lg p-1.5 text-white/90 hover:bg-white/15 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 py-4">
          {groupedNav.map((group) => (
            <div key={group.id}>
              <p
                className={`mb-1.5 px-2.5 text-[10px] font-extrabold tracking-wider text-[#627D89] uppercase dark:text-slate-400 ${
                  sidebarCollapsed ? 'lg:hidden' : ''
                }`}
              >
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const showBadge = item.id === 'admissions' && isAdmin && pendingAdmissions.length > 0;
                  return (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      end={item.end}
                      title={sidebarCollapsed ? item.label : undefined}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition ${
                          sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''
                        } ${
                          isActive
                            ? 'bg-gradient-to-r from-[#087F5B] to-[#0A956B] text-white shadow-sm shadow-[#087F5B]/25'
                            : 'text-[#263B35] hover:bg-[#E9F7F1] hover:text-[#087F5B] dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-emerald-300'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={`h-[18px] w-[18px] shrink-0 transition ${
                              isActive ? 'text-[#F4A62A]' : `${item.accent} dark:text-slate-300`
                            }`}
                          />
                          <span className={`flex-1 truncate ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                            {item.label}
                          </span>
                          {showBadge && (
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${
                                isActive
                                  ? 'bg-[#F4A62A] text-[#123B67]'
                                  : 'bg-[#FEF5E4] text-[#9A5B00] dark:bg-amber-900/50 dark:text-amber-200'
                              } ${sidebarCollapsed ? 'lg:hidden' : ''}`}
                            >
                              {toBnDigits(pendingAdmissions.length)}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="space-y-2 border-t border-[#E2EFE8] bg-[#F8FBF9] p-3 dark:border-slate-800 dark:bg-slate-900/90">
          <Link
            to="/"
            title="মূল ওয়েবসাইটে ফিরুন"
            className={`flex w-full items-center justify-center gap-2 rounded-xl border border-[#CBE0D6] bg-white px-3 py-2 text-xs font-bold text-[#123B67] transition hover:border-[#087F5B] hover:bg-[#E9F7F1] hover:text-[#087F5B] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ${
              sidebarCollapsed ? 'lg:px-0' : ''
            }`}
          >
            <Globe className="h-4 w-4 shrink-0 text-[#21A9D6]" />
            <span className={sidebarCollapsed ? 'lg:hidden' : ''}>মূল ওয়েবসাইট</span>
          </Link>
          <button
            type="button"
            onClick={() => void handleConfirmLogout()}
            title="লগআউট"
            className={`flex w-full items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-600 hover:text-white dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-600 dark:hover:text-white ${
              sidebarCollapsed ? 'lg:px-0' : ''
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={sidebarCollapsed ? 'lg:hidden' : ''}>লগআউট</span>
          </button>
        </div>
      </aside>

      {/* ==================== MAIN WORKSPACE ==================== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Modern SaaS Top Navigation Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-[#D4E6DD] bg-white/95 px-3 shadow-2xs backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 sm:px-6 lg:h-16 lg:gap-3">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="সাইডবার খুলুন"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D4E6DD] text-[#123B67] transition hover:bg-[#E9F7F1] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop Collapse Button */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label={sidebarCollapsed ? 'সাইডবার বড় করুন' : 'সাইডবার ছোট করুন'}
              title={sidebarCollapsed ? 'সাইডবার বড় করুন' : 'সাইডবার ছোট করুন'}
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D4E6DD] text-[#123B67] transition hover:bg-[#E9F7F1] hover:text-[#087F5B] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 lg:flex"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>

            {/* Breadcrumb + Active Title */}
            <div className="min-w-0">
              <div className="hidden items-center gap-1 text-[11px] font-semibold text-[#5C7582] dark:text-slate-400 sm:flex">
                <Link to="/dashboard" className="hover:text-[#087F5B]">
                  পোর্টাল
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span>{GROUP_LABELS[activeItem?.group || 'core']}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="truncate font-bold text-[#087F5B] dark:text-emerald-400">
                  {activeItem?.label || 'ড্যাশবোর্ড'}
                </span>
              </div>
              <h1 className="truncate text-sm font-extrabold text-[#123B67] dark:text-white sm:text-base">
                {activeItem?.label || 'ড্যাশবোর্ড'}
              </h1>
            </div>
          </div>

          {/* Right Controls: Theme Toggle, Notifications, Profile Dropdown */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            {/* Light / Dark Mode Switch */}
            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={isDark ? 'লাইট মোড চালু করুন' : 'ডার্ক মোড চালু করুন'}
              title={isDark ? 'লাইট মোড' : 'ডার্ক মোড'}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4E6DD] bg-[#F2F8F5] text-[#123B67] transition hover:border-[#087F5B] hover:text-[#087F5B] dark:border-slate-700 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Notification Bell Dropdown */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setProfileOpen(false);
                }}
                aria-label="নোটিফিকেশন"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4E6DD] bg-[#F2F8F5] text-[#123B67] transition hover:border-[#087F5B] hover:text-[#087F5B] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F4A62A] px-1 text-[10px] font-extrabold text-[#123B67] tabular-nums">
                    {toBnDigits(notificationCount)}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="sheet-enter fixed inset-x-3 top-16 z-50 overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-80">
                  <div className="flex items-center justify-between bg-gradient-to-r from-[#123B67] to-[#087F5B] px-4 py-3 text-white">
                    <span className="text-xs font-extrabold">সাম্প্রতিক নোটিফিকেশন</span>
                    <span className="rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-bold tabular-nums">
                      {toBnDigits(notificationCount)}টি
                    </span>
                  </div>
                  <div className="max-h-80 divide-y divide-[#EDF4F0] overflow-y-auto dark:divide-slate-800">
                    {isAdmin && pendingAdmissions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => navigate('/dashboard/admissions')}
                        className="flex w-full items-start gap-2.5 bg-[#FFF9EC] px-4 py-3 text-left transition hover:bg-[#FEF3D6] dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
                      >
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F4A62A] text-[#123B67]">
                          <UserPlus className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#123B67] dark:text-amber-200">
                            {toBnDigits(pendingAdmissions.length)}টি নতুন ভর্তি আবেদন অপেক্ষমাণ
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#5B727E] dark:text-slate-400">
                            যাচাই ও অনুমোদন করতে ক্লিক করুন
                          </p>
                        </div>
                      </button>
                    )}

                    {notices.slice(0, 4).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => navigate('/dashboard/notices')}
                        className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition hover:bg-[#F2F8F5] dark:hover:bg-slate-800"
                      >
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E9F7F1] text-[#087F5B] dark:bg-emerald-950/60 dark:text-emerald-300">
                          <Bell className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-xs font-bold text-[#123B67] dark:text-slate-100">
                            {n.titleBn || n.title}
                          </p>
                          <p className="mt-0.5 text-[10px] font-medium text-[#5D7684] dark:text-slate-400">
                            প্রকাশিত: {toBnDigits(n.publishedDate)}
                          </p>
                        </div>
                      </button>
                    ))}

                    {notices.length === 0 && pendingAdmissions.length === 0 && (
                      <p className="py-6 text-center text-xs text-[#607680] dark:text-slate-400">
                        কোনো নতুন নোটিফিকেশন নেই।
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((o) => !o);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 rounded-xl border border-[#D4E6DD] bg-[#F8FBF9] py-1 pr-2.5 pl-1.5 transition hover:border-[#087F5B] dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#087F5B] to-[#123B67] text-[11px] font-extrabold text-white">
                  {getInitials(currentUser.displayName)}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="max-w-[130px] truncate text-xs font-bold leading-tight text-[#123B67] dark:text-white">
                    {currentUser.displayName}
                  </p>
                  <p className="text-[10px] font-semibold text-[#087F5B] dark:text-emerald-400">
                    {ROLE_BN[currentUser.role] || currentUser.role}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-[#587280] dark:text-slate-400" />
              </button>

              {profileOpen && (
                <div className="sheet-enter absolute right-0 mt-2 w-[min(15rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="border-b border-[#E8F1EC] bg-[#F8FBF9] px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                    <p className="truncate text-xs font-extrabold text-[#123B67] dark:text-white">
                      {currentUser.displayName}
                    </p>
                    <p className="truncate text-[11px] text-[#5B727E] dark:text-slate-400">
                      {currentUser.email}
                    </p>
                  </div>
                  <div className="space-y-1 p-2">
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard/profile-security')}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#263B35] transition hover:bg-[#E9F7F1] hover:text-[#087F5B] dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <UserCog className="h-4 w-4 text-[#805AD5]" />
                      প্রোফাইল ও নিরাপত্তা
                    </button>
                    <Link
                      to="/"
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#263B35] transition hover:bg-[#E7F7FC] hover:text-[#0E7DA3] dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Globe className="h-4 w-4 text-[#21A9D6]" />
                      পাবলিক ওয়েবসাইট দেখুন
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleConfirmLogout()}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    >
                      <LogOut className="h-4 w-4" />
                      লগআউট করুন
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Scroll Workspace */}
        <main className="flex-1 p-3 pb-24 sm:p-6 lg:pb-6">
          <div className="mx-auto max-w-[1320px]">
            <Routes>
              <Route
                index
                element={
                  <OverviewModule
                    currentUser={currentUser}
                    onNavigateTab={(id) => {
                      const target = PORTAL_NAV.find((n) => n.id === id);
                      if (target) navigate(target.path);
                    }}
                  />
                }
              />
              <Route path="students" element={<StudentsModule currentUser={currentUser} />} />
              <Route
                path="teachers"
                element={can('teachers') ? <TeachersModule currentUser={currentUser} /> : <Navigate to="/dashboard" replace />}
              />
              <Route
                path="hr-staff"
                element={can('hr_staff') ? <HrStaffModule currentUser={currentUser} /> : <Navigate to="/dashboard" replace />}
              />
              <Route
                path="admissions"
                element={can('admissions') ? <AdmissionsModule /> : <Navigate to="/dashboard" replace />}
              />
              <Route
                path="governing-body"
                element={can('governing_body') ? <GoverningBodyModule currentUser={currentUser} /> : <Navigate to="/dashboard" replace />}
              />
              <Route path="attendance" element={<AttendanceModule currentUser={currentUser} />} />
              <Route path="results" element={<ResultsModule currentUser={currentUser} />} />
              <Route path="class-routine" element={<RoutinesModule currentUser={currentUser} defaultType="class" />} />
              <Route path="exam-routine" element={<RoutinesModule currentUser={currentUser} defaultType="exam" />} />
              <Route path="notices" element={<NoticesNewsModule currentUser={currentUser} initialTab="notices" />} />
              <Route
                path="important-links"
                element={can('important_links') ? <ImportantLinksModule currentUser={currentUser} /> : <Navigate to="/dashboard" replace />}
              />
              <Route
                path="news"
                element={can('news') ? <NoticesNewsModule currentUser={currentUser} initialTab="news" /> : <Navigate to="/dashboard" replace />}
              />
              <Route
                path="gallery"
                element={can('gallery') ? <NoticesNewsModule currentUser={currentUser} initialTab="gallery" /> : <Navigate to="/dashboard" replace />}
              />
              <Route
                path="achievements"
                element={can('achievements') ? <AchievementsModule currentUser={currentUser} /> : <Navigate to="/dashboard" replace />}
              />
              <Route
                path="fees"
                element={can('fees') ? <FeesModule currentUser={currentUser} /> : <Navigate to="/dashboard" replace />}
              />
              <Route path="library" element={<LibraryLmsModule currentUser={currentUser} />} />
              <Route
                path="transport"
                element={can('transport') ? <TransportModule currentUser={currentUser} /> : <Navigate to="/dashboard" replace />}
              />
              <Route
                path="certificates"
                element={can('certificates') ? <CertificatesModule currentUser={currentUser} /> : <Navigate to="/dashboard" replace />}
              />
              <Route
                path="communication"
                element={can('communication') ? <CommunicationModule currentUser={currentUser} /> : <Navigate to="/dashboard" replace />}
              />
              <Route
                path="reports"
                element={can('reports') ? <ReportsCenterModule /> : <Navigate to="/dashboard" replace />}
              />
              <Route
                path="users"
                element={can('users') ? <UsersRolesModule currentUser={currentUser} /> : <Navigate to="/dashboard" replace />}
              />
              <Route
                path="institution-info"
                element={can('institution_info') ? <InstitutionInfoModule /> : <Navigate to="/dashboard" replace />}
              />
              <Route
                path="settings"
                element={can('settings') ? <WebsiteSettingsModule currentUser={currentUser} /> : <Navigate to="/dashboard" replace />}
              />
              <Route
                path="profile-security"
                element={
                  <ProfileSecurityModule
                    currentUser={currentUser}
                    isDark={isDark}
                    onToggleTheme={handleToggleTheme}
                  />
                }
              />
              <Route
                path="system-admin"
                element={can('system_admin') ? <SystemAdminModule currentUser={currentUser} /> : <Navigate to="/dashboard" replace />}
              />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* ==================== FIXED MOBILE ADMIN BOTTOM NAVIGATION (< lg) ==================== */}
      <nav
        aria-label="মোবাইল অ্যাডমিন নেভিগেশন"
        className="pb-safe fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border-t border-[#D4E6DD] bg-white/95 shadow-[0_-8px_24px_rgba(18,59,103,0.1)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
      >
        <div className="mx-auto grid h-[58px] max-w-lg grid-cols-5 items-center px-1">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition ${
                isActive ? 'text-[#087F5B] dark:text-emerald-400' : 'text-[#526B78] dark:text-slate-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`flex h-7 w-10 items-center justify-center rounded-xl ${isActive ? 'bg-[#087F5B]/12' : ''}`}>
                  <LayoutDashboard className="h-4 w-4" />
                </span>
                <span className="leading-none">ড্যাশবোর্ড</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/dashboard/students"
            className={({ isActive }) =>
              `flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition ${
                isActive ? 'text-[#087F5B] dark:text-emerald-400' : 'text-[#526B78] dark:text-slate-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`flex h-7 w-10 items-center justify-center rounded-xl ${isActive ? 'bg-[#087F5B]/12' : ''}`}>
                  <GraduationCap className="h-4 w-4" />
                </span>
                <span className="leading-none">শিক্ষার্থী</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/dashboard/attendance"
            className={({ isActive }) =>
              `flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition ${
                isActive ? 'text-[#087F5B] dark:text-emerald-400' : 'text-[#526B78] dark:text-slate-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-7 w-10 items-center justify-center rounded-xl ${
                    isActive
                      ? 'bg-[#087F5B] text-white shadow-xs'
                      : 'bg-[#087F5B]/10 text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300'
                  }`}
                >
                  <ClipboardCheck className="h-4 w-4" />
                </span>
                <span className="leading-none">হাজিরা</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/dashboard/notices"
            className={({ isActive }) =>
              `flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition ${
                isActive ? 'text-[#087F5B] dark:text-emerald-400' : 'text-[#526B78] dark:text-slate-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`flex h-7 w-10 items-center justify-center rounded-xl ${isActive ? 'bg-[#087F5B]/12' : ''}`}>
                  <Bell className="h-4 w-4" />
                </span>
                <span className="leading-none">নোটিশ</span>
              </>
            )}
          </NavLink>

          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className={`flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition ${
              sidebarOpen ? 'text-[#087F5B] dark:text-emerald-400' : 'text-[#526B78] dark:text-slate-400'
            }`}
          >
            <span className={`flex h-7 w-10 items-center justify-center rounded-xl ${sidebarOpen ? 'bg-[#087F5B]/12' : ''}`}>
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </span>
            <span className="leading-none">মেনু</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
