import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Pencil, Plus, Search, Trash2, UploadCloud, Users } from 'lucide-react';
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
import { clampStr } from '../../lib/grading';
import {
  compareFacultyHierarchy,
  PDF_TEACHERS_ROSTER,
  PDF_TEACHERS_SYNC_KEY,
  syncPdfTeachersToFirestore,
} from '../../lib/pdfTeachersRoster';
import { downloadTeachersPdf, exportToExcel } from '../../lib/reports';
import { formatBdtBn, SHIFT_BN, TEACHER_STATUS_BN, toBnDigits } from '../../i18n';
import type { FacultyPublic, TeacherHRRecord, UserAccount } from '../../types';
import { AdminModuleHeader, AdminPagination } from '../AdminPagination';
import { useUIFeedback } from '../ToastContext';

interface Props {
  currentUser: UserAccount;
}

const INPUT_CLS =
  'w-full rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] px-3 py-2 text-sm text-[#263B35] focus:border-[#087F5B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087F5B]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

const PAGE_SIZE = 25;

export const TeachersModule: React.FC<Props> = ({ currentUser }) => {
  const { notify, confirm } = useUIFeedback();
  const [faculty, setFaculty] = useState<FacultyPublic[]>([]);
  const [hrRecords, setHrRecords] = useState<TeacherHRRecord[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('সকল');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingFacultyId, setEditingFacultyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncingRoster, setSyncingRoster] = useState(false);

  const isAdmin = currentUser.role === 'admin';

  const [form, setForm] = useState({
    employeeId: '',
    name: '',
    designation: 'সহকারী শিক্ষক',
    department: 'বিজ্ঞান বিভাগ',
    subject: '',
    qualification: '',
    responsibility: '',
    bio: '',
    photoUrl: '',
    experienceYears: '5',
    shift: 'Both' as 'Morning' | 'Day' | 'Both',
    status: 'Active' as 'Active' | 'OnLeave' | 'Inactive',
    phone: '',
    email: '',
    salaryBdt: '38000',
    joiningDate: '2020-01-15',
  });

  useEffect(() => {
    const u1 = onSnapshot(
      collection(db, 'faculty'),
      (snap) =>
        setFaculty(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as FacultyPublic))
            .sort(compareFacultyHierarchy)
        ),
      (err) => handleFirestoreError(err, OperationType.LIST, 'faculty')
    );

    let u2 = () => {};
    if (isAdmin) {
      u2 = onSnapshot(
        collection(db, 'teacher_records'),
        (snap) => setHrRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeacherHRRecord))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'teacher_records')
      );
    }

    return () => {
      u1();
      u2();
    };
  }, [isAdmin]);

  const hrByFaculty = useMemo(() => {
    const map = new Map<string, TeacherHRRecord>();
    hrRecords.forEach((h) => map.set(h.facultyId, h));
    return map;
  }, [hrRecords]);

  const departments = useMemo(() => {
    const set = new Set<string>(['সকল']);
    faculty.forEach((f) => set.add(f.department));
    return Array.from(set);
  }, [faculty]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return faculty.filter((f) => {
      const deptOk = deptFilter === 'সকল' || f.department === deptFilter;
      const qOk =
        !q ||
        (f.nameBn || f.name).toLowerCase().includes(q) ||
        f.designation.toLowerCase().includes(q) ||
        f.subject.toLowerCase().includes(q);
      return deptOk && qOk;
    });
  }, [faculty, deptFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [search, deptFilter]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const missingPdfCount = useMemo(() => {
    const existingIds = new Set(faculty.map((f) => f.id));
    const existingNames = new Set(faculty.map((f) => f.name.trim().toLowerCase()));
    return PDF_TEACHERS_ROSTER.filter(
      (entry) => !existingIds.has(entry.facId) && !existingNames.has(entry.name.trim().toLowerCase())
    ).length;
  }, [faculty]);

  const handleSyncPdfTeachers = async () => {
    if (!isAdmin || syncingRoster) return;
    setSyncingRoster(true);
    try {
      const res = await syncPdfTeachersToFirestore();
      try {
        window.localStorage.setItem(PDF_TEACHERS_SYNC_KEY, 'done');
      } catch {
        // ignore storage errors
      }
      if (res.added > 0) {
        notify(
          `পিডিএফ তালিকা থেকে ${toBnDigits(res.added)} জন শিক্ষক ও কর্মকর্তা সফলভাবে যুক্ত হয়েছে।`,
          'success'
        );
      } else {
        notify('পিডিএফ তালিকার সকল শিক্ষক ইতোমধ্যে ডাটাবেসে যুক্ত রয়েছে।', 'info');
      }
    } catch {
      notify('শিক্ষক তালিকা সিঙ্ক করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setSyncingRoster(false);
    }
  };

  const resetForm = () => {
    setEditingFacultyId(null);
    setShowForm(false);
    setForm({
      employeeId: `EMP-${String(faculty.length + 1).padStart(3, '0')}`,
      name: '',
      designation: 'সহকারী শিক্ষক',
      department: 'বিজ্ঞান বিভাগ',
      subject: '',
      qualification: '',
      responsibility: '',
      bio: '',
      photoUrl: '',
      experienceYears: '5',
      shift: 'Both',
      status: 'Active',
      phone: '',
      email: '',
      salaryBdt: '38000',
      joiningDate: '2020-01-15',
    });
  };

  const openEdit = (fac: FacultyPublic) => {
    const hr = hrByFaculty.get(fac.id);
    setEditingFacultyId(fac.id);
    setShowForm(true);
    setForm({
      employeeId: hr?.employeeId || `EMP-${fac.id.slice(-3)}`,
      name: fac.nameBn || fac.name,
      designation: fac.designation,
      department: fac.department,
      subject: fac.subject,
      qualification: fac.qualification || '',
      responsibility: fac.responsibility || '',
      bio: fac.bio || '',
      photoUrl: fac.photoUrl || '',
      experienceYears: String(fac.experienceYears ?? 5),
      shift: fac.shift,
      status: fac.status,
      phone: hr?.phone || '',
      email: hr?.email || '',
      salaryBdt: String(hr?.salaryBdt ?? 35000),
      joiningDate: hr?.joiningDate || '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      const facData = {
        name: clampStr(form.name, 120),
        nameBn: clampStr(form.name, 120),
        designation: clampStr(form.designation, 80),
        department: clampStr(form.department, 80),
        subject: clampStr(form.subject, 80),
        qualification: clampStr(form.qualification, 140),
        responsibility: clampStr(form.responsibility, 160),
        bio: clampStr(form.bio, 600),
        photoUrl: clampStr(form.photoUrl, 500),
        experienceYears: Math.max(0, Math.min(60, Number(form.experienceYears) || 0)),
        shift: form.shift,
        status: form.status,
      };

      const hrData = {
        employeeId: clampStr(form.employeeId, 32),
        name: clampStr(form.name, 120),
        designation: clampStr(form.designation, 80),
        department: clampStr(form.department, 80),
        phone: clampStr(form.phone, 25),
        email: clampStr(form.email, 160),
        salaryBdt: Math.max(0, Math.min(500000, Number(form.salaryBdt) || 0)),
        joiningDate: clampStr(form.joiningDate, 20),
        status: form.status,
      };

      if (editingFacultyId) {
        await updateDoc(doc(db, 'faculty', editingFacultyId), {
          ...facData,
          updatedAt: serverTimestamp(),
        });
        const existingHr = hrByFaculty.get(editingFacultyId);
        if (existingHr) {
          await updateDoc(doc(db, 'teacher_records', existingHr.id), {
            ...hrData,
            updatedAt: serverTimestamp(),
          });
        }
        notify('শিক্ষকের তথ্য সফলভাবে হালনাগাদ করা হয়েছে।', 'success');
      } else {
        const facId = makeSafeDocId('fac');
        const hrId = makeSafeDocId('hr');
        await setDoc(doc(db, 'faculty', facId), {
          ...facData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'teacher_records', hrId), {
          ...hrData,
          facultyId: facId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        notify('নতুন শিক্ষক সফলভাবে যুক্ত হয়েছেন।', 'success');
      }
      resetForm();
    } catch (err) {
      notify('শিক্ষকের তথ্য সংরক্ষণ করতে সমস্যা হয়েছে।', 'error');
      handleFirestoreError(err, editingFacultyId ? OperationType.UPDATE : OperationType.CREATE, 'faculty');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (fac: FacultyPublic) => {
    if (!isAdmin) return;
    const ok = await confirm({
      title: 'শিক্ষকের তথ্য মুছবেন?',
      message: `${fac.nameBn || fac.name}-এর পাবলিক প্রোফাইল ও এইচআর রেকর্ড স্থায়ীভাবে মুছে ফেলা হবে।`,
      confirmLabel: 'হ্যাঁ, মুছে ফেলুন',
      danger: true,
    });
    if (!ok) return;
    try {
      const hr = hrByFaculty.get(fac.id);
      if (hr) await deleteDoc(doc(db, 'teacher_records', hr.id));
      await deleteDoc(doc(db, 'faculty', fac.id));
      notify('শিক্ষকের তথ্য মুছে ফেলা হয়েছে।', 'success');
    } catch (err) {
      notify('তথ্য মুছতে সমস্যা হয়েছে।', 'error');
      handleFirestoreError(err, OperationType.DELETE, `faculty/${fac.id}`);
    }
  };

  return (
    <div className="space-y-5">
      <AdminModuleHeader
        title="শিক্ষক ব্যবস্থাপনা"
        subtitle={`মোট শিক্ষক: ${toBnDigits(faculty.length)} জন · ওয়েবসাইট প্রোফাইল ও অভ্যন্তরীণ বেতন-ভাতা সমন্বিত`}
        icon={<Users className="h-5 w-5" />}
        accent="sky"
        actions={
          isAdmin && (
            <>
              <button
                type="button"
                onClick={() => {
                  downloadTeachersPdf(hrRecords);
                  notify('শিক্ষক তালিকা পিডিএফ ডাউনলোড হচ্ছে।', 'info');
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
                    hrRecords.map((t) => ({
                      EmployeeID: t.employeeId,
                      Name: t.name,
                      Designation: t.designation,
                      Department: t.department,
                      Phone: t.phone,
                      Email: t.email,
                      SalaryBDT: t.salaryBdt,
                      Status: t.status,
                    })),
                    'Teachers',
                    'Teachers_Directory.xlsx'
                  );
                  notify('শিক্ষক তালিকা এক্সেল রপ্তানি হয়েছে।', 'success');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-xs font-bold text-[#087F5B] transition hover:bg-[#EDF9F4] dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                এক্সেল
              </button>
              {missingPdfCount > 0 && (
                <button
                  type="button"
                  disabled={syncingRoster}
                  onClick={() => void handleSyncPdfTeachers()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#F4A62A]/60 bg-[#FEF5E4] px-3.5 py-2 text-xs font-extrabold text-[#9A5B00] transition hover:bg-[#F4A62A] hover:text-[#123B67] disabled:opacity-60 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  {syncingRoster
                    ? 'যুক্ত হচ্ছে...'
                    : `পিডিএফ শিক্ষক যুক্ত করুন (${toBnDigits(missingPdfCount)})`}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (showForm) resetForm();
                  else {
                    setForm((f) => ({ ...f, employeeId: `EMP-${String(faculty.length + 1).padStart(3, '0')}` }));
                    setShowForm(true);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A]"
              >
                <Plus className="h-4 w-4" />
                {showForm ? 'ফর্ম বন্ধ করুন' : 'নতুন শিক্ষক'}
              </button>
            </>
          )
        }
      />

      {showForm && isAdmin && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <h3 className="mb-4 text-sm font-extrabold text-[#087F5B] dark:text-emerald-400">
            {editingFacultyId ? 'শিক্ষকের তথ্য সম্পাদনা' : 'নতুন শিক্ষক নিয়োগ ফর্ম'}
          </h3>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">কর্মচারী আইডি *</label>
              <input required value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className={INPUT_CLS} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">শিক্ষকের পূর্ণ নাম *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">পদবি *</label>
              <input required value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">বিভাগ *</label>
              <input required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">পাঠদানের বিষয় *</label>
              <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">শিক্ষাগত যোগ্যতা</label>
              <input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">দায়িত্ব</label>
              <input value={form.responsibility} onChange={(e) => setForm({ ...form, responsibility: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">মোবাইল নম্বর *</label>
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">ইমেইল *</label>
              <input required type="text" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">মাসিক বেতন (টাকা) *</label>
              <input required type="number" min={0} value={form.salaryBdt} onChange={(e) => setForm({ ...form, salaryBdt: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">অভিজ্ঞতা (বছর)</label>
              <input type="number" min={0} max={60} value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">শাখা / শিফট</label>
              <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value as 'Morning' | 'Day' | 'Both' })} className={INPUT_CLS}>
                {Object.entries(SHIFT_BN).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">অবস্থা</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'Active' | 'OnLeave' | 'Inactive' })} className={INPUT_CLS}>
                {Object.entries(TEACHER_STATUS_BN).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">ছবির লিংক (ঐচ্ছিক)</label>
              <input value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} className={INPUT_CLS} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">সংক্ষিপ্ত পরিচিতি</label>
              <textarea rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={INPUT_CLS} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#087F5B] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-60"
            >
              {saving ? 'সংরক্ষণ হচ্ছে...' : editingFacultyId ? 'হালনাগাদ করুন' : 'শিক্ষক সংরক্ষণ করুন'}
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

      {/* Search & Department Filter */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#DCE8E1] bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#647E8B]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="শিক্ষকের নাম, পদবি বা বিষয় দিয়ে খুঁজুন..."
            className="w-full rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] py-2 pr-3 pl-10 text-xs text-[#263B35] focus:border-[#087F5B] focus:bg-white focus:outline-none sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] px-3 py-2 text-xs font-bold text-[#123B67] sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {departments.map((d) => (
            <option key={d} value={d}>{d === 'সকল' ? 'সকল বিভাগ' : d}</option>
          ))}
        </select>
      </div>

      {/* Table + Pagination */}
      <div className="overflow-hidden rounded-2xl border border-[#DCE8E1] bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs sm:text-sm">
            <thead className="bg-gradient-to-r from-[#123B67] to-[#087F5B] text-white">
              <tr>
                <th className="px-4 py-3.5 font-bold">নাম ও পদবি</th>
                <th className="px-4 py-3.5 font-bold">বিভাগ ও বিষয়</th>
                <th className="px-4 py-3.5 font-bold">যোগ্যতা ও শিফট</th>
                {isAdmin && <th className="px-4 py-3.5 font-bold">যোগাযোগ ও বেতন</th>}
                <th className="px-4 py-3.5 font-bold">অবস্থা</th>
                {isAdmin && <th className="px-4 py-3.5 text-right font-bold">অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF2ED] dark:divide-slate-800">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 4} className="px-4 py-10 text-center text-[#587064] dark:text-slate-400">
                    কোনো শিক্ষকের তথ্য পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                paged.map((f) => {
                  const hr = hrByFaculty.get(f.id);
                  return (
                    <tr key={f.id} className="transition hover:bg-[#F5FAF7] dark:hover:bg-slate-800/60">
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-[#123B67] dark:text-white">{f.nameBn || f.name}</p>
                        <p className="text-[11px] font-bold text-[#087F5B] dark:text-emerald-400">{f.designation}</p>
                        {hr?.employeeId && (
                          <p className="text-[10px] font-semibold text-[#647E8B] tabular-nums dark:text-slate-400">
                            আইডি: {hr.employeeId}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-[#263B35] dark:text-slate-200">{f.department}</p>
                        <p className="text-[11px] text-[#526B78] dark:text-slate-400">বিষয়: {f.subject}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs text-[#263B35] dark:text-slate-300">{f.qualification || '—'}</p>
                        <p className="text-[11px] text-[#526B78] tabular-nums dark:text-slate-400">
                          {f.responsibility || SHIFT_BN[f.shift]}
                        </p>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3.5 tabular-nums">
                          <p className="text-xs font-semibold text-[#123B67] dark:text-slate-200">{hr?.phone || '—'}</p>
                          {hr?.email && hr.email !== 'তথ্য নেই' && (
                            <p className="text-[11px] text-[#526B78] dark:text-slate-400">{hr.email}</p>
                          )}
                          {hr && hr.salaryBdt > 0 && (
                            <p className="text-[11px] font-extrabold text-[#087F5B] dark:text-emerald-400">
                              {formatBdtBn(hr.salaryBdt)}
                            </p>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                            f.status === 'Active'
                              ? 'bg-[#EDF9F4] text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300'
                              : f.status === 'OnLeave'
                              ? 'bg-[#FFF8EA] text-[#A66300] dark:bg-amber-500/20 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {TEACHER_STATUS_BN[f.status] || f.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              title="সম্পাদনা করুন"
                              onClick={() => openEdit(f)}
                              className="rounded-lg bg-[#EDF9F4] p-1.5 text-[#087F5B] transition hover:bg-[#087F5B] hover:text-white dark:bg-emerald-500/20 dark:text-emerald-300"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="মুছে ফেলুন"
                              onClick={() => void handleDelete(f)}
                              className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-600 hover:text-white dark:bg-rose-500/20 dark:text-rose-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
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
