import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  XCircle,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, makeSafeDocId, OperationType } from '../../lib/firebase';
import { downloadAdmissionAdmitCardPdf, exportToExcel } from '../../lib/reports';
import {
  ADMISSION_STATUS_BN,
  GROUP_BN,
  labelClass,
  SHIFT_BN,
  toBnDigits,
} from '../../i18n';
import type { AdmissionApplication } from '../../types';
import { AdminModuleHeader, AdminPagination } from '../AdminPagination';
import { useUIFeedback } from '../ToastContext';

const PAGE_SIZE = 8;

export const AdmissionsModule: React.FC = () => {
  const { notify, confirm } = useUIFeedback();
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('সকল');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      collection(db, 'admissions'),
      (snap) => {
        setApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdmissionApplication)));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'admissions')
    );
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((a) => {
      const stOk = statusFilter === 'সকল' || a.status === statusFilter;
      const qOk =
        !q ||
        a.applicantName.toLowerCase().includes(q) ||
        a.applicationNo.toLowerCase().includes(q) ||
        a.guardianPhone.toLowerCase().includes(q);
      return stOk && qOk;
    });
  }, [applications, statusFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const pendingCount = useMemo(
    () => applications.filter((a) => a.status === 'Pending' || a.status === 'UnderReview').length,
    [applications]
  );
  const approvedCount = useMemo(
    () => applications.filter((a) => a.status === 'Approved').length,
    [applications]
  );

  const updateStatus = async (
    app: AdmissionApplication,
    status: AdmissionApplication['status'],
    remarks: string
  ) => {
    if (status === 'Rejected') {
      const ok = await confirm({
        title: 'ভর্তি আবেদন বাতিল করবেন?',
        message: `${app.applicantName} (${app.applicationNo})-এর ভর্তি আবেদন বাতিল হিসেবে চিহ্নিত করা হবে।`,
        confirmLabel: 'হ্যাঁ, বাতিল করুন',
        danger: true,
      });
      if (!ok) return;
    }
    setBusyId(app.id);
    try {
      await updateDoc(doc(db, 'admissions', app.id), {
        status,
        remarks,
        updatedAt: serverTimestamp(),
      });
      notify(`আবেদন ${app.applicationNo}-এর অবস্থা "${ADMISSION_STATUS_BN[status]}" হালনাগাদ হয়েছে।`, 'success');
    } catch (err) {
      notify('অবস্থা হালনাগাদ করতে সমস্যা হয়েছে।', 'error');
      handleFirestoreError(err, OperationType.UPDATE, `admissions/${app.id}`);
    } finally {
      setBusyId(null);
    }
  };

  const approveAndEnroll = async (app: AdmissionApplication) => {
    const ok = await confirm({
      title: 'ভর্তি অনুমোদন ও নিবন্ধন করবেন?',
      message: `${app.applicantName}-কে ${labelClass(app.applyingClass)} শ্রেণিতে অনুমোদন দিয়ে শিক্ষার্থী তালিকায় যুক্ত করা হবে।`,
      confirmLabel: 'অনুমোদন ও ভর্তি করুন',
    });
    if (!ok) return;

    setBusyId(app.id);
    try {
      const stuId = makeSafeDocId('stu');
      const roll = String(Math.floor(200 + Math.random() * 700));
      await setDoc(doc(db, 'students', stuId), {
        studentIdCode: `SISC-${new Date().getFullYear()}-${roll}`,
        rollNumber: roll,
        name: app.applicantName,
        nameBn: app.applicantNameBn || app.applicantName,
        fatherName: app.fatherName || '',
        motherName: app.motherName || '',
        photoUrl: app.photoUrl || '',
        className: app.applyingClass,
        section: 'Padma',
        shift: app.shift,
        group: app.group,
        gender: app.gender,
        dateOfBirth: app.dateOfBirth,
        guardianName: app.guardianName,
        guardianPhone: app.guardianPhone,
        address: app.address,
        bloodGroup: '',
        status: 'Active',
        studentUid: app.applicantUid,
        admissionYear: String(new Date().getFullYear()),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'admissions', app.id), {
        status: 'Approved',
        remarks: `ভর্তি অনুমোদিত হয়েছে। নির্ধারিত রোল নম্বর: ${toBnDigits(roll)}`,
        updatedAt: serverTimestamp(),
      });

      notify(`${app.applicantName}-কে ভর্তি অনুমোদন ও নিবন্ধন সম্পন্ন হয়েছে (রোল: ${toBnDigits(roll)})।`, 'success');
    } catch (err) {
      notify('ভর্তি অনুমোদনে সমস্যা হয়েছে।', 'error');
      handleFirestoreError(err, OperationType.WRITE, 'students');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (app: AdmissionApplication) => {
    const ok = await confirm({
      title: 'আবেদনটি স্থায়ীভাবে মুছবেন?',
      message: `${app.applicantName} (${app.applicationNo})-এর আবেদনপত্র স্থায়ীভাবে মুছে ফেলা হবে।`,
      confirmLabel: 'মুছে ফেলুন',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'admissions', app.id));
      notify('ভর্তি আবেদনটি মুছে ফেলা হয়েছে।', 'success');
    } catch (err) {
      notify('আবেদন মুছতে সমস্যা হয়েছে।', 'error');
      handleFirestoreError(err, OperationType.DELETE, `admissions/${app.id}`);
    }
  };

  return (
    <div className="space-y-5">
      <AdminModuleHeader
        title="ভর্তি ব্যবস্থাপনা"
        subtitle={`মোট আবেদন: ${toBnDigits(applications.length)}টি · অনলাইন ভর্তি আবেদন যাচাই, অনুমোদন ও শিক্ষার্থী নিবন্ধন`}
        icon={<UserPlus className="h-5 w-5" />}
        accent="orange"
        actions={
          <button
            type="button"
            onClick={() => {
              exportToExcel(
                filtered.map((a) => ({
                  ApplicationNo: a.applicationNo,
                  Applicant: a.applicantName,
                  Father: a.fatherName || '',
                  Mother: a.motherName || '',
                  BirthReg: a.birthRegNo || '',
                  Class: a.applyingClass,
                  Shift: a.shift,
                  Group: a.group,
                  Guardian: a.guardianName,
                  Phone: a.guardianPhone,
                  Status: a.status,
                })),
                'Admissions',
                'Admissions_List.xlsx'
              );
              notify('ভর্তি তালিকা এক্সেল রপ্তানি সম্পন্ন হয়েছে।', 'success');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-xs font-bold text-[#087F5B] transition hover:bg-[#EDF9F4] dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            এক্সেল ডাউনলোড
          </button>
        }
      />

      {/* Quick KPI Strip */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#123B67]/12 text-[#123B67] dark:bg-sky-500/20 dark:text-sky-300">
            <UserPlus className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium text-[#526B78] dark:text-slate-400">মোট আবেদন</p>
            <p className="text-xl font-extrabold text-[#123B67] tabular-nums dark:text-white">
              {toBnDigits(applications.length)} টি
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4A62A]/18 text-[#B47009] dark:bg-amber-500/20 dark:text-amber-300">
            <Clock className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium text-[#526B78] dark:text-slate-400">অপেক্ষমাণ / পর্যালোচনা</p>
            <p className="text-xl font-extrabold text-[#A66300] tabular-nums dark:text-amber-300">
              {toBnDigits(pendingCount)} টি
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#087F5B]/12 text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300">
            <UserCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium text-[#526B78] dark:text-slate-400">অনুমোদিত ভর্তি</p>
            <p className="text-xl font-extrabold text-[#087F5B] tabular-nums dark:text-emerald-400">
              {toBnDigits(approvedCount)} টি
            </p>
          </div>
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#DCE8E1] bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#647E8B]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="আবেদন নম্বর, শিক্ষার্থীর নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
            className="w-full rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] py-2 pr-3 pl-10 text-xs text-[#263B35] focus:border-[#087F5B] focus:bg-white focus:outline-none sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] px-3.5 py-2 text-xs font-bold text-[#123B67] sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="সকল">সকল অবস্থা</option>
          {Object.entries(ADMISSION_STATUS_BN).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Applications List */}
      {paged.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#CBE0D4] bg-white py-12 text-center text-sm text-[#587064] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          কোনো ভর্তি আবেদন পাওয়া যায়নি।
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#DCE8E1] bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="divide-y divide-[#EAF2ED] dark:divide-slate-800">
            {paged.map((app) => (
              <div key={app.id} className="p-5 transition hover:bg-[#FAFDFB] dark:hover:bg-slate-800/40">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-[#123B67] px-2.5 py-0.5 font-mono text-xs font-bold text-white">
                        {app.applicationNo}
                      </span>
                      <h3 className="text-base font-extrabold text-[#123B67] dark:text-white">
                        {app.applicantName}
                      </h3>
                      <span
                        className={`rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${
                          app.status === 'Approved'
                            ? 'bg-[#EDF9F4] text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300'
                            : app.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                            : 'bg-[#FFF8EA] text-[#A66300] dark:bg-amber-500/20 dark:text-amber-300'
                        }`}
                      >
                        {ADMISSION_STATUS_BN[app.status] || app.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#263B35] tabular-nums dark:text-slate-300">
                      শ্রেণি: <strong className="font-bold text-[#087F5B] dark:text-emerald-400">{labelClass(app.applyingClass)}</strong> ·{' '}
                      {SHIFT_BN[app.shift]} · {GROUP_BN[app.group]} · জন্মতারিখ: {toBnDigits(app.dateOfBirth)}
                    </p>
                    <p className="text-xs text-[#526B78] tabular-nums dark:text-slate-400">
                      পিতা: {app.fatherName || '—'} · মাতা: {app.motherName || '—'} · জন্মনিবন্ধন: {toBnDigits(app.birthRegNo || '—')}
                    </p>
                    <p className="text-xs text-[#526B78] dark:text-slate-400">
                      অভিভাবক: {app.guardianName} ({app.guardianPhone}) · ঠিকানা: {app.address}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        downloadAdmissionAdmitCardPdf(app);
                        notify('প্রবেশপত্র পিডিএফ ডাউনলোড হচ্ছে।', 'info');
                      }}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#CFE0D6] bg-white px-3 py-1.5 text-xs font-bold text-[#123B67] transition hover:bg-[#F2F8F5] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Download className="h-3.5 w-3.5 text-[#21A9D6]" />
                      প্রবেশপত্র
                    </button>
                    {app.status !== 'Approved' && (
                      <button
                        type="button"
                        disabled={busyId === app.id}
                        onClick={() => void approveAndEnroll(app)}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#087F5B] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#06684A] disabled:opacity-60"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        অনুমোদন ও ভর্তি
                      </button>
                    )}
                    {app.status === 'Pending' && (
                      <button
                        type="button"
                        disabled={busyId === app.id}
                        onClick={() => void updateStatus(app, 'UnderReview', 'কাগজপত্র যাচাই-বাছাই করা হচ্ছে।')}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#FFF8EA] px-3 py-1.5 text-xs font-bold text-[#A66300] transition hover:bg-[#F4A62A] hover:text-[#123B67] dark:bg-amber-500/20 dark:text-amber-300"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        পর্যালোচনা
                      </button>
                    )}
                    {app.status !== 'Rejected' && (
                      <button
                        type="button"
                        disabled={busyId === app.id}
                        onClick={() =>
                          void updateStatus(app, 'Rejected', 'ভর্তি কমিটির সিদ্ধান্ত অনুযায়ী আবেদন বাতিল করা হয়েছে।')
                        }
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-600 hover:text-white dark:bg-rose-500/20 dark:text-rose-300"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        বাতিল
                      </button>
                    )}
                    <button
                      type="button"
                      title="মুছে ফেলুন"
                      onClick={() => void handleDelete(app)}
                      className="rounded-xl bg-slate-100 p-1.5 text-slate-600 transition hover:bg-rose-600 hover:text-white dark:bg-slate-800 dark:text-slate-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <AdminPagination
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            currentPage={page}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
};
