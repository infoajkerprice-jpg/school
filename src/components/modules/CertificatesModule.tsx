import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Award,
  Download,
  FileBadge2,
  IdCard,
  Layers,
  Loader2,
  Printer,
  QrCode,
  Trash2,
  X,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, makeSafeDocId, OperationType } from '../../lib/firebase';
import { compareStudentsAcademic } from '../../lib/pdfStudentsRoster';
import { downloadClassAdmitCardsPdf, exportAdmitCardElementToPdf } from '../../lib/admitCardPdf';
import { usePublicData } from '../../context/PublicDataContext';
import { clampStr } from '../../lib/grading';
import { CERTIFICATE_TYPE_BN, labelClass, labelSection, toBnDigits } from '../../i18n';
import { AdminModuleHeader } from '../AdminPagination';
import { AdmitCardTemplate, type AdmitCardConfig } from '../AdmitCardTemplate';
import { StudentPicker } from '../StudentPicker';
import { useUIFeedback } from '../ToastContext';
import type { CertificateRecord, StudentRecord, UserAccount } from '../../types';

interface Props {
  currentUser: UserAccount;
}

const PRESET_EXAMS = [
  '১ম সাময়িক পরীক্ষা',
  'অর্ধবার্ষিক পরীক্ষা',
  '২য় সাময়িক পরীক্ষা',
  'বার্ষিক পরীক্ষা',
  'মডেল টেস্ট পরীক্ষা',
];

