import React, { useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Moon,
  Save,
  ShieldCheck,
  Sun,
  User,
} from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { clampStr } from '../../lib/grading';
import { ROLE_BN } from '../../i18n';
import type { UserAccount } from '../../types';
import { useUIFeedback } from '../ToastContext';

interface Props {
  currentUser: UserAccount;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const ProfileSecurityModule: React.FC<Props> = ({
  currentUser,
  isDark,
  onToggleTheme,
}) => {
  const { notify } = useUIFeedback();
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: clampStr(displayName, 120),
        updatedAt: serverTimestamp(),
      });
      notify('আপনার প্রোফাইল তথ্য সফলভাবে আপডেট করা হয়েছে।', 'success');
    } catch (err) {
      notify('প্রোফাইল আপডেট করতে সমস্যা হয়েছে।', 'error');
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!currentUser.email) return;
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      notify(`${currentUser.email} ঠিকানায় পাসওয়ার্ড রিসেট ইমেইল পাঠানো হয়েছে।`, 'info');
    } catch {
      notify(
        'আপনার অ্যাকাউন্টটি গুগল সাইন-ইন দিয়ে পরিচালিত। গুগল অ্যাকাউন্ট সেটিংস থেকে পাসওয়ার্ড পরিবর্তন করুন।',
        'warning'
      );
    } finally {
      setSendingReset(false);
    }
  };

  const providers = auth.currentUser?.providerData?.map((p) => p.providerId) || [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-[#123B67] via-[#123B67] to-[#805AD5] p-6 text-white shadow-sm">
        <p className="text-xs font-bold text-[#F4A62A]">অ্যাকাউন্ট ও নিরাপত্তা</p>
        <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">প্রোফাইল ও সিকিউরিটি সেটিংস</h2>
        <p className="mt-1 text-xs text-sky-100">
          আপনার ব্যক্তিগত তথ্য, অ্যাকাউন্টের ভূমিকা, ড্যাশবোর্ড থিম এবং নিরাপত্তা সেটিংস নিয়ন্ত্রণ করুন।
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Profile Edit Card */}
        <form
          onSubmit={handleSaveProfile}
          className="space-y-5 rounded-2xl border border-[#D4E6DD] bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-7"
        >
          <div className="flex items-center gap-3 border-b border-[#E6F0EA] pb-4 dark:border-slate-800">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#087F5B]/12 text-[#087F5B] dark:bg-[#087F5B]/25 dark:text-emerald-300">
              <User className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-[#123B67] dark:text-white">ব্যক্তিগত প্রোফাইল তথ্য</h3>
              <p className="text-xs text-[#526B78] dark:text-slate-400">ড্যাশবোর্ডে প্রদর্শিত আপনার নাম ও পরিচয়</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-200">
                পূর্ণ নাম *
              </label>
              <input
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-[#CBE0D6] bg-white px-3.5 py-2.5 text-sm text-[#263B35] focus:border-[#087F5B] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-200">
                ইমেইল ঠিকানা
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-[#DCE8E1] bg-[#F2F8F5] px-3.5 py-2.5 text-sm text-[#4B6370] dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                <Mail className="h-4 w-4 shrink-0 text-[#21A9D6]" />
                <span className="truncate">{currentUser.email}</span>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-200">
                সিস্টেম ভূমিকা (Role)
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-[#DCE8E1] bg-[#F2F8F5] px-3.5 py-2.5 text-sm font-bold text-[#087F5B] dark:border-slate-700 dark:bg-slate-800/70 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>{ROLE_BN[currentUser.role] || currentUser.role}</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#087F5B] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'সংরক্ষণ হচ্ছে...' : 'প্রোফাইল সংরক্ষণ করুন'}
          </button>
        </form>

        {/* Security & Theme Preferences */}
        <div className="space-y-5 lg:col-span-5">
          <div className="rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#805AD5]/15 text-[#805AD5]">
                {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#123B67] dark:text-white">ড্যাশবোর্ড থিম মোড</h3>
                <p className="text-[11px] text-[#526B78] dark:text-slate-400">লাইট বা ডার্ক থিম বেছে নিন</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleTheme}
              className="mt-4 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-[#CBE0D6] bg-[#F2F8F5] px-4 py-2 text-xs font-bold text-[#123B67] transition hover:bg-[#087F5B] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {isDark ? <Sun className="h-4 w-4 text-[#F4A62A]" /> : <Moon className="h-4 w-4 text-[#805AD5]" />}
              {isDark ? 'লাইট থিমে পরিবর্তন করুন' : 'ডার্ক থিমে পরিবর্তন করুন'}
            </button>
          </div>

          <div className="rounded-2xl border border-[#D4E6DD] bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F4A62A]/20 text-[#B47009]">
                <Lock className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#123B67] dark:text-white">লগইন ও পাসওয়ার্ড নিরাপত্তা</h3>
                <p className="text-[11px] text-[#526B78] dark:text-slate-400">অ্যাকাউন্ট সুরক্ষা ও রিসেট লিংক</p>
              </div>
            </div>

            <div className="mt-3.5 space-y-2 rounded-xl bg-[#F2F8F5] p-3 text-xs text-[#38515E] dark:bg-slate-800/70 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#087F5B]" />
                <span>অথেনটিকেশন মাধ্যম: {providers.join(', ') || 'Google / Firebase Auth'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#087F5B]" />
                <span>রোল-ভিত্তিক ফায়ারস্টোর সিকিউরিটি সক্রিয়</span>
              </div>
            </div>

            <button
              type="button"
              disabled={sendingReset}
              onClick={handlePasswordReset}
              className="mt-4 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-[#123B67] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0B2746] disabled:opacity-60"
            >
              <KeyRound className="h-4 w-4 text-[#F4A62A]" />
              {sendingReset ? 'পাঠানো হচ্ছে...' : 'পাসওয়ার্ড রিসেট ইমেইল পাঠান'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
