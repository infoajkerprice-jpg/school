import React, { useEffect, useState } from 'react';
import {
  Activity,
  Building,
  CreditCard,
  DatabaseBackup,
  Download,
  Loader2,
  Mail,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, makeSafeDocId, OperationType } from '../../lib/firebase';
import { usePublicData } from '../../context/PublicDataContext';
import { clampStr } from '../../lib/grading';
import { toBnDigits } from '../../i18n';
import { AdminModuleHeader } from '../AdminPagination';
import { useUIFeedback } from '../ToastContext';
import type { AuditLogEntry, UserAccount } from '../../types';

interface Props {
  currentUser: UserAccount;
}

const BACKUP_COLLECTIONS = [
  'site_settings',
  'students',
  'faculty',
  'staff_members',
  'admissions',
  'attendance',
  'published_results',
  'routines',
  'fee_invoices',
  'financial_entries',
  'notices',
  'library_resources',
  'book_loans',
  'transport_routes',
  'leave_requests',
  'certificates',
  'feedback_messages',
];

export const SystemAdminModule: React.FC<Props> = ({ currentUser }) => {
  const { settings } = usePublicData();
  const { notify } = useUIFeedback();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [backingUp, setBackingUp] = useState(false);
  const [logAction, setLogAction] = useState('');
  const [logDetails, setLogDetails] = useState('');

  useEffect(() => {
    return onSnapshot(
      collection(db, 'audit_logs'),
      (s) =>
        setLogs(
          s.docs
            .map((d) => ({ id: d.id, ...d.data() } as AuditLogEntry))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        ),
      (e) => handleFirestoreError(e, OperationType.LIST, 'audit_logs')
    );
  }, []);

  const recordAudit = async (action: string, moduleName: string, details: string) => {
    const id = makeSafeDocId('log');
    await setDoc(doc(db, 'audit_logs', id), {
      actorUid: currentUser.uid,
      actorName: clampStr(currentUser.displayName, 120),
      action: clampStr(action, 120),
      module: clampStr(moduleName, 80),
      details: clampStr(details, 500),
      createdAt: serverTimestamp(),
    });
  };

  const handleFullBackup = async () => {
    setBackingUp(true);
    try {
      const dump: Record<string, unknown[]> = {};
      for (const colName of BACKUP_COLLECTIONS) {
        const snap = await getDocs(collection(db, colName));
        dump[colName] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      const payload = {
        institution: settings.schoolNameBn,
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser.email,
        collections: dump,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SISC_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      await recordAudit(
        'সম্পূর্ণ ডেটাবেজ ব্যাকআপ ডাউনলোড',
        'SystemBackup',
        `${BACKUP_COLLECTIONS.length} টি কালেকশনের JSON ব্যাকআপ সংরক্ষণ করা হয়েছে।`
      );
      notify('সম্পূর্ণ স্কুল ডেটাবেজ ব্যাকআপ (JSON) ডাউনলোড ও লগ সংরক্ষণ সম্পন্ন হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'backup');
      notify('ডেটাবেজ ব্যাকআপ তৈরি করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setBackingUp(false);
    }
  };

  const handleManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logAction.trim() || !logDetails.trim()) return;
    try {
      await recordAudit(logAction, 'AdminPanel', logDetails);
      setLogAction('');
      setLogDetails('');
      notify('কার্যক্রম লগ যুক্ত হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'audit_logs');
      notify('লগ সংরক্ষণ ব্যর্থ হয়েছে।', 'error');
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-xs text-[#263B35] outline-none transition focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  return (
    <div className="space-y-5">
      <AdminModuleHeader
        title="সিস্টেম সেটিংস, ডেটা ব্যাকআপ ও কার্যক্রম লগ"
        subtitle="শিক্ষাবর্ষ, একাধিক শাখা, SMS/ইমেইল ও পেমেন্ট গেটওয়ে সেটআপ, পূর্ণাঙ্গ ডেটা ব্যাকআপ এবং প্রশাসনিক কার্যক্রম পর্যবেক্ষণ।"
        icon={<Settings className="h-5 w-5" />}
        accent="navy"
      />

      {/* System Configuration Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-[#087F5B] dark:text-emerald-400">
            <Building className="h-4 w-4" />
            <h3 className="text-xs font-extrabold">একাধিক শাখা ও শিফট</h3>
          </div>
          <p className="mt-2 text-xs text-[#123B67] dark:text-slate-200">
            <strong>প্রধান ক্যাম্পাস:</strong> তুলসীঘাট, গাইবান্ধা সদর
          </p>
          <p className="mt-1 text-[11px] text-[#526B78] dark:text-slate-400">
            সক্রিয় শিফট: {(settings.shifts || ['মর্নিং শিফট', 'ডে শিফট']).join(', ')}
          </p>
        </div>

        <div className="rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-[#F4A62A]">
            <CreditCard className="h-4 w-4" />
            <h3 className="text-xs font-extrabold text-[#B47009] dark:text-amber-300">অনলাইন পেমেন্ট মাধ্যম</h3>
          </div>
          <p className="mt-2 text-xs font-bold text-[#123B67] dark:text-slate-200">
            বিকাশ · নগদ · রকেট · ব্যাংক · নগদ ক্যাশ
          </p>
          <p className="mt-1 text-[11px] text-[#526B78] dark:text-slate-400">
            আংশিক পেমেন্ট ও ডিজিটাল রসিদ সক্রিয় রয়েছে।
          </p>
        </div>

        <div className="rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-[#21A9D6]">
            <Mail className="h-4 w-4" />
            <h3 className="text-xs font-extrabold text-[#0E7DA3] dark:text-cyan-300">SMS ও ইমেইল নোটিফিকেশন</h3>
          </div>
          <p className="mt-2 text-xs text-[#263B35] dark:text-slate-300">
            যোগাযোগ ও SMS কেন্দ্রের মাধ্যমে শ্রেণিভিত্তিক অভিভাবক বার্তা প্রস্তুত ও সংরক্ষণ।
          </p>
        </div>

        <div className="rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-[#805AD5] dark:text-purple-300">
            <ShieldCheck className="h-4 w-4" />
            <h3 className="text-xs font-extrabold">নিরাপত্তা ও RBAC</h3>
          </div>
          <p className="mt-2 text-xs font-semibold text-[#123B67] dark:text-slate-200">
            অ্যাডমিন · শিক্ষক · শিক্ষার্থী · অভিভাবক
          </p>
          <p className="mt-1 text-[11px] text-[#526B78] dark:text-slate-400">
            Firestore Role-Based Security Rules সক্রিয়।
          </p>
        </div>
      </div>

      {/* One-Click Database Backup */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#123B67] via-[#0B5D63] to-[#087F5B] p-6 text-white shadow-md">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-base font-extrabold">
            <DatabaseBackup className="h-5 w-5 text-[#F4A62A]" />
            সম্পূর্ণ স্কুল ডেটাবেজ ব্যাকআপ (JSON)
          </h3>
          <p className="text-xs text-white/85">
            শিক্ষার্থী, শিক্ষক, কর্মচারী, ফলাফল, উপস্থিতি, বেতন-হিসাব, লাইব্রেরি, পরিবহন ও সার্টিফিকেটসহ মোট{' '}
            {toBnDigits(BACKUP_COLLECTIONS.length)} টি মডিউলের সম্পূর্ণ ব্যাকআপ এক ক্লিকে ডাউনলোড করুন।
          </p>
        </div>
        <button
          type="button"
          disabled={backingUp}
          onClick={() => void handleFullBackup()}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-extrabold text-[#123B67] shadow-sm transition hover:bg-[#F2F8F5] disabled:opacity-60"
        >
          {backingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-[#087F5B]" />}
          {backingUp ? 'ব্যাকআপ তৈরি হচ্ছে...' : 'ডেটা ব্যাকআপ ডাউনলোড'}
        </button>
      </div>

      {/* Activity Audit Log */}
      <div className="space-y-4 rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-[#E6F0EA] pb-3 dark:border-slate-800">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#123B67] dark:text-white">
            <Activity className="h-4 w-4 text-[#087F5B]" />
            সিস্টেম অ্যাক্টিভিটি লগ ({toBnDigits(logs.length)})
          </h3>
        </div>

        <form onSubmit={handleManualLog} className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <input
            required
            placeholder="কার্যক্রমের শিরোনাম (যেমন: শিক্ষাবর্ষ ২০২৬ শুরু)"
            value={logAction}
            onChange={(e) => setLogAction(e.target.value)}
            className={inputClass}
          />
          <input
            required
            placeholder="বিস্তারিত নোট লিখুন"
            value={logDetails}
            onChange={(e) => setLogDetails(e.target.value)}
            className={inputClass}
          />
          <button
            type="submit"
            className="rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A]"
          >
            লগ এন্ট্রি যুক্ত করুন
          </button>
        </form>

        <div className="max-h-80 divide-y divide-[#EDF3EF] overflow-y-auto border-t border-[#EDF3EF] dark:divide-slate-800 dark:border-slate-800">
          {logs.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#587064] dark:text-slate-400">
              এখনো কোনো সিস্টেম লগ রেকর্ড নেই।
            </p>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs">
                <div>
                  <p className="font-bold text-[#123B67] dark:text-white">
                    {l.action}{' '}
                    <span className="ml-1 rounded-md bg-[#087F5B]/12 px-1.5 py-0.5 text-[10px] font-bold text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300">
                      {l.module}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[#526B78] dark:text-slate-400">{l.details}</p>
                </div>
                <div className="text-right text-[11px] text-[#526B78] tabular-nums dark:text-slate-400">
                  <p className="font-bold text-[#263B35] dark:text-slate-200">{l.actorName}</p>
                  {l.createdAt && <p>{new Date(l.createdAt.seconds * 1000).toLocaleString('bn-BD')}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
