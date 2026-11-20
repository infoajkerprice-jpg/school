import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpCircle,
  Download,
  FileBadge2,
  FileSpreadsheet,
  GraduationCap,
  Pencil,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, makeSafeDocId, OperationType } from '../../lib/firebase';
import { clampStr } from '../../lib/grading';
import {
  compareStudentsAcademic,
  PDF_ROSTER_SYNC_KEY,
  PDF_STUDENTS_ROSTER,
  syncPdfStudentsToFirestore,
} from '../../lib/pdfStudentsRoster';
import { downloadStudentsPdf, exportToExcel } from '../../lib/reports';
import {
  GENDER_BN,
  GROUP_BN,
  labelClass,
  labelSection,
  SHIFT_BN,
  STUDENT_STATUS_BN,
  toBnDigits,
} from '../../i18n';
import {
  BD_CLASSES,
  BD_GROUPS,
  BD_SECTIONS,
  BD_SHIFTS,
  type StudentRecord,
  type UserAccount,
} from '../../types';
import { AdminModuleHeader, AdminPagination } from '../AdminPagination';
import { normalizeSearchText } from '../StudentPicker';
import { useUIFeedback } from '../ToastContext';

interface Props {
  currentUser: UserAccount;
}

const INPUT_CLS =
  'w-full rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] px-3 py-2 text-sm text-[#263B35] focus:border-[#087F5B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087F5B]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

const PAGE_SIZE = 20;

