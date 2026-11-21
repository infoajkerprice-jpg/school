import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Award,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileBadge2,
  IdCard,
  Image as ImageIcon,
  Layers,
  Loader2,
  Palette,
  Plus,
  Printer,
  RotateCcw,
  ShieldCheck,
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
import {
  downloadClassIdCardsPdf,
  downloadDualIdCardPng,
  downloadSingleIdCardPdf,
  downloadSingleIdCardSidePng,
} from '../../lib/idCardPdf';
import { getEnglishStudentSummary } from '../../lib/idCardEnglish';
import { usePublicData } from '../../context/PublicDataContext';
import { clampStr } from '../../lib/grading';
import { CERTIFICATE_TYPE_BN, labelClass, toBnDigits } from '../../i18n';
import { AdminModuleHeader } from '../AdminPagination';
import {
  AdmitCardBack,
  AdmitCardFront,
  type AdmitCardConfig,
  type AdmitScheduleRow,
} from '../AdmitCardTemplate';
import { CertificateTemplate } from '../CertificateTemplate';
import {
  ID_CARD_THEMES,
  StudentIdCardBack,
  StudentIdCardFront,
  type IdCardThemeId,
  type StudentIdCardConfig,
} from '../StudentIdCardTemplate';
import { StudentPicker } from '../StudentPicker';
import { ScannableQrCode } from '../ScannableQrCode';
import {
  buildStudentVerificationPath,
  buildStudentVerificationUrl,
  syncAllStudentVerifications,
} from '../../lib/studentVerification';
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