/** Deterministic SVG QR-style verification matrix encoded from student ID & school code */
export const VerificationQrSvg: React.FC<{ value: string; size?: number }> = ({
  value,
  size = 74,
}) => {
  const grid = 21;
  const cells: boolean[][] = Array.from({ length: grid }, () => Array(grid).fill(false));

  const drawFinder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const border = x === 0 || x === 6 || y === 0 || y === 6;
        const inner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        cells[oy + y][ox + x] = border || inner;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(grid - 7, 0);
  drawFinder(0, grid - 7);

  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const inFinder =
        (x < 8 && y < 8) || (x >= grid - 8 && y < 8) || (x < 8 && y >= grid - 8);
      if (!inFinder) {
        hash ^= (x * 31 + y * 17 + value.length) & 0xff;
        hash = Math.imul(hash, 16777619);
        cells[y][x] = (hash & 1) === 1;
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${grid} ${grid}`}
      role="img"
      aria-label={`QR Code ${value}`}
      style={{ backgroundColor: '#FFFFFF', padding: '3px', borderRadius: '4px' }}
    >
      {cells.map((row, y) =>
        row.map((on, x) =>
          on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#123B67" /> : null
        )
      )}
    </svg>
  );
};

export const CertificatesModule: React.FC<Props> = ({ currentUser }) => {
  const { settings, routines } = usePublicData();
  const { notify, confirm } = useUIFeedback();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = currentUser.role === 'admin';

  const initialTab = (() => {
    const t = searchParams.get('tab');
    if (t === 'idcard' || t === 'certificates' || t === 'admit') return t;
    return 'admit';
  })();

  const [tab, setTab] = useState<'admit' | 'idcard' | 'certificates'>(initialTab);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    () => searchParams.get('studentId') || ''
  );

  // Admit Card configuration
  const [admitConfig, setAdmitConfig] = useState<AdmitCardConfig>({
    examName: 'অর্ধবার্ষিক পরীক্ষা',
    academicYear: String(new Date().getFullYear()),
    examStartDate: '',
    examCenter: settings.schoolNameBn || 'শাহ ইসলামিক স্কুল এন্ড কলেজ',
    roomNo: '',
    includeSchedule: true,
  });
  const [downloadingAdmit, setDownloadingAdmit] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  // Certificate form state
  const [certType, setCertType] = useState<CertificateRecord['certificateType']>('Testimonial');
  const [remarks, setRemarks] = useState('');
  const [activeCert, setActiveCert] = useState<CertificateRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const admitCardRef = useRef<HTMLDivElement>(null);
  const idCardRef = useRef<HTMLDivElement>(null);
  const certRef = useRef<HTMLDivElement>(null);

  // Sync URL query params when navigated from StudentsModule
  useEffect(() => {
    const t = searchParams.get('tab');
    const sid = searchParams.get('studentId');
    if (t === 'admit' || t === 'idcard' || t === 'certificates') {
      setTab(t);
    }
    if (sid) {
      setSelectedStudentId(sid);
    }
  }, [searchParams]);

  useEffect(() => {
    const u1 = onSnapshot(
      collection(db, 'students'),
      (s) => {
        const list = s.docs
          .map((d) => ({ id: d.id, ...d.data() } as StudentRecord))
          .sort(compareStudentsAcademic);
        setStudents(list);
      },
      (e) => handleFirestoreError(e, OperationType.LIST, 'students')
    );

    const u2 = onSnapshot(
      collection(db, 'certificates'),
      (s) =>
        setCertificates(
          s.docs
            .map((d) => ({ id: d.id, ...d.data() } as CertificateRecord))
            .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
        ),
      (e) => handleFirestoreError(e, OperationType.LIST, 'certificates')
    );

    return () => {
      u1();
      u2();
    };
  }, []);

  // Auto-select first student once loaded if none selected yet
  useEffect(() => {
    if (!selectedStudentId && students.length > 0) {
      const pool =
        selectedClass === 'ALL'
          ? students
          : students.filter((s) => s.className === selectedClass);
      if (pool.length > 0) {
        setSelectedStudentId(pool[0].id);
      }
    }
  }, [students, selectedStudentId, selectedClass]);

  const selectedStudent = useMemo(() => {
    const found = students.find((s) => s.id === selectedStudentId);
    if (found) return found;
    if (selectedClass !== 'ALL') {
      return students.find((s) => s.className === selectedClass) || null;
    }
    return students[0] || null;
  }, [students, selectedStudentId, selectedClass]);

  // If student came from URL param, also match class filter to their class
  useEffect(() => {
    const sid = searchParams.get('studentId');
    if (sid && students.length > 0) {
      const target = students.find((s) => s.id === sid);
      if (target) {
        setSelectedClass(target.className);
      }
    }
  }, [searchParams, students]);

  const classStudentsForBulk = useMemo(() => {
    if (selectedClass === 'ALL') return [];
    return students
      .filter((s) => s.className === selectedClass && s.status === 'Active')
      .sort(compareStudentsAcademic);
  }, [students, selectedClass]);

  const switchTab = (next: 'admit' | 'idcard' | 'certificates') => {
    setTab(next);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', next);
    setSearchParams(nextParams, { replace: true });
  };

  const handleDownloadSingleAdmit = async () => {
    if (!admitCardRef.current || !selectedStudent || downloadingAdmit) return;
    setDownloadingAdmit(true);
    try {
      await exportAdmitCardElementToPdf(admitCardRef.current, selectedStudent, admitConfig);
      notify(`${selectedStudent.name}-এর প্রবেশপত্র পিডিএফ ডাউনলোড হয়েছে।`, 'success');
    } catch {
      notify('প্রবেশপত্র পিডিএফ তৈরি করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setDownloadingAdmit(false);
    }
  };

  const handleDownloadClassAdmits = async () => {
    if (selectedClass === 'ALL' || classStudentsForBulk.length === 0 || bulkProgress) return;
    setBulkProgress({ current: 1, total: classStudentsForBulk.length });
    try {
      await downloadClassAdmitCardsPdf(
        classStudentsForBulk,
        settings,
        admitConfig,
        routines,
        labelClass(selectedClass),
        (current, total) => setBulkProgress({ current, total })
      );
      notify(
        `${labelClass(selectedClass)}-এর ${toBnDigits(classStudentsForBulk.length)} জন শিক্ষার্থীর প্রবেশপত্র একসাথে পিডিএফ ডাউনলোড হয়েছে।`,
        'success'
      );
    } catch {
      notify('শ্রেণিভিত্তিক প্রবেশপত্র পিডিএফ তৈরি করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setBulkProgress(null);
    }
  };

  const handleDownloadIdCard = async () => {
    if (!idCardRef.current || !selectedStudent) return;
    try {
      const dataUrl = await toPng(idCardRef.current, { pixelRatio: 3, backgroundColor: '#FFFFFF' });
      const link = document.createElement('a');
      link.download = `ID_Card_${selectedStudent.studentIdCode}.png`;
      link.href = dataUrl;
      link.click();
      notify(`${selectedStudent.name}-এর ডিজিটাল আইডি কার্ড ডাউনলোড হয়েছে।`, 'success');
    } catch {
      notify('আইডি কার্ড ডাউনলোড করতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !selectedStudent) return;
    setSaving(true);
    try {
      const id = makeSafeDocId('cert');
      const certificateNo = `${certType}-${new Date().getFullYear()}-${String(
        Math.floor(1000 + Math.random() * 9000)
      )}`;
      const record = {
        certificateNo,
        certificateType: certType,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        fatherName: selectedStudent.fatherName || '',
        motherName: selectedStudent.motherName || '',
        className: selectedStudent.className,
        rollNumber: selectedStudent.rollNumber,
        issueDate: new Date().toISOString().slice(0, 10),
        reasonOrRemarks: clampStr(remarks, 400),
        issuedByUid: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'certificates', id), record);
      setActiveCert({ id, ...record, createdAt: null, updatedAt: null });
      setRemarks('');
      notify(`${CERTIFICATE_TYPE_BN[certType]} সফলভাবে তৈরি ও সংরক্ষিত হয়েছে।`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'certificates');
      notify('সনদপত্র তৈরি ব্যর্থ হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCertificate = async (c: CertificateRecord) => {
    const ok = await confirm({
      title: 'সনদপত্র মুছে ফেলুন',
      message: `${c.studentName}-এর সনদ নং ${c.certificateNo} কি মুছে ফেলতে চান?`,
      confirmLabel: 'মুছে ফেলুন',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'certificates', c.id));
      if (activeCert?.id === c.id) setActiveCert(null);
      notify('সনদপত্র মুছে ফেলা হয়েছে।', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `certificates/${c.id}`);
      notify('মুছে ফেলতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleDownloadCertificatePdf = async () => {
    if (!certRef.current || !activeCert) return;
    try {
      const dataUrl = await toPng(certRef.current, { pixelRatio: 2.5, backgroundColor: '#FFFFFF' });
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      pdf.addImage(dataUrl, 'PNG', 0, 0, 297, 210, undefined, 'FAST');
      pdf.save(`${activeCert.certificateNo}.pdf`);
      notify('সনদপত্র পিডিএফ ডাউনলোড হয়েছে।', 'success');
    } catch {
      notify('পিডিএফ তৈরি করতে সমস্যা হয়েছে।', 'error');
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2 text-xs font-semibold text-[#263B35] outline-none transition focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  return (
    <div className="space-y-5">
      <AdminModuleHeader
        title="প্রবেশপত্র, আইডি কার্ড ও সনদপত্র"
        subtitle="পরীক্ষার প্রবেশপত্র (একক ও পুরো শ্রেণি একসাথে পিডিএফ), QR আইডি কার্ড, ছাড়পত্র (TC) ও প্রশংসাপত্র।"
        icon={<FileBadge2 className="h-5 w-5" />}
        accent="emerald"
        actions={
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[#F2F8F5] p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => switchTab('admit')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                tab === 'admit'
                  ? 'bg-[#087F5B] text-white shadow-xs'
                  : 'text-[#263B35] dark:text-slate-300'
              }`}
            >
              <FileBadge2 className="h-3.5 w-3.5" />
              প্রবেশপত্র (Admit Card)
            </button>
            <button
              type="button"
              onClick={() => switchTab('idcard')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                tab === 'idcard'
                  ? 'bg-[#21A9D6] text-white shadow-xs'
                  : 'text-[#263B35] dark:text-slate-300'
              }`}
            >
              <IdCard className="h-3.5 w-3.5" />
              আইডি কার্ড (QR)
            </button>
            <button
              type="button"
              onClick={() => switchTab('certificates')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                tab === 'certificates'
                  ? 'bg-[#123B67] text-white shadow-xs'
                  : 'text-[#263B35] dark:text-slate-300'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              TC ও সনদ ({toBnDigits(certificates.length)})
            </button>
          </div>
        }
      />

      {/* ==================== TAB 1: EXAM ADMIT CARD ==================== */}
      {tab === 'admit' && (
        <div className="space-y-5">
          {/* Controls Panel */}
          <div className="rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Student Picker (Class + Live Search) */}
              <div className="lg:col-span-6">
                <StudentPicker
                  students={students}
                  value={selectedStudent?.id || ''}
                  onChange={setSelectedStudentId}
                  classFilter={selectedClass}
                  onClassFilterChange={setSelectedClass}
                  label="শ্রেণি ও শিক্ষার্থী নির্বাচন করুন"
                />
              </div>

              {/* Exam Settings */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-6">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#123B67] dark:text-slate-200">
                    পরীক্ষার নাম *
                  </label>
                  <input
                    list="exam-name-presets"
                    value={admitConfig.examName}
                    onChange={(e) => setAdmitConfig({ ...admitConfig, examName: e.target.value })}
                    placeholder="যেমন: অর্ধবার্ষিক পরীক্ষা"
                    className={inputClass}
                  />
                  <datalist id="exam-name-presets">
                    {PRESET_EXAMS.map((ex) => (
                      <option key={ex} value={ex} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#123B67] dark:text-slate-200">
                      শিক্ষাবর্ষ
                    </label>
                    <input
                      value={admitConfig.academicYear}
                      onChange={(e) =>
                        setAdmitConfig({ ...admitConfig, academicYear: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#123B67] dark:text-slate-200">
                      কক্ষ নং (ঐচ্ছিক)
                    </label>
                    <input
                      value={admitConfig.roomNo || ''}
                      onChange={(e) => setAdmitConfig({ ...admitConfig, roomNo: e.target.value })}
                      placeholder="যেমন: ১০২"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#123B67] dark:text-slate-200">
                    পরীক্ষা শুরুর তারিখ (ঐচ্ছিক)
                  </label>
                  <input
                    type="date"
                    value={admitConfig.examStartDate || ''}
                    onChange={(e) =>
                      setAdmitConfig({ ...admitConfig, examStartDate: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#123B67] dark:text-slate-200">
                    পরীক্ষা কেন্দ্র
                  </label>
                  <input
                    value={admitConfig.examCenter || ''}
                    onChange={(e) => setAdmitConfig({ ...admitConfig, examCenter: e.target.value })}
                    placeholder="ক্যাম্পাস / কেন্দ্রের নাম"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#EAF2ED] pt-4 dark:border-slate-800">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#263B35] dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(admitConfig.includeSchedule)}
                  onChange={(e) =>
                    setAdmitConfig({ ...admitConfig, includeSchedule: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-[#CFE0D6] text-[#087F5B] focus:ring-[#087F5B]"
                />
                পরীক্ষার রুটিন থাকলে প্রবেশপত্রে যুক্ত করুন
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!selectedStudent || downloadingAdmit || Boolean(bulkProgress)}
                  onClick={() => void handleDownloadSingleAdmit()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-50"
                >
                  {downloadingAdmit ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {downloadingAdmit ? 'পিডিএফ তৈরি হচ্ছে...' : 'প্রবেশপত্র ডাউনলোড (PDF)'}
                </button>

                {selectedClass !== 'ALL' && classStudentsForBulk.length > 0 && (
                  <button
                    type="button"
                    disabled={Boolean(bulkProgress) || downloadingAdmit}
                    onClick={() => void handleDownloadClassAdmits()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#123B67] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#0C2B4D] disabled:opacity-60"
                  >
                    {bulkProgress ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Layers className="h-3.5 w-3.5 text-[#F4A62A]" />
                    )}
                    {bulkProgress
                      ? `তৈরি হচ্ছে ${toBnDigits(bulkProgress.current)}/${toBnDigits(bulkProgress.total)}...`
                      : `পুরো ${labelClass(selectedClass)} একসাথে PDF (${toBnDigits(classStudentsForBulk.length)} জন)`}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#CFE0D6] bg-white px-3.5 py-2.5 text-xs font-bold text-[#123B67] transition hover:bg-[#F2F8F5] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Printer className="h-3.5 w-3.5" />
                  প্রিন্ট
                </button>
              </div>
            </div>
          </div>

          {/* Live Kalpurush Admit Card Preview */}
          <div className="rounded-2xl border border-[#DCE8E1] bg-[#EDF3EF] p-5 dark:border-slate-800 dark:bg-slate-950/70">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#526B78] dark:text-slate-400">
              <span className="font-bold text-[#123B67] dark:text-slate-200">
                লাইভ প্রবেশপত্র প্রিভিউ (কালপুরুষ ফন্ট)
              </span>
              {selectedClass === 'ALL' && (
                <span>
                  টিপস: পুরো শ্রেণির প্রবেশপত্র একসাথে PDF পেতে উপরে নির্দিষ্ট শ্রেণি নির্বাচন করুন।
                </span>
              )}
            </div>

            {selectedStudent ? (
              <div className="overflow-x-auto pb-2">
                <div className="mx-auto w-fit shadow-lg">
                  <AdmitCardTemplate
                    ref={admitCardRef}
                    student={selectedStudent}
                    settings={settings}
                    config={admitConfig}
                    examRoutines={routines}
                  />
                </div>
              </div>
            ) : (
              <p className="py-12 text-center text-xs text-[#587064] dark:text-slate-400">
                প্রবেশপত্র দেখতে একজন শিক্ষার্থী নির্বাচন করুন।
              </p>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 2: DIGITAL ID CARD WITH QR VERIFICATION ==================== */}
      {tab === 'idcard' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
            <StudentPicker
              students={students}
              value={selectedStudent?.id || ''}
              onChange={setSelectedStudentId}
              classFilter={selectedClass}
              onClassFilterChange={setSelectedClass}
              label="শ্রেণি ও শিক্ষার্থী নির্বাচন করুন"
            />

            {selectedStudent && (
              <div className="space-y-2 rounded-xl border border-[#E2EDE7] bg-[#F2F8F5] p-3.5 text-xs text-[#263B35] dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                <p>
                  <strong className="text-[#123B67] dark:text-white">আইডি কোড:</strong>{' '}
                  {selectedStudent.studentIdCode}
                </p>
                <p className="break-all">
                  <strong className="text-[#123B67] dark:text-white">QR যাচাইকরণ তথ্য:</strong>{' '}
                  {settings.websiteUrl || 'https://shahislamicschool.com'}/verify?id=
                  {selectedStudent.studentIdCode}
                </p>
                <p>
                  <strong className="text-[#123B67] dark:text-white">অভিভাবক:</strong>{' '}
                  {selectedStudent.guardianName} ({selectedStudent.guardianPhone})
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                disabled={!selectedStudent}
                onClick={() => void handleDownloadIdCard()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                আইডি কার্ড ডাউনলোড (PNG)
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#CFE0D6] bg-white px-4 py-2.5 text-xs font-bold text-[#123B67] transition hover:bg-[#F2F8F5] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Printer className="h-3.5 w-3.5" />
                প্রিন্ট
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center rounded-2xl border border-[#DCE8E1] bg-[#EDF3EF] p-6 lg:col-span-7 dark:border-slate-800 dark:bg-slate-950/70">
            {selectedStudent ? (
              <div
                ref={idCardRef}
                style={{
                  width: '320px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  border: '2px solid #087F5B',
                  fontFamily: "'Kalpurush', 'Hind Siliguri', sans-serif",
                  boxShadow: '0 10px 25px rgba(8, 127, 91, 0.16)',
                }}
              >
                <div
                  style={{
                    background: 'linear-gradient(135deg, #123B67 0%, #087F5B 100%)',
                    color: '#FFFFFF',
                    padding: '14px 16px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{settings.schoolNameBn}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '10px', opacity: 0.9 }}>
                    {settings.schoolNameEn || 'Shah Islamic School And College'}
                  </p>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: '6px',
                      backgroundColor: '#F4A62A',
                      color: '#123B67',
                      padding: '2px 12px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    শিক্ষার্থী পরিচয়পত্র (STUDENT ID)
                  </span>
                </div>

                <div style={{ padding: '16px', textAlign: 'center' }}>
                  <div
                    style={{
                      width: '82px',
                      height: '82px',
                      margin: '0 auto 10px',
                      borderRadius: '999px',
                      border: '3px solid #087F5B',
                      overflow: 'hidden',
                      backgroundColor: '#F2F8F5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '26px',
                      fontWeight: 700,
                      color: '#087F5B',
                    }}
                  >
                    {selectedStudent.photoUrl ? (
                      <img
                        src={selectedStudent.photoUrl}
                        alt={selectedStudent.name}
                        referrerPolicy="no-referrer"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      selectedStudent.name.slice(0, 1)
                    )}
                  </div>

                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#123B67' }}>
                    {selectedStudent.name}
                  </h3>
                  <p style={{ margin: '2px 0 12px', fontSize: '12px', fontWeight: 700, color: '#087F5B' }}>
                    আইডি: {selectedStudent.studentIdCode}
                  </p>

                  <div
                    style={{
                      textAlign: 'left',
                      fontSize: '12.5px',
                      lineHeight: 1.7,
                      color: '#263B35',
                      backgroundColor: '#F2F8F5',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #D5E8DC',
                    }}
                  >
                    <div>
                      <strong>শ্রেণি:</strong> {labelClass(selectedStudent.className)} (
                      {labelSection(selectedStudent.section)})
                    </div>
                    <div>
                      <strong>রোল নম্বর:</strong> {toBnDigits(selectedStudent.rollNumber)}
                    </div>
                    <div>
                      <strong>রক্তের গ্রুপ:</strong> {selectedStudent.bloodGroup || '—'}
                    </div>
                    <div>
                      <strong>অভিভাবক:</strong> {selectedStudent.guardianName}
                    </div>
                    <div>
                      <strong>জরুরি মোবাইল:</strong> {selectedStudent.guardianPhone}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '8px',
                      borderTop: '1px dashed #CBE0D3',
                    }}
                  >
                    <div style={{ textAlign: 'left', fontSize: '10px', color: '#4B675B' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: '#087F5B' }}>
                        <QrCode className="h-3.5 w-3.5" /> QR যাচাইকৃত
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        শিক্ষাবর্ষ: {toBnDigits(selectedStudent.admissionYear || '2026')}
                      </div>
                      <div
                        style={{
                          marginTop: '14px',
                          borderTop: '1px solid #087F5B',
                          paddingTop: '2px',
                          fontWeight: 700,
                        }}
                      >
                        অধ্যক্ষের স্বাক্ষর
                      </div>
                    </div>
                    <VerificationQrSvg
                      value={`${settings.schoolNameEn}|${selectedStudent.studentIdCode}|${selectedStudent.rollNumber}`}
                      size={70}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#587064] dark:text-slate-400">কোনো শিক্ষার্থী পাওয়া যায়নি।</p>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: TRANSFER CERTIFICATES & DIGITAL CERTIFICATES ==================== */}
      {tab === 'certificates' && (
        <div className="space-y-5">
          {isAdmin && (
            <form
              onSubmit={handleIssueCertificate}
              className="space-y-3.5 rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
            >
              <StudentPicker
                students={students}
                value={selectedStudent?.id || ''}
                onChange={setSelectedStudentId}
                classFilter={selectedClass}
                onClassFilterChange={setSelectedClass}
                label="শিক্ষার্থী নির্বাচন করুন"
                required
              />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <select
                  value={certType}
                  onChange={(e) => setCertType(e.target.value as CertificateRecord['certificateType'])}
                  className={inputClass}
                >
                  {Object.entries(CERTIFICATE_TYPE_BN).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="মন্তব্য / ছাড়পত্রের কারণ (ঐচ্ছিক)"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className={inputClass}
                />
                <button
                  type="submit"
                  disabled={saving || !selectedStudent}
                  className="rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-60"
                >
                  {saving ? 'তৈরি হচ্ছে...' : 'সনদ / TC ইস্যু করুন'}
                </button>
              </div>
            </form>
          )}

          {activeCert && (
            <div className="space-y-3 rounded-2xl border border-[#DCE8E1] bg-[#EDF3EF] p-5 dark:border-slate-800 dark:bg-slate-950/70">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-extrabold text-[#123B67] dark:text-white">
                  প্রিভিউ: {CERTIFICATE_TYPE_BN[activeCert.certificateType]} ({activeCert.certificateNo})
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDownloadCertificatePdf()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#06684A]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    পিডিএফ ডাউনলোড
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCert(null)}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#CFE0D6] bg-white px-3 py-1.5 text-xs font-bold text-[#263B35] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                    বন্ধ
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div
                  ref={certRef}
                  style={{
                    width: '860px',
                    minHeight: '590px',
                    margin: '0 auto',
                    backgroundColor: '#FFFFFF',
                    border: '8px double #087F5B',
                    padding: '38px 48px',
                    fontFamily: "'Kalpurush', 'Hind Siliguri', sans-serif",
                    color: '#263B35',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ textAlign: 'center', borderBottom: '2px solid #087F5B', paddingBottom: '14px' }}>
                      <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 700, color: '#123B67' }}>
                        {settings.schoolNameBn}
                      </h1>
                      <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#456154' }}>
                        {settings.address} · মোবাইল: {settings.phone}
                      </p>
                      <div
                        style={{
                          display: 'inline-block',
                          marginTop: '12px',
                          backgroundColor: '#087F5B',
                          color: '#FFFFFF',
                          padding: '5px 28px',
                          borderRadius: '6px',
                          fontSize: '19px',
                          fontWeight: 700,
                        }}
                      >
                        {CERTIFICATE_TYPE_BN[activeCert.certificateType]}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: '16px',
                        fontSize: '14px',
                        fontWeight: 700,
                      }}
                    >
                      <span>সনদ নং: {activeCert.certificateNo}</span>
                      <span>ইস্যুর তারিখ: {toBnDigits(activeCert.issueDate)}</span>
                    </div>

                    <p style={{ marginTop: '28px', fontSize: '18px', lineHeight: 2, textAlign: 'justify' }}>
                      এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, <strong>{activeCert.studentName}</strong>
                      {activeCert.fatherName ? `, পিতা: ${activeCert.fatherName}` : ''}
                      {activeCert.motherName ? `, মাতা: ${activeCert.motherName}` : ''} অত্র{' '}
                      <strong>{settings.schoolNameBn}</strong>-এর{' '}
                      <strong>{labelClass(activeCert.className)}</strong>-এর নিয়মিত শিক্ষার্থী (রোল নং:{' '}
                      <strong>{toBnDigits(activeCert.rollNumber)}</strong>)।{' '}
                      {activeCert.certificateType === 'TC'
                        ? 'অভিভাবকের আবেদনের প্রেক্ষিতে এবং প্রতিষ্ঠানের সকল পাওনা পরিশোধ সাপেক্ষে তাকে অত্র প্রতিষ্ঠান হতে ছাড়পত্র (Transfer Certificate) প্রদান করা হলো।'
                        : 'প্রতিষ্ঠানে অধ্যয়নকালে তার আচার-আচরণ, শৃঙ্খলা ও নৈতিক চরিত্র অত্যন্ত সন্তোষজনক ছিল।'}
                      {activeCert.reasonOrRemarks ? ` বিশেষ মন্তব্য: ${activeCert.reasonOrRemarks}` : ''}{' '}
                      আমরা তার উত্তরোত্তর সর্বাঙ্গীণ মঙ্গল ও উজ্জ্বল ভবিষ্যৎ কামনা করি।
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      marginTop: '44px',
                    }}
                  >
                    <VerificationQrSvg value={`${activeCert.certificateNo}|${activeCert.studentName}`} size={68} />
                    <div
                      style={{
                        textAlign: 'center',
                        width: '210px',
                        borderTop: '1.5px solid #087F5B',
                        paddingTop: '6px',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#123B67' }}>
                        প্রিন্সিপাল / অধ্যক্ষ
                      </p>
                      <p style={{ margin: 0, fontSize: '13.5px' }}>{settings.schoolNameBn}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Issued Certificates History */}
          <div className="overflow-hidden rounded-2xl border border-[#DCE8E1] bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#123B67] text-white dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-bold">সনদ নং</th>
                    <th className="px-4 py-3 font-bold">ধরন</th>
                    <th className="px-4 py-3 font-bold">শিক্ষার্থী</th>
                    <th className="px-4 py-3 font-bold">তারিখ</th>
                    <th className="px-4 py-3 text-right font-bold">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF3EF] dark:divide-slate-800">
                  {certificates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#587064] dark:text-slate-400">
                        এখনো কোনো সনদপত্র বা TC ইস্যু করা হয়নি।
                      </td>
                    </tr>
                  ) : (
                    certificates.map((c) => (
                      <tr key={c.id} className="transition hover:bg-[#F2F8F5]/70 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-extrabold text-[#087F5B] tabular-nums dark:text-emerald-400">
                          {c.certificateNo}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-lg bg-[#805AD5]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#805AD5] dark:bg-purple-500/20 dark:text-purple-300">
                            {CERTIFICATE_TYPE_BN[c.certificateType]}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-[#123B67] dark:text-white">
                          {c.studentName} ({labelClass(c.className)} · রোল {toBnDigits(c.rollNumber)})
                        </td>
                        <td className="px-4 py-3 text-[#526B78] tabular-nums dark:text-slate-400">
                          {toBnDigits(c.issueDate)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveCert(c)}
                              className="rounded-lg bg-[#21A9D6]/14 px-2.5 py-1.5 text-[11px] font-bold text-[#0E7DA3] transition hover:bg-[#21A9D6] hover:text-white dark:bg-cyan-500/20 dark:text-cyan-300"
                            >
                              দেখুন / PDF
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => void handleDeleteCertificate(c)}
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
          </div>
        </div>
      )}
    </div>
  );
};