export const StudentsModule: React.FC<Props> = ({ currentUser }) => {
  const navigate = useNavigate();
  const { notify, confirm } = useUIFeedback();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('সকল');
  const [statusFilter, setStatusFilter] = useState('সকল');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncingRoster, setSyncingRoster] = useState(false);

  const isAdmin = currentUser.role === 'admin';

  const [form, setForm] = useState({
    studentIdCode: '',
    rollNumber: '',
    name: '',
    fatherName: '',
    motherName: '',
    photoUrl: '',
    className: 'Class 6',
    section: 'Padma',
    shift: 'Morning' as 'Morning' | 'Day',
    group: 'General' as 'General' | 'Science' | 'Business Studies' | 'Humanities',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    dateOfBirth: '2010-03-10',
    guardianName: '',
    guardianPhone: '',
    address: '',
    bloodGroup: 'B+',
    status: 'Active' as 'Active' | 'Inactive' | 'Graduated',
    admissionYear: '2025',
  });

  useEffect(() => {
    const ref =
      currentUser.role === 'student'
        ? query(collection(db, 'students'), where('studentUid', '==', currentUser.uid))
        : currentUser.role === 'parent'
        ? query(collection(db, 'students'), where('parentUid', '==', currentUser.uid))
        : collection(db, 'students');

    return onSnapshot(
      ref,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as StudentRecord))
          .sort(compareStudentsAcademic);
        setStudents(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'students')
    );
  }, [currentUser.role, currentUser.uid]);

  const filtered = useMemo(() => {
    const q = normalizeSearchText(search);
    const numericQ = q.replace(/^0+/, '');
    return students.filter((s) => {
      const clsOk = classFilter === 'সকল' || s.className === classFilter;
      const stOk = statusFilter === 'সকল' || s.status === statusFilter;
      if (!q) return clsOk && stOk;
      const rollNorm = normalizeSearchText(s.rollNumber);
      const rollTrim = rollNorm.replace(/^0+/, '');
      const qOk =
        normalizeSearchText(s.name).includes(q) ||
        normalizeSearchText(s.studentIdCode).includes(q) ||
        rollNorm.includes(q) ||
        (numericQ.length > 0 && rollTrim === numericQ) ||
        normalizeSearchText(s.guardianPhone).includes(q) ||
        normalizeSearchText(labelClass(s.className)).includes(q);
      return clsOk && stOk && qOk;
    });
  }, [students, search, classFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, classFilter, statusFilter]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const activeCount = useMemo(() => students.filter((s) => s.status === 'Active').length, [students]);
  const graduatedCount = useMemo(() => students.filter((s) => s.status === 'Graduated').length, [students]);
  const classCounts = useMemo(() => {
    const map = new Map<string, number>();
    students.forEach((s) => map.set(s.className, (map.get(s.className) || 0) + 1));
    return map;
  }, [students]);
  const missingPdfCount = useMemo(() => {
    const existingIds = new Set(students.map((s) => s.id));
    const existingFingerprints = new Set(
      students.map((s) => {
        const normRoll = String(parseInt(String(s.rollNumber || ''), 10) || s.rollNumber || '');
        return `${s.className}|${normRoll}|${s.name.trim()}`;
      })
    );
    return PDF_STUDENTS_ROSTER.filter((entry) => {
      if (existingIds.has(entry.docId)) return false;
      const normRoll = String(parseInt(entry.rollNumber, 10) || entry.rollNumber);
      return !existingFingerprints.has(`${entry.className}|${normRoll}|${entry.name.trim()}`);
    }).length;
  }, [students]);

  const handleSyncPdfRoster = async () => {
    if (!isAdmin || syncingRoster) return;
    setSyncingRoster(true);
    try {
      const res = await syncPdfStudentsToFirestore();
      try {
        window.localStorage.setItem(PDF_ROSTER_SYNC_KEY, 'done');
      } catch {
        // ignore storage errors
      }
      if (res.added > 0) {
        notify(
          `পিডিএফ তালিকা থেকে ${toBnDigits(res.added)} জন শিক্ষার্থী সফলভাবে যুক্ত হয়েছে।`,
          'success'
        );
      } else {
        notify('পিডিএফ তালিকার সকল শিক্ষার্থী ইতোমধ্যে ডাটাবেসে যুক্ত রয়েছে।', 'info');
      }
    } catch {
      notify('শিক্ষার্থী তালিকা সিঙ্ক করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setSyncingRoster(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setForm({
      studentIdCode: `SISC-${new Date().getFullYear()}-${String(students.length + 1).padStart(3, '0')}`,
      rollNumber: String(101 + students.length),
      name: '',
      fatherName: '',
      motherName: '',
      photoUrl: '',
      className: 'Class 6',
      section: 'Padma',
      shift: 'Morning',
      group: 'General',
      gender: 'Male',
      dateOfBirth: '2010-03-10',
      guardianName: '',
      guardianPhone: '',
      address: '',
      bloodGroup: 'B+',
      status: 'Active',
      admissionYear: '2025',
    });
  };

  const openEdit = (s: StudentRecord) => {
    setEditingId(s.id);
    setShowForm(true);
    setForm({
      studentIdCode: s.studentIdCode,
      rollNumber: s.rollNumber,
      name: s.name,
      fatherName: s.fatherName || '',
      motherName: s.motherName || '',
      photoUrl: s.photoUrl || '',
      className: s.className,
      section: s.section,
      shift: s.shift,
      group: s.group,
      gender: s.gender,
      dateOfBirth: s.dateOfBirth || '',
      guardianName: s.guardianName,
      guardianPhone: s.guardianPhone,
      address: s.address || '',
      bloodGroup: s.bloodGroup || '',
      status: s.status,
      admissionYear: s.admissionYear || '2025',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      const payload = {
        studentIdCode: clampStr(form.studentIdCode, 32),
        rollNumber: clampStr(form.rollNumber, 20),
        name: clampStr(form.name, 120),
        nameBn: clampStr(form.name, 120),
        fatherName: clampStr(form.fatherName, 120),
        motherName: clampStr(form.motherName, 120),
        photoUrl: clampStr(form.photoUrl, 500),
        className: form.className,
        section: form.section,
        shift: form.shift,
        group: form.group,
        gender: form.gender,
        dateOfBirth: clampStr(form.dateOfBirth, 20),
        guardianName: clampStr(form.guardianName, 120),
        guardianPhone: clampStr(form.guardianPhone, 25),
        address: clampStr(form.address, 300),
        bloodGroup: clampStr(form.bloodGroup, 10),
        status: form.status,
        admissionYear: clampStr(form.admissionYear, 10),
      };
      if (editingId) {
        await updateDoc(doc(db, 'students', editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        notify('শিক্ষার্থীর তথ্য সফলভাবে হালনাগাদ হয়েছে।', 'success');
      } else {
        const id = makeSafeDocId('stu');
        await setDoc(doc(db, 'students', id), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        notify('নতুন শিক্ষার্থী সফলভাবে নিবন্ধিত হয়েছে।', 'success');
      }
      resetForm();
    } catch (err) {
      notify('শিক্ষার্থীর তথ্য সংরক্ষণ করতে সমস্যা হয়েছে।', 'error');
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, 'students');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: StudentRecord) => {
    if (!isAdmin) return;
    const ok = await confirm({
      title: 'শিক্ষার্থীর রেকর্ড মুছবেন?',
      message: `${s.name} (${s.studentIdCode})-এর তথ্য স্থায়ীভাবে মুছে ফেলা হবে।`,
      confirmLabel: 'হ্যাঁ, মুছে ফেলুন',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'students', s.id));
      notify('শিক্ষার্থীর রেকর্ড মুছে ফেলা হয়েছে।', 'success');
    } catch (err) {
      notify('রেকর্ড মুছতে সমস্যা হয়েছে।', 'error');
      handleFirestoreError(err, OperationType.DELETE, `students/${s.id}`);
    }
  };

  const handlePromote = async (s: StudentRecord) => {
    const idx = BD_CLASSES.indexOf(s.className as (typeof BD_CLASSES)[number]);
    const nextClass = idx >= 0 && idx < BD_CLASSES.length - 1 ? BD_CLASSES[idx + 1] : null;
    const ok = await confirm({
      title: 'শ্রেণি প্রমোশন নিশ্চিত করুন',
      message: nextClass
        ? `${s.name}-কে ${labelClass(s.className)} থেকে ${labelClass(nextClass)}-তে প্রমোশন দেওয়া হবে।`
        : `${s.name}-কে উত্তীর্ণ (Graduated) হিসেবে চিহ্নিত করা হবে।`,
      confirmLabel: 'প্রমোশন দিন',
    });
    if (!ok) return;

    try {
      if (nextClass) {
        await updateDoc(doc(db, 'students', s.id), {
          className: nextClass,
          updatedAt: serverTimestamp(),
        });
        notify(`${s.name}-কে ${labelClass(nextClass)}-তে প্রমোশন দেওয়া হয়েছে।`, 'success');
      } else {
        await updateDoc(doc(db, 'students', s.id), {
          status: 'Graduated',
          updatedAt: serverTimestamp(),
        });
        notify(`${s.name}-কে উত্তীর্ণ (Graduated) হিসেবে হালনাগাদ করা হয়েছে।`, 'success');
      }
    } catch (err) {
      notify('প্রমোশন সম্পন্ন করা যায়নি।', 'error');
      handleFirestoreError(err, OperationType.UPDATE, `students/${s.id}`);
    }
  };

  return (
    <div className="space-y-5">
      <AdminModuleHeader
        title="শিক্ষার্থী ব্যবস্থাপনা"
        subtitle={`মোট নিবন্ধিত শিক্ষার্থী: ${toBnDigits(students.length)} জন`}
        icon={<GraduationCap className="h-5 w-5" />}
        accent="emerald"
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                downloadStudentsPdf(filtered);
                notify('শিক্ষার্থী তালিকা পিডিএফ ডাউনলোড হচ্ছে।', 'info');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-xs font-bold text-[#123B67] transition hover:bg-[#F2F8F5] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Download className="h-3.5 w-3.5 text-[#21A9D6]" />
              পিডিএফ
            </button>
            <button
              type="button"
              onClick={() => {
                exportToExcel(
                  filtered.map((s) => ({
                    StudentID: s.studentIdCode,
                    Roll: s.rollNumber,
                    Name: s.name,
                    Father: s.fatherName || '',
                    Mother: s.motherName || '',
                    Class: s.className,
                    Section: s.section,
                    Shift: s.shift,
                    Group: s.group,
                    Guardian: s.guardianName,
                    Phone: s.guardianPhone,
                    Status: s.status,
                  })),
                  'Students',
                  'Student_Directory.xlsx'
                );
                notify('এক্সেল ফাইল রপ্তানি সম্পন্ন হয়েছে।', 'success');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-xs font-bold text-[#087F5B] transition hover:bg-[#EDF9F4] dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-slate-700"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              এক্সেল
            </button>
            {isAdmin && missingPdfCount > 0 && (
              <button
                type="button"
                disabled={syncingRoster}
                onClick={() => void handleSyncPdfRoster()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#F4A62A]/60 bg-[#FEF5E4] px-3.5 py-2 text-xs font-extrabold text-[#9A5B00] transition hover:bg-[#F4A62A] hover:text-[#123B67] disabled:opacity-60 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                {syncingRoster
                  ? 'যুক্ত হচ্ছে...'
                  : `পিডিএফ শিক্ষার্থী যুক্ত করুন (${toBnDigits(missingPdfCount)})`}
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  if (showForm) resetForm();
                  else {
                    setForm((f) => ({
                      ...f,
                      studentIdCode: `SISC-${new Date().getFullYear()}-${String(students.length + 1).padStart(3, '0')}`,
                      rollNumber: String(101 + students.length),
                    }));
                    setShowForm(true);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A]"
              >
                <Plus className="h-4 w-4" />
                {showForm ? 'ফর্ম বন্ধ করুন' : 'নতুন শিক্ষার্থী'}
              </button>
            )}
          </>
        }
      />

      {/* Quick KPI Strip */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#087F5B]/12 text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium text-[#526B78] dark:text-slate-400">মোট শিক্ষার্থী</p>
            <p className="text-xl font-extrabold text-[#123B67] tabular-nums dark:text-white">
              {toBnDigits(students.length)} জন
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#21A9D6]/15 text-[#0E7DA3] dark:bg-sky-500/20 dark:text-sky-300">
            <UserCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium text-[#526B78] dark:text-slate-400">সক্রিয় শিক্ষার্থী</p>
            <p className="text-xl font-extrabold text-[#087F5B] tabular-nums dark:text-emerald-400">
              {toBnDigits(activeCount)} জন
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#805AD5]/15 text-[#805AD5] dark:bg-purple-500/20 dark:text-purple-300">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium text-[#526B78] dark:text-slate-400">উত্তীর্ণ / প্রাক্তন</p>
            <p className="text-xl font-extrabold text-[#805AD5] tabular-nums dark:text-purple-300">
              {toBnDigits(graduatedCount)} জন
            </p>
          </div>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showForm && isAdmin && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <h3 className="mb-4 text-sm font-extrabold text-[#087F5B] dark:text-emerald-400">
            {editingId ? 'শিক্ষার্থীর তথ্য সম্পাদনা' : 'নতুন শিক্ষার্থী নিবন্ধন ফর্ম'}
          </h3>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">শিক্ষার্থী আইডি *</label>
              <input required value={form.studentIdCode} onChange={(e) => setForm({ ...form, studentIdCode: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">রোল নম্বর *</label>
              <input required value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} className={INPUT_CLS} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">শিক্ষার্থীর পূর্ণ নাম *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">পিতার নাম</label>
              <input value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">মাতার নাম</label>
              <input value={form.motherName} onChange={(e) => setForm({ ...form, motherName: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">শ্রেণি *</label>
              <select value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} className={INPUT_CLS}>
                {BD_CLASSES.map((c) => (
                  <option key={c} value={c}>{labelClass(c)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">শাখা *</label>
              <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className={INPUT_CLS}>
                {BD_SECTIONS.map((s) => (
                  <option key={s} value={s}>{labelSection(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">শিফট</label>
              <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value as 'Morning' | 'Day' })} className={INPUT_CLS}>
                {BD_SHIFTS.map((s) => (
                  <option key={s} value={s}>{SHIFT_BN[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">বিভাগ</label>
              <select value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value as 'General' | 'Science' | 'Business Studies' | 'Humanities' })} className={INPUT_CLS}>
                {BD_GROUPS.map((g) => (
                  <option key={g} value={g}>{GROUP_BN[g]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">ছাত্র / ছাত্রী</label>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as 'Male' | 'Female' | 'Other' })} className={INPUT_CLS}>
                {Object.entries(GENDER_BN).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">অবস্থা</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'Active' | 'Inactive' | 'Graduated' })} className={INPUT_CLS}>
                {Object.entries(STUDENT_STATUS_BN).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">অভিভাবকের নাম *</label>
              <input required value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">অভিভাবকের মোবাইল *</label>
              <input required value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">রক্তের গ্রুপ</label>
              <input value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">ছবির লিংক</label>
              <input value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} className={INPUT_CLS} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">ঠিকানা</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={INPUT_CLS} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#087F5B] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-60"
            >
              {saving ? 'সংরক্ষণ হচ্ছে...' : editingId ? 'হালনাগাদ করুন' : 'শিক্ষার্থী সংরক্ষণ করুন'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl bg-[#F2F8F5] px-4 py-2.5 text-xs font-bold text-[#123B67] dark:bg-slate-800 dark:text-slate-300"
            >
              বাতিল
            </button>
          </div>
        </form>
      )}

      {/* Class Quick-Filter Tabs & Instant Search */}
      <div className="space-y-3 rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        {/* Interactive Class Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setClassFilter('সকল')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
              classFilter === 'সকল'
                ? 'bg-[#123B67] text-white shadow-xs'
                : 'bg-[#F2F8F5] text-[#263B35] hover:bg-[#E1EFE8] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            সকল শ্রেণি ({toBnDigits(students.length)})
          </button>
          {BD_CLASSES.map((c) => {
            const cnt = classCounts.get(c) || 0;
            if (cnt === 0 && classFilter !== c) return null;
            const active = classFilter === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setClassFilter(c)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap tabular-nums transition ${
                  active
                    ? 'bg-[#087F5B] text-white shadow-xs'
                    : 'bg-[#F2F8F5] text-[#263B35] hover:bg-[#E1EFE8] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {labelClass(c)} ({toBnDigits(cnt)})
              </button>
            );
          })}
        </div>

        {/* Search & Secondary Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#647E8B]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                classFilter === 'সকল'
                  ? 'শিক্ষার্থীর নাম, রোল নম্বর (যেমন ০৫ বা 5) বা আইডি লিখে খুঁজুন...'
                  : `${labelClass(classFilter)}-এর শিক্ষার্থীর নাম বা রোল লিখে খুঁজুন...`
              }
              className="w-full rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] py-2 pr-9 pl-10 text-xs text-[#263B35] focus:border-[#087F5B] focus:bg-white focus:outline-none sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            {search && (
              <button
                type="button"
                aria-label="অনুসন্ধান মুছুন"
                onClick={() => setSearch('')}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg p-1 text-[#647E8B] hover:bg-[#E2EFE8] hover:text-[#123B67] dark:hover:bg-slate-700 dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] px-3 py-2 text-xs font-bold text-[#123B67] sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="সকল">সকল শ্রেণি ({toBnDigits(students.length)})</option>
            {BD_CLASSES.map((c) => {
              const cnt = classCounts.get(c) || 0;
              return (
                <option key={c} value={c}>
                  {labelClass(c)} ({toBnDigits(cnt)})
                </option>
              );
            })}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] px-3 py-2 text-xs font-bold text-[#123B67] sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="সকল">সকল অবস্থা</option>
            {Object.entries(STUDENT_STATUS_BN).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Active Filter Context Line */}
        {(classFilter !== 'সকল' || search.trim() !== '' || statusFilter !== 'সকল') && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EDF3EF] pt-2.5 text-xs text-[#526B78] dark:border-slate-800 dark:text-slate-400">
            <span className="tabular-nums">
              দেখানো হচ্ছে <strong className="text-[#123B67] dark:text-white">{toBnDigits(filtered.length)}</strong> জন শিক্ষার্থী
              {classFilter !== 'সকল' ? ` · ${labelClass(classFilter)}` : ''}
            </span>
            <button
              type="button"
              onClick={() => {
                setClassFilter('সকল');
                setStatusFilter('সকল');
                setSearch('');
              }}
              className="font-bold text-[#087F5B] hover:underline dark:text-emerald-400"
            >
              ফিল্টার রিসেট করুন
            </button>
          </div>
        )}
      </div>

      {/* Students Table + Pagination */}
      <div className="overflow-hidden rounded-2xl border border-[#DCE8E1] bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs sm:text-sm">
            <thead className="bg-gradient-to-r from-[#123B67] to-[#087F5B] text-white">
              <tr>
                <th className="px-4 py-3.5 font-bold">আইডি ও রোল</th>
                <th className="px-4 py-3.5 font-bold">শিক্ষার্থীর নাম</th>
                <th className="px-4 py-3.5 font-bold">শ্রেণি ও শাখা</th>
                <th className="px-4 py-3.5 font-bold">অভিভাবক ও ফোন</th>
                <th className="px-4 py-3.5 font-bold">অবস্থা</th>
                {isAdmin && <th className="px-4 py-3.5 text-right font-bold">অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF2ED] dark:divide-slate-800">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-10 text-center text-[#587064] dark:text-slate-400">
                    কোনো শিক্ষার্থীর তথ্য পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                paged.map((s) => (
                  <tr key={s.id} className="transition hover:bg-[#F5FAF7] dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3.5 tabular-nums">
                      <p className="font-extrabold text-[#087F5B] dark:text-emerald-400">{s.studentIdCode}</p>
                      <p className="text-[11px] font-medium text-[#526B78] dark:text-slate-400">
                        রোল: {toBnDigits(s.rollNumber)}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-[#123B67] dark:text-white">{s.name}</p>
                      {(s.fatherName || s.motherName) && (
                        <p className="text-[11px] text-[#526B78] dark:text-slate-400">
                          পিতা: {s.fatherName || '—'} · মাতা: {s.motherName || '—'}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-[#263B35] dark:text-slate-200">
                        {labelClass(s.className)} ({labelSection(s.section)})
                      </p>
                      <p className="text-[11px] text-[#526B78] dark:text-slate-400">
                        {SHIFT_BN[s.shift]} · {GROUP_BN[s.group]}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-[#123B67] dark:text-slate-200">{s.guardianName}</p>
                      <p className="text-[11px] font-bold text-[#087F5B] tabular-nums dark:text-emerald-400">
                        {s.guardianPhone}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                          s.status === 'Active'
                            ? 'bg-[#EDF9F4] text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300'
                            : s.status === 'Graduated'
                            ? 'bg-[#F5F0FF] text-[#805AD5] dark:bg-purple-500/20 dark:text-purple-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {STUDENT_STATUS_BN[s.status] || s.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            title="প্রবেশপত্র তৈরি করুন"
                            onClick={() =>
                              navigate(`/dashboard/certificates?tab=admit&studentId=${s.id}`)
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-[#FEF5E4] px-2 py-1.5 text-[11px] font-bold text-[#9A5B00] transition hover:bg-[#F4A62A] hover:text-[#123B67] dark:bg-amber-500/20 dark:text-amber-300"
                          >
                            <FileBadge2 className="h-3.5 w-3.5" />
                            প্রবেশপত্র
                          </button>
                          {s.status === 'Active' && (
                            <button
                              type="button"
                              title="পরবর্তী শ্রেণিতে প্রমোশন দিন"
                              onClick={() => void handlePromote(s)}
                              className="rounded-lg bg-[#EBF8FD] p-1.5 text-[#0E7DA3] transition hover:bg-[#21A9D6] hover:text-white dark:bg-sky-500/20 dark:text-sky-300"
                            >
                              <ArrowUpCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            title="সম্পাদনা করুন"
                            onClick={() => openEdit(s)}
                            className="rounded-lg bg-[#EDF9F4] p-1.5 text-[#087F5B] transition hover:bg-[#087F5B] hover:text-white dark:bg-emerald-500/20 dark:text-emerald-300"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="মুছে ফেলুন"
                            onClick={() => void handleDelete(s)}
                            className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-600 hover:text-white dark:bg-rose-500/20 dark:text-rose-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          currentPage={page}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};