/** Real ISO/IEC 18004 scannable QR code wrapper for ID cards & digital certificates */
export const VerificationQrSvg: React.FC<{ value: string; size?: number }> = ({
  value,
  size = 76,
}) => (
  <ScannableQrCode
    value={value}
    size={size}
    level="M"
    quietZoneModules={2}
    fgColor="#000000"
    bgColor="#FFFFFF"
    style={{ borderRadius: '5px', border: '1px solid #CBE0D6' }}
  />
);

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
    includeBackPage: true,
    customSchedule: [],
  });
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [downloadingAdmit, setDownloadingAdmit] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  // Double-sided English Student ID Card Studio configuration
  const [idCardConfig, setIdCardConfig] = useState<StudentIdCardConfig>({
    themeId: 'emerald-royal',
    sessionLabel: String(new Date().getFullYear()),
    validThru: `Dec ${new Date().getFullYear()}`,
    authorityTitle: 'Principal',
    studentNameOverride: '',
    fatherNameOverride: '',
    divisionOverride: '',
    addressOverride: '',
  });
  const [showLanyardPreview, setShowLanyardPreview] = useState(true);
  const [downloadingIdCard, setDownloadingIdCard] = useState(false);
  const [bulkIdProgress, setBulkIdProgress] = useState<{ current: number; total: number } | null>(
    null
  );

  // Certificate form state
  const [certType, setCertType] = useState<CertificateRecord['certificateType']>('Testimonial');
  const [remarks, setRemarks] = useState('');
  const [activeCert, setActiveCert] = useState<CertificateRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const admitCardRef = useRef<HTMLDivElement>(null);
  const admitBackRef = useRef<HTMLDivElement>(null);
  const idCardFrontRef = useRef<HTMLDivElement>(null);
  const idCardBackRef = useRef<HTMLDivElement>(null);
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

  // Automatically keep public zero-PII `student_verifications` index synced in Firestore
  const hasSyncedVerificationsRef = useRef(false);
  useEffect(() => {
    if (!isAdmin || students.length === 0 || hasSyncedVerificationsRef.current) return;
    hasSyncedVerificationsRef.current = true;
    void syncAllStudentVerifications(students).catch(() => {
      hasSyncedVerificationsRef.current = false;
    });
  }, [isAdmin, students]);

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

  // Reset per-student manual English text overrides whenever another student is selected
  useEffect(() => {
    setIdCardConfig((prev) => ({
      ...prev,
      studentNameOverride: '',
      fatherNameOverride: '',
      divisionOverride: '',
    }));
  }, [selectedStudent?.id]);

  const switchTab = (next: 'admit' | 'idcard' | 'certificates') => {
    setTab(next);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', next);
    setSearchParams(nextParams, { replace: true });
  };

  const handleDownloadSingleAdmit = async (twoCopiesOnSheet = false) => {
    if (!admitCardRef.current || !selectedStudent || downloadingAdmit) return;
    setDownloadingAdmit(true);
    try {
      await exportAdmitCardElementToPdf(
        admitCardRef.current,
        selectedStudent,
        admitConfig,
        admitBackRef.current,
        twoCopiesOnSheet
      );
      notify(
        `${selectedStudent.name}-এর প্রবেশপত্র ${
          admitConfig.includeBackPage !== false ? '(সামনে + পিছনে সময়সূচিসহ A4 ডুপ্লেক্স)' : ''
        } পিডিএফ ডাউনলোড হয়েছে।`,
        'success'
      );
    } catch {
      notify('প্রবেশপত্র পিডিএফ তৈরি করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setDownloadingAdmit(false);
    }
  };

  const handleAddScheduleRow = () => {
    const nextRow: AdmitScheduleRow = {
      id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      date: '',
      day: '',
      time: 'সকাল ১০:০০ - ১২:০০',
      subject: '',
    };
    setAdmitConfig((prev) => ({
      ...prev,
      customSchedule: [...(prev.customSchedule || []), nextRow],
    }));
  };

  const handleLoadSampleSchedule = () => {
    const sample: AdmitScheduleRow[] = [
      { id: 's1', date: '১৫/০৬/২০২৬', day: 'সোমবার', time: 'সকাল ১০:০০ - ১২:০০', subject: 'বাংলা' },
      { id: 's2', date: '১৭/০৬/২০২৬', day: 'বুধবার', time: 'সকাল ১০:০০ - ১২:০০', subject: 'ইংরেজি' },
      { id: 's3', date: '১৯/০৬/২০২৬', day: 'শুক্রবার', time: 'সকাল ১০:০০ - ১২:০০', subject: 'গণিত' },
      { id: 's4', date: '২১/০৬/২০২৬', day: 'রবিবার', time: 'সকাল ১০:০০ - ১২:০০', subject: 'ইসলাম ও নৈতিক শিক্ষা' },
      { id: 's5', date: '২৩/০৬/২০২৬', day: 'মঙ্গলবার', time: 'সকাল ১০:০০ - ১২:০০', subject: 'আরবি / সাধারণ জ্ঞান' },
    ];
    setAdmitConfig((prev) => ({
      ...prev,
      includeSchedule: true,
      includeBackPage: true,
      customSchedule: sample,
    }));
  };

  const handleUpdateScheduleRow = (
    rowId: string,
    field: keyof Omit<AdmitScheduleRow, 'id'>,
    value: string
  ) => {
    setAdmitConfig((prev) => ({
      ...prev,
      customSchedule: (prev.customSchedule || []).map((r) =>
        r.id === rowId ? { ...r, [field]: value } : r
      ),
    }));
  };

  const handleRemoveScheduleRow = (rowId: string) => {
    setAdmitConfig((prev) => ({
      ...prev,
      customSchedule: (prev.customSchedule || []).filter((r) => r.id !== rowId),
    }));
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

  const handleDownloadIdCardPdf = async () => {
    if (!idCardFrontRef.current || !idCardBackRef.current || !selectedStudent || downloadingIdCard) {
      return;
    }
    setDownloadingIdCard(true);
    try {
      await downloadSingleIdCardPdf(idCardFrontRef.current, idCardBackRef.current, selectedStudent);
      notify(`${selectedStudent.name}-এর Front + Back CR80 আইডি কার্ড PDF ডাউনলোড হয়েছে।`, 'success');
    } catch {
      notify('আইডি কার্ড PDF তৈরি করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setDownloadingIdCard(false);
    }
  };

  const handleDownloadIdCardDualPng = async () => {
    if (!idCardFrontRef.current || !idCardBackRef.current || !selectedStudent || downloadingIdCard) {
      return;
    }
    setDownloadingIdCard(true);
    try {
      await downloadDualIdCardPng(idCardFrontRef.current, idCardBackRef.current, selectedStudent);
      notify(`${selectedStudent.name}-এর Front + Back HD PNG ডাউনলোড হয়েছে।`, 'success');
    } catch {
      notify('আইডি কার্ড PNG ডাউনলোড করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setDownloadingIdCard(false);
    }
  };

  const handleDownloadIdCardSide = async (side: 'Front' | 'Back') => {
    const targetEl = side === 'Front' ? idCardFrontRef.current : idCardBackRef.current;
    if (!targetEl || !selectedStudent || downloadingIdCard) return;
    setDownloadingIdCard(true);
    try {
      await downloadSingleIdCardSidePng(targetEl, selectedStudent, side);
      notify(
        `${selectedStudent.name}-এর আইডি কার্ড (${side === 'Front' ? 'সামনের দিক' : 'পিছনের দিক'}) PNG ডাউনলোড হয়েছে।`,
        'success'
      );
    } catch {
      notify('আইডি কার্ড ডাউনলোড করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setDownloadingIdCard(false);
    }
  };

  const handleDownloadClassIdCards = async () => {
    if (selectedClass === 'ALL' || classStudentsForBulk.length === 0 || bulkIdProgress) return;
    setBulkIdProgress({ current: 1, total: classStudentsForBulk.length });
    try {
      await downloadClassIdCardsPdf(
        classStudentsForBulk,
        settings,
        idCardConfig,
        selectedClass,
        (current, total) => setBulkIdProgress({ current, total })
      );
      notify(
        `${labelClass(selectedClass)}-এর ${toBnDigits(classStudentsForBulk.length)} জন শিক্ষার্থীর ডাবল-সাইডেড আইডি কার্ড PDF ডাউনলোড হয়েছে।`,
        'success'
      );
    } catch {
      notify('পুরো শ্রেণির আইডি কার্ড PDF তৈরি করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setBulkIdProgress(null);
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

  const previewCert: CertificateRecord | null = useMemo(() => {
    if (activeCert) return activeCert;
    if (!selectedStudent) return null;
    return {
      id: 'draft-preview',
      certificateNo: `${certType}-${new Date().getFullYear()}-${String(selectedStudent.rollNumber || '01').padStart(3, '0')}`,
      certificateType: certType,
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      fatherName: selectedStudent.fatherName || selectedStudent.guardianName || '',
      motherName: selectedStudent.motherName || '',
      className: selectedStudent.className,
      rollNumber: selectedStudent.rollNumber,
      issueDate: new Date().toISOString().slice(0, 10),
      reasonOrRemarks: remarks.trim(),
      issuedByUid: currentUser.uid,
    };
  }, [activeCert, selectedStudent, certType, remarks, currentUser.uid]);

  const previewCertStudent = useMemo(() => {
    if (!previewCert) return null;
    return students.find((s) => s.id === previewCert.studentId) || selectedStudent || null;
  }, [previewCert, students, selectedStudent]);

  const handleDownloadCertificatePdf = async () => {
    if (!certRef.current || !previewCert) return;
    try {
      if (typeof document !== 'undefined' && 'fonts' in document) {
        await document.fonts.ready;
      }
      const dataUrl = await toPng(certRef.current, {
        pixelRatio: 3,
        backgroundColor: '#C6A45F',
        cacheBust: true,
        width: certRef.current.offsetWidth || 960,
        height: certRef.current.offsetHeight || 678,
      });
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      pdf.addImage(dataUrl, 'PNG', 0, 0, 297, 210, undefined, 'FAST');
      pdf.save(`${previewCert.certificateNo}.pdf`);
      notify('সনদপত্র পিডিএফ ডাউনলোড হয়েছে।', 'success');
    } catch {
      notify('পিডিএফ তৈরি করতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleDownloadCertificatePng = async () => {
    if (!certRef.current || !previewCert) return;
    try {
      if (typeof document !== 'undefined' && 'fonts' in document) {
        await document.fonts.ready;
      }
      const dataUrl = await toPng(certRef.current, {
        pixelRatio: 3,
        backgroundColor: '#C6A45F',
        cacheBust: true,
        width: certRef.current.offsetWidth || 960,
        height: certRef.current.offsetHeight || 678,
      });
      const link = document.createElement('a');
      link.download = `${previewCert.certificateNo}.png`;
      link.href = dataUrl;
      link.click();
      notify('সনদপত্র HD PNG ডাউনলোড হয়েছে।', 'success');
    } catch {
      notify('সনদপত্র PNG তৈরি করতে সমস্যা হয়েছে।', 'error');
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
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-[#123B67] dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={admitConfig.includeBackPage !== false}
                    onChange={(e) =>
                      setAdmitConfig({ ...admitConfig, includeBackPage: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-[#CFE0D6] text-[#087F5B] focus:ring-[#087F5B]"
                  />
                  পিছনের পৃষ্ঠা যুক্ত করুন (পরীক্ষার সময়সূচি ও বিধি-নিষেধ)
                </label>

                <button
                  type="button"
                  onClick={() => setShowScheduleEditor((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#CFE0D6] bg-[#F2F8F5] px-3 py-1.5 text-xs font-bold text-[#087F5B] transition hover:bg-[#E4F3EC] dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-300"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  পরীক্ষার সময়সূচি সাজান ({toBnDigits((admitConfig.customSchedule || []).length)})
                  {showScheduleEditor ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!selectedStudent || downloadingAdmit || Boolean(bulkProgress)}
                  onClick={() => void handleDownloadSingleAdmit(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-50"
                >
                  {downloadingAdmit ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {downloadingAdmit ? 'পিডিএফ তৈরি হচ্ছে...' : 'প্রবেশপত্র PDF (উভয় পিঠ)'}
                </button>

                <button
                  type="button"
                  disabled={!selectedStudent || downloadingAdmit || Boolean(bulkProgress)}
                  onClick={() => void handleDownloadSingleAdmit(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#087F5B] bg-white px-3.5 py-2.5 text-xs font-bold text-[#087F5B] transition hover:bg-[#F2F8F5] disabled:opacity-50 dark:bg-slate-800 dark:text-emerald-300"
                >
                  <Layers className="h-3.5 w-3.5" />
                  ১ A4-এ ২ কপি
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
                      : `পুরো ${labelClass(selectedClass)} A4 ডুপ্লেক্স PDF (${toBnDigits(classStudentsForBulk.length)} জন)`}
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

                {selectedStudent && (
                  <Link
                    to={buildStudentVerificationPath(selectedStudent.studentIdCode, {
                      examName: admitConfig.examName,
                      academicYear: admitConfig.academicYear,
                    })}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#21A9D6]/50 bg-[#EAF7FC] px-3.5 py-2.5 text-xs font-bold text-[#0B5C7A] transition hover:bg-[#21A9D6] hover:text-white dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    QR যাচাই টেস্ট করুন
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>

            {/* Inline Exam Schedule Editor for Back Side */}
            {showScheduleEditor && (
              <div className="mt-4 space-y-3 rounded-xl border border-[#D4E6DC] bg-[#F7FBF9] p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-extrabold text-[#123B67] dark:text-white">
                      পিছনের পৃষ্ঠার পরীক্ষার সময়সূচি (ঐচ্ছিক কাস্টম তালিকা)
                    </p>
                    <p className="text-[11px] text-[#526B78] dark:text-slate-400">
                      এখানে সময়সূচি দিলে প্রবেশপত্রের পিছনে ছাপা হবে; খালি রাখলে ওই শ্রেণির সংরক্ষিত পরীক্ষার রুটিন (বা ফাঁকা ছক) দেখাবে।
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleLoadSampleSchedule}
                      className="rounded-lg border border-[#F4A62A]/60 bg-[#FFF8EB] px-2.5 py-1 text-[11px] font-bold text-[#9A5B04] transition hover:bg-[#FDEBC8] dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    >
                      নমুনা রুটিন দিন
                    </button>
                    <button
                      type="button"
                      onClick={handleAddScheduleRow}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#087F5B] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#06684A]"
                    >
                      <Plus className="h-3 w-3" />
                      বিষয় যোগ করুন
                    </button>
                  </div>
                </div>

                {(admitConfig.customSchedule || []).length > 0 && (
                  <div className="space-y-2">
                    {(admitConfig.customSchedule || []).map((row) => (
                      <div key={row.id} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                        <input
                          value={row.date}
                          onChange={(e) => handleUpdateScheduleRow(row.id, 'date', e.target.value)}
                          placeholder="তারিখ (যেমন: ১৫/০৬/২০২৬)"
                          className={`${inputClass} sm:col-span-3`}
                        />
                        <input
                          value={row.day}
                          onChange={(e) => handleUpdateScheduleRow(row.id, 'day', e.target.value)}
                          placeholder="বার (যেমন: সোমবার)"
                          className={`${inputClass} sm:col-span-2`}
                        />
                        <input
                          value={row.time}
                          onChange={(e) => handleUpdateScheduleRow(row.id, 'time', e.target.value)}
                          placeholder="সময় (সকাল ১০:০০ - ১২:০০)"
                          className={`${inputClass} sm:col-span-3`}
                        />
                        <input
                          value={row.subject}
                          onChange={(e) => handleUpdateScheduleRow(row.id, 'subject', e.target.value)}
                          placeholder="বিষয়ের নাম"
                          className={`${inputClass} sm:col-span-3`}
                        />
                        <button
                          type="button"
                          aria-label="সারি মুছুন"
                          onClick={() => handleRemoveScheduleRow(row.id)}
                          className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-rose-600 hover:bg-rose-600 hover:text-white sm:col-span-1 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Duplex A4 Printing Guide Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#C6E2EA] bg-[#EAF6F9] px-4 py-2.5 text-xs text-[#0B4D76] dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
            <span>
              <strong>A4 ডুপ্লেক্স প্রিন্ট গাইড:</strong> প্রতিটি A4 শিটে ২টি প্রবেশপত্র (উপরে ও নিচে কাটার দাগসহ) — পৃষ্ঠা ১-এ <strong>সামনের মূল প্রবেশপত্র</strong> এবং পৃষ্ঠা ২-এ <strong>পিছনের পরীক্ষার সময়সূচি ও বিধি-নিষেধ</strong> সমান মাপে বসানো আছে। প্রিন্টারে <strong>Double-Sided (Flip on Long Edge)</strong> দিয়ে প্রিন্ট করে মাঝখান দিয়ে কাটুন।
            </span>
            {selectedClass === 'ALL' && (
              <span className="font-bold text-[#087F5B] dark:text-emerald-300">
                পুরো শ্রেণির PDF পেতে উপরে শ্রেণি নির্বাচন করুন ↑
              </span>
            )}
          </div>

          {/* Live Kalpurush Front & Back Admit Card Preview */}
          <div className="space-y-5 rounded-2xl border border-[#DCE8E1] bg-[#E8F1F4] p-5 dark:border-slate-800 dark:bg-slate-950/70">
            {selectedStudent ? (
              <div className="space-y-6">
                {/* Front Side Preview */}
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#066680] px-2.5 py-1 font-bold text-white">
                      সামনের দিক (Front Side — মূল প্রবেশপত্র)
                    </span>
                    <span className="font-semibold text-[#4B6672] dark:text-slate-400">
                      A4 পেজে ২টি করে বসবে · কালপুরুষ ফন্ট
                    </span>
                  </div>
                  <div className="overflow-x-auto pb-2">
                    <div className="mx-auto w-fit shadow-lg">
                      <AdmitCardFront
                        ref={admitCardRef}
                        student={selectedStudent}
                        settings={settings}
                        config={admitConfig}
                        examRoutines={routines}
                      />
                    </div>
                  </div>
                </div>

                {/* Back Side Preview */}
                {admitConfig.includeBackPage !== false && (
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#DF8914] px-2.5 py-1 font-bold text-white">
                        পিছনের দিক (Back Side — পরীক্ষার সময়সূচি ও পালনীয় বিধি-নিষেধ)
                      </span>
                      <span className="font-semibold text-[#4B6672] dark:text-slate-400">
                        ডুপ্লেক্স প্রিন্টে সামনের কার্ডের ঠিক পিছনে বসবে
                      </span>
                    </div>
                    <div className="overflow-x-auto pb-2">
                      <div className="mx-auto w-fit shadow-lg">
                        <AdmitCardBack
                          ref={admitBackRef}
                          student={selectedStudent}
                          settings={settings}
                          config={admitConfig}
                          examRoutines={routines}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="py-12 text-center text-xs text-[#587064] dark:text-slate-400">
                প্রবেশপত্র দেখতে একজন শিক্ষার্থী নির্বাচন করুন।
              </p>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 2: DOUBLE-SIDED COLORFUL ENGLISH STUDENT ID CARD ==================== */}
      {tab === 'idcard' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            {/* LEFT CONTROL STUDIO */}
            <div className="space-y-4 rounded-2xl border border-[#DCE8E1] bg-white p-5 shadow-2xs xl:col-span-4 dark:border-slate-800 dark:bg-slate-900">
              <StudentPicker
                students={students}
                value={selectedStudent?.id || ''}
                onChange={setSelectedStudentId}
                classFilter={selectedClass}
                onClassFilterChange={setSelectedClass}
                label="শ্রেণি ও শিক্ষার্থী নির্বাচন করুন"
              />

              {/* Colorful Theme Selector */}
              <div className="space-y-2 border-t border-[#EAF2ED] pt-3.5 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#123B67] dark:text-slate-200">
                    <Palette className="h-3.5 w-3.5 text-[#087F5B]" />
                    কালার থিম নির্বাচন করুন
                  </span>
                  <span className="text-[11px] font-semibold text-[#587064] dark:text-slate-400">
                    {ID_CARD_THEMES[idCardConfig.themeId].labelEn}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(ID_CARD_THEMES) as IdCardThemeId[]).map((tid) => {
                    const palette = ID_CARD_THEMES[tid];
                    const active = idCardConfig.themeId === tid;
                    return (
                      <button
                        key={tid}
                        type="button"
                        onClick={() => setIdCardConfig((prev) => ({ ...prev, themeId: tid }))}
                        className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                          active
                            ? 'border-[#087F5B] bg-[#F2FBF7] ring-2 ring-[#087F5B]/20 dark:border-emerald-500 dark:bg-emerald-950/30'
                            : 'border-[#DCE8E1] bg-white hover:bg-[#F7FBF9] dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex shrink-0 -space-x-1">
                          {palette.swatch.map((hex, i) => (
                            <span
                              key={i}
                              className="h-4 w-4 rounded-full border border-white shadow-2xs"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                        <span className="truncate text-[11px] font-bold text-[#123B67] dark:text-slate-200">
                          {palette.labelEn.split('&')[0].trim()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable English Details (auto-filled from student record) */}
              {selectedStudent && (() => {
                const autoEn = getEnglishStudentSummary(selectedStudent);
                return (
                  <div className="space-y-2.5 border-t border-[#EAF2ED] pt-3.5 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#123B67] dark:text-slate-200">
                        English Card Details (Live Edit)
                      </span>
                      {(idCardConfig.studentNameOverride ||
                        idCardConfig.fatherNameOverride ||
                        idCardConfig.divisionOverride) && (
                        <button
                          type="button"
                          onClick={() =>
                            setIdCardConfig((prev) => ({
                              ...prev,
                              studentNameOverride: '',
                              fatherNameOverride: '',
                              divisionOverride: '',
                            }))
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#087F5B] hover:underline"
                        >
                          <RotateCcw className="h-3 w-3" />
                          রিসেট
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-[#526B78] dark:text-slate-400">
                        Student Name (English)
                      </label>
                      <input
                        value={idCardConfig.studentNameOverride ?? ''}
                        onChange={(e) =>
                          setIdCardConfig((prev) => ({
                            ...prev,
                            studentNameOverride: e.target.value,
                          }))
                        }
                        placeholder={autoEn.nameEn}
                        className={inputClass}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-[#526B78] dark:text-slate-400">
                          Father&apos;s Name (English)
                        </label>
                        <input
                          value={idCardConfig.fatherNameOverride ?? ''}
                          onChange={(e) =>
                            setIdCardConfig((prev) => ({
                              ...prev,
                              fatherNameOverride: e.target.value,
                            }))
                          }
                          placeholder={autoEn.fatherEn || 'Guardian Name'}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-[#526B78] dark:text-slate-400">
                          Division
                        </label>
                        <input
                          value={idCardConfig.divisionOverride ?? ''}
                          onChange={(e) =>
                            setIdCardConfig((prev) => ({
                              ...prev,
                              divisionOverride: e.target.value,
                            }))
                          }
                          placeholder={autoEn.divisionEn}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-[#526B78] dark:text-slate-400">
                          Session
                        </label>
                        <input
                          value={idCardConfig.sessionLabel}
                          onChange={(e) =>
                            setIdCardConfig((prev) => ({ ...prev, sessionLabel: e.target.value }))
                          }
                          placeholder="2026"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-[#526B78] dark:text-slate-400">
                          Valid Thru
                        </label>
                        <input
                          value={idCardConfig.validThru}
                          onChange={(e) =>
                            setIdCardConfig((prev) => ({ ...prev, validThru: e.target.value }))
                          }
                          placeholder="Dec 2026"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-[#526B78] dark:text-slate-400">
                          Authority
                        </label>
                        <input
                          value={idCardConfig.authorityTitle}
                          onChange={(e) =>
                            setIdCardConfig((prev) => ({
                              ...prev,
                              authorityTitle: e.target.value,
                            }))
                          }
                          placeholder="Principal"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs font-bold text-[#123B67] dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={showLanyardPreview}
                        onChange={(e) => setShowLanyardPreview(e.target.checked)}
                        className="h-4 w-4 rounded border-[#CFE0D6] text-[#087F5B] focus:ring-[#087F5B]"
                      />
                      ল্যানিয়ার্ড হোল্ডার প্রিভিউ দেখুন (ডাউনলোডে শুধু পরিষ্কার কার্ড থাকবে)
                    </label>
                  </div>
                );
              })()}

              {/* Download & Bulk Print Actions */}
              <div className="space-y-2 border-t border-[#EAF2ED] pt-3.5 dark:border-slate-800">
                <button
                  type="button"
                  disabled={!selectedStudent || downloadingIdCard || Boolean(bulkIdProgress)}
                  onClick={() => void handleDownloadIdCardPdf()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#087F5B] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-50"
                >
                  {downloadingIdCard ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Front + Back Print PDF (CR80 Standard)
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={!selectedStudent || downloadingIdCard || Boolean(bulkIdProgress)}
                    onClick={() => void handleDownloadIdCardDualPng()}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#087F5B] bg-white px-2.5 py-2 text-[11px] font-bold text-[#087F5B] transition hover:bg-[#F2F8F5] disabled:opacity-50 dark:bg-slate-800 dark:text-emerald-300"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Both PNG
                  </button>
                  <button
                    type="button"
                    disabled={!selectedStudent || downloadingIdCard || Boolean(bulkIdProgress)}
                    onClick={() => void handleDownloadIdCardSide('Front')}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#CFE0D6] bg-white px-2.5 py-2 text-[11px] font-bold text-[#123B67] transition hover:bg-[#F2F8F5] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Front PNG
                  </button>
                  <button
                    type="button"
                    disabled={!selectedStudent || downloadingIdCard || Boolean(bulkIdProgress)}
                    onClick={() => void handleDownloadIdCardSide('Back')}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#CFE0D6] bg-white px-2.5 py-2 text-[11px] font-bold text-[#123B67] transition hover:bg-[#F2F8F5] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Back PNG
                  </button>
                </div>

                {selectedClass !== 'ALL' && classStudentsForBulk.length > 0 && (
                  <button
                    type="button"
                    disabled={Boolean(bulkIdProgress) || downloadingIdCard}
                    onClick={() => void handleDownloadClassIdCards()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#123B67] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#0C2B4D] disabled:opacity-60"
                  >
                    {bulkIdProgress ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Layers className="h-3.5 w-3.5 text-[#F4A62A]" />
                    )}
                    {bulkIdProgress
                      ? `তৈরি হচ্ছে ${toBnDigits(bulkIdProgress.current)}/${toBnDigits(bulkIdProgress.total)}...`
                      : `পুরো ${labelClass(selectedClass)} ডুপ্লেক্স A4 PDF (${toBnDigits(classStudentsForBulk.length)} জন · ৯ কার্ড/পৃষ্ঠা)`}
                  </button>
                )}

                {selectedStudent && (
                  <Link
                    to={buildStudentVerificationPath(selectedStudent.studentIdCode)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#21A9D6]/50 bg-[#EAF7FC] px-3.5 py-2 text-xs font-bold text-[#0B5C7A] transition hover:bg-[#21A9D6] hover:text-white dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    লাইভ QR যাচাই পেজ দেখুন
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>

            {/* RIGHT DUAL-SIDED LIVE ID CARD SHOWCASE */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#DCE8E1] bg-gradient-to-br from-[#E9F2F0] via-[#EEF4F7] to-[#E5EDF2] p-5 sm:p-7 xl:col-span-8 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-extrabold text-[#123B67] dark:text-white">
                  Front &amp; Back Live Preview · CR80 Portrait (54mm × 86mm)
                </span>
                <span className="font-semibold text-[#4B6672] dark:text-slate-400">
                  100% English · Real Scannable QR Verification
                </span>
              </div>

              {selectedStudent ? (
                <div className="flex flex-wrap items-start justify-center gap-8 py-2">
                  {/* FRONT CARD WITH OPTIONAL LANYARD HOLDER MOCKUP */}
                  <div className="flex flex-col items-center">
                    {showLanyardPreview && (
                      <div className="flex flex-col items-center" aria-hidden="true">
                        <div
                          className="h-9 w-8 rounded-t-sm shadow-inner"
                          style={{
                            background: `linear-gradient(90deg, ${ID_CARD_THEMES[idCardConfig.themeId].deepDark}, ${ID_CARD_THEMES[idCardConfig.themeId].primary}, ${ID_CARD_THEMES[idCardConfig.themeId].deepDark})`,
                          }}
                        />
                        <div className="h-3.5 w-5 rounded-b-md border border-slate-400 bg-gradient-to-b from-slate-200 to-slate-400 shadow-xs" />
                        <div className="-mt-1 h-4 w-3 rounded-full border-2 border-slate-400 bg-transparent" />
                      </div>
                    )}
                    <div
                      className={
                        showLanyardPreview
                          ? 'relative -mt-1.5 rounded-[22px] border border-white/80 bg-white/55 p-3 pt-7 shadow-xl backdrop-blur-xs dark:border-slate-700/80 dark:bg-slate-800/50'
                          : 'shadow-2xl rounded-[16px]'
                      }
                    >
                      {showLanyardPreview && (
                        <div
                          className="absolute top-2.5 left-1/2 flex -translate-x-1/2 items-center gap-4"
                          aria-hidden="true"
                        >
                          <span className="h-1.5 w-5 rounded-full bg-slate-400/50 shadow-inner" />
                          <span className="h-2.5 w-2.5 rounded-full border border-slate-400/60 bg-slate-300/60" />
                          <span className="h-1.5 w-5 rounded-full bg-slate-400/50 shadow-inner" />
                        </div>
                      )}
                      <StudentIdCardFront
                        ref={idCardFrontRef}
                        student={selectedStudent}
                        settings={settings}
                        config={idCardConfig}
                      />
                    </div>
                    <span className="mt-3 text-[11px] font-extrabold tracking-wider text-[#123B67] uppercase dark:text-slate-300">
                      Front Side · Identity
                    </span>
                  </div>

                  {/* BACK CARD WITH OPTIONAL LANYARD HOLDER MOCKUP */}
                  <div className="flex flex-col items-center">
                    {showLanyardPreview && (
                      <div className="flex flex-col items-center" aria-hidden="true">
                        <div
                          className="h-9 w-8 rounded-t-sm shadow-inner"
                          style={{
                            background: `linear-gradient(90deg, ${ID_CARD_THEMES[idCardConfig.themeId].deepDark}, ${ID_CARD_THEMES[idCardConfig.themeId].primary}, ${ID_CARD_THEMES[idCardConfig.themeId].deepDark})`,
                          }}
                        />
                        <div className="h-3.5 w-5 rounded-b-md border border-slate-400 bg-gradient-to-b from-slate-200 to-slate-400 shadow-xs" />
                        <div className="-mt-1 h-4 w-3 rounded-full border-2 border-slate-400 bg-transparent" />
                      </div>
                    )}
                    <div
                      className={
                        showLanyardPreview
                          ? 'relative -mt-1.5 rounded-[22px] border border-white/80 bg-white/55 p-3 pt-7 shadow-xl backdrop-blur-xs dark:border-slate-700/80 dark:bg-slate-800/50'
                          : 'shadow-2xl rounded-[16px]'
                      }
                    >
                      {showLanyardPreview && (
                        <div
                          className="absolute top-2.5 left-1/2 flex -translate-x-1/2 items-center gap-4"
                          aria-hidden="true"
                        >
                          <span className="h-1.5 w-5 rounded-full bg-slate-400/50 shadow-inner" />
                          <span className="h-2.5 w-2.5 rounded-full border border-slate-400/60 bg-slate-300/60" />
                          <span className="h-1.5 w-5 rounded-full bg-slate-400/50 shadow-inner" />
                        </div>
                      )}
                      <StudentIdCardBack
                        ref={idCardBackRef}
                        student={selectedStudent}
                        settings={settings}
                        config={idCardConfig}
                      />
                    </div>
                    <span className="mt-3 text-[11px] font-extrabold tracking-wider text-[#087F5B] uppercase dark:text-emerald-300">
                      Back Side · Instructions &amp; QR
                    </span>
                  </div>
                </div>
              ) : (
                <p className="py-16 text-center text-xs text-[#587064] dark:text-slate-400">
                  আইডি কার্ড দেখতে একজন শিক্ষার্থী নির্বাচন করুন।
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#D2E2DC] pt-3 text-[11px] text-[#4B6672] dark:border-slate-800 dark:text-slate-400">
                <span>
                  পিছনের QR কোডটি যেকোনো স্মার্টফোন ক্যামেরা দিয়ে স্ক্যান করলে শিক্ষার্থীর অনলাইন ভেরিফিকেশন পেজ ওপেন হবে।
                </span>
                {selectedClass === 'ALL' && (
                  <span className="font-bold text-[#087F5B] dark:text-emerald-300">
                    পুরো শ্রেণির ডুপ্লেক্স PDF পেতে বামে শ্রেণি নির্বাচন করুন ←
                  </span>
                )}
              </div>
            </div>
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
                  onChange={(e) => {
                    setActiveCert(null);
                    setCertType(e.target.value as CertificateRecord['certificateType']);
                  }}
                  className={inputClass}
                >
                  {Object.entries(CERTIFICATE_TYPE_BN).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="বিশেষ মন্তব্য / ছাড়পত্রের কারণ (ঐচ্ছিক)"
                  value={remarks}
                  onChange={(e) => {
                    if (activeCert) setActiveCert(null);
                    setRemarks(e.target.value);
                  }}
                  className={inputClass}
                />
                <button
                  type="submit"
                  disabled={saving || !selectedStudent}
                  className="rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#06684A] disabled:opacity-60"
                >
                  {saving ? 'তৈরি হচ্ছে...' : 'সনদ ইস্যু ও সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          )}

          {previewCert && (
            <div className="space-y-3 rounded-2xl border border-[#DCE8E1] bg-[#EDF3EF] p-5 dark:border-slate-800 dark:bg-slate-950/70">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-extrabold text-[#123B67] dark:text-white">
                    {activeCert ? 'ইস্যুকৃত সনদ:' : 'লাইভ প্রিভিউ:'}{' '}
                    {CERTIFICATE_TYPE_BN[previewCert.certificateType]} ({previewCert.certificateNo})
                  </p>
                  {!activeCert && (
                    <span className="text-[11px] font-semibold text-[#587064] dark:text-slate-400">
                      · রেকর্ডে সেভ করতে উপরে &ldquo;সনদ ইস্যু ও সংরক্ষণ করুন&rdquo; ক্লিক করুন
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDownloadCertificatePdf()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#06684A]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    A4 পিডিএফ ডাউনলোড
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDownloadCertificatePng()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#087F5B] bg-white px-3.5 py-1.5 text-xs font-bold text-[#087F5B] transition hover:bg-[#F2F8F5] dark:bg-slate-800 dark:text-emerald-300"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    HD PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#CFE0D6] bg-white px-3 py-1.5 text-xs font-bold text-[#123B67] transition hover:bg-[#F2F8F5] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    প্রিন্ট
                  </button>
                  {activeCert && (
                    <button
                      type="button"
                      onClick={() => setActiveCert(null)}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#CFE0D6] bg-white px-3 py-1.5 text-xs font-bold text-[#263B35] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <X className="h-3.5 w-3.5" />
                      নতুন প্রিভিউ
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto pb-2">
                <div className="mx-auto w-fit shadow-xl">
                  <CertificateTemplate
                    ref={certRef}
                    certificate={previewCert}
                    student={previewCertStudent}
                    settings={settings}
                  />
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
