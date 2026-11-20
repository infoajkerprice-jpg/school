import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Plus,
  Search,
  Trash2,
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
import { clampStr, evaluateExamResult } from '../../lib/grading';
import { downloadMarksheetPdf, exportToExcel } from '../../lib/reports';
import { computeMarksheetContext } from '../../lib/marksheetPdf';
import { MarksheetPreviewModal } from '../MarksheetPreviewModal';
import { AdminModuleHeader, AdminPagination } from '../AdminPagination';
import { StudentPicker } from '../StudentPicker';
import { useUIFeedback } from '../ToastContext';
import { usePublicData } from '../../context/PublicDataContext';
import { labelClass, labelSection, RESULT_STATUS_BN, toBnDigits } from '../../i18n';
import { BD_CLASSES, type ExamResult, type StudentRecord, type UserAccount } from '../../types';

interface Props {
  currentUser: UserAccount;
}

const DEFAULT_SUBJECTS = [
  { subject: 'বাংলা', marks: '84', fullMarks: '100' },
  { subject: 'ইংরেজি', marks: '80', fullMarks: '100' },
  { subject: 'গণিত', marks: '90', fullMarks: '100' },
  { subject: 'বিজ্ঞান', marks: '86', fullMarks: '100' },
  { subject: 'বাংলাদেশ ও বিশ্ব পরিচয়', marks: '82', fullMarks: '100' },
  { subject: 'ধর্ম ও নৈতিক শিক্ষা', marks: '92', fullMarks: '100' },
  { subject: 'আরবি / কুরআন শিক্ষা', marks: '46', fullMarks: '50' },
];

const PAGE_SIZE = 10;

