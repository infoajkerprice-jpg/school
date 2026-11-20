import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Award,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  ChevronDown,
  ExternalLink,
  FileSpreadsheet,
  Globe,
  GraduationCap,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  LogIn,
  Mail,
  MapPin,
  Menu,
  Phone,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { usePublicData } from '../context/PublicDataContext';
import { toBnDigits } from '../i18n';
import type { UserAccount } from '../types';
import { OfflineIndicator, PWAInstallButton } from './PWAInstallPrompt';

interface PublicLayoutProps {
  currentUser: UserAccount | null;
}

const ROUTE_TITLES: Record<string, string> = {
  '/': 'মূলপাতা',
  '/about': 'প্রতিষ্ঠান পরিচিতি',
  '/programs': 'আধুনিক ও ইসলামিক শিক্ষা কার্যক্রম',
  '/academic': 'একাডেমিক কার্যক্রম',
  '/academic/class-routine': 'ক্লাস রুটিন',
  '/academic/exam-routine': 'পরীক্ষার রুটিন',
  '/academic/syllabus': 'সিলেবাস ও পাঠ্যবই',
  '/academic/calendar': 'একাডেমিক ক্যালেন্ডার ও ছুটি',
  '/faculty': 'শিক্ষকমণ্ডলী পরিচিতি',
  '/governing-body': 'পরিচালনা পর্ষদ',
  '/students': 'শিক্ষার্থী ও অর্জন',
  '/results': 'পরীক্ষার ফলাফল যাচাই',
  '/admission': 'অনলাইন ভর্তি আবেদন',
  '/gallery': 'ছবি ও ভিডিও গ্যালারি',
  '/notices': 'নোটিশ বোর্ড',
  '/news': 'সংবাদ ও কার্যক্রম',
  '/contact': 'যোগাযোগ',
};

function sanitizeTel(phone?: string): string {
  return (phone || '+8801711759705').replace(/[^\d+]/g, '');
}

interface DropdownSubItem {
  label: string;
  desc: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}

const INSTITUTION_DROPDOWN: DropdownSubItem[] = [
  {
    label: 'প্রতিষ্ঠান পরিচিতি',
    desc: 'ইতিহাস, লক্ষ্য ও মূল তথ্য',
    to: '/about',
    icon: Building2,
    accent: 'bg-[#087F5B]/10 text-[#087F5B]',
  },
  {
    label: 'শিক্ষকমণ্ডলী পরিচিতি',
    desc: 'অভিজ্ঞ শিক্ষক ও বিভাগসমূহ',
    to: '/faculty',
    icon: Users,
    accent: 'bg-[#123B67]/10 text-[#123B67]',
  },
  {
    label: 'পরিচালনা পর্ষদ',
    desc: 'পরিচালনা কমিটির সদস্যবৃন্দ',
    to: '/governing-body',
    icon: GraduationCap,
    accent: 'bg-[#F4A62A]/15 text-[#B47009]',
  },
  {
    label: 'শিক্ষার্থী ও অর্জন',
    desc: 'কৃতি শিক্ষার্থী ও সাফল্য',
    to: '/students',
    icon: Award,
    accent: 'bg-[#21A9D6]/12 text-[#0E7DA3]',
  },
];

const ACADEMIC_DROPDOWN: DropdownSubItem[] = [
  {
    label: 'আধুনিক ও ইসলামিক শিক্ষা',
    desc: 'ট্রিলিংগুয়াল ও হিফজ কার্যক্রম',
    to: '/programs',
    icon: BookOpen,
    accent: 'bg-[#087F5B]/10 text-[#087F5B]',
  },
  {
    label: 'ক্লাস রুটিন',
    desc: 'শ্রেণি ও শাখাভিত্তিক সময়সূচি',
    to: '/academic/class-routine',
    icon: Calendar,
    accent: 'bg-[#123B67]/10 text-[#123B67]',
  },
  {
    label: 'পরীক্ষার রুটিন',
    desc: 'আসন্ন পরীক্ষার তারিখ ও সময়',
    to: '/academic/exam-routine',
    icon: FileSpreadsheet,
    accent: 'bg-[#F4A62A]/15 text-[#B47009]',
  },
  {
    label: 'সিলেবাস ও পাঠ্যবই',
    desc: 'ডিজিটাল সিলেবাস ও নোটস',
    to: '/academic/syllabus',
    icon: BookOpen,
    accent: 'bg-[#21A9D6]/12 text-[#0E7DA3]',
  },
  {
    label: 'ক্যালেন্ডার ও ছুটি',
    desc: 'বার্ষিক একাডেমিক ক্যালেন্ডার',
    to: '/academic/calendar',
    icon: Calendar,
    accent: 'bg-[#087F5B]/10 text-[#087F5B]',
  },
];

