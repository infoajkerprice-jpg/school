import React, { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './lib/firebase';
import { clampStr } from './lib/grading';
import { labelClass, toBnDigits } from './i18n';
import { BD_CLASSES, type UserAccount } from './types';
import { PublicDataProvider, usePublicData } from './context/PublicDataContext';
import { PublicLayout } from './components/PublicLayout';
import { PortalShell } from './components/PortalShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UIFeedbackProvider, useUIFeedback } from './components/ToastContext';
import { HomePage } from './components/pages/HomePage';
import { AboutPage } from './components/pages/AboutPage';
import { AcademicPage } from './components/pages/AcademicPage';
import { EducationProgramsPage } from './components/pages/EducationProgramsPage';
import { FacultyPage, GoverningBodyPage, TeacherDetailPage } from './components/pages/FacultyPages';
import {
  StudentAchievementDetailPage,
  StudentsAchievementsPage,
} from './components/pages/StudentsAchievementsPage';
import { ResultsPage } from './components/pages/ResultsPage';
import { AdmissionPage } from './components/pages/AdmissionPage';
import { GalleryDetailPage, GalleryPage } from './components/pages/GalleryPage';
import { NoticeDetailPage, NoticesPage } from './components/pages/NoticesPages';
import { NewsDetailPage, NewsPage } from './components/pages/NewsPages';
import { ContactPage, NotFoundPage } from './components/pages/ContactPage';
import { VerifyStudentPage } from './components/pages/VerifyStudentPage';

function mapAuthErrorToBn(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: string }).code)
      : '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়। অনুগ্রহ করে যাচাই করে আবার চেষ্টা করুন অথবা গুগল অ্যাকাউন্ট দিয়ে লগইন করুন।';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'বর্তমানে এই পোর্টালে গুগল সাইন-ইন সক্রিয় রয়েছে। নিচের "গুগল অ্যাকাউন্ট দিয়ে লগইন করুন" বাটন ব্যবহার করুন।';
  }
  if (code === 'auth/too-many-requests') {
    return 'অতিরিক্ত প্রচেষ্টার কারণে সাময়িকভাবে লগইন স্থগিত রয়েছে। কিছুক্ষণ পর চেষ্টা করুন।';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'লগইন পপ-আপ বন্ধ করা হয়েছে। আবার চেষ্টা করুন।';
  }
  return err instanceof Error
    ? `লগইন সম্পন্ন হয়নি: ${err.message}`
    : 'লগইন ব্যর্থ হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।';
}