export const ResultsModule: React.FC<Props> = ({ currentUser }) => {
  const { settings } = usePublicData();
  const { notify, confirm } = useUIFeedback();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewResult, setPreviewResult] = useState<ExamResult | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Published' | 'Draft'>('ALL');
  const [page, setPage] = useState(1);

  const canManage = currentUser.role === 'admin' || currentUser.role === 'teacher';
  const isAdmin = currentUser.role === 'admin';

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [examName, setExamName] = useState('অর্ধবার্ষিক পরীক্ষা');
  const [academicYear, setAcademicYear] = useState('2025');
  const [meritPosition, setMeritPosition] = useState('১ম স্থান');
  const [status, setStatus] = useState<'Published' | 'Draft'>('Published');
  const [subjectRows, setSubjectRows] = useState(DEFAULT_SUBJECTS);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    if (canManage) {
      unsubs.push(
        onSnapshot(
          collection(db, 'students'),
          (s) => setStudents(s.docs.map((d) => ({ id: d.id, ...d.data() } as StudentRecord))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'students')
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
      const uidField = currentUser.role === 'student' ? 'studentUid' : 'parentUid';
      unsubs.push(
        onSnapshot(
          query(collection(db, 'published_results'), where(uidField, '==', currentUser.uid)),
          (s) => setResults(s.docs.map((d) => ({ id: d.id, ...d.data() } as ExamResult))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'published_results')
        )
      );
    }
    return () => unsubs.forEach((u) => u());
  }, [canManage, currentUser.role, currentUser.uid]);

  const filteredResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return results.filter((r) => {
      if (classFilter !== 'ALL' && r.className !== classFilter) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.studentName.toLowerCase().includes(q) ||
        r.studentRoll.toLowerCase().includes(q) ||
        r.examName.toLowerCase().includes(q) ||
        labelClass(r.className).toLowerCase().includes(q)
      );
    });
  }, [results, searchTerm, classFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, classFilter, statusFilter]);

  const paginatedResults = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredResults.slice(start, start + PAGE_SIZE);
  }, [filteredResults, page]);

  const publishedCount = results.filter((r) => r.status === 'Published').length;
  const aPlusCount = results.filter((r) => r.grade === 'A+').length;

  const previewEval = evaluateExamResult(
    subjectRows
      .filter((r) => r.subject.trim())
      .map((r) => ({ subject: r.subject, marks: Number(r.marks) || 0, fullMarks: Number(r.fullMarks) || 100 }))
  );

  const handleDownloadPdf = async (r: ExamResult) => {
    setDownloadingId(r.id);
    try {
      const ctx = computeMarksheetContext(r, results, settings.schoolNameBn);
      await downloadMarksheetPdf(r, ctx);
      notify(`${r.studentName}-এর মার্কশিট পিডিএফ ডাউনলোড শুরু হয়েছে।`, 'success');
    } catch (err) {
      console.error('Marksheet PDF export failed:', err);
      notify('মার্কশিট পিডিএফ তৈরি করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const stu = students.find((s) => s.id === selectedStudentId);
    if (!stu) {
      notify('অনুগ্রহ করে একজন শিক্ষার্থী নির্বাচন করুন।', 'warning');
      return;
    }
    setSaving(true);
    try {
      const evaluated = evaluateExamResult(
        subjectRows
          .filter((r) => r.subject.trim())
          .map((r) => ({ subject: r.subject, marks: Number(r.marks) || 0, fullMarks: Number(r.fullMarks) || 100 }))
      );
      const id = makeSafeDocId('res');
      await setDoc(doc(db, 'published_results', id), {
        studentId: stu.id,
        studentRoll: stu.rollNumber,
        studentName: stu.name,
        className: stu.className,
        section: stu.section,
        examName: clampStr(examName, 100),
        academicYear: clampStr(academicYear, 10),
        meritPosition: clampStr(meritPosition, 30),
        subjects: evaluated.subjects,
        totalMarks: evaluated.totalMarks,
        gpa: evaluated.gpa,
        grade: evaluated.grade,
        status,
        ...(stu.studentUid ? { studentUid: stu.studentUid } : {}),
        ...(stu.parentUid ? { parentUid: stu.parentUid } : {}),
        authorUid: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      notify(`${stu.name}-এর ফলাফল সফলভাবে সংরক্ষিত হয়েছে (জিপিএ: ${toBnDigits(evaluated.gpa.toFixed(2))})।`, 'success');
      setShowForm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'published_results');
      notify('ফলাফল সংরক্ষণ ব্যর্থ হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (r: ExamResult) => {
    const nextStatus = r.status === 'Published' ? 'Draft' : 'Published';
    try {
      await updateDoc(doc(db, 'published_results', r.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      notify(
        nextStatus === 'Published'
          ? `${r.studentName}-এর ফলাফল প্রকাশ করা হয়েছে।`
          : `${r.studentName}-এর ফলাফল খসড়া অবস্থায় নেওয়া হয়েছে।`,
        'info'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `published_results/${r.id}`);
      notify('অবস্থা পরিবর্তন ব্যর্থ হয়েছে।', 'error');
    }
  };

  const handleDelete = async (r: ExamResult) => {
    if (!isAdmin) return;
    const ok = await confirm({
      title: 'ফলাফল মুছে ফেলুন',
      message: `আপনি কি নিশ্চিতভাবে ${r.studentName} (${r.examName})-এর ফলাফলটি স্থায়ীভাবে মুছে ফেলতে চান?`,
      confirmLabel: 'মুছে ফেলুন',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'published_results', r.id));
      notify('ফলাফল সফলভাবে মুছে ফেলা হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `published_results/${r.id}`);
      notify('ফলাফল মুছে ফেলতে সমস্যা হয়েছে।', 'error');
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-sm text-[#263B35] outline-none transition focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  return (
    <div className="space-y-5">
      <AdminModuleHeader
        title="পরীক্ষা ও ফলাফল ব্যবস্থাপনা"
        subtitle="এনসিটিবি জিপিএ ৫.০০ পদ্ধতিতে স্বয়ংক্রিয় গ্রেড গণনা, ফলাফল প্রকাশ ও কালপুরুষ মার্কশিট পিডিএফ।"
        icon={<Award className="h-5 w-5" />}
        accent="sky"
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                exportToExcel(
                  filteredResults.map((r) => ({
                    Exam: r.examName,
                    Year: r.academicYear,
                    Class: r.className,
                    Section: r.section,
                    Roll: r.studentRoll,
                    Student: r.studentName,
                    TotalMarks: r.totalMarks,
                    GPA: r.gpa,
                    Grade: r.grade,
                    Merit: r.meritPosition || '',
                    Status: r.status,
                  })),
                  'Results',
                  'Exam_Results.xlsx'
                );
                notify('ফলাফলের এক্সেল শিট ডাউনলোড হয়েছে।', 'info');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-xs font-bold text-[#123B67] transition hover:bg-[#F2F8F5] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <FileSpreadsheet className="h-4 w-4 text-[#087F5B]" />
              এক্সেল রপ্তানি
            </button>
            {canManage && (
              <button
                type="button"
                onClick={() => setShowForm((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A]"
              >
                {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showForm ? 'ফর্ম বন্ধ করুন' : 'নতুন ফলাফল যুক্ত করুন'}
              </button>
            )}
          </>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#526B78] dark:text-slate-400">মোট সংরক্ষিত ফলাফল</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#21A9D6]/15 text-[#0E7DA3] dark:bg-cyan-500/20 dark:text-cyan-300">
              <ClipboardList className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#123B67] tabular-nums dark:text-white">
            {toBnDigits(results.length)}টি
          </p>
        </div>
        <div className="rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#526B78] dark:text-slate-400">প্রকাশিত ফলাফল</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#087F5B]/12 text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#087F5B] tabular-nums dark:text-emerald-400">
            {toBnDigits(publishedCount)}টি
          </p>
        </div>
        <div className="rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#526B78] dark:text-slate-400">জিপিএ ৫.০০ (A+)</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F4A62A]/18 text-[#B47009] dark:bg-amber-500/20 dark:text-amber-300">
              <Award className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#B47009] tabular-nums dark:text-amber-300">
            {toBnDigits(aPlusCount)} জন
          </p>
        </div>
      </div>

      {/* Add Result Form */}
      {showForm && canManage && (
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between border-b border-[#E6F0EA] pb-3 dark:border-slate-800">
            <h3 className="text-sm font-extrabold text-[#123B67] dark:text-white">
              শিক্ষার্থীর পরীক্ষার নম্বর এন্ট্রি
            </h3>
            <span className="rounded-lg bg-[#21A9D6]/12 px-2.5 py-1 text-[11px] font-bold text-[#0E7DA3] dark:bg-cyan-500/20 dark:text-cyan-300">
              স্বয়ংক্রিয় জিপিএ হিসাব
            </span>
          </div>

          <StudentPicker
            students={students}
            value={selectedStudentId}
            onChange={setSelectedStudentId}
            label="শ্রেণি ও শিক্ষার্থী নির্বাচন করুন"
            required
          />

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
                পরীক্ষার নাম *
              </label>
              <input
                required
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
                শিক্ষাবর্ষ *
              </label>
              <input
                required
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
                মেধাক্রম
              </label>
              <input
                value={meritPosition}
                onChange={(e) => setMeritPosition(e.target.value)}
                placeholder="যেমন: ১ম স্থান"
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-[#123B67] dark:text-slate-200">
                বিষয়ভিত্তিক নম্বর ({toBnDigits(subjectRows.length)}টি বিষয়)
              </label>
              <button
                type="button"
                onClick={() => setSubjectRows((r) => [...r, { subject: '', marks: '75', fullMarks: '100' }])}
                className="rounded-lg bg-[#087F5B]/12 px-3 py-1 text-xs font-bold text-[#087F5B] transition hover:bg-[#087F5B] hover:text-white dark:bg-emerald-500/20 dark:text-emerald-300"
              >
                + বিষয় যোগ করুন
              </button>
            </div>
            <div className="space-y-2">
              {subjectRows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <input
                    value={row.subject}
                    onChange={(e) =>
                      setSubjectRows((prev) => prev.map((it, i) => (i === idx ? { ...it, subject: e.target.value } : it)))
                    }
                    placeholder="বিষয়ের নাম"
                    className={`col-span-6 ${inputClass}`}
                  />
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={row.marks}
                    onChange={(e) =>
                      setSubjectRows((prev) => prev.map((it, i) => (i === idx ? { ...it, marks: e.target.value } : it)))
                    }
                    placeholder="প্রাপ্ত নম্বর"
                    className={`col-span-3 tabular-nums ${inputClass}`}
                  />
                  <input
                    type="number"
                    min={10}
                    max={200}
                    value={row.fullMarks}
                    onChange={(e) =>
                      setSubjectRows((prev) => prev.map((it, i) => (i === idx ? { ...it, fullMarks: e.target.value } : it)))
                    }
                    placeholder="পূর্ণমান"
                    className={`col-span-2 tabular-nums ${inputClass}`}
                  />
                  <button
                    type="button"
                    onClick={() => setSubjectRows((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label="বিষয় মুছুন"
                    className="col-span-1 flex items-center justify-center rounded-xl bg-rose-50 text-xs font-bold text-rose-600 transition hover:bg-rose-600 hover:text-white dark:bg-rose-950/40 dark:text-rose-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCE8E1] bg-[#F2F8F5] p-3.5 dark:border-slate-700 dark:bg-slate-800/70">
            <div className="flex flex-wrap gap-4 text-xs font-extrabold tabular-nums text-[#123B67] dark:text-slate-100">
              <span>মোট নম্বর: {toBnDigits(previewEval.totalMarks)}</span>
              <span className="text-[#087F5B] dark:text-emerald-400">
                জিপিএ: {toBnDigits(previewEval.gpa.toFixed(2))}
              </span>
              <span className="rounded-lg bg-[#087F5B] px-2 py-0.5 text-white">গ্রেড: {previewEval.grade}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Published' | 'Draft')}
                className="rounded-xl border border-[#CFE0D6] bg-white px-3 py-2 text-xs font-bold text-[#123B67] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="Published">প্রকাশিত</option>
                <option value="Draft">খসড়া</option>
              </select>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#087F5B] px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-60"
              >
                {saving ? 'সংরক্ষণ হচ্ছে...' : 'ফলাফল সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#DCE8E1] bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#647B86] dark:text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="শিক্ষার্থীর নাম, রোল বা পরীক্ষার নাম দিয়ে খুঁজুন..."
            className="w-full rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] py-2 pr-3 pl-10 text-xs text-[#263B35] outline-none focus:border-[#087F5B] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="rounded-xl border border-[#CFE0D6] bg-white px-3 py-2 text-xs font-bold text-[#123B67] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="ALL">সকল শ্রেণি</option>
          {BD_CLASSES.map((c) => (
            <option key={c} value={c}>
              {labelClass(c)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'Published' | 'Draft')}
          className="rounded-xl border border-[#CFE0D6] bg-white px-3 py-2 text-xs font-bold text-[#123B67] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="ALL">সকল অবস্থা</option>
          <option value="Published">প্রকাশিত</option>
          <option value="Draft">খসড়া</option>
        </select>
      </div>

      {/* Results Table */}
      <div className="overflow-hidden rounded-2xl border border-[#DCE8E1] bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#123B67] text-white dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 font-bold">শিক্ষার্থী ও রোল</th>
                <th className="px-4 py-3 font-bold">শ্রেণি ও পরীক্ষা</th>
                <th className="px-4 py-3 font-bold">মোট নম্বর</th>
                <th className="px-4 py-3 font-bold">জিপিএ ও গ্রেড</th>
                <th className="px-4 py-3 font-bold">মেধাক্রম</th>
                <th className="px-4 py-3 font-bold">অবস্থা</th>
                <th className="px-4 py-3 text-right font-bold">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF2ED] dark:divide-slate-800">
              {paginatedResults.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#587064] dark:text-slate-400">
                    কোনো পরীক্ষার ফলাফল পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                paginatedResults.map((r) => (
                  <tr key={r.id} className="transition hover:bg-[#F2F8F5]/70 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-[#123B67] dark:text-white">{r.studentName}</p>
                      <p className="text-[11px] font-medium text-[#526B78] tabular-nums dark:text-slate-400">
                        রোল: {toBnDigits(r.studentRoll)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#263B35] dark:text-slate-200">
                        {labelClass(r.className)} ({labelSection(r.section)})
                      </p>
                      <p className="text-[11px] text-[#526B78] dark:text-slate-400">
                        {r.examName} ({toBnDigits(r.academicYear)})
                      </p>
                    </td>
                    <td className="px-4 py-3 font-extrabold text-[#123B67] tabular-nums dark:text-slate-100">
                      {toBnDigits(r.totalMarks)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className="font-extrabold text-[#087F5B] dark:text-emerald-400">
                        {toBnDigits(r.gpa.toFixed(2))}
                      </span>{' '}
                      <span className="rounded-lg bg-[#087F5B]/12 px-2 py-0.5 text-[11px] font-bold text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300">
                        {r.grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-[#805AD5] dark:text-purple-300">
                      {r.meritPosition || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => togglePublish(r)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                            r.status === 'Published'
                              ? 'bg-[#087F5B]/12 text-[#087F5B] hover:bg-[#087F5B] hover:text-white dark:bg-emerald-500/20 dark:text-emerald-300'
                              : 'bg-[#F4A62A]/20 text-[#9A5B00] hover:bg-[#F4A62A] hover:text-white dark:bg-amber-500/20 dark:text-amber-300'
                          }`}
                        >
                          {RESULT_STATUS_BN[r.status]}
                        </button>
                      ) : (
                        <span className="rounded-lg bg-[#087F5B]/12 px-2.5 py-1 text-[11px] font-bold text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300">
                          {RESULT_STATUS_BN[r.status]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewResult(r)}
                          title="মার্কশিট প্রিভিউ"
                          className="inline-flex items-center gap-1 rounded-lg bg-[#21A9D6]/14 px-2.5 py-1.5 text-xs font-bold text-[#0E7DA3] transition hover:bg-[#21A9D6] hover:text-white dark:bg-cyan-500/20 dark:text-cyan-300"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          প্রিভিউ
                        </button>
                        <button
                          type="button"
                          disabled={downloadingId === r.id}
                          onClick={() => handleDownloadPdf(r)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#087F5B]/12 px-2.5 py-1.5 text-xs font-bold text-[#087F5B] transition hover:bg-[#087F5B] hover:text-white disabled:opacity-60 dark:bg-emerald-500/20 dark:text-emerald-300"
                        >
                          {downloadingId === r.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          মার্কশিট
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDelete(r)}
                            aria-label="মুছে ফেলুন"
                            className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-600 hover:text-white dark:bg-rose-950/40 dark:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          totalItems={filteredResults.length}
          pageSize={PAGE_SIZE}
          currentPage={page}
          onPageChange={setPage}
        />
      </div>

      {previewResult && (
        <MarksheetPreviewModal
          result={previewResult}
          options={computeMarksheetContext(previewResult, results, settings.schoolNameBn)}
          onClose={() => setPreviewResult(null)}
        />
      )}
    </div>
  );
};
