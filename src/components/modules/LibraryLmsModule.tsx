import React, { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, Library, Plus, Send, Trash2, X } from 'lucide-react';
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
import { formatBdtBn, labelClass, RESOURCE_TYPE_BN, toBnDigits } from '../../i18n';
import { AdminModuleHeader } from '../AdminPagination';
import { StudentPicker } from '../StudentPicker';
import { useUIFeedback } from '../ToastContext';
import {
  BD_CLASSES,
  type BookLoan,
  type LibraryResource,
  type LmsSubmission,
  type StudentRecord,
  type UserAccount,
} from '../../types';

interface Props {
  currentUser: UserAccount;
}

export const LibraryLmsModule: React.FC<Props> = ({ currentUser }) => {
  const { notify, confirm } = useUIFeedback();
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [submissions, setSubmissions] = useState<LmsSubmission[]>([]);
  const [loans, setLoans] = useState<BookLoan[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [activeResource, setActiveResource] = useState<LibraryResource | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [saving, setSaving] = useState(false);

  const [loanForm, setLoanForm] = useState({
    resourceId: '',
    studentId: '',
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  });

  const canManage = currentUser.role === 'admin' || currentUser.role === 'teacher';
  const isAdmin = currentUser.role === 'admin';

  const [form, setForm] = useState({
    title: '',
    author: '',
    subject: '',
    classLevel: 'Class 6',
    resourceType: 'lecture_note' as LibraryResource['resourceType'],
    description: '',
    resourceUrl: '',
    totalCopies: '10',
  });

  useEffect(() => {
    const u1 = onSnapshot(
      collection(db, 'library_resources'),
      (s) => setResources(s.docs.map((d) => ({ id: d.id, ...d.data() } as LibraryResource))),
      (e) => handleFirestoreError(e, OperationType.LIST, 'library_resources')
    );

    const subRef = canManage
      ? collection(db, 'lms_submissions')
      : query(collection(db, 'lms_submissions'), where('studentUid', '==', currentUser.uid));

    const u2 = onSnapshot(
      subRef,
      (s) => setSubmissions(s.docs.map((d) => ({ id: d.id, ...d.data() } as LmsSubmission))),
      (e) => handleFirestoreError(e, OperationType.LIST, 'lms_submissions')
    );

    const loanRef = canManage
      ? collection(db, 'book_loans')
      : query(collection(db, 'book_loans'), where('studentUid', '==', currentUser.uid));
    const u3 = onSnapshot(
      loanRef,
      (s) =>
        setLoans(
          s.docs
            .map((d) => ({ id: d.id, ...d.data() } as BookLoan))
            .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
        ),
      (e) => handleFirestoreError(e, OperationType.LIST, 'book_loans')
    );

    const u4 = canManage
      ? onSnapshot(
          collection(db, 'students'),
          (s) => setStudents(s.docs.map((d) => ({ id: d.id, ...d.data() } as StudentRecord))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'students')
        )
      : () => {};

    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, [canManage, currentUser.uid]);

  const computeLateFine = (dueDate: string): number => {
    const dueMs = Date.parse(dueDate);
    if (Number.isNaN(dueMs)) return 0;
    const overdueDays = Math.floor((Date.now() - dueMs) / 86400000);
    return overdueDays > 0 ? overdueDays * 5 : 0;
  };

  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    const book = resources.find((r) => r.id === loanForm.resourceId);
    const student = students.find((s) => s.id === loanForm.studentId);
    if (!book || !student) return;
    if (book.availableCopies < 1) {
      notify('এই বইটির কোনো কপি বর্তমানে স্টকে নেই।', 'warning');
      return;
    }
    setSaving(true);
    try {
      const id = makeSafeDocId('loan');
      await setDoc(doc(db, 'book_loans', id), {
        resourceId: book.id,
        bookTitle: clampStr(book.titleBn || book.title, 180),
        studentId: student.id,
        studentName: student.name,
        className: student.className,
        rollNumber: student.rollNumber,
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: loanForm.dueDate,
        returnDate: '',
        fineBdt: 0,
        status: 'Issued',
        studentUid: student.studentUid || '',
        issuedByUid: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'library_resources', book.id), {
        availableCopies: Math.max(0, book.availableCopies - 1),
        updatedAt: serverTimestamp(),
      });
      setLoanForm({ ...loanForm, resourceId: '', studentId: '' });
      notify(`"${book.titleBn || book.title}" বইটি ${student.name}-কে ইস্যু করা হয়েছে।`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'book_loans');
      notify('বই ইস্যু ব্যর্থ হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReturnBook = async (loan: BookLoan) => {
    if (!canManage) return;
    const fine = computeLateFine(loan.dueDate);
    try {
      await updateDoc(doc(db, 'book_loans', loan.id), {
        status: 'Returned',
        returnDate: new Date().toISOString().slice(0, 10),
        fineBdt: fine,
        updatedAt: serverTimestamp(),
      });
      const book = resources.find((r) => r.id === loan.resourceId);
      if (book) {
        await updateDoc(doc(db, 'library_resources', book.id), {
          availableCopies: Math.min(book.totalCopies, book.availableCopies + 1),
          updatedAt: serverTimestamp(),
        });
      }
      notify(
        fine > 0
          ? `বই ফেরত নেওয়া হয়েছে। বিলম্ব জরিমানা: ${formatBdtBn(fine)}`
          : 'বই সফলভাবে ফেরত নেওয়া হয়েছে।',
        'success'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `book_loans/${loan.id}`);
      notify('বই ফেরত নিতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);
    try {
      const id = makeSafeDocId('lib');
      const copies = Math.max(1, Number(form.totalCopies) || 1);
      await setDoc(doc(db, 'library_resources', id), {
        title: clampStr(form.title, 180),
        titleBn: clampStr(form.title, 180),
        author: clampStr(form.author, 120),
        subject: clampStr(form.subject, 80),
        classLevel: form.classLevel,
        resourceType: form.resourceType,
        description: clampStr(form.description, 1200),
        resourceUrl: clampStr(form.resourceUrl, 500),
        totalCopies: copies,
        availableCopies: copies,
        uploadedByUid: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setForm({
        title: '',
        author: '',
        subject: '',
        classLevel: 'Class 6',
        resourceType: 'lecture_note',
        description: '',
        resourceUrl: '',
        totalCopies: '10',
      });
      notify('নতুন ডিজিটাল পাঠ্যউপকরণ সফলভাবে যুক্ত হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'library_resources');
      notify('উপকরণ সংরক্ষণ ব্যর্থ হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteResource = async (res: LibraryResource) => {
    const ok = await confirm({
      title: 'উপকরণ মুছে ফেলুন',
      message: `"${res.titleBn || res.title}" উপকরণটি কি লাইব্রেরি থেকে মুছে ফেলতে চান?`,
      confirmLabel: 'মুছে ফেলুন',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'library_resources', res.id));
      notify('পাঠ্যউপকরণ মুছে ফেলা হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `library_resources/${res.id}`);
      notify('মুছে ফেলতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeResource) return;
    setSaving(true);
    try {
      const id = makeSafeDocId('sub');
      await setDoc(doc(db, 'lms_submissions', id), {
        resourceId: activeResource.id,
        resourceTitle: activeResource.titleBn || activeResource.title,
        studentName: currentUser.displayName,
        className: currentUser.className || activeResource.classLevel,
        submissionText: clampStr(submissionText, 2000),
        submissionLink: clampStr(submissionLink, 500),
        status: 'Submitted',
        studentUid: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setActiveResource(null);
      setSubmissionText('');
      setSubmissionLink('');
      notify('আপনার অ্যাসাইনমেন্ট সফলভাবে জমা হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'lms_submissions');
      notify('অ্যাসাইনমেন্ট জমা দিতে সমস্যা হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGrade = async (sub: LmsSubmission, grade: string) => {
    try {
      await updateDoc(doc(db, 'lms_submissions', sub.id), {
        grade,
        feedback: 'মূল্যায়ন সম্পন্ন হয়েছে।',
        status: 'Graded',
        updatedAt: serverTimestamp(),
      });
      notify(`${sub.studentName}-এর অ্যাসাইনমেন্টে গ্রেড (${grade}) প্রদান করা হয়েছে।`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lms_submissions/${sub.id}`);
      notify('গ্রেড প্রদান ব্যর্থ হয়েছে।', 'error');
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-sm text-[#263B35] outline-none transition focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  return (
    <div className="space-y-5">
      <AdminModuleHeader
        title="ডিজিটাল লাইব্রেরি ও ই-লার্নিং"
        subtitle="ই-বুক, সিলেবাস, লেকচার নোট, বই ইস্যু-ফেরত ও অনলাইন অ্যাসাইনমেন্ট মূল্যায়ন।"
        icon={<Library className="h-5 w-5" />}
        accent="purple"
        actions={
          <span className="rounded-xl bg-[#805AD5]/15 px-3.5 py-2 text-xs font-bold text-[#805AD5] tabular-nums dark:bg-purple-500/20 dark:text-purple-300">
            মোট উপকরণ: {toBnDigits(resources.length)}টি
          </span>
        }
      />

      {canManage && (
        <form
          onSubmit={handleAddResource}
          className="rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
        >
          <h3 className="mb-4 border-b border-[#E6F0EA] pb-2.5 text-sm font-extrabold text-[#123B67] dark:border-slate-800 dark:text-white">
            নতুন পাঠ্যবই, নোট বা অ্যাসাইনমেন্ট যোগ করুন
          </h3>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">শিরোনাম *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">লেখক / শিক্ষক *</label>
              <input
                required
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">বিষয় *</label>
              <input
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">শ্রেণি</label>
              <select
                value={form.classLevel}
                onChange={(e) => setForm({ ...form, classLevel: e.target.value })}
                className={inputClass}
              >
                {BD_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {labelClass(c)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">ধরন</label>
              <select
                value={form.resourceType}
                onChange={(e) =>
                  setForm({ ...form, resourceType: e.target.value as LibraryResource['resourceType'] })
                }
                className={inputClass}
              >
                {Object.entries(RESOURCE_TYPE_BN).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">ফাইল / লিংক (URL)</label>
              <input
                value={form.resourceUrl}
                onChange={(e) => setForm({ ...form, resourceUrl: e.target.value })}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            উপকরণ সংরক্ষণ করুন
          </button>
        </form>
      )}

      {/* Resources Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((res) => (
          <div
            key={res.id}
            className="flex flex-col justify-between rounded-2xl border border-[#DCE8E1] bg-white p-4 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="rounded-lg bg-[#805AD5]/15 px-2.5 py-0.5 text-[#805AD5] dark:bg-purple-500/20 dark:text-purple-300">
                  {RESOURCE_TYPE_BN[res.resourceType]}
                </span>
                <span className="text-[#526B78] dark:text-slate-400">{labelClass(res.classLevel)}</span>
              </div>
              <h4 className="mt-2.5 text-sm font-extrabold text-[#123B67] dark:text-white">
                {res.titleBn || res.title}
              </h4>
              <p className="mt-1 text-xs text-[#526B78] tabular-nums dark:text-slate-400">
                বিষয়: {res.subject} · {res.author} · স্টক: {toBnDigits(res.availableCopies)}/{toBnDigits(res.totalCopies)}
              </p>
              {res.description && (
                <p className="mt-2 line-clamp-2 text-xs text-[#4C6357] dark:text-slate-300">{res.description}</p>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#EDF3EF] pt-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {res.resourceUrl && (
                  <a
                    href={res.resourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#087F5B] hover:underline dark:text-emerald-400"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    খুলুন
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {res.resourceType === 'assignment' && currentUser.role === 'student' && (
                  <button
                    type="button"
                    onClick={() => setActiveResource(res)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#087F5B] px-2.5 py-1.5 text-xs font-bold text-white"
                  >
                    <Send className="h-3 w-3" />
                    জমা দিন
                  </button>
                )}
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDeleteResource(res)}
                  aria-label="মুছে ফেলুন"
                  className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-600 hover:text-white dark:bg-rose-950/40 dark:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Book Circulation */}
      <div className="space-y-4 rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-extrabold text-[#123B67] dark:text-white">
          বই ইস্যু, ফেরত ও বিলম্ব জরিমানা হিসাব ({toBnDigits(loans.length)})
        </h3>

        {canManage && (
          <form onSubmit={handleIssueBook} className="space-y-3">
            <StudentPicker
              students={students}
              value={loanForm.studentId}
              onChange={(id) => setLoanForm({ ...loanForm, studentId: id })}
              label="শিক্ষার্থী নির্বাচন করুন (শ্রেণি ও নাম/রোল)"
              required
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <select
                required
                value={loanForm.resourceId}
                onChange={(e) => setLoanForm({ ...loanForm, resourceId: e.target.value })}
                className={inputClass}
              >
                <option value="">-- বই নির্বাচন করুন --</option>
                {resources
                  .filter((r) => r.availableCopies > 0)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.titleBn || r.title} (উপলব্ধ: {toBnDigits(r.availableCopies)})
                    </option>
                  ))}
              </select>
              <input
                required
                type="date"
                value={loanForm.dueDate}
                onChange={(e) => setLoanForm({ ...loanForm, dueDate: e.target.value })}
                className={inputClass}
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A]"
              >
                বই ইস্যু করুন
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-xl border border-[#E6F0EA] dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#123B67] text-white dark:bg-slate-800">
              <tr>
                <th className="px-3.5 py-2.5 font-bold">বইয়ের নাম</th>
                <th className="px-3.5 py-2.5 font-bold">শিক্ষার্থী</th>
                <th className="px-3.5 py-2.5 font-bold">ইস্যু ও ফেরতের তারিখ</th>
                <th className="px-3.5 py-2.5 font-bold">জরিমানা (৳৫/দিন)</th>
                <th className="px-3.5 py-2.5 font-bold">অবস্থা</th>
                {canManage && <th className="px-3.5 py-2.5 text-right font-bold">অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF3EF] dark:divide-slate-800">
              {loans.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="px-3.5 py-8 text-center text-[#587064] dark:text-slate-400">
                    বর্তমানে কোনো বই ইস্যু করা নেই।
                  </td>
                </tr>
              ) : (
                loans.map((ln) => {
                  const estFine = ln.status === 'Issued' ? computeLateFine(ln.dueDate) : ln.fineBdt;
                  return (
                    <tr key={ln.id} className="transition hover:bg-[#F2F8F5]/70 dark:hover:bg-slate-800/50">
                      <td className="px-3.5 py-2.5 font-bold text-[#123B67] dark:text-white">{ln.bookTitle}</td>
                      <td className="px-3.5 py-2.5 text-[#263B35] tabular-nums dark:text-slate-300">
                        {ln.studentName} ({labelClass(ln.className)} · রোল {toBnDigits(ln.rollNumber)})
                      </td>
                      <td className="px-3.5 py-2.5 text-[#526B78] tabular-nums dark:text-slate-400">
                        ইস্যু: {toBnDigits(ln.issueDate)} · শেষ: {toBnDigits(ln.dueDate)}
                      </td>
                      <td
                        className={`px-3.5 py-2.5 font-extrabold tabular-nums ${
                          estFine > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#087F5B] dark:text-emerald-400'
                        }`}
                      >
                        {formatBdtBn(estFine)}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span
                          className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                            ln.status === 'Returned'
                              ? 'bg-[#087F5B]/12 text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300'
                              : 'bg-[#F4A62A]/20 text-[#9A5B00] dark:bg-amber-500/20 dark:text-amber-300'
                          }`}
                        >
                          {ln.status === 'Returned' ? 'ফেরত দেওয়া হয়েছে' : 'ইস্যুকৃত'}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-3.5 py-2.5 text-right">
                          {ln.status === 'Issued' && (
                            <button
                              type="button"
                              onClick={() => void handleReturnBook(ln)}
                              className="rounded-lg bg-[#087F5B] px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-[#06684A]"
                            >
                              ফেরত নিন
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submissions */}
      {submissions.length > 0 && (
        <div className="rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-base font-extrabold text-[#123B67] dark:text-white">
            অ্যাসাইনমেন্ট জমাদান ({toBnDigits(submissions.length)})
          </h3>
          <div className="space-y-3">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5EFE9] bg-[#F8FBF9] p-3.5 dark:border-slate-800 dark:bg-slate-800/60"
              >
                <div>
                  <p className="text-sm font-bold text-[#123B67] dark:text-white">
                    {sub.resourceTitle} —{' '}
                    <span className="text-[#087F5B] dark:text-emerald-400">{sub.studentName}</span>
                  </p>
                  <p className="mt-1 text-xs text-[#4B6370] dark:text-slate-300">{sub.submissionText}</p>
                </div>
                <div className="flex items-center gap-2">
                  {sub.status === 'Graded' ? (
                    <span className="rounded-lg bg-[#087F5B]/12 px-3 py-1 text-xs font-bold text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300">
                      গ্রেড: {sub.grade}
                    </span>
                  ) : canManage ? (
                    <div className="flex gap-1.5">
                      {(['A+', 'A', 'B'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => handleGrade(sub, g)}
                          className="rounded-lg bg-[#087F5B] px-2.5 py-1 text-xs font-bold text-white transition hover:bg-[#06684A]"
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="rounded-lg bg-[#F4A62A]/20 px-2.5 py-1 text-xs font-bold text-[#9A5B00] dark:bg-amber-500/20 dark:text-amber-300">
                      মূল্যায়নাধীন
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {activeResource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#091C2B]/65 p-4 backdrop-blur-xs"
          onClick={() => setActiveResource(null)}
        >
          <form
            onSubmit={handleSubmitAssignment}
            onClick={(e) => e.stopPropagation()}
            className="sheet-enter w-full max-w-lg rounded-2xl border border-[#DCE8E1] bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-[#123B67] dark:text-white">
                অ্যাসাইনমেন্ট জমা দিন: {activeResource.titleBn || activeResource.title}
              </h3>
              <button
                type="button"
                onClick={() => setActiveResource(null)}
                className="rounded-lg p-1 text-[#647B86] hover:bg-[#F2F8F5] dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">উত্তর / বিবরণ *</label>
                <textarea
                  required
                  rows={4}
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#263B35] dark:text-slate-300">
                  ড্রাইভ / ফাইল লিংক (ঐচ্ছিক)
                </label>
                <input
                  value={submissionLink}
                  onChange={(e) => setSubmissionLink(e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveResource(null)}
                className="rounded-xl border border-[#CFE0D6] bg-white px-4 py-2 text-xs font-bold text-[#263B35] hover:bg-[#F2F8F5] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#087F5B] px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A]"
              >
                জমা দিন
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