const LoginPage: React.FC<{
  firebaseUser: User | null;
  authBusy: boolean;
  authError: string | null;
  onGoogleLogin: (redirectPath: string, rememberMe: boolean) => Promise<void>;
  onEmailLogin: (email: string, password: string, redirectPath: string, rememberMe: boolean) => Promise<void>;
}> = ({ firebaseUser, authBusy, authError, onGoogleLogin, onEmailLogin }) => {
  const { settings } = usePublicData();
  const { notify } = useUIFeedback();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [resetBusy, setResetBusy] = useState(false);
  const [localInfo, setLocalInfo] = useState<string | null>(null);

  useEffect(() => {
    document.title = `অ্যাডমিন ও পোর্টাল লগইন | ${settings.schoolNameBn}`;
  }, [settings.schoolNameBn]);

  if (firebaseUser) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalInfo(null);
    if (!email.trim() || !password) return;
    await onEmailLogin(email.trim(), password, redirectTo, rememberMe);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      notify('পাসওয়ার্ড রিসেট করতে প্রথমে আপনার নিবন্ধিত ইমেইল ঠিকানা লিখুন।', 'warning');
      return;
    }
    setResetBusy(true);
    setLocalInfo(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      const msg = `${email.trim()} ঠিকানায় পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে। ইনবক্স যাচাই করুন।`;
      setLocalInfo(msg);
      notify(msg, 'success');
    } catch (err) {
      notify(mapAuthErrorToBn(err), 'error');
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#F5F9F7] px-3 py-4 sm:px-4 sm:py-8 lg:bg-[#F2F8F5]">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-[#CFE2D8] bg-white shadow-xl sm:rounded-3xl lg:grid-cols-12 lg:shadow-2xl">
        {/* Left Brand Panel */}
        <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#123B67] via-[#0E4A66] to-[#087F5B] p-5 text-white sm:p-7 lg:col-span-5 lg:p-10">
          <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-[#21A9D6]/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-60 w-60 rounded-full bg-[#805AD5]/25 blur-2xl" />

          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1 shadow-md ring-2 ring-[#F4A62A]/70 sm:h-14 sm:w-14">
                <img
                  src={settings.logoUrl || '/school-logo.png'}
                  alt={settings.schoolNameBn}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10.5px] font-bold tracking-wide text-[#F4A62A] sm:text-[11px]">
                  স্থাপিত: {toBnDigits(settings.establishedYear || '২০১৯')} খ্রি.
                </p>
                <h1 className="text-base font-extrabold leading-tight sm:text-xl">
                  {settings.schoolNameBn}
                </h1>
              </div>
            </Link>

            {settings.schoolNameEn && (
              <p className="mt-1.5 text-[11px] font-semibold text-[#7DD3FC] sm:mt-2 sm:text-xs">{settings.schoolNameEn}</p>
            )}

            <div className="mt-4 hidden rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xs lg:mt-6 lg:block">
              <p className="text-xs font-bold text-[#F4A62A]">“এসো শিখি দুনিয়া ও আখিরাতের কল্যাণে”</p>
              <p className="mt-1.5 text-xs leading-relaxed text-sky-100/90">
                অ্যাডমিন, শিক্ষকমণ্ডলী, শিক্ষার্থী ও অভিভাবকদের জন্য সমন্বিত ডিজিটাল স্কুল ম্যানেজমেন্ট ও ওয়েবসাইট কন্ট্রোল পোর্টাল।
              </p>
            </div>

            <ul className="mt-6 hidden space-y-3 text-xs text-sky-50/95 lg:block">
              {[
                { text: 'রোল-ভিত্তিক নিরাপদ প্রবেশাধিকার (অ্যাডমিন, শিক্ষক, শিক্ষার্থী, অভিভাবক)', accent: 'text-[#F4A62A]' },
                { text: 'রিয়েল-টাইম নোটিশ, ভর্তি, উপস্থিতি ও ফলাফল পরিচালনা', accent: 'text-[#21A9D6]' },
                { text: 'হোমপেজ স্লাইডার, গ্যালারি ও সম্পূর্ণ ওয়েবসাইট CMS কন্ট্রোল', accent: 'text-[#34D399]' },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-2.5">
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${item.accent}`} />
                  <span className="leading-relaxed">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 mt-8 hidden border-t border-white/15 pt-4 text-[11px] text-sky-100/80 lg:block">
            <p className="font-semibold text-white">তুলসীঘাট, গাইবান্ধা সদর, গাইবান্ধা-৫৭০০</p>
            <p className="mt-0.5">সহায়তায়: {toBnDigits(settings.phone || '+880 1711-759705')}</p>
          </div>
        </div>

        {/* Right Login Form Panel */}
        <div className="flex flex-col justify-center p-5 sm:p-10 lg:col-span-7">
          <div className="mx-auto w-full max-w-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#087F5B]">
                  <ShieldCheck className="h-4 w-4 text-[#087F5B]" />
                  সুরক্ষিত পোর্টাল প্রবেশ
                </span>
                <h2 className="mt-1 text-2xl font-extrabold text-[#123B67]">
                  অ্যাডমিন ও পোর্টাল লগইন
                </h2>
              </div>
              <Link
                to="/"
                className="inline-flex items-center gap-1 rounded-xl border border-[#D4E6DD] bg-[#F2F8F5] px-3 py-2 text-xs font-bold text-[#123B67] transition hover:bg-[#123B67] hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                ওয়েবসাইট
              </Link>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-[#4F6875]">
              আপনার নিবন্ধিত গুগল অ্যাকাউন্ট অথবা ইমেইল ও পাসওয়ার্ড ব্যবহার করে ড্যাশবোর্ডে প্রবেশ করুন।
            </p>

            {authError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-rose-700">
                {authError}
              </div>
            )}

            {localInfo && (
              <div className="mt-4 rounded-xl border border-[#087F5B]/30 bg-[#E9F7F1] px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-[#087F5B]">
                {localInfo}
              </div>
            )}

            {/* Primary One-Click Google Login (Preserves Firebase Google Auth & Bootstrapped Admin) */}
            <div className="mt-5">
              <button
                type="button"
                disabled={authBusy}
                onClick={() => void onGoogleLogin(redirectTo, rememberMe)}
                className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl border-2 border-[#087F5B] bg-[#087F5B] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#087F5B]/20 transition hover:-translate-y-0.5 hover:bg-[#06684A] disabled:opacity-60"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.07 7.94-2.89l-3.88-3c-1.07.72-2.44 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.1A12 12 0 0 0 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.27 14.3a7.21 7.21 0 0 1 0-4.6V6.6H1.26a12 12 0 0 0 0 10.8l4.01-3.1Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.74c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.6l4.01 3.1c.95-2.85 3.6-4.96 6.73-4.96Z"
                    />
                  </svg>
                </span>
                <span>{authBusy ? 'লগইন হচ্ছে...' : 'গুগল অ্যাকাউন্ট দিয়ে দ্রুত লগইন করুন'}</span>
              </button>
            </div>

            {/* Clean Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#DCE8E1]" />
              <span className="text-[11px] font-bold text-[#607A85]">অথবা ইমেইল ও পাসওয়ার্ড</span>
              <div className="h-px flex-1 bg-[#DCE8E1]" />
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-xs font-bold text-[#263B35]">
                  ইমেইল ঠিকানা
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#647E8B]" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@shahislamic.edu.bd"
                    className="w-full rounded-xl border border-[#CFE0D6] bg-[#F9FCFA] py-2.5 pr-3.5 pl-10 text-sm text-[#263B35] transition focus:border-[#087F5B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087F5B]/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-xs font-bold text-[#263B35]">
                  পাসওয়ার্ড
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#647E8B]" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#CFE0D6] bg-[#F9FCFA] py-2.5 pr-11 pl-10 text-sm text-[#263B35] transition focus:border-[#087F5B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087F5B]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg p-1.5 text-[#587280] transition hover:bg-[#E9F7F1] hover:text-[#087F5B]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <label className="inline-flex cursor-pointer items-center gap-2 font-semibold text-[#38525E]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#087F5B]"
                  />
                  আমাকে মনে রাখুন
                </label>
                <button
                  type="button"
                  disabled={resetBusy}
                  onClick={() => void handleForgotPassword()}
                  className="inline-flex items-center gap-1 font-bold text-[#805AD5] transition hover:text-[#123B67] hover:underline disabled:opacity-50"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  {resetBusy ? 'পাঠানো হচ্ছে...' : 'পাসওয়ার্ড ভুলে গেছেন?'}
                </button>
              </div>

              <button
                type="submit"
                disabled={authBusy}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#123B67] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0D2E52] disabled:opacity-60"
              >
                <span>{authBusy ? 'যাচাই হচ্ছে...' : 'ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন'}</span>
                <ArrowRight className="h-4 w-4 text-[#F4A62A]" />
              </button>
            </form>

            <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#E2EFE8] bg-[#F2F8F5] px-3.5 py-2.5 text-[11px] text-[#45606C]">
              <Sparkles className="h-4 w-4 shrink-0 text-[#F4A62A]" />
              <span>
                প্রথমবার লগইন করলে আপনার ভূমিকা অনুযায়ী ড্যাশবোর্ড স্বয়ংক্রিয়ভাবে প্রস্তুত হয়ে যাবে।
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function AppInner() {
  const navigate = useNavigate();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserAccount | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [needsRegistration, setNeedsRegistration] = useState(false);

  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState<'student' | 'parent'>('student');
  const [regClass, setRegClass] = useState<string>('Class 6');

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      setAuthReady(true);
      if (!u) {
        setUserProfile(null);
        setNeedsRegistration(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    setProfileLoading(true);

    const userRef = doc(db, 'users', firebaseUser.uid);
    let unsub: (() => void) | null = null;

    const setup = async () => {
      try {
        const snap = await getDoc(userRef);
        const emailLower = (firebaseUser.email || '').toLowerCase();
        const isBootstrapAdmin = emailLower === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

        if (!snap.exists()) {
          if (isBootstrapAdmin) {
            const displayName = clampStr(firebaseUser.displayName || 'প্রধান প্রশাসক', 120);
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              displayName,
              email: firebaseUser.email || BOOTSTRAPPED_ADMIN_EMAIL,
              role: 'admin',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            await setDoc(doc(db, 'admins', firebaseUser.uid), {
              uid: firebaseUser.uid,
              email: firebaseUser.email || BOOTSTRAPPED_ADMIN_EMAIL,
              grantedBy: firebaseUser.uid,
              createdAt: serverTimestamp(),
            });
            setNeedsRegistration(false);
          } else {
            setRegName(firebaseUser.displayName || '');
            setNeedsRegistration(true);
            setProfileLoading(false);
            return;
          }
        }

        unsub = onSnapshot(
          userRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile({ id: docSnap.id, ...docSnap.data() } as UserAccount);
              setNeedsRegistration(false);
            }
            setProfileLoading(false);
          },
          (err) => {
            setProfileLoading(false);
            handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
          }
        );
      } catch (err) {
        setProfileLoading(false);
        console.error('Profile bootstrap error:', err);
      }
    };

    void setup();
    return () => {
      if (unsub) unsub();
    };
  }, [firebaseUser]);

  const handleGoogleLogin = async (redirectPath: string, rememberMe: boolean) => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );
      await signInWithPopup(auth, googleProvider);
      navigate(redirectPath || '/dashboard', { replace: true });
    } catch (err) {
      setAuthError(mapAuthErrorToBn(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleEmailLogin = async (
    email: string,
    password: string,
    redirectPath: string,
    rememberMe: boolean
  ) => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );
      await signInWithEmailAndPassword(auth, email, password);
      navigate(redirectPath || '/dashboard', { replace: true });
    } catch (err) {
      setAuthError(mapAuthErrorToBn(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setAuthBusy(true);
    setAuthError(null);
    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        displayName: clampStr(regName || firebaseUser.displayName || 'ব্যবহারকারী', 120),
        email: firebaseUser.email || '',
        role: regRole,
        className: regClass,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNeedsRegistration(false);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setAuthError('প্রোফাইল সংরক্ষণ করতে সমস্যা হয়েছে।');
      handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUserProfile(null);
    navigate('/', { replace: true });
  };

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F8F5]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#D4E6DD] border-t-[#087F5B]" />
          <p className="mt-3 text-sm font-semibold text-[#123B67]">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  const renderRegistrationScreen = () => (
    <div className="flex min-h-screen items-center justify-center bg-[#F2F8F5] p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#D4E6DD] bg-white shadow-xl">
        <div className="bg-gradient-to-r from-[#123B67] to-[#087F5B] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <GraduationCap className="h-6 w-6 text-[#F4A62A]" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold">পোর্টাল নিবন্ধন সম্পন্ন করুন</h2>
              <p className="text-xs text-sky-100">{firebaseUser?.email}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleCompleteRegistration} className="space-y-4 p-6">
          {authError && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{authError}</div>
          )}
          <div>
            <label className="mb-1 block text-xs font-bold text-[#263B35]">আপনার পূর্ণ নাম *</label>
            <input
              required
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="আপনার নাম লিখুন"
              className="w-full rounded-xl border border-[#CFE0D6] px-3 py-2.5 text-sm focus:border-[#087F5B] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[#263B35]">অ্যাকাউন্টের ধরন *</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'student', label: 'শিক্ষার্থী প্যানেল' },
                  { id: 'parent', label: 'অভিভাবক প্যানেল' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRegRole(opt.id)}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                    regRole === opt.id
                      ? 'border-[#087F5B] bg-[#087F5B] text-white'
                      : 'border-[#CFE0D6] bg-white text-[#263B35]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[#263B35]">শ্রেণি নির্বাচন</label>
            <select
              value={regClass}
              onChange={(e) => setRegClass(e.target.value)}
              className="w-full rounded-xl border border-[#CFE0D6] bg-white px-3 py-2.5 text-sm focus:border-[#087F5B] focus:outline-none"
            >
              {BD_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {labelClass(c)}
                </option>
              ))}
            </select>
          </div>
          <p className="rounded-xl bg-[#F2F8F5] p-3 text-[11px] text-[#4C6357]">
            শিক্ষক বা প্রশাসক অনুমোদনের জন্য নিবন্ধনের পর প্রতিষ্ঠান প্রধান বা অ্যাডমিনের সাথে যোগাযোগ করুন।
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={authBusy}
              className="flex-1 rounded-xl bg-[#087F5B] py-2.5 text-sm font-bold text-white transition hover:bg-[#06684A]"
            >
              {authBusy ? 'সংরক্ষণ হচ্ছে...' : 'নিবন্ধন সম্পন্ন করুন'}
            </button>
            <Link
              to="/"
              className="rounded-xl bg-[#F2F8F5] px-4 py-2.5 text-xs font-bold text-[#123B67]"
            >
              বাতিল
            </Link>
          </div>
        </form>
      </div>
    </div>
  );

  const renderDashboardGuard = () => {
    if (!firebaseUser) {
      return <Navigate to="/login" replace />;
    }
    if (needsRegistration) {
      return renderRegistrationScreen();
    }
    if (profileLoading || !userProfile) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F2F8F5]">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#DCE8E1] border-t-[#087F5B]" />
            <p className="mt-3 text-sm font-semibold text-[#123B67]">ড্যাশবোর্ড প্রস্তুত হচ্ছে...</p>
          </div>
        </div>
      );
    }
    return <PortalShell currentUser={userProfile} onLogout={handleLogout} />;
  };

  return (
    <PublicDataProvider>
      <Routes>
        {/* Dedicated Public Multi-Page Website Routes */}
        <Route element={<PublicLayout currentUser={userProfile} />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/programs" element={<EducationProgramsPage />} />
          <Route path="/academic" element={<AcademicPage section="class_routine" />} />
          <Route path="/academic/class-routine" element={<AcademicPage section="class_routine" />} />
          <Route path="/academic/exam-routine" element={<AcademicPage section="exam_routine" />} />
          <Route path="/academic/syllabus" element={<AcademicPage section="syllabus" />} />
          <Route path="/academic/calendar" element={<AcademicPage section="calendar" />} />
          <Route path="/faculty" element={<FacultyPage />} />
          <Route path="/faculty/:id" element={<TeacherDetailPage />} />
          <Route path="/governing-body" element={<GoverningBodyPage />} />
          <Route path="/students" element={<StudentsAchievementsPage />} />
          <Route path="/students/:id" element={<StudentAchievementDetailPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/admission" element={<AdmissionPage authUid={firebaseUser?.uid ?? null} />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/gallery/:id" element={<GalleryDetailPage />} />
          <Route path="/notices" element={<NoticesPage />} />
          <Route path="/notices/:id" element={<NoticeDetailPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:id" element={<NewsDetailPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/verify" element={<VerifyStudentPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Dedicated Auth & Role-Based Dashboard Routes */}
        <Route
          path="/login"
          element={
            <LoginPage
              firebaseUser={firebaseUser}
              authBusy={authBusy}
              authError={authError}
              onGoogleLogin={handleGoogleLogin}
              onEmailLogin={handleEmailLogin}
            />
          }
        />
        <Route path="/dashboard/*" element={renderDashboardGuard()} />
      </Routes>
    </PublicDataProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <UIFeedbackProvider>
        <AppInner />
      </UIFeedbackProvider>
    </ErrorBoundary>
  );
}