export const PublicLayout: React.FC<PublicLayoutProps> = ({ currentUser }) => {
  const { settings, notices } = usePublicData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'institution' | 'academic' | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    setMobileMenuOpen(false);
    setOpenDropdown(null);

    const pageTitle =
      ROUTE_TITLES[location.pathname] ||
      (location.pathname.startsWith('/notices/')
        ? 'নোটিশ বিস্তারিত'
        : location.pathname.startsWith('/news/')
        ? 'সংবাদ বিস্তারিত'
        : location.pathname.startsWith('/faculty/')
        ? 'শিক্ষক প্রোফাইল'
        : location.pathname.startsWith('/students/')
        ? 'কৃতি শিক্ষার্থী বিস্তারিত'
        : location.pathname.startsWith('/gallery/')
        ? 'গ্যালারি মিডিয়া বিস্তারিত'
        : 'মূলপাতা');
    document.title = `${pageTitle} | ${settings.schoolNameBn}${settings.schoolNameEn ? ` (${settings.schoolNameEn})` : ''}`;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        `${settings.schoolNameBn}${settings.schoolNameEn ? ` (${settings.schoolNameEn})` : ''} — ${settings.address || ''}`
      );
    }
  }, [location.pathname, settings.schoolNameBn, settings.schoolNameEn, settings.address]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const tickerEntries = useMemo(() => {
    if (settings.tickerOverride && settings.tickerOverride.trim().length > 0) {
      return [{ id: '', title: settings.tickerOverride.trim() }];
    }
    if (notices.length > 0) {
      return notices.slice(0, 6).map((n) => ({ id: n.id, title: n.titleBn || n.title }));
    }
    return [
      {
        id: '',
        title: `${settings.schoolNameBn}-এ প্লে গ্রুপ থেকে ${settings.highestClass || 'অষ্টম শ্রেণি'} পর্যন্ত ভর্তি ও একাডেমিক কার্যক্রম চলছে।`,
      },
      {
        id: '',
        title: 'বাংলা ভার্সন, ইংরেজি ভার্সন এবং আরবি ভাষার সমন্বয়ে ট্রিলিংগুয়াল কারিকুলাম ও সহিহ কুরআন শিক্ষা।',
      },
    ];
  }, [settings.tickerOverride, settings.schoolNameBn, settings.highestClass, notices]);

  const isInstitutionActive = ['/about', '/faculty', '/governing-body', '/students'].some((p) =>
    location.pathname.startsWith(p)
  );
  const isAcademicActive = ['/academic', '/programs'].some((p) =>
    location.pathname.startsWith(p)
  );

  const footerQuickLinks = [
    { label: 'মূলপাতা', to: '/' },
    { label: 'প্রতিষ্ঠান পরিচিতি', to: '/about' },
    { label: 'আধুনিক ও ইসলামিক শিক্ষা', to: '/programs' },
    { label: 'একাডেমিক ও রুটিন', to: '/academic' },
    { label: 'শিক্ষকমণ্ডলী', to: '/faculty' },
    { label: 'পরিচালনা পর্ষদ', to: '/governing-body' },
    { label: 'শিক্ষার্থী ও অর্জন', to: '/students' },
    { label: 'অনলাইন ভর্তি আবেদন', to: '/admission' },
    { label: 'পরীক্ষার ফলাফল', to: '/results' },
    { label: 'ছবি গ্যালারি', to: '/gallery' },
    { label: 'নোটিশ বোর্ড', to: '/notices' },
    { label: 'যোগাযোগ', to: '/contact' },
  ];

  const telHref = `tel:${sanitizeTel(settings.phone)}`;
  const hasOfficialCodes = Boolean(
    settings.eiin?.trim() || settings.schoolCode?.trim() || settings.regNo?.trim()
  );
  const showVerifiedFacebook = Boolean(settings.facebookVerified && settings.facebookUrl?.trim());
  const showOfficialEmail = Boolean(settings.email?.trim());

  const urgentNoticeCount = useMemo(
    () => notices.filter((n) => n.category === 'Urgent' || n.isPinned).length,
    [notices]
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#F2F8F5] pb-18 text-[#102530] lg:pb-0">
      {/* ==================== TOP UTILITY BAR (Desktop & Tablet) ==================== */}
      <div className="hidden bg-gradient-to-r from-[#123B67] via-[#123B67] to-[#087F5B] text-white md:block">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sky-50/95">
            {settings.address && (
              <span className="inline-flex items-center gap-1.5 font-medium">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#F4A62A]" />
                <span>{settings.address}</span>
              </span>
            )}
            {settings.phone && (
              <a
                href={telHref}
                className="inline-flex items-center gap-1.5 font-semibold text-white transition hover:text-[#F4A62A]"
              >
                <Phone className="h-3.5 w-3.5 shrink-0 text-[#21A9D6]" />
                <span>{settings.phone}</span>
              </a>
            )}
            {showOfficialEmail && (
              <a
                href={`mailto:${settings.email}`}
                className="hidden items-center gap-1.5 transition hover:text-[#F4A62A] lg:inline-flex"
              >
                <Mail className="h-3.5 w-3.5 shrink-0 text-[#21A9D6]" />
                <span>{settings.email}</span>
              </a>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-sky-100">
            <span>স্থাপিত: {toBnDigits(settings.establishedYear || '২০১৯')} খ্রি.</span>
            <span className="text-white/30">|</span>
            <Link
              to="/admission"
              className="inline-flex items-center gap-1 rounded bg-[#F4A62A] px-2.5 py-0.5 font-bold text-[#123B67] transition hover:bg-[#f8b74b]"
            >
              অনলাইন ভর্তি আবেদন →
            </Link>
          </div>
        </div>
      </div>

      {/* ==================== STICKY MAIN NAVIGATION BAR ==================== */}
      <header className="sticky top-0 z-40 border-b border-[#D7E6DF] bg-white/95 shadow-xs backdrop-blur-md">
        <div
          ref={navRef}
          className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-2 px-3 sm:h-[68px] sm:gap-3 sm:px-6"
        >
          {/* Logo & School Name Lockup */}
          <Link to="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.schoolNameBn}
                className="h-9 w-9 shrink-0 rounded-xl border-2 border-[#087F5B]/20 object-cover sm:h-11 sm:w-11"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#087F5B] to-[#123B67] text-white shadow-sm ring-2 ring-[#F4A62A]/40 sm:h-11 sm:w-11">
                <GraduationCap className="h-5 w-5 text-[#F4A62A] sm:h-6 sm:w-6" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold leading-tight text-[#123B67] sm:text-[17px]">
                {settings.schoolNameBn}
              </p>
              <p className="truncate text-[10px] font-semibold text-[#087F5B] sm:text-xs">
                {settings.schoolNameEn || 'Shah Islamic School And College'}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation with Modern Dropdowns */}
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="প্রধান নেভিগেশন">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-lg px-2.5 py-2 text-[13px] font-semibold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-[#087F5B] text-white shadow-xs'
                    : 'text-[#1E3645] hover:bg-[#F2F8F5] hover:text-[#087F5B]'
                }`
              }
            >
              মূলপাতা
            </NavLink>

            {/* Institution Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setOpenDropdown('institution')}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                type="button"
                aria-expanded={openDropdown === 'institution'}
                onClick={() =>
                  setOpenDropdown((cur) => (cur === 'institution' ? null : 'institution'))
                }
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[13px] font-semibold whitespace-nowrap transition ${
                  isInstitutionActive
                    ? 'bg-[#087F5B] text-white shadow-xs'
                    : 'text-[#1E3645] hover:bg-[#F2F8F5] hover:text-[#087F5B]'
                }`}
              >
                <span>প্রতিষ্ঠান</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-150 ${
                    openDropdown === 'institution' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openDropdown === 'institution' && (
                <div className="absolute top-full left-0 z-50 w-72 pt-2">
                  <div className="overflow-hidden rounded-2xl border border-[#D7E6DF] bg-white p-2 shadow-xl">
                    {INSTITUTION_DROPDOWN.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setOpenDropdown(null)}
                          className={({ isActive }) =>
                            `flex items-start gap-3 rounded-xl p-2.5 transition ${
                              isActive
                                ? 'bg-[#F2F8F5] ring-1 ring-[#087F5B]/25'
                                : 'hover:bg-[#F2F8F5]'
                            }`
                          }
                        >
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.accent}`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#123B67]">{item.label}</p>
                            <p className="text-[11px] text-[#526B78]">{item.desc}</p>
                          </div>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Academic Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setOpenDropdown('academic')}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                type="button"
                aria-expanded={openDropdown === 'academic'}
                onClick={() =>
                  setOpenDropdown((cur) => (cur === 'academic' ? null : 'academic'))
                }
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[13px] font-semibold whitespace-nowrap transition ${
                  isAcademicActive
                    ? 'bg-[#087F5B] text-white shadow-xs'
                    : 'text-[#1E3645] hover:bg-[#F2F8F5] hover:text-[#087F5B]'
                }`}
              >
                <span>একাডেমিক</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-150 ${
                    openDropdown === 'academic' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openDropdown === 'academic' && (
                <div className="absolute top-full left-0 z-50 w-72 pt-2">
                  <div className="overflow-hidden rounded-2xl border border-[#D7E6DF] bg-white p-2 shadow-xl">
                    {ACADEMIC_DROPDOWN.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setOpenDropdown(null)}
                          className={({ isActive }) =>
                            `flex items-start gap-3 rounded-xl p-2.5 transition ${
                              isActive
                                ? 'bg-[#F2F8F5] ring-1 ring-[#087F5B]/25'
                                : 'hover:bg-[#F2F8F5]'
                            }`
                          }
                        >
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.accent}`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#123B67]">{item.label}</p>
                            <p className="text-[11px] text-[#526B78]">{item.desc}</p>
                          </div>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {[
              { label: 'ভর্তি', to: '/admission' },
              { label: 'ফলাফল', to: '/results' },
              { label: 'গ্যালারি', to: '/gallery' },
              { label: 'নোটিশ', to: '/notices' },
              { label: 'যোগাযোগ', to: '/contact' },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-2.5 py-2 text-[13px] font-semibold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-[#087F5B] text-white shadow-xs'
                      : 'text-[#1E3645] hover:bg-[#F2F8F5] hover:text-[#087F5B]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right Action Controls (Desktop + Compact Mobile) */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="hidden xl:block">
              <PWAInstallButton variant="pill" />
            </div>
            <div className="xl:hidden">
              <PWAInstallButton variant="compact" />
            </div>

            {currentUser ? (
              <Link
                to="/dashboard"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#087F5B] px-3 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] sm:h-10 sm:px-4 sm:text-sm"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span>ড্যাশবোর্ড</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#123B67] px-3 text-xs font-bold text-white shadow-xs transition hover:bg-[#0C2A4B] sm:h-10 sm:px-4 sm:text-sm"
              >
                <LogIn className="h-4 w-4 shrink-0 text-[#F4A62A]" />
                <span>লগইন</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ==================== NOTICE TICKER BAR (Non-Sticky to Preserve Viewport) ==================== */}
      <div className="border-b border-[#DCE8E1] bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-1.5 px-3 py-2 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
            <Link
              to="/notices"
              className="shrink-0 rounded-md bg-[#F4A62A] px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-[#123B67] shadow-2xs transition hover:bg-[#e5981e]"
            >
              আপডেট
            </Link>
            <div className="relative flex-1 overflow-hidden">
              <div className="ticker-track flex items-center gap-10 whitespace-nowrap text-xs font-semibold text-[#1E3645] sm:text-sm">
                {[...tickerEntries, ...tickerEntries].map((item, idx) => (
                  <Link
                    key={`${idx}-${item.title.slice(0, 12)}`}
                    to={item.id ? `/notices/${item.id}` : '/notices'}
                    className="inline-flex items-center gap-2 transition hover:text-[#087F5B]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#21A9D6]" />
                    <span>{item.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-l border-[#E6F0EA] pl-4 text-xs text-[#47606D] lg:flex">
            {hasOfficialCodes ? (
              <>
                {settings.eiin?.trim() && (
                  <span>
                    EIIN: <strong className="font-bold text-[#123B67]">{toBnDigits(settings.eiin)}</strong>
                  </span>
                )}
                {settings.schoolCode?.trim() && (
                  <span>
                    কোড: <strong className="font-bold text-[#123B67]">{toBnDigits(settings.schoolCode)}</strong>
                  </span>
                )}
              </>
            ) : (
              <>
                <span>
                  শ্রেণি: <strong className="font-bold text-[#087F5B]">প্লে – {settings.highestClass || 'অষ্টম শ্রেণি'}</strong>
                </span>
                <span>
                  শিফট: <strong className="font-bold text-[#123B67]">{(settings.shifts || ['মর্নিং শিফট', 'ডে শিফট']).join(' ও ')}</strong>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ==================== PAGE CONTENT OUTLET WITH SMOOTH TRANSITION ==================== */}
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-3 py-4 sm:px-6 sm:py-6">
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>

      {/* ==================== FOOTER (Navy Blue + Emerald + Orange Accent) ==================== */}
      <footer className="mt-10 border-t-4 border-[#F4A62A] bg-[#123B67] text-sky-50">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.schoolNameBn}
                  className="h-11 w-11 shrink-0 rounded-xl border border-white/25 object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#087F5B] text-[#F4A62A] shadow-sm">
                  <GraduationCap className="h-6 w-6" />
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-white">{settings.schoolNameBn}</h3>
                {settings.schoolNameEn && (
                  <p className="text-xs font-medium text-[#21A9D6]">{settings.schoolNameEn}</p>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-sky-100/90">
              {settings.schoolSubtitleBn}
            </p>
            <p className="mt-2.5 text-xs font-semibold text-[#F4A62A]">
              স্থাপিত: {toBnDigits(settings.establishedYear || '২০১৯')} খ্রি. · সর্বোচ্চ শ্রেণি:{' '}
              {settings.highestClass || 'অষ্টম শ্রেণি'}
            </p>
            {hasOfficialCodes && (
              <p className="mt-1.5 text-xs text-sky-100/85">
                {[
                  settings.eiin?.trim() ? `EIIN: ${toBnDigits(settings.eiin)}` : '',
                  settings.schoolCode?.trim() ? `প্রতিষ্ঠান কোড: ${toBnDigits(settings.schoolCode)}` : '',
                  settings.regNo?.trim() ? `রেজিস্ট্রেশন নং: ${toBnDigits(settings.regNo)}` : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>

          <div>
            <h4 className="text-sm font-bold text-white">গুরুত্বপূর্ণ পেজসমূহ</h4>
            <div className="mt-1.5 h-0.5 w-10 rounded-full bg-[#21A9D6]" />
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-sky-100/90">
              {footerQuickLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="transition hover:text-[#F4A62A] hover:underline"
                >
                  • {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white">যোগাযোগ ও ঠিকানা</h4>
            <div className="mt-1.5 h-0.5 w-10 rounded-full bg-[#F4A62A]" />
            <ul className="mt-3 space-y-2.5 text-xs text-sky-100/95">
              {settings.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F4A62A]" />
                  <span>{settings.address}</span>
                </li>
              )}
              {settings.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-[#21A9D6]" />
                  <a href={telHref} className="font-bold text-white hover:text-[#F4A62A] hover:underline">
                    {settings.phone}
                  </a>
                </li>
              )}
              {showOfficialEmail && (
                <li className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-[#21A9D6]" />
                  <a href={`mailto:${settings.email}`} className="hover:text-[#F4A62A] hover:underline">
                    {settings.email}
                  </a>
                </li>
              )}
              {settings.websiteUrl && (
                <li className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 shrink-0 text-[#21A9D6]" />
                  <a
                    href={settings.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#F4A62A] hover:underline"
                  >
                    {settings.websiteUrl.replace(/^https?:\/\//, '')}
                  </a>
                </li>
              )}
              {showVerifiedFacebook && (
                <li className="flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#21A9D6]" />
                  <a
                    href={settings.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-sky-200 hover:text-white hover:underline"
                  >
                    অফিসিয়াল ফেসবুক পেজ
                  </a>
                </li>
              )}
              {settings.shifts && settings.shifts.length > 0 && (
                <li className="pt-1 font-medium text-emerald-200">
                  শিফট: {settings.shifts.join(' ও ')}
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 bg-[#0D2B4C] py-3.5 text-center text-xs text-sky-200/90">
          © {toBnDigits(new Date().getFullYear())} {settings.schoolNameBn}
          {settings.schoolNameEn ? ` (${settings.schoolNameEn})` : ''} · সর্বস্বত্ব সংরক্ষিত।
        </div>
      </footer>

      {/* ==================== MOBILE APP FIXED BOTTOM NAVIGATION BAR ==================== */}
      <nav
        aria-label="মোবাইল নিচের নেভিগেশন"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-[#D7E6DF] bg-white/95 shadow-[0_-4px_20px_rgba(18,59,103,0.08)] backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto grid h-14 max-w-lg grid-cols-5 items-center px-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition ${
                isActive ? 'text-[#087F5B]' : 'text-[#526B78]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Home className={`h-5 w-5 ${isActive ? 'stroke-[2.4]' : ''}`} />
                <span>মূলপাতা</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/notices"
            className={({ isActive }) =>
              `relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition ${
                isActive ? 'text-[#087F5B]' : 'text-[#526B78]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Bell className={`h-5 w-5 ${isActive ? 'stroke-[2.4]' : ''}`} />
                  {urgentNoticeCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#F4A62A] px-1 text-[9px] font-extrabold text-[#123B67]">
                      {toBnDigits(urgentNoticeCount)}
                    </span>
                  )}
                </div>
                <span>নোটিশ</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/admission"
            className={({ isActive }) =>
              `flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition ${
                isActive ? 'text-[#087F5B]' : 'text-[#123B67]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-8 w-11 items-center justify-center rounded-xl transition ${
                    isActive
                      ? 'bg-[#087F5B] text-white shadow-sm'
                      : 'bg-[#F4A62A]/20 text-[#123B67]'
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                </span>
                <span className="leading-none">ভর্তি</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/results"
            className={({ isActive }) =>
              `flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition ${
                isActive ? 'text-[#087F5B]' : 'text-[#526B78]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Search className={`h-5 w-5 ${isActive ? 'stroke-[2.4]' : ''}`} />
                <span>ফলাফল</span>
              </>
            )}
          </NavLink>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="সম্পূর্ণ মেনু খুলুন"
            className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition ${
              mobileMenuOpen ? 'text-[#087F5B]' : 'text-[#526B78]'
            }`}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span>মেনু</span>
          </button>
        </div>
      </nav>

      {/* ==================== MOBILE SLIDE-UP APP MENU SHEET ==================== */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-[#091C2B]/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="sheet-enter max-h-[84vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5EFE9] bg-white px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-[#123B67]">{settings.schoolNameBn}</h2>
                <p className="text-[11px] font-medium text-[#087F5B]">সকল বিভাগ ও ডিজিটাল সেবা</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="মেনু বন্ধ করুন"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2F8F5] text-[#123B67]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5 pb-8">
              <div>
                <p className="mb-2.5 text-xs font-bold text-[#123B67]">প্রতিষ্ঠান ও প্রশাসন</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {INSTITUTION_DROPDOWN.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl border border-[#DCE8E1] bg-[#F8FBF9] p-3 transition active:scale-98"
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.accent}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-xs font-bold text-[#123B67]">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2.5 text-xs font-bold text-[#087F5B]">একাডেমিক ও পাঠ্যক্রম</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {ACADEMIC_DROPDOWN.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl border border-[#DCE8E1] bg-[#F8FBF9] p-3 transition active:scale-98"
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.accent}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-xs font-bold text-[#123B67]">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2.5 text-xs font-bold text-[#0E7DA3]">অন্যান্য সেবা</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'ছবি গ্যালারি', to: '/gallery', icon: ImageIcon },
                    { label: 'সংবাদ', to: '/news', icon: Bell },
                    { label: 'যোগাযোগ', to: '/contact', icon: MapPin },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[#DCE8E1] bg-white p-3 text-center text-xs font-bold text-[#123B67] shadow-2xs"
                      >
                        <Icon className="h-4 w-4 text-[#21A9D6]" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* PWA Install + Direct Call */}
              <div className="space-y-2.5 border-t border-[#E5EFE9] pt-4">
                <PWAInstallButton variant="full" />
                {settings.phone && (
                  <a
                    href={telHref}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#087F5B]/30 bg-[#F2F8F5] py-3 text-xs font-bold text-[#087F5B]"
                  >
                    <Phone className="h-4 w-4" />
                    <span>হেল্পলাইনে কল করুন: {settings.phone}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== OFFLINE STATUS INDICATOR ==================== */}
      <OfflineIndicator />
    </div>
  );
};
