import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, Check, Download, FileSpreadsheet, Save, Search } from 'lucide-react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { downloadAttendancePdf, exportToExcel } from '../../lib/reports';
import {
  ATTENDANCE_STATUS_BN,
  labelClass,
  labelSection,
  toBnDigits,
} from '../../i18n';
import { AdminModuleHeader, AdminPagination } from '../AdminPagination';
import { useUIFeedback } from '../ToastContext';
import {
  BD_CLASSES,
  BD_SECTIONS,
  type AttendanceRecord,
  type StudentRecord,
  type UserAccount,
} from '../../types';

interface Props {
  currentUser: UserAccount;
}

const PAGE_SIZE = 15;

export const AttendanceModule: React.FC<Props> = ({ currentUser }) => {
  const { notify } = useUIFeedback();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedClass, setSelectedClass] = useState<string>('Class 6');
  const [selectedSection, setSelectedSection] = useState<string>('Padma');
  const [draftStatus, setDraftStatus] = useState<Record<string, AttendanceRecord['status']>>({});
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const canMark = currentUser.role === 'admin' || currentUser.role === 'teacher';

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    if (canMark) {
      unsubs.push(
        onSnapshot(
          collection(db, 'students'),
          (s) => setStudents(s.docs.map((d) => ({ id: d.id, ...d.data() } as StudentRecord))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'students')
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'attendance'),
          (s) =>
            setRecords(
              s.docs
                .map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord))
                .sort((a, b) => b.date.localeCompare(a.date))
            ),
          (e) => handleFirestoreError(e, OperationType.LIST, 'attendance')
        )
      );
    } else {
      const uidField = currentUser.role === 'student' ? 'studentUid' : 'parentUid';
      unsubs.push(
        onSnapshot(
          query(collection(db, 'attendance'), where(uidField, '==', currentUser.uid)),
          (s) =>
            setRecords(
              s.docs
                .map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord))
                .sort((a, b) => b.date.localeCompare(a.date))
            ),
          (e) => handleFirestoreError(e, OperationType.LIST, 'attendance')
        )
      );
    }
    return () => unsubs.forEach((u) => u());
  }, [canMark, currentUser.role, currentUser.uid]);

  const classStudents = useMemo(
    () =>
      students
        .filter((s) => s.className === selectedClass && s.section === selectedSection && s.status === 'Active')
        .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber)),
    [students, selectedClass, selectedSection]
  );

  const existingByStudent = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    records
      .filter((r) => r.date === selectedDate && r.className === selectedClass && r.section === selectedSection)
      .forEach((r) => map.set(r.studentId, r));
    return map;
  }, [records, selectedDate, selectedClass, selectedSection]);

  const getStatusFor = (stuId: string): AttendanceRecord['status'] => {
    return draftStatus[stuId] ?? existingByStudent.get(stuId)?.status ?? 'Present';
  };

  const handleSaveBatch = async () => {
    if (!canMark || classStudents.length === 0) return;
    setSaving(true);
    try {
      for (const stu of classStudents) {
        const status = getStatusFor(stu.id);
        const existing = existingByStudent.get(stu.id);
        if (existing) {
          await updateDoc(doc(db, 'attendance', existing.id), {
            status,
            remarks: '',
            markedByUid: currentUser.uid,
            updatedAt: serverTimestamp(),
          });
        } else {
          const docId = `att_${selectedDate.replace(/-/g, '')}_${stu.id}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
          await setDoc(doc(db, 'attendance', docId), {
            date: selectedDate,
            className: stu.className,
            section: stu.section,
            studentId: stu.id,
            studentName: stu.name,
            rollNumber: stu.rollNumber,
            status,
            remarks: '',
            markedByUid: currentUser.uid,
            ...(stu.studentUid ? { studentUid: stu.studentUid } : {}),
            ...(stu.parentUid ? { parentUid: stu.parentUid } : {}),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      setDraftStatus({});
      notify(
        `${labelClass(selectedClass)} (${labelSection(selectedSection)}) — ${toBnDigits(selectedDate)} তারিখের হাজিরা সফলভাবে সংরক্ষিত হয়েছে।`,
        'success'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'attendance');
      notify('হাজিরা সংরক্ষণ ব্যর্থ হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.rollNumber.toLowerCase().includes(q) ||
        r.date.includes(q) ||
        labelClass(r.className).toLowerCase().includes(q)
    );
  }, [records, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, page]);

  const presentCount = records.filter((r) => r.status === 'Present' || r.status === 'Late').length;
  const attendancePct = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <AdminModuleHeader
        title="উপস্থিতি ব্যবস্থাপনা"
        subtitle={`মোট রেকর্ড: ${toBnDigits(records.length)}টি · সামগ্রিক উপস্থিতির হার: ${toBnDigits(attendancePct)}%`}
        icon={<CalendarCheck2 className="h-5 w-5" />}
        accent="emerald"
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                downloadAttendancePdf(records, `Date: ${selectedDate} | Total: ${records.length}`);
                notify('উপস্থিতির পিডিএফ রিপোর্ট ডাউনলোড হয়েছে।', 'info');
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
                  records.map((r) => ({
                    Date: r.date,
                    Class: r.className,
                    Section: r.section,
                    Roll: r.rollNumber,
                    Student: r.studentName,
                    Status: r.status,
                  })),
                  'Attendance',
                  'Attendance_Register.xlsx'
                );
                notify('উপস্থিতির এক্সেল শিট ডাউনলোড হয়েছে।', 'info');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-xs font-bold text-[#087F5B] transition hover:bg-[#F2F8F5] dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-300 dark:hover:bg-slate-700"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              এক্সেল
            </button>
          </>
        }
      />

      {canMark && (
        <div className="rounded-2xl border border-[#DCE8E1] bg-white p-3.5 shadow-2xs sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex flex-col gap-3 border-b border-[#E6F0EA] pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between dark:border-slate-800">
            <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">তারিখ</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setDraftStatus({});
                  }}
                  className="min-h-[42px] w-full rounded-xl border border-[#CFE0D6] bg-white px-3 py-2 text-xs font-bold text-[#123B67] sm:min-h-0 sm:w-auto dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">শ্রেণি</label>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setDraftStatus({});
                  }}
                  className="min-h-[42px] w-full rounded-xl border border-[#CFE0D6] bg-white px-3 py-2 text-xs font-bold text-[#123B67] sm:min-h-0 sm:w-auto dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {BD_CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {labelClass(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#263B35] dark:text-slate-300">শাখা</label>
                <select
                  value={selectedSection}
                  onChange={(e) => {
                    setSelectedSection(e.target.value);
                    setDraftStatus({});
                  }}
                  className="min-h-[42px] w-full rounded-xl border border-[#CFE0D6] bg-white px-3 py-2 text-xs font-bold text-[#123B67] sm:min-h-0 sm:w-auto dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {BD_SECTIONS.map((s) => (
                    <option key={s} value={s}>
                      {labelSection(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={saving || classStudents.length === 0}
              onClick={handleSaveBatch}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#087F5B] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-50 sm:min-h-0 sm:w-auto"
            >
              <Save className="h-4 w-4" />
              {saving ? 'সংরক্ষণ হচ্ছে...' : 'হাজিরা সংরক্ষণ করুন'}
            </button>
          </div>

          {classStudents.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#CBE0D4] py-10 text-center text-xs text-[#587064] dark:border-slate-700 dark:text-slate-400">
              নির্বাচিত শ্রেণি ও শাখায় কোনো সক্রিয় শিক্ষার্থী নেই।
            </p>
          ) : (
            <div className="divide-y divide-[#EAF2ED] overflow-hidden rounded-xl border border-[#E2EDE7] dark:divide-slate-800 dark:border-slate-800">
              {classStudents.map((stu) => {
                const current = getStatusFor(stu.id);
                return (
                  <div
                    key={stu.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-[#F2F8F5]/60 dark:hover:bg-slate-800/50"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#123B67] tabular-nums dark:text-white">
                        রোল {toBnDigits(stu.rollNumber)} — {stu.name}
                      </p>
                      <p className="text-[11px] text-[#526B78] dark:text-slate-400">আইডি: {stu.studentIdCode}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(['Present', 'Absent', 'Late', 'Leave'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setDraftStatus((prev) => ({ ...prev, [stu.id]: st }))}
                          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                            current === st
                              ? st === 'Absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : st === 'Late'
                                ? 'bg-[#F4A62A] text-white shadow-xs'
                                : st === 'Leave'
                                ? 'bg-[#21A9D6] text-white shadow-xs'
                                : 'bg-[#087F5B] text-white shadow-xs'
                              : 'bg-[#F2F8F5] text-[#263B35] hover:bg-[#E1F2E8] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                          }`}
                        >
                          {current === st && <Check className="h-3 w-3" />}
                          {ATTENDANCE_STATUS_BN[st]}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Search History */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-[#DCE8E1] bg-white p-3.5 shadow-2xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#647B86] dark:text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="শিক্ষার্থীর নাম, রোল, শ্রেণি বা তারিখ খুঁজুন..."
            className="w-full rounded-xl border border-[#CFE0D6] bg-[#F8FBF9] py-2 pr-3 pl-10 text-xs text-[#263B35] outline-none focus:border-[#087F5B] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <span className="self-start rounded-xl bg-[#087F5B]/10 px-3 py-2 text-xs font-bold text-[#087F5B] tabular-nums sm:self-auto dark:bg-emerald-500/20 dark:text-emerald-300">
          মোট ইতিহাস: {toBnDigits(filteredRecords.length)}টি
        </span>
      </div>

      {/* Attendance History Mobile Cards (< md) + Desktop Table (md+) */}
      <div className="overflow-hidden rounded-2xl border border-[#DCE8E1] bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="divide-y divide-[#EAF2ED] md:hidden dark:divide-slate-800">
          {paginatedRecords.length === 0 ? (
            <p className="px-4 py-10 text-center text-xs text-[#587064] dark:text-slate-400">
              কোনো উপস্থিতির রেকর্ড পাওয়া যায়নি।
            </p>
          ) : (
            paginatedRecords.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2.5 p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-[#123B67] dark:text-white">
                    {r.studentName}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#526B78] tabular-nums dark:text-slate-400">
                    {labelClass(r.className)} ({labelSection(r.section)}) · রোল {toBnDigits(r.rollNumber)}
                  </p>
                  <p className="mt-0.5 text-[10.5px] font-bold text-[#087F5B] tabular-nums dark:text-emerald-400">
                    তারিখ: {toBnDigits(r.date)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                    r.status === 'Present'
                      ? 'bg-[#087F5B]/12 text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300'
                      : r.status === 'Absent'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                      : r.status === 'Leave'
                      ? 'bg-[#21A9D6]/15 text-[#0E7DA3] dark:bg-cyan-500/20 dark:text-cyan-300'
                      : 'bg-[#F4A62A]/20 text-[#9A5B00] dark:bg-amber-500/20 dark:text-amber-300'
                  }`}
                >
                  {ATTENDANCE_STATUS_BN[r.status] || r.status}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#123B67] text-white dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 font-bold">তারিখ</th>
                <th className="px-4 py-3 font-bold">শিক্ষার্থী</th>
                <th className="px-4 py-3 font-bold">শ্রেণি ও শাখা</th>
                <th className="px-4 py-3 font-bold">রোল</th>
                <th className="px-4 py-3 font-bold">অবস্থা</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF2ED] dark:divide-slate-800">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#587064] dark:text-slate-400">
                    কোনো উপস্থিতির রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => (
                  <tr key={r.id} className="transition hover:bg-[#F2F8F5]/70 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-bold text-[#123B67] tabular-nums dark:text-slate-200">
                      {toBnDigits(r.date)}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#123B67] dark:text-white">{r.studentName}</td>
                    <td className="px-4 py-3 text-[#4B6370] dark:text-slate-300">
                      {labelClass(r.className)} ({labelSection(r.section)})
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#4B6370] tabular-nums dark:text-slate-300">
                      {toBnDigits(r.rollNumber)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${
                          r.status === 'Present'
                            ? 'bg-[#087F5B]/12 text-[#087F5B] dark:bg-emerald-500/20 dark:text-emerald-300'
                            : r.status === 'Absent'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                            : r.status === 'Leave'
                            ? 'bg-[#21A9D6]/15 text-[#0E7DA3] dark:bg-cyan-500/20 dark:text-cyan-300'
                            : 'bg-[#F4A62A]/20 text-[#9A5B00] dark:bg-amber-500/20 dark:text-amber-300'
                        }`}
                      >
                        {ATTENDANCE_STATUS_BN[r.status] || r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          totalItems={filteredRecords.length}
          pageSize={PAGE_SIZE}
          currentPage={page}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};
